import { toast } from './utils.js';

export async function initAdmin() {
  const content = document.getElementById('content');
  
  content.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card card-danger card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-database mr-2"></i>Administração do Banco de Dados</h3>
          </div>
          <div class="card-body">
            
            <!-- BACKUP -->
            <div class="alert alert-info">
              <h5><i class="icon fas fa-download"></i> 1. Exportar Backup</h5>
              Baixe o arquivo atual do banco de dados antes de fazer qualquer manutenção ou deploy.
              <div class="mt-3">
                <button class="btn btn-light text-info border-info" onclick="baixarBackup()">
                  <i class="fas fa-download"></i> Baixar agndados.db
                </button>
              </div>
            </div>

            <hr>

            <!-- RESTORE -->
            <div class="alert alert-warning">
              <h5><i class="icon fas fa-upload"></i> 2. Importar Backup (Restore)</h5>
              Envie um arquivo de>.db</code> para substituir o banco atual. 
              <br><strong>CUIDADO:</strong> Isso apagará todos os dados atuais e substituirá pelos do arquivo.
              
              <form id="formRestore" class="mt-3">
                <div class="form-group">
                  <input type="file" name="backup" id="arquivoBackup" class="form-control-file" accept=".db" required>
                </div>
                <button type="submit" class="btn btn-warning text-dark">
                  <i class="fas fa-upload"></i> Restaurar Banco
                </button>
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
  // Download via link direto com token na query ou fetch blob (mais seguro fetch blob)
  
  try {
    const resp = await fetch('/api/backup', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!resp.ok) throw new Error('Erro ao baixar backup');
    
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_agn_${new Date().toISOString().split('T')[0]}.db`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert(e.message);
  }
}

async function restaurarBackup(e) {
  e.preventDefault();
  if (!confirm('ATENÇÃO: Isso substituirá todo o banco de dados atual pelo arquivo enviado. Continuar?')) return;

  const form = e.target;
  const formData = new FormData(form);
  const btn = form.querySelector('button');
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData // FormData vai sem Content-Type header manual (o browser define boundary)
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.erro || 'Erro no restore');

    alert('Sucesso! O sistema será reiniciado. Por favor, faça login novamente em alguns instantes.');
    localStorage.clear();
    location.reload();

  } catch (err) {
    alert('Erro: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> Restaurar Banco';
  }
}
