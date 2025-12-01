import { apiPost, apiGet, toast, formatarData } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  content.innerHTML = `
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
                    <select id="tipo" name="tipo" class="form-control" required>
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
                    <input type="text" name="processo" class="form-control"
                           placeholder="Ex: AGSUS.007637/2025-93" required>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea name="objeto" rows="3" class="form-control"
                          placeholder="Descrição do objeto..." required></textarea>
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
            <table id="tabelaHistorico" class="table table-sm table-hover mb-0">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Tipo</th>
                  <th>Processo</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // data de hoje
  document.getElementById('data').valueAsDate = new Date();

  // submit do form
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);

  // carrega histórico
  carregarHistorico();
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnGerar');

  const formData = new FormData(form);
  const dados = Object.fromEntries(formData.entries());

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

  try {
    const resp = await apiPost('/api/gerar', dados);
    // resp.sucesso === true
    toast('Gerado com sucesso!');
    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    carregarHistorico();
  } catch (err) {
    alert('Erro ao gerar número: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Gerar Número';
  }
}

async function carregarHistorico() {
  try {
    const lista = await apiGet('/api/listar');
    const tbody = document.querySelector('#tabelaHistorico tbody');

    if (!lista || !lista.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3">Nenhum registro ainda.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><span class="badge badge-primary">${item.numero}/${item.ano}</span></td>
        <td>${item.tipo}</td>
        <td>${item.processo || '-'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao carregar histórico:', e);
  }
}
