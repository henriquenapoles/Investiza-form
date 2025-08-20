from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
import uuid
import json
import secrets
import hashlib
import hmac
import time
from pathlib import Path

# Load environment variables
load_dotenv()

# Path para arquivo de configuração dos fundos
FUNDOS_CONFIG_PATH = Path(__file__).parent.parent / "fundos_criterios.json"

# Funções para manipular arquivo JSON
def load_fundos_config():
    """Carrega configuração dos fundos do arquivo JSON"""
    try:
        with open(FUNDOS_CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error("Arquivo fundos_criterios.json não encontrado")
        return {"fundos": {}, "opcoes_formulario": {}, "configuracao": {}}
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar JSON: {e}")
        return {"fundos": {}, "opcoes_formulario": {}, "configuracao": {}}

def save_fundos_config(config):
    """Salva configuração dos fundos no arquivo JSON"""
    try:
        config["configuracao"]["ultima_atualizacao"] = datetime.utcnow().isoformat()
        with open(FUNDOS_CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar configuração: {e}")
        return False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração de segurança
API_KEY = os.getenv("API_KEY", secrets.token_urlsafe(32))  # Gera uma chave API segura se não estiver configurada
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "123456")  # API key específica para endpoints admin
API_KEY_EXPIRATION = int(os.getenv("API_KEY_EXPIRATION", "3600"))  # Expiração em segundos (1 hora)

# Armazenamento temporário de tokens (em produção, use Redis ou similar)
valid_tokens = {}

# Proteção contra força bruta
login_attempts = {}
max_login_attempts = 5
lockout_time = 15 * 60  # 15 minutos em segundos

# Armazenamento temporário de logs do webhook (últimos 100 logs)
webhook_logs = []
max_webhook_logs = 100

def check_brute_force(client_ip):
    """Verificar tentativas de login para prevenir ataques de força bruta"""
    current_time = time.time()
    
    # Limpar entradas antigas
    for ip in list(login_attempts.keys()):
        if current_time - login_attempts[ip]["timestamp"] > lockout_time:
            del login_attempts[ip]
    
    # Verificar se o IP está bloqueado
    if client_ip in login_attempts:
        attempt_data = login_attempts[client_ip]
        if attempt_data["count"] >= max_login_attempts:
            # Verificar se ainda está no período de bloqueio
            if current_time - attempt_data["timestamp"] < lockout_time:
                remaining = int(lockout_time - (current_time - attempt_data["timestamp"]))
                return False, f"Muitas tentativas de login. Tente novamente em {remaining // 60} minutos."
            else:
                # Reiniciar contagem após o período de bloqueio
                login_attempts[client_ip] = {"count": 1, "timestamp": current_time}
        else:
            # Incrementar contagem
            login_attempts[client_ip]["count"] += 1
    else:
        # Primeira tentativa para este IP
        login_attempts[client_ip] = {"count": 1, "timestamp": current_time}
    
    return True, ""

def add_webhook_log(lead_data, success, error=None, status_code=None, idempotency_key=None):
    """Adiciona um log de tentativa de webhook"""
    global webhook_logs
    
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "idempotency_key": idempotency_key or "unknown",
        "lead_name": lead_data.nome if lead_data else "Unknown",
        "lead_email": lead_data.email if lead_data else "Unknown",
        "success": success,
        "error": error,
        "status_code": status_code
    }
    
    # Adicionar no início da lista (mais recente primeiro)
    webhook_logs.insert(0, log_entry)
    
    # Manter apenas os últimos N logs
    if len(webhook_logs) > max_webhook_logs:
        webhook_logs = webhook_logs[:max_webhook_logs]

app = FastAPI(title="Investiza Form API", version="1.0.0")

