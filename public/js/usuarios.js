import { apiGet, apiPost, toast } from './utils.js';

let usuarioEditandoId = null;

export async function initUsuarios() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <div class="col-md-4">
        <div class="card card-primary card-outline" id="cardFormulario">
          <div class="card-header">
            <h3 class="card-title" id="tituloForm">Novo Usuário</h3>
          </div>
          <div class="card-body">
            <form id="formUsuario">
              <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="nome" name="nome" class="form-control" required>
              </div>
              <div class="form-group">
                <label>E-mail (Login)</label>
                <input type="email" id="email" name="email" class="form-control" required>
              </div>
              <div class="form-group">
                <label>Coordenação</label>
                <input type="text" id="coordenacao" name="coordenacao" class="form-control" placeholder="Ex: CCONT">
              </div>
              <div class="form-group">
                <label>Perfil de Acesso</label>
                <select name="role" id="role" class="form-control">
                  <option value="USER">Usuário Comum</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div class="form-group">
                <label>Senha</label>
                <input type="password" name="senha" class="form-control">
                <small class="form-text text-muted" id="avisoSenha" style="display:none">Deixe vazio para manter.</small>
              </div>
              
              <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-default btn-sm" id="btnCancelar" style="display:none" onclick="resetarFormulario()">Cancelar</button>
                <button type="submit" class="btn btn-success" id="btnSalvar"><i class="fas fa-save"></i> Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="col-md-8">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Usuários Cadastrados</h3></div>
          <div class="card-body p-0 table-responsive">
            <table class="table table-hover" id="tabelaUsuarios">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Coord.</th><th>Role</th><th class="text-center">Ações</th></tr>
              </thead>
              <tbody><tr><td colspan="5" class="text-center">Carregando...</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formUsuario').addEventListener('submit', salvarUsuario);
  window.editarUsuario = prepararEdicao;
  window.deletarUsuario = deletarUsuario;
  window.resetarFormulario = resetarFormulario;
  carregarUsuarios();
}

async function carregarUsuarios() {
  try {
    const lista = await apiGet('/api/usuarios');
    const tbody = document.querySelector('#tabelaUsuarios tbody');
    const usuarioLogado = JSON.parse(localStorage.getItem('agn_usuario') || '{}');

    tbody.innerHTML = lista.map(u => `
      <tr>
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td>${u.coordenacao || '-'}</td>
        <td><span class="badge badge-${u.role === 'ADMIN' ? 'danger' : 'info'}">${u.role}</span></td>
        <td class="text-center">
          <button class="btn btn-xs btn-info mr-1" onclick="editarUsuario('${u.id}', '${u.nome}', '${u.email}', '${u.coordenacao||''}', '${u.role||'USER'}')"><i class="fas fa-pen"></i></button>
          ${u.id !== usuarioLogado.id ? `<button class="btn btn-xs btn-danger" onclick="deletarUsuario(${u.id})"><i class="fas fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) { alert(e.message); }
}

function prepararEdicao(id, nome, email, coordenacao, role) {
  usuarioEditandoId = id;
  document.getElementById('nome').value = nome;
  document.getElementById('email').value = email;
  document.getElementById('coordenacao').value = coordenacao;
  document.getElementById('role').value = role;
  
  document.getElementById('tituloForm').innerText = 'Editar Usuário';
  document.getElementById('cardFormulario').className = 'card card-warning card-outline';
  document.getElementById('btnSalvar').innerHTML = '<i class="fas fa-check"></i> Salvar';
  document.getElementById('btnCancelar').style.display = 'inline-block';
  document.getElementById('avisoSenha').style.display = 'block';
}

function resetarFormulario() {
  usuarioEditandoId = null;
  document.getElementById('formUsuario').reset();
  document.getElementById('tituloForm').innerText = 'Novo Usuário';
  document.getElementById('cardFormulario').className = 'card card-success card-outline';
  document.getElementById('btnSalvar').innerHTML = '<i class="fas fa-save"></i> Cadastrar';
  document.getElementById('btnCancelar').style.display = 'none';
  document.getElementById('avisoSenha').style.display = 'none';
}

async function salvarUsuario(e) {
  e.preventDefault();
  const form = e.target;
  const dados = Object.fromEntries(new FormData(form).entries());
  try {
    const token = localStorage.getItem('agn_token');
    let url = '/api/usuarios';
    let method = 'POST';
    if (usuarioEditandoId) { url = `/api/usuarios/${usuarioEditandoId}`; method = 'PUT'; }

    const resp = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(dados)
    });
    if (!resp.ok) throw new Error((await resp.json()).erro);

    toast(usuarioEditandoId ? 'Atualizado!' : 'Criado!');
    resetarFormulario();
    carregarUsuarios();
  } catch (erro) { alert(erro.message); }
}

async function deletarUsuario(id) {
  if (!confirm('Confirma exclusão?')) return;
  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (!resp.ok) throw new Error((await resp.json()).erro);
    toast('Removido.');
    carregarUsuarios();
  } catch (e) { alert(e.message); }
}
