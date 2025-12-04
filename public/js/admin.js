import { toast } from './utils.js';

export async function initAdmin() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card card-danger card-outline">
          <div class="card-header"><h3 class="card-title">Administração do Banco</h3></div>
          <div class="card-body">
            <div class="alert alert-info">
              <h5>1. Exportar Backup</h5>
              <button class="btn btn-light border-info text-info mt-2" onclick="baixarBackup()"><i class="fas fa-download"></i> Baixar .db</button>
            </div>
            <hr>
            <div class="alert alert-warning">
              <h5>2. Importar Backup</h5>
              <form id="formRestore" class="mt-2">
                <input type="file" name="backup" class="form-control-file mb-2" accept=".db" required>
                <button type="submit" class="btn btn-warning"><i class="fas fa-upload"></i> Restaurar</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  window.baixarBackup = baixarBackup;
  document.getElementById('formRestore').addEventListener('submit', restaurarBackup);
}

async function baixarBackup() {
  const token = localStorage.getItem('agn_token');
  try {
    const resp = await fetch('/api/backup', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!resp.ok) throw new Error('Erro download');
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `agn_backup.db`; document.body.appendChild(a); a.click(); a.remove();
  } catch (e) { alert(e.message); }
}

async function restaurarBackup(e) {
  e.preventDefault();
  if (!confirm('Isso APAGA o banco atual. Continuar?')) return;
  const form = e.target;
  const btn = form.querySelector('button');
  btn.disabled = true; btn.innerHTML = 'Enviando...';
  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch('/api/restore', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: new FormData(form) });
    if (!resp.ok) throw new Error((await resp.json()).erro);
    alert('Sucesso! Sistema reiniciando. Faça login novamente.');
    localStorage.clear(); location.reload();
  } catch (e) { alert(e.message); btn.disabled = false; btn.innerHTML = 'Restaurar'; }
}
