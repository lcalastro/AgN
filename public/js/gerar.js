import { apiPost, apiGet } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  const anoAtual = new Date().getFullYear();

  content.innerHTML = `
    <div class="row">
      <!-- COLUNA ESQUERDA: FORMULÁRIO -->
      <div class="col-lg-8">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-file-alt mr-2"></i>Gerar Novo Numerador</h3>
          </div>
          
          <form id="formAgN">
            <div class="card-body">
              
              <!-- LINHA 1 -->
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
                    <input type="text" id="processo" name="processo" class="form-control" placeholder="Ex: AGSUS.007637/2025-93" required>
                  </div>
                </div>
              </div>

              <!-- OBJETO -->
              <div class="form-group">
                <label>Objeto <span class="text-danger">*</span></label>
                <textarea id="objeto" name="objeto" rows="3" class="form-control" required></textarea>
              </div>

              <hr>

              <!-- CAMPOS EXTRAS -->
              <div class="row">
                <div class="col-md-3 campo-extra" id="grupo-drive">
                  <div class="form-group"><label>ID Drive</label><input type="number" name="drive" class="form-control"></div>
                </div>
                <div class="col-md-3 campo-extra" id="grupo-divulgacao">
                  <div class="form-group"><label>Divulgação</label><select name="divulgacaocotacao" class="form-control"><option value="">Selecione...</option><option>E-Mail</option><option>Compras Gov</option></select></div>
                </div>
                <div class="col-md-3 campo-extra" id="grupo-site">
                  <div class="form-group"><label>Publicado Site</label><select name="publicadosite" class="form-control"><option>Não</option><option>Sim</option></select></div>
                </div>
                <div class="col-md-6 campo-extra" id="grupo-contratado">
                  <div class="form-group"><label id="lbl-contratado">Contratado</label><input type="text" id="contratado" name="contratado" class="form-control"></div>
                </div>
                <div class="col-md-3 campo-extra" id="grupo-coordenacao">
                  <div class="form-group">
                    <label>Coordenação</label>
                    <select id="coordenacao" name="coordenacao" class="form-control">
                      <option value="">Selecione...</option>
                      <option>CPA</option><option>CPAS</option><option>CCS</option><option>CASS</option><option>CGC</option><option>UAC</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-3 campo-extra" id="grupo-orcamento">
                  <div class="form-group"><label>Orçamento</label><input type="text" id="orcamento" name="orcamento" class="form-control"></div>
                </div>
              </div>

              <div class="form-group mt-2 campo-extra" id="grupo-observacoes">
                <label>Observações</label><textarea name="observacoes" rows="2" class="form-control"></textarea>
              </div>
            </div>

            <div class="card-footer text-right">
              <button type="submit" class="btn btn-primary btn-lg" id="btnGerar"><i class="fas fa-plus-circle"></i> Gerar Número</button>
            </div>
          </form>
        </div>
      </div>

      <!-- COLUNA DIREITA: TABELA RESUMO -->
      <div class="col-lg-4">
        <div class="card card-info card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-chart-bar mr-2"></i>Status (${anoAtual})</h3>
          </div>
          <div class="card-body p-0">
            <table class="table table-striped table-sm mb-0" id="tabelaResumo">
              <thead>
                <tr>
                  <th>Tipo de Documento</th>
                  <th class="text-right">Atual</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colspan="2" class="text-center p-3">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Inicialização
  document.getElementById('data').valueAsDate = new Date();
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);
  document.getElementById('tipo').addEventListener('change', (e) => configCampos(e.target.value));
  
  // Preenche coordenação
  const user = JSON.parse(localStorage.getItem('agn_usuario') || '{}');
  if (user.coordenacao) {
    const el = document.getElementById('coordenacao');
    // Tenta setar valor, se existir na lista
    Array.from(el.options).forEach(o => { if(o.value === user.coordenacao) el.value = user.coordenacao });
  }

  configCampos('');
  carregarResumo(); // <--- Nova função
}

function configCampos(t) {
  const ids = ['drive','divulgacao','site','contratado','coordenacao','orcamento','observacoes'];
  ids.forEach(i => document.getElementById('grupo-'+i).style.display = 'none');
  
  // Remove required condicional
  const elCont = document.getElementById('contratado');
  if(elCont) { elCont.required = false; document.getElementById('lbl-contratado').innerHTML = 'Contratado'; }

  if(!t) return;

  const show = (ls) => ls.forEach(i => document.getElementById('grupo-'+i).style.display = 'block');
  
  switch(t) {
    case 'Cotação de Preços': show(['drive','divulgacao','site','observacoes']); break;
    case 'Pregão Eletrônico': show(['drive','site','observacoes']); break;
    case 'Ata SRP': 
      show(['drive','contratado','coordenacao','observacoes']); 
      elCont.required = true; 
      document.getElementById('lbl-contratado').innerHTML = 'Contratado <span class="text-danger">*</span>';
      break;
    case 'Credenciamento':
    case 'Convênio': show(['drive','orcamento','site','observacoes']); break;
    default: show(['drive','coordenacao','observacoes']); // Contratos, Ordem, etc
  }
}

async function onSubmitGerar(e) {
  e.preventDefault();
  const btn = document.getElementById('btnGerar');
  const dados = Object.fromEntries(new FormData(e.target));
  
  btn.disabled = true; btn.innerHTML = 'Gerando...';

  try {
    const resp = await apiPost('/api/gerar', dados);
    const { numero, ano, tipo } = resp.dados;

    await Swal.fire({
      icon: 'success',
      title: 'Gerado!',
      html: `<h3 class="text-primary">${tipo}</h3><div class="display-4 font-weight-bold">${numero}/${ano}</div>`,
      confirmButtonColor: '#0056b3'
    });

    e.target.reset();
    document.getElementById('data').valueAsDate = new Date();
    // Re-aplica coordenação e view
    const user = JSON.parse(localStorage.getItem('agn_usuario') || '{}');
    if(user.coordenacao) {
       const el = document.getElementById('coordenacao');
       Array.from(el.options).forEach(o => { if(o.value === user.coordenacao) el.value = user.coordenacao });
    }
    configCampos('');
    
    // Atualiza a tabelinha lateral
    carregarResumo(); 

  } catch(err) { Swal.fire('Erro', err.message, 'error'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus-circle"></i> Gerar Número'; }
}

async function carregarResumo() {
  try {
    const dados = await apiGet('/api/sequencias');
    
    // Mapa para acesso rápido { "Cotação...": 472, ... }
    const mapa = {};
    dados.forEach(d => mapa[d.tipo] = d.ultimonumero);

    // Lista na ordem desejada
    const ordem = [
      'Cotação de Preços',
      'Pregão Eletrônico',
      'Ata SRP',
      'Credenciamento',
      'Convênio',
      'Ordem de Fornecimento',
      'Contratos',
      'Inexigibilidade',
      'Contrato de Patrocínio',
      'Acordo de Cooperação'
    ];

    const tbody = document.querySelector('#tabelaResumo tbody');
    
    tbody.innerHTML = ordem.map(tipo => {
      const num = mapa[tipo] || 0;
      // Destaque visual se tiver número
      const numHtml = num > 0 ? `<b>${num}</b>` : `<span class="text-muted">0</span>`;
      
      return `
        <tr>
          <td>${tipo}</td>
          <td class="text-right">${numHtml}</td>
        </tr>
      `;
    }).join('');

  } catch(e) { console.error(e); }
}
