import { apiGet, apiPost, toast } from './utils.js';

let editId = null;
export async function initUsuarios() {
  document.getElementById('content').innerHTML = `
    <div class="row"><div class="col-md-4"><div class="card card-primary card-outline"><div class="card-header"><h3 class="card-title">Usuário</h3></div>
    <form id="fUser"><div class="card-body">
      <div class="form-group"><label>Nome</label><input type="text" name="nome" id="nome" class="form-control" required></div>
      <div class="form-group"><label>E-mail</label><input type="email" name="email" id="email" class="form-control" required></div>
      <div class="form-group"><label>Coord.</label><input type="text" name="coordenacao" id="coordenacao" class="form-control"></div>
      <div class="form-group"><label>Perfil</label><select name="role" id="role" class="form-control"><option value="USER">Usuário</option><option value="ADMIN">Admin</option></select></div>
      <div class="form-group"><label>Senha</label><input type="password" name="senha" class="form-control"><small class="text-muted">Vazio p/ manter</small></div>
      <button class="btn btn-success btn-block" id="btnS">Salvar</button> <button type="button" class="btn btn-default btn-block" onclick="resetF()" id="btnC" style="display:none">Cancelar</button>
    </div></form></div></div>
    <div class="col-md-8"><div class="card"><div class="card-body p-0 table-responsive"><table class="table table-hover" id="tbU"><thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Ação</th></tr></thead><tbody></tbody></table></div></div></div></div>
  `;
  document.getElementById('fUser').addEventListener('submit', save);
  window.resetF = reset; window.editU = edit; window.delU = del;
  load();
}

async function load() {
  const l = await apiGet('/api/usuarios');
  const me = JSON.parse(localStorage.getItem('agn_usuario')).id;
  document.querySelector('#tbU tbody').innerHTML = l.map(u => `<tr><td>${u.nome}</td><td>${u.email}</td><td>${u.role}</td><td><button class="btn btn-xs btn-info" onclick="editU('${u.id}','${u.nome}','${u.email}','${u.coordenacao||''}','${u.role}')"><i class="fas fa-pen"></i></button> ${u.id!=me ? `<button class="btn btn-xs btn-danger" onclick="delU(${u.id})"><i class="fas fa-trash"></i></button>`:''}</td></tr>`).join('');
}

function edit(id, n, e, c, r) {
  editId = id;
  document.getElementById('nome').value=n; document.getElementById('email').value=e;
  document.getElementById('coordenacao').value=c; document.getElementById('role').value=r;
  document.getElementById('btnS').innerText='Atualizar'; document.getElementById('btnC').style.display='block';
}

function reset() {
  editId = null; document.getElementById('fUser').reset();
  document.getElementById('btnS').innerText='Salvar'; document.getElementById('btnC').style.display='none';
}

async function save(e) {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  try {
    const url = editId ? `/api/usuarios/${editId}` : '/api/usuarios';
    const m = editId ? 'PUT' : 'POST';
    const token = localStorage.getItem('agn_token');
    const r = await fetch(url, { method: m, headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify(d) });
    if(!r.ok) throw new Error((await r.json()).erro);
    toast('Salvo!'); reset(); load();
  } catch(err){ alert(err.message); }
}

async function del(id) {
  if(!confirm('Excluir?')) return;
  const token = localStorage.getItem('agn_token');
  await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
  toast('Excluído'); load();
}
