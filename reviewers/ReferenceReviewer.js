const { verificaReferenciaCompleta } = require('../verificarRef');

class ReferenceReviewer {
  constructor(references, apiKeys = {}) {
    this.references = references;
    this.serpApiKey = apiKeys.serpApiKey || process.env.SERP_API_KEY || null;
    this.scrapingDogKey = apiKeys.scrapingDogKey || process.env.SCRAPING_DOG_API_KEY || null;
    this.validationResults = [];
  }

  async validateReferences() {
    console.log(`\n📚 Validando ${this.references.length} referências com APIs externas...`);
    
    if (!this.serpApiKey && !this.scrapingDogKey) {
      console.log('⚠️  Aviso: Nenhuma API key configurada. Validação de referências desativada.');
      console.log('   Configure SERP_API_KEY ou SCRAPINGDOG_API_KEY para validação completa.');
      return {
        validated: 0,
        total: this.references.length,
        results: []
      };
    }
    
    const results = [];
    let validatedCount = 0;
    
    for (let i = 0; i < Math.min(this.references.length, 5); i++) {
      const ref = this.references[i];
      
      try {
        console.log(`  Verificando referência ${i + 1}/${this.references.length}...`);
        
        const refParsed = this.parseReference(ref.text);
        
        if (refParsed) {
          const resultado = await verificaReferenciaCompleta(
            ref.text,
            refParsed,
            this.serpApiKey,
            this.scrapingDogKey
          );
          
          results.push({
            originalText: ref.text,
            parsed: refParsed,
            verified: resultado.success,
            abntFormatted: resultado.formatos.ABNT || null,
            sources: resultado.comparacoes
          });
          
          if (resultado.success) {
            validatedCount++;
          }
        }
      } catch (error) {
        console.error(`    Erro ao verificar referência ${i + 1}:`, error.message);
        results.push({
          originalText: ref.text,
          parsed: null,
          verified: false,
          error: error.message
        });
      }
    }
    
    this.validationResults = results;
    
    console.log(`✅ Validação concluída: ${validatedCount}/${results.length} referências verificadas com sucesso\n`);
    
    return {
      validated: validatedCount,
      total: this.references.length,
      checkedCount: results.length,
      results: results
    };
  }

  parseReference(refText) {
    const authorRegex = /^([A-ZÀ-Ú][A-ZÀ-Úa-záàâãéèêíïóôõöúçñ\s]+),\s*([A-ZÀ-Ú][a-záàâãéèêíïóôõöúçñ]+)/;
    const yearRegex = /(\d{4}[a-z]?)/;
    const titleRegex = /\.([^.]+)\./;
    
    try {
      const authorMatch = refText.match(authorRegex);
      const yearMatch = refText.match(yearRegex);
      const titleMatch = refText.match(titleRegex);
      
      if (!authorMatch || !yearMatch) {
        return null;
      }
      
      return {
        authors: [`${authorMatch[1]}, ${authorMatch[2]}`],
        year: parseInt(yearMatch[1]),
        title: titleMatch ? titleMatch[1].trim() : refText.substring(0, 100),
        type: 'Livro'
      };
    } catch (error) {
      return null;
    }
  }

  getValidationSummary() {
    if (this.validationResults.length === 0) {
      return {
        total: this.references.length,
        validated: 0,
        pending: this.references.length,
        percentage: 0
      };
    }
    
    const validated = this.validationResults.filter(r => r.verified).length;
    
    return {
      total: this.references.length,
      checked: this.validationResults.length,
      validated: validated,
      pending: this.references.length - this.validationResults.length,
      percentage: (validated / this.validationResults.length) * 100
    };
  }

  getValidationReport() {
    return {
      summary: this.getValidationSummary(),
      results: this.validationResults,
      apiKeysConfigured: {
        serpApi: !!this.serpApiKey,
        scrapingDog: !!this.scrapingDogKey
      }
    };
  }
}

module.exports = ReferenceReviewer;
