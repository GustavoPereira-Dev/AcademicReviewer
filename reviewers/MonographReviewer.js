const BaseReviewer = require('./BaseReviewer');
const ABNTRulesEngine = require('./ABNTRulesEngine');

class MonographReviewer extends BaseReviewer {
  constructor(documentData, abntRules) {
    super(documentData, abntRules);
    this.rulesEngine = new ABNTRulesEngine(abntRules);
    this.requiredSections = [
      'INTRODUÇÃO',
      'DESENVOLVIMENTO',
      'CONCLUSÃO',
      'REFERÊNCIAS'
    ];
  }

  review() {
    console.log('\n🔍 Iniciando revisão de MONOGRAFIA...\n');
    
    this.validateStructure();
    this.validateFormatting();
    this.validateContent();
    this.validateReferences();
    
    this.finalizeTotalScore();
    
    return this.generateReport();
  }

  validateStructure() {
    console.log('📋 Validando estrutura...');
    let earnedPoints = 0;
    const maxPoints = 100;
    
    const foundSections = new Set();
    this.documentData.headings.forEach(heading => {
      const text = heading.text.toUpperCase();
      this.requiredSections.forEach(section => {
        if (text.includes(section)) {
          foundSections.add(section);
        }
      });
    });
    
    this.requiredSections.forEach(section => {
      if (foundSections.has(section)) {
        earnedPoints += 25;
      } else {
        this.addIssue(
          'Estrutura',
          'critical',
          `Seção obrigatória ausente: ${section}`,
          null,
          0,
          25
        );
      }
    });
    
    if (this.documentData.headings.length > 0) {
      earnedPoints += Math.min(this.documentData.headings.length * 2, 10);
    } else {
      this.addIssue(
        'Estrutura',
        'critical',
        'Documento não possui cabeçalhos estruturados',
        null,
        0,
        10
      );
    }
    
    this.calculateSectionScore('Estrutura do Documento', earnedPoints, maxPoints);
  }

  validateFormatting() {
    console.log('🎨 Validando formatação...');
    let earnedPoints = 0;
    let maxPoints = 0;
    
    const sampleParagraphs = this.documentData.paragraphs.slice(0, 10);
    
    sampleParagraphs.forEach((para, idx) => {
      const generalResult = this.rulesEngine.validateGeneralFormatting(para);
      const devResult = this.rulesEngine.validateDevelopmentFormatting(para);
      
      earnedPoints += generalResult.scores.earned + devResult.scores.earned;
      maxPoints += generalResult.scores.max + devResult.scores.max;
      
      generalResult.issues.forEach(issue => {
        this.addIssue(
          'Formatação Geral',
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Parágrafo ${idx + 1}`,
          0,
          0
        );
      });
      
      devResult.issues.forEach(issue => {
        this.addIssue(
          'Formatação de Desenvolvimento',
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Parágrafo ${idx + 1}`,
          0,
          0
        );
      });
    });
    
    this.calculateSectionScore('Formatação', earnedPoints, maxPoints);
  }

  validateContent() {
    console.log('📝 Validando conteúdo...');
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
        'Conteúdo',
        'medium',
        `Documento possui poucos parágrafos: ${totalParagraphs}`,
        null,
        10,
        30
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
        'Conteúdo',
        'high',
        `Poucas citações encontradas: ${totalCitations}`,
        null,
        10,
        30
      );
    }
    
    const avgParagraphLength = this.documentData.paragraphs.reduce((sum, p) => 
      sum + p.text.length, 0) / totalParagraphs;
    
    if (avgParagraphLength >= 200) {
      earnedPoints += 20;
    } else if (avgParagraphLength >= 100) {
      earnedPoints += 15;
    } else {
      earnedPoints += 5;
      this.addIssue(
        'Conteúdo',
        'low',
        `Parágrafos muito curtos (média: ${Math.round(avgParagraphLength)} caracteres)`,
        null,
        5,
        20
      );
    }
    
    if (this.documentData.figures.length > 0) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        'Conteúdo',
        'low',
        'Documento não possui figuras ou legendas',
        null,
        10,
        20
      );
    }
    
    this.calculateSectionScore('Conteúdo', earnedPoints, maxPoints);
  }

  validateReferences() {
    console.log('📚 Validando referências...');
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
        'Referências',
        'critical',
        `Poucas referências encontradas: ${totalRefs} (mínimo recomendado: 15)`,
        null,
        10,
        40
      );
    }
    
    this.documentData.references.forEach((ref, idx) => {
      const refResult = this.rulesEngine.validateReferenceFormatting(ref);
      earnedPoints += refResult.scores.earned;
      maxPoints += refResult.scores.max;
      
      refResult.issues.forEach(issue => {
        this.addIssue(
          'Formatação de Referências',
          issue.severity,
          `${issue.rule}: esperado "${issue.expected}", encontrado "${issue.actual}"`,
          `Referência ${idx + 1}`,
          0,
          0
        );
      });
    });
    
    const alphabeticalOrder = this.checkAlphabeticalOrder(this.documentData.references);
    if (alphabeticalOrder) {
      earnedPoints += 20;
    } else {
      this.addIssue(
        'Referências',
        'medium',
        'Referências não estão em ordem alfabética',
        null,
        0,
        20
      );
    }
    
    this.calculateSectionScore('Referências', earnedPoints, maxPoints);
  }

  checkAlphabeticalOrder(references) {
    if (references.length <= 1) return true;
    
    for (let i = 0; i < references.length - 1; i++) {
      const current = references[i].text.trim()[0] || '';
      const next = references[i + 1].text.trim()[0] || '';
      
      if (current > next) {
        return false;
      }
    }
    
    return true;
  }
}

module.exports = MonographReviewer;
