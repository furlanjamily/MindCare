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
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Schema de validação Zod
const pacienteFormSchema = z.object({
  nome_completo: z.string().min(3, "Nome é obrigatório (mínimo 3 caracteres)"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  data_nascimento: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  convenio: z.string().optional().nullable(),
  contato_emergencia: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  medicacao: z.string().optional().nullable(),
});

type PacienteFormData = z.infer<typeof pacienteFormSchema>;

// Interface para os dados do Paciente vindo da listagem
interface PacienteProfile {
  nome_completo: string;
  cpf: string | null;
  telefone: string | null;
  data_nascimento?: string | null;
}
interface Paciente {
  id: string;
  user_id: string;
  psicologo_id: string | null;
  endereco: string | null;
  contato_emergencia: string | null;
  convenio: string | null;
  observacoes?: string | null;
  medicacao?: string | null;
  email?: string;
  created_at: string;
  profiles: PacienteProfile;
  psicologo?: {
    crp: string;
    nome: string;
  } | null;
}

export default function Pacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pacienteEditando, setPacienteEditando] = useState<Paciente | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const form = useForm<PacienteFormData>({
    resolver: zodResolver(pacienteFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      cpf: "",
      telefone: "",
      data_nascimento: "",
      endereco: "",
      convenio: "",
      contato_emergencia: "",
      observacoes: "",
      medicacao: "",
    },
  });
  const { isSubmitting } = form.formState;

  // Função para buscar TODOS os pacientes
  const fetchPacientes = async () => {
    setLoading(true);
    
    try {
      const pacientes = await api.getPacientes();
      setPacientes(pacientes);
    } catch (error: any) {
      console.error("Erro ao buscar pacientes:", error);
      toast({
        title: "Erro ao buscar pacientes",
        description: error.message || "Não foi possível carregar a lista de pacientes.",
        variant: "destructive",
      });
      setPacientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Só busca pacientes se estiver logado
    if(session) {
      fetchPacientes();
    }
  }, [session]); // Depende da sessão

  const handleNovoPaciente = () => {
    setPacienteEditando(null);
    form.reset({
      nome_completo: "",
      email: "",
      cpf: "",
      telefone: "",
      data_nascimento: "",
      endereco: "",
      convenio: "",
      contato_emergencia: "",
      observacoes: "",
      medicacao: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditarPaciente = (paciente: Paciente) => {
    setPacienteEditando(paciente);
    form.reset({
      nome_completo: paciente.profiles?.nome_completo || "",
      email: paciente.email || "",
      cpf: paciente.profiles?.cpf || "",
      telefone: paciente.profiles?.telefone || "",
      data_nascimento: paciente.profiles?.data_nascimento || "",
      endereco: paciente.endereco || "",
      convenio: paciente.convenio || "",
      contato_emergencia: paciente.contato_emergencia || "",
      observacoes: paciente.observacoes || "",
      medicacao: paciente.medicacao || "",
    });
    setIsDialogOpen(true);
  };

  // Handler para submeter o formulário de novo paciente
  async function onSubmit(data: PacienteFormData) {
    if (!session || session.user.role === 'psicologo') {
      toast({
        title: "Erro",
        description: "Apenas administradores e atendentes podem gerenciar pacientes.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (pacienteEditando) {
        // Atualizar paciente existente
        await api.updatePaciente(pacienteEditando.id, {
          nome_completo: data.nome_completo,
          email: data.email || undefined, // Só envia se fornecido
          cpf: data.cpf || null,
          telefone: data.telefone || null,
          data_nascimento: data.data_nascimento || null,
          endereco: data.endereco || null,
          convenio: data.convenio || null,
          contato_emergencia: data.contato_emergencia || null,
          observacoes: data.observacoes || null,
          medicacao: data.medicacao || null,
        });

        toast({
          title: "Paciente Atualizado!",
          description: `${data.nome_completo} foi atualizado(a) com sucesso.`,
        });
      } else {
        // Criar novo paciente
        await api.createPaciente({
          nome_completo: data.nome_completo,
          email: data.email,
          cpf: data.cpf || null,
          telefone: data.telefone || null,
          data_nascimento: data.data_nascimento || null,
          endereco: data.endereco || null,
          convenio: data.convenio || null,
          contato_emergencia: data.contato_emergencia || null,
          observacoes: data.observacoes || null,
          medicacao: data.medicacao || null,
        });

        toast({
          title: "Paciente Cadastrado!",
          description: `${data.nome_completo} foi adicionado(a) com sucesso.`,
        });
      }

      form.reset();
      setIsDialogOpen(false);
      setPacienteEditando(null);
      fetchPacientes();
    } catch (error: any) {
      console.error("Erro ao salvar paciente:", error);
      toast({
        title: pacienteEditando ? "Erro ao atualizar paciente" : "Erro ao cadastrar paciente",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary/90 tracking-tight">Pacientes</h1>
            <p className=" text-primary/90">
              Gerencie os pacientes cadastrados na clínica
              {pacientes.length > 0 && (
                <span className="ml-2 font-semibold text-foreground">
                  ({pacientes.length} {pacientes.length === 1 ? 'paciente cadastrado' : 'pacientes cadastrados'})
                </span>
              )}
            </p>
          </div>

          {session?.user.role !== 'psicologo' && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setPacienteEditando(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleNovoPaciente} className="bg-primary/90 text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Paciente
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  {pacienteEditando ? "Editar Paciente" : "Cadastrar Novo Paciente"}
                </DialogTitle>
                <DialogDescription>
                  {pacienteEditando
                    ? "Atualize os dados do paciente."
                    : "Preencha os dados para criar um novo paciente."}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <ScrollArea className="h-[60vh] px-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nome_completo"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo do paciente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>
                              Email {pacienteEditando && "(opcional na edição)"}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="email@dominio.com" 
                                {...field} 
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="data_nascimento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="convenio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Convênio</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Unimed, SulAmérica ou Particular" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endereco"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input placeholder="Rua, Número, Bairro, Cidade - UF" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contato_emergencia"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Contato de Emergência</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome e Telefone (Ex: Maria - (11) 98765-4321)" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="medicacao"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Medicação</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Sertralina 50mg, Fluoxetina 20mg" 
                                {...field} 
                                value={field.value ?? ""}
                              />
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
                                placeholder="Alguma observação inicial sobre o paciente..."
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </ScrollArea>
                  
                  <DialogFooter className="pt-6">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting} className="bg-[#28A745] hover:bg-[#218838] text-white">
                      {isSubmitting ? "Salvando..." : pacienteEditando ? "Atualizar Paciente" : "Salvar Paciente"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          )}

        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Convênio</TableHead>
                <TableHead>Psicólogo</TableHead>
                <TableHead>Contato Emergência</TableHead>
                {session?.user.role === 'admin' && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={session?.user.role === 'admin' ? 7 : 6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : pacientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={session?.user.role === 'admin' ? 7 : 6} className="text-center">
                    Nenhum paciente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                pacientes.map((paciente) => (
                  <TableRow key={paciente.id}>
                    <TableCell className="font-medium">
                      {paciente.profiles?.nome_completo || "Usuário sem perfil"}
                    </TableCell>
                    <TableCell>{paciente.profiles?.cpf || "N/A"}</TableCell>
                    <TableCell>{paciente.profiles?.telefone || "N/A"}</TableCell>
                    <TableCell>{paciente.convenio || "Particular"}</TableCell>
                    <TableCell>
                      {paciente.psicologo ? (
                        <span className="text-sm">
                          {paciente.psicologo.nome} ({paciente.psicologo.crp})
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem vínculo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {paciente.contato_emergencia || "N/A"}
                    </TableCell>
                    {session?.user.role === 'admin' && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarPaciente(paciente)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}