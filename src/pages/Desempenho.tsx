import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Users, Calendar, FileText, DollarSign } from "lucide-react";

interface DesempenhoProfissional {
  id: string;
  psicologo_nome: string;
  crp: string;
  total_pacientes: number;
  total_agendamentos: number;
  agendamentos_concluidos: number;
  agendamentos_cancelados: number;
  total_prontuarios: number;
  receita_total: number;
  duracao_media: number | null;
  taxa_conclusao: string;
  taxa_cancelamento: string;
}

export default function Desempenho() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [desempenho, setDesempenho] = useState<DesempenhoProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Redirecionar psicólogos
  useEffect(() => {
    if (session?.user.role === 'psicologo') {
      navigate('/dashboard');
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive",
      });
    }
  }, [session, navigate, toast]);

  useEffect(() => {
    fetchDesempenho();
  }, []);

  const fetchDesempenho = async () => {
    setLoading(true);
    try {
      const data = await api.getDesempenhoProfissionais();
      setDesempenho(data);
    } catch (error: any) {
      console.error("Erro ao buscar desempenho:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar os dados de desempenho.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarDuracao = (minutos: number | null) => {
    if (!minutos) return "N/A";
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins}min`;
  };

  // Não renderizar se for psicólogo
  if (session?.user.role === 'psicologo') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#007BFF]">Desempenho dos Profissionais</h1>
        </div>

        {loading ? (
          <div className="text-center py-8">Carregando...</div>
        ) : desempenho.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum dado de desempenho disponível.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Cards de Resumo Geral */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Profissionais</CardTitle>
                  <Users className="h-4 w-4 text-[#007BFF]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{desempenho.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Psicólogos ativos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
                  <Users className="h-4 w-4 text-[#28A745]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {desempenho.reduce((acc, d) => acc + d.total_pacientes, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pacientes atendidos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Agendamentos</CardTitle>
                  <Calendar className="h-4 w-4 text-[#007BFF]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {desempenho.reduce((acc, d) => acc + d.total_agendamentos, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Agendamentos realizados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#28A745]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#28A745]">
                    {formatarMoeda(desempenho.reduce((acc, d) => acc + d.receita_total, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Receita acumulada</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Desempenho */}
            <Card>
              <CardHeader>
                <CardTitle>Desempenho Individual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead className="text-center">Pacientes</TableHead>
                        <TableHead className="text-center">Agendamentos</TableHead>
                        <TableHead className="text-center">Concluídos</TableHead>
                        <TableHead className="text-center">Cancelados</TableHead>
                        <TableHead className="text-center">Taxa Conclusão</TableHead>
                        <TableHead className="text-center">Taxa Cancelamento</TableHead>
                        <TableHead className="text-center">Prontuários</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-center">Duração Média</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {desempenho.map((prof) => (
                        <TableRow key={prof.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{prof.psicologo_nome}</div>
                              <div className="text-sm text-muted-foreground">
                                CRP: {prof.crp}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center">
                              <Users className="h-4 w-4 mr-1 text-[#007BFF]" />
                              {prof.total_pacientes}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center">
                              <Calendar className="h-4 w-4 mr-1 text-[#007BFF]" />
                              {prof.total_agendamentos}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 rounded text-xs bg-[#E8F5E9] text-[#28A745]">
                              {prof.agendamentos_concluidos}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 rounded text-xs bg-[#FFEBEE] text-[#DC3545]">
                              {prof.agendamentos_cancelados}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center">
                              <TrendingUp className="h-4 w-4 mr-1 text-[#28A745]" />
                              {prof.taxa_conclusao}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="px-2 py-1 rounded text-xs bg-[#FFF3E0] text-[#F57C00]">
                              {prof.taxa_cancelamento}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="flex items-center justify-center">
                              <FileText className="h-4 w-4 mr-1 text-[#007BFF]" />
                              {prof.total_prontuarios}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-[#28A745]">
                            {formatarMoeda(prof.receita_total)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {formatarDuracao(prof.duracao_media)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

