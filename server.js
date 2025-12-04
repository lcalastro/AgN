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
    { tipo: 'Cotação de Preços', num: 471 },
    { tipo: 'Pregão Eletrônico', num: 90018 },
    { tipo: 'Ata SRP', num: 24 },
    { tipo: 'Credenciamento', num: 31 },
    { tipo: 'Convênio', num: 0 },
    { tipo: 'Ordem de Fornecimento', num: 506 },
    { tipo: 'Contratos', num: 336 },
    { tipo: 'Inexigibilidade', num: 1 },
    { tipo: 'Contrato de Patrocínio', num: 1 },
    { tipo: 'Acordo de Cooperação', num: 1 }
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
    db.exec(sqlContent);
    fs.unlinkSync(req.file.path);
    
    // LOG APÓS RESTORE (Não será perdido pois o restore não apaga logs se estiverem no SQL, 
    // mas o comando acima insere um log NOVO pós-restore)
    registrarLog(req.usuario.id, 'BACKUP_RESTORE', 'Restaurou banco via SQL.'); 
    
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});


// --- ROTAS DE NEGÓCIO ---

app.post('/api/gerar', verificarToken, (req, res) => {
  const dados = req.body;
  const anoAtual = new Date().getFullYear(); // Pega ano atual
  // Se mudar o ano (2026), o SELECT abaixo não acha registro, então novoNumero = 1.

  if (!dados.tipo || !dados.processo || !dados.objeto) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });

  try {
    const resultado = db.transaction(() => {
      let seq = db.prepare('SELECT ultimonumero FROM sequencias WHERE tipo = ? AND ano = ?').get(dados.tipo, anoAtual);
      let novoNumero = seq ? seq.ultimonumero + 1 : 1; // Se não existir seq para o ano, começa em 1

      if (seq) db.prepare('UPDATE sequencias SET ultimonumero = ? WHERE tipo = ? AND ano = ?').run(novoNumero, dados.tipo, anoAtual);
      else db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)').run(dados.tipo, anoAtual, novoNumero); // Cria novo ano começando do 1 (ou do valor passado se não fosse seq. 1)

      const stmt = db.prepare(`INSERT INTO documentos (tipo, ano, numero, usuario_id, dataregistro, driveid, processo, objeto, divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      
      // Inserindo usuario_id
      const info = stmt.run(
        dados.tipo, anoAtual, novoNumero, req.usuario.id, 
        dados.data, dados.drive, dados.processo, dados.objeto, 
        dados.divulgacaocotacao, dados.publicadosite, dados.contratado, 
        dados.coordenacao, dados.orcamento, dados.observacoes
      );

      registrarLog(req.usuario.id, 'GERAR_NUMERADOR', `Criou ${dados.tipo} #${novoNumero}/${anoAtual}`);
      return { id: info.lastInsertRowid, numero: novoNumero, ano: anoAtual, tipo: dados.tipo };
    })();

    res.json({ sucesso: true, dados: resultado });
  } catch (erro) { res.status(500).json({ erro: 'Erro ao gerar.' }); }
});

// LISTAR (JOIN com usuarios para mostrar nome)
app.get('/api/listar', verificarToken, (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, u.nome as nome_usuario 
      FROM documentos d 
      LEFT JOIN usuarios u ON d.usuario_id = u.id 
      ORDER BY d.id DESC LIMIT 20
    `).all();
    res.json(docs);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// DETALHE (JOIN com usuarios)
app.get('/api/detalhe/:id', verificarToken, (req, res) => {
  try {
    const doc = db.prepare(`
      SELECT d.*, u.nome as nome_usuario 
      FROM documentos d 
      LEFT JOIN usuarios u ON d.usuario_id = u.id 
      WHERE d.id = ?
    `).get(req.params.id);
    if (!doc) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(doc);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// BUSCAR
app.get('/api/buscar', verificarToken, (req, res) => {
  const { limite, numero, ano, processo } = req.query;
  let sql = `SELECT d.*, u.nome as nome_usuario FROM documentos d LEFT JOIN usuarios u ON d.usuario_id = u.id`;
  const p = [], w = [];
  
  if (numero && ano) { w.push('d.numero = ? AND d.ano = ?'); p.push(Number(numero), Number(ano)); }
  else if (processo) { w.push('d.processo LIKE ?'); p.push(`%${processo}%`); }

  if (w.length) sql += ' WHERE ' + w.join(' AND ');
  sql += ' ORDER BY d.id DESC LIMIT ?';
  p.push(limite || 20);

  try { res.json(db.prepare(sql).all(...p)); } catch(e){ res.status(500).json({erro:e.message}); }
});

// ... Resto das rotas (login, usuarios, logs) iguais ao anterior ...
// (Mantive login, usuarios e logs abaixo para não quebrar, mas são iguais)

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(senha, user.senha)) return res.status(401).json({ erro: 'Credenciais inválidas' });
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
  registrarLog(user.id, 'LOGIN', `Entrou: ${user.nome}`);
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, coordenacao: user.coordenacao, role: user.role } });
});

app.get('/api/usuarios', verificarToken, apenasAdmin, (req, res) => { res.json(db.prepare('SELECT id,nome,email,coordenacao,role,criadoem FROM usuarios ORDER BY nome').all()); });
app.post('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  const { nome, email, senha, coordenacao, role } = req.body;
  try { db.prepare('INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?,?,?,?,?)').run(nome, email, bcrypt.hashSync(senha,10), coordenacao, role||'USER'); registrarLog(req.usuario.id,'CRIAR_USER',email); res.json({sucesso:true}); } catch(e){ res.status(400).json({erro:e.message}); }
});
app.put('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  const { nome, email, senha, coordenacao, role } = req.body;
  try {
    if(senha) db.prepare('UPDATE usuarios SET nome=?, email=?, senha=?, coordenacao=?, role=? WHERE id=?').run(nome, email, bcrypt.hashSync(senha,10), coordenacao, role, req.params.id);
    else db.prepare('UPDATE usuarios SET nome=?, email=?, coordenacao=?, role=? WHERE id=?').run(nome, email, coordenacao, role, req.params.id);
    res.json({sucesso:true});
  } catch(e){ res.status(500).json({erro:e.message}); }
});
app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  if(Number(req.params.id)===req.usuario.id) return res.status(400).json({erro:'Erro auto-exclusão'});
  db.prepare('DELETE FROM usuarios WHERE id=?').run(req.params.id); res.json({sucesso:true});
});
app.put('/api/perfil', verificarToken, (req, res) => {
  const { nome, senha, coordenacao } = req.body;
  if(senha) db.prepare('UPDATE usuarios SET nome=?, senha=?, coordenacao=? WHERE id=?').run(nome, bcrypt.hashSync(senha,10), coordenacao, req.usuario.id);
  else db.prepare('UPDATE usuarios SET nome=?, coordenacao=? WHERE id=?').run(nome, coordenacao, req.usuario.id);
  res.json({sucesso:true, usuario: db.prepare('SELECT * FROM usuarios WHERE id=?').get(req.usuario.id)});
});
app.get('/api/logs', verificarToken, (req, res) => { res.json(db.prepare(`SELECT l.*, u.nome FROM logs l LEFT JOIN usuarios u ON l.usuario_id = u.id ORDER BY l.criadoem DESC LIMIT 100`).all()); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('AgN rodando na porta ' + PORT));
