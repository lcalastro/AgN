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

              <!-- Objeto (Sempre Obrigatório) -->
              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea id="objeto" name="objeto" rows="3" class="form-control"
                          placeholder="Descrição detalhada do objeto..." required></textarea>
              </div>

              <hr>

              <!-- CAMPOS EXTRAS (Controlados por JS) -->
              <div class="row">
                
                <!-- Drive (Comum a quase todos, mas opcional) -->
                <div class="col-md-3 campo-extra" id="grupo-drive">
                  <div class="form-group">
                    <label>ID Drive (Opcional)</label>
                    <input type="number" id="drive" name="drive" class="form-control" placeholder="Ex: 375">
                  </div>
                </div>

                <!-- Divulgação da Cotação -->
                <div class="col-md-3 campo-extra" id="grupo-divulgacao">
                  <div class="form-group">
                    <label>Divulgação</label>
                    <select id="divulgacaocotacao" name="divulgacaocotacao" class="form-control">
                      <option value="">Selecione...</option>
                      <option value="E-Mail">E-Mail</option>
                      <option value="Compras Gov">Compras Gov</option>
                    </select>
                  </div>
                </div>

                <!-- Publicado no Site -->
                <div class="col-md-3 campo-extra" id="grupo-site">
                  <div class="form-group">
                    <label>Publicado Site</label>
                    <select id="publicadosite" name="publicadosite" class="form-control">
                      <option value="Não">Não</option>
                      <option value="Sim">Sim</option>
                    </select>
                  </div>
                </div>

                <!-- Contratado -->
                <div class="col-md-6 campo-extra" id="grupo-contratado">
                  <div class="form-group">
                    <label id="lbl-contratado">Contratado</label>
                    <input type="text" id="contratado" name="contratado" class="form-control" placeholder="Razão Social">
                  </div>
                </div>

                <!-- Coordenação (Select Fixo) -->
                <div class="col-md-3 campo-extra" id="grupo-coordenacao">
                  <div class="form-group">
                    <label>Coordenação</label>
                    <select id="coordenacao" name="coordenacao" class="form-control">
                      <option value="">Selecione...</option>
                      <option value="CPA">CPA</option>
                      <option value="CPAS">CPAS</option>
                      <option value="CCS">CCS</option>
                      <option value="CASS">CASS</option>
                      <option value="CGC">CGC</option>
                      <option value="UAC">UAC</option>
                    </select>
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

              <!-- Observações (Comum) -->
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

  // Configurações Iniciais
  document.getElementById('data').valueAsDate = new Date();
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);

  const selTipo = document.getElementById('tipo');
  selTipo.addEventListener('change', () => configCampos(selTipo.value));

  // Tenta preencher coordenação do usuário logado
  preencherCoordenacaoUsuario();

  // Inicia ocultando extras
  configCampos('');
  carregarHistorico();
}

function configCampos(tipo) {
  // 1. Esconde todos os grupos extras primeiro
  const grupos = ['drive', 'divulgacao', 'site', 'contratado', 'coordenacao', 'orcamento', 'observacoes'];
  grupos.forEach(id => document.getElementById('grupo-' + id).style.display = 'none');

  // 2. Remove required de campos condicionais para não travar o envio oculto
  const campReqs = ['contratado', 'orcamento'];
  campReqs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.required = false;
  });
  
  // Reset label contratado (tira o asterisco visual)
  document.getElementById('lbl-contratado').innerHTML = 'Contratado';

  if (!tipo) return;

  // Função helper para mostrar campos
  const show = (ids) => ids.forEach(id => document.getElementById('grupo-' + id).style.display = 'block');

  // 3. Lógica por Tipo (Conforme solicitado)
  switch (tipo) {
    case 'Cotação de Preços':
      // Data, Drive, Processo, Objeto, Divulgação, Publicado Site, Obs
      show(['drive', 'divulgacao', 'site', 'observacoes']);
      break;

    case 'Pregão Eletrônico':
      // Data, Drive, Processo, Objeto, Publicado Site, Obs
      show(['drive', 'site', 'observacoes']);
      break;

    case 'Ata SRP':
      // Data, Drive, Processo, Objeto, Contratado (Obrigatório), Coordenação, Obs
      show(['drive', 'contratado', 'coordenacao', 'observacoes']);
      // Torna Contratado Obrigatório
      document.getElementById('contratado').required = true;
      document.getElementById('lbl-contratado').innerHTML = 'Contratado <span class="text-danger">*</span>';
      break;

    case 'Credenciamento':
    case 'Convênio':
      // Data, Drive, Processo, Objeto, Orçamento, Publicado Site, Obs
      show(['drive', 'orcamento', 'site', 'observacoes']);
      break;

    case 'Ordem de Fornecimento':
    case 'Contratos':
    case 'Inexigibilidade':
    case 'Contrato de Patrocínio':
    case 'Acordo de Cooperação':
      // Data, Drive, Processo, Objeto, Coordenação, Obs
      // OBS: No seu pedido anterior, Contratado não estava nessa lista final,
      // mas geralmente contratos têm contratado. Vou seguir seu pedido estrito:
      // Apenas Data, Drive, Processo, Objeto, Coordenação, Obs.
      // (Se precisar de Contratado aqui também, avise).
      show(['drive', 'coordenacao', 'observacoes']); 
      break;
  }
}

function preencherCoordenacaoUsuario() {
  const user = JSON.parse(localStorage.getItem('agn_usuario') || '{}');
  const el = document.getElementById('coordenacao');
  if (el && user.coordenacao) {
    // Verifica se a coordenação do usuário é válida nas opções
    // Se for algo fora da lista (ex: ADM), ele seleciona vazio ou mantém.
    el.value = user.coordenacao;
  }
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnGerar');
  const dados = Object.fromEntries(new FormData(form).entries());

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

  try {
    const resp = await apiPost('/api/gerar', dados);
    const { numero, ano, tipo } = resp.dados;

    await Swal.fire({
      icon: 'success',
      title: 'Gerado com Sucesso!',
      html: `
        <div style="font-size: 1.2rem; margin-top: 10px;">
          <p class="mb-1 text-muted">Documento:</p>
          <h3 class="text-primary font-weight-bold">${tipo}</h3>
          <div class="display-4 font-weight-bold text-dark mt-3">
            ${numero}/${ano}
          </div>
        </div>
      `,
      confirmButtonColor: '#0056b3'
    });

    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    preencherCoordenacaoUsuario(); // Reaplica coordenação do usuário
    configCampos(''); // Reseta campos visuais
    carregarHistorico();

  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Erro ao gerar',
      text: err.message
    });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus-circle"></i> Gerar Número';
  }
}

async function carregarHistorico() {
  try {
    const lista = await apiGet('/api/listar');
    const tbody = document.querySelector('#tabelaHistorico tbody');
    
    if(!lista || lista.length === 0) {
       tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum registro.</td></tr>';
       return;
    }

    tbody.innerHTML = lista.map(item => `
      <tr>
        <td><span class="badge badge-primary" style="font-size: 0.9rem">${item.numero}/${item.ano}</span></td>
        <td><small class="d-block text-truncate" style="max-width: 150px;">${item.tipo}</small></td>
        <td><small class="text-muted">${item.processo || '-'}</small></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error(e);
  }
}
