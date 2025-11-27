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
  
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.user_id);
  req.userId = session.user_id;
  req.userRole = user?.role || null;
  next();
}

// Relatório financeiro geral
router.get('/relatorio', authenticate, (req, res) => {
  try {
    // Apenas admin e atendente podem ver relatórios financeiros
    if (req.userRole === 'psicologo') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores e atendentes podem acessar relatórios financeiros.' });
    }

    const { data_inicio, data_fim, psicologo_id } = req.query;
    const db = getDatabase();

    let whereClause = '1=1';
    const params = [];

    if (data_inicio) {
      whereClause += ' AND date(t.data_transacao) >= ?';
      params.push(data_inicio);
    }
    if (data_fim) {
      whereClause += ' AND date(t.data_transacao) <= ?';
      params.push(data_fim);
    }
    if (psicologo_id) {
      whereClause += ' AND t.psicologo_id = ?';
      params.push(psicologo_id);
    }

    // Receitas
    const receitas = db.prepare(`
      SELECT 
        SUM(valor) as total,
        COUNT(*) as quantidade
      FROM transacoes t
      WHERE tipo = 'receita' AND status = 'pago' AND ${whereClause}
    `).get(...params) || { total: 0, quantidade: 0 };

    // Despesas
    const despesas = db.prepare(`
      SELECT 
        SUM(valor) as total,
        COUNT(*) as quantidade
      FROM transacoes t
      WHERE tipo = 'despesa' AND status = 'pago' AND ${whereClause}
    `).get(...params) || { total: 0, quantidade: 0 };

    // Detalhamento por psicólogo
    const porPsicologo = db.prepare(`
      SELECT 
        ps.id,
        ps_prof.nome_completo as psicologo_nome,
        SUM(CASE WHEN t.tipo = 'receita' AND t.status = 'pago' THEN t.valor ELSE 0 END) as receita_total,
        SUM(CASE WHEN t.tipo = 'despesa' AND t.status = 'pago' THEN t.valor ELSE 0 END) as despesa_total,
        COUNT(DISTINCT CASE WHEN t.tipo = 'receita' AND t.status = 'pago' THEN t.id END) as qtd_receitas,
        COUNT(DISTINCT CASE WHEN t.tipo = 'despesa' AND t.status = 'pago' THEN t.id END) as qtd_despesas
      FROM transacoes t
      JOIN psicologos ps ON t.psicologo_id = ps.id
      JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
      WHERE ${whereClause}
      GROUP BY ps.id, ps_prof.nome_completo
    `).all(...params);

    res.json({
      receitas: {
        total: receitas.total || 0,
        quantidade: receitas.quantidade || 0,
      },
      despesas: {
        total: despesas.total || 0,
        quantidade: despesas.quantidade || 0,
      },
      saldo: (receitas.total || 0) - (despesas.total || 0),
      porPsicologo,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Listar transações
router.get('/transacoes', authenticate, (req, res) => {
  try {
    // Apenas admin e atendente podem ver transações
    if (req.userRole === 'psicologo') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores e atendentes podem acessar transações.' });
    }

    const { data_inicio, data_fim, tipo, psicologo_id } = req.query;
    const db = getDatabase();

    let whereClause = '1=1';
    const params = [];

    if (data_inicio) {
      whereClause += ' AND date(t.data_transacao) >= ?';
      params.push(data_inicio);
    }
    if (data_fim) {
      whereClause += ' AND date(t.data_transacao) <= ?';
      params.push(data_fim);
    }
    if (tipo) {
      whereClause += ' AND t.tipo = ?';
      params.push(tipo);
    }
    if (psicologo_id) {
      whereClause += ' AND t.psicologo_id = ?';
      params.push(psicologo_id);
    }

    const transacoes = db.prepare(`
      SELECT 
        t.*,
        ps_prof.nome_completo as psicologo_nome,
        a.data_hora as agendamento_data
      FROM transacoes t
      LEFT JOIN psicologos ps ON t.psicologo_id = ps.id
      LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
      LEFT JOIN agendamentos a ON t.agendamento_id = a.id
      WHERE ${whereClause}
      ORDER BY t.data_transacao DESC, t.created_at DESC
    `).all(...params);

    res.json(transacoes);
  } catch (error) {
    console.error('Erro ao listar transações:', error);
    res.status(500).json({ error: 'Erro ao listar transações' });
  }
});

// Criar transação (geralmente criada automaticamente ao finalizar agendamento)
router.post('/transacoes', authenticate, (req, res) => {
  try {
    // Apenas admin pode criar transações manualmente
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar transações' });
    }

    const {
      agendamento_id,
      psicologo_id,
      tipo,
      descricao,
      valor,
      data_transacao,
      status,
      observacoes,
    } = req.body;

    const db = getDatabase();

    // Validar psicólogo
    const psicologo = db.prepare('SELECT id FROM psicologos WHERE id = ?').get(psicologo_id);
    if (!psicologo) {
      return res.status(400).json({ error: 'Psicólogo não encontrado' });
    }

    const transacaoId = randomUUID();
    db.prepare(`
      INSERT INTO transacoes (
        id, agendamento_id, psicologo_id, tipo, descricao, valor, 
        data_transacao, status, observacoes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      transacaoId,
      agendamento_id || null,
      psicologo_id,
      tipo || 'receita',
      descricao || null,
      valor,
      data_transacao || new Date().toISOString().split('T')[0],
      status || 'pendente',
      observacoes || null
    );

    res.json({
      message: 'Transação criada com sucesso',
      id: transacaoId,
    });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

export default router;

