const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const db = new Database('agndados.db');
const SECRET = 'agsus-secret-2025'; // Em prod: use env var

app.use(express.json());
app.use(express.static('public'));
app.use('/vendor/adminlte', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));


// Inicializa banco com tabelas novas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    nome TEXT,
    criadoem DATETIME DEFAULT CURRENTTIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    acao TEXT NOT NULL,
    detalhes TEXT,
    ip TEXT,
    criadoem DATETIME DEFAULT CURRENTTIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL, ano INTEGER NOT NULL, numero INTEGER NOT NULL,
    dataregistro TEXT, driveid INTEGER, processo TEXT, objeto TEXT,
    divulgacaocotacao TEXT, publicadosite TEXT, contratado TEXT,
    coordenacao TEXT, orcamento TEXT, observacoes TEXT,
    criadoem DATETIME DEFAULT CURRENTTIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sequencias (
    tipo TEXT, ano INTEGER, ultimonumero INTEGER,
    PRIMARY KEY (tipo, ano)
  );
`);

// USUÁRIO PADRÃO (rode 1x): email: admin@agsus.gov.br | senha: 123456
const userHash = bcrypt.hashSync('123456', 10);
const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@agsus.gov.br');
if (!userCheck) {
  db.prepare('INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)').run(
    'admin@agsus.gov.br', userHash, 'Administrador AgSUS'
  );
}

// MIDDLEWARE: verifica token
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token requerido' });
  
  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido' });
  }
};

// LOG: registra ação
const registrarLog = (usuarioId, acao, detalhes = '') => {
  db.prepare(`
    INSERT INTO logs (usuario_id, acao, detalhes, ip) 
    VALUES (?, ?, ?, ?)
  `).run(usuarioId, acao, detalhes, '127.0.0.1');
};

// 1. LOGIN
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  
  if (!user || !bcrypt.compareSync(senha, user.senha)) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
  registrarLog(user.id, 'LOGIN', `Usuário ${user.nome} acessou`);
  
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email } });
});

// 2. ESQUECI SENHA (envia email - placeholder)
app.post('/api/esqueci-senha', (req, res) => {
  const { email } = req.body;
  // TODO: integrar Nodemailer SMTP AgSUS
  res.json({ mensagem: 'Link de reset enviado para ' + email });
});

// APIs PROTEGIDAS (suas rotas originais + logs)
app.post('/api/gerar', verificarToken, (req, res) => {
  // ... SEU CÓDIGO ATUAL DE GERAR ...
  // Após inserir documento:
  // registrarLog(req.usuario.id, 'GERAR_NUMERADOR', `Criou ${dados.tipo} #${novoNumero}/${anoAtual}`);
  res.json({ sucesso: true });
});

app.get('/api/buscar', verificarToken, (req, res) => {
  // ... SEU CÓDIGO ATUAL DE BUSCAR ...
});

app.get('/api/detalhe/:id', verificarToken, (req, res) => {
  // ... SEU CÓDIGO ATUAL DE DETALHE ...
});

app.get('/api/listar', verificarToken, (req, res) => {
  // ... SEU CÓDIGO ATUAL DE LISTAR ...
});

app.get('/api/logs', verificarToken, (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.nome FROM logs l 
    LEFT JOIN usuarios u ON l.usuario_id = u.id 
    ORDER BY l.criadoem DESC LIMIT 100
  `).all();
  res.json(logs);
});

app.listen(3000, () => console.log('AgN rodando em http://localhost:3000'));
