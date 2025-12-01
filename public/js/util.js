// Headers com token
export const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('agn_token')}`
};

// API calls com tratamento de erro
export async function apiPost(endpoint, data) {
  const resp = await fetch(endpoint, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(data) 
  });
  if (!resp.ok) throw new Error((await resp.json()).erro);
  return resp.json();
}

export async function apiGet(endpoint) {
  const resp = await fetch(endpoint, { headers });
  if (!resp.ok) throw new Error((await resp.json()).erro);
  return resp.json();
}

// Formata data
export function formatarData(data) {
  return new Date(data).toLocaleDateString('pt-BR');
}

// Toast notification
export function toast(mensagem, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${tipo === 'error' ? 'danger' : tipo} border-0`;
  toast.role = 'alert';
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${mensagem}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);
  new bootstrap.Toast(toast).show();
  setTimeout(() => toast.remove(), 5000);
}
