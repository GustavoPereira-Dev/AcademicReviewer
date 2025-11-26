const BaseReviewer = require("./BaseReviewer");
const ABNTRulesEngine = require("./ABNTRulesEngine");
const ReferenceReviewer = require("./ReferenceReviewer");

class MonographReviewer extends BaseReviewer {
  constructor(documentData, abntRules) {
    super(documentData, abntRules);
    this.rulesEngine = new ABNTRulesEngine(abntRules);
    this.referenceReviewer = new ReferenceReviewer(documentData.references);
    this.requiredSections = [
      ["INTRODUÇÃO"],
      ["Teórico", "Teórica", "Fundamentação ou Referencial Teórico"],
      ["Desenvolvimento"],
      ["Considerações", "Conclusão", "Considerações Finais ou Conclusão"],
      ["REFERÊNCIAS"],
    ];
    this.alinhamentoTexto = {
      justify: "justificado",
      center: "centralizado",
      left: "esquerda",
      right: "direita",
    }

    this.espacamentoLinhas = {
       '150%': '1,5 linhas',
       '100': 'simples',
       default: "múltiplos"
    }

    this.recuoParagrafo = {
       '35.4pt': '1,25 cm',
       '0pt': '0 cm',
       default: "múltiplos"
    }
  }
  
  review() {
    console.log("\n🔍 Iniciando revisão de MONOGRAFIA...\n");

    this.validateStructure();
    this.validateFormatting();
    this.validateContent();
    this.validateReferences();
    this.validateCitationReferenceConsistency();

    this.finalizeTotalScore();

    return this.generateReport();
  }

  validateStructure() {
    console.log("📋 Validando estrutura...");
    let earnedPoints = 0;
    const maxPoints = 100;

    const foundSections = new Set();
    this.documentData.headings.forEach((heading) => {
      const text = heading.text.toUpperCase();
      this.requiredSections.forEach((section) => {
        section.every((sectionX) => {
          if (text.includes(sectionX.toUpperCase())) {
            foundSections.add(section);
            return false;
          }
          return true;
        });
      });
    });

    this.requiredSections.forEach((section) => {
      if (foundSections.has(section)) {
        earnedPoints += 25;
      } else {
        this.addIssue(
          "Estrutura",
          "critical",
          `Seção obrigatória ausente: ${section[section.length - 1]}`,
          null,
          0,
          25,
        );
      }
    });

    if (this.documentData.headings.length > 0) {
      earnedPoints += Math.min(this.documentData.headings.length * 2, 10);
    } else {
      this.addIssue(
        "Estrutura",
        "critical",
        "Documento não possui cabeçalhos estruturados",
        null,
        0,
        10,
      );
    }

    this.calculateSectionScore(
      "Estrutura do Documento",
      earnedPoints,
      maxPoints,
    );
  }

  validateFormatting() {
    console.log("🎨 Validando formatação...");
    let earnedPoints = 0;
    let maxPoints = 0;

    const sampleParagraphs = this.documentData.paragraphs.slice(0, 10);

    sampleParagraphs.forEach((para, idx) => {
      const generalResult = this.rulesEngine.validateGeneralFormatting(para);
      const devResult = this.rulesEngine.validateDevelopmentFormatting(para);

      earnedPoints += generalResult.scores.earned + devResult.scores.earned;
      maxPoints += generalResult.scores.max + devResult.scores.max;



      generalResult.issues.forEach((issue) => {

        this.addIssue(
          "Formatação Geral",
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Parágrafo ${idx + 1}`,
          0,
          0,
        );
      });

      devResult.issues.forEach((issue) => {
        
        if (issue.rule.startsWith("Alinhamento")){
          issue.expected = this.alinhamentoTexto[issue.expected]
          issue.actual = this.alinhamentoTexto[issue.actual]
        } else if(issue.rule === "Espaçamento entre Linhas"){
          issue.expected = this.espacamentoLinhas[issue.expected] 
          issue.actual = this.espacamentoLinhas[issue.actual]  || this.espacamentoLinhas.default +  " (" + issue.actual +  ")"
        } else if(issue.rule === "Recuo de Parágrafo"){
          issue.expected = this.recuoParagrafo[issue.expected]
          issue.actual = this.recuoParagrafo[issue.actual] || this.recuoParagrafo.default +  " (" + issue.actual  +  ")"
        }

        
        this.addIssue(
          "Formatação de Desenvolvimento",
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Parágrafo ${idx + 1}`,
          0,
          0,
        );
      });
    });

    this.calculateSectionScore("Formatação", earnedPoints, maxPoints);
  }

