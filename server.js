const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const db = new Database('agndados.db');
const SECRET = 'agsus-secret-2025'; 

app.use(express.json());
app.use(express.static('public'));

// --- 1. CRIAÇÃO DAS TABELAS ---
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    coordenacao TEXT,
    role TEXT DEFAULT 'USER', -- ADMIN ou USER
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

// --- 2. ADMIN PADRÃO ---
const emailAdmin = 'luis.calastro@agenciasus.org.br';
const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailAdmin);

if (!userCheck) {
  const hash = bcrypt.hashSync('123456', 10);
  db.prepare(`
    INSERT INTO usuarios (nome, email, senha, coordenacao, role) 
    VALUES (?, ?, ?, ?, ?)
  `).run('Luis Calastro (Admin)', emailAdmin, hash, 'ADM', 'ADMIN');
  console.log('Admin criado:', emailAdmin);
} else {
  // Garante permissão de admin se já existir
  db.prepare("UPDATE usuarios SET role = 'ADMIN' WHERE email = ?").run(emailAdmin);
}

// --- 3. MIDDLEWARES ---
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

const apenasAdmin = (req, res, next) => {
  const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (user && user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ erro: 'Acesso negado. Requer perfil Administrador.' });
  }
};

const registrarLog = (usuarioId, acao, detalhes = '') => {
  try {
    db.prepare('INSERT INTO logs (usuario_id, acao, detalhes, ip) VALUES (?, ?, ?, ?)').run(usuarioId, acao, detalhes, '127.0.0.1');
  } catch (e) { console.error('Erro log:', e); }
};

// --- 4. ROTAS DE AUTENTICAÇÃO ---

app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  
  if (!user || !bcrypt.compareSync(senha, user.senha)) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '24h' });
  registrarLog(user.id, 'LOGIN', `Usuário ${user.nome} entrou.`);
  
  res.json({ 
    token, 
    usuario: { 
      id: user.id, 
      nome: user.nome, 
      email: user.email,
      coordenacao: user.coordenacao,
      role: user.role 
    } 
  });
});

// --- 5. ROTAS DE USUÁRIOS (ADMIN) ---

