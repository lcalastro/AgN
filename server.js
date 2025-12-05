const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuração de Upload Temporário
const upload = multer({ dest: 'uploads/' });

const app = express();
// Inicializa o banco SQLite (Arquivo local)
let db = new Database('agndados.db'); 
const SECRET = 'agsus-secret-2025'; 

// Aumenta limite do body para JSON/Dados grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// ==========================================================================
// 1. ESTRUTURA DO BANCO DE DADOS
// ==========================================================================
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
    usuario_id INTEGER, -- Vínculo com quem gerou
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

// ==========================================================================
// 2. INICIALIZAÇÃO DE DADOS (SEED)
// ==========================================================================

// 2.1. Admin Padrão
const emailAdmin = 'luis.calastro@agenciasus.org.br';
try {
  const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailAdmin);
  if (!userCheck) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`
      INSERT INTO usuarios (nome, email, senha, coordenacao, role) 
      VALUES (?, ?, ?, ?, ?)
    `).run('Luis Calastro (Admin)', emailAdmin, hash, 'ADM', 'ADMIN');
    console.log('>>> Admin Padrão Criado:', emailAdmin);
  } else {
    // Garante permissão de Admin caso tenha sido alterada
    db.prepare("UPDATE usuarios SET role = 'ADMIN' WHERE email = ?").run(emailAdmin);
  }
} catch (e) {
  console.error('Erro ao verificar admin:', e);
}

// 2.2. Inicialização dos Numeradores 2025
// Insere apenas se não houver registros para 2025 ainda.
const checkSeq = db.prepare('SELECT COUNT(*) as c FROM sequencias WHERE ano = 2025').get().c;

if (checkSeq === 0) {
  const initSeqs = db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)');
  
  // Valores fornecidos para inicialização (Último número utilizado)
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

  const insertTransaction = db.transaction(() => {
    sequenciasIniciais.forEach(s => {
      initSeqs.run(s.tipo, 2025, s.num);
    });
  });

  try {
    insertTransaction();
    console.log('>>> Sequências 2025 inicializadas com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar sequências:', err);
  }
}

// ==========================================================================
// 3. MIDDLEWARES & HELPERS
// ==========================================================================

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
  try {
    const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.usuario.id);
    if (user && user.role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ erro: 'Acesso negado. Requer perfil Administrador.' });
    }
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao verificar permissão.' });
  }
};

const registrarLog = (usuarioId, acao, detalhes = '') => {
  try {
    db.prepare('INSERT INTO logs (usuario_id, acao, detalhes, ip) VALUES (?, ?, ?, ?)').run(usuarioId, acao, detalhes, '127.0.0.1');
  } catch (e) { console.error('Erro log:', e); }
};

const sqlEscape = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return `'${String(val).replace(/'/g, "''")}'`;
};

// ==========================================================================
// 4. ROTAS DE BACKUP & RESTORE (SQL DUMP)
// ==========================================================================

app.get('/api/backup', verificarToken, apenasAdmin, (req, res) => {
  try {
    let sqlDump = `-- Backup AgN: ${new Date().toISOString()}\n-- Gerado automaticamente\n\nBEGIN TRANSACTION;\n\n`;
    
    // Limpeza
    sqlDump += `DELETE FROM sequencias;\nDELETE FROM documentos;\nDELETE FROM logs;\nDELETE FROM usuarios;\n\n`;

    // Dados
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

    // Ajuste Sequence
    sqlDump += `\nDELETE FROM sqlite_sequence;\n`;
    ['usuarios', 'documentos', 'logs'].forEach(t => {
       try {
         const maxId = db.prepare(`SELECT MAX(id) as m FROM ${t}`).get().m || 0;
         sqlDump += `INSERT INTO sqlite_sequence (name, seq) VALUES ('${t}', ${maxId});\n`;
       } catch (e) {}
    });

    sqlDump += `\nCOMMIT;\n`;

    registrarLog(req.usuario.id, 'BACKUP_EXPORT', 'Realizou download do backup SQL.');

    const filename = `agn_backup_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(sqlDump);

  } catch (e) {
    res.status(500).json({ erro: 'Erro ao gerar SQL: ' + e.message });
  }
});

app.post('/api/restore', verificarToken, apenasAdmin, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado.' });

  try {
    const sqlContent = fs.readFileSync(req.file.path, 'utf-8');
    db.exec(sqlContent);
    fs.unlinkSync(req.file.path);
    
    registrarLog(req.usuario.id, 'BACKUP_RESTORE', 'Restaurou o banco via SQL.');
    res.json({ sucesso: true, mensagem: 'Dados restaurados com sucesso!' });
  } catch (e) {
    console.error('Erro Restore:', e);
    res.status(500).json({ erro: 'Erro ao executar SQL: ' + e.message });
  }
});

// ==========================================================================
// 5. ROTAS DE NEGÓCIO (GERADOR)
// ==========================================================================

// NOVA ROTA: Resumo das Sequências (Dashboard)
app.get('/api/sequencias', verificarToken, (req, res) => {
  try {
    const anoAtual = new Date().getFullYear();
    const lista = db.prepare('SELECT tipo, ultimonumero FROM sequencias WHERE ano = ?').all(anoAtual);
    res.json(lista);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/api/gerar', verificarToken, (req, res) => {
  const dados = req.body;
  const anoAtual = new Date().getFullYear();

  if (!dados.tipo || !dados.processo || !dados.objeto) return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });

  try {
    const resultado = db.transaction(() => {
      // Busca sequência atual
      let seq = db.prepare('SELECT ultimonumero FROM sequencias WHERE tipo = ? AND ano = ?').get(dados.tipo, anoAtual);
      
      // Se existe, soma 1. Se não, começa do 1.
      let novoNumero = seq ? seq.ultimonumero + 1 : 1;

      if (seq) {
        db.prepare('UPDATE sequencias SET ultimonumero = ? WHERE tipo = ? AND ano = ?').run(novoNumero, dados.tipo, anoAtual);
      } else {
        db.prepare('INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (?, ?, ?)').run(dados.tipo, anoAtual, novoNumero);
      }

      const stmt = db.prepare(`
        INSERT INTO documentos (
          tipo, ano, numero, usuario_id, dataregistro, driveid, processo, objeto,
          divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        dados.tipo, anoAtual, novoNumero, req.usuario.id, // <--- Vincula ID do usuário
        dados.data || new Date().toISOString().split('T')[0],
        dados.drive || null, dados.processo, dados.objeto,
        dados.divulgacaocotacao || null, dados.publicadosite || 'Não',
        dados.contratado || null, dados.coordenacao || null,
        dados.orcamento || null, dados.observacoes || null
      );

      registrarLog(req.usuario.id, 'GERAR_NUMERADOR', `Criou ${dados.tipo} #${novoNumero}/${anoAtual}`);
      
      return { id: info.lastInsertRowid, numero: novoNumero, ano: anoAtual, tipo: dados.tipo };
    })();

    res.json({ sucesso: true, dados: resultado });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao gerar número.' });
  }
});

