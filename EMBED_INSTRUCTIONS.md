# Como Fazer Embed do Formulário Investiza

## Opção 1: iFrame (Mais Simples)

```html
<iframe 
    src="https://qualifyinvest.preview.emergentagent.com" 
    width="100%" 
    height="800px" 
    frameborder="0"
    style="border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
</iframe>
```

### Responsivo:
```html
<div style="position: relative; width: 100%; height: 0; padding-bottom: 75%;">
    <iframe 
        src="https://qualifyinvest.preview.emergentagent.com" 
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 8px;">
    </iframe>
</div>
```

## Opção 2: Popup/Modal

```html
<button onclick="openInvestizaForm()">Qualificar meu Projeto</button>

<script>
function openInvestizaForm() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
            <div style="position: relative; width: 90%; max-width: 800px; height: 90%; max-height: 800px; background: white; border-radius: 10px; overflow: hidden;">
                <button onclick="this.closest('div').parentElement.remove()" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; z-index: 1;">×</button>
                <iframe src="https://qualifyinvest.preview.emergentagent.com" width="100%" height="100%" frameborder="0"></iframe>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
</script>
```

## Opção 3: Integração Direta (Avançado)

Se quiser integrar diretamente no seu site, você precisará:

1. Copiar os arquivos `/app/frontend/src/` para seu projeto
2. Instalar as dependências do `package.json`
3. Ajustar as cores/branding conforme necessário
4. Apontar para seu próprio backend ou usar o webhook direto

## Configurações Opcionais

### UTM Parameters
O formulário automaticamente captura UTM parameters da URL:
- `?utm_source=google&utm_medium=cpc&utm_campaign=investimento`

### Customizações de Estilo
Para ajustar cores no iFrame via CSS:
```html
<style>
iframe {
    filter: hue-rotate(30deg); /* Ajustar cores */
    border-radius: 10px;
}
</style>
```

## Webhook de Destino

Os dados são enviados para:
`https://2n8n.ominicrm.com/webhook-test/650b310d-cd0b-465a-849d-7c7a3991572e`

### Estrutura do JSON enviado:
```json
{
  "source": "investiza-form-gamificado-v2",
  "idempotency_key": "uuid",
  "timestamp": "2025-01-17T15:00:00.000Z",
  "lead": {
    "nome": "João Silva",
    "nome_empresa": "Empresa ABC",
    "email": "joao@teste.com",
    "whatsapp": "+55 11 99999-9999",
    "instagram": "@joao",
    "como_chegou": "google",
    "situacao_empresa": "cnpj_antigo",
    "faturamento_renda": "10-80",
    "local": "Sudeste",
    "municipio_estado": "São Paulo - SP",
    "segmento": "Tecnologia",
    "razao": ["Ampliacao", "Giro"],
    "garantia": ["Imovel", "Recebiveis"],
    "tipo_imovel": "Comercial"
  },
  "analise": {
    "descritiva": "Análise baseada no perfil...",
    "chance_emprestimo": "92.5",
    "pontuacao": {
      "scoreTotal": 750,
      "scorePorcentagem": "93.8",
      "descricao": "Score calculado com base em 8 critérios..."
    }
  },
  "fundos_alcancaveis": [...],
  "fundos_nao_alcancaveis": [...],
  "score_gamificado": 750,
  "meta": {
    "user_agent": "...",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "investimento",
    "page_url": "https://seusite.com/pagina"
  }
}
```

## Suporte

Para dúvidas sobre implementação ou customizações, consulte a documentação técnica ou entre em contato.