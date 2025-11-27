import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database.js';

const router = express.Router();

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const db = getDatabase();
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')').get(token);
  if (!session) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
  
  // Buscar role do usuário
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.user_id);
  req.userId = session.user_id;
  req.userRole = user?.role || null;
  next();
}

// Listar psicólogos
router.get('/', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    const psicologos = db.prepare(`
      SELECT 
        ps.id,
        ps.user_id,
        ps.crp,
        ps.especializacao,
        ps.bio,
        ps.valor_consulta,
        ps.ativo,
        prof.nome_completo,
        prof.telefone,
        u.email
      FROM psicologos ps
      JOIN profiles prof ON ps.user_id = prof.user_id
      JOIN users u ON ps.user_id = u.id
      ORDER BY prof.nome_completo
    `).all();

    res.json(psicologos);
  } catch (error) {
    console.error('Erro ao listar psicólogos:', error);
    res.status(500).json({ error: 'Erro ao buscar psicólogos' });
  }
});

// Criar psicólogo (apenas admin)
router.post('/', authenticate, (req, res) => {
  try {
    // Verificar se é admin
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar psicólogos' });
    }

    const {
      nome_completo,
      email,
      password,
      crp,
      especializacao,
      bio,
      valor_consulta,
      telefone,
    } = req.body;

    const db = getDatabase();

    // Verificar se email já existe
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Verificar se CRP já existe
    const existingCrp = db.prepare('SELECT id FROM psicologos WHERE crp = ?').get(crp);
    if (existingCrp) {
      return res.status(400).json({ error: 'CRP já cadastrado' });
    }

    const userId = randomUUID();
    const psicologoId = randomUUID();

    // Criar usuário
    db.prepare(`
      INSERT INTO users (id, email, password, nome_completo, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, password, nome_completo, 'psicologo');

    // Criar perfil
    db.prepare(`
      INSERT INTO profiles (id, user_id, nome_completo, telefone)
      VALUES (?, ?, ?, ?)
    `).run(userId, userId, nome_completo, telefone || null);

    // Criar psicólogo
    db.prepare(`
      INSERT INTO psicologos (id, user_id, crp, especializacao, bio, valor_consulta, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      psicologoId,
      userId,
      crp,
      especializacao || null,
      bio || null,
      valor_consulta || null,
      1
    );

    res.json({
      message: 'Psicólogo cadastrado com sucesso',
      id: psicologoId,
      user_id: userId,
    });
  } catch (error) {
    console.error('Erro ao criar psicólogo:', error);
    res.status(500).json({ error: 'Erro ao cadastrar psicólogo' });
  }
});

// Atualizar psicólogo (apenas admin)
router.put('/:id', authenticate, (req, res) => {
  try {
    // Verificar se é admin
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem editar psicólogos' });
    }

    const { id } = req.params;
    const data = req.body;
    const db = getDatabase();

    const psicologo = db.prepare('SELECT user_id FROM psicologos WHERE id = ?').get(id);
    if (!psicologo) {
      return res.status(404).json({ error: 'Psicólogo não encontrado' });
    }

    // Atualizar email no users se fornecido
    if (data.email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, psicologo.user_id);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
      }
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(data.email, psicologo.user_id);
    }

    // Atualizar perfil
    if (data.nome_completo || data.telefone) {
      db.prepare(`
        UPDATE profiles
        SET nome_completo = COALESCE(?, nome_completo),
            telefone = COALESCE(?, telefone),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        data.nome_completo || null,
        data.telefone || null,
        psicologo.user_id
      );
    }

    // Atualizar senha se fornecido
    if (data.password) {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(data.password, psicologo.user_id);
    }

    // Verificar CRP único se fornecido
    if (data.crp) {
      const existingCrp = db.prepare('SELECT id FROM psicologos WHERE crp = ? AND id != ?').get(data.crp, id);
      if (existingCrp) {
        return res.status(400).json({ error: 'CRP já cadastrado para outro psicólogo' });
      }
    }

    // Atualizar psicólogo
    db.prepare(`
      UPDATE psicologos
      SET crp = COALESCE(?, crp),
          especializacao = COALESCE(?, especializacao),
          bio = COALESCE(?, bio),
          valor_consulta = COALESCE(?, valor_consulta),
          ativo = COALESCE(?, ativo, ativo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      data.crp || null,
      data.especializacao !== undefined ? (data.especializacao || null) : undefined,
      data.bio !== undefined ? (data.bio || null) : undefined,
      data.valor_consulta !== undefined ? (data.valor_consulta || null) : undefined,
      data.ativo !== undefined ? (data.ativo ? 1 : 0) : undefined,
      id
    );

    res.json({ message: 'Psicólogo atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar psicólogo:', error);
    res.status(500).json({ error: 'Erro ao atualizar psicólogo' });
  }
});

export default router;
