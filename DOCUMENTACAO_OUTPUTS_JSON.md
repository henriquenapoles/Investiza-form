# 📋 DOCUMENTAÇÃO COMPLETA - OUTPUTS JSON DO FORMULÁRIO INVESTIZA

## 🎯 **VISÃO GERAL**
Este documento lista todos os possíveis valores que cada campo pode ter no JSON final enviado pelo formulário.

---

## 📝 **ESTRUTURA GERAL DO JSON**

```json
{
  "source": "investiza-form-gamificado-v2",
  "idempotency_key": "uuid-gerado-automaticamente",
  "timestamp": "2025-01-19T15:30:45.123Z",
  "lead": {
    // DADOS DO FORMULÁRIO AQUI
  },
  "eligibility": {
    "recomendados": ["ID_FUNDO1", "ID_FUNDO2"],
    "possiveis_atipicos": [],
    "nao_elegiveis": []
  },
  "analise": {
    "descritiva": "Texto da análise gerada",
    "chance_emprestimo": "85.5",
    "pontuacao": { /* detalhes do score */ }
  },
  "fundos_alcancaveis": [],
  "fundos_nao_alcancaveis": [],
  "score_gamificado": 720,
  "meta": {
    "user_agent": "Mozilla/5.0...",
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "campanha_exemplo",
    "page_url": "https://site.com/form"
  }
}
```

---

## 🔍 **CAMPOS DETALHADOS DO LEAD**

### 1️⃣ **STEP 1: Situação da Empresa**
**Campo:** `situacao_empresa`  
**Tipo:** String

**Valores Possíveis:**
```json
"situacao_empresa": "cnpj_antigo"           // CNPJ há mais de 3 anos
"situacao_empresa": "cnpj_novo"             // CNPJ há menos de 3 anos
"situacao_empresa": "implantacao"           // Empresa em implantação
"situacao_empresa": "pessoa_fisica"         // Pessoa física
"situacao_empresa": "recuperacao_judicial_homologada"     // RJ Homologada
"situacao_empresa": "recuperacao_judicial_nao_homologada" // RJ Não Homologada
```

**Campo Condicional:** `recuperacao_judicial_homologada`
```json
"recuperacao_judicial_homologada": "homologada"      // Se RJ foi homologada
"recuperacao_judicial_homologada": "nao_homologada"  // Se RJ não foi homologada
```

---

### 2️⃣ **STEP 2: Dados de Contato**

**Campo:** `nome`  
**Tipo:** String  
**Exemplo:** `"João Silva Santos"`

**Campo:** `nome_empresa` *(Condicional - apenas se tem CNPJ)*  
**Tipo:** String  
**Exemplo:** `"Inovação Tech Ltda"`

**Campo:** `email`  
**Tipo:** String  
**Exemplo:** `"joao.silva@empresa.com.br"`

**Campo:** `whatsapp`  
**Tipo:** String (formatado automaticamente)  
**Exemplo:** `"+55 11 99988-7766"`

**Campo:** `instagram` *(Opcional)*  
**Tipo:** String  
**Exemplo:** `"@joaosilva_ceo"` ou `""`

---

### 3️⃣ **STEP 3: Como Chegou até Nós**
**Campo:** `como_chegou`  
**Tipo:** String

**Valores Possíveis:**
```json
"como_chegou": "instagram"    // 📸 Instagram
"como_chegou": "google"       // 🔍 Google/Busca  
"como_chegou": "linkedin"     // 💼 LinkedIn
"como_chegou": "facebook"     // 👥 Facebook
"como_chegou": "youtube"      // 📺 YouTube
"como_chegou": "whatsapp"     // 💬 WhatsApp
"como_chegou": "site"         // 🌐 Site da empresa
"como_chegou": "indicacao"    // 🤝 Indicação
"como_chegou": "eventos"      // 🎪 Eventos
"como_chegou": "outros (Canal específico)"  // 📝 Outros (com detalhes)
```

**Campo Condicional:** `indicacao_detalhes` *(apenas se como_chegou = "indicacao")*
```json
"indicacao_detalhes": "Nome da pessoa ou empresa que indicou"
```

