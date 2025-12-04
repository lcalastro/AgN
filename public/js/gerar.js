import { apiPost, apiGet, toast } from './utils.js';

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
              
              <!-- LINHA 1: Tipo, Data, Processo -->
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
                    <input type="text" id="processo" name="processo" class="form-control"
                           placeholder="Ex: AGSUS.007637/2025-93" required>
                  </div>
                </div>
              </div>

              <!-- Objeto -->
              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea id="objeto" name="objeto" rows="3" class="form-control"
                          placeholder="Descrição detalhada do objeto..." required></textarea>
              </div>

              <hr>

              <!-- CAMPOS EXTRAS (controlados por tipo) -->
              <div class="row">
                <!-- Drive -->
                <div class="col-md-4 campo-extra" id="grupo-drive">
                  <div class="form-group">
                    <label>ID Drive (Opcional)</label>
                    <input type="number" id="drive" name="drive" class="form-control" placeholder="Ex: 375">
                  </div>
                </div>

                <!-- Divulgação da Cotação -->
                <div class="col-md-4 campo-extra" id="grupo-divulgacao">
                  <div class="form-group">
                    <label>Divulgação da Cotação</label>
                    <select id="divulgacaocotacao" name="divulgacaocotacao" class="form-control">
                      <option value="">Selecione...</option>
                      <option value="E-Mail">E-Mail</option>
                      <option value="Compras Gov">Compras Gov</option>
                    </select>
                  </div>
                </div>

                <!-- Publicado no Site -->
                <div class="col-md-4 campo-extra" id="grupo-site">
                  <div class="form-group">
                    <label>Publicado no site da AgSUS</label>
                    <select id="publicadosite" name="publicadosite" class="form-control">
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </div>

                <!-- Contratado -->
                <div class="col-md-6 campo-extra" id="grupo-contratado">
                  <div class="form-group">
                    <label>Contratado / Fornecedor</label>
                    <input type="text" id="contratado" name="contratado" class="form-control" placeholder="Razão Social">
                  </div>
                </div>

                <!-- Coordenação -->
                <div class="col-md-3 campo-extra" id="grupo-coordenacao">
                  <div class="form-group">
                    <label>Coordenação</label>
                    <input type="text" id="coordenacao" name="coordenacao" class="form-control" placeholder="Ex: CCONT, DITEC">
                  </div>
                </div>

                <!-- Orçamento -->
                <div class="col-md-3 campo-extra" id="grupo-orcamento">
                  <div class="form-group">
                    <label>Orçamento</label>
                    <input type="text" id="orcamento" name="orcamento" class="form-control" placeholder="R$ 0,00">
                  </div>
                </div>
              </div>

              <!-- Observações -->
              <div class="form-group mt-2 campo-extra" id="grupo-observacoes">
                <label>Observações</label>
                <textarea id="observacoes" name="observacoes" rows="2" class="form-control"></textarea>
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

      <!-- HISTÓRICO -->
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

  // Data de hoje
  document.getElementById('data').valueAsDate = new Date();

  // Eventos
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);

  const selTipo = document.getElementById('tipo');
  selTipo.addEventListener('change', () => configurarCamposPorTipo(selTipo.value));

  // Aplica configuração inicial (nada selecionado)
  configurarCamposPorTipo('');

  carregarHistorico();
}

// Controla visibilidade + obrigatoriedade por tipo
function configurarCamposPorTipo(tipo) {
  const grupos = {
    drive: document.getElementById('grupo-drive'),
    divulgacao: document.getElementById('grupo-divulgacao'),
    site: document.getElementById('grupo-site'),
    contratado: document.getElementById('grupo-contratado'),
    coordenacao: document.getElementById('grupo-coordenacao'),
    orcamento: document.getElementById('grupo-orcamento'),
    observacoes: document.getElementById('grupo-observacoes')
  };

  const campos = {
    drive: document.getElementById('drive'),
    divulgacaocotacao: document.getElementById('divulgacaocotacao'),
    publicadosite: document.getElementById('publicadosite'),
    contratado: document.getElementById('contratado'),
    coordenacao: document.getElementById('coordenacao'),
    orcamento: document.getElementById('orcamento'),
    observacoes: document.getElementById('observacoes'),
    data: document.getElementById('data'),
    processo: document.getElementById('processo'),
    objeto: document.getElementById('objeto')
  };

  // Esconde todos extras e remove required
  Object.values(grupos).forEach(div => { if (div) div.style.display = 'none'; });
  Object.values(campos).forEach(campo => {
    if (!campo) return;
    campo.required = false;
  });

  // Campos base sempre obrigatórios
  campos.data.required = true;
  campos.processo.required = true;
  campos.objeto.required = true;

  if (!tipo) return;

  // Aplica regras por tipo
  switch (tipo) {
    case 'Cotação de Preços':
      mostrar(grupos.drive);
      mostrar(grupos.divulgacao);
      mostrar(grupos.site);
      mostrar(grupos.observacoes);
      // nada extra obrigatório além dos 3 base
      break;

    case 'Pregão Eletrônico':
      mostrar(grupos.drive);
      mostrar(grupos.site);
      mostrar(grupos.observacoes);
      break;

    case 'Ata SRP':
      mostrar(grupos.drive);
      mostrar(grupos.contratado);
      mostrar(grupos.coordenacao);
      mostrar(grupos.observacoes);
      campos.contratado.required = true; // Contratado obrigatório
      break;

    case 'Credenciamento':
    case 'Convênio':
      mostrar(grupos.drive);
      mostrar(grupos.orcamento);
      mostrar(grupos.site);
      mostrar(grupos.observacoes);
      // orçamento não é obrigatório, só exibido
      break;

    case 'Ordem de Fornecimento':
    case 'Contratos':
    case 'Inexigibilidade':
    case 'Contrato de Patrocínio':
    case 'Acordo de Cooperação':
      mostrar(grupos.drive);
      mostrar(grupos.coordenacao);
      mostrar(grupos.observacoes);
      break;

    default:
      // fallback: só drive + observações
      mostrar(grupos.drive);
      mostrar(grupos.observacoes);
  }
}

function mostrar(div) {
  if (div) div.style.display = 'block';
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnGerar');

  const formData = new FormData(form);
  const dados = Object.fromEntries(formData.entries());

  btn.disabled = true;
  const htmlOriginal = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

  try {
    const resp = await apiPost('/api/gerar', dados);
    
    // Sucesso! Modal Bonito Centralizado
    // O backend retorna: { sucesso: true, dados: { numero, ano, tipo, ... } }
    const { numero, ano, tipo } = resp.dados;

    await Swal.fire({
      icon: 'success',
      title: 'Gerado com Sucesso!',
      html: `
        <div style="font-size: 1.2rem; margin-top: 10px;">
          <p class="mb-1">Documento:</p>
          <h3 class="text-primary font-weight-bold">${tipo}</h3>
          <div class="display-4 font-weight-bold text-dark mt-3">
            ${numero}/${ano}
          </div>
        </div>
      `,
      confirmButtonText: 'OK, Entendi',
      confirmButtonColor: '#0056b3', // Azul AgSUS
      allowOutsideClick: false
    });

    // Limpa e reseta
    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    configurarCamposPorTipo(''); 
    carregarHistorico();

  } catch (err) {
    // Erro também fica bonito
    Swal.fire({
      icon: 'error',
      title: 'Erro ao gerar',
      text: err.message,
      confirmButtonColor: '#d33'
    });
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
  } catch (e) {
    console.error('Erro ao carregar histórico:', e);
  }
}