// LISTAR (Com JOIN para pegar nome do usuário)
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

// DETALHE (Com JOIN)
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
  try {
    let sql = `SELECT d.*, u.nome as nome_usuario FROM documentos d LEFT JOIN usuarios u ON d.usuario_id = u.id`;
    const params = [];
    const where = [];

    if (numero && ano) {
      where.push('d.numero = ? AND d.ano = ?');
      params.push(Number(numero), Number(ano));
    } else if (processo) {
      where.push('d.processo LIKE ?');
      params.push(`%${processo}%`);
    }

    if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY d.id DESC LIMIT ?';
    params.push(limite ? Number(limite) : 20);

    const lista = db.prepare(sql).all(...params);
    res.json(lista);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ==========================================================================
// 6. ROTAS DE ADMINISTRAÇÃO (USUÁRIOS, LOGS, AUTH)
// ==========================================================================

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

// Rotas de Usuários (CRUD Admin)
app.get('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  try {
    const lista = db.prepare('SELECT id, nome, email, coordenacao, role, criadoem FROM usuarios ORDER BY nome').all();
    res.json(lista);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/usuarios', verificarToken, apenasAdmin, (req, res) => {
  const { nome, email, senha, coordenacao, role } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });

  try {
    const hash = bcrypt.hashSync(senha, 10);
    db.prepare('INSERT INTO usuarios (nome, email, senha, coordenacao, role) VALUES (?, ?, ?, ?, ?)').run(nome, email, hash, coordenacao || null, role || 'USER');
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
  try {
    if (senha && senha.trim() !== '') {
      const hash = bcrypt.hashSync(senha, 10);
      db.prepare('UPDATE usuarios SET nome = ?, email = ?, senha = ?, coordenacao = ?, role = ? WHERE id = ?').run(nome, email, hash, coordenacao, role, id);
    } else {
      db.prepare('UPDATE usuarios SET nome = ?, email = ?, coordenacao = ?, role = ? WHERE id = ?').run(nome, email, coordenacao, role, id);
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

// Rota Perfil (Auto-Edição)
app.put('/api/perfil', verificarToken, (req, res) => {
  const { nome, senha, coordenacao } = req.body;
  const id = req.usuario.id;
  try {
    if (senha && senha.trim() !== '') {
      const hash = bcrypt.hashSync(senha, 10);
      db.prepare('UPDATE usuarios SET nome = ?, senha = ?, coordenacao = ? WHERE id = ?').run(nome, hash, coordenacao, id);
    } else {
      db.prepare('UPDATE usuarios SET nome = ?, coordenacao = ? WHERE id = ?').run(nome, coordenacao, id);
    }
    registrarLog(id, 'EDITAR_PERFIL', `Alterou os próprios dados.`);
    const user = db.prepare('SELECT id, nome, email, coordenacao, role FROM usuarios WHERE id = ?').get(id);
    res.json({ sucesso: true, usuario: user });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// Logs
app.get('/api/logs', verificarToken, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT l.*, u.nome FROM logs l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.criadoem DESC LIMIT 100
    `).all();
    res.json(logs);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('AgN rodando na porta ' + PORT));
