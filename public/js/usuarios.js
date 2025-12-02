import { apiGet, apiPost, toast } from './utils.js';

export async function initUsuarios() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <!-- Formulário de Cadastro -->
      <div class="col-md-4">
        <div class="card card-success card-outline">
          <div class="card-header">
            <h3 class="card-title">Novo Usuário</h3>
          </div>
          <div class="card-body">
            <form id="formUsuario">
              <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" class="form-control" required placeholder="Ex: João Silva">
              </div>
              <div class="form-group">
                <label>E-mail (Login)</label>
                <input type="email" name="email" class="form-control" required placeholder="joao@agsus.gov.br">
              </div>
              <div class="form-group">
                <label>Senha</label>
                <input type="password" name="senha" class="form-control" required placeholder="******">
              </div>
              <button type="submit" class="btn btn-success btn-block">
                <i class="fas fa-save"></i> Cadastrar
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Lista de Usuários -->
      <div class="col-md-8">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Usuários Cadastrados</h3>
          </div>
          <div class="card-body p-0 table-responsive">
            <table class="table table-hover" id="tabelaUsuarios">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th style="width: 50px">Ação</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="4" class="text-center">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formUsuario').addEventListener('submit', criarUsuario);
  carregarUsuarios();
}

async function carregarUsuarios() {
  try {
    const lista = await apiGet('/api/usuarios');
    const tbody = document.querySelector('#tabelaUsuarios tbody');
    
    // Pega o ID do usuário logado para não deixar excluir a si mesmo
    const usuarioLogado = JSON.parse(localStorage.getItem('agn_usuario') || '{}');

    tbody.innerHTML = lista.map(u => `
      <tr>
        <td>${u.id}</td>
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td>
          ${u.id !== usuarioLogado.id 
            ? `<button class="btn btn-xs btn-danger" onclick="deletarUsuario(${u.id})"><i class="fas fa-trash"></i></button>` 
            : '<span class="text-muted"><small>(você)</small></span>'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    alert('Erro ao carregar usuários: ' + e.message);
  }
}

async function criarUsuario(e) {
  e.preventDefault();
  const form = e.target;
  const dados = Object.fromEntries(new FormData(form).entries());
  
  try {
    await apiPost('/api/usuarios', dados);
    toast('Usuário criado com sucesso!');
    form.reset();
    carregarUsuarios();
  } catch (erro) {
    alert('Erro: ' + erro.message);
  }
}

// Global para o botão onclick funcionar
window.deletarUsuario = async (id) => {
  if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
  
  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch(`/api/usuarios/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!resp.ok) {
      const json = await resp.json();
      throw new Error(json.erro || 'Erro ao excluir');
    }

    toast('Usuário removido.');
    carregarUsuarios();
  } catch (erro) {
    alert(erro.message);
  }
};
