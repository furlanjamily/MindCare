import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import pacientesRoutes from './routes/pacientes.js';
import psicologosRoutes from './routes/psicologos.js';
import agendamentosRoutes from './routes/agendamentos.js';
import dashboardRoutes from './routes/dashboard.js';
import prontuariosRoutes from './routes/prontuarios.js';
import financeiroRoutes from './routes/financeiro.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar banco de dados
initDatabase().catch(console.error);

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/psicologos', psicologosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/prontuarios', prontuariosRoutes);
app.use('/api/financeiro', financeiroRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend funcionando!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Banco de dados: database.sqlite`);
});

