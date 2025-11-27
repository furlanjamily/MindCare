// Cliente API para comunicação com o backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async register(email: string, password: string, nome_completo: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, nome_completo }),
    });
  }

  async getSession() {
    try {
      const data = await this.request('/auth/session');
      return data;
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return null;
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  // Pacientes
  async getPacientes() {
    return this.request('/pacientes');
  }

  async createPaciente(data: any) {
    return this.request('/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaciente(id: string, data: any) {
    return this.request(`/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaciente(id: string) {
    return this.request(`/pacientes/${id}`, {
      method: 'DELETE',
    });
  }

  // Psicólogos
  async getPsicologos() {
    return this.request('/psicologos');
  }

  async createPsicologo(data: any) {
    return this.request('/psicologos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePsicologo(id: string, data: any) {
    return this.request(`/psicologos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Agendamentos
  async getAgendamentos() {
    return this.request('/agendamentos');
  }

  async createAgendamento(data: any) {
    return this.request('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAgendamentoStatus(id: string, status: string) {
    return this.request(`/agendamentos/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getMeusPacientes() {
    return this.request('/dashboard/meus-pacientes');
  }

  async getProximosAgendamentos() {
    return this.request('/dashboard/proximos-agendamentos');
  }

  async getAgendamentosHoje() {
    return this.request('/dashboard/agendamentos-hoje');
  }

  // Prontuários
  async getProntuariosPaciente(pacienteId: string) {
    return this.request(`/prontuarios/paciente/${pacienteId}`);
  }

  async createProntuario(data: any) {
    return this.request('/prontuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProntuario(id: string, data: any) {
    return this.request(`/prontuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Financeiro
  async getRelatorioFinanceiro(params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/financeiro/relatorio${queryParams ? '?' + queryParams : ''}`);
  }

  async getTransacoes(params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/financeiro/transacoes${queryParams ? '?' + queryParams : ''}`);
  }

  async createTransacao(data: any) {
    return this.request('/financeiro/transacoes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Desempenho
  async getDesempenhoProfissionais() {
    return this.request('/dashboard/desempenho-profissionais');
  }
}

export const api = new ApiClient();

