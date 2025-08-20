#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Implementar sistema de critérios dinâmicos para fundos na área admin. Corrigir campo 'Razão do Projeto' para array no JSON. Melhorar respostas do formulário. Usar arquivo JSON simples como banco de dados. Permitir configurar critérios de cada fundo via admin. Incluir área para trocar webhook."

backend:
  - task: "Implementar sistema de critérios usando arquivo JSON simples"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Tarefa identificada - precisa criar endpoints para gerenciar critérios dos fundos"
      - working: true
        agent: "testing"
        comment: "✅ IMPLEMENTADO E FUNCIONANDO: Sistema JSON carregando 16 fundos com critérios dinâmicos. Endpoints GET /api/admin/fundos funcionando perfeitamente. Arquivo fundos_criterios.json sendo lido corretamente com estrutura completa de fundos, opções de formulário e configurações."

  - task: "Corrigir campo 'razao' como array no JSON"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Campo já está como array no modelo, precisa verificar se está funcionando corretamente"
      - working: true
        agent: "testing"
        comment: "✅ FUNCIONANDO: Campo 'razao' está corretamente implementado como array no modelo LeadData e sendo processado corretamente na avaliação de elegibilidade. Testes confirmam que múltiplas razões são aceitas e processadas."

  - task: "API dinâmica para avaliação de critérios dos fundos"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Precisa implementar lógica para avaliar respostas contra critérios de cada fundo"
      - working: true
        agent: "testing"
        comment: "✅ FUNCIONANDO PERFEITAMENTE: Endpoint POST /api/admin/avaliar-elegibilidade implementado e testado com sucesso. Avalia corretamente critérios dinâmicos para diferentes cenários: CNPJ antigo (8 fundos recomendados), Pessoa Física (3 fundos PF recomendados), Nordeste Agro (BNB_FNE recomendado). Lógica de matching funciona para todos os critérios: situação empresa, faturamento, região, segmentos, razões, garantias."

  - task: "Endpoints CRUD para gerenciar fundos"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "✅ FUNCIONANDO: Todos os endpoints CRUD implementados e testados: GET /api/admin/fundos (lista todos), GET /api/admin/fundos/{id} (busca específico), POST /api/admin/fundos (criar novo), PUT /api/admin/fundos/{id} (atualizar), DELETE /api/admin/fundos/{id} (desativar). Tratamento de erros correto para fundos inexistentes (404) e duplicados (400)."

  - task: "Endpoint para gerenciar webhook URL"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "✅ FUNCIONANDO: Endpoint POST /api/admin/webhook implementado e funcionando. Valida URLs corretamente (deve começar com http/https), salva no JSON, retorna erro 400 para URLs inválidas. Webhook URL sendo carregada dinamicamente do arquivo JSON."

  - task: "Carregar opções do formulário do JSON"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "✅ FUNCIONANDO: Endpoint GET /api/form/config carregando todas as opções do arquivo JSON corretamente. Todos os campos esperados presentes: situacao_empresa, faturamento_renda, regioes, segmentos, razoes, garantias, tipo_imovel, como_chegou. Webhook URL também sendo carregada dinamicamente."

frontend:
  - task: "Melhorar interface de critérios na área admin"
    implemented: false
    working: "NA"
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Admin já existe mas precisa ser conectado com sistema de critérios dinâmicos"

  - task: "Melhorar respostas do formulário (mais expressivas)"
    implemented: false
    working: "NA"
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Precisa revisar e melhorar textos do formulário"

  - task: "Interface simplificada para adicionar/editar fundos"
    implemented: false
    working: "NA"
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Área admin já tem estrutura básica mas precisa ser aprimorada"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Melhorar interface de critérios na área admin"
    - "Interface simplificada para adicionar/editar fundos"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "Iniciando implementação do sistema de critérios dinâmicos. Foco em usar arquivo JSON simples e conectar com admin existente."
  - agent: "testing"
    message: "✅ BACKEND COMPLETAMENTE FUNCIONAL: Sistema de critérios dinâmicos implementado com sucesso. Todos os endpoints principais funcionando: CRUD de fundos, avaliação de elegibilidade dinâmica, gerenciamento de webhook, carregamento de opções do JSON. Arquivo fundos_criterios.json sendo usado como banco de dados com 16 fundos configurados. Lógica de critérios dinâmicos funcionando perfeitamente para diferentes cenários (CNPJ antigo, Pessoa Física, Agro Nordeste). Minor: Alguns testes legacy falharam por mudança na estrutura de dados, mas funcionalidade core está 100% operacional."