**Campo Condicional:** `outros_detalhes` *(apenas se como_chegou = "outros")*
```json
"outros_detalhes": "Revista Exame"
"outros_detalhes": "Rádio CBN"
"outros_detalhes": "Outdoor na cidade"
```

**Observação:** Quando `como_chegou = "outros"`, o valor final no JSON será processado como:
```json
"como_chegou": "outros (Revista Exame)"
"como_chegou": "outros (Rádio CBN)"
"como_chegou": "outros (Referência de cliente)"
```

---

### 4️⃣ **STEP 4: Faturamento/Renda**
**Campo:** `faturamento_renda`  
**Tipo:** String

**Valores para PESSOA JURÍDICA:**
```json
"faturamento_renda": "nao_tem"    // Ainda não fatura
"faturamento_renda": "<10"        // Até R$ 10 milhões
"faturamento_renda": "10-80"      // R$ 10 a R$ 80 milhões
"faturamento_renda": ">80"        // R$ 80 a R$ 300 milhões
"faturamento_renda": ">300"       // Acima de R$ 300 milhões
```

**Valores para PESSOA FÍSICA:**
```json
"faturamento_renda": "ate_5k"     // Até R$ 5.000
"faturamento_renda": "5k_15k"     // R$ 5.000 a R$ 15.000
"faturamento_renda": "15k_50k"    // R$ 15.000 a R$ 50.000
"faturamento_renda": "acima_50k"  // Acima de R$ 50.000
"faturamento_renda": "nao_tem"    // Não tem renda comprovável
```

---

### 5️⃣ **STEP 5: Localização**
**Campo:** `local`  
**Tipo:** String

**Valores Possíveis:**
```json
"local": "Nordeste"       // 🌴 Nordeste
"local": "Norte"          // 🌿 Norte
"local": "Centro-Oeste"   // 🌾 Centro-Oeste
"local": "Sudeste"        // 🏙️ Sudeste
"local": "Sul"            // 🍇 Sul
```

**Campo Condicional:** `municipio_estado` *(obrigatório para algumas regiões)*
```json
"municipio_estado": "São Paulo - SP"     // Formato livre
"municipio_estado": "Rio de Janeiro - RJ"
"municipio_estado": "Belo Horizonte - MG"
```

---

### 6️⃣ **STEP 6: Segmentos** *(MÚLTIPLA ESCOLHA)*
**Campo:** `segmento`  
**Tipo:** Array de Strings

**Valores Possíveis:**
```json
"segmento": ["Agro"]                    // 🌱 Agronegócio
"segmento": ["Safra_Agricola"]          // 🚜 Safra/Agrícola  
"segmento": ["Industria_Atacado"]       // 🏭 Indústria/Atacado
"segmento": ["Construtora"]             // 🏗️ Construção Civil
"segmento": ["Tecnologia"]              // 💻 Tecnologia/Software
"segmento": ["Servicos_Financeiros"]    // 💳 Serviços Financeiros
"segmento": ["Saude"]                   // 🏥 Saúde/Medicina
"segmento": ["Educacao"]                // 🎓 Educação
"segmento": ["Servico_Publico"]         // 🏛️ Serviço Público
"segmento": ["Varejo"]                  // 🛒 Varejo/Comércio
"segmento": ["Outros"]                  // 📋 Outros
```

**Exemplos de Combinações:**
```json
"segmento": ["Tecnologia", "Servicos_Financeiros"]
"segmento": ["Construtora", "Industria_Atacado"]  
"segmento": ["Agro", "Safra_Agricola", "Outros"]
```

**Campo Condicional:** `segmento_outros` *(apenas se "Outros" selecionado)*
```json
"segmento_outros": "Desenvolvimento de Software"
"segmento_outros": "Consultoria Especializada"
```

---

### 7️⃣ **STEP 7: Razões do Projeto** *(MÚLTIPLA ESCOLHA)*
**Campo:** `razao`  
**Tipo:** Array de Strings