app.get('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  try {
    const lista = db.prepare('SELECT id, nome, email, coordenacao, role, criadoem FROM usuarios ORDER BY nome').all();
    res.json(lista);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  const { nome, email, senha, coordenacao, role } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha campos obrigatórios.' });

  try {
    const hash = bcrypt.hashSync(senha, 10);
    db.prepare('INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?, ?, ?, ?, ?)').run(
      nome, email, hash, coordenacao || null, role || 'USER'
    );
    registrarLog(req.usuario.id, 'CRIAR_USUARIO', `Criou: ${email} (${role})`);
    res.json({ sucesso: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    res.status(500).json({ erro: e.message });
  }
});

app.put('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { nome, email, senha, coordenacao, role } = req.body;
  if (!nome || !email) return res.status(400).json({ erro: 'Nome/E-mail obrigatórios.' });

  try {
    if (senha && senha.trim() !== '') {
      const hash = bcrypt.hashSync(senha, 10);
      db.prepare('UPDATE usuarios SET nome = ?, email = ?, senha = ?, coordenacao = ?, role = ? WHERE id = ?')
        .run(nome, email, hash, coordenacao, role, id);
    } else {
      db.prepare('UPDATE usuarios SET nome = ?, email = ?, coordenacao = ?, role = ? WHERE id = ?')
        .run(nome, email, coordenacao, role, id);
    }
    registrarLog(req.usuario.id, 'EDITAR_USUARIO', `Editou ID ${id}`);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.delete('/api/usuarios/:id', verificarToken, apenasAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.usuario.id) return res.status(400).json({ erro: 'Não pode se excluir.' });
  try {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
    registrarLog(req.usuario.id, 'DELETAR_USUARIO', `Deletou ID ${id}`);
    res.json({ sucesso: true });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- 6. ROTA DE MEU PERFIL (AUTO-EDIÇÃO) ---
app.put('/api/perfil', verificarToken, (req, res) => {
  const { nome, senha, coordenacao } = req.body;
  const id = req.usuario.id;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' });

  try {
    if (senha && senha.trim() !== '') {
      const hash = bcrypt.hashSync(senha, 10);
      db.prepare('UPDATE usuarios SET nome = ?, senha = ?, coordenacao = ? WHERE id = ?')
        .run(nome, hash, coordenacao, id);
    } else {
      db.prepare('UPDATE usuarios SET nome = ?, coordenacao = ? WHERE id = ?')
        .run(nome, coordenacao, id);
    }
    registrarLog(id, 'EDITAR_PERFIL', `Alterou os próprios dados.`);
    
    // Retorna dados atualizados
    const user = db.prepare('SELECT id, nome, email, coordenacao, role FROM usuarios WHERE id = ?').get(id);
    res.json({ sucesso: true, usuario: user });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- 7. ROTAS DE DOCUMENTOS (GERAL) ---

app.post('/api/gerar', verificarToken, (req, res) => {
  const dados = req.body;
  const anoAtual = new Date().getFullYear();

  if (!dados.tipo || !dados.processo || !dados.objeto) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });

  try {
    const resultado = db.transaction(() => {
      let seq = db.prepare('SELECT ultimonumero FROM sequencias WHERE tipo = ? AND ano = ?').get(dados.tipo, anoAtual);
      let novoNumero = seq ? seq.ultimonumero + 1 : 1;

      if (seq) db.prepare('UPDATE sequencias SET ultimonumero = ? WHERE tipo = ? AND ano = ?').run(novoNumero, dados.tipo, anoAtual);
      else db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)').run(dados.tipo, anoAtual, 1);

      const stmt = db.prepare(`INSERT INTO documentos (tipo, ano, numero, dataregistro, driveid, processo, objeto, divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      const info = stmt.run(dados.tipo, anoAtual, novoNumero, dados.data || new Date().toISOString().split('T')[0], dados.drive || null, dados.processo, dados.objeto, dados.divulgacaocotacao || null, dados.publicadosite || 'Não', dados.contratado || null, dados.coordenacao || null, dados.orcamento || null, dados.observacoes || null);

      registrarLog(req.usuario.id, 'GERAR_NUMERADOR', `Criou ${dados.tipo} #${novoNumero}/${anoAtual}`);
      return { id: info.lastInsertRowid, numero: novoNumero, ano: anoAtual, tipo: dados.tipo };
    })();

    res.json({ sucesso: true, dados: resultado });
  } catch (erro) { res.status(500).json({ erro: 'Erro ao gerar.' }); }
});

app.get('/api/listar', verificarToken, (req, res) => {
  try {
    const docs = db.prepare('SELECT * FROM documentos ORDER BY id DESC LIMIT 20').all();
    res.json(docs);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/buscar', verificarToken, (req, res) => {
  const { limite, numero, ano, processo } = req.query;
  try {
    let sql = 'SELECT * FROM documentos';
    const params = [];
    const where = [];
    if (numero && ano) { where.push('numero = ? AND ano = ?'); params.push(Number(numero), Number(ano)); } 
    else if (processo) { where.push('processo LIKE ?'); params.push(`%${processo}%`); }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(limite ? Number(limite) : 20);

    const lista = db.prepare(sql).all(...params);
    res.json(lista);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/detalhe/:id', verificarToken, (req, res) => {
  try {
    const doc = db.prepare('SELECT * FROM documentos WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ erro: 'Não encontrado.' });
    res.json(doc);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.get('/api/logs', verificarToken, (req, res) => {
  try {
    const logs = db.prepare(`SELECT l.*, u.nome FROM logs l LEFT JOIN usuarios u ON l.usuario_id = u.id ORDER BY l.criadoem DESC LIMIT 100`).all();
    res.json(logs);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// BLOCO DE IMPORTAÇÃO EXCEL (Se necessário, cole aqui)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('AgN rodando na porta ' + PORT));
