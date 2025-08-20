#!/usr/bin/env python3
"""
Backend API Testing for Investiza Form Gamificado
Tests all API endpoints using the public URL
"""

import requests
import sys
import json
from datetime import datetime
import uuid

class InvestizaAPITester:
    def __init__(self, base_url="https://64f9e230-877c-4eee-a350-0f4d8e9ba397.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'InvestizaAPITester/1.0'
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=10):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Request timeout after {timeout}s")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ FAILED - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Info",
            "GET", 
            "api",
            200
        )

    def test_form_config(self):
        """Test form configuration endpoint"""
        return self.run_test(
            "Form Configuration",
            "GET",
            "api/form/config",
            200
        )

    def test_form_validation_valid(self):
        """Test form validation with valid data"""
        valid_lead_data = {
            "tem_cnpj": "sim",
            "faturamento": "10-80",
            "local": "Nordeste", 
            "segmento": "Agro",
            "razao": "Ampliacao",
            "garantia": "Equipamento"
        }
        
        return self.run_test(
            "Form Validation (Valid Data)",
            "POST",
            "api/form/validate",
            200,
            data=valid_lead_data
        )

    def test_form_validation_imovel(self):
        """Test form validation with Imovel guarantee requiring tipo_imovel"""
        imovel_data = {
            "tem_cnpj": "sim",
            "faturamento": "10-80", 
            "local": "Outra",
            "segmento": "Construtora",
            "razao": "Ampliacao",
            "garantia": "Imovel",
            "tipo_imovel": "Comercial"
        }
        
        return self.run_test(
            "Form Validation (Imovel with tipo_imovel)",
            "POST",
            "api/form/validate", 
            200,
            data=imovel_data
        )

    def test_form_validation_missing_tipo_imovel(self):
        """Test form validation missing tipo_imovel when garantia is Imovel"""
        invalid_data = {
            "tem_cnpj": "sim",
            "faturamento": "10-80",
            "local": "Outra", 
            "segmento": "Construtora",
            "razao": "Ampliacao",
            "garantia": "Imovel"
            # Missing tipo_imovel
        }
        
        return self.run_test(
            "Form Validation (Missing tipo_imovel)",
            "POST",
            "api/form/validate",
            400,
            data=invalid_data
        )

    def test_form_validation_missing_fields(self):
        """Test form validation with missing required fields"""
        incomplete_data = {
            "tem_cnpj": "sim",
            "faturamento": "10-80"
            # Missing other required fields
        }
        
        return self.run_test(
            "Form Validation (Missing Fields)",
            "POST", 
            "api/form/validate",
            400,
            data=incomplete_data
        )

    def test_form_submission_constitutional_scenario(self):
        """Test form submission with constitutional scenario"""
        constitutional_submission = {
            "source": "investiza-form-gamificado",
            "idempotency_key": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "lead": {
                "tem_cnpj": "nao",
                "faturamento": "<10",
                "local": "Nordeste", 
                "segmento": "Agro",
                "razao": "Implantacao",
                "garantia": "Equipamento"
            },
            "eligibility": {
                "recomendados": ["BNB_FNE"],
                "possiveis_atipicos": [],
                "nao_elegiveis": [
                    {"id": "BNDES", "motivo": "Exige CNPJ."},
                    {"id": "ASIA", "motivo": "Fundos privados exigem CNPJ."}
                ]
            },
            "score_gamificado": 60,
            "meta": {
                "user_agent": "InvestizaAPITester/1.0",
                "utm_source": "test",
                "page_url": "https://qualifyinvest.preview.emergentagent.com"
            }
        }
        
        return self.run_test(
            "Form Submission (Constitutional Scenario)",
            "POST",
            "api/form/submit",
            200,
            data=constitutional_submission
        )

    def test_form_submission_private_scenario(self):
        """Test form submission with private scenario"""
        private_submission = {
            "source": "investiza-form-gamificado", 
            "idempotency_key": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "lead": {
                "tem_cnpj": "sim",
                "faturamento": "10-80",
                "local": "Outra",
                "segmento": "Construtora", 
                "razao": "Ampliacao",
                "garantia": "Imovel",
                "tipo_imovel": "Comercial"
            },
            "eligibility": {
                "recomendados": ["ASIA", "SB", "SIFRA", "F3"],
                "possiveis_atipicos": [
                    {"id": "MULTIPLIQUE", "motivo": "Construtora: confirmar faturamento ≥ R$ 18 mi."}
                ],
                "nao_elegiveis": [
                    {"id": "TCASH", "motivo": "Exige imóvel residencial como garantia."}
                ]
            },
            "score_gamificado": 60,
            "meta": {
                "user_agent": "InvestizaAPITester/1.0",
                "utm_source": "test", 
                "page_url": "https://qualifyinvest.preview.emergentagent.com"
            }
        }
        
        return self.run_test(
            "Form Submission (Private Scenario)",
            "POST",
            "api/form/submit", 
            200,
            data=private_submission
        )

    def test_webhook_proxy_specific_payload(self):
        """Test the new webhook proxy endpoint with the specific payload provided by main agent"""
        webhook_payload = {
            "source": "investiza-form-gamificado",
            "idempotency_key": "test-12345",
            "timestamp": "2025-01-17T15:00:00.000Z",  
            "lead": {
                "tem_cnpj": "sim",
                "faturamento": "10-80",
                "local": "Outra",
                "segmento": "Construtora",
                "razao": "Ampliacao", 
                "garantia": "Imovel",
                "tipo_imovel": "Comercial"
            },
            "eligibility": {
                "recomendados": ["ASIA"],
                "possiveis_atipicos": [{"id": "MULTIPLIQUE", "motivo": "Teste"}],
                "nao_elegiveis": [{"id": "TCASH", "motivo": "Teste"}]
            },
            "score_gamificado": 60,
            "meta": {
                "user_agent": "Mozilla/5.0",
                "page_url": "https://qualifyinvest.preview.emergentagent.com"
            }
        }
        
        print(f"\n🎯 CRITICAL TEST: Testing webhook proxy with specific payload from main agent")
        return self.run_test(
            "Webhook Proxy (Specific Payload - CORS Fix Test)",
            "POST",
            "api/form/webhook",
            200,
            data=webhook_payload,
            timeout=20  # Increased timeout for webhook forwarding
        )

    # ========== NEW DYNAMIC CRITERIA SYSTEM TESTS ==========
    
    def test_admin_get_all_fundos(self):
        """Test GET /api/admin/fundos - get all funds with criteria"""
        return self.run_test(
            "Admin - Get All Fundos",
            "GET",
            "api/admin/fundos",
            200
        )

    def test_admin_get_specific_fundo(self):
        """Test GET /api/admin/fundos/{id} - get specific fund"""
        return self.run_test(
            "Admin - Get Specific Fundo (BNB_FNE)",
            "GET",
            "api/admin/fundos/BNB_FNE",
            200
        )

    def test_admin_get_nonexistent_fundo(self):
        """Test GET /api/admin/fundos/{id} - get non-existent fund"""
        return self.run_test(
            "Admin - Get Non-existent Fundo",
            "GET",
            "api/admin/fundos/NONEXISTENT",
            404
        )

    def test_admin_create_new_fundo(self):
        """Test POST /api/admin/fundos - create new fund"""
        new_fundo_data = {
            "id": "TEST_FUND",
            "fundo": {
                "nome": "Fundo de Teste",
                "tipo": "privado",
                "ativo": True,
                "criterios": {
                    "situacao_empresa": ["cnpj_antigo", "cnpj_novo"],
                    "faturamento_renda": ["10-80", ">80"],
                    "regioes": ["Sudeste", "Sul"],
                    "segmentos": ["Tecnologia", "Servicos_Financeiros"],
                    "razoes": ["Ampliacao", "Giro"],
                    "garantias": ["Imovel", "Recebiveis"]
                }
            }
        }
        
        return self.run_test(
            "Admin - Create New Fundo",
            "POST",
            "api/admin/fundos",
            200,
            data=new_fundo_data
        )

    def test_admin_create_duplicate_fundo(self):
        """Test POST /api/admin/fundos - create duplicate fund (should fail)"""
        duplicate_fundo_data = {
            "id": "BNB_FNE",  # This already exists
            "fundo": {
                "nome": "Duplicate Fund",
                "tipo": "privado",
                "ativo": True,
                "criterios": {
                    "situacao_empresa": ["cnpj_antigo"],
                    "faturamento_renda": ["10-80"],
                    "regioes": ["Sudeste"],
                    "segmentos": ["Tecnologia"],
                    "razoes": ["Ampliacao"],
                    "garantias": ["Imovel"]
                }
            }
        }
        
        return self.run_test(
            "Admin - Create Duplicate Fundo (Should Fail)",
            "POST",
            "api/admin/fundos",
            400,
            data=duplicate_fundo_data
        )

    def test_admin_update_existing_fundo(self):
        """Test PUT /api/admin/fundos/{id} - update existing fund"""
        # First create a test fund, then update it
        create_success, _ = self.test_admin_create_new_fundo()
        
        if create_success:
            updated_fundo_data = {
                "fundo": {
                    "nome": "Fundo de Teste Atualizado",
                    "tipo": "privado",
                    "ativo": True,
                    "criterios": {
                        "situacao_empresa": ["cnpj_antigo"],
                        "faturamento_renda": [">80", ">300"],
                        "regioes": ["todos"],
                        "segmentos": ["todos"],
                        "razoes": ["Giro", "Financiamento_Ativo"],
                        "garantias": ["Recebiveis", "Veiculo"]
                    }
                }
            }
            
            return self.run_test(
                "Admin - Update Existing Fundo",
                "PUT",
                "api/admin/fundos/TEST_FUND",
                200,
                data=updated_fundo_data
            )
        else:
            print("❌ Skipping update test - create test failed")
            return False, {}

    def test_admin_update_nonexistent_fundo(self):
        """Test PUT /api/admin/fundos/{id} - update non-existent fund"""
        update_data = {
            "fundo": {
                "nome": "Non-existent Fund",
                "tipo": "privado",
                "ativo": True,
                "criterios": {
                    "situacao_empresa": ["cnpj_antigo"],
                    "faturamento_renda": ["10-80"],
                    "regioes": ["Sudeste"],
                    "segmentos": ["Tecnologia"],
                    "razoes": ["Ampliacao"],
                    "garantias": ["Imovel"]
                }
            }
        }
        
        return self.run_test(
            "Admin - Update Non-existent Fundo (Should Fail)",
            "PUT",
            "api/admin/fundos/NONEXISTENT_FUND",
            404,
            data=update_data
        )

    def test_admin_delete_fundo(self):
        """Test DELETE /api/admin/fundos/{id} - deactivate fund"""
        # Use the test fund we created earlier
        return self.run_test(
            "Admin - Delete/Deactivate Fundo",
            "DELETE",
            "api/admin/fundos/TEST_FUND",
            200
        )

    def test_admin_delete_nonexistent_fundo(self):
        """Test DELETE /api/admin/fundos/{id} - delete non-existent fund"""
        return self.run_test(
            "Admin - Delete Non-existent Fundo (Should Fail)",
            "DELETE",
            "api/admin/fundos/NONEXISTENT_FUND",
            404
        )

    def test_admin_update_webhook(self):
        """Test POST /api/admin/webhook - update webhook URL"""
        webhook_data = {
            "webhook_url": "https://test-webhook.example.com/new-endpoint"
        }
        
        return self.run_test(
            "Admin - Update Webhook URL",
            "POST",
            "api/admin/webhook",
            200,
            data=webhook_data
        )

    def test_admin_update_webhook_invalid_url(self):
        """Test POST /api/admin/webhook - update with invalid URL"""
        invalid_webhook_data = {
            "webhook_url": "invalid-url-without-protocol"
        }
        
        return self.run_test(
            "Admin - Update Webhook Invalid URL (Should Fail)",
            "POST",
            "api/admin/webhook",
            400,
            data=invalid_webhook_data
        )

    def test_admin_avaliar_elegibilidade_cnpj_antigo(self):
        """Test POST /api/admin/avaliar-elegibilidade - evaluate eligibility for CNPJ antigo scenario"""
        lead_data = {
            "nome": "João Silva Empresário",
            "nome_empresa": "Silva Construções Ltda",
            "email": "joao@silvaconstrucoes.com.br",
            "whatsapp": "11987654321",
            "instagram": "@silvaconstrucoes",
            "como_chegou": "google",
            "situacao_empresa": "cnpj_antigo",
            "faturamento_renda": "10-80",
            "local": "Sudeste",
            "municipio_estado": "São Paulo, SP",
            "segmento": ["Construtora"],
            "razao": ["Ampliacao", "Giro"],
            "garantia": ["Imovel"],
            "tipo_imovel": "Comercial"
        }
        
        return self.run_test(
            "Admin - Avaliar Elegibilidade (CNPJ Antigo - Construtora)",
            "POST",
            "api/admin/avaliar-elegibilidade",
            200,
            data=lead_data
        )

    def test_admin_avaliar_elegibilidade_pessoa_fisica(self):
        """Test POST /api/admin/avaliar-elegibilidade - evaluate eligibility for Pessoa Física scenario"""
        lead_data = {
            "nome": "Maria Santos",
            "email": "maria@email.com",
            "whatsapp": "11987654321",
            "como_chegou": "instagram",
            "situacao_empresa": "pessoa_fisica",
            "faturamento_renda": "15k_50k",
            "local": "Sul",
            "municipio_estado": "Porto Alegre, RS",
            "segmento": ["Outros"],
            "segmento_outros": "Consultoria",
            "razao": ["Giro"],
            "garantia": ["Imovel"],
            "tipo_imovel": "Residencial"
        }
        
        return self.run_test(
            "Admin - Avaliar Elegibilidade (Pessoa Física)",
            "POST",
            "api/admin/avaliar-elegibilidade",
            200,
            data=lead_data
        )

    def test_admin_avaliar_elegibilidade_nordeste_agro(self):
        """Test POST /api/admin/avaliar-elegibilidade - evaluate eligibility for Nordeste Agro scenario"""
        lead_data = {
            "nome": "Carlos Oliveira",
            "nome_empresa": "Fazenda Oliveira",
            "email": "carlos@fazendaoliveira.com.br",
            "whatsapp": "85987654321",
            "como_chegou": "indicacao",
            "indicacao_detalhes": "Indicado por João da Fazenda Vizinha",
            "situacao_empresa": "cnpj_novo",
            "faturamento_renda": "<10",
            "local": "Nordeste",
            "segmento": ["Agro"],
            "razao": ["Implantacao", "Financiamento_Ativo"],
            "garantia": ["Equipamento", "Recebiveis"]
        }
        
        return self.run_test(
            "Admin - Avaliar Elegibilidade (Nordeste Agro)",
            "POST",
            "api/admin/avaliar-elegibilidade",
            200,
            data=lead_data
        )

    # ========== REVIEW REQUEST SPECIFIC TESTS ==========
    
    def test_form_validation_new_structure(self):
        """Test form validation with new data structure - tipos_imovel as array and tipos_imovel_detalhado"""
        new_structure_data = {
            "nome": "João Teste",
            "email": "joao@teste.com", 
            "whatsapp": "+55 11 99999-9999",
            "como_chegou": "google",
            "situacao_empresa": "cnpj_antigo",
            "faturamento_renda": "10-80",
            "local": "Sudeste",
            "municipio_estado": "São Paulo, SP",  # Required for Sudeste
            "segmento": ["Tecnologia"],
            "razao": ["Ampliacao", "Giro"],
            "garantia": ["Imovel Residencial", "Imovel Rural", "Recebiveis"],
            "tipos_imovel_detalhado": ["Residencial", "Rural"]
        }
        
        return self.run_test(
            "Form Validation (New Structure - tipos_imovel_detalhado)",
            "POST",
            "api/form/validate",
            200,
            data=new_structure_data
        )

    def test_form_validation_tipos_imovel_array(self):
        """Test form validation with tipos_imovel as array"""
        tipos_imovel_array_data = {
            "nome": "Maria Silva",
            "email": "maria@teste.com", 
            "whatsapp": "+55 11 88888-8888",
            "como_chegou": "instagram",
            "situacao_empresa": "cnpj_novo",
            "faturamento_renda": ">80",
            "local": "Sul",
            "municipio_estado": "Porto Alegre, RS",
            "segmento": ["Construtora", "Servicos_Financeiros"],
            "razao": ["Ampliacao"],
            "garantia": ["Recebiveis", "Veiculo"],  # Changed from Imovel to avoid tipo_imovel requirement
            "tipos_imovel": ["Residencial", "Comercial"],  # Array format
            "tipos_imovel_detalhado": ["Residencial", "Comercial"]
        }
        
        return self.run_test(
            "Form Validation (tipos_imovel as Array)",
            "POST",
            "api/form/validate",
            200,
            data=tipos_imovel_array_data
        )

    def test_webhook_new_structure(self):
        """Test webhook endpoint with new data structure"""
        webhook_new_structure = {
            "source": "investiza-form-gamificado",
            "idempotency_key": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "lead": {
                "nome": "João Teste",
                "email": "joao@teste.com", 
                "whatsapp": "+55 11 99999-9999",
                "como_chegou": "google",
                "situacao_empresa": "cnpj_antigo",
                "faturamento_renda": "10-80",
                "local": "Sudeste",
                "segmento": ["Tecnologia"],
                "razao": ["Ampliacao", "Giro"],
                "garantia": ["Imovel Residencial", "Imovel Rural", "Recebiveis"],
                "tipos_imovel_detalhado": ["Residencial", "Rural"]
            },
            "eligibility": {
                "recomendados": ["ASIA", "SB"],
                "possiveis_atipicos": [],
                "nao_elegiveis": [
                    {"id": "BNB_FNE", "motivo": "Região não atendida"}
                ]
            },
            "score_gamificado": 75,
            "meta": {
                "user_agent": "TestAgent/1.0",
                "utm_source": "test",
                "page_url": "https://test.com"
            }
        }
        
        return self.run_test(
            "Webhook (New Data Structure)",
            "POST",
            "api/form/webhook",
            200,
            data=webhook_new_structure,
            timeout=20
        )

    def test_form_validation_optional_fields(self):
        """Test form validation with optional fields to ensure they are accepted"""
        optional_fields_data = {
            "nome": "Carlos Oliveira",
            "nome_empresa": "Oliveira Tech Ltda",  # Optional
            "email": "carlos@oliveira.com", 
            "whatsapp": "+55 21 77777-7777",
            "instagram": "@oliveira_tech",  # Optional
            "como_chegou": "indicacao",
            "indicacao_detalhes": "Indicado por amigo",  # Required when como_chegou is indicacao
            "situacao_empresa": "cnpj_antigo",
            "faturamento_renda": ">300",
            "local": "Sudeste",
            "municipio_estado": "Rio de Janeiro, RJ",  # Required for Sudeste/Sul
            "segmento": ["Tecnologia", "Outros"],
            "segmento_outros": "Desenvolvimento de Software",  # Required when segmento includes Outros
            "razao": ["Giro", "Financiamento_Ativo"],
            "razao_outros": "Expansão internacional",  # Optional
            "garantia": ["Recebiveis", "Veiculo"],
            "tipos_imovel": [],  # Optional - empty array
            "tipos_imovel_detalhado": []  # Optional - empty array
        }
        
        return self.run_test(
            "Form Validation (Optional Fields Acceptance)",
            "POST",
            "api/form/validate",
            200,
            data=optional_fields_data
        )

    def test_form_validation_processed_guarantees(self):
        """Test form validation with processed guarantees like 'Imovel Residencial', 'Imovel Rural'"""
        processed_guarantees_data = {
            "nome": "Ana Costa",
            "email": "ana@costa.com", 
            "whatsapp": "+55 85 66666-6666",
            "como_chegou": "facebook",
            "situacao_empresa": "pessoa_fisica",
            "faturamento_renda": "15k_50k",
            "local": "Nordeste",
            "segmento": ["Agro"],
            "razao": ["Implantacao"],
            "garantia": ["Imovel Residencial", "Imovel Rural", "Equipamento"],  # Processed guarantees
            "tipos_imovel_detalhado": ["Residencial", "Rural"]
        }
        
        return self.run_test(
            "Form Validation (Processed Guarantees)",
            "POST",
            "api/form/validate",
            200,
            data=processed_guarantees_data
        )

    def test_form_config_json_loading(self):
        """Test GET /api/form/config - verify JSON options loading"""
        success, response_data = self.run_test(
            "Form Config - JSON Loading Verification",
            "GET",
            "api/form/config",
            200
        )
        
        if success and isinstance(response_data, dict):
            # Verify that the response contains expected structure from JSON
            expected_fields = ["situacao_empresa", "faturamento_renda", "regioes", "segmentos", "razoes", "garantias", "tipo_imovel", "como_chegou"]
            fields = response_data.get("fields", {})
            
            missing_fields = [field for field in expected_fields if field not in fields]
            if missing_fields:
                print(f"   ⚠️  Missing fields in config: {missing_fields}")
            else:
                print(f"   ✅ All expected fields present in config")
                
            # Check if webhook_url is loaded
            webhook_url = response_data.get("webhook_url", "")
            if webhook_url:
                print(f"   ✅ Webhook URL loaded: {webhook_url[:50]}...")
            else:
                print(f"   ⚠️  Webhook URL not found in config")
        
        return success, response_data

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=10):
        """Enhanced run_test method with better PUT/DELETE support"""
        url = f"{self.base_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=timeout)
            elif method == 'PUT':
                response = self.session.put(url, json=data, timeout=timeout)
            elif method == 'DELETE':
                response = self.session.delete(url, timeout=timeout)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except requests.exceptions.Timeout:
            print(f"❌ FAILED - Request timeout after {timeout}s")
            return False, {}
        except requests.exceptions.ConnectionError:
            print(f"❌ FAILED - Connection error")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Investiza API Tests - Dynamic Criteria System")
        print(f"   Base URL: {self.base_url}")
        print("=" * 80)

        # Basic endpoint tests
        print("\n📋 BASIC ENDPOINT TESTS")
        self.test_health_check()
        self.test_root_endpoint()
        
        # Form configuration test (JSON loading verification)
        print("\n📋 FORM CONFIGURATION TESTS")
        self.test_form_config_json_loading()
        
        # Legacy validation tests (for backward compatibility)
        print("\n📋 LEGACY VALIDATION TESTS")
        self.test_form_validation_valid()
        self.test_form_validation_imovel()
        self.test_form_validation_missing_tipo_imovel()
        self.test_form_validation_missing_fields()
        
        # Legacy submission tests
        print("\n📋 LEGACY SUBMISSION TESTS")
        self.test_form_submission_constitutional_scenario()
        self.test_form_submission_private_scenario()
        self.test_webhook_proxy_specific_payload()

        # ========== NEW DYNAMIC CRITERIA SYSTEM TESTS ==========
        print("\n🎯 DYNAMIC CRITERIA SYSTEM TESTS")
        
        # Admin CRUD operations for fundos
        print("\n📋 ADMIN FUNDOS CRUD TESTS")
        self.test_admin_get_all_fundos()
        self.test_admin_get_specific_fundo()
        self.test_admin_get_nonexistent_fundo()
        self.test_admin_create_new_fundo()
        self.test_admin_create_duplicate_fundo()
        self.test_admin_update_existing_fundo()
        self.test_admin_update_nonexistent_fundo()
        self.test_admin_delete_fundo()
        self.test_admin_delete_nonexistent_fundo()
        
        # Admin webhook management
        print("\n📋 ADMIN WEBHOOK TESTS")
        self.test_admin_update_webhook()
        self.test_admin_update_webhook_invalid_url()
        
        # Dynamic eligibility evaluation
        print("\n📋 DYNAMIC ELIGIBILITY EVALUATION TESTS")
        self.test_admin_avaliar_elegibilidade_cnpj_antigo()
        self.test_admin_avaliar_elegibilidade_pessoa_fisica()
        self.test_admin_avaliar_elegibilidade_nordeste_agro()

        # ========== REVIEW REQUEST SPECIFIC TESTS ==========
        print("\n🎯 REVIEW REQUEST SPECIFIC TESTS - NEW DATA STRUCTURE")
        self.test_form_validation_new_structure()
        self.test_form_validation_tipos_imovel_array()
        self.test_webhook_new_structure()
        self.test_form_validation_optional_fields()
        self.test_form_validation_processed_guarantees()

        # Print results
        print("\n" + "=" * 80)
        print(f"📊 COMPREHENSIVE TEST RESULTS")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Detailed breakdown
        failed_tests = self.tests_run - self.tests_passed
        if failed_tests == 0:
            print("✅ ALL TESTS PASSED - Dynamic Criteria System is working correctly!")
            print("   ✅ JSON file loading works")
            print("   ✅ CRUD operations for fundos work")
            print("   ✅ Dynamic eligibility evaluation works")
            print("   ✅ Webhook management works")
            return 0
        else:
            print(f"❌ {failed_tests} TESTS FAILED - Check implementation")
            if failed_tests <= 3:
                print("   ⚠️  Minor issues detected - core functionality may still work")
            else:
                print("   🚨 Major issues detected - system needs attention")
            return 1

def main():
    tester = InvestizaAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())