**Valores Possíveis:**
```json
"razao": ["Implantacao"]                // 🌱 Implantação de Negócio
"razao": ["Ampliacao"]                  // 📈 Ampliação/Expansão
"razao": ["Giro"]                       // 💰 Capital de Giro
"razao": ["Financiamento_Ativo"]        // 🏭 Financiamento de Ativo
"razao": ["Modernizacao_Tecnologia"]    // ⚙️ Modernização/Tecnologia
"razao": ["Aquisicao"]                  // 🤝 Aquisição de Empresa
"razao": ["Safra_Agro"]                 // 🌾 Safra/Agronegócio
"razao": ["Outros"]                     // 📝 Outros
```

**Exemplos de Combinações:**
```json
"razao": ["Ampliacao", "Giro"]
"razao": ["Modernizacao_Tecnologia", "Financiamento_Ativo"]
"razao": ["Implantacao", "Safra_Agro", "Outros"]
```

**Campo Condicional:** `razao_outros` *(apenas se "Outros" selecionado)*
```json
"razao_outros": "Expansão para mercado internacional"
"razao_outros": "Diversificação de produtos"
```

---

### 8️⃣ **STEP 8: Garantias** *(MÚLTIPLA ESCOLHA)*
**Campo:** `garantia` **(PROCESSADO)**  
**Tipo:** Array de Strings

**Valores Base:**
```json
"garantia": ["Veiculo"]         // 🚗 Veículos/Frota
"garantia": ["Equipamento"]     // ⚙️ Equipamentos/Máquinas  
"garantia": ["Recebiveis"]      // 📄 Recebíveis/Contratos
"garantia": ["CartaFianca"]     // 🏛️ Carta de Fiança
"garantia": ["Estoque"]         // 📦 Estoque/Mercadorias
"garantia": ["NaoSei"]          // ❓ Não sei quais tenho
"garantia": ["Nenhuma"]         // ❌ Não tenho garantias
```

**Valores Processados para Imóveis:**
```json
"garantia": ["Imovel Residencial"]    // 🏠 Imóvel Residencial
"garantia": ["Imovel Comercial"]      // 🏢 Imóvel Comercial  
"garantia": ["Imovel Industrial"]     // 🏭 Imóvel Industrial
"garantia": ["Imovel Rural"]          // 🌾 Imóvel Rural
"garantia": ["Imovel Terreno"]        // 📍 Terreno
```

**Exemplos de Combinações Processadas:**
```json
"garantia": ["Imovel Residencial", "Imovel Rural", "Recebiveis"]
"garantia": ["Imovel Comercial", "Veiculo", "Equipamento"]  
"garantia": ["Recebiveis", "Estoque"]
"garantia": ["NaoSei"]
```

**Campos Auxiliares:**
```json
"tipos_imovel_detalhado": ["Residencial", "Rural"]     // Array original dos tipos
"tipos_imovel": ["Residencial", "Rural"]               // Legacy/compatibility
```

---

## 🎯 **EXEMPLOS COMPLETOS DE LEAD**

### **Exemplo 1: Empresa Tecnologia**
```json
{
  "nome": "João Silva Santos",
  "nome_empresa": "TechInova Ltda",
  "email": "joao@techinova.com.br", 
  "whatsapp": "+55 11 99988-7766",
  "instagram": "@techinova_oficial",
  "como_chegou": "google",
  "indicacao_detalhes": "",
  "situacao_empresa": "cnpj_antigo",
  "faturamento_renda": "10-80",
  "local": "Sudeste",
  "municipio_estado": "São Paulo - SP",
  "segmento": ["Tecnologia", "Servicos_Financeiros"],
  "segmento_outros": "",
  "razao": ["Ampliacao", "Modernizacao_Tecnologia"],
  "razao_outros": "",
  "garantia": ["Imovel Comercial", "Recebiveis", "Equipamento"],
  "tipos_imovel_detalhado": ["Comercial"]
}
```

### **Exemplo 2: Pessoa Física**
```json
{
  "nome": "Maria Santos",
  "nome_empresa": "",
  "email": "maria@email.com",
  "whatsapp": "+55 21 88877-6655", 
  "instagram": "",
  "como_chegou": "indicacao",
  "indicacao_detalhes": "Indicada pela amiga Ana",
  "situacao_empresa": "pessoa_fisica",
  "faturamento_renda": "15k_50k",
  "local": "Sul",
  "municipio_estado": "Porto Alegre - RS",
  "segmento": ["Outros"],
  "segmento_outros": "Consultoria",
  "razao": ["Giro"],
  "razao_outros": "", 
  "garantia": ["Imovel Residencial"],
  "tipos_imovel_detalhado": ["Residencial"]
}
```

