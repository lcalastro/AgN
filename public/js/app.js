import { initLogin, mostrarLogin } from './login.js';
import { initGerar } from './gerar.js';
import { initConsultar } from './consultar.js';

const token = localStorage.getItem('agn_token');
const usuario = JSON.parse(localStorage.getItem('agn_usuario') || '{}');

document.addEventListener('DOMContentLoaded', async () => {
  if (!token || !usuario.id) {
    await mostrarLogin();
    return;
  }

  await montarShell();
  await mostrarView('gerar');
});

async function montarShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <!-- Navbar -->
    <nav class="main-header navbar navbar-expand navbar-white navbar-light">
      <ul class="navbar-nav">
        <li class="nav-item"><a class="nav-link" data-widget="pushmenu" href="#"><i class="fas fa-bars"></i></a></li>
        <li class="nav-item d-none d-sm-inline-block">
          <a href="#" class="nav-link" onclick="mostrarView('gerar')">Gerar</a>
        </li>
        <li class="nav-item d-none d-sm-inline-block">
          <a href="#" class="nav-link" onclick="mostrarView('consultar')">Consultar</a>
        </li>
      </ul>
      <ul class="navbar-nav ml-auto">
        <li class="nav-item dropdown">
          <a class="nav-link" href="#" onclick="logout()">
            <i class="far fa-user"></i> ${usuario.nome}
          </a>
        </li>
      </ul>
    </nav>

    <!-- Sidebar -->
    <aside class="main-sidebar sidebar-dark-primary elevation-4">
      <a href="#" class="brand-link">
        <span class="brand-text font-weight-light">AgN - AgSUS</span>
      </a>
      <div class="sidebar">
        <nav class="mt-2">
          <ul class="nav nav-pills nav-sidebar flex-column">
            <li class="nav-item"><a class="nav-link active" onclick="mostrarView('gerar')">
              <i class="nav-icon fas fa-plus"></i> <p>Gerar Numerador</p></a></li>
            <li class="nav-item"><a class="nav-link" onclick="mostrarView('consultar')">
              <i class="nav-icon fas fa-search"></i> <p>Consultar</p></a></li>
            <li class="nav-item"><a class="nav-link" onclick="mostrarView('logs')">
              <i class="nav-icon fas fa-history"></i> <p>Logs</p></a></li>
          </ul>
        </nav>
      </div>
    </aside>

    <!-- Content -->
    <div class="content-wrapper">
      <section class="content">
        <div class="container-fluid" id="content"></div>
      </section>
    </div>
  `;
}

window.mostrarView = async (view) => {
  document.getElementById('content').innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i></div>';
  
  if (view === 'gerar') await initGerar();
  else if (view === 'consultar') await initConsultar();
  else if (view === 'logs') await mostrarLogs();
};

window.logout = () => {
  localStorage.clear();
  mostrarLogin();
};

async function mostrarLogs() {
  const resp = await fetch('/api/logs', { headers: { Authorization: `Bearer ${token}` } });
  const logs = await resp.json();
  
  document.getElementById('content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Log de Eventos</h3></div>
      <div class="card-body">
        <table class="table table-sm">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Detalhes</th></tr></thead>
          <tbody>${logs.map(log => `
            <tr><td>${log.criadoem}</td><td>${log.nome || '-'}</td><td>${log.acao}</td><td>${log.detalhes}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}
