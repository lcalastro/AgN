const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const app = express();
const db = new Database('agn_dados.db');

app.use(express.json());
app.use(express.static('public'));

// 1. Inicializa Banco de Dados
// Criamos uma tabela "super" com todos os campos possíveis.
db.exec(`
  CREATE TABLE IF NOT EXISTS documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,          -- Ex: 'Cotação de Preços'
    ano INTEGER NOT NULL,
    numero INTEGER NOT NULL,
    
    data_registro TEXT,          -- Data do documento
    drive_id INTEGER,            -- Campo 'Drive' (Numérico)
    processo TEXT,               -- Processo SEI/Admin
    objeto TEXT,                 -- Descrição longa
    
    -- Campos Específicos
    divulgacao_cotacao TEXT,     -- Email ou Compras Gov
    publicado_site TEXT,         -- Sim ou Não
    contratado TEXT,             -- Para Ata SRP
    coordenacao TEXT,            -- Para Ata, Contratos, etc.
    orcamento TEXT,              -- Para Credenciamento/Convênio
    
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
    const anoAtual = new Date().getFullYear(); // Usa o ano atual do servidor

    // Validação básica de campos obrigatórios comuns
    if (!dados.tipo || !dados.processo || !dados.objeto) {
        return res.status(400).json({ erro: "Preencha Tipo, Processo e Objeto." });
    }

    try {
        const resultado = db.transaction(() => {
            // 1. Busca/Incrementa Sequência
            let seq = db.prepare('SELECT ultimo_numero FROM sequencias WHERE tipo = ? AND ano = ?').get(dados.tipo, anoAtual);
            
            let novoNumero = 1;
            if (seq) {
                novoNumero = seq.ultimo_numero + 1;
                db.prepare('UPDATE sequencias SET ultimo_numero = ? WHERE tipo = ? AND ano = ?').run(novoNumero, dados.tipo, anoAtual);
            } else {
                db.prepare('INSERT INTO sequencias (tipo, ano, ultimo_numero) VALUES (?, ?, ?)').run(dados.tipo, anoAtual, 1);
            }

            // 2. Insere Documento (Mapeando campos do request)
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
                dados.data || new Date().toISOString().split('T')[0], // Data de hoje se não vier
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

            return { id: info.lastInsertRowid, numero: novoNumero, ano: anoAtual, tipo: dados.tipo };
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
        const docs = db.prepare('SELECT * FROM documentos ORDER BY id DESC LIMIT 20').all();
        res.json(docs);
    } catch (erro) {
        res.status(500).json({ erro: "Erro ao listar documentos." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AgN rodando na porta ${PORT}`);
});
