const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const db = new Database('agndados.db');
const SECRET = 'agsus-secret-2025'; // em produção use variável de ambiente

app.use(express.json());
app.use(express.static('public'));

// (Opcional: se um dia voltar a servir AdminLTE local)
// app.use('/vendor/adminlte', express.static(path.join(__dirname, 'node_modules/admin-lte/dist')));

// 1. Inicializa banco
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    nome TEXT,
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

// Usuário padrão (admin@agsus.gov.br / 123456)
const userHash = bcrypt.hashSync('123456', 10);
const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@agsus.gov.br');
if (!userCheck) {
  db.prepare('INSERT INTO usuarios (email, senha, nome) VALUES (?, ?, ?)').run(
    'admin@agsus.gov.br',
    userHash,
    'Administrador AgSUS'
  );
}

// Middleware token
const verificarToken = (req, res, next) => {
  const header = req.headers['authorization'] || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ erro: 'Token requerido' });

  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido' });
  }
};

// Logs
const registrarLog = (usuarioId, acao, detalhes = '') => {
  db.prepare(
    'INSERT INTO logs (usuario_id, acao, detalhes, ip) VALUES (?, ?, ?, ?)'
  ).run(usuarioId, acao, detalhes, '127.0.0.1');
};

// 2. LOGIN
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const ok = bcrypt.compareSync(senha, user.senha);
  if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
  registrarLog(user.id, 'LOGIN', `Usuário ${user.nome} acessou`);

  res.json({
    token,
    usuario: { id: user.id, nome: user.nome, email: user.email }
  });
});

// 3. Esqueci senha (placeholder)
app.post('/api/esqueci-senha', (req, res) => {
  const { email } = req.body;
  // aqui você integraria SMTP
  res.json({ mensagem: 'Se o e-mail estiver cadastrado, um link de reset será enviado.' });
});

// 4. GERAR NUMERADOR
app.post('/api/gerar', verificarToken, (req, res) => {
  const dados = req.body;
  const anoAtual = new Date().getFullYear();

  if (!dados.tipo || !dados.processo || !dados.objeto) {
    return res.status(400).json({ erro: 'Preencha Tipo, Processo e Objeto.' });
  }

  try {
    const resultado = db.transaction(() => {
      let seq = db
        .prepare('SELECT ultimonumero FROM sequencias WHERE tipo = ? AND ano = ?')
        .get(dados.tipo, anoAtual);

      let novoNumero = 1;
      if (seq) {
        novoNumero = seq.ultimonumero + 1;
        db.prepare(
          'UPDATE sequencias SET ultimonumero = ? WHERE tipo = ? AND ano = ?'
        ).run(novoNumero, dados.tipo, anoAtual);
      } else {
        db.prepare(
          'INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)'
        ).run(dados.tipo, anoAtual, 1);
      }

      const stmt = db.prepare(`
        INSERT INTO documentos (
          tipo, ano, numero, dataregistro, driveid, processo, objeto,
          divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        dados.tipo,
        anoAtual,
        novoNumero,
        dados.data || new Date().toISOString().split('T')[0],
        dados.drive || null,
        dados.processo,
        dados.objeto,
        dados.divulgacaocotacao || null,
        dados.publicadosite || 'Não',
        dados.contratado || null,
        dados.coordenacao || null,
        dados.orcamento || null,
        dados.observacoes || null
      );

      registrarLog(req.usuario.id, 'GERAR_NUMERADOR', `Criou ${dados.tipo} #${novoNumero}/${anoAtual}`);

      return {
        id: info.lastInsertRowid,
        numero: novoNumero,
        ano: anoAtual,
        tipo: dados.tipo
      };
    })();

    res.json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao gerar número no banco de dados.' });
  }
});

// 5. LISTAR (Histórico)
app.get('/api/listar', verificarToken, (req, res) => {
  try {
    const docs = db
      .prepare('SELECT * FROM documentos ORDER BY id DESC LIMIT 20')
      .all();
    res.json(docs);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao listar documentos.' });
  }
});

// 6. BUSCAR (Consulta)
app.get('/api/buscar', verificarToken, (req, res) => {
  const { limite, numero, ano, processo } = req.query;

  try {
    let sql = 'SELECT * FROM documentos';
    const params = [];
    const where = [];

    if (numero && ano) {
      where.push('numero = ? AND ano = ?');
      params.push(Number(numero), Number(ano));
    } else if (processo) {
      where.push('processo LIKE ?');
      params.push(`%${processo}%`);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY id DESC';
    const lim = limite ? Number(limite) : 20;
    sql += ' LIMIT ?';
    params.push(lim);

    const lista = db.prepare(sql).all(...params);
    res.json(lista);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar documentos.' });
  }
});

// 7. DETALHE
app.get('/api/detalhe/:id', verificarToken, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const doc = db.prepare('SELECT * FROM documentos WHERE id = ?').get(id);
    if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
    res.json(doc);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar detalhes do documento.' });
  }
});

// 8. LOGS
app.get('/api/logs', verificarToken, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT l.*, u.nome 
      FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.criadoem DESC
