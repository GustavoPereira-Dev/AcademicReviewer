class ABNTRulesEngine {
  constructor(abntRules) {
    this.rules = abntRules;
  }

  parseSize(sizeStr) {
    if (!sizeStr) return null;
    const match = sizeStr.match(/([\d.]+)(pt|px|cm|mm)/);
    if (!match) return null;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    if (unit === 'pt') return value;
    if (unit === 'px') return value * 0.75;
    if (unit === 'cm') return value / this.rules.GERAL.PT_PARA_CM;
    if (unit === 'mm') return value / (this.rules.GERAL.PT_PARA_CM * 10);
    
    return value;
  }

  parseSpacing(spacingStr) {
    if (!spacingStr) return null;
    
    if (spacingStr.endsWith('%')) {
      return parseFloat(spacingStr);
    }
    
    const match = spacingStr.match(/([\d.]+)(pt|px|cm)/);
    if (match) {
      return this.parseSize(spacingStr);
    }
    
    return parseFloat(spacingStr) || null;
  }

  checkFontSize(fontSize, expectedSize, tolerance = 0.5) {
    const actual = this.parseSize(fontSize);
    if (actual === null) return { valid: false, actual: null, expected: expectedSize };
    
    const valid = Math.abs(actual - expectedSize) <= tolerance;
    return { valid, actual, expected: expectedSize, difference: actual - expectedSize };
  }

  checkFont(fontFamily, allowedFonts) {
    if (!fontFamily) return { valid: false, actual: null };
    
    const cleanFont = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    const valid = allowedFonts.some(f => 
      cleanFont.toLowerCase().includes(f.toLowerCase())
    );
    
    return { valid, actual: cleanFont, allowed: allowedFonts };
  }

  checkLineSpacing(lineHeight, expectedPercent, tolerance = 5) {
    if (!lineHeight) return { valid: false, actual: null, expected: expectedPercent };
    
    let actualPercent = null;
    
    if (lineHeight.endsWith('%')) {
      actualPercent = parseFloat(lineHeight);
    } else if (lineHeight === 'normal') {
      actualPercent = 100;
    } else {
      const num = parseFloat(lineHeight);
      if (!isNaN(num)) {
        actualPercent = num * 100;
      }
    }
    
    if (actualPercent === null) return { valid: false, actual: lineHeight, expected: expectedPercent };
    
    const valid = Math.abs(actualPercent - expectedPercent) <= tolerance;
    return { valid, actual: actualPercent, expected: expectedPercent, difference: actualPercent - expectedPercent };
  }

  checkAlignment(textAlign, expected) {
    if (!textAlign) return { valid: false, actual: null, expected };
    
    const valid = textAlign === expected;
    return { valid, actual: textAlign, expected };
  }

  checkIndent(textIndent, expected, tolerance = 2) {
    const actual = this.parseSize(textIndent);
    if (actual === null) return { valid: false, actual: null, expected };
    
    const valid = Math.abs(actual - expected) <= tolerance;
    return { valid, actual, expected, difference: actual - expected };
  }

  checkMargin(margin, expected, tolerance = 1) {
    const actual = this.parseSize(margin);
    if (actual === null) return { valid: false, actual: null, expected };
    
    const valid = Math.abs(actual - expected) <= tolerance;
    return { valid, actual, expected, difference: actual - expected };
  }

  validateGeneralFormatting(element) {
    const issues = [];
    const scores = { earned: 0, max: 0 };
    
    const fontSizeCheck = this.checkFontSize(element.styles.fontSize, this.rules.GERAL.TAMANHO_TEXTO);
    scores.max += 10;
    if (fontSizeCheck.valid) {
      scores.earned += 10;
    } else {
      issues.push({
        rule: 'Tamanho da Fonte',
        expected: `${fontSizeCheck.expected}pt`,
        actual: fontSizeCheck.actual ? `${fontSizeCheck.actual}pt` : 'não definido',
        severity: 'medium'
      });
    }
    
    const fontCheck = this.checkFont(element.styles.fontFamily, this.rules.GERAL.FONTES);
    scores.max += 10;
    if (fontCheck.valid) {
      scores.earned += 10;
    } else {
      issues.push({
        rule: 'Fonte do Texto',
        expected: fontCheck.allowed.join(' ou '),
        actual: fontCheck.actual || 'não definida',
        severity: 'high'
      });
    }
    
    return { issues, scores };
  }

  validateDevelopmentFormatting(element) {
    const issues = [];
    const scores = { earned: 0, max: 0 };
    
    const spacingCheck = this.checkLineSpacing(element.styles.lineHeight, this.rules.DESENVOLVIMENTO.ESPACAMENTO);
    scores.max += 10;
    if (spacingCheck.valid) {
      scores.earned += 10;
    } else {
      issues.push({
        rule: 'Espaçamento entre Linhas',
        expected: `${spacingCheck.expected}%`,
        actual: spacingCheck.actual ? `${spacingCheck.actual}%` : 'não definido',
        severity: 'high'
      });
    }
    
    const alignCheck = this.checkAlignment(element.styles.textAlign, this.rules.DESENVOLVIMENTO.ALINHAMENTO_CORRETO);
    scores.max += 10;
    if (alignCheck.valid) {
      scores.earned += 10;
    } else {
      issues.push({
        rule: 'Alinhamento do Texto',
        expected: alignCheck.expected,
        actual: alignCheck.actual || 'não definido',
        severity: 'medium'
      });
    }
    
    if (element.styles.textIndent) {
      const indentCheck = this.checkIndent(element.styles.textIndent, this.rules.DESENVOLVIMENTO.RECUO);
      scores.max += 10;
      if (indentCheck.valid) {
        scores.earned += 10;
      } else {
        issues.push({
          rule: 'Recuo de Parágrafo',
          expected: `${indentCheck.expected}pt`,
          actual: `${indentCheck.actual}pt`,
          severity: 'low'
        });
      }
    }
    
    return { issues, scores };
  }

  validateReferenceFormatting(reference) {
    const issues = [];
    const scores = { earned: 0, max: 0 };
    
    const spacingCheck = this.checkLineSpacing(reference.styles.lineHeight, this.rules.REFERENCIAS.ESPACAMENTO);
    scores.max += 5;
    if (spacingCheck.valid || !reference.styles.lineHeight) {
      scores.earned += 5;
    } else {
      issues.push({
        rule: 'Espaçamento de Referências',
        expected: 'simples (0)',
        actual: spacingCheck.actual,
        severity: 'medium'
      });
    }
    
    const alignCheck = this.checkAlignment(reference.styles.textAlign, this.rules.REFERENCIAS.ALINHAMENTO);
    scores.max += 5;
    if (alignCheck.valid) {
      scores.earned += 5;
    } else {
      issues.push({
        rule: 'Alinhamento de Referências',
        expected: alignCheck.expected,
        actual: alignCheck.actual || 'não definido',
        severity: 'low'
      });
    }
    
    return { issues, scores };
  }
}

module.exports = ABNTRulesEngine;
