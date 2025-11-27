# MindCare - Sistema de Gestão para Clínica de Psicologia

Sistema completo para gestão de clínicas de psicologia, desenvolvido para facilitar o gerenciamento de pacientes, agendamentos, prontuários eletrônicos, relatórios financeiros e acompanhamento de desempenho dos profissionais.

## 📋 Funcionalidades

### 👥 Gerenciamento de Pessoas
- **Cadastro de Pacientes**: Cadastro completo com dados pessoais, contato de emergência, convênio e observações
- **Cadastro de Psicólogos**: Gestão de profissionais com CRP, especialização, valor de consulta e status ativo/inativo
- **Vinculação**: Pacientes são vinculados automaticamente aos psicólogos através dos agendamentos

### 📅 Agendamentos
- Agendamento de consultas com data, hora e duração
- Controle de status (Agendado, Confirmado, Em Atendimento, Concluído, Cancelado)
- Filtros por data, status, paciente e psicólogo
- Visualização em lista, dia ou semana
- Atualização de status pelos psicólogos diretamente do dashboard

### 📝 Prontuário Eletrônico
- Registro completo de sessões com anotações, evolução e conduta
- Histórico completo do paciente
- Agendamento de próxima sessão
- Acesso restrito: psicólogos veem apenas seus próprios prontuários

### 💰 Relatórios Financeiros
- Relatórios de receitas e despesas
- Detalhamento por psicólogo
- Filtros por período e profissional
- Lista de transações com status de pagamento
- Geração automática de receitas ao finalizar consultas
- **Acesso restrito**: apenas admin e atendente

### 📊 Desempenho dos Profissionais
- Métricas detalhadas por psicólogo:
  - Total de pacientes atendidos
  - Total de agendamentos realizados
  - Taxa de conclusão e cancelamento
  - Total de prontuários registrados
  - Receita total gerada
  - Duração média das sessões
- Comparativo de desempenho entre profissionais
- **Acesso restrito**: apenas admin e atendente

### 🔐 Controle de Acesso
- **Admin**: Acesso total ao sistema
- **Atendente**: Acesso a todas as funcionalidades exceto algumas configurações administrativas
- **Psicólogo**: Acesso limitado aos seus próprios pacientes, agendamentos e prontuários

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18.3.1** - Biblioteca JavaScript para construção de interfaces
- **TypeScript 5.8.3** - Superset do JavaScript com tipagem estática
- **Vite 5.4.19** - Build tool rápida e moderna
- **React Router DOM 6.30.1** - Roteamento para aplicações React
- **React Hook Form 7.61.1** - Gerenciamento de formulários performático
- **Zod 3.25.76** - Validação de schemas TypeScript-first
- **Tailwind CSS 3.4.17** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI acessíveis e customizáveis baseados em Radix UI
- **Radix UI** - Componentes UI primitivos acessíveis
- **Lucide React** - Biblioteca de ícones
- **date-fns 3.6.0** - Manipulação de datas
- **React Query 5.83.0** - Gerenciamento de estado do servidor

### Backend
- **Node.js** - Runtime JavaScript
- **Express 4.21.1** - Framework web para Node.js
- **SQLite (better-sqlite3 11.7.0)** - Banco de dados SQL embutido
- **CORS 2.8.5** - Middleware para habilitar CORS

### Ferramentas de Desenvolvimento
- **ESLint** - Linter para JavaScript/TypeScript
- **TypeScript ESLint** - Linter específico para TypeScript
- **Autoprefixer** - Adiciona prefixos de vendor automaticamente
- **PostCSS** - Transformador de CSS
- **Concurrently 9.1.0** - Execução simultânea de scripts

## 📦 Pré-requisitos

Antes de começar, você precisa ter instalado:

- **Node.js** (versão 16 ou superior)
- **npm** (geralmente vem com o Node.js)

Você pode verificar se já possui instalado executando:

```bash
node --version
npm --version
```

## 🚀 Como Executar o Sistema

### 1. Clone o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd projetoUSFpsicologos
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Execute o sistema

Há duas formas de executar o sistema:

#### Opção A: Executar tudo junto (Recomendado)

Este comando inicia tanto o servidor backend quanto o frontend simultaneamente:

```bash
npm run dev:full
```

#### Opção B: Executar separadamente

Em um terminal, inicie o servidor backend:

```bash
npm run server
```

Em outro terminal, inicie o frontend:

```bash
npm run dev
```

### 4. Acesse o sistema

Após iniciar o sistema, acesse:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001

## 👤 Credenciais Padrão

