const fs = require('fs');
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

// Caminho do arquivo HTML gerado pelo Word
const filePath = './DesenvolvimentoTCCWeb.htm';

// Lê arquivo com buffer
const buffer = fs.readFileSync(filePath);

// Decodifica para UTF-8 (exemplo para Windows-1252)
const html = iconv.decode(buffer, 'windows-1252');

// Carrega HTML no cheerio (jQuery-like)
const $ = cheerio.load(html);

// Objeto para armazenar os estilos CSS do documento
const cssStyles = {};

// Função para parsear o bloco <style> e extrair estilos por classe
function parseStyleBlock() {
  const styleContent = $('style').html() || '';

  // Regex para encontrar seletores e suas propriedades
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;

  while ((match = ruleRegex.exec(styleContent)) !== null) {
    const selector = match[1].trim();
    const properties = match[2];

    // Parse das propriedades CSS
    const styleObj = {};
    properties.split(';').forEach(rule => {
      const [key, value] = rule.split(':').map(s => s?.trim());
      if (key && value) {
        styleObj[key] = value;
      }
    });

    // Armazena estilos para cada seletor (ex: "p.MsoNormal", "li.MsoNormal")
    selector.split(',').forEach(sel => {
      const cleanSel = sel.trim();
      cssStyles[cleanSel] = { ...cssStyles[cleanSel], ...styleObj };
    });
  }

  //console.log('=== CSS Classes encontradas ===');
  //console.log(Object.keys(cssStyles));
  //console.log('===============================\n');
}

// Parseia o bloco de estilos ao iniciar
parseStyleBlock();

// Função para obter estilo de uma classe CSS
function getStyleFromClass(elem, styleName) {
  if (!elem || !elem.length) return null;

  const tag = elem.prop('tagName')?.toLowerCase();
  const className = elem.attr('class') || '';

  // Tenta diferentes combinações de seletores
  const selectors = [
    `${tag}.${className}`,           // ex: p.MsoNormal
    `.${className}`,                  // ex: .MsoNormal
    tag                               // ex: p
  ];

  for (const selector of selectors) {
    if (cssStyles[selector] && cssStyles[selector][styleName]) {
      //console.log(`  → Fonte encontrada em CSS class: ${selector}`);
      return cssStyles[selector][styleName];
    }
  }

  return null;
}

