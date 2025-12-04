const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuração Upload
const upload = multer({ dest: 'uploads/' });
const app = express();
let db = new Database('agndados.db'); 
const SECRET = 'agsus-secret-2025'; 

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// --- 1. CRIAÇÃO/MIGRAÇÃO DE TABELAS ---
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
    usuario_id INTEGER, -- NOVO CAMPO
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

// --- 2. INICIALIZAÇÃO DE SEQUÊNCIAS (2025) ---
// Roda apenas se não existirem sequências para 2025
const checkSeq = db.prepare('SELECT COUNT(*) as c FROM sequencias WHERE ano = 2025').get().c;
if (checkSeq === 0) {
  const initSeqs = db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)');
  const sequenciasIniciais = [
    { tipo: 'Cotação de Preços', num: 472 },
    { tipo: 'Pregão Eletrônico', num: 90019 },
    { tipo: 'Ata SRP', num: 25 },
    { tipo: 'Credenciamento', num: 32 },
    { tipo: 'Convênio', num: 1 },
    { tipo: 'Ordem de Fornecimento', num: 507 },
    { tipo: 'Contratos', num: 337 },
    { tipo: 'Inexigibilidade', num: 2 },
    { tipo: 'Contrato de Patrocínio', num: 2 },
    { tipo: 'Acordo de Cooperação', num: 2 }
  ];

  sequenciasIniciais.forEach(s => {
    initSeqs.run(s.tipo, 2025, s.num);
  });
  console.log('>>> Sequências 2025 inicializadas conforme solicitado.');
}

// --- 3. ADMIN PADRÃO ---
const emailAdmin = 'luis.calastro@agenciasus.org.br';
try {
  const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailAdmin);
  if (!userCheck) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?, ?, ?, ?, ?)`).run('Luis Calastro (Admin)', emailAdmin, hash, 'ADM', 'ADMIN');
  } else {
    db.prepare("UPDATE usuarios SET role = 'ADMIN' WHERE email = ?").run(emailAdmin);
  }
} catch (e) {}

// --- MIDDLEWARES ---
const verificarToken = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token requerido' });
  try { req.usuario = jwt.verify(token, SECRET); next(); } 
  catch { return res.status(401).json({ erro: 'Token inválido' }); }
};

const apenasAdmin = (req, res, next) => {
  try {
    const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (user && user.role === 'ADMIN') next();
    else res.status(403).json({ erro: 'Acesso negado.' });
  } catch(e){ res.status(500).json({ erro: 'Erro auth' }); }
};

const registrarLog = (usuarioId, acao, detalhes = '') => {
  try { db.prepare('INSERT INTO logs (usuario_id, acao, detalhes, ip) VALUES (?, ?, ?, ?)').run(usuarioId, acao, detalhes, '127.0.0.1'); } catch (e) {}
};

const sqlEscape = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return `'${String(val).replace(/'/g, "''")}'`;
};

// --- ROTAS BACKUP/RESTORE ---
app.get('/api/backup', verificarToken, apenasAdmin, (req, res) => {
  try {
    let sqlDump = `-- Backup AgN: ${new Date().toISOString()}\nBEGIN TRANSACTION;\n\n`;
    sqlDump += `DELETE FROM sequencias;\nDELETE FROM documentos;\nDELETE FROM logs;\nDELETE FROM usuarios;\n\n`;

    db.prepare('SELECT * FROM usuarios').all().forEach(u => {
      sqlDump += `INSERT INTO usuarios (id, nome, email, senha, coordenacao, role, criadoem) VALUES (${u.id}, ${sqlEscape(u.nome)}, ${sqlEscape(u.email)}, ${sqlEscape(u.senha)}, ${sqlEscape(u.coordenacao)}, ${sqlEscape(u.role)}, ${sqlEscape(u.criadoem)});\n`;
    });
    db.prepare('SELECT * FROM sequencias').all().forEach(s => {
      sqlDump += `INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (${sqlEscape(s.tipo)}, ${s.ano}, ${s.ultimonumero});\n`;
    });
    db.prepare('SELECT * FROM documentos').all().forEach(d => {
      sqlDump += `INSERT INTO documentos (id, tipo, ano, numero, usuario_id, dataregistro, driveid, processo, objeto, divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes, criadoem) VALUES (${d.id}, ${sqlEscape(d.tipo)}, ${d.ano}, ${d.numero}, ${sqlEscape(d.usuario_id)}, ${sqlEscape(d.dataregistro)}, ${sqlEscape(d.driveid)}, ${sqlEscape(d.processo)}, ${sqlEscape(d.objeto)}, ${sqlEscape(d.divulgacaocotacao)}, ${sqlEscape(d.publicadosite)}, ${sqlEscape(d.contratado)}, ${sqlEscape(d.coordenacao)}, ${sqlEscape(d.orcamento)}, ${sqlEscape(d.observacoes)}, ${sqlEscape(d.criadoem)});\n`;
    });
    db.prepare('SELECT * FROM logs').all().forEach(l => {
      sqlDump += `INSERT INTO logs (id, usuario_id, acao, detalhes, ip, criadoem) VALUES (${l.id}, ${l.usuario_id}, ${sqlEscape(l.acao)}, ${sqlEscape(l.detalhes)}, ${sqlEscape(l.ip)}, ${sqlEscape(l.criadoem)});\n`;
    });

    sqlDump += `\nDELETE FROM sqlite_sequence;\n`;
    ['usuarios', 'documentos', 'logs'].forEach(t => {
       try { sqlDump += `INSERT INTO sqlite_sequence (name, seq) VALUES ('${t}', ${db.prepare(`SELECT MAX(id) as m FROM ${t}`).get().m||0});\n`; } catch(e){}
    });
    sqlDump += `\nCOMMIT;\n`;

    registrarLog(req.usuario.id, 'BACKUP_EXPORT', 'Realizou download do backup SQL.'); // <--- LOG DE BACKUP

    res.setHeader('Content-Disposition', `attachment; filename=agn_backup.sql`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(sqlDump);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/restore', verificarToken, apenasAdmin, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Sem arquivo.' });
  try {
    const sqlContent = fs.readFileSync(req.file.path, 'utf-8');