  validateContent() {
    console.log("📝 Validando conteúdo...");
    let earnedPoints = 0;
    const maxPoints = 100;

    const totalParagraphs = this.documentData.paragraphs.length;
    if (totalParagraphs >= 20) {
      earnedPoints += 30;
    } else if (totalParagraphs >= 10) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        "Conteúdo",
        "medium",
        `Documento possui poucos parágrafos: ${totalParagraphs}`,
        null,
        10,
        30,
      );
    }

    const totalCitations = this.documentData.citations.length;
    if (totalCitations >= 10) {
      earnedPoints += 30;
    } else if (totalCitations >= 5) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        "Conteúdo",
        "high",
        `Poucas citações encontradas: ${totalCitations}`,
        null,
        10,
        30,
      );
    }

    const avgParagraphLength =
      this.documentData.paragraphs.reduce((sum, p) => sum + p.text.length, 0) /
      totalParagraphs;

    if (avgParagraphLength >= 200) {
      earnedPoints += 20;
    } else if (avgParagraphLength >= 100) {
      earnedPoints += 15;
    } else {
      earnedPoints += 5;
      this.addIssue(
        "Conteúdo",
        "low",
        `Parágrafos muito curtos (média: ${Math.round(avgParagraphLength)} caracteres)`,
        null,
        5,
        20,
      );
    }

    if (this.documentData.figures.length > 0) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        "Conteúdo",
        "low",
        "Documento não possui figuras ou legendas",
        null,
        10,
        20,
      );
    }

    // TODO: Organizar as mensagens das requisições de API e procurar onde deixei a análise de referências não disponibilizadas no Scholar (Períodicos ou sites)

    // Iniciar os itens abaixo fará com que seja feito requisições na API
    const resultsReferences = this.referenceReviewer.validateReferences();
    console.log("this.documentData.references[22] " + this.documentData.references[22].text);
    console.log("Resultados da verificação das referências: ")
    console.log(resultsReferences.validated)
    console.log(resultsReferences.total)
    console.log(resultsReferences.checkedCount)
    console.log(resultsReferences.results)
    this.calculateSectionScore("Conteúdo", earnedPoints, maxPoints);
  }

  validateReferences() {
    console.log("📚 Validando referências...");
    let earnedPoints = 0;
    let maxPoints = 100;

    const totalRefs = this.documentData.references.length;

    if (totalRefs >= 15) {
      earnedPoints += 40;
    } else if (totalRefs >= 10) {
      earnedPoints += 30;
    } else if (totalRefs >= 5) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        "Referências",
        "critical",
        `Poucas referências encontradas: ${totalRefs} (mínimo recomendado: 15)`,
        null,
        10,
        40,
      );
    }

    this.documentData.references.forEach((ref, idx) => {
      const refResult = this.rulesEngine.validateReferenceFormatting(ref);
      earnedPoints += refResult.scores.earned;
      maxPoints += refResult.scores.max;

      refResult.issues.forEach((issue) => {
        if (issue.rule.startsWith("Alinhamento")){
          issue.expected = this.alinhamentoTexto[issue.expected]
          issue.actual = this.alinhamentoTexto[issue.actual]
        } else if(issue.rule === "Espaçamento entre Linhas"){
          issue.expected = this.espacamentoLinhas[issue.expected] 
          issue.actual = this.espacamentoLinhas[issue.actual] || this.espacamentoLinhas.default +  " (" + issue.actual  +  ")"
        } else if(issue.rule === "Recuo de Parágrafo"){
          issue.expected = this.recuoParagrafo[issue.expected]
          issue.actual = this.recuoParagrafo[issue.actual] || this.recuoParagrafo.default +  " (" + issue.actual  +  ")"
        }
        
        this.addIssue(
          "Formatação de Referências",
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Referência ${idx + 1}`,
          0,
          0,
        );
      });
    });

    const alphabeticalOrder = this.checkAlphabeticalOrder(
      this.documentData.references,
    );
    if (alphabeticalOrder) {
      earnedPoints += 20;
    } else {
      this.addIssue(
        "Referências",
        "medium",
        "Referências não estão em ordem alfabética",
        null,
        0,
        20,
      );
    }

    this.calculateSectionScore("Referências", earnedPoints, maxPoints);
  }

  validateCitationReferenceConsistency() {
    console.log("🔗 Validando consistência entre citações e referências...");

    let earnedPoints = 0;
    const maxPoints = 100;

    const citations = this.documentData.citations || [];
    const references = this.documentData.references || [];

    // Parsing simplificado → extrai autor principal + ano
    const parsedCitations = citations.map(c => {
      const match = c.full.match(/([A-ZÀ-Ú][A-Za-zÀ-ú.'-]+).*?(\d{4}[a-z]?)/i);

      if (!match) return null;

      return {
        raw: c.full,
        author: match[1].trim().toUpperCase(),
        year: match[2],
        paragraphIndex: c.paragraphIndex
      };
    }).filter(Boolean);

    const normalizedReferences = references.map(r => ({
      raw: r.text,
      text: r.text.toUpperCase(),
      matchAuthor: r.text.split(" ")[0].replace(",", "").toUpperCase(),
      year: (r.text.match(/\d{4}[a-z]?/) || [""])[0]
    }));

    const unmatchedCitations = [];
    const matchedCitations = [];

    parsedCitations.forEach(cite => {
      const match = normalizedReferences.find(ref =>
        ref.text.includes(cite.author) && ref.text.includes(cite.year)
      );

      if (!match) {
        unmatchedCitations.push(cite);
        this.addIssue(
          "Citações vs Referências",
          "high",
          `Citação não encontrada nas referências: ${cite.raw}`,
          `Parágrafo ${cite.paragraphIndex + 1}`,
          0,
          10
        );
      } else {
        matchedCitations.push({ cite, ref: match });
        earnedPoints += 2;
      }
    });

    // Agora verificar referências que não foram citadas
    const unusedReferences = normalizedReferences.filter(ref =>
      !matchedCitations.some(m => m.ref.raw === ref.raw)
    );

    unusedReferences.forEach(ref => {
      this.addIssue(
        "Citações vs Referências",
        "medium",
        `Referência não utilizada no texto: ${ref.raw}`,
        null,
        0,
        5
      );
    });

    // **Pontuação final**
    earnedPoints = Math.min(earnedPoints, maxPoints);

    this.calculateSectionScore(
      "Consistência de Citações e Referências",
      earnedPoints,
      maxPoints
    );
  }

  checkAlphabeticalOrder(references) {
    if (references.length <= 1) return true;

    for (let i = 0; i < references.length - 1; i++) {
      const current = references[i].text.trim()[0] || "";
      const next = references[i + 1].text.trim()[0] || "";

      if (current > next) {
        return false;
      }
    }

    return true;
  }
}

module.exports = MonographReviewer;