# Middleware para verificar autenticação em endpoints admin
from fastapi import Security, HTTPException, Depends, Request
from fastapi.security import APIKeyHeader
from typing import Optional

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(
    request: Request,
    api_key_header: Optional[str] = Security(api_key_header)
):
    """Obtém a chave de API do cabeçalho ou do parâmetro de query e valida para endpoints admin."""
    # Tentar obter a chave do parâmetro de query
    api_key_query = request.query_params.get("admin_key")
    
    api_key = api_key_header or api_key_query
    
    if api_key is None:
        raise HTTPException(status_code=401, detail="API Key de acesso ausente. Forneça via cabeçalho X-API-Key ou parâmetro admin_key na URL.")
    
    # Verificar endpoints públicos que não precisam de autenticação
    # Endpoints não admin não precisam de verificação completa (apenas existência da chave, se fornecida)
    current_path = request.url.path
    if not current_path.startswith("/api/admin/"):
        return api_key
    
    # Verificar se é uma API key válida para admin
    if api_key != ADMIN_API_KEY:
        raise HTTPException(status_code=403, detail="API Key inválida ou sem permissão para endpoints de administração.")
        
    return api_key

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.url}: {exc.errors()}")
    logger.error(f"Request body: {await request.body()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class LeadData(BaseModel):
    # Dados pessoais
    nome: str = Field(..., description="Nome completo")
    nome_empresa: Optional[str] = Field(None, description="Nome da empresa")
    email: str = Field(..., description="E-mail")
    whatsapp: str = Field(..., description="WhatsApp")
    instagram: Optional[str] = Field(None, description="Instagram (opcional)")
    como_chegou: str = Field(..., description="Como chegou até nós")
    indicacao_detalhes: Optional[str] = Field(None, description="Detalhes da indicação")
    outros_detalhes: Optional[str] = Field(None, description="Detalhes de outros canais")
    
    # Situação empresarial
    situacao_empresa: str = Field(..., description="Situação da empresa")
    faturamento_renda: str = Field(..., description="Faturamento/Renda")
    local: str = Field(..., description="Localização do projeto")
    municipio_estado: Optional[str] = Field(None, description="Município e Estado")
    segmento: List[str] = Field(..., description="Segmentos de atuação (múltipla escolha)")
    segmento_outros: Optional[str] = Field(None, description="Outros segmentos")
    razao: List[str] = Field(..., description="Razões do projeto (múltipla escolha)")
    razao_outros: Optional[str] = Field(None, description="Outras razões")
    garantia: List[str] = Field(..., description="Garantias disponíveis (múltipla escolha)")
    tipo_imovel: Optional[str] = Field(None, description="Tipo do imóvel se garantia for imóvel (legacy)")
    tipos_imovel: Optional[List[str]] = Field(None, description="Tipos de imóveis múltiplos")
    tipos_imovel_detalhado: Optional[List[str]] = Field(None, description="Array original dos tipos de imóvel")
    
    # Legacy fields for backward compatibility
    tem_cnpj: Optional[str] = Field(None, description="Tem CNPJ: sim/nao (legacy)")
    faturamento: Optional[str] = Field(None, description="Faturamento anual (legacy)")
    telefone: Optional[str] = Field(None, description="Telefone (legacy)")

class ElegibilityItem(BaseModel):
    id: str
    motivo: str

class Eligibility(BaseModel):
    recomendados: List[str]
    possiveis_atipicos: List[ElegibilityItem] = Field(alias="possiveisAtipicos")
    nao_elegiveis: List[ElegibilityItem] = Field(alias="naoElegiveis")
    
    class Config:
        populate_by_name = True  # Allow both field name and alias

class MetaData(BaseModel):
    user_agent: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    page_url: Optional[str] = None

class FormSubmission(BaseModel):
    source: str = Field(default="investiza-form-gamificado")
    idempotency_key: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    lead: LeadData
    eligibility: Eligibility
    score_gamificado: int = Field(default=0)
    meta: Optional[MetaData] = Field(default_factory=lambda: MetaData())

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "investiza-form-api"
    }

