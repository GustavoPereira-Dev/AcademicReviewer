const DocumentParser = require('./DocumentParser');
const MonographReviewer = require('./MonographReviewer');
const ArticleReviewer = require('./ArticleReviewer');
const path = require('path');

class ReviewOrchestrator {
  constructor(filePath, abntRulesPath = null) {
    this.filePath = filePath;
    
    if (!abntRulesPath) {
      abntRulesPath = path.join(__dirname, '..', 'abnt.json');
    }
    
    this.abntRules = require(abntRulesPath);
    this.documentData = null;
    this.documentType = null;
  }

  async parseDocument() {
    console.log('📄 Carregando documento...');
    const parser = new DocumentParser(this.filePath);
    this.documentData = parser.parseDocument();
    console.log(`✅ Documento carregado: ${this.documentData.sections.length} seções, ${this.documentData.paragraphs.length} parágrafos`);
  }

  detectDocumentType() {
    console.log('\n🔎 Detectando tipo de documento...');
    
    const headingTexts = this.documentData.headings.map(h => h.text.toUpperCase());
    
    const hasAbstract = headingTexts.some(t => t.includes('ABSTRACT') || t.includes('RESUMO'));
    const hasMetodologia = headingTexts.some(t => t.includes('METODOLOGIA') || t.includes('METHODOLOGY'));
    const hasResultados = headingTexts.some(t => t.includes('RESULTADOS') || t.includes('RESULTS'));
    
    if (hasAbstract && (hasMetodologia || hasResultados)) {
      this.documentType = 'article';
      console.log('✅ Tipo detectado: ARTIGO CIENTÍFICO');
    } else {
      this.documentType = 'monograph';
      console.log('✅ Tipo detectado: MONOGRAFIA');
    }
    
    return this.documentType;
  }

  setDocumentType(type) {
    const validTypes = ['monograph', 'article'];
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de documento inválido: ${type}. Tipos válidos: ${validTypes.join(', ')}`);
    }
    this.documentType = type;
    console.log(`📝 Tipo de documento definido manualmente: ${type.toUpperCase()}`);
  }

  async review(documentType = null) {
    await this.parseDocument();
    
    if (documentType) {
      this.setDocumentType(documentType);
    } else {
      this.detectDocumentType();
    }
    
    let reviewer;
    
    switch (this.documentType) {
      case 'monograph':
        reviewer = new MonographReviewer(this.documentData, this.abntRules);
        break;
      case 'article':
        reviewer = new ArticleReviewer(this.documentData, this.abntRules);
        break;
      default:
        throw new Error(`Tipo de documento não suportado: ${this.documentType}`);
    }
    
    const report = reviewer.review();
    
    return { report, reviewer };
  }

  async quickReview(documentType = null) {
    const { report, reviewer } = await this.review(documentType);
    reviewer.printReport();
    return report;
  }

  async exportReport(outputPath, documentType = null) {
    const { report } = await this.review(documentType);
    
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`\n✅ Relatório exportado para: ${outputPath}`);
    
    return outputPath;
  }

  async getDocumentStatistics() {
    if (!this.documentData) {
      await this.parseDocument();
    }
    
    return {
      sections: this.documentData.sections.length,
      paragraphs: this.documentData.paragraphs.length,
      headings: this.documentData.headings.length,
      lists: this.documentData.lists.length,
      figures: this.documentData.figures.length,
      references: this.documentData.references.length,
      citations: this.documentData.citations.length,
      totalWords: this.documentData.paragraphs.reduce((sum, p) => 
        sum + p.text.split(/\s+/).length, 0)
    };
  }
}

module.exports = ReviewOrchestrator;
