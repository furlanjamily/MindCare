import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { DollarSign, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RelatorioFinanceiro {
  receitas: {
    total: number;
    quantidade: number;
  };
  despesas: {
    total: number;
    quantidade: number;
  };
  saldo: number;
  porPsicologo: Array<{
    psicologo_nome: string;
    receita_total: number;
    despesa_total: number;
    qtd_receitas: number;
    qtd_despesas: number;
  }>;
}

interface Transacao {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  data_transacao: string;
  status: string;
  psicologo_nome: string;
  agendamento_data?: string;
}

export default function Financeiro() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [relatorio, setRelatorio] = useState<RelatorioFinanceiro | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [psicologoFiltro, setPsicologoFiltro] = useState<string>("all");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [psicologos, setPsicologos] = useState<any[]>([]);
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
    fetchPsicologos();
  }, []);

  useEffect(() => {
    fetchRelatorio();
    fetchTransacoes();
  }, [dataInicio, dataFim, psicologoFiltro, tipoFiltro]);

  const fetchPsicologos = async () => {
    try {
      const data = await api.getPsicologos();
      setPsicologos(data);
    } catch (error) {
      console.error("Erro ao buscar psicólogos:", error);
    }
  };

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const params: any = {
        data_inicio: dataInicio,
        data_fim: dataFim,
      };
      if (psicologoFiltro !== "all") {
        params.psicologo_id = psicologoFiltro;
      }
      const data = await api.getRelatorioFinanceiro(params);
      setRelatorio(data);
    } catch (error: any) {
      console.error("Erro ao buscar relatório:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível carregar o relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTransacoes = async () => {
    try {
      const params: any = {
        data_inicio: dataInicio,
        data_fim: dataFim,
      };
      if (psicologoFiltro !== "all") {
        params.psicologo_id = psicologoFiltro;
      }
      if (tipoFiltro !== "all") {
        params.tipo = tipoFiltro;
      }
      const data = await api.getTransacoes(params);
      setTransacoes(data);
    } catch (error: any) {
      console.error("Erro ao buscar transações:", error);
    }
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  // Não renderizar se for psicólogo
  if (session?.user.role === 'psicologo') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#007BFF]">Relatórios Financeiros</h1>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Psicólogo</Label>
                <Select value={psicologoFiltro} onValueChange={setPsicologoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {psicologos.map((psicologo) => (
                      <SelectItem key={psicologo.id} value={psicologo.id}>
                        {psicologo.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        {relatorio && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                <TrendingUp className="h-4 w-4 text-[#28A745]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#28A745]">
                  {formatarMoeda(relatorio.receitas.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {relatorio.receitas.quantidade} transações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                <TrendingDown className="h-4 w-4 text-[#DC3545]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#DC3545]">
                  {formatarMoeda(relatorio.despesas.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {relatorio.despesas.quantidade} transações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                <DollarSign className="h-4 w-4 text-[#007BFF]" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${relatorio.saldo >= 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                  {formatarMoeda(relatorio.saldo)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas - Despesas
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detalhamento por Psicólogo */}
        {relatorio && relatorio.porPsicologo && relatorio.porPsicologo.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Psicólogo</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Psicólogo</TableHead>
                    <TableHead className="text-right">Receitas</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Qtd. Receitas</TableHead>
                    <TableHead className="text-right">Qtd. Despesas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.porPsicologo.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.psicologo_nome}</TableCell>
                      <TableCell className="text-right text-[#28A745]">
                        {formatarMoeda(item.receita_total)}
                      </TableCell>
                      <TableCell className="text-right text-[#DC3545]">
                        {formatarMoeda(item.despesa_total)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${(item.receita_total - item.despesa_total) >= 0 ? 'text-[#28A745]' : 'text-[#DC3545]'}`}>
                        {formatarMoeda(item.receita_total - item.despesa_total)}
                      </TableCell>
                      <TableCell className="text-right">{item.qtd_receitas}</TableCell>
                      <TableCell className="text-right">{item.qtd_despesas}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Lista de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : transacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada no período selecionado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Psicólogo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoes.map((transacao) => (
                    <TableRow key={transacao.id}>
                      <TableCell>
                        {format(new Date(transacao.data_transacao), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            transacao.tipo === "receita"
                              ? "bg-[#E8F5E9] text-[#28A745]"
                              : "bg-[#FFEBEE] text-[#DC3545]"
                          }`}
                        >
                          {transacao.tipo === "receita" ? "Receita" : "Despesa"}
                        </span>
                      </TableCell>
                      <TableCell>{transacao.descricao || "N/A"}</TableCell>
                      <TableCell>{transacao.psicologo_nome || "N/A"}</TableCell>
                      <TableCell className={`text-right font-medium ${transacao.tipo === "receita" ? "text-[#28A745]" : "text-[#DC3545]"}`}>
                        {transacao.tipo === "receita" ? "+" : "-"} {formatarMoeda(transacao.valor)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            transacao.status === "pago"
                              ? "bg-[#E8F5E9] text-[#28A745]"
                              : "bg-[#FFF3E0] text-[#F57C00]"
                          }`}
                        >
                          {transacao.status === "pago" ? "Pago" : "Pendente"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

