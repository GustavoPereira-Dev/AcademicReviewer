# Sistema de Revisão Acadêmica ABNT

Sistema modular e extensível para revisão automática de documentos acadêmicos conforme normas ABNT.

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
reviewers/
├── BaseReviewer.js           # Classe abstrata base para todos os revisores
├── DocumentParser.js         # Parser de documentos HTML do Word
├── ABNTRulesEngine.js       # Motor de regras ABNT
├── MonographReviewer.js     # Revisor específico para monografias
├── ArticleReviewer.js       # Revisor específico para artigos
└── ReviewOrchestrator.js    # Orquestrador principal
```

### Padrão de Design

O sistema utiliza o **padrão Strategy/Template Method**:

- **BaseReviewer**: Classe abstrata que define a interface comum e comportamento base
- **Revisores Específicos**: Implementam a interface base com lógica específica para cada tipo de documento
- **ReviewOrchestrator**: Factory que instancia o revisor apropriado

## 📊 Sistema de Pontuação

Cada revisor avalia o documento em várias seções e atribui pontuações exatas:

### Monografia
- **Estrutura** (100 pontos): Seções obrigatórias, hierarquia
- **Formatação** (variável): Fonte, espaçamento, alinhamento
- **Conteúdo** (100 pontos): Extensão, citações, figuras
- **Referências** (100+ pontos): Quantidade, formatação, ordem

### Artigo Científico
- **Estrutura** (100 pontos): Resumo, Abstract, seções metodológicas
- **Formatação** (variável): Normas ABNT de formatação
- **Conteúdo** (100 pontos): Extensão ideal (4000-8000 palavras), citações
- **Referências** (100+ pontos): Mínimo 20 referências
- **Citações** (50 pontos): Densidade e coerência

### Conceitos
- **A (90-100%)**: Excelente
- **B (80-89%)**: Bom
- **C (70-79%)**: Regular
- **D (60-69%)**: Insuficiente
- **F (<60%)**: Reprovado

## 🚀 Uso

### Via CLI

```bash
# Revisão automática (detecta o tipo)
node review-cli.js review documento.htm

# Especificar tipo manualmente
node review-cli.js review documento.htm --type monograph

# Exportar relatório JSON
node review-cli.js review documento.htm --output report.json

# Ver estatísticas
node review-cli.js stats documento.htm

# Listar tipos suportados
node review-cli.js types

# Ver regras ABNT verificadas
node review-cli.js help-abnt
```

### Via API

```javascript
const ReviewOrchestrator = require('./reviewers/ReviewOrchestrator');

const orchestrator = new ReviewOrchestrator('./documento.htm');

// Revisão rápida com impressão
await orchestrator.quickReview();

// Revisão programática
const { report, reviewer } = await orchestrator.review('monograph');
console.log(report.scores.percentage); // 85.5

// Exportar relatório
await orchestrator.exportReport('./report.json', 'article');

// Obter estatísticas
const stats = await orchestrator.getDocumentStatistics();
```

## 🔧 Como Adicionar Novos Revisores

### 1. Criar novo revisor estendendo BaseReviewer

```javascript
const BaseReviewer = require('./BaseReviewer');

class ThesisReviewer extends BaseReviewer {
  constructor(documentData, abntRules) {
    super(documentData, abntRules);
    this.rulesEngine = new ABNTRulesEngine(abntRules);
  }

  review() {
    this.validateStructure();
    this.validateFormatting();
    this.validateContent();
    this.finalizeTotalScore();
    return this.generateReport();
  }

  validateStructure() {
    let earnedPoints = 0;
    const maxPoints = 100;
    
    // Sua lógica de validação
    
    this.calculateSectionScore('Estrutura', earnedPoints, maxPoints);
  }

  validateFormatting() {
    // Implementação
  }

  validateContent() {
    // Implementação
  }
}

module.exports = ThesisReviewer;
```

### 2. Registrar no ReviewOrchestrator

```javascript
// Em ReviewOrchestrator.js
const ThesisReviewer = require('./ThesisReviewer');

