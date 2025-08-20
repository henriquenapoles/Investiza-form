# Documentação para Implantação do Investiza Form no EasyPainel

Este documento contém instruções detalhadas para implantar o sistema Investiza Form no EasyPainel.

## Visão Geral

O Investiza Form é um sistema de formulário gamificado para qualificação de leads para fundos de investimento. O sistema consiste em:

1. **Frontend**: Aplicação React
2. **Backend**: API REST em FastAPI (Python)
3. **Armazenamento**: Arquivos JSON (sem banco de dados)

## Requisitos

- Node.js 16+ (para o frontend)
- Python 3.8+ (para o backend)
- 1GB de RAM mínimo
- 2 vCPUs recomendados

## Estrutura do Projeto

```
Investiza-form/
  ├── frontend/          # Aplicação React
  ├── backend/           # API FastAPI (Python)
  ├── Dockerfile         # Arquivo para build do container
  └── docker-compose.yml # Configuração de serviços
```

## Configuração no EasyPainel

### 1. Criar Novo Projeto

- Nome: Investiza Form
- Stack: Docker
- Branch: main

### 2. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no projeto:

```
ADMIN_API_KEY=<chave_de_api_segura>  # Chave para acesso ao painel administrativo
PORT=80                             # Porta onde o serviço estará disponível
WEBHOOK_URL=https://2n8n.ominicrm.com/webhook/650b310d-cd0b-465a-849d-7c7a3991572e
```

### 3. Configuração do Serviço

O arquivo `docker-compose.yml` já contém a configuração necessária para execução no EasyPainel:

```yaml
version: '3'

services:
  investiza-form:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-9999}:80"
    volumes:
      - ./data:/app/data
    environment:
      - ADMIN_API_KEY=${ADMIN_API_KEY:-123456}
      - WEBHOOK_URL=${WEBHOOK_URL:-https://2n8n.ominicrm.com/webhook/650b310d-cd0b-465a-849d-7c7a3991572e}
    restart: unless-stopped
```

### 4. Arquivo Dockerfile

O Dockerfile realiza a construção em múltiplos estágios:

1. **Stage de build do frontend**: Constrói a aplicação React
2. **Stage de build do backend**: Configura o ambiente Python
3. **Stage final**: Combina o frontend e backend em uma única imagem

```dockerfile
# Stage 1: Build do frontend
FROM node:16 as frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build do backend
FROM python:3.9-slim
WORKDIR /app

# Copiar e instalar dependências do backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar backend
COPY backend/ ./backend/

# Copiar frontend buildado
COPY --from=frontend-builder /app/build ./frontend/build

# Diretório para dados persistentes
RUN mkdir -p /app/data
VOLUME /app/data

# Expor porta do serviço
EXPOSE 80

# Comando para iniciar a aplicação
CMD ["python", "backend/server.py"]
```

## Implantação

1. Faça login no EasyPainel
2. Acesse "Projetos" e clique em "Novo Projeto"
3. Selecione "Git Repository" como fonte
4. Cole o URL do repositório Git
5. Escolha "Docker" como stack de implantação
6. Configure as variáveis de ambiente
7. Clique em "Deploy"

## Verificação da Implantação

Após a implantação, você pode verificar se a aplicação está funcionando corretamente acessando:

1. **Interface de usuário**: `https://[seu-dominio]/`
2. **Área administrativa**: `https://[seu-dominio]/admin?admin_key=[ADMIN_API_KEY]`

## Persistência de Dados

Os dados dos fundos e configurações são salvos em arquivos JSON dentro da pasta `/app/data`. Para garantir a persistência, esta pasta é configurada como um volume do Docker.

## Manutenção

### Atualização da Aplicação

Para atualizar a aplicação:

1. Faça push das alterações para o repositório Git
2. Acesse o EasyPainel e clique em "Redeploy"

### Backup dos Dados

Você pode fazer backup dos dados através do volume Docker:

```bash
docker cp [container-id]:/app/data /caminho/para/backup
```

## Monitoramento

O EasyPainel fornece ferramentas de monitoramento integradas. Recomenda-se verificar:

- Uso de CPU e memória
- Logs da aplicação para identificar possíveis erros

## Webhook

O sistema encaminha submissões de formulário para o webhook configurado:
`https://2n8n.ominicrm.com/webhook/650b310d-cd0b-465a-849d-7c7a3991572e`

Para alterar o endpoint do webhook, você pode:
1. Modificar a variável de ambiente `WEBHOOK_URL`
2. Usar a interface de administração em `/admin?admin_key=[ADMIN_API_KEY]`

## Solução de Problemas

### Erro de Conexão com o Webhook

Se ocorrerem erros de conexão com o webhook, verifique:

1. Se o URL do webhook está correto
2. Se o serviço de webhook está online
3. Os logs da aplicação para mais detalhes

### Problemas de Desempenho

Se a aplicação estiver lenta:

1. Verifique o uso de recursos no EasyPainel
2. Considere aumentar os recursos alocados para o container

### Erros no Backend

Os logs do backend podem ser acessados através do EasyPainel no painel de "Logs".

## Suporte

Para suporte técnico, entre em contato com equipe@emergent.ai
