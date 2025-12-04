const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Config upload
const upload = multer({ dest: 'uploads/' });

const app = express();
let db = new Database('agndados.db'); // 'let' para permitir reconexão no restore
const SECRET = 'agsus-secret-2025'; 

app.use(express.json());
app.use(express.static('public'));

// --- CRIAÇÃO DE TABELAS ---
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    coordenacao TEXT,
    role TEXT DEFAULT 'USER',
    criadoem DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    acao TEXT NOT NULL,
    detalhes TEXT,
    ip TEXT,
    criadoem DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    ano INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    dataregistro TEXT,
    driveid INTEGER,
    processo TEXT,
    objeto TEXT,
    divulgacaocotacao TEXT,
    publicadosite TEXT,
    contratado TEXT,
    coordenacao TEXT,
    orcamento TEXT,
    observacoes TEXT,
    criadoem DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sequencias (
    tipo TEXT,
    ano INTEGER,
    ultimonumero INTEGER,
    PRIMARY KEY (tipo, ano)
  );
`);

// --- ADMIN PADRÃO ---
const emailAdmin = 'luis.calastro@agenciasus.org.br';
try {
  const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailAdmin);
  if (!userCheck) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?, ?, ?, ?, ?)`).run('Luis Calastro (Admin)', emailAdmin, hash, 'ADM', 'ADMIN');
    console.log('Admin criado.');
  } else {
    db.prepare("UPDATE usuarios SET role = 'ADMIN' WHERE email = ?").run(emailAdmin);
  }
} catch(e) { console.error('Erro init admin:', e); }

// --- MIDDLEWARES ---
const verificarToken = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token requerido' });
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch { return res.status(401).json({ erro: 'Token inválido' }); }
};

const apenasAdmin = (req, res, next) => {
  const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (user && user.role === 'ADMIN') next();
  else res.status(403).json({ erro: 'Acesso negado.' });
};

const registrarLog = (usuarioId, acao, detalhes = '') => {
  try { db.prepare('INSERT INTO logs (usuario_id, acao, detalhes, ip) VALUES (?, ?, ?, ?)').run(usuarioId, acao, detalhes, '127.0.0.1'); } catch (e) {}
};

// --- ROTAS BACKUP/RESTORE ---
app.get('/api/backup', verificarToken, apenasAdmin, (req, res) => {
  const dbPath = 'agndados.db';
  if (fs.existsSync(dbPath)) res.download(dbPath, `agn_backup_${new Date().toISOString().split('T')[0]}.db`);
  else res.status(404).json({ erro: 'Banco não encontrado.' });
});

app.post('/api/restore', verificarToken, apenasAdmin, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado.' });
  try {
    db.close(); // Fecha conexão atual
    fs.copyFileSync(req.file.path, 'agndados.db'); // Substitui
    fs.unlinkSync(req.file.path); // Limpa temp
    
    // Reinicia processo para recarregar conexão limpa
    res.json({ sucesso: true });
    setTimeout(() => process.exit(0), 500); 
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// --- ROTAS AUTH ---
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(senha, user.senha)) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
  registrarLog(user.id, 'LOGIN', `Entrou: ${user.nome}`);
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, coordenacao: user.coordenacao, role: user.role } });
});

