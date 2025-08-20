# Dockerfile para EasyPanel
FROM node:18-alpine AS frontend-build

# Build do Frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN yarn install
COPY frontend/ ./
RUN yarn build

# Backend Python
FROM python:3.9-slim AS backend

WORKDIR /app

# Instalar dependências Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar arquivos do backend
COPY backend/ ./
COPY fundos_criterios.json ./

# Copiar frontend buildado
COPY --from=frontend-build /app/frontend/build ./static/

# Expor porta
EXPOSE 8000

# Comando para iniciar
CMD ["python", "-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]