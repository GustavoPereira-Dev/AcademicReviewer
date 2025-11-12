const fs = require('fs');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

function loadDocument(filePath) {
  const buffer = fs.readFileSync(filePath);
  const html = iconv.decode(buffer, 'windows-1252');
  const $ = cheerio.load(html);
  const cssStyles = {};
  
  const styleContent = $('style').html() || '';
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(styleContent)) !== null) {
    const selector = match[1].trim();
    const properties = match[2];
    
    const styleObj = {};
    properties.split(';').forEach(rule => {
      const [key, value] = rule.split(':').map(s => s?.trim());
      if (key && value) {
        styleObj[key] = value;
      }
    });
    
    selector.split(',').forEach(sel => {
      const cleanSel = sel.trim();
      cssStyles[cleanSel] = { ...cssStyles[cleanSel], ...styleObj };
    });
  }
  
  return { $, cssStyles };
}

function getStyleFromClass(elem, styleName, cssStyles, $) {
  if (!elem || !elem.length) return null;
  
  const tag = elem.prop('tagName')?.toLowerCase();
  const className = elem.attr('class') || '';
  
  const selectors = [
    `${tag}.${className}`,
    `.${className}`,
    tag
  ];
  
  for (const selector of selectors) {
    if (cssStyles[selector] && cssStyles[selector][styleName]) {
      return cssStyles[selector][styleName];
    }
  }
  
  return null;
}

function getResolvedStyle(elem, styleName, cssStyles, $) {
  if (!elem || !elem.length) return null;
  
  const styleAttr = elem.attr('style') || '';
  const styleObj = styleAttr.split(';').reduce((acc, rule) => {
    const [key, value] = rule.split(':').map(s => s?.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  
  if (styleObj[styleName]) {
    return styleObj[styleName];
  }
  
  const classStyle = getStyleFromClass(elem, styleName, cssStyles, $);
  if (classStyle) {
    return classStyle;
  }
  
  const spans = elem.find('span').first();
  if (spans.length > 0) {
    const spanInlineStyle = spans.attr('style') || '';
    const spanStyleObj = spanInlineStyle.split(';').reduce((acc, rule) => {
      const [key, value] = rule.split(':').map(s => s?.trim());
      if (key && value) acc[key] = value;
      return acc;
    }, {});
    
    if (spanStyleObj[styleName]) {
      return spanStyleObj[styleName];
    }
    
    const spanClassStyle = getStyleFromClass(spans, styleName, cssStyles, $);
    if (spanClassStyle) {
      return spanClassStyle;
    }
  }
  
  return getResolvedStyle(elem.parent(), styleName, cssStyles, $);
}

function extractText(elem, $) {
  let texto = '';
  
  elem.contents().each((i, el) => {
    if (el.type === 'text') {
      texto += $(el).text().replace(/\u00A0/g, ' ');
    } else if (el.tagName === 'b') {
      texto += extractText($(el), $);
    } else if (el.tagName === 'i') {
      texto += extractText($(el), $);
    } else if (el.tagName === 'span') {
      texto += extractText($(el), $);
    } else {
      texto += extractText($(el), $);
    }
  });
  
  return texto.trim();
}

module.exports = {
  loadDocument,
  getStyleFromClass,
  getResolvedStyle,
  extractText
};
