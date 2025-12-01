// Headers com token (montados a cada chamada)
function buildHeaders(withJson = false) {
  const token = localStorage.getItem('agn_token');
  const h = {};
  if (withJson) h['Content-Type'] = 'application/json';
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// API calls com tratamento de erro
export async function apiPost(endpoint, data) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(data)
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.erro || 'Erro na API');
  return json;
}

export async function apiGet(endpoint) {
  const resp = await fetch(endpoint, {
    headers: buildHeaders(false)
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.erro || 'Erro na API');
  return json;
}

// Formata data
export function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
}

// Toast simples (sem bootstrap)
export function toast(mensagem, tipo = 'success') {
  alert(mensagem); // simples por enquanto
}
