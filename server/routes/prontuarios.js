import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../database.js';

const router = express.Router();

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
  
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.user_id);
  const psicologo = db.prepare('SELECT id FROM psicologos WHERE user_id = ?').get(session.user_id);
  
  req.userId = session.user_id;
  req.userRole = user?.role || null;
  req.psicologoId = psicologo?.id || null;
  next();
}

// Listar prontuários de um paciente
router.get('/paciente/:pacienteId', getAuthenticatedUser, (req, res) => {
  try {
    const { pacienteId } = req.params;
    const db = getDatabase();

    // Verificar permissão: psicólogo só vê prontuários de seus pacientes
    let query;
    let params;

    if (req.userRole === 'psicologo' && req.psicologoId) {
      query = `
        SELECT 
          p.*,
          ps_prof.nome_completo as psicologo_nome,
          prof_created.nome_completo as created_by_nome
        FROM prontuarios p
        LEFT JOIN psicologos ps ON p.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        LEFT JOIN users u_created ON p.created_by = u_created.id
        LEFT JOIN profiles prof_created ON u_created.id = prof_created.user_id
        WHERE p.paciente_id = ? AND p.psicologo_id = ?
        ORDER BY p.data_sessao DESC, p.created_at DESC
      `;
      params = [pacienteId, req.psicologoId];
    } else {
      // Admin ou atendente vê todos
      query = `
        SELECT 
          p.*,
          ps_prof.nome_completo as psicologo_nome,
          prof_created.nome_completo as created_by_nome
        FROM prontuarios p
        LEFT JOIN psicologos ps ON p.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        LEFT JOIN users u_created ON p.created_by = u_created.id
        LEFT JOIN profiles prof_created ON u_created.id = prof_created.user_id
        WHERE p.paciente_id = ?
        ORDER BY p.data_sessao DESC, p.created_at DESC
      `;
      params = [pacienteId];
    }

    const prontuarios = db.prepare(query).all(...params);
    res.json(prontuarios);
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error);
    res.status(500).json({ error: 'Erro ao buscar prontuários' });
  }
});

// Criar prontuário
router.post('/', getAuthenticatedUser, (req, res) => {
  try {
    const {
      paciente_id,
      psicologo_id,
      agendamento_id,
      data_sessao,
      tipo,
      anotacoes,
      evolucao,
      conduta,
      proxima_sessao,
    } = req.body;

    const db = getDatabase();

    // Verificar se paciente existe
    const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ?').get(paciente_id);
    if (!paciente) {
      return res.status(400).json({ error: 'Paciente não encontrado' });
    }

    // Verificar se psicólogo existe
    const psicologo = db.prepare('SELECT id FROM psicologos WHERE id = ? AND ativo = 1').get(psicologo_id);
    if (!psicologo) {
      return res.status(400).json({ error: 'Psicólogo não encontrado ou inativo' });
    }

    // Se for psicólogo, verificar se está criando prontuário para si mesmo
    if (req.userRole === 'psicologo' && req.psicologoId !== psicologo_id) {
      return res.status(403).json({ error: 'Você só pode criar prontuários para seus próprios pacientes' });
    }

    const prontuarioId = randomUUID();
    db.prepare(`
      INSERT INTO prontuarios (
        id, paciente_id, psicologo_id, agendamento_id, data_sessao, tipo, 
        anotacoes, evolucao, conduta, proxima_sessao, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prontuarioId,
      paciente_id,
      psicologo_id,
      agendamento_id || null,
      data_sessao,
      tipo || 'sessao',
      anotacoes || null,
      evolucao || null,
      conduta || null,
      proxima_sessao || null,
      req.userId
    );

    res.json({
      message: 'Prontuário criado com sucesso',
      id: prontuarioId,
    });
  } catch (error) {
    console.error('Erro ao criar prontuário:', error);
    res.status(500).json({ error: 'Erro ao criar prontuário' });
  }
});

// Atualizar prontuário
router.put('/:id', getAuthenticatedUser, (req, res) => {
  try {
    const { id } = req.params;
    const { anotacoes, evolucao, conduta, proxima_sessao } = req.body;

    const db = getDatabase();

    const prontuario = db.prepare('SELECT psicologo_id, created_by FROM prontuarios WHERE id = ?').get(id);
    if (!prontuario) {
      return res.status(404).json({ error: 'Prontuário não encontrado' });
    }

    // Verificar permissão: só quem criou ou psicólogo do prontuário pode editar
    if (req.userRole === 'psicologo') {
      if (req.psicologoId !== prontuario.psicologo_id && req.userId !== prontuario.created_by) {
        return res.status(403).json({ error: 'Sem permissão para editar este prontuário' });
      }
    }

    db.prepare(`
      UPDATE prontuarios
      SET anotacoes = COALESCE(?, anotacoes),
          evolucao = COALESCE(?, evolucao),
          conduta = COALESCE(?, conduta),
          proxima_sessao = COALESCE(?, proxima_sessao),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(anotacoes || null, evolucao || null, conduta || null, proxima_sessao || null, id);

    res.json({ message: 'Prontuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar prontuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

export default router;

