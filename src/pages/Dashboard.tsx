import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, UserCog, Clock, Plus, FileText, UserPlus, CheckCircle, Play, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  duracao_minutos: number;
  paciente_nome?: string;
  psicologo_nome?: string;
}

const statusColors: Record<string, string> = {
  agendado: "bg-[#E3F2FD] text-[#1976D2] border-[#90CAF9]",
  confirmado: "bg-[#E8F5E9] text-[#2E7D32] border-[#81C784]",
  em_atendimento: "bg-[#FFF3E0] text-[#F57C00] border-[#FFB74D]",
  concluido: "bg-[#F5F5F5] text-[#616161] border-[#BDBDBD]",
  cancelado: "bg-[#FFEBEE] text-[#C62828] border-[#EF5350]",
  pendente: "bg-[#FFF9C4] text-[#F57F17] border-[#FFC107]",
};

const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  pendente: "Pendente",
};

export default function Dashboard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalPsicologos: 0,
    totalPacientes: 0,
    totalAgendamentos: 0,
    agendamentosHoje: 0,
    psicologosEsteMes: 0,
    pacientesEstaSemana: 0,
  });
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, agendamentos, hoje] = await Promise.all([
        api.getDashboardStats(),
        api.getProximosAgendamentos(),
        api.getAgendamentosHoje(),
      ]);
      setStats(statsData);
      setProximosAgendamentos(agendamentos);
      setAgendamentosHoje(hoje);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, session]);

  const handleAtualizarStatus = async (agendamentoId: string, novoStatus: string) => {
    try {
      console.log('Atualizando status:', { agendamentoId, novoStatus, userId: session?.user.id, role: session?.user.role });
      await api.updateAgendamentoStatus(agendamentoId, novoStatus);
      toast({
        title: "Status atualizado!",
        description: `Agendamento atualizado para: ${statusLabels[novoStatus] || novoStatus}`,
      });
      fetchData(); // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const cards = [
    {
      title: "Psicólogos",
      value: stats.totalPsicologos,
      change: stats.psicologosEsteMes > 0 ? `↑ +${stats.psicologosEsteMes} este mês` : "",
      icon: UserCog,
      iconBg: "bg-[#E3F2FD]",
      iconColor: "text-[#007BFF]",
    },
    {
      title: "Pacientes",
      value: stats.totalPacientes,
      change: stats.pacientesEstaSemana > 0 ? `↑ +${stats.pacientesEstaSemana} esta semana` : "",
      icon: Users,
      iconBg: "bg-[#E8F5E9]",
      iconColor: "text-[#28A745]",
    },
    {
      title: "Agendamentos Totais",
      value: stats.totalAgendamentos,
      icon: Calendar,
      iconBg: "bg-[#E3F2FD]",
      iconColor: "text-[#007BFF]",
    },
    {
      title: "Agendamentos Hoje",
      value: stats.agendamentosHoje,
      icon: Clock,
      iconBg: "bg-[#E3F2FD]",
      iconColor: "text-[#007BFF]",
    },
  ];

  const formatarHora = (dataHora: string, duracao: number) => {
    const inicio = new Date(dataHora);
    const fim = new Date(inicio.getTime() + duracao * 60000);
    return `${format(inicio, "HH:mm", { locale: ptBR })} - ${format(fim, "HH:mm", { locale: ptBR })}`;
  };

  const formatarData = (dataHora: string) => {
    return format(new Date(dataHora), "dd MMM", { locale: ptBR });
  };

  const hoje = format(new Date(), "dd MMM", { locale: ptBR });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema de agendamentos de pacientes
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title} className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`${card.iconBg} p-2 rounded-full`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                {card.change && (
                  <p className="text-xs text-[#28A745] mt-1 flex items-center gap-1">
                    {card.change}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Agendamentos de Hoje */}
        {(session?.user.role === 'psicologo' || session?.user.role === 'admin' || session?.user.role === 'atendente') && (
          <Card>
            <CardHeader>
              <CardTitle>
                {session?.user.role === 'psicologo' ? 'Meus Atendimentos de Hoje' : 'Atendimentos de Hoje'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {session?.user.role === 'psicologo' 
                  ? 'Gerencie o status dos seus agendamentos de hoje'
                  : 'Visualize todos os atendimentos agendados para hoje'}
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : agendamentosHoje.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum agendamento para hoje
                </div>
              ) : (
                <div className="space-y-3">
                {agendamentosHoje.map((agendamento) => (
                  <div
                    key={agendamento.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{agendamento.paciente_nome || "N/A"}</p>
                      </div>
                      {session?.user.role !== 'psicologo' && (
                        <p className="text-sm text-muted-foreground mb-1">
                          {agendamento.psicologo_nome || "Psicólogo não definido"}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatarHora(agendamento.data_hora, agendamento.duracao_minutos)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={statusColors[agendamento.status] || "bg-gray-500/20 text-gray-500"}
                      >
                        {statusLabels[agendamento.status] || agendamento.status}
                      </Badge>
                      {/* Botões de ação apenas para psicólogos */}
                      {session?.user.role === 'psicologo' && agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
                        <div className="flex gap-1">
                          {agendamento.status === 'agendado' || agendamento.status === 'confirmado' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAtualizarStatus(agendamento.id, 'em_atendimento')}
                              className="h-8"
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Iniciar
                            </Button>
                          ) : null}
                          {agendamento.status === 'em_atendimento' ? (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleAtualizarStatus(agendamento.id, 'concluido')}
                              className="h-8 bg-[#28A745] hover:bg-[#218838] text-white"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Finalizar
                            </Button>
                          ) : null}
                          {agendamento.status !== 'cancelado' && agendamento.status !== 'concluido' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAtualizarStatus(agendamento.id, 'cancelado')}
                              className="h-8 text-red-600 hover:text-red-700"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Próximos Agendamentos e Ações Rápidas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Próximos Agendamentos */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Próximos Agendamentos</CardTitle>
              <span className="text-sm text-muted-foreground">Hoje, {hoje}</span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : proximosAgendamentos.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum agendamento futuro
                </div>
              ) : (
                <div className="space-y-3">
                  {proximosAgendamentos.map((agendamento) => (
                    <div
                      key={agendamento.id}
                      className="flex items-center gap-4 p-3 rounded-lg border-l-4 border-[#007BFF] bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{agendamento.paciente_nome || "N/A"}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {agendamento.psicologo_nome || "Psicólogo não definido"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatarHora(agendamento.data_hora, agendamento.duracao_minutos)}
                        </div>
                      </div>
                      <Badge
                        className={statusColors[agendamento.status] || "bg-gray-500/20 text-gray-500"}
                      >
                        {statusLabels[agendamento.status] || agendamento.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-[#007BFF] hover:bg-[#0056B3] text-white"
                onClick={() => navigate("/agendamentos")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Agendamento
              </Button>
              {session?.user.role !== 'psicologo' && (
                <>
                  <Button
                    className="w-full justify-start bg-[#28A745] hover:bg-[#218838] text-white"
                    onClick={() => navigate("/pacientes")}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Paciente
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/agendamentos")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Ver Calendário
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Implementar relatórios no futuro
                      alert("Funcionalidade de relatórios em desenvolvimento");
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Relatórios
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de pacientes do psicólogo (se for psicólogo) */}
        {session?.user.role === 'psicologo' && (
          <Card>
            <CardHeader>
              <CardTitle>Meus Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4 text-muted-foreground">
                Use a página de Pacientes para ver seus pacientes vinculados
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
