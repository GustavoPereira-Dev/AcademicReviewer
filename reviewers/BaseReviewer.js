class BaseReviewer {
  constructor(documentData, abntRules) {
    if (new.target === BaseReviewer) {
      throw new Error('BaseReviewer is an abstract class and cannot be instantiated directly');
    }
    
    this.documentData = documentData;
    this.abntRules = abntRules;
    this.scores = {
      total: 0,
      maxScore: 0,
      percentage: 0,
      sections: {}
    };
    this.issues = [];
  }

  addIssue(section, severity, description, location = null, score = 0, maxScore = 0) {
    this.issues.push({
      section,
      severity,
      description,
      location,
      score,
      maxScore,
      timestamp: new Date().toISOString()
    });
  }

  calculateSectionScore(sectionName, earnedPoints, maxPoints) {
    const percentage = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0;
    
    this.scores.sections[sectionName] = {
      earned: earnedPoints,
      max: maxPoints,
      percentage: parseFloat(percentage.toFixed(2))
    };
    
    this.scores.total += earnedPoints;
    this.scores.maxScore += maxPoints;
  }

  finalizeTotalScore() {
    if (this.scores.maxScore > 0) {
      this.scores.percentage = parseFloat(
        ((this.scores.total / this.scores.maxScore) * 100).toFixed(2)
      );
    }
  }

  getGrade() {
    const pct = this.scores.percentage;
    if (pct >= 90) return 'A (Excelente)';
    if (pct >= 80) return 'B (Bom)';
    if (pct >= 70) return 'C (Regular)';
    if (pct >= 60) return 'D (Insuficiente)';
    return 'F (Reprovado)';
  }

  abstract_review() {
    throw new Error('Method review() must be implemented by subclass');
  }

  abstract_validateFormatting() {
    throw new Error('Method validateFormatting() must be implemented by subclass');
  }

  abstract_validateStructure() {
    throw new Error('Method validateStructure() must be implemented by subclass');
  }

  abstract_validateContent() {
    throw new Error('Method validateContent() must be implemented by subclass');
  }

  matchCitationToReference(citation, references) {
    const { author, year } = citation;

    return references.find(ref => {
      const text = ref.text.toUpperCase();
      return text.includes(author.toUpperCase()) && text.includes(year);
    });
  }

  generateReport() {
    return {
      documentType: this.constructor.name.replace('Reviewer', ''),
      scores: this.scores,
      grade: this.getGrade(),
      issues: this.issues,
      summary: {
        totalIssues: this.issues.length,
        critical: this.issues.filter(i => i.severity === 'critical').length,
        high: this.issues.filter(i => i.severity === 'high').length,
        medium: this.issues.filter(i => i.severity === 'medium').length,
        low: this.issues.filter(i => i.severity === 'low').length
      },
      generatedAt: new Date().toISOString()
    };
  }

  printReport() {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(80));
    console.log(`RELATÓRIO DE REVISÃO - ${report.documentType.toUpperCase()}`);
    console.log('='.repeat(80));
    
    console.log(`\nPontuação Total: ${report.scores.total}/${report.scores.maxScore} (${report.scores.percentage}%)`);
    console.log(`Conceito: ${report.grade}\n`);
    
    console.log('Pontuação por Seção:');
    for (const [section, score] of Object.entries(report.scores.sections)) {
      console.log(`  ${section}: ${score.earned}/${score.max} (${score.percentage}%)`);
    }
    
    console.log(`\nProblemas Encontrados: ${report.summary.totalIssues}`);
    console.log(`  Críticos: ${report.summary.critical}`);
    console.log(`  Altos: ${report.summary.high}`);
    console.log(`  Médios: ${report.summary.medium}`);
    console.log(`  Baixos: ${report.summary.low}`);
    
    if (this.issues.length > 0) {
      console.log('\nDetalhamento dos Problemas:');
      this.issues.forEach((issue, idx) => {
        console.log(`\n${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.section}`);
        console.log(`   ${issue.description}`);
        if (issue.location) console.log(`   Localização: ${issue.location}`);
        if (issue.maxScore > 0) console.log(`   Pontos: ${issue.score}/${issue.maxScore}`);
      });
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    return report;
  }

  
}


module.exports = BaseReviewer;
