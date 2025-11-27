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
  req.userId = session.user_id;
  next();
}

// Buscar role do usuário
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

// Listar agendamentos
router.get('/', getAuthenticatedUser, (req, res) => {
  try {
    const db = getDatabase();
    let query;
    let params;
    
    // Se for psicólogo, mostrar apenas seus agendamentos
    if (req.userRole === 'psicologo' && req.psicologoId) {
      query = `
        SELECT 
          a.*,
          p.user_id as paciente_user_id,
          prof.nome_completo as paciente_nome,
          prof.telefone as paciente_telefone,
          ps_prof.nome_completo as psicologo_nome,
          ps.crp as psicologo_crp
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        WHERE a.psicologo_id = ?
        ORDER BY a.data_hora DESC
      `;
      params = [req.psicologoId];
    } else {
      // Admin ou atendente vê todos
      query = `
        SELECT 
          a.*,
          p.user_id as paciente_user_id,
          prof.nome_completo as paciente_nome,
          prof.telefone as paciente_telefone,
          ps_prof.nome_completo as psicologo_nome,
          ps.crp as psicologo_crp
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        ORDER BY a.data_hora DESC
      `;
      params = [];
    }
    
    const agendamentos = db.prepare(query).all(...params);

    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Criar agendamento (vincula paciente ao psicólogo automaticamente)
router.post('/', authenticate, (req, res) => {
  try {
    const {
      paciente_id,
      psicologo_id,
      data_hora,
      duracao_minutos,
      status,
      observacoes,
      valor,
    } = req.body;

    const db = getDatabase();

    // Validar paciente
    const paciente = db.prepare('SELECT id FROM pacientes WHERE id = ?').get(paciente_id);
    if (!paciente) {
      return res.status(400).json({ error: 'Paciente não encontrado' });
    }

    // Validar psicólogo
    const psicologo = db.prepare('SELECT id FROM psicologos WHERE id = ? AND ativo = 1').get(psicologo_id);
    if (!psicologo) {
      return res.status(400).json({ error: 'Psicólogo não encontrado ou inativo' });
    }

    // Vincular paciente ao psicólogo se ainda não estiver vinculado
    const pacienteAtual = db.prepare('SELECT psicologo_id FROM pacientes WHERE id = ?').get(paciente_id);
    if (!pacienteAtual.psicologo_id) {
      db.prepare('UPDATE pacientes SET psicologo_id = ? WHERE id = ?').run(psicologo_id, paciente_id);
    }

    // Criar agendamento
    const agendamentoId = randomUUID();
    db.prepare(`
      INSERT INTO agendamentos (
        id, psicologo_id, paciente_id, data_hora, duracao_minutos, status, observacoes, valor
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      agendamentoId,
      psicologo_id,
      paciente_id,
      data_hora,
      duracao_minutos || 50,
      status || 'agendado',
      observacoes || null,
      valor || null
    );

    res.json({
      message: 'Agendamento criado com sucesso',
      id: agendamentoId,
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Atualizar status do agendamento
router.put('/:id/status', getAuthenticatedUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const statusValidos = ['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const db = getDatabase();
    
    // Verificar se agendamento existe
    const agendamento = db.prepare('SELECT psicologo_id FROM agendamentos WHERE id = ?').get(id);
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Se for psicólogo, verificar se é o agendamento dele
    // Admin pode atualizar qualquer agendamento
    if (req.userRole === 'psicologo') {
      if (!req.psicologoId) {
        return res.status(403).json({ error: 'Psicólogo não identificado' });
      }
      if (agendamento.psicologo_id !== req.psicologoId) {
        return res.status(403).json({ error: 'Você não tem permissão para alterar este agendamento' });
      }
    }

    // Atualizar status (admin, atendente ou psicólogo do agendamento)
    db.prepare(`
      UPDATE agendamentos
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    // Se o status mudou para 'concluido' e há valor, criar transação automaticamente
    if (status === 'concluido') {
      const agendamento = db.prepare(`
        SELECT psicologo_id, valor FROM agendamentos WHERE id = ?
      `).get(id);
      
      if (agendamento && agendamento.valor) {
        // Verificar se já existe transação para este agendamento
        const existeTransacao = db.prepare(`
          SELECT id FROM transacoes WHERE agendamento_id = ?
        `).get(id);

        if (!existeTransacao) {
          const crypto = await import('crypto');
          const transacaoId = crypto.randomUUID();
          const hoje = new Date().toISOString().split('T')[0];
          
          db.prepare(`
            INSERT INTO transacoes (
              id, agendamento_id, psicologo_id, tipo, descricao, valor, 
              data_transacao, status
            )
            VALUES (?, ?, ?, 'receita', 'Consulta realizada', ?, ?, 'pago')
          `).run(
            transacaoId,
            id,
            agendamento.psicologo_id,
            agendamento.valor,
            hoje
          );
        }
      }
    }

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

export default router;

