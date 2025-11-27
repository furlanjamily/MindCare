# 🎉 Migração do Supabase para Backend Local

Agora você tem um backend **muito mais simples** de usar!

## 🚀 Como começar:

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar o servidor backend

```bash
npm run server
```

O servidor vai rodar em `http://localhost:3001` e criar automaticamente o banco de dados `database.sqlite`.

### 3. Iniciar o frontend (em outro terminal)

```bash
npm run dev
```

### Ou iniciar tudo junto:

```bash
npm run dev:full
```

## 📁 Estrutura

- `server/` - Backend Node.js + Express + SQLite
- `server/database.sqlite` - Banco de dados (criado automaticamente)
- `server/routes/` - Rotas da API
- `src/lib/api.ts` - Cliente API no frontend

## 👤 Usuário Admin Padrão

Ao iniciar pela primeira vez, é criado automaticamente:

- **Email**: `admin@usf.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha em produção!

## 🗄️ Banco de Dados

O banco é um arquivo SQLite (`database.sqlite`) na pasta `server/`. 

- **Visualizar dados**: Use qualquer visualizador SQLite (DB Browser for SQLite, DBeaver, etc.)
- **Backup**: Simplesmente copie o arquivo `database.sqlite`
- **Reset**: Delete o arquivo `database.sqlite` e reinicie o servidor

## 🔧 Variáveis de Ambiente (opcional)

Crie um arquivo `.env` na raiz se quiser mudar a porta:

```
VITE_API_URL=http://localhost:3001/api
PORT=3001
```

## 📝 API Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/auth/session` - Verificar sessão
- `POST /api/auth/logout` - Logout
- `GET /api/pacientes` - Listar pacientes
- `POST /api/pacientes` - Criar paciente
- `GET /api/psicologos` - Listar psicólogos
- `GET /api/agendamentos` - Listar agendamentos
- `GET /api/dashboard/stats` - Estatísticas

## ✅ Vantagens

- ✅ Sem configuração complexa
- ✅ Sem servidor externo
- ✅ Banco de dados local (fácil backup)
- ✅ Código simples e fácil de entender
- ✅ Fácil de debugar
- ✅ Sem limites de requisições

## 🔄 Próximos Passos

Agora você precisa atualizar o frontend para usar a nova API. Os arquivos principais a atualizar são:

1. `src/hooks/useAuth.tsx` - Trocar Supabase por API
2. `src/pages/Auth.tsx` - Trocar Supabase por API
3. `src/pages/Pacientes.tsx` - Trocar Supabase por API
4. `src/pages/Dashboard.tsx` - Trocar Supabase por API

Mas isso já está sendo preparado! 🎉

