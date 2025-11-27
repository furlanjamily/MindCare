import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ChevronLeft, ChevronRight, ArrowRight, ChevronDown, User } from "lucide-react";
import { format, addDays, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const agendamentoFormSchema = z.object({
  paciente_id: z.string().min(1, "Paciente é obrigatório"),
  psicologo_id: z.string().min(1, "Psicólogo é obrigatório"),
  data_hora: z.string().min(1, "Data e hora são obrigatórias"),
  duracao_minutos: z.string().optional(),
  status: z.string().optional(),
  observacoes: z.string().optional().nullable(),
  valor: z.string().optional().nullable(),
});

type AgendamentoFormData = z.infer<typeof agendamentoFormSchema>;

interface Agendamento {
  id: string;
  paciente_id?: string;
  psicologo_id?: string;
  data_hora: string;
  status: string;
  duracao_minutos: number;
  paciente_user_id?: string;
  paciente_nome?: string;
  paciente_telefone?: string;
  psicologo_nome?: string;
  psicologo_crp?: string;
}

const statusColors: Record<string, string> = {
  agendado: "bg-[#E3F2FD] text-[#007BFF] border-[#90CAF9]",
  confirmado: "bg-[#E8F5E9] text-[#28A745] border-[#81C784]",
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
};

const statusOptions = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_atendimento", label: "Em Atendimento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

export default function Agendamentos() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [agendamentosTodos, setAgendamentosTodos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [psicologos, setPsicologos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"lista" | "dia" | "semana">("lista");
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroPaciente, setFiltroPaciente] = useState<string>("all");
  const [filtroPsicologo, setFiltroPsicologo] = useState<string>("all");
  const [filtroAtendimento, setFiltroAtendimento] = useState<string>("all");
  const { toast } = useToast();
  const { session } = useAuth();

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoFormSchema),
    defaultValues: {
      paciente_id: "",
      psicologo_id: "",
      data_hora: "",
      duracao_minutos: "50",
      status: "agendado",
      observacoes: "",
      valor: "",
    },
  });
  const { isSubmitting } = form.formState;

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const data = await api.getAgendamentos();
      setAgendamentosTodos(data);
      aplicarFiltros(data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = (data: Agendamento[]) => {
    if (!data || data.length === 0) {
      setAgendamentos([]);
      return;
    }

    let filtrados = [...data];

    // Filtrar por data selecionada
    const dataSelecionada = format(selectedDate, "yyyy-MM-dd");
    filtrados = filtrados.filter((a: Agendamento) => {
      if (!a.data_hora) return false;
      const dataAgendamento = format(new Date(a.data_hora), "yyyy-MM-dd");
      return dataAgendamento === dataSelecionada;
    });

    // Filtrar por status
    if (filtroStatus !== "all") {
      filtrados = filtrados.filter((a) => a.status === filtroStatus);
    }

    // Filtrar por paciente (usando paciente_id do agendamento)
    if (filtroPaciente !== "all") {
      filtrados = filtrados.filter((a) => a.paciente_id === filtroPaciente);
    }

    // Filtrar por psicólogo (usando psicologo_id do agendamento)
    if (filtroPsicologo !== "all") {
      filtrados = filtrados.filter((a) => a.psicologo_id === filtroPsicologo);
    }

    setAgendamentos(filtrados);
  };

  useEffect(() => {
    const loadData = async () => {
      if (session?.user.role !== 'psicologo') {
        try {
          const [pacientesData, psicologosData] = await Promise.all([
            api.getPacientes(),
            api.getPsicologos(),
          ]);
          setPacientes(pacientesData);
          setPsicologos(psicologosData);
        } catch (error) {
          console.error("Erro ao buscar dados:", error);
        }
      }
      await fetchAgendamentos();
    };

    if (session) {
      loadData();
    }
  }, [session]);

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (agendamentosTodos.length > 0 || selectedDate || filtroStatus || filtroPaciente || filtroPsicologo) {
      aplicarFiltros(agendamentosTodos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filtroStatus, filtroPaciente, filtroPsicologo, agendamentosTodos]);

  async function onSubmit(data: AgendamentoFormData) {
    if (!session || session.user.role === 'psicologo') {
      toast({
        title: "Erro",
        description: "Apenas administradores e atendentes podem criar agendamentos.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.createAgendamento({
        paciente_id: data.paciente_id,
        psicologo_id: data.psicologo_id,
        data_hora: data.data_hora,
        duracao_minutos: data.duracao_minutos ? parseInt(data.duracao_minutos) : 50,
        status: data.status || "agendado",
        observacoes: data.observacoes || null,
        valor: data.valor ? parseFloat(data.valor) : null,
      });

      toast({
        title: "Agendamento Criado!",
        description: "O agendamento foi criado e o paciente foi vinculado ao psicólogo.",
      });

      form.reset();
      setIsDialogOpen(false);
      fetchAgendamentos();
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  }

  const handleStatusChange = async (agendamentoId: string, newStatus: string) => {
    try {
      await api.updateAgendamentoStatus(agendamentoId, newStatus);
      toast({
        title: "Status atualizado!",
        description: `Status alterado para: ${statusLabels[newStatus]}`,
      });
      fetchAgendamentos();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleAtender = (agendamentoId: string) => {
    handleStatusChange(agendamentoId, "em_atendimento");
  };

  const navigateDate = (direction: "prev" | "next") => {
    setSelectedDate(prev => direction === "next" ? addDays(prev, 1) : subDays(prev, 1));
  };

  const formatarDataCompleta = (date: Date) => {
    return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatarHora = (dataHora: string) => {
    return format(new Date(dataHora), "HH:mm", { locale: ptBR });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // agendamentos já vem filtrado da função aplicarFiltros
  const agendamentosFiltrados = agendamentos;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Título e Botão Novo */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-[#007BFF]">Agenda</h1>
          {session?.user.role !== 'psicologo' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#007BFF] hover:bg-[#0056B3] text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                  <DialogDescription>
                    Crie um novo agendamento. O paciente será automaticamente vinculado ao psicólogo.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="paciente_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paciente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o paciente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {pacientes.map((paciente) => (
                                  <SelectItem key={paciente.id} value={paciente.id}>
                                    {paciente.profiles?.nome_completo || "N/A"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="psicologo_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Psicólogo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o psicólogo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {psicologos.map((psicologo) => (
                                  <SelectItem key={psicologo.id} value={psicologo.id}>
                                    {psicologo.nome_completo} - CRP {psicologo.crp}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="data_hora"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data e Hora</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="duracao_minutos"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duração (minutos)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="50" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="valor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="150.00" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="observacoes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Observações sobre o agendamento..."
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter className="pt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">
                          Cancelar
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={isSubmitting} className="bg-[#007BFF] hover:bg-[#0056B3] text-white">
                        {isSubmitting ? "Salvando..." : "Criar Agendamento"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Navegação de Data */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("prev")}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold text-[#007BFF]">
              {formatarDataCompleta(selectedDate).toUpperCase()}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDate("next")}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Opções de Visualização */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "lista" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("lista")}
              className={viewMode === "lista" ? "bg-[#007BFF] hover:bg-[#0056B3] text-white" : ""}
            >
              Lista
            </Button>
            <Button
              variant={viewMode === "dia" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("dia")}
              className={viewMode === "dia" ? "bg-[#007BFF] hover:bg-[#0056B3] text-white" : ""}
            >
              Dia
            </Button>
            <Button
              variant={viewMode === "semana" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("semana")}
              className={viewMode === "semana" ? "bg-[#007BFF] hover:bg-[#0056B3] text-white" : ""}
            >
              Semana
            </Button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtrar por</span>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {session?.user.role !== 'psicologo' && (
            <>
              <Select value={filtroPsicologo} onValueChange={setFiltroPsicologo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Psicólogo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Psicólogos</SelectItem>
                  {psicologos.map((psicologo) => (
                    <SelectItem key={psicologo.id} value={psicologo.id}>
                      {psicologo.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filtroPaciente} onValueChange={setFiltroPaciente}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Pacientes</SelectItem>
                  {pacientes.map((paciente) => (
                    <SelectItem key={paciente.id} value={paciente.id}>
                      {paciente.profiles?.nome_completo || "N/A"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {(filtroStatus !== "all" || filtroPaciente !== "all" || filtroPsicologo !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFiltroStatus("all");
                setFiltroPaciente("all");
                setFiltroPsicologo("all");
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* Tabela de Agendamentos */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Horário</TableHead>
                <TableHead>Atendimento</TableHead>
                <TableHead>Chegada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : agendamentosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento encontrado para esta data
                  </TableCell>
                </TableRow>
              ) : (
                agendamentosFiltrados.map((agendamento) => (
                  <TableRow key={agendamento.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {formatarHora(agendamento.data_hora)}
                    </TableCell>
                    <TableCell>CONSULTA</TableCell>
                    <TableCell className="text-muted-foreground">N/A</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`${statusColors[agendamento.status] || "bg-gray-100 text-gray-700"} border h-7 px-3 text-sm`}
                          >
                            {statusLabels[agendamento.status] || agendamento.status}
                            <ChevronDown className="ml-2 h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {statusOptions.map((opt) => (
                            <DropdownMenuItem
                              key={opt.value}
                              onClick={() => handleStatusChange(agendamento.id, opt.value)}
                            >
                              {opt.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-[#E3F2FD] text-[#007BFF]">
                            {getInitials(agendamento.psicologo_nome || "N/A")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{agendamento.psicologo_nome || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-[#E3F2FD] text-[#007BFF]">
                            {getInitials(agendamento.paciente_nome || "N/A")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{agendamento.paciente_nome || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAtender(agendamento.id)}
                          className="border-[#007BFF] text-[#007BFF] hover:bg-[#E3F2FD] h-7"
                        >
                          Atender
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Rodapé com Total */}
          <div className="border-t bg-gray-50 px-4 py-3 flex justify-end items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-sm font-bold text-gray-900">{agendamentosFiltrados.length}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
