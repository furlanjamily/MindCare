import express from 'express';
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
  
  // Buscar role do usuário e se é psicólogo
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.user_id);
  const psicologo = db.prepare('SELECT id FROM psicologos WHERE user_id = ?').get(session.user_id);
  
  req.userId = session.user_id;
  req.userRole = user?.role || null;
  req.psicologoId = psicologo?.id || null;
  next();
}

// Estatísticas do dashboard
router.get('/stats', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    
    let totalPsicologos = 0;
    let totalPacientes = 0;
    let totalAgendamentos = 0;
    let agendamentosHoje = 0;
    
    // Se for psicólogo, mostrar apenas seus pacientes (vinculados ou com agendamento)
    if (req.userRole === 'psicologo' && req.psicologoId) {
      totalPacientes = db.prepare(`
        SELECT COUNT(DISTINCT p.id) as count 
        FROM pacientes p
        LEFT JOIN agendamentos a ON p.id = a.paciente_id
        WHERE p.psicologo_id = ? OR a.psicologo_id = ?
      `).get(req.psicologoId, req.psicologoId).count;
      totalAgendamentos = db.prepare(`
        SELECT COUNT(*) as count 
        FROM agendamentos 
        WHERE psicologo_id = ?
      `).get(req.psicologoId).count;
      
      const hoje = new Date().toISOString().split('T')[0];
      agendamentosHoje = db.prepare(`
        SELECT COUNT(*) as count 
        FROM agendamentos 
        WHERE psicologo_id = ? AND date(data_hora) = ?
      `).get(req.psicologoId, hoje).count;
    } else {
      // Admin ou atendente vê tudo
      totalPsicologos = db.prepare('SELECT COUNT(*) as count FROM psicologos WHERE ativo = 1').get().count;
      totalPacientes = db.prepare('SELECT COUNT(*) as count FROM pacientes').get().count;
      totalAgendamentos = db.prepare('SELECT COUNT(*) as count FROM agendamentos').get().count;
      
      const hoje = new Date().toISOString().split('T')[0];
      agendamentosHoje = db.prepare(`
        SELECT COUNT(*) as count 
        FROM agendamentos 
        WHERE date(data_hora) = ?
      `).get(hoje).count;
    }

    // Calcular mudanças (simulado - em produção, calcular com base em períodos anteriores)
    const psicologosEsteMes = totalPsicologos; // Simplificado
    const pacientesEstaSemana = totalPacientes; // Simplificado

    res.json({
      totalPsicologos,
      totalPacientes,
      totalAgendamentos,
      agendamentosHoje,
      psicologosEsteMes,
      pacientesEstaSemana,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Listar pacientes do psicólogo (para dashboard)
router.get('/meus-pacientes', authenticate, (req, res) => {
  try {
    if (req.userRole !== 'psicologo' || !req.psicologoId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const db = getDatabase();
    const pacientes = db.prepare(`
      SELECT DISTINCT
        p.id,
        p.user_id,
        prof.nome_completo,
        prof.cpf,
        prof.telefone,
        p.convenio,
        p.created_at
      FROM pacientes p
      JOIN profiles prof ON p.user_id = prof.user_id
      LEFT JOIN agendamentos a ON p.id = a.paciente_id
      WHERE p.psicologo_id = ? OR a.psicologo_id = ?
      ORDER BY p.created_at DESC
      LIMIT 10
    `).all(req.psicologoId, req.psicologoId);

    res.json(pacientes);
  } catch (error) {
    console.error('Erro ao buscar pacientes do psicólogo:', error);
    res.status(500).json({ error: 'Erro ao buscar pacientes' });
  }
});

// Agendamentos de hoje (para psicólogo fazer atendimento)
router.get('/agendamentos-hoje', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    
    // Garantir que req.psicologoId e req.userRole estejam disponíveis
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
    const psicologo = db.prepare('SELECT id FROM psicologos WHERE user_id = ?').get(req.userId);
    const userRole = user?.role || null;
    const psicologoId = psicologo?.id || null;
    
    const hoje = new Date().toISOString().split('T')[0];
    let query;
    let params;
    
    // Se for psicólogo, mostrar apenas seus agendamentos de hoje
    if (userRole === 'psicologo' && psicologoId) {
      query = `
        SELECT 
          a.id,
          a.data_hora,
          a.status,
          a.duracao_minutos,
          prof.nome_completo as paciente_nome,
          ps_prof.nome_completo as psicologo_nome
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        WHERE a.psicologo_id = ? AND date(a.data_hora) = ?
        ORDER BY a.data_hora ASC
      `;
      params = [psicologoId, hoje];
    } else {
      // Admin ou atendente vê todos de hoje
      query = `
        SELECT 
          a.id,
          a.data_hora,
          a.status,
          a.duracao_minutos,
          prof.nome_completo as paciente_nome,
          ps_prof.nome_completo as psicologo_nome
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        WHERE date(a.data_hora) = ?
        ORDER BY a.data_hora ASC
      `;
      params = [hoje];
    }
    
    const agendamentos = db.prepare(query).all(...params);

    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos de hoje:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Próximos agendamentos (futuros, ordenados por data)
router.get('/proximos-agendamentos', authenticate, (req, res) => {
  try {
    const db = getDatabase();
    
    // Garantir que req.psicologoId e req.userRole estejam disponíveis
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId);
    const psicologo = db.prepare('SELECT id FROM psicologos WHERE user_id = ?').get(req.userId);
    const userRole = user?.role || null;
    const psicologoId = psicologo?.id || null;
    let query;
    let params;
    
    const agora = new Date().toISOString();
    
    // Se for psicólogo, mostrar apenas seus agendamentos
    if (userRole === 'psicologo' && psicologoId) {
      query = `
        SELECT 
          a.id,
          a.data_hora,
          a.status,
          a.duracao_minutos,
          prof.nome_completo as paciente_nome,
          ps_prof.nome_completo as psicologo_nome
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        WHERE a.psicologo_id = ? AND a.data_hora >= ?
        ORDER BY a.data_hora ASC
        LIMIT 10
      `;
      params = [psicologoId, agora];
    } else {
      // Admin ou atendente vê todos
      query = `
        SELECT 
          a.id,
          a.data_hora,
          a.status,
          a.duracao_minutos,
          prof.nome_completo as paciente_nome,
          ps_prof.nome_completo as psicologo_nome
        FROM agendamentos a
        LEFT JOIN pacientes p ON a.paciente_id = p.id
        LEFT JOIN profiles prof ON p.user_id = prof.user_id
        LEFT JOIN psicologos ps ON a.psicologo_id = ps.id
        LEFT JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
        WHERE a.data_hora >= ?
        ORDER BY a.data_hora ASC
        LIMIT 10
      `;
      params = [agora];
    }
    
    const agendamentos = db.prepare(query).all(...params);

    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar próximos agendamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Desempenho dos profissionais
router.get('/desempenho-profissionais', authenticate, (req, res) => {
  try {
    // Apenas admin e atendente podem ver desempenho
    if (req.userRole === 'psicologo') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores e atendentes podem acessar dados de desempenho.' });
    }

    const db = getDatabase();

    // Estatísticas detalhadas por psicólogo
    const desempenho = db.prepare(`
      SELECT 
        ps.id,
        ps_prof.nome_completo as psicologo_nome,
        ps.crp,
        COUNT(DISTINCT p.id) as total_pacientes,
        COUNT(DISTINCT a.id) as total_agendamentos,
        COUNT(DISTINCT CASE WHEN a.status = 'concluido' THEN a.id END) as agendamentos_concluidos,
        COUNT(DISTINCT CASE WHEN a.status = 'cancelado' THEN a.id END) as agendamentos_cancelados,
        COUNT(DISTINCT pr.id) as total_prontuarios,
        SUM(CASE WHEN a.status = 'concluido' AND a.valor IS NOT NULL THEN a.valor ELSE 0 END) as receita_total,
        AVG(CASE WHEN a.status = 'concluido' AND a.duracao_minutos IS NOT NULL THEN a.duracao_minutos END) as duracao_media
      FROM psicologos ps
      JOIN profiles ps_prof ON ps.user_id = ps_prof.user_id
      LEFT JOIN pacientes p ON p.psicologo_id = ps.id
      LEFT JOIN agendamentos a ON a.psicologo_id = ps.id
      LEFT JOIN prontuarios pr ON pr.psicologo_id = ps.id
      WHERE ps.ativo = 1
      GROUP BY ps.id, ps_prof.nome_completo, ps.crp
      ORDER BY total_agendamentos DESC
    `).all();

    // Calcular taxa de conclusão e outras métricas
    const desempenhoCompleto = desempenho.map(d => ({
      ...d,
      taxa_conclusao: d.total_agendamentos > 0 
        ? ((d.agendamentos_concluidos / d.total_agendamentos) * 100).toFixed(2)
        : 0,
      taxa_cancelamento: d.total_agendamentos > 0
        ? ((d.agendamentos_cancelados / d.total_agendamentos) * 100).toFixed(2)
        : 0,
    }));

    res.json(desempenhoCompleto);
  } catch (error) {
    console.error('Erro ao buscar desempenho:', error);
    res.status(500).json({ error: 'Erro ao buscar desempenho' });
  }
});

export default router;