Ao iniciar o sistema pela primeira vez, um usuário administrador é criado automaticamente:

- **Email**: `admin@usf.com`
- **Senha**: `admin123`

⚠️ **IMPORTANTE**: Altere a senha em produção!

## 📜 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento do frontend (porta 8080)
- `npm run server` - Inicia o servidor backend (porta 3001)
- `npm run dev:full` - Inicia frontend e backend simultaneamente
- `npm run build` - Cria build de produção do frontend
- `npm run build:dev` - Cria build de desenvolvimento
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter para verificar erros no código

## 🗄️ Banco de Dados

O sistema utiliza **SQLite**, um banco de dados arquivo que é criado automaticamente na pasta `server/` com o nome `database.sqlite`.

### Vantagens do SQLite:
- Não requer instalação de servidor de banco de dados
- Banco de dados é um único arquivo (fácil backup)
- Ideal para desenvolvimento e pequenas/médias aplicações
- Fácil de visualizar e gerenciar

### Visualizar o banco de dados:
Você pode usar qualquer visualizador SQLite:
- **DB Browser for SQLite** (recomendado)
- **DBeaver**
- **SQLiteStudio**

### Backup:
Simplesmente copie o arquivo `server/database.sqlite`

### Resetar o banco:
Delete o arquivo `server/database.sqlite` e reinicie o servidor

## 📁 Estrutura do Projeto

```
projetoUSFpsicologos/
├── src/                    # Código-fonte do frontend
│   ├── components/         # Componentes React reutilizáveis
│   ├── hooks/              # Custom hooks
│   ├── lib/                # Utilitários e API client
│   ├── pages/              # Páginas da aplicação
│   ├── App.tsx             # Componente principal
│   └── main.tsx            # Ponto de entrada
├── server/                 # Código do backend
│   ├── routes/             # Rotas da API
│   ├── database.js         # Configuração e inicialização do banco
│   ├── index.js            # Servidor Express
│   └── database.sqlite     # Arquivo do banco de dados (gerado automaticamente)
├── public/                 # Arquivos estáticos
├── package.json            # Dependências e scripts
└── README.md              # Este arquivo
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/session` - Verificar sessão atual
- `POST /api/auth/logout` - Logout

### Pacientes
- `GET /api/pacientes` - Listar pacientes
- `POST /api/pacientes` - Criar paciente
- `PUT /api/pacientes/:id` - Atualizar paciente
- `DELETE /api/pacientes/:id` - Deletar paciente

### Psicólogos
- `GET /api/psicologos` - Listar psicólogos
- `POST /api/psicologos` - Criar psicólogo

### Agendamentos
- `GET /api/agendamentos` - Listar agendamentos
- `POST /api/agendamentos` - Criar agendamento
- `PUT /api/agendamentos/:id/status` - Atualizar status do agendamento

### Prontuários
- `GET /api/prontuarios/paciente/:pacienteId` - Listar prontuários de um paciente
- `POST /api/prontuarios` - Criar prontuário
- `PUT /api/prontuarios/:id` - Atualizar prontuário

### Financeiro
- `GET /api/financeiro/relatorio` - Relatório financeiro geral
- `GET /api/financeiro/transacoes` - Listar transações
- `POST /api/financeiro/transacoes` - Criar transação manual

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas do dashboard
- `GET /api/dashboard/meus-pacientes` - Pacientes do psicólogo logado
- `GET /api/dashboard/proximos-agendamentos` - Próximos agendamentos
- `GET /api/dashboard/agendamentos-hoje` - Agendamentos de hoje
- `GET /api/dashboard/desempenho-profissionais` - Desempenho dos profissionais

## 🔒 Segurança

- Autenticação baseada em tokens armazenados no localStorage
- Sessões com expiração automática
- Middleware de autenticação em todas as rotas protegidas
- Controle de acesso baseado em roles (admin, atendente, psicólogo)
- Validação de dados no frontend (Zod) e backend

## 🌐 Variáveis de Ambiente (Opcional)

Crie um arquivo `.env` na raiz do projeto se quiser personalizar:

```env
VITE_API_URL=http://localhost:3001/api
PORT=3001
```

## 📝 Notas de Desenvolvimento

- O sistema foi desenvolvido para ser simples e direto
- Banco de dados local facilita desenvolvimento e testes
- Interface moderna e responsiva
- Código tipado com TypeScript para maior confiabilidade

## 📄 Licença

Este projeto é privado.

---

**Desenvolvido com ❤️ para gestão de clínicas de psicologia**
