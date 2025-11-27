import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export function getDatabase() {
  if (!db) {
    const dbPath = join(__dirname, 'database.sqlite');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export async function initDatabase() {
  const db = getDatabase();

  // Tabela de usuários
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nome_completo TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'paciente',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de perfis
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      nome_completo TEXT NOT NULL,
      telefone TEXT,
      data_nascimento TEXT,
      cpf TEXT UNIQUE,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de pacientes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      psicologo_id TEXT,
      endereco TEXT,
      contato_emergencia TEXT,
      convenio TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (psicologo_id) REFERENCES psicologos(id) ON DELETE SET NULL
    )
  `);
  
  // Adicionar coluna psicologo_id se não existir (migration)
  try {
    db.prepare('SELECT psicologo_id FROM pacientes LIMIT 1').get();
  } catch (e) {
    db.exec('ALTER TABLE pacientes ADD COLUMN psicologo_id TEXT REFERENCES psicologos(id) ON DELETE SET NULL');
  }

  // Adicionar coluna medicacao se não existir (migration)
  try {
    db.prepare('SELECT medicacao FROM pacientes LIMIT 1').get();
  } catch (e) {
    db.exec('ALTER TABLE pacientes ADD COLUMN medicacao TEXT');
  }

  // Tabela de psicólogos
  db.exec(`
    CREATE TABLE IF NOT EXISTS psicologos (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      crp TEXT UNIQUE NOT NULL,
      especializacao TEXT,
      bio TEXT,
      valor_consulta REAL,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de agendamentos
  db.exec(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id TEXT PRIMARY KEY,
      psicologo_id TEXT NOT NULL,
      paciente_id TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      duracao_minutos INTEGER DEFAULT 50,
      status TEXT DEFAULT 'agendado',
      observacoes TEXT,
      valor REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (psicologo_id) REFERENCES psicologos(id) ON DELETE CASCADE,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE
    )
  `);

  // Tabela de sessões (para autenticação simples)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de prontuários eletrônicos
  db.exec(`
    CREATE TABLE IF NOT EXISTS prontuarios (
      id TEXT PRIMARY KEY,
      paciente_id TEXT NOT NULL,
      psicologo_id TEXT NOT NULL,
      agendamento_id TEXT,
      data_sessao TEXT NOT NULL,
      tipo TEXT DEFAULT 'sessao',
      anotacoes TEXT,
      evolucao TEXT,
      conduta TEXT,
      proxima_sessao TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id) ON DELETE CASCADE,
      FOREIGN KEY (psicologo_id) REFERENCES psicologos(id) ON DELETE CASCADE,
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tabela de pagamentos/transações financeiras
  db.exec(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id TEXT PRIMARY KEY,
      agendamento_id TEXT,
      psicologo_id TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'receita',
      descricao TEXT,
      valor REAL NOT NULL,
      data_transacao TEXT NOT NULL,
      status TEXT DEFAULT 'pendente',
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
      FOREIGN KEY (psicologo_id) REFERENCES psicologos(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Banco de dados inicializado!');
  
    // Criar usuário admin padrão se não existir
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@usf.com');
    if (!adminExists) {
      const crypto = await import('crypto');
      const adminId = crypto.randomUUID();
    // Senha padrão: admin123 (em produção, use hash!)
    db.prepare(`
      INSERT INTO users (id, email, password, nome_completo, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'admin@usf.com', 'admin123', 'Administrador', 'admin');
    
    // Criar perfil do admin
    db.prepare(`
      INSERT INTO profiles (id, user_id, nome_completo)
      VALUES (?, ?, ?)
    `).run(adminId, adminId, 'Administrador');
    
    console.log('👤 Usuário admin criado: admin@usf.com / admin123');
  }
}