# Form submission endpoint (for testing/validation)
@app.post("/api/form/submit")
async def submit_form(submission: FormSubmission):
    """
    Endpoint to receive and validate form submissions
    This can be used for testing and validation before sending to n8n
    """
    try:
        logger.info(f"Received form submission with idempotency_key: {submission.idempotency_key}")
        
        # Log the submission data for debugging
        logger.info(f"Lead data: {submission.lead}")
        logger.info(f"Eligibility: {submission.eligibility}")
        logger.info(f"Score: {submission.score_gamificado}")
        
        # Here you could add additional validation, database storage, etc.
        
        return {
            "success": True,
            "message": "Form submitted successfully",
            "idempotency_key": submission.idempotency_key,
            "timestamp": submission.timestamp
        }
        
    except Exception as e:
        logger.error(f"Error processing form submission: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Validation endpoint for lead data
@app.post("/api/form/validate")
async def validate_lead(lead: LeadData):
    """
    Endpoint to validate lead data and return eligibility calculation
    This can be used by the frontend for real-time validation
    """
    try:
        # Configuração de sanitização e validação
        # Listas de valores permitidos para validação
        allowed_situacao_empresa = ['cnpj_antigo', 'cnpj_novo', 'implantacao', 'pessoa_fisica', 
                                   'recuperacao_judicial_homologada', 'recuperacao_judicial_nao_homologada']
        allowed_faturamento_renda = ['<10', '10-80', '>80', '>300', 'nao_tem', 
                                    'ate_5k', '5k_15k', '15k_50k', 'acima_50k']
        allowed_local = ['Nordeste', 'Norte', 'Centro-Oeste', 'Sudeste', 'Sul']
        allowed_como_chegou = ['instagram', 'google', 'linkedin', 'facebook', 'youtube', 
                              'whatsapp', 'site', 'indicacao', 'eventos', 'outros']
        allowed_segmentos = ['Agro', 'Industria_Atacado', 'Construtora', 
                            'Tecnologia', 'Servicos_Financeiros', 'Saude', 'Educacao', 
                            'Servico_Publico', 'Varejo', 'Outros']
        allowed_razoes = ['Implantacao', 'Ampliacao', 'Giro', 'Financiamento_Ativo',
                         'Modernizacao_Tecnologia', 'Aquisicao', 'Safra_Agro', 'Outros']
        allowed_garantias = ['Imovel', 'Veiculo', 'Equipamento', 'Recebiveis', 
                           'CartaFianca', 'Estoque', 'NaoSei', 'Nenhuma']
        allowed_tipos_imovel = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Terreno']
        
        # Funções de sanitização
        def sanitize_string(s, max_length=100):
            """Sanitiza uma string limitando seu comprimento e removendo caracteres perigosos"""
            if not isinstance(s, str):
                return ""
            # Remover caracteres potencialmente perigosos
            s = s.replace("<", "").replace(">", "").replace("'", "").replace('"', "").replace(";", "")
            return s[:max_length]
        
        def validate_enum(value, allowed_values):
            """Verifica se um valor está na lista de valores permitidos"""
            if value not in allowed_values:
                return False
            return True
        
        def validate_list_enum(values, allowed_values):
            """Verifica se todos os valores de uma lista estão na lista de valores permitidos"""
            if not isinstance(values, list):
                return False
            return all(value in allowed_values for value in values)
        
        # Sanitizar campos de string simples
        lead.nome = sanitize_string(lead.nome, 150)
        lead.nome_empresa = sanitize_string(lead.nome_empresa, 200)
        lead.email = sanitize_string(lead.email, 100)
        lead.whatsapp = sanitize_string(lead.whatsapp, 20)
        lead.instagram = sanitize_string(lead.instagram, 50)
        lead.indicacao_detalhes = sanitize_string(lead.indicacao_detalhes, 200)
        lead.outros_detalhes = sanitize_string(lead.outros_detalhes, 200)
        lead.municipio_estado = sanitize_string(lead.municipio_estado, 100)
        lead.segmento_outros = sanitize_string(lead.segmento_outros, 200)
        lead.razao_outros = sanitize_string(lead.razao_outros, 200)
        
        # Validar campos de enumeração
        if not validate_enum(lead.situacao_empresa, allowed_situacao_empresa):
            raise HTTPException(status_code=400, detail="Situação da empresa inválida")
            
        if not validate_enum(lead.faturamento_renda, allowed_faturamento_renda):
            raise HTTPException(status_code=400, detail="Faturamento/renda inválido")
            
        if not validate_enum(lead.local, allowed_local):
            raise HTTPException(status_code=400, detail="Localização inválida")
            
        if not validate_enum(lead.como_chegou, allowed_como_chegou):
            raise HTTPException(status_code=400, detail="Campo 'como chegou' inválido")
            
        # Validar listas de enumeração
        if not validate_list_enum(lead.segmento, allowed_segmentos):
            raise HTTPException(status_code=400, detail="Segmentos inválidos")
            
        if not validate_list_enum(lead.razao, allowed_razoes):
            raise HTTPException(status_code=400, detail="Razões inválidas")
            
        if not validate_list_enum(lead.garantia, allowed_garantias):
            raise HTTPException(status_code=400, detail="Garantias inválidas")
            
        if lead.tipos_imovel and not validate_list_enum(lead.tipos_imovel, allowed_tipos_imovel):
            raise HTTPException(status_code=400, detail="Tipos de imóvel inválidos")
            
        # Validação básica para campos obrigatórios
        required_fields = ['nome', 'email', 'whatsapp', 'como_chegou', 'situacao_empresa', 
                          'faturamento_renda', 'local', 'segmento', 'razao', 'garantia']
        missing_fields = []
        
        for field in required_fields:
            value = getattr(lead, field, None)
            if not value or (isinstance(value, list) and len(value) == 0):
                missing_fields.append(field)
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Additional validation for imóvel
        if "Imovel" in lead.garantia and not lead.tipo_imovel:
            raise HTTPException(
                status_code=400,
                detail="tipo_imovel is required when garantia includes Imovel"
            )
        
        # Additional validation for indicação
        if lead.como_chegou == "indicacao" and not lead.indicacao_detalhes:
            raise HTTPException(
                status_code=400,
                detail="indicacao_detalhes is required when como_chegou is indicacao"
            )
        
        # Additional validation for outros
        if lead.como_chegou == "outros" and not lead.outros_detalhes:
            raise HTTPException(
                status_code=400,
                detail="outros_detalhes is required when como_chegou is outros"
            )
        # Additional validation for outros segmento
        if "Outros" in lead.segmento and not lead.segmento_outros:
            raise HTTPException(
                status_code=400,
                detail="segmento_outros is required when segmento is Outros"
            )
        
        # Additional validation for Sudeste/Sul location
        if lead.local in ["Sudeste", "Sul"] and not lead.municipio_estado:
            raise HTTPException(
                status_code=400,
                detail="municipio_estado is required for Sudeste/Sul locations"
            )
        
        return {
            "valid": True,
            "message": "Lead data is valid",
            "lead": lead
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating lead data: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Get form configuration
@app.get("/api/form/config")
async def get_form_config():
    """
    Returns form configuration data like options for dropdowns
    """
    try:
        config = load_fundos_config()
        opcoes = config.get("opcoes_formulario", {})
        webhook_url = config.get("configuracao", {}).get("webhook_url", "")
        
        return {
            "fields": {
                "situacao_empresa": [opt["value"] for opt in opcoes.get("situacao_empresa", [])],
                "faturamento_renda": [opt["value"] for opt in opcoes.get("faturamento_renda", [])],
                "regioes": [opt["value"] for opt in opcoes.get("regioes", [])],
                "segmentos": [opt["value"] for opt in opcoes.get("segmentos", [])],
                "razoes": [opt["value"] for opt in opcoes.get("razoes", [])],
                "garantias": [opt["value"] for opt in opcoes.get("garantias", [])],
                "tipo_imovel": [opt["value"] for opt in opcoes.get("tipo_imovel", [])],
                "como_chegou": [opt["value"] for opt in opcoes.get("como_chegou", [])]
            },
            "opcoes_completas": opcoes,
            "webhook_url": webhook_url
        }
    except Exception as e:
        logger.error(f"Erro ao carregar configuração do formulário: {str(e)}")
        # Fallback para configuração básica
        return {
            "fields": {
                "tem_cnpj": ["sim", "nao"],
                "faturamento": ["<10", "10-80", ">80", ">300"],
                "local": ["Nordeste", "Norte", "Centro-Oeste", "Minas", "Outra"],
                "segmento": ["Agro", "Industria_Atacado", "Servico_Publico", "Construtora", "Outros"],
                "razao": ["Implantacao", "Ampliacao", "Giro", "Financiamento_Ativo"],
                "garantia": ["Imovel", "Veiculo", "Equipamento", "Recebiveis", "CartaFianca", "Nenhuma"],
                "tipo_imovel": ["Residencial", "Comercial", "Rural", "Terreno"]
            },
            "webhook_url": "https://2n8n.ominicrm.com/webhook-test/650b310d-cd0b-465a-849d-7c7a3991572e"
        }

# Webhook proxy endpoint to bypass CORS
@app.post("/api/form/webhook")
async def webhook_proxy(submission: FormSubmission):
    """
    Proxy endpoint to forward form submissions to n8n webhook
    This bypasses CORS issues by making the request server-side
    """
    import requests
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    # Log the received submission for debugging
    logger.info(f"Webhook proxy received submission: {submission.idempotency_key}")
    logger.info(f"Lead data: {submission.lead}")
    logger.info(f"Eligibility: {submission.eligibility}")
    
    # Carregar URL do webhook da configuração
    config = load_fundos_config()
    webhook_url = config.get("configuracao", {}).get("webhook_url", "https://2n8n.ominicrm.com/webhook/650b310d-cd0b-465a-849d-7c7a3991572e")
    
    def send_webhook_request(payload_dict, attempt=1):
        """Send webhook request with retry logic"""
        import time  # Importar time localmente para garantir acesso
        
        try:
            # Validar a URL do webhook antes de usar
            if not webhook_url or not isinstance(webhook_url, str) or not webhook_url.startswith(('http://', 'https://')):
                logger.error(f"URL de webhook inválida: {webhook_url}")
                return {"success": False, "error": "URL de webhook inválida ou não configurada"}
                
            # Limite de tamanho para payload (10MB)
            payload_size = len(json.dumps(payload_dict))
            if payload_size > 10 * 1024 * 1024:  # 10MB em bytes
                logger.error(f"Payload muito grande para webhook: {payload_size} bytes")
                return {"success": False, "error": "Payload muito grande para webhook"}
            
            # Adicionar headers de segurança
            headers = {
                'Content-Type': 'application/json',
                'X-Request-Id': payload_dict.get('idempotency_key'),
                'User-Agent': 'Investiza-Form/1.0',
                'X-Investiza-Timestamp': str(int(time.time())),
                'X-Investiza-Source': 'form-api'
            }
            
            # Adicionar um hash HMAC para autenticação (opcional)
            webhook_secret = os.getenv("WEBHOOK_SECRET", "")
            if webhook_secret:
                payload_str = json.dumps(payload_dict)
                hmac_signature = hmac.new(
                    webhook_secret.encode(), 
                    payload_str.encode(), 
                    digestmod=hashlib.sha256
                ).hexdigest()
                headers['X-Investiza-Signature'] = hmac_signature
            
            response = requests.post(
                webhook_url,
                json=payload_dict,
                headers=headers,
                timeout=10  # 10 segundos de timeout
            )
            
            # Registrar informações de resposta para diagnóstico
            logger.info(f"Webhook response: status={response.status_code}, content_length={len(response.text or '')}")
            
            if response.status_code >= 200 and response.status_code < 300:
                return {"success": True, "status_code": response.status_code}
            elif response.status_code == 404:
                # Webhook não está ativo no n8n
                error_msg = "Webhook não está ativo. Você precisa ativar o workflow no n8n primeiro."
                logger.warning(f"Webhook 404 (não ativo): {response.text}")
                raise requests.exceptions.HTTPError(f"HTTP {response.status_code}: {error_msg}")
            else:
                # Limitar tamanho do log de erro para evitar ataques de log flooding
                response_text = response.text[:500] + '...' if response.text and len(response.text) > 500 else response.text
                logger.warning(f"Erro de webhook: HTTP {response.status_code}: {response_text}")
                raise requests.exceptions.HTTPError(f"HTTP {response.status_code}: {response_text}")
                
        except Exception as e:
            if attempt < 2:
                time.sleep(attempt * 1)  # Exponential backoff
                return send_webhook_request(payload_dict, attempt + 1)
            
            logger.error(f"Webhook failed after {attempt} attempts: {str(e)}")
            return {"success": False, "error": str(e)}
    
    try:
        # Convert Pydantic model to dict for JSON serialization
        payload_dict = submission.dict()
        
        # Log the webhook attempt
        logger.info(f"Forwarding to n8n webhook - idempotency_key: {payload_dict.get('idempotency_key')}")
        
        # Execute webhook request in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            future = loop.run_in_executor(executor, send_webhook_request, payload_dict)
            result = await future
        
        if result["success"]:
            logger.info(f"Webhook forwarded successfully")
            
            # Registrar log de sucesso
            add_webhook_log(
                lead_data=submission.lead,
                success=True,
                status_code=result.get("status_code"),
                idempotency_key=payload_dict.get('idempotency_key')
            )
            
            return {
                "success": True,
                "message": "Form submitted successfully to n8n",
                "idempotency_key": payload_dict.get('idempotency_key'),
                "webhook_status": result["status_code"]
            }
        else:
            logger.error(f"Webhook forwarding failed: {result['error']}")
            
            # Registrar log de erro
            add_webhook_log(
                lead_data=submission.lead,
                success=False,
                error=result.get('error'),
                idempotency_key=payload_dict.get('idempotency_key')
            )
            
            raise HTTPException(
                status_code=502,
                detail={
                    "error": "Failed to forward to webhook",
                    "message": "Unable to process your submission at this time. Please try again.",
                    "details": result["error"]
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in webhook proxy: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

class WebhookUpdate(BaseModel):
    webhook_url: str = Field(..., description="Nova URL do webhook")

class FundoBase(BaseModel):
    nome: str = Field(..., description="Nome do fundo")
    tipo: str = Field(..., description="Tipo do fundo (constitucional, privado, desenvolvimento, pf)")
    ativo: bool = Field(default=True, description="Se o fundo está ativo")

class CriteriosFundo(BaseModel):
    situacao_empresa: List[str] = Field(default=[], description="Situações de empresa aceitas")
    faturamento_renda: List[str] = Field(default=[], description="Faturamentos/rendas aceitos")
    regioes: List[str] = Field(default=[], description="Regiões aceitas")
    segmentos: List[str] = Field(default=[], description="Segmentos aceitos")
    razoes: List[str] = Field(default=[], description="Razões aceitas")
    garantias: List[str] = Field(default=[], description="Garantias aceitas")
    tipo_imovel: List[str] = Field(default=[], description="Tipos de imóvel aceitos")

class Fundo(FundoBase):
    criterios: CriteriosFundo

class FundoCreate(BaseModel):
    id: str = Field(..., description="ID único do fundo")
    fundo: Fundo

class FundoUpdate(BaseModel):
    fundo: Fundo

# Endpoint de autenticação para admin
# class LoginRequest(BaseModel):
#     email: str
#     password: str

# class LoginResponse(BaseModel):
#     token: str
#     expires_at: int
    
# @app.post("/api/login", response_model=LoginResponse)
# async def login(login_request: LoginRequest, request: Request):
#     """
#     Endpoint para login e geração de token
#     """
#     client_ip = request.client.host
    
#     # Verificar proteção contra força bruta
#     allowed, message = check_brute_force(client_ip)
#     if not allowed:
#         # Registrar tentativa suspeita
#         logger.warning(f"Bloqueio de força bruta ativado para IP: {client_ip}")
#         raise HTTPException(status_code=429, detail=message)
    
#     # Hash da senha enviada (use bcrypt em produção)
#     admin_email_hash = hashlib.sha256(os.getenv("ADMIN_EMAIL", "admin@example.com").encode()).hexdigest()
#     admin_password_hash = hashlib.sha256(os.getenv("ADMIN_PASSWORD", "admin123").encode()).hexdigest()
    
#     email_hash = hashlib.sha256(login_request.email.encode()).hexdigest()
#     password_hash = hashlib.sha256(login_request.password.encode()).hexdigest()
    
#     # Comparação de tempo constante para evitar timing attacks
#     is_email_valid = secrets.compare_digest(email_hash, admin_email_hash)
#     is_password_valid = secrets.compare_digest(password_hash, admin_password_hash)
    
#     if not (is_email_valid and is_password_valid):
#         # Registrar falha de login
#         logger.warning(f"Falha de login para usuário: {login_request.email}, IP: {client_ip}")
#         raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
#     # Limpar tentativas de login após sucesso
#     if client_ip in login_attempts:
#         del login_attempts[client_ip]
    
#     # Gerar token com expiração
#     token = secrets.token_urlsafe(32)
#     expires_at = int(time.time() + API_KEY_EXPIRATION)
    
#     # Armazenar token
#     valid_tokens[token] = {"expires_at": expires_at}
    
#     return {
#         "token": token,
#         "expires_at": expires_at
#     }

# Admin webhook update endpoint
@app.post("/api/admin/webhook")
async def update_webhook(webhook_update: WebhookUpdate, api_key: str = Depends(get_api_key)):
    """
    Endpoint para admin atualizar URL do webhook
    """
    try:
        import re
        
        # Validar se a URL é válida (verificação aprimorada)
        if not webhook_update.webhook_url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="URL deve começar com http:// ou https://")
        
        # Validação adicional da URL para evitar injeção
        url_pattern = re.compile(r'^https?://[\w\-\.]+(:\d+)?(/[\w\-\.~:/?#[\]@!\$&\'\(\)\*\+,;=]+)?$')
        if not url_pattern.match(webhook_update.webhook_url):
            raise HTTPException(status_code=400, detail="URL contém caracteres inválidos")
            
        # Limitar comprimento da URL
        if len(webhook_update.webhook_url) > 500:
            raise HTTPException(status_code=400, detail="URL é muito longa")
        
        # Lista de domínios permitidos (opcional)
        allowed_domains = ["2n8n.ominicrm.com", "webhook.site", "api.investiza.com"]
        url_domain = re.search(r"^https?://([^/]+)", webhook_update.webhook_url)
        
        if url_domain:
            domain = url_domain.group(1)
            # Verificar se é subdomínio de domínio permitido
            is_allowed = False
            for allowed_domain in allowed_domains:
                if domain == allowed_domain or domain.endswith("." + allowed_domain):
                    is_allowed = True
                    break
            
            if not is_allowed:
                logger.warning(f"Tentativa de usar webhook para domínio não permitido: {domain}")
                # Opção mais segura: bloquear domínios não permitidos
                # raise HTTPException(status_code=400, detail="Domínio não permitido para webhook")
                # Opção mais permissiva: apenas registrar o aviso
        
        # Carregar configuração atual
        config = load_fundos_config()
        
        # Sanitizar a URL (extra precaução)
        sanitized_url = webhook_update.webhook_url
        config["configuracao"]["webhook_url"] = sanitized_url
        
        # Salvar configuração
        if not save_fundos_config(config):
            raise HTTPException(status_code=500, detail="Erro ao salvar configuração")
        
        logger.info(f"Webhook URL atualizada para: {sanitized_url}")
        
        return {
            "success": True,
            "message": "Webhook URL atualizada com sucesso",
            "new_webhook_url": sanitized_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Get webhook logs
@app.get("/api/admin/webhook-logs")
async def get_webhook_logs(api_key: str = Depends(get_api_key)):
    """
    Retorna os logs das tentativas de webhook
    """
    return {
        "success": True,
        "logs": webhook_logs
    }

# Endpoint para testar webhook
@app.post("/api/debug/webhook-test")
async def test_webhook(api_key: str = Depends(get_api_key)):
    """
    Testa a conexão com o webhook configurado
    """
    try:
        # Criar um payload de teste
        test_data = {
            "idempotency_key": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "test": True,
            "message": "Webhook test message from Investiza Form"
        }
        
        # Carregar URL do webhook
        config = load_fundos_config()
        webhook_url = config.get("configuracao", {}).get("webhook_url", "https://2n8n.ominicrm.com/webhook/650b310d-cd0b-465a-849d-7c7a3991572e")
        
        if not webhook_url:
            logger.error("URL de webhook não configurada")
            return {"success": False, "error": "URL de webhook não configurada"}
        
        # Importar time localmente para evitar erros de escopo
        import time
        current_time = int(time.time())
        
        # Enviar teste
        try:
            logger.info(f"Enviando teste para webhook: {webhook_url}")
            
            response = requests.post(
                webhook_url,
                json=test_data,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Investiza-Form/1.0",
                    "X-Investiza-Test": "true",
                    "X-Investiza-Timestamp": str(current_time),
                    "X-Investiza-Source": "admin-panel"
                },
                timeout=10  # Timeout aumentado para 10 segundos
            )
            
            # Registramos informações mesmo se o status não for 2xx
            logger.info(f"Resposta do webhook: Status {response.status_code} - {response.text[:100]}")
            
            # Apenas para status codes 4xx e 5xx
            if response.status_code >= 400:
                logger.warning(f"Webhook respondeu com erro: {response.status_code} - {response.text[:200]}")
            else:
                response.raise_for_status()
            
            # Registrar no log de webhook
            add_webhook_log(
                lead_data=None,
                success=response.status_code < 400,
                status_code=response.status_code,
                idempotency_key=test_data["idempotency_key"]
            )
            
            return {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response": response.text[:200],
                "message": "Webhook testado com sucesso"
            }
            
        except requests.RequestException as e:
            # Registrar no log do sistema
            error_msg = f"Erro na requisição ao webhook: {str(e)}"
            logger.error(error_msg)
            
            # Adicionar aos logs de webhook
            add_webhook_log(
                lead_data=None,
                success=False,
                error=error_msg,
                idempotency_key=test_data["idempotency_key"]
            )
            
            return {
                "success": False,
                "error": error_msg
            }
        
    except Exception as e:
        error_msg = f"Erro inesperado ao testar webhook: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg
        }

# Get all fundos
@app.get("/api/admin/fundos")
async def get_fundos(api_key: str = Depends(get_api_key)):
    """
    Retorna todos os fundos com seus critérios
    """
    try:
        config = load_fundos_config()
        return {
            "success": True,
            "fundos": config.get("fundos", {}),
            "opcoes_formulario": config.get("opcoes_formulario", {})
        }
    except Exception as e:
        logger.error(f"Erro ao carregar fundos: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Get specific fundo
@app.get("/api/admin/fundos/{fundo_id}")
async def get_fundo(fundo_id: str, api_key: str = Depends(get_api_key)):
    """
    Retorna dados de um fundo específico
    """
    try:
        config = load_fundos_config()
        fundos = config.get("fundos", {})
        
        if fundo_id not in fundos:
            raise HTTPException(status_code=404, detail="Fundo não encontrado")
        
        return {
            "success": True,
            "fundo": fundos[fundo_id],
            "opcoes_formulario": config.get("opcoes_formulario", {})
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao carregar fundo {fundo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Create new fundo
@app.post("/api/admin/fundos")
async def create_fundo(fundo_create: FundoCreate, api_key: str = Depends(get_api_key)):
    """
    Cria um novo fundo
    """
    try:
        # Sanitizar e validar o ID do fundo
        def sanitize_id(id_string):
            if not isinstance(id_string, str):
                raise HTTPException(status_code=400, detail="ID do fundo deve ser uma string")
            
            # Permitir apenas caracteres alfanuméricos e sublinhados, limitar comprimento
            sanitized = "".join(c for c in id_string if c.isalnum() or c == '_')
            if len(sanitized) > 30:
                sanitized = sanitized[:30]
            
            # Verificar se o ID sanitizado é válido
            if not sanitized or sanitized != id_string:
                raise HTTPException(status_code=400, detail="ID do fundo contém caracteres inválidos")
                
            return sanitized
        
        # Sanitizar e validar o nome do fundo
        def sanitize_nome(nome):
            if not isinstance(nome, str):
                raise HTTPException(status_code=400, detail="Nome do fundo deve ser uma string")
            
            # Permitir apenas caracteres alfanuméricos, espaços e pontuação comum
            sanitized = "".join(c for c in nome if c.isalnum() or c.isspace() or c in '-_.,()&')
            if len(sanitized) > 100:
                sanitized = sanitized[:100]
            
            # Verificar se o nome sanitizado é válido
            if not sanitized or sanitized != nome:
                raise HTTPException(status_code=400, detail="Nome do fundo contém caracteres inválidos")
                
            return sanitized
        
        # Aplicar sanitização
        fundo_id = sanitize_id(fundo_create.id)
        fundo_create.fundo.nome = sanitize_nome(fundo_create.fundo.nome)
        
        config = load_fundos_config()
        fundos = config.get("fundos", {})
        
        if fundo_id in fundos:
            raise HTTPException(status_code=400, detail="Fundo já existe")
        
        # Validar tipo do fundo
        tipos_validos = ["constitucional", "privado", "desenvolvimento", "pf"]
        if fundo_create.fundo.tipo not in tipos_validos:
            raise HTTPException(status_code=400, detail=f"Tipo de fundo inválido. Deve ser um dos seguintes: {', '.join(tipos_validos)}")
        
        # Adicionar novo fundo
        fundos[fundo_id] = fundo_create.fundo.dict()
        config["fundos"] = fundos
        
        # Salvar configuração
        if not save_fundos_config(config):
            raise HTTPException(status_code=500, detail="Erro ao salvar configuração")
        
        logger.info(f"Novo fundo criado: {fundo_id}")
        
        return {
            "success": True,
            "message": "Fundo criado com sucesso",
            "fundo_id": fundo_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar fundo: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Update fundo
@app.put("/api/admin/fundos/{fundo_id}")
async def update_fundo(fundo_id: str, fundo_update: FundoUpdate, api_key: str = Depends(get_api_key)):
    """
    Atualiza um fundo existente
    """
    try:
        config = load_fundos_config()
        fundos = config.get("fundos", {})
        
        if fundo_id not in fundos:
            raise HTTPException(status_code=404, detail="Fundo não encontrado")
        
        # Atualizar fundo
        fundos[fundo_id] = fundo_update.fundo.dict()
        config["fundos"] = fundos
        
        # Salvar configuração
        if not save_fundos_config(config):
            raise HTTPException(status_code=500, detail="Erro ao salvar configuração")
        
        logger.info(f"Fundo atualizado: {fundo_id}")
        
        return {
            "success": True,
            "message": "Fundo atualizado com sucesso",
            "fundo": fundos[fundo_id]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar fundo {fundo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Delete fundo (desativar)
@app.delete("/api/admin/fundos/{fundo_id}")
async def delete_fundo(fundo_id: str, api_key: str = Depends(get_api_key)):
    """
    Desativa um fundo (não remove, apenas marca como inativo)
    """
    try:
        config = load_fundos_config()
        fundos = config.get("fundos", {})
        
        if fundo_id not in fundos:
            raise HTTPException(status_code=404, detail="Fundo não encontrado")
        
        # Desativar fundo
        fundos[fundo_id]["ativo"] = False
        config["fundos"] = fundos
        
        # Salvar configuração
        if not save_fundos_config(config):
            raise HTTPException(status_code=500, detail="Erro ao salvar configuração")
        
        logger.info(f"Fundo desativado: {fundo_id}")
        
        return {
            "success": True,
            "message": "Fundo desativado com sucesso"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao desativar fundo {fundo_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Avaliar elegibilidade dinâmica
@app.post("/api/admin/avaliar-elegibilidade")
async def avaliar_elegibilidade(lead: LeadData, api_key: str = Depends(get_api_key)):
    """Avalia elegibilidade baseado nos critérios dinâmicos dos fundos"""
    try:
        # Mapeamento para termos descritivos de faturamento/renda
        faturamento_map = {
            '<10': 'até R$ 10 milhões',
            '10-80': 'R$ 10 a R$ 80 milhões',
            '>80': 'R$ 80 a R$ 300 milhões',
            '>300': 'acima de R$ 300 milhões',
            'nao_tem': 'ainda não fatura/não tem renda comprovável',
            'ate_5k': 'até R$ 5.000',
            '5k_15k': 'R$ 5.000 a R$ 15.000',
            '15k_50k': 'R$ 15.000 a R$ 50.000',
            'acima_50k': 'acima de R$ 50.000',
        }

        config = load_fundos_config()
        fundos = config.get("fundos", {})
        
        recomendados = []
        possiveis_atipicos = []
        nao_elegiveis = []
        
        # Compilar situação da empresa com recuperação judicial
        situacao_empresa = lead.situacao_empresa
        if situacao_empresa == 'recuperacao_judicial':
            # Aqui assumirei que existe um campo separado na estrutura do lead
            situacao_empresa = f"recuperacao_judicial_homologada"  # Por simplicidade
        
        for fundo_id, fundo_data in fundos.items():
            if not fundo_data.get("ativo", True):
                continue
                
            criterios = fundo_data.get("criterios", {})
            nome_fundo = fundo_data.get("nome", fundo_id)
            
            # Verificar critérios
            matched = True
            motivo_rejeicao = ""
            
            # Situação empresa
            situacoes_aceitas = criterios.get("situacao_empresa", [])
            if situacoes_aceitas and "todos" not in situacoes_aceitas:
                if situacao_empresa not in situacoes_aceitas:
                    matched = False
                    motivo_rejeicao = f"Situação empresarial '{situacao_empresa}' não aceita"
            
            # Faturamento/Renda
            if matched:
                faturamentos_aceitos = criterios.get("faturamento_renda", [])
                if faturamentos_aceitos and "todos" not in faturamentos_aceitas:
                    if lead.faturamento_renda not in faturamentos_aceitos:
                        matched = False
                        motivo_rejeicao = f"Faturamento/renda '{faturamento_map.get(lead.faturamento_renda, lead.faturamento_renda)}' não aceita"
            
            # Região
            if matched:
                regioes_aceitas = criterios.get("regioes", [])
                if regioes_aceitas and "todos" not in regioes_aceitas:
                    if lead.local not in regioes_aceitas:
                        matched = False
                        motivo_rejeicao = f"Região '{lead.local}' não atendida"
            
            # Segmentos
            if matched:
                segmentos_aceitos = criterios.get("segmentos", [])
                if segmentos_aceitos and "todos" not in segmentos_aceitas:
                    # Verificar se pelo menos um segmento do lead está nos aceitos
                    segmentos_match = any(seg in segmentos_aceitas for seg in lead.segmento)
                    if not segmentos_match:
                        matched = False
                        motivo_rejeicao = f"Segmentos {lead.segmento} não aceitos"
            
            # Razões
            if matched:
                razoes_aceitas = criterios.get("razoes", [])
                if razoes_aceitas and "todos" not in razoes_aceitas:
                    # Verificar se pelo menos uma razão do lead está nas aceitas
                    razoes_match = any(razao in razoes_aceitas for razao in lead.razao)
                    if not razoes_match:
                        matched = False
                        motivo_rejeicao = f"Razões {lead.razao} não aceitas"
            
            # Garantias
            if matched:
                garantias_aceitas = criterios.get("garantias", [])
                if garantias_aceitas and "todos" not in garantias_aceitas:
                    # Verificar se pelo menos uma garantia do lead está nas aceitas
                    garantias_match = any(gar in garantias_aceitas for gar in lead.garantia)
                    if not garantias_match:
                        matched = False
                        motivo_rejeicao = f"Garantias {lead.garantia} não aceitas"
            
            # Tipo imóvel (se aplicável)
            if matched and "Imovel" in lead.garantia:
                tipos_imovel_aceitos = criterios.get("tipo_imovel", [])
                if tipos_imovel_aceitos:
                    if not lead.tipo_imovel or lead.tipo_imovel not in tipos_imovel_aceitos:
                        matched = False
                        motivo_rejeicao = f"Tipo de imóvel '{lead.tipo_imovel}' não aceito"
            
            # Classificar resultado
            if matched:
                recomendados.append({
                    "id": fundo_id,
                    "nome": nome_fundo,
                    "motivo": "Atende todos os critérios estabelecidos"
                })
            else:
                nao_elegiveis.append({
                    "id": fundo_id,
                    "nome": nome_fundo,
                    "motivo": motivo_rejeicao
                })
        
        return {
            "success": True,
            "elegibilidade": {
                "recomendados": recomendados,
                "possiveis_atipicos": possiveis_atipicos,
                "nao_elegiveis": nao_elegiveis
            }
        }
        
    except Exception as e:
        logger.error(f"Erro ao avaliar elegibilidade: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno do servidor")

# Root endpoint
@app.get("/api")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Investiza Form Gamificado API",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api/health",
            "submit": "/api/form/submit",
            "validate": "/api/form/validate",
            "config": "/api/form/config",
            "webhook": "/api/form/webhook",
            "admin": {
                "webhook": "/api/admin/webhook",
                "fundos": "/api/admin/fundos",
                "avaliar_elegibilidade": "/api/admin/avaliar-elegibilidade"
            }
        }
    }

# Debug webhook endpoint
@app.post("/api/debug/webhook-test")
async def debug_webhook_test():
    """
    Debug endpoint para testar conectividade do webhook
    """
    import requests
    
    config = load_fundos_config()
    webhook_url = config.get("configuracao", {}).get("webhook_url", "")
    
    if not webhook_url:
        return {"error": "Webhook URL não configurado"}
    
    test_payload = {
        "test": True,
        "source": "investiza-debug-test",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "Teste de conectividade do webhook"
    }
    
    try:
        response = requests.post(
            webhook_url,
            json=test_payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        return {
            "webhook_url": webhook_url,
            "status_code": response.status_code,
            "response_text": response.text,
            "success": response.status_code >= 200 and response.status_code < 300
        }
        
    except Exception as e:
        return {
            "webhook_url": webhook_url,
            "error": str(e),
            "success": False
        }

# Configuração para servir arquivos estáticos do frontend
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Verificar se o diretório de arquivos estáticos existe
static_dir = "/app/static"
if os.path.exists(static_dir):
    # Servir arquivos estáticos do frontend
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # Servir o index.html na rota raiz
    @app.get("/")
    async def serve_frontend():
        return FileResponse('/app/static/index.html')

    # Catch-all para rotas do frontend (SPA)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        return FileResponse('/app/static/index.html')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)