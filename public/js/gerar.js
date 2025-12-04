import { apiPost, apiGet, toast } from './utils.js';

export async function initGerar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row">
      <div class="col-lg-8">
        <div class="card card-primary card-outline">
          <div class="card-header"><h3 class="card-title"><i class="fas fa-file-alt mr-2"></i>Gerar Novo Numerador</h3></div>
          <form id="formAgN">
            <div class="card-body">
              <div class="row">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Tipo <span class="text-danger">*</span></label>
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
                  <div class="form-group"><label>Data <span class="text-danger">*</span></label><input type="date" id="data" name="data" class="form-control" required></div>
                </div>
                <div class="col-md-5">
                  <div class="form-group"><label>Processo SEI <span class="text-danger">*</span></label><input type="text" id="processo" name="processo" class="form-control" required></div>
                </div>
              </div>
              <div class="form-group"><label>Objeto <span class="text-danger">*</span></label><textarea id="objeto" name="objeto" rows="3" class="form-control" required></textarea></div>
              <hr>
              <div class="row">
                <div class="col-md-4 campo-extra" id="grupo-drive"><div class="form-group"><label>ID Drive</label><input type="number" id="drive" name="drive" class="form-control"></div></div>
                <div class="col-md-4 campo-extra" id="grupo-divulgacao"><div class="form-group"><label>Divulgação</label><select id="divulgacaocotacao" name="divulgacaocotacao" class="form-control"><option value="">Selecione...</option><option value="E-Mail">E-Mail</option><option value="Compras Gov">Compras Gov</option></select></div></div>
                <div class="col-md-4 campo-extra" id="grupo-site"><div class="form-group"><label>Publicado Site</label><select id="publicadosite" name="publicadosite" class="form-control"><option value="Não">Não</option><option value="Sim">Sim</option></select></div></div>
                <div class="col-md-6 campo-extra" id="grupo-contratado"><div class="form-group"><label>Contratado</label><input type="text" id="contratado" name="contratado" class="form-control"></div></div>
                <div class="col-md-3 campo-extra" id="grupo-coordenacao"><div class="form-group"><label>Coordenação</label><input type="text" id="coordenacao" name="coordenacao" class="form-control"></div></div>
                <div class="col-md-3 campo-extra" id="grupo-orcamento"><div class="form-group"><label>Orçamento</label><input type="text" id="orcamento" name="orcamento" class="form-control"></div></div>
              </div>
              <div class="form-group mt-2 campo-extra" id="grupo-observacoes"><label>Observações</label><textarea id="observacoes" name="observacoes" rows="2" class="form-control"></textarea></div>
            </div>
            <div class="card-footer text-right"><button type="submit" class="btn btn-primary btn-lg" id="btnGerar"><i class="fas fa-plus-circle"></i> Gerar Número</button></div>
          </form>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card"><div class="card-header bg-light"><h3 class="card-title">Últimos Gerados</h3></div><div class="card-body p-0 table-responsive" style="max-height: 600px;"><table id="tabelaHistorico" class="table table-sm table-hover mb-0"><thead><tr><th>Nº</th><th>Tipo</th><th>Processo</th></tr></thead><tbody></tbody></table></div></div>
      </div>
    </div>
  `;

  document.getElementById('data').valueAsDate = new Date();
  document.getElementById('formAgN').addEventListener('submit', onSubmitGerar);
  const selTipo = document.getElementById('tipo');
  selTipo.addEventListener('change', () => configCampos(selTipo.value));
  
  configCampos('');
  preencherCoordenacao();
  carregarHistorico();
}

function preencherCoordenacao() {
  const user = JSON.parse(localStorage.getItem('agn_usuario')||'{}');
  const campo = document.getElementById('coordenacao');
  if (campo && user.coordenacao) campo.value = user.coordenacao;
}

function configCampos(tipo) {
  const ids = ['drive','divulgacao','site','contratado','coordenacao','orcamento','observacoes'];
  ids.forEach(k => document.getElementById('grupo-'+k).style.display='none');
  
  // Lógica simplificada
  if(tipo) {
    const mostrar = (ls) => ls.forEach(k => document.getElementById('grupo-'+k).style.display='block');
    mostrar(['drive','observacoes']); // Padrão pra todos
    if(tipo.includes('Cotação')) mostrar(['divulgacao','site','orcamento']);
    if(tipo.includes('Pregão') || tipo.includes('Credenciamento')) mostrar(['site','orcamento']);
    if(tipo.includes('Contrato') || tipo.includes('Ata') || tipo.includes('Ordem') || tipo.includes('Acordo')) mostrar(['contratado','coordenacao']);
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
      icon: 'success', title: 'Gerado com Sucesso!',
      html: `<div style="font-size:1.2rem"><p class="mb-1 text-muted">Documento:</p><h3 class="text-primary font-weight-bold">${tipo}</h3><div class="display-4 font-weight-bold text-dark mt-3">${numero}/${ano}</div></div>`,
      confirmButtonColor: '#0056b3'
    });

    form.reset();
    document.getElementById('data').valueAsDate = new Date();
    configCampos('');
    preencherCoordenacao();
    carregarHistorico();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus-circle"></i> Gerar Número';
  }
}

async function carregarHistorico() {
  try {
    const lista = await apiGet('/api/listar');
    document.querySelector('#tabelaHistorico tbody').innerHTML = lista.map(i => `<tr><td><span class="badge badge-primary">${i.numero}/${i.ano}</span></td><td><small>${i.tipo}</small></td><td><small>${i.processo||'-'}</small></td></tr>`).join('');
  } catch(e){}
}
