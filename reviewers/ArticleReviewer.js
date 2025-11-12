const BaseReviewer = require('./BaseReviewer');
const ABNTRulesEngine = require('./ABNTRulesEngine');

class ArticleReviewer extends BaseReviewer {
  constructor(documentData, abntRules) {
    super(documentData, abntRules);
    this.rulesEngine = new ABNTRulesEngine(abntRules);
    this.requiredSections = [
      'RESUMO',
      'ABSTRACT',
      'INTRODUÇÃO',
      'METODOLOGIA',
      'RESULTADOS',
      'CONCLUSÃO',
      'REFERÊNCIAS'
    ];
  }

  review() {
    console.log('\n🔍 Iniciando revisão de ARTIGO CIENTÍFICO...\n');
    
    this.validateStructure();
    this.validateFormatting();
    this.validateContent();
    this.validateReferences();
    this.validateCitations();
    
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
    
    const criticalSections = ['RESUMO', 'ABSTRACT', 'INTRODUÇÃO', 'REFERÊNCIAS'];
    criticalSections.forEach(section => {
      if (foundSections.has(section)) {
        earnedPoints += 20;
      } else {
        this.addIssue(
          'Estrutura',
          'critical',
          `Seção crítica ausente: ${section}`,
          null,
          0,
          20
        );
      }
    });
    
    const optionalSections = ['METODOLOGIA', 'RESULTADOS', 'CONCLUSÃO'];
    optionalSections.forEach(section => {
      if (foundSections.has(section)) {
        earnedPoints += 7;
      } else {
        this.addIssue(
          'Estrutura',
          'high',
          `Seção importante ausente: ${section}`,
          null,
          0,
          7
        );
      }
    });
    
    this.calculateSectionScore('Estrutura do Documento', earnedPoints, maxPoints);
  }

  validateFormatting() {
    console.log('🎨 Validando formatação...');
    let earnedPoints = 0;
    let maxPoints = 0;
    
    const sampleParagraphs = this.documentData.paragraphs.slice(0, 15);
    
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
    
    const totalWords = this.documentData.paragraphs.reduce((sum, p) => 
      sum + p.text.split(/\s+/).length, 0);
    
    if (totalWords >= 4000 && totalWords <= 8000) {
      earnedPoints += 30;
    } else if (totalWords >= 3000 || totalWords <= 10000) {
      earnedPoints += 20;
      this.addIssue(
        'Conteúdo',
        'medium',
        `Artigo com ${totalWords} palavras (ideal: 4000-8000)`,
        null,
        20,
        30
      );
    } else {
      earnedPoints += 10;
      this.addIssue(
        'Conteúdo',
        'high',
        `Artigo fora do padrão de tamanho: ${totalWords} palavras`,
        null,
        10,
        30
      );
    }
    
    const totalCitations = this.documentData.citations.length;
    if (totalCitations >= 15) {
      earnedPoints += 30;
    } else if (totalCitations >= 10) {
      earnedPoints += 20;
    } else {
      earnedPoints += 10;
      this.addIssue(
        'Conteúdo',
        'high',
        `Poucas citações para um artigo científico: ${totalCitations}`,
        null,
        10,
        30
      );
    }
    
    if (this.documentData.figures.length >= 3) {
      earnedPoints += 20;
    } else if (this.documentData.figures.length >= 1) {
      earnedPoints += 15;
    } else {
      earnedPoints += 5;
      this.addIssue(
        'Conteúdo',
        'medium',
        'Artigo científico deve conter figuras, tabelas ou gráficos',
        null,
        5,
        20
      );
    }
    
    if (this.documentData.lists.length >= 2) {
      earnedPoints += 20;
    } else if (this.documentData.lists.length >= 1) {
      earnedPoints += 10;
    } else {
      earnedPoints += 5;
      this.addIssue(
        'Conteúdo',
        'low',
        'Artigos científicos geralmente contêm listas enumeradas',
        null,
        5,
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
    
    if (totalRefs >= 20) {
      earnedPoints += 50;
    } else if (totalRefs >= 15) {
      earnedPoints += 40;
    } else if (totalRefs >= 10) {
      earnedPoints += 30;
    } else {
      earnedPoints += 15;
      this.addIssue(
        'Referências',
        'critical',
        `Artigo científico com poucas referências: ${totalRefs} (mínimo recomendado: 20)`,
        null,
        15,
        50
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

  validateCitations() {
    console.log('📖 Validando citações...');
    let earnedPoints = 0;
    const maxPoints = 50;
    
    const citationsCount = this.documentData.citations.length;
    const referencesCount = this.documentData.references.length;
    
    if (citationsCount >= referencesCount * 0.8) {
      earnedPoints += 25;
    } else if (citationsCount >= referencesCount * 0.5) {
      earnedPoints += 15;
    } else {
      earnedPoints += 5;
      this.addIssue(
        'Citações',
        'medium',
        `Poucas citações em relação às referências: ${citationsCount} citações vs ${referencesCount} referências`,
        null,
        5,
        25
      );
    }
    
    const citationDensity = citationsCount / this.documentData.paragraphs.length;
    if (citationDensity >= 0.3) {
      earnedPoints += 25;
    } else if (citationDensity >= 0.15) {
      earnedPoints += 15;
    } else {
      earnedPoints += 5;
      this.addIssue(
        'Citações',
        'low',
        `Densidade de citações baixa: ${(citationDensity * 100).toFixed(1)}% dos parágrafos`,
        null,
        5,
        25
      );
    }
    
    this.calculateSectionScore('Citações', earnedPoints, maxPoints);
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

module.exports = ArticleReviewer;
