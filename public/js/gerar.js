import { apiPost, apiGet } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row"><div class="col-lg-8"><div class="card card-primary card-outline"><div class="card-header"><h3 class="card-title">Gerar Numerador</h3></div>
    <form id="formAgN"><div class="card-body">
      <div class="row">
        <div class="col-md-4"><div class="form-group"><label>Tipo *</label><select id="tipo" name="tipo" class="form-control" required><option value="">Selecione...</option><option>Cotação de Preços</option><option>Pregão Eletrônico</option><option>Ata SRP</option><option>Credenciamento</option><option>Convênio</option><option>Ordem de Fornecimento</option><option>Contratos</option><option>Inexigibilidade</option><option>Contrato de Patrocínio</option><option>Acordo de Cooperação</option></select></div></div>
        <div class="col-md-3"><div class="form-group"><label>Data *</label><input type="date" id="data" name="data" class="form-control" required></div></div>
        <div class="col-md-5"><div class="form-group"><label>Processo *</label><input type="text" id="processo" name="processo" class="form-control" required></div></div>
      </div>
      <div class="form-group"><label>Objeto *</label><textarea id="objeto" name="objeto" rows="3" class="form-control" required></textarea></div>
      <hr>
      <div class="row">
        <div class="col-md-4 cx" id="cx-drive"><div class="form-group"><label>Drive</label><input type="number" name="drive" class="form-control"></div></div>
        <div class="col-md-4 cx" id="cx-divulgacao"><div class="form-group"><label>Divulgação</label><select name="divulgacaocotacao" class="form-control"><option value="">Selecione...</option><option>E-Mail</option><option>Compras Gov</option></select></div></div>
        <div class="col-md-4 cx" id="cx-site"><div class="form-group"><label>Publicado Site</label><select name="publicadosite" class="form-control"><option>Não</option><option>Sim</option></select></div></div>
        <div class="col-md-6 cx" id="cx-contratado"><div class="form-group"><label>Contratado</label><input type="text" name="contratado" class="form-control"></div></div>
        <div class="col-md-3 cx" id="cx-coordenacao"><div class="form-group"><label>Coordenação</label><input type="text" id="coordenacao" name="coordenacao" class="form-control"></div></div>
        <div class="col-md-3 cx" id="cx-orcamento"><div class="form-group"><label>Orçamento</label><input type="text" name="orcamento" class="form-control"></div></div>
      </div>
      <div class="form-group cx mt-2" id="cx-obs"><label>Observações</label><textarea name="observacoes" rows="2" class="form-control"></textarea></div>
    </div><div class="card-footer text-right"><button type="submit" class="btn btn-primary" id="btnG">Gerar</button></div></form></div></div>
    <div class="col-lg-4"><div class="card"><div class="card-header bg-light">Últimos</div><div class="card-body p-0 table-responsive" style="max-height:600px"><table id="tbHist" class="table table-sm mb-0"><tbody></tbody></table></div></div></div></div>
  `;
  
  document.getElementById('data').valueAsDate = new Date();
  document.getElementById('formAgN').addEventListener('submit', onSubmit);
  document.getElementById('tipo').addEventListener('change', (e) => configCampos(e.target.value));
  
  const user = JSON.parse(localStorage.getItem('agn_usuario')||'{}');
  if(user.coordenacao) document.getElementById('coordenacao').value = user.coordenacao;
  
  configCampos('');
  carregarHist();
}

function configCampos(t) {
  document.querySelectorAll('.cx').forEach(d => d.style.display = 'none');
  if(!t) return;
  
  const show = (ids) => ids.forEach(i => document.getElementById('cx-'+i).style.display='block');
  show(['drive','obs']); // Padrão
  
  if(t.includes('Cotação')) show(['divulgacao','site','orcamento']);
  if(t.includes('Pregão') || t.includes('Credenciamento') || t.includes('Convênio')) show(['site','orcamento']);
  if(t.includes('Contrato') || t.includes('Ata') || t.includes('Ordem') || t.includes('Inex') || t.includes('Acordo')) show(['contratado','coordenacao']);
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btnG');
  btn.disabled=true; btn.innerHTML='...';
  
  try {
    const resp = await apiPost('/api/gerar', Object.fromEntries(new FormData(e.target)));
    const { numero, ano, tipo } = resp.dados;
    
    await Swal.fire({ icon: 'success', title: 'Sucesso', html: `<h3 class="text-primary">${tipo}</h3><div class="display-4">${numero}/${ano}</div>` });
    
    e.target.reset();
    document.getElementById('data').valueAsDate = new Date();
    const user = JSON.parse(localStorage.getItem('agn_usuario')||'{}');
    if(user.coordenacao) document.getElementById('coordenacao').value = user.coordenacao;
    
    configCampos('');
    carregarHist();
  } catch(err) { Swal.fire('Erro', err.message, 'error'); }
  finally { btn.disabled=false; btn.innerHTML='Gerar'; }
}

async function carregarHist() {
  try { 
    const l = await apiGet('/api/listar');
    document.querySelector('#tbHist tbody').innerHTML = l.map(i=>`<tr><td><span class="badge badge-primary">${i.numero}/${i.ano}</span></td><td><small>${i.tipo}</small></td><td><small>${i.processo||''}</small></td></tr>`).join('');
  } catch(e){}
}
