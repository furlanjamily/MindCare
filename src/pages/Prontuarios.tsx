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
  const [agendamentosFuturos, setAgendamentosFuturos] = useState<Agendamento[]>(
    []
  );
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  const pacienteAtual = pacientes.find((p) => p.id === pacienteSelecionado);

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
          return (
            dataHora >= agora &&
            a.status !== "cancelado" &&
            a.status !== "faltou"
          );
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
        )
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
        description:
          error.message || "Não foi possível carregar os prontuários.",
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
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Estatísticas baseadas nos prontuários
  const sessoesCount = prontuarios.filter(
    (p) => p.tipo === "sessao" || !p.tipo
  ).length;
  const avaliacoesCount = prontuarios.filter(
    (p) => p.tipo === "avaliacao"
  ).length;
  const testesCount = 0; // Não implementado ainda
  const diagnosticosCount = 0; // Não implementado ainda
  const planosCount = 0; // Não implementado ainda
  const cancelamentosCount = agendamentosFuturos.filter(
    (a) => a.status === "cancelado"
  ).length;

  // Observações públicas e privadas (baseadas em prontuários)
  const observacoesPublicas = prontuarios
    .filter((p) => p.anotacoes)
    .map((p) => ({
      texto: p.anotacoes,
      autor: p.psicologo_nome,
      data: p.created_at,
    }))
    .slice(-3)
    .reverse();

  const observacoesPrivadas = prontuarios
    .filter((p) => p.evolucao)
    .map((p) => ({
      texto: p.evolucao,
      autor: p.psicologo_nome,
      data: p.created_at,
    }))
    .slice(-3)
    .reverse();

  if (!pacienteSelecionado) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6 bg-[#f5f0ff]">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#7e61e7]">
              Prontuários Eletrônicos
            </h1>
          </div>

          <Card className="bg-white border border-[#a993fe] shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <label className="text-sm font-medium text-[#7e61e7]">
                  Selecione um paciente
                </label>

                <Select
                  value={pacienteSelecionado}
                  onValueChange={setPacienteSelecionado}
                >
                  <SelectTrigger className="border-[#a993fe] focus:ring-[#7e61e7] focus:border-[#7e61e7]">
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
      <div className="space-y-6 p-6 bg-[#f5f0ff]">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-[#e6dfff]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-3xl font-bold text-[#6b4cd7]">
                  {pacienteAtual?.profiles?.nome_completo || "Paciente"}
                </h1>
                <div className="text-sm text-[#8f7ce0]">
                  GestãoDS - Clínica Teste
                </div>
              </div>

              {/* Select paciente */}
              <div className="flex items-center gap-4 mb-3">
                <div className="w-64">
                  <Select
                    value={pacienteSelecionado}
                    onValueChange={setPacienteSelecionado}
                  >
                    <SelectTrigger className="border-[#a993fe] focus:ring-[#7e61e7] focus:border-[#7e61e7]">
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

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#ede7ff] text-[#6b4cd7] border-[#dbceff]">
                  ANSIEDADE
                </Badge>
                <Badge className="bg-[#e3d7ff] text-[#5437c2] border-[#d6c4ff]">
                  TCC
                </Badge>
                {pacienteAtual?.medicacao && (
                  <Badge className="bg-[#ffe8fa] text-[#d633b0] border-[#ffbde9]">
                    MEDICAÇÃO: {pacienteAtual.medicacao.toUpperCase()}
                  </Badge>
                )}
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  ACOMPANHAMENTO: PSIQUIATRA
                </Badge>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-[#7e61e7] text-[#7e61e7]"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-[#a993fe] text-[#7e61e7] bg-[#f5f0ff]"
            >
              <Info className="h-4 w-4 mr-2" />
              Informações
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-600"
            >
              <Hospital className="h-4 w-4 mr-2" />
              Paciente Multiclínica
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="informacoes" className="space-y-4">
          <TabsList className="bg-white border-b border-[#e6dfff] rounded-none h-auto p-0">
            {[
              "informacoes",
              "evolucao",
              "anamnese",
              "financeiro",
              "orcamentos",
              "marketing",
              "arquivos",
            ].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="
                data-[state=active]:border-b-2 
                data-[state=active]:border-[#7e61e7]
                data-[state=active]:text-[#7e61e7]
                text-gray-700 rounded-none
              "
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Conteúdo Informações Pessoais */}
          <TabsContent value="informacoes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Painel esquerdo */}
              <Card className="bg-white border border-[#e6dfff]">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4 text-[#6b4cd7]">
                    Informações Pessoais
                  </h2>

                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 bg-[#7e61e7]">
                      <AvatarFallback className="text-white text-xl">
                        {getIniciais(
                          pacienteAtual?.profiles?.nome_completo || "PA"
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-3">
                      <p className="font-medium text-lg text-[#3b2c8f]">
                        {pacienteAtual?.profiles?.nome_completo || "Paciente"}
                      </p>

                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>
                          {pacienteAtual?.profiles?.telefone || "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {calcularIdade(
                            pacienteAtual?.profiles?.data_nascimento || null
                          )
                            ? `${calcularIdade(
                                pacienteAtual?.profiles?.data_nascimento || null
                              )} anos`
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

              {/* Painel direito */}
              <Card className="bg-white border border-[#e6dfff]">
                <CardContent className="pt-6 space-y-6">
                  {/* Futuros agendamentos */}
                  <div>
                    <h3 className="font-semibold mb-3 text-[#6b4cd7]">
                      Futuros agendamentos:
                    </h3>

                    <div className="space-y-2">
                      {agendamentosFuturos.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum agendamento futuro
                        </p>
                      ) : (
                        agendamentosFuturos.map((agendamento) => {
                          // Verificar se há prontuário relacionado com tipo 'avaliacao'
                          // Por enquanto, vamos assumir que todos são sessões, mas pode ser melhorado
                          // quando houver melhor integração entre agendamentos e prontuários
                          const tipo: string = 'sessao'; // Padrão para sessão individual

                          return (
                            <div
                              key={agendamento.id}
                              className="flex items-start gap-2 p-2 bg-[#f1eaff] rounded text-sm"
                            >
                              {tipo === "avaliacao" ? (
                                <Activity className="h-4 w-4 text-[#7e61e7] mt-0.5" />
                              ) : (
                                <Stethoscope className="h-4 w-4 text-[#7e61e7] mt-0.5" />
                              )}

                              <div className="flex-1 text-[#3b2c8f]">
                                <span className="font-medium">
                                  {tipo === "avaliacao"
                                    ? "Avaliação Psicológica"
                                    : "Sessão Individual"}
                                </span>{" "}
                                com {agendamento.psicologo_nome} dia{" "}
                                {format(
                                  new Date(agendamento.data_hora),
                                  "dd/MM/yyyy",
                                  { locale: ptBR }
                                )}{" "}
                                às{" "}
                                {format(
                                  new Date(agendamento.data_hora),
                                  "HH:mm",
                                  { locale: ptBR }
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <h3 className="font-semibold mb-3 text-[#6b4cd7]">
                      Observações:
                    </h3>
                    <div className="space-y-3">
                      {observacoesPublicas.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhuma observação
                        </p>
                      ) : (
                        observacoesPublicas.map((obs, idx) => (
                          <div key={idx} className="text-sm text-[#3b2c8f]">
                            <p className="mb-1">{obs.texto}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>por {obs.autor}</span>
                              <span>
                                às{" "}
                                {format(
                                  new Date(obs.data),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                              <Edit className="h-3 w-3 cursor-pointer hover:text-[#7e61e7]" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Observações privadas */}
                  <div>
                    <h3 className="font-semibold mb-3 text-[#6b4cd7]">
                      Observações privadas:
                    </h3>
                    <div className="space-y-3">
                      {observacoesPrivadas.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhuma observação privada
                        </p>
                      ) : (
                        observacoesPrivadas.map((obs, idx) => (
                          <div key={idx} className="text-sm text-[#3b2c8f]">
                            <p className="mb-1">{obs.texto}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>por {obs.autor}</span>
                              <span>
                                às{" "}
                                {format(
                                  new Date(obs.data),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                              <Edit className="h-3 w-3 cursor-pointer hover:text-[#7e61e7]" />
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
              {[
                { label: "Sessões", count: sessoesCount, icon: Stethoscope },
                {
                  label: "Avaliações Psicológicas",
                  count: avaliacoesCount,
                  icon: Activity,
                },
                {
                  label: "Testes Aplicados",
                  count: testesCount,
                  icon: FileText,
                },
                {
                  label: "Diagnósticos",
                  count: diagnosticosCount,
                  icon: Heart,
                },
                {
                  label: "Planos Terapêuticos",
                  count: planosCount,
                  icon: FileText,
                },
              ].map((card, idx) => (
                <Card key={idx} className="bg-white border border-[#e6dfff]">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-4xl font-bold text-[#7e61e7]">
                          {card.count}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <card.icon className="h-5 w-5 text-[#7e61e7]" />
                          <span className="text-sm font-medium">
                            {card.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-[#d2c7ff] text-[#6b4cd7]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Novo
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Cancelamentos */}
              <Card className="bg-white border border-[#e6dfff]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-bold text-red-600">
                        {cancelamentosCount}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <X className="h-5 w-5 text-red-600" />
                        <span className="text-sm font-medium">
                          Cancelamentos / Faltas
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-[#d2c7ff] text-[#6b4cd7]"
                  >
                    Ver mais
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conteúdo das outras tabs */}
          <TabsContent value="evolucao">
            <Card className="border border-[#e6dfff]">
              <CardContent className="pt-6">
                <p className="text-[#8f7ce0]">Conteúdo da aba Evolução</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
