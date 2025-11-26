const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ReviewOrchestrator = require('./reviewers/ReviewOrchestrator');

const app = express();
app.use(express.json());

// configuração do multer (pasta temporária)
const upload = multer({ dest: 'uploads/' });


// ----------------------------
// ENDPOINT PRINCIPAL /review
// ----------------------------
app.post('/review', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const docType = req.body.type; // "article" ou "monograph"

        if (!file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        if (!['article', 'monograph'].includes(docType)) {
            return res.status(400).json({ error: "Tipo de documento inválido. Use 'article' ou 'monograph'." });
        }

        // Instancia com o arquivo enviado
        const orchestrator = new ReviewOrchestrator(file.path);

        // Executa a revisão
        const { report } = await orchestrator.review(docType);

        // Estatísticas adicionais
        const stats = await orchestrator.getDocumentStatistics();

        // Remove o arquivo temporário
        fs.unlinkSync(file.path);

        return res.json({
            success: true,
            type: docType,
            scores: report.scores,
            fullReport: report,
            statistics: stats
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao processar arquivo." });
    }
});


// -------------------------------
// Extra: endpoint /quick-review
// -------------------------------
app.post('/quick-review', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const orchestrator = new ReviewOrchestrator(file.path);

        const review = await orchestrator.quickReview();

        fs.unlinkSync(file.path);

        return res.json({
            success: true,
            review
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao realizar quick review." });
    }
});


// Inicia o servidor
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("API rodando na porta " + port));
