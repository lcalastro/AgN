import { apiPost, apiGet, toast, formatarData } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <!-- Coluna do Formulário (Esquerda) -->
      <div class="col-lg-8">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-file-alt mr-2"></i>Gerar Novo Numerador</h3>
          </div>
          
          <form id="formAgN">
            <div class="card-body">
              <!-- Linha 1: Tipo, Data, Processo -->
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
                    <label>Processo SEI <span class="text-danger">*</span></label>
                    <input type="text" name="processo" class="form-control"
                           placeholder="Ex: AGSUS.007637/2025-93" required>
                  </div>
                </div>
              </div>

              <!-- Linha 2: Objeto (Largo) -->
              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea name="objeto" rows="3" class="form-control"
                          placeholder="Descrição detalhada do objeto..." required></textarea>
              </div>

              <hr>

              <!-- Linha 3: Campos Específicos (Drive, Site, Divulgação) -->
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>ID Drive (Opcional)</label>
                    <input type="number" name="drive" class="form-control" placeholder="Ex: 1234">
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Publicado no Site?</label>
                    <select name="publicadosite" class="form-control">
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Divulgação Cotação</label>
                    <input type="date" name="divulgacaocotacao" class="form-control">
                  </div>
                </div>
              </div>

              <!-- Linha 4: Contratado, Coordenação, Orçamento -->
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Contratado / Fornecedor</label>
                    <input type="text" name="contratado" class="form-control" placeholder="Nome da empresa">
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Coordenação</label>
                    <input type="text" name="coordenacao" class="form-control" placeholder="Ex: DITEC">
                  </div>
                </div>

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Valor / Orçamento</label>
                    <input type="text" name="orcamento" class="form-control" placeholder="R$ 0,00">
                  </div>
                </div>
              </div>

              <!-- Observações -->
              <div class="form-group">
                <label>Observações Gerais</label>
                <textarea name="observacoes" rows="2" class="form-control"></textarea>
              </div>
            </div>

            <div class="card-footer text-right">
              <button type="submit" class="btn btn-primary btn-lg" id="btnGerar">
                <i class="fas fa-plus-circle"></i> Gerar Número
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Coluna do Histórico (Direita) -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header bg-light">
            <h3 class="card-title">Últimos Gerados</h3>
          </div>
          <div class="card-body p-0 table-responsive" style="max-height: 600px;">
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

  // Define data de hoje por padrão
  document.getElementById('data').valueAsDate = new Date();

  // Listeners
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);
  
  // Carrega tabela lateral
  carregarHistorico();
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnGerar');

  // Coleta dados do form
  const formData = new FormData(form);
  const dados = Object.fromEntries(formData.entries());

  // UI Feedback
  btn.disabled = true;
  const htmlOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

  try {
    // Envia para o backend
    const resp = await apiPost('/api/gerar', dados);
    
    // Feedback de Sucesso
    // Se o backend já estiver retornando dados: toast(`Gerado: #${resp.dados.numero}/${resp.dados.ano}`);
    // Se ainda estiver retornando só sucesso:
    toast('Número gerado com sucesso!'); 
    
    // Limpa form e recarrega
    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    carregarHistorico();
    
  } catch (err) {
    alert('Erro ao gerar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = htmlOriginal;
  }
}

async function carregarHistorico() {
  try {
    // Busca apenas os últimos 10 para a sidebar lateral
    const lista = await apiGet('/api/listar'); 
    const tbody = document.querySelector('#tabelaHistorico tbody');

    if (!lista || !lista.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Sem histórico recente.</td></tr>';
      return;
    }

    // Preenche a tabela lateral
    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><span class="badge badge-primary">${item.numero}/${item.ano}</span></td>
        <td><small>${item.tipo}</small></td>
        <td><small>${item.processo || '-'}</small></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Erro ao atualizar histórico:', e);
  }
}
