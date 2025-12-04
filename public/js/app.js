import { mostrarLogin } from './login.js';
import { initGerar } from './gerar.js';
import { initConsultar } from './consultar.js';
import { initUsuarios } from './usuarios.js';
import { initPerfil } from './perfil.js';
import { initAdmin } from './admin.js';

function getToken() { return localStorage.getItem('agn_token'); }
function getUsuario() { return JSON.parse(localStorage.getItem('agn_usuario') || '{}'); }

document.addEventListener('DOMContentLoaded', async () => {
  if (!getToken()) { await mostrarLogin(); return; }
  await montarShell(getUsuario());
  await mostrarView('gerar');
});

async function montarShell(usuario) {
  document.getElementById('app').innerHTML = `
    <nav class="main-header navbar navbar-expand navbar-white navbar-light">
      <a href="#" class="navbar-brand ml-3 mr-3" onclick="mostrarView('gerar')">
        <img src="/img/Logo-AgN-com-Texto.png" alt="AgN" style="height: 30px; width: auto; margin-right: 10px;">
        <span class="font-weight-bold" style="color: #0056b3;">AgN</span>
      </a>
      <ul class="navbar-nav"><li class="nav-item"><a class="nav-link" id="btnToggleMenu" href="#"><i class="fas fa-bars"></i></a></li></ul>
      <ul class="navbar-nav ml-auto">
        <li class="nav-item"><a class="nav-link" href="#" onclick="mostrarView('perfil')" id="nomeHeader"><i class="far fa-user mr-2"></i> ${usuario.nome}</a></li>
        <li class="nav-item"><a class="nav-link text-danger" href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i></a></li>
      </ul>
    </nav>
    <aside class="main-sidebar sidebar-dark-primary elevation-4">
      <div class="sidebar"><nav class="mt-3"><ul class="nav nav-pills nav-sidebar flex-column">
        <li class="nav-item"><a class="nav-link active" onclick="mostrarView('gerar')"><i class="nav-icon fas fa-plus"></i><p>Gerar</p></a></li>
        <li class="nav-item"><a class="nav-link" onclick="mostrarView('consultar')"><i class="nav-icon fas fa-search"></i><p>Consultar</p></a></li>
        ${usuario.role === 'ADMIN' ? `
        <li class="nav-item"><a class="nav-link" onclick="mostrarView('usuarios')"><i class="nav-icon fas fa-users"></i><p>Usuários</p></a></li>
        <li class="nav-item"><a class="nav-link" onclick="mostrarView('admin')"><i class="nav-icon fas fa-database"></i><p>Backup/Restore</p></a></li>
        ` : ''}
        <li class="nav-item"><a class="nav-link" onclick="mostrarView('logs')"><i class="nav-icon fas fa-history"></i><p>Logs</p></a></li>
      </ul></nav></div>
    </aside>
    <div class="content-wrapper"><section class="content pt-4"><div class="container-fluid" id="content"></div></section></div>
  `;
  const btn = document.getElementById('btnToggleMenu');
  if(btn) btn.onclick = (e) => { e.preventDefault(); document.body.classList.toggle('sidebar-collapse'); };
}

window.mostrarView = async (view) => {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const link = document.querySelector(`a[onclick="mostrarView('${view}')"]`);
  if(link) link.classList.add('active');
  
  const content = document.getElementById('content');
  content.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin"></i></div>';
  
  if(view === 'gerar') await initGerar();
  else if(view === 'consultar') await initConsultar();
  else if(view === 'usuarios') await initUsuarios();
  else if(view === 'perfil') await initPerfil();
  else if(view === 'admin') await initAdmin();
  else if(view === 'logs') await mostrarLogs();
};

window.logout = () => { localStorage.clear(); mostrarLogin(); };

async function mostrarLogs() {
  const token = getToken();
  try {
    const resp = await fetch('/api/logs', { headers: { Authorization: `Bearer ${token}` } });
    const logs = await resp.json();
    document.getElementById('content').innerHTML = `<div class="card"><div class="card-body table-responsive p-0"><table class="table table-hover text-nowrap"><thead><tr><th>Data</th><th>User</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${new Date(l.criadoem).toLocaleString()}</td><td>${l.nome}</td><td>${l.acao}</td><td>${l.detalhes}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch (e) { document.getElementById('content').innerHTML='Erro logs'; }
}
