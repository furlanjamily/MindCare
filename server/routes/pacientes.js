import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database.js';

const router = express.Router();

// Middleware para verificar autenticação
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

  req.userId = session.user_id;
  next();
}

// Buscar role do usuário para o middleware
function getAuthenticatedUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const db = getDatabase();
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')').get(token);
  if (!session) {
    return res.status(401).json({ error: 'Sessão inválida' });
  }
  
  // Buscar role do usuário e se é psicólogo
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.user_id);
  const psicologo = db.prepare('SELECT id FROM psicologos WHERE user_id = ?').get(session.user_id);
  
  req.userId = session.user_id;
  req.userRole = user?.role || null;
  req.psicologoId = psicologo?.id || null;
  next();
}

// Listar pacientes (filtrado por psicólogo se for psicólogo)
router.get('/', getAuthenticatedUser, (req, res) => {
  try {
    const db = getDatabase();
    let query;
    let params;
    
    // Se for psicólogo, mostrar apenas seus pacientes (vinculados ou com agendamento)
    if (req.userRole === 'psicologo' && req.psicologoId) {
      query = `
        SELECT DISTINCT
          p.id,
          p.user_id,
          p.psicologo_id,
          p.endereco,
          p.contato_emergencia,
          p.convenio,
          p.observacoes,
          p.medicacao,
          p.created_at,
          prof.nome_completo,
          prof.cpf,
          prof.telefone,
          prof.data_nascimento,
          u.email,
          ps.crp as psicologo_crp,
          ps_prof.nome_completo as psicologo_nome
        FROM pacientes p
        JOIN profiles prof ON p.user_id = prof.user_id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN psicologos ps ON p.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        LEFT JOIN agendamentos a ON p.id = a.paciente_id
        WHERE p.psicologo_id = ? OR a.psicologo_id = ?
        ORDER BY p.created_at DESC
      `;
      params = [req.psicologoId, req.psicologoId];
    } else {
      // Admin ou atendente vê todos os pacientes
      query = `
        SELECT 
          p.id,
          p.user_id,
          p.psicologo_id,
          p.endereco,
          p.contato_emergencia,
          p.convenio,
          p.observacoes,
          p.medicacao,
          p.created_at,
          prof.nome_completo,
          prof.cpf,
          prof.telefone,
          prof.data_nascimento,
          u.email,
          ps.crp as psicologo_crp,
          ps_prof.nome_completo as psicologo_nome
        FROM pacientes p
        JOIN profiles prof ON p.user_id = prof.user_id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN psicologos ps ON p.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        ORDER BY p.created_at DESC
      `;
      params = [];
    }
    
    const pacientes = db.prepare(query).all(...params);

    const formatted = pacientes.map(p => ({
      id: p.id,
      user_id: p.user_id,
      psicologo_id: p.psicologo_id,
      endereco: p.endereco,
      contato_emergencia: p.contato_emergencia,
      convenio: p.convenio,
      observacoes: p.observacoes,
      medicacao: p.medicacao,
      email: p.email,
      created_at: p.created_at,
      profiles: {
        nome_completo: p.nome_completo,
        cpf: p.cpf,
        telefone: p.telefone,
        data_nascimento: p.data_nascimento,
      },
      psicologo: p.psicologo_crp ? {
        crp: p.psicologo_crp,
        nome: p.psicologo_nome,
      } : null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Erro ao listar pacientes:', error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// Criar paciente
router.post('/', authenticate, (req, res) => {
  try {
    const {
      nome_completo,
      email,
      cpf,
      telefone,
      data_nascimento,
      endereco,
      convenio,
      contato_emergencia,
      observacoes,
      medicacao,
      psicologo_id,
    } = req.body;

    const db = getDatabase();
    
    // Verificar se psicologo_id é válido (se fornecido)
    if (psicologo_id) {
      const psicologo = db.prepare('SELECT id FROM psicologos WHERE id = ? AND ativo = 1').get(psicologo_id);
      if (!psicologo) {
        return res.status(400).json({ error: 'Psicólogo não encontrado ou inativo' });
      }
    }

    // Verificar se email já existe
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const userId = randomUUID();
    const pacienteId = randomUUID();
    const password = randomUUID(); // Senha aleatória

    // Criar usuário
    db.prepare(`
      INSERT INTO users (id, email, password, nome_completo, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, email, password, nome_completo, 'paciente');

    // Criar perfil
    db.prepare(`
      INSERT INTO profiles (id, user_id, nome_completo, cpf, telefone, data_nascimento)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, userId, nome_completo, cpf || null, telefone || null, data_nascimento || null);

    // Criar paciente
    db.prepare(`
      INSERT INTO pacientes (id, user_id, endereco, convenio, contato_emergencia, observacoes, medicacao)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      pacienteId,
      userId,
      endereco || null,
      convenio || null,
      contato_emergencia || null,
      observacoes || null,
      medicacao || null
    );

    res.json({
      message: 'Paciente cadastrado com sucesso',
      id: pacienteId,
      user_id: userId,
    });
  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    res.status(500).json({ error: 'Erro ao cadastrar paciente' });
  }
});

// Atualizar paciente (apenas admin)
router.put('/:id', authenticate, (req, res) => {
  // Verificar se é admin
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem editar pacientes' });
  }

  try {
    const { id } = req.params;
    const data = req.body;
    const db = getDatabase();

    const paciente = db.prepare('SELECT user_id FROM pacientes WHERE id = ?').get(id);
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Atualizar email no users se fornecido
    if (data.email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, paciente.user_id);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email já cadastrado para outro usuário' });
      }
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(data.email, paciente.user_id);
    }

    // Atualizar perfil
    if (data.nome_completo || data.cpf || data.telefone || data.data_nascimento) {
      db.prepare(`
        UPDATE profiles
        SET nome_completo = COALESCE(?, nome_completo),
            cpf = COALESCE(?, cpf),
            telefone = COALESCE(?, telefone),
            data_nascimento = COALESCE(?, data_nascimento),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        data.nome_completo || null,
        data.cpf || null,
        data.telefone || null,
        data.data_nascimento || null,
        paciente.user_id
      );
    }

      // Verificar psicologo_id se fornecido
      if (data.psicologo_id !== undefined) {
        if (data.psicologo_id) {
          const psicologo = db.prepare('SELECT id FROM psicologos WHERE id = ? AND ativo = 1').get(data.psicologo_id);
          if (!psicologo) {
            return res.status(400).json({ error: 'Psicólogo não encontrado ou inativo' });
          }
        }
      }

      // Atualizar paciente
      db.prepare(`
        UPDATE pacientes
        SET endereco = COALESCE(?, endereco),
            convenio = COALESCE(?, convenio),
            contato_emergencia = COALESCE(?, contato_emergencia),
            observacoes = COALESCE(?, observacoes),
            medicacao = COALESCE(?, medicacao),
            psicologo_id = COALESCE(?, psicologo_id),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        data.endereco || null,
        data.convenio || null,
        data.contato_emergencia || null,
        data.observacoes || null,
        data.medicacao || null,
        data.psicologo_id !== undefined ? (data.psicologo_id || null) : undefined,
        id
      );

    res.json({ message: 'Paciente atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// Deletar paciente
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const paciente = db.prepare('SELECT user_id FROM pacientes WHERE id = ?').get(id);
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Deletar usuário (cascata vai deletar perfil e paciente)
    db.prepare('DELETE FROM users WHERE id = ?').run(paciente.user_id);

    res.json({ message: 'Paciente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar paciente:', error);
    res.status(500).json({ error: 'Erro ao deletar paciente' });
  }
});

export default router;

