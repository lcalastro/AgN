import { apiPost, toast } from './utils.js';

export async function initPerfil() {
  const content = document.getElementById('content');
  
  // Pega dados atuais do cache local
  const usuario = JSON.parse(localStorage.getItem('agn_usuario') || '{}');

  content.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-6">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-user-cog mr-2"></i>Meu Perfil</h3>
          </div>
          <form id="formPerfil">
            <div class="card-body">
              <div class="form-group">
                <label>E-mail (Login)</label>
                <input type="text" class="form-control" value="${usuario.email}" disabled>
                <small class="text-muted">O e-mail não pode ser alterado.</small>
              </div>

              <div class="form-group">
                <label>Nome Completo</label>
                <input type="text" name="nome" class="form-control" value="${usuario.nome || ''}" required>
              </div>

              <div class="form-group">
                <label>Coordenação Padrão</label>
                <input type="text" name="coordenacao" class="form-control" value="${usuario.coordenacao || ''}" placeholder="Ex: CCONT">
                <small class="text-muted">Será preenchido automaticamente nos formulários.</small>
              </div>

              <hr>

              <div class="form-group">
                <label>Nova Senha</label>
                <input type="password" name="senha" class="form-control" placeholder="******">
                <small class="text-muted">Deixe em branco para manter a senha atual.</small>
              </div>
            </div>

            <div class="card-footer text-right">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formPerfil').addEventListener('submit', salvarPerfil);
}

async function salvarPerfil(e) {
  e.preventDefault();
  const form = e.target;
  const dados = Object.fromEntries(new FormData(form).entries());
  
  // PUT na rota nova
  // Como nosso utils.js só tem apiPost (POST) e apiGet (GET), vamos fazer fetch manual aqui ou criar apiPut.
  // Para simplificar, uso fetch direto com token.
  
  const btn = form.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch('/api/perfil', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dados)
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.erro || 'Erro ao salvar.');

    // Atualiza dados locais e interface
    localStorage.setItem('agn_usuario', JSON.stringify(json.usuario));
    toast('Perfil atualizado com sucesso!');
    
    // Atualiza nome no header
    const nomeHeader = document.getElementById('nomeUsuarioHeader');
    if (nomeHeader) nomeHeader.innerHTML = `<i class="far fa-user mr-2"></i> ${json.usuario.nome}`;

    form.querySelector('[name="senha"]').value = ''; // limpa senha

  } catch (erro) {
    alert(erro.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
  }
}
