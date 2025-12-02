import { apiPost, apiGet, toast, formatarData } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <div class="col-lg-8">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-file-alt mr-2"></i>Gerar Novo Numerador</h3>
          </div>
          
          <form id="formAgN">
            <div class="card-body">
              
              <!-- LINHA 1: Tipo, Data, Processo (Sempre visíveis) -->
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

              <!-- LINHA 2: Objeto (Sempre visível) -->
              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea name="objeto" rows="3" class="form-control"
                          placeholder="Descrição detalhada do objeto..." required></textarea>
              </div>

              <hr>

              <!-- ÁREA DE CAMPOS EXTRAS (Dinâmicos) -->
              <div id="camposExtras">
                <div class="row">
                  <!-- Drive: Serve para quase todos, mas vamos controlar -->
                  <div class="col-md-4" id="divDrive" style="display:none">
                    <div class="form-group">
                      <label>ID Drive</label>
                      <input type="number" name="drive" class="form-control" placeholder="Ex: 1234">
                    </div>
                  </div>

                  <!-- Site: Para pregão, cotação -->
                  <div class="col-md-4" id="divSite" style="display:none">
                    <div class="form-group">
                      <label>Publicado no Site?</label>
                      <select name="publicadosite" class="form-control">
                        <option value="Não">Não</option>
                        <option value="Sim">Sim</option>
                      </select>
                    </div>
                  </div>

                  <!-- Divulgação: Apenas Cotação -->
                  <div class="col-md-4" id="divDivulgacao" style="display:none">
                    <div class="form-group">
                      <label>Divulgação Cotação</label>
                      <input type="date" name="divulgacaocotacao" class="form-control">
                    </div>
                  </div>
                  
                  <!-- Contratado: Contratos, Atas, Ordens -->
                  <div class="col-md-6" id="divContratado" style="display:none">
                    <div class="form-group">
                      <label>Contratado / Fornecedor</label>
                      <input type="text" name="contratado" class="form-control" placeholder="Razão Social">
                    </div>
                  </div>

                  <!-- Coordenação: Geral -->
                  <div class="col-md-3" id="divCoordenacao" style="display:none">
                    <div class="form-group">
                      <label>Coordenação</label>
                      <input type="text" name="coordenacao" class="form-control" placeholder="Ex: DITEC">
                    </div>
                  </div>

                  <!-- Orçamento: Cotação, Contratos -->
                  <div class="col-md-3" id="divOrcamento" style="display:none">
                    <div class="form-group">
                      <label>Valor / Orçamento</label>
                      <input type="text" name="orcamento" class="form-control" placeholder="R$ 0,00">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Observações (Sempre visível) -->
              <div class="form-group mt-2">
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

      <!-- Histórico Lateral -->
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

  document.getElementById('data').valueAsDate = new Date();

  // === EVENTOS ===
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);
  
  // Listener para mostrar/ocultar campos
  const selTipo = document.getElementById('tipo');
  selTipo.addEventListener('change', () => ajustarCampos(selTipo.value));

  carregarHistorico();
}

// Lógica de Mostrar/Ocultar
function ajustarCampos(tipo) {
  // 1. Oculta tudo primeiro e limpa valores (opcional, para não enviar lixo)
  ['divDrive', 'divSite', 'divDivulgacao', 'divContratado', 'divCoordenacao', 'divOrcamento'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  if (!tipo) return;

  // 2. Define regras baseadas no tipo
  switch (tipo) {
    case 'Cotação de Preços':
      mostrar('divDivulgacao');
      mostrar('divSite');
      mostrar('divOrcamento');
      mostrar('divDrive');
      break;

    case 'Pregão Eletrônico':
      mostrar('divSite');
      mostrar('divDrive');
      mostrar('divOrcamento');
      break;

    case 'Contratos':
    case 'Ata SRP':
    case 'Ordem de Fornecimento':
    case 'Inexigibilidade':
    case 'Contrato de Patrocínio':
    case 'Acordo de Cooperação':
      mostrar('divContratado');
      mostrar('divOrcamento');
      mostrar('divCoordenacao');
      mostrar('divDrive');
      break;

    case 'Credenciamento':
    case 'Convênio':
      mostrar('divContratado');
      mostrar('divCoordenacao');
      mostrar('divDrive');
      break;
      
    default:
      // Se for outro tipo, mostra pelo menos Drive e Coordenação
      mostrar('divDrive');
      mostrar('divCoordenacao');
  }
}

function mostrar(id) {
  document.getElementById(id).style.display = 'block';
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnGerar');
  const formData = new FormData(form);
  const dados = Object.fromEntries(formData.entries());

  btn.disabled = true;
  const htmlOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

  try {
    await apiPost('/api/gerar', dados);
    toast('Número gerado com sucesso!'); 
    form.reset();
    
    // Resetar data e campos dinâmicos
    document.getElementById('data').valueAsDate = new Date();
    ajustarCampos(''); // Esconde tudo de novo
    
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
    const lista = await apiGet('/api/listar'); 
    const tbody = document.querySelector('#tabelaHistorico tbody');
    if (!lista || !lista.length) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Sem histórico.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><span class="badge badge-primary">${item.numero}/${item.ano}</span></td>
        <td><small>${item.tipo}</small></td>
        <td><small>${item.processo || '-'}</small></td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}
