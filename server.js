const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
const db = new Database('agn_dados.db');

app.use(express.json());
app.use(express.static('public'));

// 1. Inicializa Banco de Dados
db.exec(`
  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    ano INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    
    data_registro TEXT,
    drive_id INTEGER,
    processo TEXT,
    objeto TEXT,
    
    divulgacao_cotacao TEXT,
    publicado_site TEXT,
    contratado TEXT,
    coordenacao TEXT,
    orcamento TEXT,
    
    observacoes TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sequencias (
    tipo TEXT,
    ano INTEGER,
    ultimo_numero INTEGER,
    PRIMARY KEY (tipo, ano)
  );
`);

// 2. API: Gerar Novo Número
app.post('/api/gerar', (req, res) => {
    const dados = req.body;
    const anoAtual = new Date().getFullYear();

    if (!dados.tipo || !dados.processo || !dados.objeto) {
        return res.status(400).json({ erro: "Preencha Tipo, Processo e Objeto." });
    }

    try {
        const resultado = db.transaction(() => {
            let seq = db.prepare(
                'SELECT ultimo_numero FROM sequencias WHERE tipo = ? AND ano = ?'
            ).get(dados.tipo, anoAtual);
            
            let novoNumero = 1;
            if (seq) {
                novoNumero = seq.ultimo_numero + 1;
                db.prepare(
                    'UPDATE sequencias SET ultimo_numero = ? WHERE tipo = ? AND ano = ?'
                ).run(novoNumero, dados.tipo, anoAtual);
            } else {
                db.prepare(
                    'INSERT INTO sequencias (tipo, ano, ultimo_numero) VALUES (?, ?, ?)'
                ).run(dados.tipo, anoAtual, 1);
            }

            const stmt = db.prepare(`
                INSERT INTO documentos (
                    tipo, ano, numero, data_registro, drive_id, processo, objeto,
                    divulgacao_cotacao, publicado_site, contratado, coordenacao, orcamento, observacoes
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
                dados.divulgacao_cotacao || null,
                dados.publicado_site || 'Não',
                dados.contratado || null,
                dados.coordenacao || null,
                dados.orcamento || null,
                dados.observacoes || null
            );

            return {
                id: info.lastInsertRowid,
                numero: novoNumero,
                ano: anoAtual,
                tipo: dados.tipo
            };
        });

        res.json({ sucesso: true, dados: resultado() });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao gerar número no banco de dados." });
    }
});

// 3. API: Listar Últimos (Histórico)
app.get('/api/listar', (req, res) => {
    try {
        const docs = db.prepare(
            'SELECT * FROM documentos ORDER BY id DESC LIMIT 20'
        ).all();
        res.json(docs);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao listar documentos." });
    }
});

// 4. API: Buscar (Consulta)
app.get('/api/buscar', (req, res) => {
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
        res.status(500).json({ erro: "Erro ao buscar documentos." });
    }
});

// 5. API Detalhe de um documento
app.get('/api/detalhe/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    const stmt = db.prepare('SELECT * FROM documentos WHERE id = ?');
    const doc = stmt.get(id);

    if (!doc) {
      return res.status(404).json({ erro: 'Documento não encontrado.' });
    }

    res.json(doc);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar detalhes do documento.' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AgN rodando na porta ${PORT}`);
});
