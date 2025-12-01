import { apiPost, toast, formatarData } from './utils.js';

export async function initGerar() {
  document.getElementById('content').innerHTML = `
    <div class="row">
      <div class="col-md-8">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title">Gerar novo numerador</h3>
          </div>
          <form id="formAgN">
            <div class="card-body">
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Tipo de Documento <span class="text-danger">*</span></label>
                    <select id="tipo" name="tipo" class="form-control" required onchange="ajustarCampos()">
                      <option value="">Selecione...</option>
                      <option value="Cotação de Preços">Cotação de Preços</option>
                      <option value="Pregão Eletrônico">Pregão Eletrônico</option>
                      <option value="Ata SRP">Ata SRP</option>
                      <option value="Credenciamento">Credenciamento</option>
                      <option value="Convênio">Convênio</option>
                      <option value="Ordem de Fornecimento">Ordem de Fornecimento</option>
                      <option value="Contratos">Contratos</option>
                      <option value="Inexigibilidade">Inexigibilidade</option>
                      <option value="Contrato de Patrocínio">Contrato de Patrocínio</option>
                      <option value="Acordo de Cooperação">Acordo de Cooperação</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="form-group">
                    <label>Data <span class="text-danger">*</span></label>
                    <input type="date" id="data" name="data" class="form-control" required>
                  </div>
                </div>
                <div class="col-md-5">
                  <div class="form-group">
                    <label>Processo <span class="text-danger">*</span></label>
                    <input type="text" name="processo" class="form-control" required placeholder="Ex: AGSUS.007637/2025-93">
                  </div>
                </div>
              </div>
              <!-- Demais campos (igual seu index-2.html) -->
              <div class="row">
                <div class="col-12">
                  <div class="form-group">
                    <label>Objeto <span class="text-danger">*</span></label>
                    <textarea name="objeto" rows="3" class="form-control" required placeholder="Descrição do objeto..."></textarea>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>Observações</label>
                <textarea name="observacoes" rows="2" class="form-control"></textarea>
              </div>
            </div>
            <div class="card-footer">
              <button type="submit" class="btn btn-primary" id="btnGerar">
                <i class="fas fa-plus"></i> Gerar Número
              </button>
            </div>
          </form>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Últimos gerados</h3>
          </div>
          <div class="card-body p-0">
            <table id="tabelaHistorico" class="table table-sm table-hover">
              <thead><tr><th>Nº</th><th>Tipo</th><th>Processo</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Configura data atual
  document.getElementById('data').valueAsDate = new Date();

  // Submit form (seu código atual)
  document.getElementById('formAgN').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData);
    const btn = document.getElementById('btnGerar');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    try {
      const resp = await apiPost('/api/gerar', dados);
      toast(`Gerado com sucesso! ${resp.dados.tipo} #${resp.dados.numero}/${resp.dados.ano}`, 'success');
      e.target.reset();
      document.getElementById('data').valueAsDate = new Date();
      ajustarCampos();
      carregarHistorico();
    } catch (err) {
      toast('Erro: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-plus"></i> Gerar Número';
    }
  });

  carregarHistorico();
}

window.ajustarCampos = () => {
  // Seu código atual de mostrar/esconder campos específicos
  const tipo = document.getElementById('tipo').value;
  // ... lógica igual ao index-2.html
};

async function carregarHistorico() {
  try {
    const lista = await apiGet('/api/listar');
    const tbody = document.querySelector('#tabelaHistorico tbody');
    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><span class="badge badge-primary">${item.numero}/${item.ano}</span></td>
        <td>${item.tipo}</td>
        <td>${item.processo || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erro ao carregar histórico:', err);
  }
}
