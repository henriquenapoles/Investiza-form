import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { ChevronLeft, ChevronRight, CheckCircle, Award, TrendingUp, User, Mail, Phone, Settings, Eye, Trash2, Plus, Save } from 'lucide-react';
import './App.css';

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('investiza_admin_auth_token', data.token); // Novo token
        localStorage.setItem('investiza_admin_expires', data.expires_at.toString());
        onLogin(true);
      } else {
        setError(data.detail || 'Credenciais inválidas');
      }
    } catch (err) {
      console.error('Erro de login:', err);
      setError('Erro ao tentar fazer login. Verifique a conexão com o servidor.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-slate-200">Admin - Investiza</CardTitle>
          <p className="text-slate-400">Área de administração dos fundos</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-slate-200"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">Senha</Label>
              <Input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-slate-200"
                placeholder="Digite sua senha"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Admin Dashboard Component
  const AdminDashboard = ({ onLogout, adminKey, adminAuthError }) => {
    const [activeTab, setActiveTab] = useState('fundos');
    const [webhookUrl, setWebhookUrl] = useState(''); // Inicialize vazio, será carregado
    const [fundos, setFundos] = useState({});
    const [opcoesFormulario, setOpcoesFormulario] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(adminAuthError || ''); // Use o erro passado como prop
    const [editingFundo, setEditingFundo] = useState(null);
    const [showAddFundo, setShowAddFundo] = useState(false);
    const [tempFundo, setTempFundo] = useState({});
    const [webhookLogs, setWebhookLogs] = useState([]); // Logs do webhook
    

    // Estados para critérios
    const [selectedFundo, setSelectedFundo] = useState('');
    const [criterios, setCriterios] = useState({});
    const [tempCriterios, setTempCriterios] = useState({});

  // Carregar dados do backend ao inicializar
  useEffect(() => {
    if (adminKey) {
      loadFundosFromBackend(adminKey);
      loadWebhookConfig(adminKey); // Carregar a URL do webhook também
    } else if (!adminAuthError) {
      setError('Chave de administração ausente ou inválida.');
    }
  }, [adminKey, adminAuthError]);

  const loadFundosFromBackend = async (key) => {
    setLoading(true);
    setError('');
    
    if (!key) {
      setError('Chave de autenticação ausente. Faça login novamente.');
      setLoading(false);
      return; 
    }

    try {
      const response = await fetch(`/api/admin/fundos`, {
        headers: {
          'X-API-Key': key,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFundos(data.fundos || {});
        setOpcoesFormulario(data.opcoes_formulario || {});
      } else {
        throw new Error('Erro ao carregar fundos');
      }
    } catch (e) {
      console.error('Erro ao carregar fundos:', e);
      setError('Erro ao carregar dados dos fundos');
      // Fallback para dados locais se necessário
      // Verificar se existe token válido antes de tentar carregar do localStorage
      const auth = localStorage.getItem('investiza_admin_auth');
      const expiresAt = localStorage.getItem('investiza_admin_expires');
      
      if (auth === 'true' && expiresAt && parseInt(expiresAt, 10) > Date.now()) {
        const saved = localStorage.getItem('investiza_admin_config');
        if (saved) {
          try {
            // Sanitização dos dados carregados do localStorage
            const config = JSON.parse(saved);
            // Verificar se o objeto tem a estrutura esperada antes de usar
            if (config && typeof config === 'object' && config.fundos && typeof config.fundos === 'object') {
              setFundos(config.fundos);
            } else {
              console.error('Formato de configuração inválido no localStorage');
            }
          } catch(e) {
            console.error('Erro ao carregar backup local:', e);
            // Limpar dados corrompidos
            localStorage.removeItem('investiza_admin_config');
          }
        }
      } else {
        // Limpar dados se token expirado
        localStorage.removeItem('investiza_admin_config');
      }
    } finally {
      setLoading(false);
    }
  };

  // Carregar critérios do fundo selecionado
  useEffect(() => {
    if (selectedFundo && fundos[selectedFundo]) {
      const criteriosFundo = fundos[selectedFundo].criterios || {};
      setCriterios(criteriosFundo);
      setTempCriterios(criteriosFundo);
    }
  }, [selectedFundo, fundos]);

  // Salvar configurações no backend
  const saveConfig = async () => {
    setLoading(true);
    setError('');
    
    if (!adminKey) {
      setError('Chave de autenticação ausente. Faça login novamente.');
      setLoading(false);
      return; 
    }

    try {
      // Atualizar webhook
      const webhookResponse = await fetch(`/api/admin/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': adminKey },
        body: JSON.stringify({ webhook_url: webhookUrl })
      });

      if (!webhookResponse.ok) {
        throw new Error('Erro ao atualizar webhook');
      }

      // Recarregar dados dos fundos
      await loadFundosFromBackend(adminKey);
      
      alert('✅ Configurações salvas com sucesso!');
    } catch(e) {
      console.error('Erro ao salvar:', e);
      alert('❌ Erro ao salvar configurações: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar configurações do backend (removida pois agora carrega automaticamente no useEffect)

  // Editar fundo
  const handleEditFundo = (id) => {
    setTempFundo({ id, ...fundos[id] });
    setEditingFundo(id);
  };

  // Carregar webhook URL da configuração
  const loadWebhookConfig = async (key) => {
    try {
      const response = await fetch(`/api/form/config`, {
        headers: {
            'X-API-Key': key,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.webhook_url) {
          setWebhookUrl(data.webhook_url);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar webhook:', e);
    }
  };

  // Carregar logs do webhook
  const loadWebhookLogs = async () => {
    try {
      setLoading(true);
      console.log('Carregando logs de webhook...');
      
      const response = await fetch(`/api/admin/webhook-logs`, {
        headers: {
            'X-API-Key': adminKey,
            'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Logs recebidos:', data);
        setWebhookLogs(data.logs || []);
      } else {
        console.error('Erro ao carregar logs:', response.status);
        setError('Falha ao carregar logs do webhook. Verifique o console para mais detalhes.');
      }
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
      setError('Falha ao carregar logs do webhook: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const salvarCriterios = async () => {
    if (!selectedFundo) return;

    setLoading(true);
    setError('');
    
    if (!adminKey) {
      setError('Chave de autenticação ausente. Faça login novamente.');
      setLoading(false);
      return; 
    }

    try {
      const fundoAtual = fundos[selectedFundo];
      const fundoAtualizado = {
        ...fundoAtual,
        criterios: tempCriterios
      };

      const response = await fetch(`/api/admin/fundos/${selectedFundo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': adminKey },
        body: JSON.stringify({ fundo: fundoAtualizado })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar critérios');
      }

      await loadFundosFromBackend(adminKey);
      alert('✅ Critérios salvos com sucesso!');
    } catch (e) {
      console.error('Erro ao salvar critérios:', e);
      alert('❌ Erro ao salvar critérios: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const testarCriterios = async () => {
    if (!selectedFundo) return;

    // Dados de exemplo para teste
    const dadosExemplo = {
      nome: "João Silva Teste",
      nome_empresa: "Empresa de Teste",
      email: "teste@exemplo.com",
      whatsapp: "+55 11 99999-9999",
      como_chegou: "google",
      situacao_empresa: "cnpj_antigo",
      faturamento_renda: "10-80",
      local: "Sudeste",
      municipio_estado: "São Paulo, SP",
      segmento: ["Tecnologia"],
      razao: ["Ampliacao"],
      garantia: ["Imovel"],
      tipo_imovel: "Comercial"
    };

    try {
      const response = await fetch(`/api/admin/avaliar-elegibilidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosExemplo)
      });

      if (response.ok) {
        const resultado = await response.json();
        const fundoNosRecomendados = resultado.elegibilidade.recomendados.find(f => f.id === selectedFundo);
        const fundoNosNaoElegiveis = resultado.elegibilidade.nao_elegiveis.find(f => f.id === selectedFundo);
        
        if (fundoNosRecomendados) {
          alert(`✅ TESTE APROVADO!\n\nFundo: ${fundoNosRecomendados.nome}\nStatus: RECOMENDADO\nMotivo: ${fundoNosRecomendados.motivo}`);
        } else if (fundoNosNaoElegiveis) {
          alert(`❌ TESTE REPROVADO!\n\nFundo: ${fundoNosNaoElegiveis.nome}\nStatus: NÃO ELEGÍVEL\nMotivo: ${fundoNosNaoElegiveis.motivo}`);
        } else {
          alert(`⚠️ TESTE INDEFINIDO!\n\nFundo não apareceu nem como recomendado nem como não elegível.`);
        }
      } else {
        throw new Error('Erro na avaliação');
      }
    } catch (e) {
      alert('❌ Erro ao testar critérios: ' + e.message);
    }
  };

  const handleCriterioChange = (categoria, valor, checked) => {
    // Sanitizar entradas para evitar injeções
    const sanitizarTexto = (texto) => {
      if (typeof texto !== 'string') return '';
      return texto
        .replace(/[^\w\s\-_]/g, '') // Permitir apenas alfanuméricos, espaços, hífens e sublinhados
        .trim();
    };
    
    const categoriaSanitizada = sanitizarTexto(categoria);
    const valorSanitizado = sanitizarTexto(valor);
    
    // Verificar se os valores sanitizados são válidos
    if (!categoriaSanitizada || !valorSanitizado) return;
    
    setTempCriterios(prev => {
      const categoriaAtual = prev[categoriaSanitizada] || [];
      
      if (checked) {
        // Adicionar se não existir
        if (!categoriaAtual.includes(valorSanitizado)) {
          return {
            ...prev,
            [categoriaSanitizada]: [...categoriaAtual, valorSanitizado]
          };
        }
      } else {
        // Remover se existir
        return {
          ...prev,
          [categoriaSanitizada]: categoriaAtual.filter(item => item !== valorSanitizado)
        };
      }
      
      return prev;
    });
  };

  // Salvar edição do fundo no backend
  // Função para salvar um fundo existente
  const handleSaveFundo = async () => {
    const { id, ...fundoData } = tempFundo;
    
    setLoading(true);
    setError('');
    
    if (!adminKey) {
      setError('Chave de autenticação ausente. Faça login novamente.');
      setLoading(false);
      return; 
    }

    // Validar campos obrigatórios
    if (!tempFundo.nome || !tempFundo.tipo) {
      setError('Nome e Tipo são campos obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/fundos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': adminKey },
        body: JSON.stringify({ fundo: fundoData })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Erro ao salvar fundo');
      }

      // Recarregar dados do backend
      await loadFundosFromBackend(adminKey);
      
      setEditingFundo(null);
      setTempFundo({});
      alert('✅ Fundo atualizado com sucesso!');
    } catch (e) {
      console.error('Erro ao salvar fundo:', e);
      setError('Erro ao salvar fundo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para adicionar um novo fundo
  const handleAddFundo = async () => {
    setLoading(true);
    setError('');
    
    if (!adminKey) {
      setError('Chave de autenticação ausente. Faça login novamente.');
      setLoading(false);
      return;
    }
    
    // Validar campos obrigatórios
    if (!tempFundo.id || !tempFundo.nome || !tempFundo.tipo) {
      setError('ID, Nome e Tipo são campos obrigatórios.');
      setLoading(false);
      return;
    }
    
    // Validar formato do ID (alfanumérico sem espaços)
    if (!/^[A-Za-z0-9_]+$/.test(tempFundo.id)) {
      setError('ID deve conter apenas letras, números e underscores.');
      setLoading(false);
      return;
    }
    
    // Verificar se ID já existe
    if (fundos[tempFundo.id]) {
      setError('Este ID já está em uso. Escolha outro identificador.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/fundos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': adminKey },
        body: JSON.stringify({ 
          id: tempFundo.id,
          fundo: {
            nome: tempFundo.nome,
            tipo: tempFundo.tipo,
            ativo: tempFundo.ativo !== undefined ? tempFundo.ativo : true,
            regioes: tempFundo.regioes || [],
            min_faturamento: tempFundo.min_faturamento || null,
            max_faturamento: tempFundo.max_faturamento || null,
            descricao: tempFundo.descricao || "",
            segmentos_excluidos: tempFundo.segmentos_excluidos || [],
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Erro ao criar fundo');
      }

      // Recarregar dados do backend
      await loadFundosFromBackend(adminKey);
      
      setShowAddFundo(false);
      setTempFundo({});
      alert('✅ Fundo criado com sucesso!');
    } catch (e) {
      console.error('Erro ao criar fundo:', e);
      setError('Erro ao criar fundo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar modal de edição
  const renderEditModal = () => {
    if (!editingFundo) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-2xl bg-gray-800 border-gray-700 max-h-96 overflow-y-auto">
          <CardHeader>
            <CardTitle className="text-slate-200">Editar Fundo: {tempFundo.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Nome do Fundo</Label>
              <Input
                value={tempFundo.nome || ''}
                onChange={(e) => setTempFundo(prev => ({ ...prev, nome: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-slate-200"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Tipo</Label>
              <select
                value={tempFundo.tipo || ''}
                onChange={(e) => setTempFundo(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-slate-200"
              >
                <option value="constitucional">Constitucional</option>
                <option value="privado">Privado</option>
                <option value="desenvolvimento">Desenvolvimento</option>
                <option value="pf">Pessoa Física</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-300">Regiões aceitas (separadas por vírgula ou "todos")</Label>
              <Input
                value={tempFundo.criterios?.regioes?.join(', ') || ''}
                onChange={(e) => {
                  const valor = e.target.value.trim();
                  const regioes = valor === 'todos' ? ['todos'] : valor.split(',').map(r => r.trim()).filter(r => r);
                  setTempFundo(prev => ({ 
                    ...prev, 
                    criterios: {
                      ...prev.criterios,
                      regioes: regioes
                    }
                  }));
                }}
                className="bg-gray-700 border-gray-600 text-slate-200"
                placeholder="Nordeste, Sudeste, Sul ou todos"
              />
            </div>

            <div>
              <Label className="text-slate-300">Faturamento aceito (separado por vírgula ou "todos")</Label>
              <Input
                value={tempFundo.criterios?.faturamento_renda?.join(', ') || ''}
                onChange={(e) => {
                  const valor = e.target.value.trim();
                  const faturamentos = valor === 'todos' ? ['todos'] : valor.split(',').map(r => r.trim()).filter(r => r);
                  setTempFundo(prev => ({ 
                    ...prev, 
                    criterios: {
                      ...prev.criterios,
                      faturamento_renda: faturamentos
                    }
                  }));
                }}
                className="bg-gray-700 border-gray-600 text-slate-200"
                placeholder="10-80, >80, >300 ou todos"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingFundo(null)}
                className="border-gray-600 text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveFundo}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };



  const renderCriteriosTab = () => {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-200">Critérios por Fundo</h2>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Configurar Critérios de Elegibilidade</CardTitle>
            <p className="text-slate-400">Configure os critérios específicos para cada fundo</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Selecione o Fundo</Label>
              <select
                value={selectedFundo}
                onChange={(e) => setSelectedFundo(e.target.value)}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-slate-200"
              >
                <option value="">Escolha um fundo...</option>
                {Object.entries(fundos).map(([id, fundo]) => (
                  <option key={id} value={id}>{fundo.nome}</option>
                ))}
              </select>
            </div>

            {selectedFundo && (
              <div className="space-y-6 mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-lg font-semibold text-slate-200">
                  Critérios para: {fundos[selectedFundo]?.nome}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Situação Empresa (aceitas)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.situacao_empresa?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.situacao_empresa?.includes(option.value) || false}
                            onChange={(e) => handleCriterioChange('situacao_empresa', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Faturamento (aceitos)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.faturamento_renda?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.faturamento_renda?.includes(option.value) || tempCriterios.faturamento_renda?.includes('todos') || false}
                            onChange={(e) => handleCriterioChange('faturamento_renda', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Regiões (aceitas)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.regioes?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.regioes?.includes(option.value) || tempCriterios.regioes?.includes('todos') || false}
                            onChange={(e) => handleCriterioChange('regioes', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Garantias (aceitas)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.garantias?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.garantias?.includes(option.value) || tempCriterios.garantias?.includes('todos') || false}
                            onChange={(e) => handleCriterioChange('garantias', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Segmentos (aceitos)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.segmentos?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.segmentos?.includes(option.value) || tempCriterios.segmentos?.includes('todos') || false}
                            onChange={(e) => handleCriterioChange('segmentos', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Razões (aceitas)</Label>
                    <div className="space-y-2 mt-2">
                      {opcoesFormulario.razoes?.map(option => (
                        <label key={option.value} className="flex items-center space-x-2 text-sm">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600"
                            checked={tempCriterios.razoes?.includes(option.value) || tempCriterios.razoes?.includes('todos') || false}
                            onChange={(e) => handleCriterioChange('razoes', option.value, e.target.checked)}
                          />
                          <span className="text-slate-300">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button 
                    onClick={salvarCriterios}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? '⏳ Salvando...' : '💾 Salvar Critérios'}
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-yellow-600 text-yellow-400"
                    onClick={testarCriterios}
                    disabled={!selectedFundo}
                  >
                    🧪 Testar Critérios
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Regras de Negócio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-300">
              <p>• <strong>Fundos Constitucionais:</strong> Aceitam qualquer situação empresarial, dependem da região</p>
              <p>• <strong>Fundos Privados:</strong> Exigem CNPJ, faturamento mínimo, não fazem implantação</p>
              <p>• <strong>BNDES:</strong> Exige CNPJ + garantia equipamento para desenvolvimento</p>
              <p>• <strong>PF Home Equity:</strong> Apenas pessoa física + imóvel residencial</p>
              <p>• <strong>Recuperação Judicial:</strong> Tratamento especial baseado se foi homologada</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderConfiguracoesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-200">Configurações do Sistema</h2>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Webhook de Envio</CardTitle>
          <p className="text-slate-400">URL para onde os dados do formulário serão enviados</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-300">URL do Webhook</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-gray-700 border-gray-600 text-slate-200"
              placeholder="https://2n8n.ominicrm.com/webhook/..."
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={saveConfig} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? '⏳ Salvando...' : 'Salvar Webhook'}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  // Primeiro testar com o endpoint de debug
                  const debugResponse = await fetch(`/api/debug/webhook-test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  if (debugResponse.ok) {
                    const debugData = await debugResponse.json();
                    
                    if (debugData.success) {
                      alert('✅ Webhook funcionando perfeitamente!');
                    } else if (debugData.status_code === 404) {
                      alert(`❌ WEBHOOK NÃO ESTÁ ATIVO!\n\n🔧 SOLUÇÃO:\n1. Acesse o n8n workflow\n2. Clique em "Execute workflow" \n3. Tente novamente\n\n📋 DETALHES:\n${debugData.response_text}`);
                    } else {
                      alert(`❌ Erro no webhook (${debugData.status_code}):\n${debugData.response_text || debugData.error}`);
                    }
                  } else {
                    throw new Error('Erro no endpoint de debug');
                  }
                } catch(e) {
                  alert('❌ Erro ao testar webhook: ' + e.message);
                }
              }}
              className="border-yellow-600 text-yellow-400"
            >
              Testar Webhook
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                try {
                  // Recarregar dados mais recentes do backend
                  await loadFundosFromBackend();
                  
                  const data = JSON.stringify({ fundos, webhookUrl, timestamp: new Date().toISOString() }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `investiza-config-${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                } catch (e) {
                  alert('❌ Erro ao fazer backup: ' + e.message);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              📥 Fazer Backup
            </Button>
            
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                      try {
                        const config = JSON.parse(e.target.result);
                        if (config.fundos) {
                          // Aqui seria necessário implementar um endpoint de restauração em massa no backend
                          alert('⚠️ Restauração em massa será implementada em versão futura. Por enquanto, use a interface para configurar fundos individualmente.');
                        }
                        if (config.webhookUrl) {
                          setWebhookUrl(config.webhookUrl);
                          await saveConfig();
                        }
                      } catch(err) {
                        alert('❌ Arquivo inválido!');
                      }
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              variant="outline"
              className="border-blue-600 text-blue-400"
            >
              📤 Restaurar Backup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-200">Preview do Formulário</h2>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Teste Rápido de Elegibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Situação CNPJ</Label>
                <select className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-slate-200">
                  <option>CNPJ há mais de 3 anos</option>
                  <option>CNPJ há menos de 3 anos</option>
                  <option>Empresa em implantação</option>
                  <option>Pessoa física</option>
                  <option>CNPJ em Recuperação Judicial</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Faturamento</Label>
                <select className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-slate-200">
                  <option>R$ 10 a R$ 80 milhões</option>
                  <option>Acima de R$ 80 milhões</option>
                </select>
              </div>
            </div>
            
            <Button className="bg-blue-600 hover:bg-blue-700">
              🔍 Simular Elegibilidade
            </Button>
            
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <p className="text-slate-300 text-sm">
                💡 Em breve: simulação em tempo real dos critérios de elegibilidade
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-slate-200">Link do Formulário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value="https://qualifyinvest.preview.emergentagent.com"
              readOnly
              className="bg-gray-700 border-gray-600 text-slate-200"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText('https://qualifyinvest.preview.emergentagent.com');
                alert('✅ Link copiado!');
              }}
              variant="outline"
              className="border-blue-600 text-blue-400"
            >
              📋 Copiar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLogsTab = () => {
    // Atualizar logs quando a aba for aberta
    if (activeTab === 'logs' && webhookLogs.length === 0) {
      loadWebhookLogs();
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-200">Logs do Webhook</h2>
          <Button
            onClick={loadWebhookLogs}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={loading}
          >
            🔄 Atualizar Logs
          </Button>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Últimas Tentativas de Envio</CardTitle>
            <p className="text-slate-400 text-sm">Monitore as tentativas de envio do formulário para o webhook</p>
          </CardHeader>
          <CardContent>
            {webhookLogs.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhum log disponível ainda</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {webhookLogs.map((log, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    log.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-medium ${log.success ? 'text-green-400' : 'text-red-400'}`}>
                        {log.success ? '✅ Sucesso' : '❌ Erro'}
                      </span>
                      <span className="text-slate-400 text-sm">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <p className="text-slate-300">
                        <strong>Lead:</strong> {log.lead_name} ({log.lead_email})
                      </p>
                      <p className="text-slate-300">
                        <strong>ID:</strong> {log.idempotency_key}
                      </p>
                      {log.error && (
                        <p className="text-red-300 mt-2">
                          <strong>Erro:</strong> {log.error}
                        </p>
                      )}
                      {log.status_code && (
                        <p className="text-slate-400">
                          <strong>Status HTTP:</strong> {log.status_code}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Diagnóstico do Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
                <span className="text-slate-300">URL do Webhook:</span>
                <code className="text-yellow-400 text-sm">{webhookUrl || 'Não configurado'}</code>
              </div>
              
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/debug/webhook-test`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'X-API-Key': adminKey }
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      if (data.success) {
                        alert('✅ Webhook está funcionando corretamente!');
                      } else {
                        alert(`❌ Erro no webhook: ${data.error || 'Erro desconhecido'}`);
                      }
                    } else {
                      alert('❌ Erro ao testar webhook');
                    }
                  } catch(e) {
                    alert('❌ Erro de conexão ao testar webhook');
                  }
                }}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                🧪 Testar Conexão do Webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderFundosTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-200">Gestão de Fundos</h2>
        <div className="space-x-2">
          <Button onClick={() => {
            console.log('Clicando em Novo Fundo...');
            setShowAddFundo(true);
            console.log('showAddFundo definido como true');
          }} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Fundo
          </Button>
          <Button onClick={saveConfig} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {Object.entries(fundos).map(([id, fundo]) => (
          <Card key={id} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-200">{fundo.nome}</h3>
                    <Badge className={`${fundo.ativo ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {fundo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant="outline" className="text-slate-400">
                      {fundo.tipo}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-slate-400 space-y-1">
                    <p><strong>ID:</strong> {id}</p>
                    <p><strong>Tipo:</strong> {fundo.tipo}</p>
                    {fundo.criterios?.regioes && fundo.criterios.regioes.length > 0 && !fundo.criterios.regioes.includes('todos') && (
                      <p><strong>Regiões:</strong> {fundo.criterios.regioes.join(', ')}</p>
                    )}
                    {fundo.criterios?.garantias && fundo.criterios.garantias.length > 0 && !fundo.criterios.garantias.includes('todos') && (
                      <p><strong>Garantias:</strong> {fundo.criterios.garantias.join(', ')}</p>
                    )}
                    {fundo.criterios?.segmentos && fundo.criterios.segmentos.length > 0 && !fundo.criterios.segmentos.includes('todos') && (
                      <p><strong>Segmentos:</strong> {fundo.criterios.segmentos.join(', ')}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditFundo(id)}
                    className="border-blue-600 text-blue-400"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (confirm(`Desativar fundo ${fundo.nome}?`)) {
                        setLoading(true);
                        setError('');
                        
                        if (!adminKey) {
                          setError('Chave de autenticação ausente. Faça login novamente.');
                          setLoading(false);
                          return; 
                        }

                        try {
                          const response = await fetch(`/api/admin/fundos/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'X-API-Key': adminKey,
                            }
                          });
                          
                          if (!response.ok) {
                            throw new Error('Erro ao desativar fundo');
                          }
                          
                          await loadFundosFromBackend();
                          alert('✅ Fundo desativado com sucesso!');
                        } catch (e) {
                          console.error('Erro ao desativar fundo:', e);
                          alert('❌ Erro ao desativar fundo: ' + e.message);
                        } finally {
                          setLoading(false);
                        }
                      }
                    }}
                    className="border-red-600 text-red-400"
                  >
                    {fundo.ativo ? <Eye className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-200">Admin Investiza</h1>
            <p className="text-slate-400">Painel de administração dos fundos e critérios</p>
            {error && (
              <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-red-300 text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {loading && (
              <div className="flex items-center text-slate-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400 mr-2"></div>
                Carregando...
              </div>
            )}
            <Button onClick={onLogout} variant="outline" className="border-red-600 text-red-400">
              Sair
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          {[
            { id: 'fundos', label: 'Fundos' },
            { id: 'criterios', label: 'Critérios' },
            { id: 'configuracoes', label: 'Configurações' },
            { id: 'preview', label: 'Preview' },
            { id: 'logs', label: '📋 Logs' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'bg-blue-600' : 'border-gray-600 text-slate-300'}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg p-6 min-h-96">
          {activeTab === 'fundos' && renderFundosTab()}
          {activeTab === 'criterios' && renderCriteriosTab()}
          {activeTab === 'configuracoes' && renderConfiguracoesTab()}
          {activeTab === 'preview' && renderPreviewTab()}
          {activeTab === 'logs' && renderLogsTab()}
        </div>

        {/* Edit Modal */}
        {renderEditModal()}
        
        {/* Add Fundo Modal */}
        {showAddFundo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" style={{zIndex: 9999}}>
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-600">
              <h2 className="text-xl font-bold text-white mb-4">➕ Adicionar Novo Fundo</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">ID do Fundo *</label>
                  <input
                    type="text"
                    value={tempFundo.id || ''}
                    onChange={(e) => setTempFundo(prev => ({ ...prev, id: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Ex: NOVO_FUNDO_2024"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Nome do Fundo *</label>
                  <input
                    type="text"
                    value={tempFundo.nome || ''}
                    onChange={(e) => setTempFundo(prev => ({ ...prev, nome: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Ex: Banco XYZ - Crédito Empresarial"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Tipo *</label>
                  <select
                    value={tempFundo.tipo || ''}
                    onChange={(e) => setTempFundo(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="constitucional">Constitucional</option>
                    <option value="privado">Privado</option>
                    <option value="desenvolvimento">Desenvolvimento</option>
                    <option value="pf">Pessoa Física</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-2">Descrição</label>
                  <input
                    type="text"
                    value={tempFundo.descricao || ''}
                    onChange={(e) => setTempFundo(prev => ({ ...prev, descricao: e.target.value }))}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    placeholder="Breve descrição do fundo"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowAddFundo(false);
                    setTempFundo({});
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddFundo}
                  disabled={!tempFundo.id || !tempFundo.nome || !tempFundo.tipo}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
                >
                  ➕ Criar Fundo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Catálogo de fundos com regras de elegibilidade
const FUNDOS_CATALOG = {
  // Constitucionais
  BNB_FNE: { nome: "BNB — FNE", tipo: "constitucional", regioes: ["Nordeste", "Minas"] },
  BASA_FNO: { nome: "BASA — FNO", tipo: "constitucional", regioes: ["Norte"] },
  FCO_BB: { nome: "FCO — via Banco do Brasil", tipo: "constitucional", regioes: ["Centro-Oeste"] },
  
  // Desenvolvimento
  BNDES: { nome: "BNDES (equipamentos)", tipo: "desenvolvimento", requisitos: { cnpj: true, garantia: ["Equipamento"] } },
  
  // Privados
  ASIA: { nome: "Asia", tipo: "privado", pisoFaturamento: 10, garantias: ["Imovel", "Recebiveis", "Veiculo"] },
  SB: { nome: "SB Crédito", tipo: "privado", pisoFaturamento: 10, garantias: ["Imovel", "Recebiveis"] },
  SIFRA: { nome: "Sifra", tipo: "privado", pisoFaturamento: 10, garantias: ["Imovel", "Recebiveis", "Veiculo"] },
  F3: { nome: "3F Fundo", tipo: "privado", pisoFaturamento: 10, garantias: ["Imovel", "Recebiveis", "Veiculo"] },
  MULTIPLIQUE: { nome: "Multiplique", tipo: "privado", pisoFaturamento: 10, pisoConstrutora: 18, pisoOutros: 60 },
  SAFRA: { nome: "Safra", tipo: "privado", pisoFaturamento: 10, pisoVeiculos: 40 },
  SOFISA: { nome: "Sofisa", tipo: "privado", pisoFaturamento: 10, pisoVeiculos: 40 },
  DAICOVAL: { nome: "Daicoval", tipo: "privado", pisoFaturamento: 10, pisoVeiculos: 40 },
  
  // PF Home Equity
  TCASH: { nome: "TCash", tipo: "pf", garantia: ["Imovel"], tipoImovel: ["Residencial"] },
  CASHME: { nome: "CashMe", tipo: "pf", garantia: ["Imovel"], tipoImovel: ["Residencial"] },
  GALERIA: { nome: "Galeria", tipo: "pf", garantia: ["Imovel"], tipoImovel: ["Residencial"] }
};

const CONQUISTAS = [
  "Excelente início! Perfil mapeado com sucesso.",
  "Informações valiosas coletadas! Avançando bem.",
  "Dados financeiros registrados! Calculando elegibilidade.",
  "Localização identificada! Fundos regionais em análise.",
  "Segmento definido! Especializações sendo avaliadas.",
  "Razões esclarecidas! Propósito do projeto compreendido.",
  "Garantias mapeadas! Estratégias sendo elaboradas.",
  "Análise concluída! Preparando recomendações personalizadas."
];

// Main App Component with Router
const MainApp = () => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState(null);
  const [adminAuthError, setAdminAuthError] = useState('');

  useEffect(() => {
    // Tentar obter a chave de admin do localStorage ou da URL
    let key = localStorage.getItem('investiza_admin_auth_token');
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('admin_key');

    if (urlKey) {
      key = urlKey;
      localStorage.setItem('investiza_admin_auth_token', urlKey); // Salvar para futuras visitas
      // Limpar a URL para não expor a chave
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (key) {
      // Aqui você poderia fazer uma requisição de validação para o backend, 
      // mas por simplicidade e para atender ao pedido de "link que é praticamente uma senha",
      // vamos assumir que a presença da chave já significa autenticação.
      // A verdadeira validação ocorre nas chamadas individuais aos endpoints admin.
      setAdminKey(key);
      setIsAdminAuthenticated(true);
    } else {
      setIsAdminAuthenticated(false);
      setAdminAuthError('Acesso negado. Por favor, forneça a chave de administrador na URL (ex: /admin?admin_key=SUA_CHAVE).');
    }
  }, []);

  const handleAdminLogout = () => {
    localStorage.removeItem('investiza_admin_auth_token');
    localStorage.removeItem('investiza_admin_expires');
    localStorage.removeItem('investiza_admin_config');
    setIsAdminAuthenticated(false);
    setAdminKey(null);
    setAdminAuthError(''); // Limpar erro ao fazer logout
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/admin" 
          element={
            isAdminAuthenticated ? 
            <AdminDashboard onLogout={handleAdminLogout} adminKey={adminKey} adminAuthError={adminAuthError} /> : 
            <AdminAuthErrorDisplay message={adminAuthError} />
          } 
        />
        <Route path="/" element={<FormularioInvestiza />} />
      </Routes>
    </Router>
  );
};

const AdminAuthErrorDisplay = ({ message }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <Card className="w-full max-w-md bg-gray-800 border-gray-700">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-red-400">Acesso Negado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-300 text-center">{message}</p>
        <p className="text-slate-400 text-sm text-center mt-4">
          Se você é um administrador, por favor, utilize o link de acesso com sua chave.
        </p>
        <div className="text-center mt-4">
          <a href="/" className="text-blue-400 hover:underline">Voltar ao Formulário</a>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Formulário Principal (código existente movido para componente)
const FormularioInvestiza = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [showConquista, setShowConquista] = useState(false);
  const [conquistaText, setConquistaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Dados pessoais
    nome: '',
    nome_empresa: '',
    email: '',
    whatsapp: '',
    instagram: '',
    como_chegou: '',
    indicacao_detalhes: '',
    outros_detalhes: '', // Para quando escolher "outros"
    
    // Situação empresarial
    situacao_empresa: '',
    faturamento_renda: '',
    local: '',
    municipio_estado: '',
    segmento: [],
    segmento_outros: '',
    razao: [],
    razao_outros: '',
    garantia: [],
    tipos_imovel: [], // Array para múltiplos tipos de imóveis
    
    // Nova campo para recuperação judicial
    recuperacao_judicial_homologada: ''
  });

  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Sistema de pontuação por resposta
  const calculateStepScore = (step, data) => {
    // Lista de valores permitidos para validação
    const allowedSituacaoEmpresa = ['cnpj_antigo', 'cnpj_novo', 'implantacao', 'pessoa_fisica', 'recuperacao_judicial_homologada', 'recuperacao_judicial_nao_homologada'];
    const allowedFaturamentoRenda = ['<10', '10-80', '>80', '>300', 'nao_tem', 'ate_5k', '5k_15k', '15k_50k', 'acima_50k'];
    const allowedLocal = ['Nordeste', 'Norte', 'Centro-Oeste', 'Sudeste', 'Sul'];
    
    let stepScore = 0;
    let maxStepScore = 100;

    // Sanitizar e validar as entradas
    const sanitizeValue = (value, allowedValues) => {
      if (!value) return '';
      return allowedValues.includes(value) ? value : '';
    };
    
    // Para o case 1, verificar se situacao_empresa é válido
    const situacaoEmpresa = sanitizeValue(data.situacao_empresa, allowedSituacaoEmpresa);

    switch (step) {
      case 1: // Situação empresa
        if (situacaoEmpresa === 'cnpj_antigo') stepScore = 100;
        else if (situacaoEmpresa === 'cnpj_novo') stepScore = 80;
        else if (situacaoEmpresa === 'implantacao') stepScore = 60;
        else if (situacaoEmpresa === 'pessoa_fisica') stepScore = 40;
        break;
        
      case 2: // Dados pessoais (sempre 100 se preenchidos)
        if (data.nome && data.email && data.telefone) stepScore = 100;
        break;
        
      case 3: // Como chegou (sempre 100 se preenchido)
        if (data.como_chegou) stepScore = 100;
        break;
        
      case 4: // Faturamento/Renda
        const faturamentoRenda = sanitizeValue(data.faturamento_renda, allowedFaturamentoRenda);
        if (faturamentoRenda === '>300') stepScore = 100;
        else if (faturamentoRenda === '>80') stepScore = 90;
        else if (faturamentoRenda === '10-80') stepScore = 70;
        else if (faturamentoRenda === '<10') stepScore = 50;
        else if (faturamentoRenda === 'nao_tem') stepScore = 30;
        else if (faturamentoRenda === 'acima_50k') stepScore = 100;
        else if (faturamentoRenda === '15k_50k') stepScore = 90;
        else if (faturamentoRenda === '5k_15k') stepScore = 70;
        else if (faturamentoRenda === 'ate_5k') stepScore = 50;
        break;
        
      case 5: // Localização
        const local = sanitizeValue(data.local, allowedLocal);
        if (['Nordeste', 'Norte', 'Centro-Oeste'].includes(local)) stepScore = 90; // Fundos constitucionais
        else if (['Sudeste', 'Sul'].includes(local)) stepScore = 100; // Mais opções privadas
        break;
        
      case 6: // Segmento
        if (['Agro', 'Industria_Atacado', 'Construtora'].includes(data.segmento)) stepScore = 90;
        else if (['Tecnologia', 'Servicos_Financeiros'].includes(data.segmento)) stepScore = 85;
        else stepScore = 70;
        break;
        
      case 7: // Razão (múltipla escolha)
        stepScore = Math.min(100, data.razao.length * 30);
        break;
        
      case 8: // Garantia (múltipla escolha)
        if (data.garantia.includes('Imovel')) stepScore += 40;
        if (data.garantia.includes('Recebiveis')) stepScore += 35;
        if (data.garantia.includes('Veiculo')) stepScore += 30;
        if (data.garantia.includes('Equipamento')) stepScore += 25;
        if (data.garantia.includes('CartaFianca')) stepScore += 20;
        stepScore = Math.min(100, stepScore);
        break;
        
      default:
        stepScore = 0;
    }

    return { stepScore, maxStepScore };
  };

  // Motor de decisão de elegibilidade melhorado
  const calculateEligibility = (data) => {
    const recomendados = [];
    const possiveisAtipicos = [];
    const naoElegiveis = [];
    const fundosAlcancaveis = [];
    const fundosNaoAlcancaveis = [];

    const faturamentoNum = data.faturamento_renda === '<10' ? 5 : 
                          data.faturamento_renda === '10-80' ? 45 :
                          data.faturamento_renda === '>80' ? 150 : 
                          data.faturamento_renda === '>300' ? 500 : 0;

    const temCNPJ = ['cnpj_antigo', 'cnpj_novo', 'implantacao'].includes(data.situacao_empresa);
    const isPF = data.situacao_empresa === 'pessoa_fisica';

    // Calcular porcentagem de chance (sempre otimista)
    const totalScore = score;
    const chanceEmprestimo = Math.min(98, Math.max(75, ((totalScore / 8) * 0.8) + 85));

    let analiseDescritiva = `Análise baseada no perfil: ${data.situacao_empresa}`;
    
    if (isPF) {
      analiseDescritiva += `, renda informada: ${data.faturamento_renda}`;
    } else {
      analiseDescritiva += `, faturamento: ${data.faturamento_renda}`;
    }
    
    analiseDescritiva += `. Localização: ${data.local}. Segmento: ${data.segmento}. Score final: ${totalScore}/800 pontos (${chanceEmprestimo.toFixed(1)}% de aprovabilidade).`;

    // Fundos Constitucionais
    Object.entries(FUNDOS_CATALOG).forEach(([id, fundo]) => {
      if (fundo.tipo === 'constitucional') {
        if (fundo.regioes.includes(data.local)) {
          recomendados.push(id);
          fundosAlcancaveis.push({ id, nome: fundo.nome, motivo: 'Região compatível com fundo constitucional' });
        } else {
          naoElegiveis.push({ id, motivo: `Fora da região de atuação do ${fundo.nome}.` });
          fundosNaoAlcancaveis.push({ id, nome: fundo.nome, motivo: 'Região incompatível' });
        }
      }
    });

    // BNDES
    if (temCNPJ && data.garantia.includes('Equipamento')) {
      recomendados.push('BNDES');
      fundosAlcancaveis.push({ id: 'BNDES', nome: 'BNDES (equipamentos)', motivo: 'CNPJ + garantia equipamento' });
    } else if (!temCNPJ) {
      naoElegiveis.push({ id: 'BNDES', motivo: 'Exige CNPJ.' });
      fundosNaoAlcancaveis.push({ id: 'BNDES', nome: 'BNDES (equipamentos)', motivo: 'Sem CNPJ' });
    } else if (!data.garantia.includes('Equipamento')) {
      naoElegiveis.push({ id: 'BNDES', motivo: 'Exige garantia em equipamentos.' });
      fundosNaoAlcancaveis.push({ id: 'BNDES', nome: 'BNDES (equipamentos)', motivo: 'Garantia inadequada' });
    }

    // Privados - análise detalhada
    if (isPF) {
      ['ASIA', 'SB', 'SIFRA', 'F3', 'MULTIPLIQUE', 'SAFRA', 'SOFISA', 'DAICOVAL'].forEach(id => {
        naoElegiveis.push({ id, motivo: 'Fundos privados são para empresas.' });
        fundosNaoAlcancaveis.push({ id, nome: FUNDOS_CATALOG[id]?.nome || id, motivo: 'Pessoa física' });
      });
    } else if (!temCNPJ) {
      ['ASIA', 'SB', 'SIFRA', 'F3', 'MULTIPLIQUE', 'SAFRA', 'SOFISA', 'DAICOVAL'].forEach(id => {
        naoElegiveis.push({ id, motivo: 'Fundos privados exigem CNPJ.' });
        fundosNaoAlcancaveis.push({ id, nome: FUNDOS_CATALOG[id]?.nome || id, motivo: 'Sem CNPJ' });
      });
    } else {
      // Lógica complexa para fundos privados...
      ['ASIA', 'SB', 'SIFRA', 'F3'].forEach(id => {
        const fundo = FUNDOS_CATALOG[id];
        const garantiaCompativel = data.garantia.some(g => fundo.garantias?.includes(g));
        
        if (garantiaCompativel && faturamentoNum >= 10) {
          recomendados.push(id);
          fundosAlcancaveis.push({ id, nome: fundo.nome, motivo: 'Faturamento e garantias adequadas' });
        } else if (faturamentoNum < 10) {
          naoElegiveis.push({ id, motivo: 'Faturamento abaixo do piso mínimo.' });
          fundosNaoAlcancaveis.push({ id, nome: fundo.nome, motivo: 'Faturamento insuficiente' });
        } else {
          naoElegiveis.push({ id, motivo: 'Garantia não aceita pelo fundo.' });
          fundosNaoAlcancaveis.push({ id, nome: fundo.nome, motivo: 'Garantia inadequada' });
        }
      });
    }

    // PF Home Equity
    if (isPF && data.garantia.includes('Imovel') && data.tipos_imovel.includes('Residencial')) {
      ['TCASH', 'CASHME', 'GALERIA'].forEach(id => {
        recomendados.push(id);
        fundosAlcancaveis.push({ id, nome: FUNDOS_CATALOG[id]?.nome || id, motivo: 'PF com imóvel residencial' });
      });
    } else if (isPF) {
      ['TCASH', 'CASHME', 'GALERIA'].forEach(id => {
        naoElegiveis.push({ id, motivo: 'Exige imóvel residencial como garantia.' });
        fundosNaoAlcancaveis.push({ id, nome: FUNDOS_CATALOG[id]?.nome || id, motivo: 'Sem imóvel residencial' });
      });
    }

    return { 
      recomendados: [...new Set(recomendados)], 
      possiveisAtipicos, 
      naoElegiveis,
      analiseDescritiva,
      chanceEmprestimo: chanceEmprestimo.toFixed(1),
      fundosAlcancaveis,
      fundosNaoAlcancaveis,
      pontuacaoDetalhada: {
        scoreTotal: totalScore,
        scorePorcentagem: ((totalScore / 800) * 100).toFixed(1),
        descricao: `Score calculado com base em 8 critérios: situação empresarial, dados pessoais, canal de aquisição, faturamento/renda, localização, segmento, razão do projeto e garantias oferecidas.`
      }
    };
  };

  const validateStep = (step) => {
    switch (step) {
      case 1: 
        if (formData.situacao_empresa === 'recuperacao_judicial' && !formData.recuperacao_judicial_homologada) return false;
        return formData.situacao_empresa !== '';
      case 2: 
        if (!formData.nome || !formData.email || !formData.whatsapp) return false;
        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return false;
        // Validação de WhatsApp (apenas números)
        const whatsappRegex = /^55\d{10,11}$/;
        if (!whatsappRegex.test(formData.whatsapp)) return false;
        // Se tem CNPJ, validar nome da empresa
        if (['cnpj_antigo', 'cnpj_novo', 'implantacao', 'recuperacao_judicial'].includes(formData.situacao_empresa) && !formData.nome_empresa) return false;
        return true;
      case 3: 
        if (formData.como_chegou === 'outros' && !formData.outros_detalhes) return false;
        return formData.como_chegou !== '';
      case 4: return formData.faturamento_renda !== '';
      case 5:
        if (formData.local && !formData.municipio_estado) return false;
        return formData.local !== '';
      case 6: 
        if (formData.segmento.includes('Outros') && !formData.segmento_outros) return false;
        return formData.segmento.length > 0;
      case 7: 
        if (formData.razao.includes('Outros') && !formData.razao_outros) return false;
        return formData.razao.length > 0;
      case 8: 
        if (formData.garantia.includes('Imovel') && formData.tipos_imovel.length === 0) return false;
        return formData.garantia.length > 0;
      default: return false;
    }
  };

  const showConquistaAnimation = (stepNumber) => {
    setConquistaText(CONQUISTAS[stepNumber - 1] || "Conquista desbloqueada!");
    setShowConquista(true);
    
    // Calcular score da etapa
    const { stepScore } = calculateStepScore(stepNumber, formData);
    setScore(prev => prev + stepScore);
    setMaxScore(prev => prev + 100);
    
    setTimeout(() => setShowConquista(false), 3000);
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (!completedSteps.has(currentStep)) {
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        showConquistaAnimation(currentStep);
      }
      
      // Se escolheu implantação no step 1 (situação empresa), pular faturamento (step 4)
      if (currentStep === 1 && formData.situacao_empresa === 'implantacao') {
        // Definir automaticamente como "não tem faturamento"
        setFormData(prev => ({ ...prev, faturamento_renda: 'nao_tem' }));
        // Ir para step 2 normalmente
        setCurrentStep(2);
      } else if (currentStep === 3 && formData.situacao_empresa === 'implantacao') {
        // Se estiver no step 3 (como chegou) e for implantação, pular step 4 (faturamento)
        setCurrentStep(5); // Pular para localização
      } else if (currentStep < 8) {
        setCurrentStep(currentStep + 1);
      } else {
        // Passo 8 concluído - enviar automaticamente
        await handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Calcular elegibilidade
    const eligibilityResult = calculateEligibility(formData);

    // Compilar situação da empresa com recuperação judicial
    const situacaoEmpresaCompilada = formData.situacao_empresa === 'recuperacao_judicial' 
      ? `recuperacao_judicial_${formData.recuperacao_judicial_homologada}` 
      : formData.situacao_empresa;

    // Processar garantias com tipos múltiplos de imóveis
    const processarGarantias = (garantias, tiposImovel) => {
      const garantiasProcessadas = [];
      
      garantias.forEach(garantia => {
        if (garantia === 'Imovel' && tiposImovel.length > 0) {
          // Para cada tipo de imóvel, adicionar como garantia separada
          tiposImovel.forEach(tipo => {
            garantiasProcessadas.push(`${garantia} ${tipo}`);
          });
        } else {
          garantiasProcessadas.push(garantia);
        }
      });
      
      return garantiasProcessadas;
    };

    const garantiasProcessadas = processarGarantias(formData.garantia, formData.tipos_imovel);

    // Processar campo "como_chegou" para "outros"
    const comoChegouProcessado = formData.como_chegou === 'outros' && formData.outros_detalhes
      ? `outros (${formData.outros_detalhes})`
      : formData.como_chegou;

    const payload = {
      source: "investiza-form-gamificado-v2",
      idempotency_key: generateUUID(),
      timestamp: new Date().toISOString(),
      lead: {
        ...formData,
        como_chegou: comoChegouProcessado, // Campo processado
        situacao_empresa: situacaoEmpresaCompilada, // Campo compilado
        garantia: garantiasProcessadas, // Garantias processadas com tipos de imóveis
        tipos_imovel_detalhado: formData.tipos_imovel // Manter array original para referência
      },
      eligibility: {
        recomendados: eligibilityResult.recomendados,
        possiveis_atipicos: eligibilityResult.possiveisAtipicos,
        nao_elegiveis: eligibilityResult.naoElegiveis
      },
      analise: {
        descritiva: eligibilityResult.analiseDescritiva,
        chance_emprestimo: eligibilityResult.chanceEmprestimo,
        pontuacao: eligibilityResult.pontuacaoDetalhada
      },
      fundos_alcancaveis: eligibilityResult.fundosAlcancaveis,
      fundos_nao_alcancaveis: eligibilityResult.fundosNaoAlcancaveis,
      score_gamificado: score,
      meta: {
        user_agent: navigator.userAgent,
        utm_source: new URLSearchParams(window.location.search).get('utm_source'),
        utm_medium: new URLSearchParams(window.location.search).get('utm_medium'),
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        page_url: window.location.href
      }
    };

    const sendRequest = async (attempt = 1) => {
      try {
        const response = await fetch(`/api/form/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail?.message || result.detail || `HTTP ${response.status}`);
        }
        
        setSuccess(true);
        setLoading(false);
      } catch (err) {
        console.error('Webhook error:', err);
        
        // Tratamento específico para erro 404 do n8n
        if (err.message.includes('404')) {
          setError('⚠️ WEBHOOK NÃO ESTÁ ATIVO!\n\n🔧 Solução: Ative o workflow no n8n primeiro.\n\n📋 Seus dados foram salvos e podem ser reenviados quando o webhook estiver ativo.');
        } else {
          setError(err.message || 'Não foi possível enviar agora. Tente novamente.');
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          return sendRequest(attempt + 1);
        }
        
        setLoading(false);
      }
    };

    sendRequest();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Qual a situação da sua empresa?</h3>
            <p className="text-sm text-zinc-400">Essa informação nos ajuda a identificar os fundos mais adequados ao seu perfil.</p>
            <div className="grid grid-cols-1 gap-3">
              {[
                { value: 'cnpj_antigo', label: 'Já tenho CNPJ há mais de 3 anos' },
                { value: 'cnpj_novo', label: 'Já tenho CNPJ mas há menos de 3 anos' },
                { value: 'implantacao', label: 'É uma empresa em implantação' },
                { value: 'pessoa_fisica', label: 'Pessoa física' },
                { value: 'recuperacao_judicial', label: 'CNPJ em Recuperação Judicial' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.situacao_empresa === option.value ? "default" : "outline"}
                  className={`h-12 text-left justify-start ${formData.situacao_empresa === option.value ? 'btn-investiza-primary' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                  onClick={() => setFormData(prev => ({ ...prev, situacao_empresa: option.value }))}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            
            {formData.situacao_empresa === 'recuperacao_judicial' && (
              <div className="mt-4 space-y-3">
                <h4 className="text-md font-medium text-zinc-300">A recuperação judicial foi homologada?</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'homologada', label: 'Sim, já foi homologada' },
                    { value: 'nao_homologada', label: 'Não, ainda em processo' }
                  ].map(option => (
                    <Button
                      key={option.value}
                      variant={formData.recuperacao_judicial_homologada === option.value ? "default" : "outline"}
                      className={`h-10 ${formData.recuperacao_judicial_homologada === option.value ? 'btn-investiza-primary' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                      onClick={() => setFormData(prev => ({ ...prev, recuperacao_judicial_homologada: option.value }))}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        const temCNPJ = ['cnpj_antigo', 'cnpj_novo', 'implantacao', 'recuperacao_judicial'].includes(formData.situacao_empresa);
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">Dados de Contato</h3>
            <p className="text-sm text-slate-400">Precisamos dessas informações para nossa equipe entrar em contato com as melhores propostas.</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome" className="text-slate-300">Nome completo</Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Digite seu nome completo"
                />
              </div>
              
              {temCNPJ && (
                <div>
                  <Label htmlFor="nome_empresa" className="text-slate-300">Nome da empresa</Label>
                  <Input
                    id="nome_empresa"
                    type="text"
                    value={formData.nome_empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome_empresa: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-slate-200"
                    placeholder="Digite o nome da empresa"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email" className="text-slate-300">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    // Sanitizar e-mail para prevenir XSS
                    const sanitizarEmail = (email) => {
                      if (typeof email !== 'string') return '';
                      // Remover caracteres potencialmente perigosos, mantendo apenas os válidos para e-mail
                      return email.replace(/[^\w\.\-\@]/g, '');
                    };
                    
                    const emailSanitizado = sanitizarEmail(e.target.value);
                    setFormData(prev => ({ ...prev, email: emailSanitizado }));
                  }}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="seu@email.com"
                />
                {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                  <p className="text-red-400 text-xs mt-1">Digite um e-mail válido</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="whatsapp" className="text-slate-300">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    let input = e.target.value;
                    
                    // Remove tudo que não é número
                    let numbers = input.replace(/\D/g, '');
                    
                    // Limita a 13 dígitos (55 + DDD + número)
                    numbers = numbers.substring(0, 13);
                    
                    // Se não começar com 55 e tiver menos de 11 dígitos, adiciona o 55
                    if (!numbers.startsWith('55') && numbers.length > 0 && numbers.length <= 11) {
                      numbers = '55' + numbers;
                    }
                    
                    setFormData(prev => ({ ...prev, whatsapp: numbers }));
                  }}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="5511999999999"
                />
                {formData.whatsapp && !/^55\d{10,11}$/.test(formData.whatsapp) && (
                  <p className="text-red-400 text-xs mt-1">Digite um WhatsApp válido (ex: 5511999999999)</p>
                )}
                <p className="text-slate-400 text-xs mt-1">Digite apenas números: código do país (55) + DDD + número</p>
              </div>
              
              <div>
                <Label htmlFor="instagram" className="text-slate-300">Instagram (opcional)</Label>
                <Input
                  id="instagram"
                  type="text"
                  value={formData.instagram}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="@seuusuario ou seu nome no Instagram"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">📱 Como chegou até nós?</h3>
            <p className="text-sm text-slate-400">Essa informação nos ajuda a entender qual canal foi mais eficaz e otimizar nossa estratégia de comunicação com futuros clientes.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'instagram', label: '📸 Instagram', desc: 'Redes sociais' },
                { value: 'google', label: '🔍 Google/Busca', desc: 'Mecanismos de pesquisa' },
                { value: 'linkedin', label: '💼 LinkedIn', desc: 'Rede profissional' },
                { value: 'facebook', label: '👥 Facebook', desc: 'Rede social' },
                { value: 'youtube', label: '📺 YouTube', desc: 'Conteúdo em vídeo' },
                { value: 'whatsapp', label: '💬 WhatsApp', desc: 'Mensagem direta' },
                { value: 'site', label: '🌐 Site da empresa', desc: 'Website institucional' },
                { value: 'indicacao', label: '🤝 Indicação', desc: 'Recomendação pessoal' },
                { value: 'eventos', label: '🎪 Eventos', desc: 'Feiras, congressos' },
                { value: 'outros', label: '📝 Outros', desc: 'Especificar canal' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.como_chegou === option.value ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.como_chegou === option.value ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, como_chegou: option.value }))}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
            
            {formData.como_chegou === 'indicacao' && (
              <div className="mt-4">
                <Label htmlFor="indicacao" className="text-slate-300">Quem indicou nossa empresa?</Label>
                <Input
                  id="indicacao"
                  type="text"
                  value={formData.indicacao_detalhes}
                  onChange={(e) => setFormData(prev => ({ ...prev, indicacao_detalhes: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Nome da pessoa ou empresa"
                />
              </div>
            )}

            {formData.como_chegou === 'outros' && (
              <div className="mt-4">
                <Label htmlFor="outros" className="text-slate-300">Qual canal específico?</Label>
                <Input
                  id="outros"
                  type="text"
                  value={formData.outros_detalhes}
                  onChange={(e) => setFormData(prev => ({ ...prev, outros_detalhes: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Ex: revista, rádio, outdoor, etc."
                />
              </div>
            )}
          </div>
        );

      case 4:
        const isPF = formData.situacao_empresa === 'pessoa_fisica';
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">
              {isPF ? '💰 Renda que consegue comprovar (mensal)' : '📈 Faturamento anual da empresa'}
            </h3>
            <p className="text-sm text-slate-400">
              {isPF 
                ? 'Sua capacidade de renda comprovável é fundamental para definirmos os produtos financeiros mais adequados ao seu perfil e necessidades.'
                : 'O faturamento anual é um dos critérios mais importantes para elegibilidade. Diferentes faixas de faturamento têm acesso a fundos específicos com taxas e condições diferenciadas.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(isPF ? [
                { value: 'ate_5k', label: '💵 Até R$ 5.000', desc: 'Renda inicial' },
                { value: '5k_15k', label: '💰 R$ 5.000 a R$ 15.000', desc: 'Renda intermediária' },
                { value: '15k_50k', label: '💎 R$ 15.000 a R$ 50.000', desc: 'Renda alta' },
                { value: 'acima_50k', label: '🏆 Acima de R$ 50.000', desc: 'Renda premium' },
                { value: 'nao_tem', label: '❌ Não tenho renda comprovável', desc: 'Sem comprovação' }
              ] : [
                { value: 'nao_tem', label: '🌱 Ainda não fatura', desc: 'Empresa em implantação' },
                { value: '<10', label: '🏢 Até R$ 10 milhões', desc: 'Pequenas empresas' },
                { value: '10-80', label: '🏭 R$ 10 a R$ 80 milhões', desc: 'Médias empresas' },
                { value: '>80', label: '🏗️ R$ 80 a R$ 300 milhões', desc: 'Grandes empresas' },
                { value: '>300', label: '🏛️ Acima de R$ 300 milhões', desc: 'Corporações' }
              ]).map(option => (
                <Button
                  key={option.value}
                  variant={formData.faturamento_renda === option.value ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.faturamento_renda === option.value ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, faturamento_renda: option.value }))}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">🗺️ Localização do projeto</h3>
            <p className="text-sm text-slate-400">A localização é crucial! Diferentes regiões têm acesso a fundos constitucionais específicos com taxas subsidiadas e condições especiais que podem ser muito mais vantajosas.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { value: 'Nordeste', label: '🌴 Nordeste', desc: 'Região Nordeste' },
                { value: 'Norte', label: '🌿 Norte', desc: 'Região Norte' },
                { value: 'Centro-Oeste', label: '🌾 Centro-Oeste', desc: 'Região Centro-Oeste' },
                { value: 'Sudeste', label: '🏙️ Sudeste', desc: 'Região Sudeste' },
                { value: 'Sul', label: '🍇 Sul', desc: 'Região Sul' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.local === option.value ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.local === option.value ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => setFormData(prev => ({ ...prev, local: option.value }))}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
            
            {formData.local && (
              <div className="mt-4">
                <Label htmlFor="municipio" className="text-slate-300">Município e Estado do projeto</Label>
                <Input
                  id="municipio"
                  type="text"
                  value={formData.municipio_estado}
                  onChange={(e) => setFormData(prev => ({ ...prev, municipio_estado: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Ex: São Paulo - SP"
                />
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">🏭 Segmentos de atuação (múltipla escolha)</h3>
            <p className="text-sm text-slate-400">Cada segmento possui fundos especializados e linhas de crédito específicas. Selecione todos os segmentos onde sua empresa atua para maximizar as oportunidades.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'Agro', label: '🌱 Agronegócio', desc: 'Agricultura, pecuária, safras' },
                { value: 'Industria_Atacado', label: '🏭 Indústria/Atacado', desc: 'Manufatura, distribuição' },
                { value: 'Construtora', label: '🏗️ Construção Civil', desc: 'Obras, imóveis' },
                { value: 'Tecnologia', label: '💻 Tecnologia/Software', desc: 'TI, inovação' },
                { value: 'Servicos_Financeiros', label: '💳 Serviços Financeiros', desc: 'Finanças, seguros' },
                { value: 'Saude', label: '🏥 Saúde/Medicina', desc: 'Clínicas, hospitais' },
                { value: 'Educacao', label: '🎓 Educação', desc: 'Ensino, capacitação' },
                { value: 'Servico_Publico', label: '🏛️ Serviço Público', desc: 'Governo, órgãos' },
                { value: 'Varejo', label: '🛒 Varejo/Comércio', desc: 'Vendas, lojas' },
                { value: 'Outros', label: '📋 Outros', desc: 'Especificar depois' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.segmento.includes(option.value) ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.segmento.includes(option.value) ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => {
                    // Verificar se a opção é válida (validação contra opções codificadas)
                    const allowedSegmentos = [
                      'Agro', 'Industria_Atacado', 'Construtora', 'Tecnologia',
                      'Servicos_Financeiros', 'Saude', 'Educacao', 'Servico_Publico', 'Varejo', 'Outros'
                    ];
                    
                    if (allowedSegmentos.includes(option.value)) {
                      setFormData(prev => ({
                        ...prev,
                        segmento: prev.segmento.includes(option.value)
                          ? prev.segmento.filter(s => s !== option.value)
                          : [...prev.segmento, option.value]
                      }));
                    }
                  }}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
            
            {formData.segmento.includes('Outros') && (
              <div className="mt-4">
                <Label htmlFor="segmento_outros" className="text-slate-300">Quais segmentos específicos?</Label>
                <Input
                  id="segmento_outros"
                  type="text"
                  value={formData.segmento_outros}
                  onChange={(e) => setFormData(prev => ({ ...prev, segmento_outros: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Descreva seus segmentos"
                />
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">🎯 Razão do projeto (múltipla escolha)</h3>
            <p className="text-sm text-slate-400">Diferentes propósitos têm acesso a fundos específicos e condições diferenciadas. Selecione todas as razões aplicáveis para maximizar suas opções de financiamento.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'Implantacao', label: '🌱 Implantação', desc: 'Novo negócio' },
                { value: 'Ampliacao', label: '📈 Ampliação/Expansão', desc: 'Crescimento do negócio' },
                { value: 'Giro', label: '💰 Capital de Giro', desc: 'Fluxo de caixa' },
                { value: 'Financiamento_Ativo', label: '🏭 Financiamento de Ativo', desc: 'Máquinas, equipamentos' },
                { value: 'Modernizacao_Tecnologia', label: '⚙️ Modernização/Tecnologia', desc: 'Atualização tecnológica' },
                { value: 'Aquisicao', label: '🤝 Aquisição', desc: 'Compra de empresa' },
                { value: 'Safra_Agro', label: '🌾 Safra/Agronegócio', desc: 'Custeio agrícola' },
                { value: 'Outros', label: '📝 Outros', desc: 'Especificar depois' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.razao.includes(option.value) ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.razao.includes(option.value) ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => {
                    // Verificar se a opção é válida (validação contra opções codificadas)
                    const allowedRazoes = [
                      'Implantacao', 'Ampliacao', 'Giro', 'Financiamento_Ativo',
                      'Modernizacao_Tecnologia', 'Aquisicao', 'Safra_Agro', 'Outros'
                    ];
                    
                    if (allowedRazoes.includes(option.value)) {
                      setFormData(prev => ({
                        ...prev,
                        razao: prev.razao.includes(option.value)
                          ? prev.razao.filter(r => r !== option.value)
                          : [...prev.razao, option.value]
                      }));
                    }
                  }}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
            
            {formData.razao.includes('Outros') && (
              <div className="mt-4">
                <Label htmlFor="razao_outros" className="text-slate-300">Qual razão específica?</Label>
                <Input
                  id="razao_outros"
                  type="text"
                  value={formData.razao_outros}
                  onChange={(e) => setFormData(prev => ({ ...prev, razao_outros: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-slate-200"
                  placeholder="Descreva a razão do projeto"
                />
              </div>
            )}
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200">🔒 Garantias disponíveis (múltipla escolha)</h3>
            <p className="text-sm text-slate-400">As garantias são fundamentais para conseguir aprovação e melhores taxas. Diferentes tipos de garantias abrem acesso a fundos específicos com condições mais vantajosas.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'Imovel', label: '🏠 Imóvel próprio', desc: 'Residencial, comercial' },
                { value: 'Veiculo', label: '🚗 Veículos/Frota', desc: 'Carros, caminhões' },
                { value: 'Equipamento', label: '⚙️ Equipamentos/Máquinas', desc: 'Maquinário industrial' },
                { value: 'Recebiveis', label: '📄 Recebíveis/Contratos', desc: 'Duplicatas, contratos' },
                { value: 'CartaFianca', label: '🏛️ Carta de Fiança', desc: 'Aval bancário' },
                { value: 'Estoque', label: '📦 Estoque/Mercadorias', desc: 'Produtos, matéria-prima' },
                { value: 'NaoSei', label: '❓ Não sei quais tenho', desc: 'Preciso verificar' },
                { value: 'Nenhuma', label: '❌ Não tenho garantias', desc: 'Sem garantias disponíveis' }
              ].map(option => (
                <Button
                  key={option.value}
                  variant={formData.garantia.includes(option.value) ? "default" : "outline"}
                  className={`h-16 flex-col justify-center text-left ${formData.garantia.includes(option.value) ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                  onClick={() => {
                    // Verificar se a opção é válida (validação contra opções codificadas)
                    const allowedGarantias = [
                      'Imovel', 'Veiculo', 'Equipamento', 'Recebiveis', 
                      'CartaFianca', 'Estoque', 'NaoSei', 'Nenhuma'
                    ];
                    
                    if (allowedGarantias.includes(option.value)) {
                      setFormData(prev => ({
                        ...prev,
                        garantia: prev.garantia.includes(option.value)
                          ? prev.garantia.filter(g => g !== option.value)
                          : [...prev.garantia, option.value]
                      }));
                    }
                  }}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs opacity-75">{option.desc}</div>
                </Button>
              ))}
            </div>
            
            {formData.garantia.includes('Imovel') && (
              <div className="mt-6 space-y-3">
                <h4 className="text-md font-medium text-slate-300">🏠 Tipos de Imóvel (múltipla escolha)</h4>
                <p className="text-xs text-slate-400">Se você tem múltiplos imóveis de tipos diferentes, selecione todos os tipos aplicáveis</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'Residencial', label: '🏠 Residencial', desc: 'Casa, apto' },
                    { value: 'Comercial', label: '🏢 Comercial', desc: 'Loja, escritório' },
                    { value: 'Industrial', label: '🏭 Industrial', desc: 'Galpão, fábrica' },
                    { value: 'Rural', label: '🌾 Rural', desc: 'Fazenda, sítio' },
                    { value: 'Terreno', label: '📍 Terreno', desc: 'Lote, área' }
                  ].map(tipo => (
                    <Button
                      key={tipo.value}
                      variant={formData.tipos_imovel.includes(tipo.value) ? "default" : "outline"}
                      className={`h-16 flex-col justify-center text-left ${formData.tipos_imovel.includes(tipo.value) ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-slate-300 hover:bg-gray-700'}`}
                      onClick={() => {
                        // Verificar se a opção é válida (validação contra opções codificadas)
                        const allowedTiposImovel = [
                          'Residencial', 'Comercial', 'Industrial', 'Rural', 'Terreno'
                        ];
                        
                        if (allowedTiposImovel.includes(tipo.value)) {
                          setFormData(prev => ({
                            ...prev,
                            tipos_imovel: prev.tipos_imovel.includes(tipo.value)
                              ? prev.tipos_imovel.filter(t => t !== tipo.value)
                              : [...prev.tipos_imovel, tipo.value]
                          }));
                        }
                      }}
                    >
                      <div className="font-medium">{tipo.label}</div>
                      <div className="text-xs opacity-75">{tipo.desc}</div>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };



  const renderSuccess = () => (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-green-400">Qualificação Enviada!</h3>
      <div className="space-y-2">
        <p className="text-slate-300">
          Perfeito, <strong>{formData.nome}</strong>! Suas informações foram enviadas com sucesso.
        </p>
        <p className="text-slate-400 text-sm">
          Nossa equipe especializada vai analisar seu perfil e entrar em contato através do 
          <strong> {formData.whatsapp}</strong> ou <strong>{formData.email}</strong> em até 24 horas 
          com as melhores propostas de financiamento para seu projeto.
        </p>
        <div className="bg-gray-800 p-3 rounded-lg mt-4">
          <p className="text-slate-300 text-sm">
            <strong>Próximos passos:</strong><br/>
            • Análise detalhada do seu perfil<br/>
            • Seleção das melhores opções<br/>
            • Contato personalizado com propostas<br/>
            • Acompanhamento durante todo o processo
          </p>
        </div>
      </div>
      <Badge className="bg-green-600">Formulário concluído com sucesso!</Badge>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-8">
            {renderSuccess()}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">


        {/* Progress Stepper */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(step => (
              <div 
                key={step}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs ${
                  step <= currentStep 
                    ? 'stepper-active' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                } ${completedSteps.has(step) ? 'stepper-completed' : ''}`}
              >
                {completedSteps.has(step) ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
            ))}
          </div>
          <Progress 
            value={success ? 100 : (currentStep / 8) * 100} 
            className="h-2"
          />
          <div className="flex justify-end mt-4">
            <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-semibold">
              Score: {score}/{maxScore}
            </Badge>
          </div>
        </div>

        {/* Main Card */}
        <Card className="card-investiza border-zinc-800">
          <CardContent className="p-8">
            {loading ? (
              <div className="text-center space-y-4">
                <div className="loading-spinner w-8 h-8 border-2 border-yellow-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-white">Enviando suas informações...</p>
              </div>
            ) : (
              renderStep()
            )}
            
            {!loading && (
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                  className="btn-investiza-primary"
                >
                  {currentStep === 8 ? 'Enviar' : 'Próximo'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
            
            {error && (
              <div className="text-center mt-4">
                <p className="text-red-400 mb-2">{error}</p>
                <Button onClick={handleNext} variant="outline" className="border-red-600 text-red-400">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conquista Animation */}
        {showConquista && (
          <div className="conquista-animation bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center max-w-md">
            <Award className="w-6 h-6 mr-3 flex-shrink-0" />
            <div>
              <div className="font-bold">Conquista desbloqueada!</div>
              <div className="text-sm">{conquistaText}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; // Fim do FormularioInvestiza

export default MainApp;