### **Exemplo 3: Agronegócio Múltiplas Garantias**
```json
{
  "nome": "Carlos Fazendeiro",
  "nome_empresa": "Fazenda Boa Vista",
  "email": "carlos@fazendaboavista.com.br",
  "whatsapp": "+55 62 77766-5544",
  "instagram": "@fazendaboavista",
  "como_chegou": "instagram", 
  "indicacao_detalhes": "",
  "situacao_empresa": "cnpj_novo",
  "faturamento_renda": "<10",
  "local": "Centro-Oeste",
  "municipio_estado": "Goiânia - GO",
  "segmento": ["Agro", "Safra_Agricola"],
  "segmento_outros": "",
  "razao": ["Implantacao", "Safra_Agro", "Financiamento_Ativo"],
  "razao_outros": "",
  "garantia": ["Imovel Rural", "Imovel Residencial", "Equipamento", "Veiculo"],
  "tipos_imovel_detalhado": ["Rural", "Residencial"]
}
```

---

## 🏛️ **IDs DOS FUNDOS DISPONÍVEIS**

**Fundos Constitucionais:**
- `BNB_FNE` - BNB — FNE
- `BASA_FNO` - BASA — FNO  
- `FCO_BB` - FCO — via Banco do Brasil

**Fundos de Desenvolvimento:**
- `BNDES` - BNDES (equipamentos)

**Fundos Privados:**
- `ASIA` - Asia
- `SB` - SB Crédito
- `SIFRA` - Sifra
- `F3` - 3F Fundo
- `MULTIPLIQUE` - Multiplique
- `SAFRA` - Safra
- `SOFISA` - Sofisa
- `DAICOVAL` - Daicoval

**Pessoa Física (Home Equity):**
- `TCASH` - TCash
- `CASHME` - CashMe
- `GALERIA` - Galeria

---

## 📊 **CAMPOS DE ANÁLISE GERADOS**

```json
"analise": {
  "descritiva": "Análise baseada no perfil: cnpj_antigo, faturamento: 10-80 milhões...",
  "chance_emprestimo": "92.3",
  "pontuacao": {
    "scoreTotal": 720,
    "scorePorcentagem": "90.0", 
    "descricao": "Score calculado com base em 8 critérios..."
  }
}
```

---

## 🔗 **METADADOS AUTOMÁTICOS**

```json
"meta": {
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "utm_source": "google",
  "utm_medium": "cpc", 
  "utm_campaign": "financiamento_empresas",
  "page_url": "https://site.com/form?utm_source=google&utm_medium=cpc"
}
```

---

## ⚠️ **OBSERVAÇÕES IMPORTANTES**

1. **Campos Obrigatórios:** `nome`, `email`, `whatsapp`, `como_chegou`, `situacao_empresa`, `faturamento_renda`, `local`, `segmento`, `razao`, `garantia`

2. **Campos Condicionais:**
   - `nome_empresa`: obrigatório se tem CNPJ
   - `indicacao_detalhes`: obrigatório se `como_chegou = "indicacao"`
   - `municipio_estado`: obrigatório para Sudeste/Sul
   - `segmento_outros`: obrigatório se segmento inclui "Outros"
   - `razao_outros`: opcional mesmo se razao inclui "Outros"

3. **Processamento Especial:**
   - `garantia` é processada para expandir "Imovel" + tipos em entradas separadas
   - `situacao_empresa` é compilada com status de recuperação judicial
   - `whatsapp` é formatado automaticamente para padrão brasileiro

4. **Arrays vs Strings:**
   - `segmento`, `razao`, `garantia` são sempre arrays
   - `tipos_imovel_detalhado` é array
   - Demais campos são strings

---

**📅 Documento atualizado em:** Janeiro 2025  
**🔧 Sistema:** Investiza Lead Qualification Form v2.0