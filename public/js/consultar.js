import { apiGet, toast, formatarData } from './utils.js';

export async function initConsultar() {
  document.getElementById('content').innerHTML = `
    <div class="card card-primary card-outline">
      <div class="card-header">
        <h3 class="card-title">Consultar numeradores</h3>
      </div>
      <div class="card-body">
        <div class="input-group mb-4">
          <input type="text" id="campoBusca" class="form-control" placeholder="Ex: 5/2025 ou AGSUS.007637/2025-93" style="max-width: 400px;">
          <div class="input-group-append">
            <button class="btn btn-primary" onclick="buscarRegistros()">
              <i class="fas fa-search"></i> Buscar
            </button>
          </div>
        </div>
        <div class="table-responsive">
          <table id="tabelaConsulta" class="table table-bordered table-hover">
            <thead class="thead-light">
              <tr><th>Número</th><th>Tipo</th><th>Processo</th><th>Objeto</th><th>Data</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  carregarUltimosConsulta();
}

window.buscarRegistros = async () => {
  const termo = document.getElementById('campoBusca').value.trim();
  try {
    let url = '/api/buscar';
    if (termo) {
      // Sua heurística atual
      if (/^\d+\/\d{4}$/.test(termo)) {
        const [numero, ano] = termo.split('/');
        url += `?numero=${numero}&ano=${ano}`;
      } else {
        url += `?processo=${termo}`;
      }
    } else {
      url += '?limite=20';
    }
    
    const lista = await apiGet(url);
    preencherTabelaConsulta(lista);
  } catch (err) {
    toast('Erro ao buscar: ' + err.message, 'error');
  }
};

async function carregarUltimosConsulta() {
  try {
    const lista = await apiGet('/api/buscar?limite=20');
    preencherTabelaConsulta(lista);
  } catch (err) {
    toast('Erro ao carregar últimos: ' + err.message, 'error');
  }
}

function preencherTabelaConsulta(lista) {
  const tbody = document.querySelector('#tabelaConsulta tbody');
  
  if (!lista?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum registro encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = lista.map(item => {
    const data = item.dataregistro ? formatarData(item.dataregistro) : '-';
    return `
      <tr class="linha-consulta" data-id="${item.id}" style="cursor: pointer;">
        <td><span class="badge badge-primary">${item.numero}/${item.ano}</span></td>
        <td>${item.tipo}</td>
        <td>${item.processo || '-'}</td>
        <td>${item.objeto?.substring(0, 50)}${item.objeto?.length > 50 ? '...' : ''}</td>
        <td>${data}</td>
      </tr>
    `;
  }).join('');

  // Clique para detalhes
  document.querySelectorAll('.linha-consulta').forEach(tr => {
    tr.addEventListener('click', () => abrirDetalhesDocumento(tr.dataset.id));
  });
}

window.abrirDetalhesDocumento = async (id) => {
  try {
    const doc = await apiGet(`/api/detalhe/${id}`);
    
    document.getElementById('content').innerHTML = `
      <div class="card card-primary card-outline">
        <div class="card-header">
          <h3 class="card-title">Detalhes #${doc.numero}/${doc.ano}</h3>
          <div class="card-tools">
            <button class="btn btn-secondary btn-sm" onclick="mostrarView('consultar')">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <p><strong>Número:</strong> <span class="badge badge-primary">${doc.numero}/${doc.ano}</span></p>
              <p><strong>Tipo:</strong> ${doc.tipo}</p>
              <p><strong>Processo:</strong> ${doc.processo || '-'}</p>
              <p><strong>Data:</strong> ${formatarData(doc.dataregistro)}</p>
              <p><strong>Drive ID:</strong> ${doc.driveid || '-'}</p>
            </div>
            <div class="col-md-6">
              <p><strong>Objeto:</strong> ${doc.objeto || '-'}</p>
              <p><strong>Divulgação cotação:</strong> ${doc.divulgacaocotacao || '-'}</p>
              <p><strong>Publicado no site:</strong> ${doc.publicadosite || '-'}</p>
              <p><strong>Contratado:</strong> ${doc.contratado || '-'}</p>
              <p><strong>Coordenação:</strong> ${doc.coordenacao || '-'}</p>
              <p><strong>Orçamento:</strong> ${doc.orcamento || '-'}</p>
              <p><strong>Observações:</strong> ${doc.observacoes || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    toast('Erro ao carregar detalhes: ' + err.message, 'error');
    mostrarView('consultar');
  }
};

window.voltarConsulta = () => mostrarView('consultar');
