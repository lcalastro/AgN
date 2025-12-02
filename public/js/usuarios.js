import { apiGet, apiPost, toast } from './utils.js';

let usuarioEditandoId = null; // Variável para controlar se é edição

export async function initUsuarios() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <!-- Formulário de Cadastro/Edição -->
      <div class="col-md-4">
        <div class="card card-primary card-outline" id="cardFormulario">
          <div class="card-header">
            <h3 class="card-title" id="tituloForm">Novo Usuário</h3>
          </div>
          <div class="card-body">
            <form id="formUsuario">
              <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" id="nome" name="nome" class="form-control" required placeholder="Ex: João Silva">
              </div>
              <div class="form-group">
                <label>E-mail (Login)</label>
                <input type="email" id="email" name="email" class="form-control" required placeholder="joao@agsus.gov.br">
              </div>
              <div class="form-group">
                <label>Senha</label>
                <input type="password" name="senha" class="form-control" placeholder="******">
                <small class="form-text text-muted" id="avisoSenha" style="display:none">Deixe em branco para manter a atual.</small>
              </div>
              
              <div class="d-flex justify-content-between">
                <button type="button" class="btn btn-default btn-sm" id="btnCancelar" style="display:none" onclick="resetarFormulario()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" id="btnSalvar">
                  <i class="fas fa-save"></i> Cadastrar
                </button>
              </div>
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
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th style="width: 100px" class="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="3" class="text-center">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formUsuario').addEventListener('submit', salvarUsuario);
  
  // Expõe funções globais para os botões da tabela
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
        <td class="text-center">
          <button class="btn btn-xs btn-info mr-1" onclick="editarUsuario('${u.id}', '${u.nome}', '${u.email}')" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          
          ${u.id !== usuarioLogado.id 
            ? `<button class="btn btn-xs btn-danger" onclick="deletarUsuario(${u.id})" title="Excluir"><i class="fas fa-trash"></i></button>` 
            : ''}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    alert('Erro ao carregar usuários: ' + e.message);
  }
}

// Prepara o formulário para Modo Edição
function prepararEdicao(id, nome, email) {
  usuarioEditandoId = id;
  
  // Preenche campos
  document.getElementById('nome').value = nome;
  document.getElementById('email').value = email;
  
  // Ajusta visual
  document.getElementById('tituloForm').innerText = 'Editar Usuário';
  document.getElementById('cardFormulario').classList.remove('card-success');
  document.getElementById('cardFormulario').classList.add('card-warning');
  
  document.getElementById('btnSalvar').innerHTML = '<i class="fas fa-check"></i> Salvar Alterações';
  document.getElementById('btnCancelar').style.display = 'inline-block';
  document.getElementById('avisoSenha').style.display = 'block';
}

function resetarFormulario() {
  usuarioEditandoId = null;
  document.getElementById('formUsuario').reset();
  
  // Reseta visual
  document.getElementById('tituloForm').innerText = 'Novo Usuário';
  document.getElementById('cardFormulario').classList.remove('card-warning');
  document.getElementById('cardFormulario').classList.add('card-success');
  
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

    // Se estiver editando, muda para PUT e adiciona ID na URL
    if (usuarioEditandoId) {
      url = `/api/usuarios/${usuarioEditandoId}`;
      method = 'PUT';
    }

    const resp = await fetch(url, {
      method: method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(dados)
    });

    if (!resp.ok) {
      const json = await resp.json();
      throw new Error(json.erro || 'Erro ao salvar');
    }

    toast(usuarioEditandoId ? 'Usuário atualizado!' : 'Usuário criado!');
    resetarFormulario();
    carregarUsuarios();
  } catch (erro) {
    alert('Erro: ' + erro.message);
  }
}

async function deletarUsuario(id) {
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
}
