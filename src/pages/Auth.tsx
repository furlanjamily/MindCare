import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import loginBg from "@/assets/login-bg.jpg";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSession } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const session = await api.getSession();
          if (session) {
            navigate('/dashboard');
          }
        } catch {
          // Sessão inválida, continuar na página de login
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const data = await api.login(email, password);
      toast({
        title: "Login realizado!",
        description: `Bem-vindo, ${data.user.nome_completo}!`,
      });
      // Atualizar sessão no contexto
      await refreshSession();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Email ou senha inválidos",
        variant: "destructive",
      });
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/80 backdrop-blur-sm" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-elegant border-white/20 bg-card/95 backdrop-blur">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            MindCare
          </CardTitle>
          <CardDescription className="text-center">
            Sistema de Gestão para Clínica de Psicologia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-[#007BFF] hover:bg-[#0056B3] text-white" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
