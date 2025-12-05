import { apiGet, toast } from './utils.js';

export async function initConsultar() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-10">
        <div class="card card-primary card-outline">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-search mr-2"></i>Consultar Numeradores</h3>
          </div>
          <div class="card-body">
            <!-- FILTROS -->
            <form id="formBusca" class="mb-4">
              <div class="form-row align-items-end">
                <div class="col-md-3">
                  <label>Número</label>
                  <input type="number" name="numero" class="form-control" placeholder="Ex: 472">
                </div>
                <div class="col-md-3">
                  <label>Ano</label>
                  <input type="number" name="ano" class="form-control" value="${new Date().getFullYear()}">
                </div>
                <div class="col-md-4">
                  <label>Processo SEI</label>
                  <input type="text" name="processo" class="form-control" placeholder="Ex: AGSUS...">
                </div>
                <div class="col-md-2">
                  <button type="submit" class="btn btn-primary btn-block">
                    <i class="fas fa-search"></i> Buscar
                  </button>
                </div>
              </div>
            </form>

            <!-- TABELA -->
            <div class="table-responsive">
              <table class="table table-hover table-striped" id="tabelaResultados">
                <thead>
                  <tr>
                    <th style="width: 120px">Número</th>
                    <th>Tipo</th>
                    <th>Processo</th>
                    <th>Gerado por</th>
                    <th style="width: 100px">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colspan="5" class="text-center text-muted p-4">Utilize os filtros acima ou veja os últimos registros abaixo.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('formBusca').addEventListener('submit', buscarDocumentos);
  
  // Carrega últimos registros ao entrar
  buscarDocumentos();
}

async function buscarDocumentos(e) {
  if (e) e.preventDefault();
  
  const form = document.getElementById('formBusca');
  const params = new URLSearchParams(new FormData(form)).toString();

  const tbody = document.querySelector('#tabelaResultados tbody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Buscando...</td></tr>';

  try {
    // Chama a busca ou listar dependendo se tem filtros (a lógica tá no backend)
    const url = e ? `/api/buscar?${params}` : '/api/listar';
    const lista = await apiGet(url);

    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum registro encontrado.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(doc => `
      <tr>
        <td><span class="badge badge-primary" style="font-size: 1rem">${doc.numero}/${doc.ano}</span></td>
        <td>${doc.tipo}</td>
        <td><small>${doc.processo || '-'}</small></td>
        <td><small class="text-muted"><i class="far fa-user mr-1"></i>${doc.nome_usuario || 'Sistema'}</small></td>
        <td>
          <button class="btn btn-sm btn-info" onclick="verDetalhe(${doc.id})">
            <i class="fas fa-eye"></i> Detalhes
          </button>
        </td>
      </tr>
    `).join('');
    
    // Registra função global para o onclick funcionar
    window.verDetalhe = verDetalhe;

  } catch (erro) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Erro: ${erro.message}</td></tr>`;
  }
}

async function verDetalhe(id) {
  try {
    const doc = await apiGet(`/api/detalhe/${id}`);
    
    // Formatação de valores para visualização
    const publicadoBadge = doc.publicadosite === 'Sim' 
      ? '<span class="badge badge-success">Sim</span>' 
      : '<span class="badge badge-secondary">Não</span>';

    const dataFormatada = new Date(doc.dataregistro || doc.criadoem).toLocaleDateString('pt-BR');
    
    // Construção do HTML do Modal
    const htmlContent = `
      <div class="text-left">
        
        <!-- Cabeçalho do Card -->
        <div class="callout callout-info mb-4">
          <h5 class="text-info font-weight-bold mb-0">${doc.tipo}</h5>
          <span class="display-4 text-dark font-weight-bold" style="font-size: 2.5rem">
            #${doc.numero}/${doc.ano}
          </span>
        </div>

        <!-- Bloco: Informações Principais -->
        <h6 class="text-secondary text-uppercase font-weight-bold border-bottom pb-2 mb-3">
          <i class="fas fa-file-contract mr-2"></i>Dados Principais
        </h6>
        
        <div class="row mb-3">
          <div class="col-md-6 mb-2">
            <label class="small text-muted mb-0">Processo SEI</label>
            <div class="font-weight-bold text-dark">${doc.processo || '-'}</div>
          </div>
          <div class="col-md-6 mb-2">
            <label class="small text-muted mb-0">Data de Registro</label>
            <div class="font-weight-bold text-dark">${dataFormatada}</div>
          </div>
          <div class="col-12">
            <label class="small text-muted mb-0">Objeto</label>
            <div class="p-2 bg-light rounded border text-dark" style="min-height: 60px;">
              ${doc.objeto || 'Sem descrição.'}
            </div>
          </div>
        </div>

        <!-- Bloco: Detalhes Específicos (só mostra se tiver valor) -->
        <h6 class="text-secondary text-uppercase font-weight-bold border-bottom pb-2 mb-3 mt-4">
          <i class="fas fa-list-ul mr-2"></i>Detalhes Específicos
        </h6>
        
        <div class="row">
          ${doc.contratado ? `
            <div class="col-md-12 mb-2">
              <label class="small text-muted mb-0">Contratado / Fornecedor</label>
              <div class="font-weight-bold">${doc.contratado}</div>
            </div>` : ''}

          ${doc.coordenacao ? `
            <div class="col-md-6 mb-2">
              <label class="small text-muted mb-0">Coordenação</label>
              <div class="font-weight-bold">${doc.coordenacao}</div>
            </div>` : ''}

          ${doc.orcamento ? `
            <div class="col-md-6 mb-2">
              <label class="small text-muted mb-0">Orçamento</label>
              <div class="font-weight-bold">${doc.orcamento}</div>
            </div>` : ''}
            
          ${doc.driveid ? `
            <div class="col-md-6 mb-2">
              <label class="small text-muted mb-0">ID Drive</label>
              <div class="font-weight-bold text-primary"><i class="fab fa-google-drive"></i> ${doc.driveid}</div>
            </div>` : ''}

          <div class="col-md-6 mb-2">
             <label class="small text-muted mb-0">Publicado no Site</label>
             <div>${publicadoBadge}</div>
          </div>

           ${doc.divulgacaocotacao ? `
            <div class="col-md-6 mb-2">
              <label class="small text-muted mb-0">Divulgação</label>
              <div>${doc.divulgacaocotacao}</div>
            </div>` : ''}
        </div>

        ${doc.observacoes ? `
          <div class="mt-3">
            <label class="small text-muted mb-0">Observações</label>
            <div class="text-dark small font-italic">${doc.observacoes}</div>
          </div>
        ` : ''}

        <!-- Rodapé: Metadados -->
        <div class="mt-4 pt-3 border-top d-flex justify-content-between text-muted small">
          <span><i class="far fa-user mr-1"></i> Gerado por: <strong>${doc.nome_usuario || 'Sistema'}</strong></span>
          <span>ID Interno: ${doc.id}</span>
        </div>

      </div>
    `;

    Swal.fire({
      html: htmlContent,
      width: '700px',
      showCloseButton: true,
      showConfirmButton: false, // Apenas visualização
      focusConfirm: false
    });

  } catch (e) {
    toast('Erro ao carregar detalhes: ' + e.message, 'error');
  }
}
