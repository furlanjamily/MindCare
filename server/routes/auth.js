import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDatabase();

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Criar token de sessão
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), user.id, token, expiresAt.toISOString());

    // Buscar perfil
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        nome_completo: user.nome_completo || profile?.nome_completo,
        role: user.role,
      },
      token,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Registro
router.post('/register', (req, res) => {
  try {
    const { email, password, nome_completo } = req.body;
    const db = getDatabase();

    // Verificar se email já existe
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const userId = randomUUID();

    // Criar usuário
    db.prepare(`
      INSERT INTO users (id, email, password, nome_completo, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, password, nome_completo, 'paciente');

    // Criar perfil
    db.prepare(`
      INSERT INTO profiles (id, user_id, nome_completo)
      VALUES (?, ?, ?)
    `).run(userId, userId, nome_completo);

    // Criar registro de paciente
    db.prepare(`
      INSERT INTO pacientes (id, user_id)
      VALUES (?, ?)
    `).run(randomUUID(), userId);

    res.json({ message: 'Usuário criado com sucesso', userId });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Verificar sessão
router.get('/session', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const db = getDatabase();
    const session = db.prepare(`
      SELECT s.*, u.email, u.nome_completo, u.role, p.*
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);

    if (!session) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada' });
    }

    res.json({
      user: {
        id: session.user_id,
        email: session.email,
        nome_completo: session.nome_completo,
        role: session.role,
      },
      token,
    });
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const db = getDatabase();
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
});

export default router;

