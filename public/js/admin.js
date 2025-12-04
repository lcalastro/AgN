import { toast } from './utils.js';

export async function initAdmin() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-8">
        
        <!-- Cabeçalho -->
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-database mr-2"></i>Gerenciamento de Banco de Dados</h3>
          </div>
          <div class="card-body">
            <p class="text-muted">
              Utilize esta área para realizar cópias de segurança dos dados (Backup) ou restaurar o sistema a partir de um arquivo salvo anteriormente.
            </p>

            <!-- BACKUP (EXPORTAR) -->
            <div class="card bg-light mb-4 border-0">
              <div class="card-body d-flex align-items-center justify-content-between">
                <div>
                  <h5 class="text-primary font-weight-bold mb-1"><i class="fas fa-download mr-2"></i>Exportar Dados (Backup)</h5>
                  <span class="text-muted small">Baixa o arquivo de>.sql</code> completo atual do sistema.</span>
                </div>
                <button class="btn btn-primary" onclick="baixarBackup()">
                  <i class="fas fa-file-download mr-2"></i> Baixar Backup
                </button>
              </div>
            </div>

            <hr>

            <!-- RESTORE (IMPORTAR) -->
            <div class="mt-4">
              <h5 class="text-dark font-weight-bold mb-3"><i class="fas fa-upload mr-2"></i>Importar Dados (Restaurar)</h5>
              <div class="alert alert-warning">
                <i class="icon fas fa-exclamation-triangle"></i>
                <strong>Atenção:</strong> Esta ação substituirá todos os dados atuais pelos do arquivo enviado.
              </div>
              
              <form id="formRestore" class="d-flex align-items-end bg-light p-3 rounded border">
                <div class="flex-grow-1 mr-3">
                  <label class="small text-muted mb-1">Selecione o arquivo de backup (.sql)</label>
                  <div class="custom-file">
                    <input type="file" class="custom-file-input" name="backup" id="arquivoBackup" accept=".sql" required onchange="document.getElementById('labelFile').innerText = this.files[0].name">
                    <label class="custom-file-label" for="arquivoBackup" id="labelFile">Escolher arquivo...</label>
                  </div>
                </div>
                <button type="submit" class="btn btn-success px-4">
                  <i class="fas fa-upload mr-2"></i> Restaurar
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
  try {
    const resp = await fetch('/api/backup', { headers: { 'Authorization': `Bearer ${token}` } });
    if (!resp.ok) throw new Error('Erro ao baixar backup');
    
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agn_backup_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    alert(e.message);
  }
}

async function restaurarBackup(e) {
  e.preventDefault();
  if (!confirm('Tem certeza absoluta? Todos os dados atuais serão substituídos pelos do backup.')) return;

  const form = e.target;
  const btn = form.querySelector('button');
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

  try {
    const token = localStorage.getItem('agn_token');
    const resp = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: new FormData(form)
    });

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.erro || 'Erro no restore');

    await Swal.fire({
      icon: 'success',
      title: 'Backup Restaurado!',
      text: 'O sistema foi atualizado com sucesso. Por favor, faça login novamente.',
      confirmButtonColor: '#0056b3'
    });

    localStorage.clear();
    location.reload();

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Falha na Restauração',
      text: err.message
    });
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}