// Função recursiva para buscar estilo inline e em classes (subindo na árvore)
function getResolvedStyle(elem, styleName) {
  if (!elem || !elem.length) return null;

  // 1. Primeiro tenta pegar do atributo style inline do elemento
  const styleAttr = elem.attr('style') || '';
  const styleObj = styleAttr.split(';').reduce((acc, rule) => {
    const [key, value] = rule.split(':').map(s => s?.trim());
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  if (styleObj[styleName]) {
    //console.log(`  → Fonte encontrada inline no elemento <${elem.prop('tagName')?.toLowerCase()}>`);
    return styleObj[styleName];
  }

  // 2. Se não encontrou inline, tenta pegar da classe CSS do elemento
  const classStyle = getStyleFromClass(elem, styleName);
  if (classStyle) {
    return classStyle;
  }

  // 3. Se não encontrou, tenta nos elementos <span> filhos (Word coloca fonte em spans)
  const spans = elem.find('span').first();
  if (spans.length > 0) {
    const spanInlineStyle = spans.attr('style') || '';
    const spanStyleObj = spanInlineStyle.split(';').reduce((acc, rule) => {
      const [key, value] = rule.split(':').map(s => s?.trim());
      if (key && value) acc[key] = value;
      return acc;
    }, {});

    if (spanStyleObj[styleName]) {
      //console.log(`  → Fonte encontrada inline no <span> filho`);
      return spanStyleObj[styleName];
    }

    const spanClassStyle = getStyleFromClass(spans, styleName);
    if (spanClassStyle) {
      return spanClassStyle;
    }
  }

  // 4. Sobe para o pai e tenta
  return getResolvedStyle(elem.parent(), styleName);
}

// Função para extrair texto limpo de um elemento, mantendo itálico/negrito como marcação simples
function extrairTexto(elem) {
  let texto = '';

  elem.contents().each((i, el) => {
    if (el.type === 'text') {
      texto += $(el).text().replace(/\u00A0/g, ' ');  // Substitui &nbsp; por espaço normal
    } else if (el.tagName === 'b') {
      texto += '**' + extrairTexto($(el)) + '**';
    } else if (el.tagName === 'i') {
      texto += '_' + extrairTexto($(el)) + '_';
    } else if (el.tagName === 'span') {
      texto += extrairTexto($(el));
    } else {
      texto += extrairTexto($(el));
    }
  });

  return texto.trim();
}

// Função para analisar se é lista (MsoListParagraphCxSpFirst, Middle, Last)
function isListParagraph(className) {
  if (!className) return false;
  return /MsoListParagraph/.test(className);
}

// Função para extrair estilos importantes (inline e resolvidos)
function extrairEstilosImportantes(elem) {
  /* 
  font-size: Tamanho da fonte do texto
  line-height: o espaçamento entre linhas do texto (150% para 1,5 linhas e 0 ou nulo para espaçamento simples)
  font-family: Fonte de texto do elemento (a primeira)
  text-align: Alinhamento do texto (justify para justificado, center para centralizado, left para esquerda e right para direita)
  text-indent: Récuo especial. Se for valor positivo (o "backspace" seria equivalente a 35.4pt em HTML ou 1,25 cm no Word), é o "primeira linha", caso seja negativo, "deslocamento"
  margin-top: Espaçamento antes
  margin-bottom: Espaçamento depois
  text-autospace: 
  */
  const fontSize = getResolvedStyle(elem, 'font-size') || '';
  const lineHeight = getResolvedStyle(elem, 'line-height') || '';
  const fontFamily = getResolvedStyle(elem, 'font-family') || '';
  const textAlign = getResolvedStyle(elem, 'text-align') || '';
  const textIndent = getResolvedStyle(elem, 'text-indent') || '';
  const marginTop = getResolvedStyle(elem, 'margin-top') || '';
  const marginBottom = getResolvedStyle(elem, 'margin-bottom') || '';


  const tipoAlinhamento ={
    'justify': 'justificado',
    'center': 'centralizado',
    'left': 'esquerda',
    'right': 'direita'
  }

  const tipoEspacamento ={
     '150%': '1,5 linhas',
     '0': 'simples',
  }

  let estilos = [];
  if (fontSize) estilos.push(`Tamanho da fonte: ${fontSize}`);
  if (lineHeight) estilos.push(`Espaçamento entre linhas: ${tipoEspacamento[lineHeight] ? tipoEspacamento[lineHeight] : "múltiplos"} (${lineHeight})`);
  if (fontFamily) estilos.push(`Fonte: ${fontFamily.split(',')[0]}`);
  if (textAlign) estilos.push(`Alinhamento: ${tipoAlinhamento[textAlign]}`);
  if (textIndent) estilos.push(`Récuo especial ${textIndent < 0 ? "deslocamento": "primeira linha"}: ${textIndent}`);
  if (marginTop) estilos.push(`Espaçamento antes: ${marginTop}`);
  if (marginBottom) estilos.push(`Espaçamento depois: ${marginBottom}`);

  return estilos.length > 0 ? `[${estilos.join(', ')}]` : '';
}

// Começa a análise
console.log('--- Análise simples do documento ---');

let sectionIndex = 1;

// Percorre as seções enquanto existirem (WordSection1, WordSection2, ...)
while (true) {
  const sectionSelector = `div.WordSection${sectionIndex}`;
  const sectionElem = $(sectionSelector);

  if (sectionElem.length === 0) break; // Para quando não encontrar mais seções

  console.log(`Seção ${sectionIndex}:`);

  sectionElem.children().each((j, elem) => {
    const tag = elem.tagName.toLowerCase();
    const $elem = $(elem);
    const className = $elem.attr('class') || '';

    const estilos = extrairEstilosImportantes($elem);

    // Títulos (h1 a h6)
    if (/^h[1-6]$/.test(tag)) {
      const nivel = tag[1];
      const textoTitulo = extrairTexto($elem);
      console.log(`  Título (Nível ${nivel}): ${textoTitulo} ${estilos}`);
    }
    // Parágrafos normais
    else if (tag === 'p' && className.includes('MsoNormal')) {
      const texto = extrairTexto($elem);
      if (texto) console.log(`  Parágrafo: ${texto} ${estilos}`);
    }
    // Parágrafos de lista
    else if (tag === 'p' && isListParagraph(className)) {
      let marcador = '';
      let textoLista = '';

      const spans = $elem.find('span');

      if (spans.length >= 2) {
        marcador = $(spans[0]).text().trim();
        textoLista = $(spans[1]).text().trim();
      } else {
        textoLista = $elem.text().trim();
      }

      if (textoLista) {
        console.log(`  Lista: ${marcador} ${textoLista} ${estilos}`);
      }
    }
    // Parágrafos de legenda (MsoCaption)
    else if (tag === 'p' && className.includes('MsoCaption')) {
      const texto = extrairTexto($elem);
      console.log(`  Legenda: ${texto} ${estilos}`);
    }
    // Tabela de conteúdo ou índice (MsoToc, MsoTof)
    else if (tag === 'p' && (className.includes('MsoToc') || className.includes('MsoTof'))) {
      const texto = extrairTexto($elem);
      console.log(`  Índice/Sumário: ${texto} ${estilos}`);
    }
  });

  sectionIndex++;
}

// Detectar referências no final (títulos ou palavras chaves)
const referencias = $('p.MsoNormal b').filter((i, el) => {
  const texto = $(el).text().toUpperCase();
  return texto.includes('REFERÊNCIAS') || texto.includes('REFERENCIAS');
});

if (referencias.length > 0) {
  console.log('\n--- Referências detectadas ---');
  referencias.each((i, ref) => {
    console.log(`  ${$(ref).text()}`);
  });

  // Para mostrar os parágrafos seguintes como referências:
  let refNode = referencias.first().parent();

  while (refNode.next().length > 0) {
    const prox = refNode.next();
    if (!prox.hasClass('MsoNormal')) break; // Parar se não for mais parágrafo normal
    const txt = extrairTexto(prox);
    if (txt.trim()) console.log(`  ${txt}`);
    refNode = prox;
  }
}

console.log('--- Fim da análise ---');
