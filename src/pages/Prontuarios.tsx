import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Edit,
  Info,
  Stethoscope,
  Activity,
  FileText,
  X,
  Plus,
  Calendar,
  Phone,
  Hospital,
  Heart,
} from "lucide-react";

interface Paciente {
  id: string;
  profiles?: {
    nome_completo: string;
    telefone: string | null;
    data_nascimento: string | null;
  };
  convenio: string | null;
  medicacao?: string | null;
  email?: string;
}

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  psicologo_nome: string;
  paciente_id: string;
}

interface Prontuario {
  id: string;
  data_sessao: string;
  tipo: string;
  anotacoes: string | null;
  evolucao: string | null;
  psicologo_nome: string;
  created_by_nome: string;
  created_at: string;
}

export default function Prontuarios() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string>("");
  const [agendamentosFuturos, setAgendamentosFuturos] = useState<Agendamento[]>([]);
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const pacienteAtual = pacientes.find(p => p.id === pacienteSelecionado);

  useEffect(() => {
    if (session) {
      fetchPacientes();
    }
  }, [session]);

  useEffect(() => {
    if (pacienteSelecionado) {
      fetchAgendamentosFuturos();
      fetchProntuarios();
    } else {
      setAgendamentosFuturos([]);
      setProntuarios([]);
    }
  }, [pacienteSelecionado]);

  const fetchPacientes = async () => {
    try {
      const data = await api.getPacientes();
      setPacientes(data);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    }
  };

  const fetchAgendamentosFuturos = async () => {
    try {
      const allAgendamentos = await api.getAgendamentos();
      const agora = new Date();
      const futuros = allAgendamentos
        .filter((a: any) => {
          if (a.paciente_id !== pacienteSelecionado) return false;
          const dataHora = new Date(a.data_hora);
          return dataHora >= agora && a.status !== 'cancelado' && a.status !== 'faltou';
        })
        .sort((a: any, b: any) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
        .slice(0, 5);
      setAgendamentosFuturos(futuros);
    } catch (error) {
      console.error("Erro ao buscar agendamentos futuros:", error);
    }
  };

  const fetchProntuarios = async () => {
    setLoading(true);
    try {
      const data = await api.getProntuariosPaciente(pacienteSelecionado);
      setProntuarios(data);
    } catch (error: any) {
      console.error("Erro ao buscar prontuários:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os prontuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularIdade = (dataNascimento: string | null): number | null => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  };

  const getIniciais = (nome: string): string => {
    return nome
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Estatísticas baseadas nos prontuários
  const sessoesCount = prontuarios.filter(p => p.tipo === 'sessao' || !p.tipo).length;
  const avaliacoesCount = prontuarios.filter(p => p.tipo === 'avaliacao').length;
  const testesCount = 0; // Não implementado ainda
  const diagnosticosCount = 0; // Não implementado ainda
  const planosCount = 0; // Não implementado ainda
  const cancelamentosCount = agendamentosFuturos.filter(a => a.status === 'cancelado').length;

  // Observações públicas e privadas (baseadas em prontuários)
  const observacoesPublicas = prontuarios
    .filter(p => p.anotacoes)
    .map(p => ({
      texto: p.anotacoes,
      autor: p.psicologo_nome,
      data: p.created_at,
    }))
    .slice(-3)
    .reverse();

  const observacoesPrivadas = prontuarios
    .filter(p => p.evolucao)
    .map(p => ({
      texto: p.evolucao,
      autor: p.psicologo_nome,
      data: p.created_at,
    }))
    .slice(-3)
    .reverse();

  if (!pacienteSelecionado) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#007BFF]">Prontuários Eletrônicos</h1>
          </div>
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <label className="text-sm font-medium">Selecione um paciente</label>
                <Select value={pacienteSelecionado} onValueChange={setPacienteSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente para ver o prontuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {pacientes.map((paciente) => (
                      <SelectItem key={paciente.id} value={paciente.id}>
                        {paciente.profiles?.nome_completo || "Sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 bg-gray-50">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {pacienteAtual?.profiles?.nome_completo || "Paciente"}
                </h1>
                <div className="text-sm text-gray-500">
                  GestãoDS - Clínica Teste
                </div>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-64">
                  <Select value={pacienteSelecionado} onValueChange={setPacienteSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Trocar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes.map((paciente) => (
                        <SelectItem key={paciente.id} value={paciente.id}>
                          {paciente.profiles?.nome_completo || "Sem nome"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">ANSIEDADE</Badge>
                <Badge className="bg-blue-200 text-blue-800 border-blue-300">TCC</Badge>
                {pacienteAtual?.medicacao && (
                  <Badge className="bg-pink-100 text-pink-700 border-pink-200">
                    MEDICAÇÃO: {pacienteAtual.medicacao.toUpperCase()}
                  </Badge>
                )}
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  ACOMPANHAMENTO: PSIQUIATRA
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-[#007BFF] text-[#007BFF]">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="border-[#28A745] text-[#28A745] bg-[#E8F5E9]">
              <Info className="h-4 w-4 mr-2" />
              Informações
            </Button>
            <Button variant="outline" size="sm" className="border-gray-300 text-gray-600">
              <Hospital className="h-4 w-4 mr-2" />
              Paciente Multiclínica
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="informacoes" className="space-y-4">
          <TabsList className="bg-white border-b border-gray-200 rounded-none h-auto p-0">
            <TabsTrigger
              value="informacoes"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Informações Pessoais
            </TabsTrigger>
            <TabsTrigger
              value="evolucao"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Evolução
            </TabsTrigger>
            <TabsTrigger
              value="anamnese"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Anamnese
            </TabsTrigger>
            <TabsTrigger
              value="financeiro"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="orcamentos"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Orçamentos
            </TabsTrigger>
            <TabsTrigger
              value="marketing"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Marketing
            </TabsTrigger>
            <TabsTrigger
              value="arquivos"
              className="data-[state=active]:border-b-2 data-[state=active]:border-[#007BFF] data-[state=active]:bg-transparent rounded-none"
            >
              Arquivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="informacoes" className="space-y-6">
            {/* Dois painéis lado a lado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Painel Esquerdo - Informações Pessoais */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Informações Pessoais</h2>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 bg-teal-500">
                      <AvatarFallback className="text-white text-xl">
                        {getIniciais(pacienteAtual?.profiles?.nome_completo || "PA")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-medium text-lg">
                          {pacienteAtual?.profiles?.nome_completo || "Paciente"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{pacienteAtual?.profiles?.telefone || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {calcularIdade(pacienteAtual?.profiles?.data_nascimento || null) 
                            ? `${calcularIdade(pacienteAtual?.profiles?.data_nascimento || null)} anos`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Hospital className="h-4 w-4" />
                        <span>{pacienteAtual?.convenio || "Particular"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Painel Direito - Agendamentos e Observações */}
              <Card className="bg-white">
                <CardContent className="pt-6 space-y-6">
                  {/* Futuros Agendamentos */}
                  <div>
                    <h3 className="font-semibold mb-3">Futuros agendamentos:</h3>
                    <div className="space-y-2">
                      {agendamentosFuturos.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum agendamento futuro</p>
                      ) : (
                        agendamentosFuturos.map((agendamento) => {
                          // Verificar se há prontuário relacionado com tipo 'avaliacao'
                          // Por enquanto, vamos assumir que todos são sessões, mas pode ser melhorado
                          // quando houver melhor integração entre agendamentos e prontuários
                          const tipo: string = 'sessao'; // Padrão para sessão individual
                          
                          return (
                            <div
                              key={agendamento.id}
                              className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm"
                            >
                              {tipo === 'avaliacao' ? (
                                <Activity className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                              ) : (
                                <Stethoscope className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <span className="font-medium">
                                  {tipo === 'avaliacao' ? 'Avaliação Psicológica' : 'Sessão Individual'}
                                </span>
                                {" com "}
                                <span>{agendamento.psicologo_nome}</span>
                                {" dia "}
                                {format(new Date(agendamento.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                                {" às "}
                                {format(new Date(agendamento.data_hora), "HH:mm", { locale: ptBR })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <h3 className="font-semibold mb-3">Observações:</h3>
                    <div className="space-y-3">
                      {observacoesPublicas.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma observação</p>
                      ) : (
                        observacoesPublicas.map((obs, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="mb-1">{obs.texto}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>por {obs.autor}</span>
                              <span>às {format(new Date(obs.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              <Edit className="h-3 w-3 cursor-pointer hover:text-blue-600" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Observações Privadas */}
                  <div>
                    <h3 className="font-semibold mb-3">Observações privadas:</h3>
                    <div className="space-y-3">
                      {observacoesPrivadas.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhuma observação privada</p>
                      ) : (
                        observacoesPrivadas.map((obs, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="mb-1">{obs.texto}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>por {obs.autor}</span>
                              <span>às {format(new Date(obs.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                              <Edit className="h-3 w-3 cursor-pointer hover:text-blue-600" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cards Estatísticos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sessões */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-[#007BFF]">{sessoesCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Stethoscope className="h-5 w-5 text-[#007BFF]" />
                        <span className="text-sm font-medium">Sessões</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-gray-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Sessão
                  </Button>
                </CardContent>
              </Card>

              {/* Avaliações Psicológicas */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-[#007BFF]">{avaliacoesCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Activity className="h-5 w-5 text-[#007BFF]" />
                        <span className="text-sm font-medium">Avaliações Psicológicas</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-gray-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Avaliação
                  </Button>
                </CardContent>
              </Card>

              {/* Testes Aplicados */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-[#007BFF]">{testesCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-5 w-5 text-[#007BFF]" />
                        <span className="text-sm font-medium">Testes Aplicados</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-gray-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Teste
                  </Button>
                </CardContent>
              </Card>

              {/* Diagnósticos */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-[#007BFF]">{diagnosticosCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Heart className="h-5 w-5 text-[#007BFF]" />
                        <span className="text-sm font-medium">Diagnósticos</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-gray-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Diagnóstico
                  </Button>
                </CardContent>
              </Card>

              {/* Planos Terapêuticos */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-[#007BFF]">{planosCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-5 w-5 text-[#007BFF]" />
                        <span className="text-sm font-medium">Planos Terapêuticos</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full bg-[#007BFF] hover:bg-[#0056B3] text-white" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Plano
                  </Button>
                </CardContent>
              </Card>

              {/* Cancelamentos / Faltas */}
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-red-600">{cancelamentosCount}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <X className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium">Cancelamentos / Faltas</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-gray-200">
                    Ver mais
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Outras tabs podem ser implementadas depois */}
          <TabsContent value="evolucao">
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-500">Conteúdo da aba Evolução</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
