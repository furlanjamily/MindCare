import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  nome_completo: string;
  role: string;
}

interface Session {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função para atualizar sessão após login
  const updateSession = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const sessionData = await api.getSession();
        if (sessionData && sessionData.user) {
          setUser(sessionData.user);
          setSession({
            user: sessionData.user,
            token: sessionData.token || token,
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      return false;
    }
  };

  useEffect(() => {
    // Verificar sessão ao carregar
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const sessionData = await api.getSession();
          
          if (sessionData && sessionData.user) {
            setUser(sessionData.user);
            setSession({
              user: sessionData.user,
              token: sessionData.token || token,
            });
          } else {
            // Sessão inválida, limpar
            localStorage.removeItem('user');
            localStorage.removeItem('auth_token');
            setUser(null);
            setSession(null);
          }
        } else {
          // Sem token, garantir que está limpo
          localStorage.removeItem('user');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Ouvir mudanças no localStorage para atualizar quando fizer login
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'user') {
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Verificar periodicamente se a sessão ainda é válida
    const interval = setInterval(() => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        api.getSession().catch(() => {
          // Se a sessão expirou, limpar
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          setUser(null);
          setSession(null);
        });
      }
    }, 60000); // Verificar a cada minuto

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUser(null);
      setSession(null);
      navigate('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshSession: updateSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