// --- ROTAS USUARIOS ---
app.get('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  try { res.json(db.prepare('SELECT id, nome, email, coordenacao, role, criadoem FROM usuarios ORDER BY nome').all()); } catch(e){ res.status(500).json({erro:e.message}); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  const { nome, email, senha, coordenacao, role } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Campos faltantes.' });
  try {
    const hash = bcrypt.hashSync(senha, 10);
    db.prepare('INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?, ?, ?, ?, ?)').run(nome, email, hash, coordenacao, role||'USER');
    registrarLog(req.usuario.id, 'CRIAR_USER', email);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, senha, coordenacao, role } = req.body;
  try {
    if (senha && senha.trim()) db.prepare('UPDATE usuarios SET nome=?, email=?, senha=?, coordenacao=?, role=? WHERE id=?').run(nome, email, bcrypt.hashSync(senha, 10), coordenacao, role, id);
    else db.prepare('UPDATE usuarios SET nome=?, email=?, coordenacao=?, role=? WHERE id=?').run(nome, email, coordenacao, role, id);
    registrarLog(req.usuario.id, 'EDITAR_USER', `ID ${id}`);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) return res.status(400).json({ erro: 'Não pode se auto-excluir.' });
  try {
    db.prepare('DELETE FROM usuarios WHERE id=?').run(id);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.put('/api/perfil', verificarToken, (req, res) => {
  const { nome, senha, coordenacao } = req.body;
  const id = req.usuario.id;
  try {
    if (senha && senha.trim()) db.prepare('UPDATE usuarios SET nome=?, senha=?, coordenacao=? WHERE id=?').run(nome, bcrypt.hashSync(senha, 10), coordenacao, id);
    else db.prepare('UPDATE usuarios SET nome=?, coordenacao=? WHERE id=?').run(nome, coordenacao, id);
    res.json({ sucesso: true, usuario: db.prepare('SELECT id,nome,email,coordenacao,role FROM usuarios WHERE id=?').get(id) });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- ROTAS DOCUMENTOS ---
app.post('/api/gerar', verificarToken, (req, res) => {
  const dados = req.body;
  const ano = new Date().getFullYear();
  if (!dados.tipo || !dados.processo || !dados.objeto) return res.status(400).json({ erro: 'Campos faltantes.' });

  try {
    const resultado = db.transaction(() => {
      let seq = db.prepare('SELECT ultimonumero FROM sequencias WHERE tipo=? AND ano=?').get(dados.tipo, ano);
      let novo = seq ? seq.ultimonumero + 1 : 1;
      if (seq) db.prepare('UPDATE sequencias SET ultimonumero=? WHERE tipo=? AND ano=?').run(novo, dados.tipo, ano);
      else db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)').run(dados.tipo, ano, 1);

      const info = db.prepare(`INSERT INTO documentos (tipo, ano, numero, dataregistro, driveid, processo, objeto, divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        dados.tipo, ano, novo, dados.data, dados.drive, dados.processo, dados.objeto, dados.divulgacaocotacao, dados.publicadosite, dados.contratado, dados.coordenacao, dados.orcamento, dados.observacoes
      );
      registrarLog(req.usuario.id, 'GERAR', `${dados.tipo} #${novo}`);
      return { id: info.lastInsertRowid, numero: novo, ano, tipo: dados.tipo };
    })();
    res.json({ sucesso: true, dados: resultado });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/listar', verificarToken, (req, res) => {
  try { res.json(db.prepare('SELECT * FROM documentos ORDER BY id DESC LIMIT 20').all()); } catch (e) { res.status(500).json({erro:e.message}); }
});

app.get('/api/buscar', verificarToken, (req, res) => {
  const { limite, numero, ano, processo } = req.query;
  let sql = 'SELECT * FROM documentos';
  const p = [], w = [];
  if (numero && ano) { w.push('numero=? AND ano=?'); p.push(numero, ano); }
  else if (processo) { w.push('processo LIKE ?'); p.push(`%${processo}%`); }
  if (w.length) sql += ' WHERE ' + w.join(' AND ');
  sql += ' ORDER BY id DESC LIMIT ?';
  p.push(limite || 20);
  try { res.json(db.prepare(sql).all(...p)); } catch(e){ res.status(500).json({erro:e.message}); }
});

app.get('/api/detalhe/:id', verificarToken, (req, res) => {
  try { res.json(db.prepare('SELECT * FROM documentos WHERE id=?').get(req.params.id)); } catch(e){ res.status(500).json({erro:e.message}); }
});

app.get('/api/logs', verificarToken, (req, res) => {
  try { res.json(db.prepare('SELECT l.*, u.nome FROM logs l LEFT JOIN usuarios u ON l.usuario_id = u.id ORDER BY l.criadoem DESC LIMIT 100').all()); } catch(e){ res.status(500).json({erro:e.message}); }
});

app.listen(process.env.PORT || 3000, () => console.log('AgN rodando...'));
