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
// Inicializa o banco. Como é SQLite local, ele cria o arquivo se não existir.
// No Render (free), isso roda num disco efêmero que reseta a cada deploy.
let db = new Database('agndados.db'); 
const SECRET = 'agsus-secret-2025'; 

// Aumenta limite do body para JSON grandes se precisar, embora restore seja via arquivo
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// --- 1. CRIAÇÃO DAS TABELAS (ESTRUTURA) ---
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

// --- 2. USUÁRIO ADMIN PADRÃO (SEMPRE GARANTIDO) ---
const emailAdmin = 'luis.calastro@agenciasus.org.br';
try {
  const userCheck = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(emailAdmin);
  if (!userCheck) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`
      INSERT INTO usuarios (nome, email, senha, coordenacao, role) 
      VALUES (?, ?, ?, ?, ?)
    `).run('Luis Calastro (Admin)', emailAdmin, hash, 'ADM', 'ADMIN');
    console.log('>>> Admin Padrão Criado/Restaurado:', emailAdmin);
  } else {
    // Garante role ADMIN caso tenha mudado
    db.prepare("UPDATE usuarios SET role = 'ADMIN' WHERE email = ?").run(emailAdmin);
  }
} catch (e) {
  console.error('Erro ao verificar admin:', e);
}

// --- 3. MIDDLEWARES DE SEGURANÇA ---
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

// --- 4. ROTAS DE BACKUP E RESTORE (SQL DUMP) ---

// Helper para escapar strings SQL
const sqlEscape = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  // Escapa aspas simples duplicando-as (' -> '')
  return `'${String(val).replace(/'/g, "''")}'`;
};

app.get('/api/backup', verificarToken, apenasAdmin, (req, res) => {
  try {
    // Cabeçalho do arquivo SQL
    let sqlDump = `-- Backup AgN: ${new Date().toISOString()}\n-- Gerado automaticamente pelo sistema\n\nBEGIN TRANSACTION;\n\n`;
    
    // Limpeza prévia (ordem inversa de dependência se houvesse FKs)
    sqlDump += `DELETE FROM sequencias;\nDELETE FROM documentos;\nDELETE FROM logs;\nDELETE FROM usuarios;\n\n`;

    // 1. Usuários
    const users = db.prepare('SELECT * FROM usuarios').all();
    users.forEach(u => {
      sqlDump += `INSERT INTO usuarios (id, nome, email, senha, coordenacao, role, criadoem) VALUES (${u.id}, ${sqlEscape(u.nome)}, ${sqlEscape(u.email)}, ${sqlEscape(u.senha)}, ${sqlEscape(u.coordenacao)}, ${sqlEscape(u.role)}, ${sqlEscape(u.criadoem)});\n`;
    });

    // 2. Sequências
    const seqs = db.prepare('SELECT * FROM sequencias').all();
    seqs.forEach(s => {
      sqlDump += `INSERT INTO sequencias (tipo, ano, ultimonumero) VALUES (${sqlEscape(s.tipo)}, ${s.ano}, ${s.ultimonumero});\n`;
    });

    // 3. Documentos
    const docs = db.prepare('SELECT * FROM documentos').all();
    docs.forEach(d => {
      sqlDump += `INSERT INTO documentos (id, tipo, ano, numero, dataregistro, driveid, processo, objeto, divulgacaocotacao, publicadosite, contratado, coordenacao, orcamento, observacoes, criadoem) VALUES (${d.id}, ${sqlEscape(d.tipo)}, ${d.ano}, ${d.numero}, ${sqlEscape(d.dataregistro)}, ${sqlEscape(d.driveid)}, ${sqlEscape(d.processo)}, ${sqlEscape(d.objeto)}, ${sqlEscape(d.divulgacaocotacao)}, ${sqlEscape(d.publicadosite)}, ${sqlEscape(d.contratado)}, ${sqlEscape(d.coordenacao)}, ${sqlEscape(d.orcamento)}, ${sqlEscape(d.observacoes)}, ${sqlEscape(d.criadoem)});\n`;
    });

    // 4. Logs
    const logs = db.prepare('SELECT * FROM logs').all();
    logs.forEach(l => {
      sqlDump += `INSERT INTO logs (id, usuario_id, acao, detalhes, ip, criadoem) VALUES (${l.id}, ${l.usuario_id}, ${sqlEscape(l.acao)}, ${sqlEscape(l.detalhes)}, ${sqlEscape(l.ip)}, ${sqlEscape(l.criadoem)});\n`;
    });
    
    // 5. Atualizar Sequenciadores Internos (sqlite_sequence) para IDs não colidirem
    sqlDump += `\nDELETE FROM sqlite_sequence;\n`;
    ['usuarios', 'documentos', 'logs'].forEach(t => {
       try {
         const maxId = db.prepare(`SELECT MAX(id) as m FROM ${t}`).get().m || 0;
         sqlDump += `INSERT INTO sqlite_sequence (name, seq) VALUES ('${t}', ${maxId});\n`;
       } catch (e) {}
    });

    sqlDump += `\nCOMMIT;\n`;

    const filename = `agn_backup_${new Date().toISOString().split('T')[0]}.sql`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'text/plain');
    res.send(sqlDump);

  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao gerar SQL: ' + e.message });
  }
});

app.post('/api/restore', verificarToken, apenasAdmin, upload.single('backup'), (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Arquivo não enviado.' });

  try {
    const sqlContent = fs.readFileSync(req.file.path, 'utf-8');
    
    // Executa o script SQL inteiro de uma vez
    db.exec(sqlContent);

    fs.unlinkSync(req.file.path); // Limpa temp
    
    // Opcional: Registrar log de quem fez o restore (tem que ser depois do exec, pois o exec deleta logs)
    registrarLog(req.usuario.id, 'RESTORE_BACKUP', 'Restaurou o banco de dados via SQL.');

    res.json({ sucesso: true, mensagem: 'Dados restaurados com sucesso!' });
  } catch (e) {
    console.error('Erro Restore:', e);
    res.status(500).json({ erro: 'Erro ao executar SQL: ' + e.message });
  }
});


// --- 5. ROTAS DE AUTENTICAÇÃO ---

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

// --- 6. ROTAS DE USUÁRIOS (ADMIN) ---

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

// --- 7. ROTA DE PERFIL (AUTO-EDIÇÃO) ---
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
    
    const user = db.prepare('SELECT id, nome, email, coordenacao, role FROM usuarios WHERE id = ?').get(id);
    res.json({ sucesso: true, usuario: user });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// --- 8. ROTAS DE DOCUMENTOS (GERAL) ---

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

// IMPORTAÇÃO EXCEL MANUAL (Se precisar no futuro, insira aqui)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('AgN rodando na porta ' + PORT));
