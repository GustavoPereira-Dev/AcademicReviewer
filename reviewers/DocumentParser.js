const parserLib = require('../lib/documentParserLib');

class DocumentParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.$ = null;
    this.cssStyles = {};
    this.documentData = {
      sections: [],
      paragraphs: [],
      headings: [],
      lists: [],
      figures: [],
      tables: [],
      references: [],
      citations: [],
      metadata: {}
    };
  }

  loadDocument() {
    const { $, cssStyles } = parserLib.loadDocument(this.filePath);
    this.$ = $;
    this.cssStyles = cssStyles;
  }

  getStyleFromClass(elem, styleName) {
    return parserLib.getStyleFromClass(elem, styleName, this.cssStyles, this.$);
  }

  getResolvedStyle(elem, styleName) {
    return parserLib.getResolvedStyle(elem, styleName, this.cssStyles, this.$);
  }

  extractText(elem) {
    return parserLib.extractText(elem, this.$);
  }

  extractStyles(elem) {
    return {
      fontSize: this.getResolvedStyle(elem, 'font-size') || null,
      lineHeight: this.getResolvedStyle(elem, 'line-height') || null,
      fontFamily: this.getResolvedStyle(elem, 'font-family') || null,
      textAlign: this.getResolvedStyle(elem, 'text-align') || null,
      textIndent: this.getResolvedStyle(elem, 'text-indent') || null,
      marginTop: this.getResolvedStyle(elem, 'margin-top') || null,
      marginBottom: this.getResolvedStyle(elem, 'margin-bottom') || null,
      marginLeft: this.getResolvedStyle(elem, 'margin-left') || null
    };
  }

  parseDocument() {
    this.loadDocument();
    
    let sectionIndex = 1;
    
    while (true) {
      const sectionSelector = `div.WordSection${sectionIndex}`;
      const sectionElem = this.$(sectionSelector);

      if (sectionElem.length === 0) break;

      const sectionData = {
        index: sectionIndex,
        elements: []
      };

      sectionElem.children().each((j, elem) => {
        const tag = elem.tagName.toLowerCase();
        const $elem = this.$(elem);
        const className = $elem.attr('class') || '';
        const text = this.extractText($elem);
        const styles = this.extractStyles($elem);

        const elementData = {
          tag,
          className,
          text,
          styles,
          type: this.classifyElement(tag, className, text)
        };

        sectionData.elements.push(elementData);

        if (/^h[1-6]$/.test(tag)) {
          this.documentData.headings.push({
            level: parseInt(tag[1]),
            text,
            styles,
            section: sectionIndex
          });
        } else if (tag === 'p' && className.includes('MsoNormal')) {
          this.documentData.paragraphs.push({
            text,
            styles,
            section: sectionIndex,
            className
          });
        } else if (tag === 'p' && /MsoListParagraph/.test(className)) {
          this.documentData.lists.push({
            text,
            styles,
            section: sectionIndex
          });
        } else if (tag === 'p' && className.includes('MsoCaption')) {
          this.documentData.figures.push({
            caption: text,
            styles,
            section: sectionIndex
          });
        }
      });

      this.documentData.sections.push(sectionData);
      sectionIndex++;
    }

    this.extractReferences();
    this.extractCitations();
    
    return this.documentData;
  }

  classifyElement(tag, className, text) {
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (className.includes('MsoCaption')) return 'caption';
    if (className.includes('MsoListParagraph')) return 'list';
    if (className.includes('MsoNormal')) return 'paragraph';
    if (className.includes('MsoToc') || className.includes('MsoTof')) return 'toc';
    return 'unknown';
  }

  extractReferences() {
    const referencias = this.$('p.MsoNormal b').filter((i, el) => {
      const texto = this.$(el).text().toUpperCase();
      return texto.includes('REFERÊNCIAS') || texto.includes('REFERENCIAS');
    });

    if (referencias.length > 0) {
      let refNode = referencias.first().parent();

      while (refNode.next().length > 0) {
        const prox = refNode.next();
        if (!prox.hasClass('MsoNormal')) break;
        const txt = this.extractText(prox);
        const styles = this.extractStyles(prox);
        
        if (txt.trim()) {
          this.documentData.references.push({
            text: txt,
            styles
          });
        }
        refNode = prox;
      }
    }
  }

  extractCitations() {
    const citationRegex = /\(([A-Z][A-ZÀ-Ú\s]+,\s*\d{4}[a-z]?(?:;\s*[A-Z][A-ZÀ-Ú\s]+,\s*\d{4}[a-z]?)*)\)/g;
    
    this.documentData.paragraphs.forEach((para, idx) => {
      const matches = [...para.text.matchAll(citationRegex)];
      matches.forEach(match => {
        this.documentData.citations.push({
          full: match[0],
          content: match[1],
          paragraphIndex: idx,
          text: match.input
        });
      });
    });
  }

  getData() {
    return this.documentData;
  }
}

module.exports = DocumentParser;