async review(documentType = null) {
  // ...
  switch (this.documentType) {
    case 'thesis':
      reviewer = new ThesisReviewer(this.documentData, this.abntRules);
      break;
    // ...
  }
}
```

## 📋 Métodos Obrigatórios para Novos Revisores

Todos os revisores devem implementar:

- `review()`: Método principal que executa toda a revisão
- `validateStructure()`: Valida estrutura do documento
- `validateFormatting()`: Valida formatação ABNT
- `validateContent()`: Valida conteúdo acadêmico

## 🛠️ Utilitários Disponíveis

### BaseReviewer

```javascript
// Adicionar problema encontrado
this.addIssue(section, severity, description, location, score, maxScore);

// Calcular pontuação de seção
this.calculateSectionScore(sectionName, earnedPoints, maxPoints);

// Finalizar pontuação total
this.finalizeTotalScore();

// Gerar relatório
const report = this.generateReport();

// Imprimir relatório
this.printReport();
```

### ABNTRulesEngine

```javascript
// Verificar tamanho de fonte
const check = this.rulesEngine.checkFontSize(fontSize, expectedSize);

// Verificar fonte
const check = this.rulesEngine.checkFont(fontFamily, allowedFonts);

// Verificar espaçamento
const check = this.rulesEngine.checkLineSpacing(lineHeight, expectedPercent);

// Verificar alinhamento
const check = this.rulesEngine.checkAlignment(textAlign, expected);

// Validação completa
const result = this.rulesEngine.validateGeneralFormatting(element);
```

## 📊 Formato do Relatório

```json
{
  "documentType": "Monograph",
  "scores": {
    "total": 450,
    "maxScore": 500,
    "percentage": 90.0,
    "sections": {
      "Estrutura do Documento": {
        "earned": 100,
        "max": 100,
        "percentage": 100.0
      }
    }
  },
  "grade": "A (Excelente)",
  "issues": [
    {
      "section": "Formatação",
      "severity": "medium",
      "description": "Tamanho da fonte: esperado '12pt', encontrado '11pt'",
      "location": "Parágrafo 5",
      "score": 0,
      "maxScore": 0,
      "timestamp": "2025-11-12T..."
    }
  ],
  "summary": {
    "totalIssues": 5,
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 1
  },
  "generatedAt": "2025-11-12T..."
}
```

## 🎯 Níveis de Severidade

- **critical**: Problemas graves que comprometem o documento
- **high**: Problemas importantes que devem ser corrigidos
- **medium**: Problemas moderados que afetam a qualidade
- **low**: Sugestões de melhoria

## 📦 Dependências

- `cheerio`: Parser HTML
- `iconv-lite`: Decodificação de caracteres
- `commander`: Interface CLI
- `chalk`: Formatação de console

## 🔄 Integração com Sistema Existente

O sistema foi projetado para integrar com:

- **leitor.js**: Usa a mesma lógica de parsing de estilos
- **verificarRef.js**: Pode integrar validação de referências via APIs
- **abnt.json**: Carrega regras de formatação automaticamente
- **executarRef.js**: Pode validar referências encontradas

## 🚧 Próximas Melhorias

- [ ] Revisor para TCC (diferenciado de monografia)
- [ ] Revisor para dissertação de mestrado
- [ ] Revisor para tese de doutorado
- [ ] Integração com verificarRef.js para validação de referências
- [ ] Validação de citações longas (>3 linhas)
- [ ] Detecção de plágio básico
- [ ] Exportação em HTML/PDF
- [ ] Interface web

## 📝 Exemplo Completo

```javascript
const ReviewOrchestrator = require('./reviewers/ReviewOrchestrator');

async function reviewDocument() {
  const orchestrator = new ReviewOrchestrator('./meu-tcc.htm');
  
  // Obter estatísticas
  const stats = await orchestrator.getDocumentStatistics();
  console.log(`Documento com ${stats.totalWords} palavras`);
  
  // Fazer revisão
  const { report, reviewer } = await orchestrator.review();
  
  // Imprimir relatório
  reviewer.printReport();
  
  // Verificar se passou
  if (report.scores.percentage >= 70) {
    console.log('✅ Documento aprovado!');
  } else {
    console.log('❌ Documento precisa de melhorias');
    console.log(`Problemas críticos: ${report.summary.critical}`);
  }
  
  // Exportar para análise
  await orchestrator.exportReport('./relatorio-revisao.json');
}

reviewDocument();
```
