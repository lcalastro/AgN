import { mostrarLogin } from './login.js';
import { initGerar } from './gerar.js';
import { initConsultar } from './consultar.js';

function getToken() {
  return localStorage.getItem('agn_token');
}

function getUsuario() {
  return JSON.parse(localStorage.getItem('agn_usuario') || '{}');
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = getToken();
  const usuario = getUsuario();

  if (!token || !usuario.id) {
    await mostrarLogin();
    return;
  }

  await montarShell(usuario);
  await mostrarView('gerar');
});

async function montarShell(usuario) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Navbar (Header) com Logo -->
    <nav class="main-header navbar navbar-expand navbar-white navbar-light">
      <!-- Logo agora fica aqui no Header -->
      <a href="#" class="navbar-brand ml-3 mr-3" onclick="mostrarView('gerar')">
        <img src="/img/Logo-AgN.png"
             alt="AgN"
             style="height: 30px; width: auto; margin-right: 10px;">
        <span class="font-weight-bold" style="color: #0056b3;">AgN</span>
      </a>

      <!-- Botão do Menu (Hamburguer) -->
      <ul class="navbar-nav">
        <li class="nav-item">
          <a class="nav-link" data-widget="pushmenu" href="#" role="button"><i class="fas fa-bars"></i></a>
        </li>
      </ul>

      <!-- Menu de Usuário (Direita) -->
      <ul class="navbar-nav ml-auto">
        <li class="nav-item">
          <a class="nav-link" href="#" onclick="logout()">
            <i class="far fa-user mr-2"></i> ${usuario.nome || 'Usuário'}
            <span class="float-right text-muted text-sm ml-2"><i class="fas fa-sign-out-alt"></i> Sair</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- Sidebar (Apenas Menu) -->
    <aside class="main-sidebar sidebar-dark-primary elevation-4">
      <!-- Sem brand-link aqui dentro -->
      
      <div class="sidebar">
        <nav class="mt-3">
          <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
            <li class="nav-header">MENU PRINCIPAL</li>
            
            <li class="nav-item">
              <a class="nav-link active" onclick="mostrarView('gerar')" style="cursor: pointer">
                <i class="nav-icon fas fa-plus"></i>
                <p>Gerar Numerador</p>
              </a>
            </li>
            
            <li class="nav-item">
              <a class="nav-link" onclick="mostrarView('consultar')" style="cursor: pointer">
                <i class="nav-icon fas fa-search"></i>
                <p>Consultar</p>
              </a>
            </li>
            
            <li class="nav-item">
              <a class="nav-link" onclick="mostrarView('logs')" style="cursor: pointer">
                <i class="nav-icon fas fa-history"></i>
                <p>Logs do Sistema</p>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <div class="content-wrapper">
      <section class="content pt-4">
        <div class="container-fluid" id="content"></div>
      </section>
    </div>
  `;
}

window.mostrarView = async (view) => {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin"></i></div>';
  
  if (view === 'gerar') await initGerar();
  else if (view === 'consultar') await initConsultar();
  else if (view === 'logs') await mostrarLogs();
};

window.logout = () => {
  localStorage.clear();
  mostrarLogin();
};

async function mostrarLogs() {
  const token = getToken();
  const resp = await fetch('/api/logs', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const logs = await resp.json();
  
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="card-title">Log de Eventos</h3></div>
      <div class="card-body table-responsive">
        <table class="table table-sm table-hover">
          <thead>
            <tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr>
          </thead>
          <tbody>
            ${logs.map(log => `
              <tr>
                <td>${log.criado_em || log.criadoem || '-'}</td>
                <td>${log.nome || '-'}</td>
                <td>${log.acao}</td>
                <td>${log.detalhes || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
