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
import { Badge } from "@/components/ui/badge";
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

const psicologoFormSchema = z.object({
  nome_completo: z.string().min(3, "Nome é obrigatório (mínimo 3 caracteres)"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional().or(z.literal("")),
  crp: z.string().min(4, "CRP é obrigatório"),
  telefone: z.string().optional().nullable(),
  especializacao: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  valor_consulta: z.string().optional().nullable(),
});

type PsicologoFormData = z.infer<typeof psicologoFormSchema>;

interface Psicologo {
  id: string;
  crp: string;
  especializacao: string | null;
  valor_consulta: number | null;
  ativo: boolean;
  user_id: string;
  nome_completo?: string;
  telefone?: string | null;
  email?: string;
  bio?: string | null;
}

export default function Psicologos() {
  const [psicologos, setPsicologos] = useState<Psicologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [psicologoEditando, setPsicologoEditando] = useState<Psicologo | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const form = useForm<PsicologoFormData>({
    resolver: zodResolver(psicologoFormSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      password: "",
      crp: "",
      telefone: "",
      especializacao: "",
      bio: "",
      valor_consulta: "",
    },
  });
  const { isSubmitting } = form.formState;

  const fetchPsicologos = async () => {
    setLoading(true);
    try {
      const data = await api.getPsicologos();
      setPsicologos(data);
    } catch (error) {
      console.error("Erro ao buscar psicólogos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPsicologos();
  }, []);

  const handleNovoPsicologo = () => {
    setPsicologoEditando(null);
    form.reset({
      nome_completo: "",
      email: "",
      password: "",
      crp: "",
      telefone: "",
      especializacao: "",
      bio: "",
      valor_consulta: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditarPsicologo = (psicologo: Psicologo) => {
    setPsicologoEditando(psicologo);
    form.reset({
      nome_completo: psicologo.nome_completo || "",
      email: psicologo.email || "",
      password: "", // Não pré-preenche senha por segurança
      crp: psicologo.crp || "",
      telefone: psicologo.telefone || "",
      especializacao: psicologo.especializacao || "",
      bio: psicologo.bio || "",
      valor_consulta: psicologo.valor_consulta ? psicologo.valor_consulta.toString() : "",
    });
    setIsDialogOpen(true);
  };

  async function onSubmit(data: PsicologoFormData) {
    if (!session || session.user.role !== 'admin') {
      toast({
        title: "Erro",
        description: "Apenas administradores podem gerenciar psicólogos.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (psicologoEditando) {
        // Atualizar psicólogo existente
        await api.updatePsicologo(psicologoEditando.id, {
          nome_completo: data.nome_completo,
          email: data.email,
          password: data.password || undefined, // Só envia se preenchido
          crp: data.crp,
          telefone: data.telefone || null,
          especializacao: data.especializacao || null,
          bio: data.bio || null,
          valor_consulta: data.valor_consulta ? parseFloat(data.valor_consulta) : null,
          ativo: psicologoEditando.ativo, // Mantém o status atual (pode ser adicionado campo para mudar)
        });

        toast({
          title: "Psicólogo Atualizado!",
          description: `${data.nome_completo} foi atualizado(a) com sucesso.`,
        });
      } else {
        // Criar novo psicólogo
        await api.createPsicologo({
          nome_completo: data.nome_completo,
          email: data.email,
          password: data.password,
          crp: data.crp,
          telefone: data.telefone || null,
          especializacao: data.especializacao || null,
          bio: data.bio || null,
          valor_consulta: data.valor_consulta ? parseFloat(data.valor_consulta) : null,
        });

        toast({
          title: "Psicólogo Cadastrado!",
          description: `${data.nome_completo} foi adicionado(a) com sucesso.`,
        });
      }

      form.reset();
      setIsDialogOpen(false);
      setPsicologoEditando(null);
      fetchPsicologos();
    } catch (error: any) {
      console.error("Erro ao salvar psicólogo:", error);
      toast({
        title: psicologoEditando ? "Erro ao atualizar psicólogo" : "Erro ao cadastrar psicólogo",
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
            <h1 className="text-3xl font-bold tracking-tight">Psicólogos</h1>
            <p className="text-muted-foreground">
              Gerencie os psicólogos cadastrados na clínica
            </p>
          </div>

          {session?.user.role === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setPsicologoEditando(null);
                form.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleNovoPsicologo} className="bg-[#007BFF] hover:bg-[#0056B3] text-white">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo Psicólogo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {psicologoEditando ? "Editar Psicólogo" : "Cadastrar Novo Psicólogo"}
                  </DialogTitle>
                  <DialogDescription>
                    {psicologoEditando
                      ? "Atualize os dados do psicólogo. Deixe a senha em branco para não alterá-la."
                      : "Preencha os dados para criar uma conta de psicólogo."}
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
                                <Input placeholder="Nome completo do psicólogo" {...field} />
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
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@dominio.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>
                                Senha {psicologoEditando && "(deixe em branco para não alterar)"}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder={psicologoEditando ? "Nova senha (opcional)" : "Senha para login"} 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="crp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CRP</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: 06/123456" {...field} />
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
                          name="especializacao"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialização</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Terapia Cognitivo-Comportamental" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="valor_consulta"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor da Consulta (R$)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="150.00" {...field} value={field.value ?? ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Biografia</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Breve descrição sobre o psicólogo..."
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
                      <Button type="submit" disabled={isSubmitting} className="bg-[#007BFF] hover:bg-[#0056B3] text-white">
                        {isSubmitting ? "Salvando..." : psicologoEditando ? "Atualizar Psicólogo" : "Salvar Psicólogo"}
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
                <TableHead>CRP</TableHead>
                <TableHead>Especialização</TableHead>
                <TableHead>Valor Consulta</TableHead>
                <TableHead>Status</TableHead>
                {session?.user.role === 'admin' && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={session?.user.role === 'admin' ? 6 : 5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : psicologos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={session?.user.role === 'admin' ? 6 : 5} className="text-center">
                    Nenhum psicólogo cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                psicologos.map((psicologo) => (
                  <TableRow key={psicologo.id}>
                    <TableCell className="font-medium">
                      {psicologo.nome_completo || "N/A"}
                    </TableCell>
                    <TableCell>{psicologo.crp}</TableCell>
                    <TableCell>{psicologo.especializacao || "N/A"}</TableCell>
                    <TableCell>
                      {psicologo.valor_consulta
                        ? `R$ ${psicologo.valor_consulta.toFixed(2)}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={psicologo.ativo ? "default" : "secondary"}
                        className={
                          psicologo.ativo
                            ? "bg-[#E8F5E9] text-[#28A745] border-[#81C784]"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }
                      >
                        {psicologo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    {session?.user.role === 'admin' && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarPsicologo(psicologo)}
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
