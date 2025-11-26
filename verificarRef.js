const axios = require('axios');
const { Cite } = require('@citation-js/core');
require('@citation-js/plugin-csl');
require('@citation-js/plugin-doi');
const { CmpStr } = require('cmpstr');

const cmp = CmpStr.create().setMetric('levenshtein').setFlags('i');

async function verificaReferenciaCompleta(refString, refParsed, serpApiKey, scrapingDogKey) {
  const resultado = {
    success: false,
    formatos: {},
    dadosEncontrados: null,
    comparacoes: {
      serp: null,
      dog: null,
      openalex: null,
      crossref: null,
      citation: null
    }
  };

  console.log('Inicio da verificação para:', refString);

  // --- Busca via SerpAPI ---
    if (serpApiKey) {
      console.log('Consultando SerpAPI...');
    try {
        const dataSerp = await consultaSerpAPI(refString, serpApiKey);
        console.log('Resposta SerpAPI:', JSON.stringify(dataSerp, null, 2));
        if (dataSerp && dataSerp.organic_results && dataSerp.organic_results.length > 0) {
        const r = dataSerp.organic_results[0];
        const obra = extractFromSerpResult(r);
        console.log('SerpAPI encontrou:', obra.title, obra.year, obra.authors);

        // comparação de título melhorada:
        const normalizedObraTitle = normalizeString(obra.title);
        const normalizedRefTitle = normalizeString(refParsed.title);

        const sim = cmp.test([obra.title], refParsed.title);
        console.log('Similaridade SerpAPI:', sim.match);

        // condição adicional: substring check
        const substringMatch = normalizedObraTitle.includes(normalizedRefTitle) ||
                                normalizedRefTitle.includes(normalizedObraTitle);

        // threshold menor se substringMatch
        const threshold = substringMatch ? 0.4 : 0.6;

        if (sim.match >= threshold || substringMatch) {
            resultado.success = true;
            resultado.dadosEncontrados = obra;
            resultado.comparacoes.serp = { similarity: sim.match, substringMatch, obra };
            resultado.formatos.ABNT = formatarReferenciaABNT(obra, refParsed);
            return resultado;
        }
        } else {
        console.log('SerpAPI: nenhum resultado.');
        }
    } catch (err) {
        console.error('Erro SerpAPI - busca:', err.toString());
    }
    }

  console.log('Nenhuma correspondência suficiente encontrada.');
  return resultado;
}


// --- Funções de extração para SerpAPI / ScrapingDog ---

// função auxiliar para normalizar strings (se não tiver)
function normalizeString(s) {
  if (!s) return '';
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractFromSerpResult(r) {
  let authors = [];

  if (r.authors && Array.isArray(r.authors) && r.authors.length > 0) {
    authors = r.authors;
  } else if (r.publication_info && r.publication_info.summary) {
    authors = extractAuthorsFromSummary(r.publication_info.summary);
  }

  return {
    title: r.title || '',
    authors,
    year: extractYearFromSerp(r),
    publisher: (r.publication_info && r.publication_info.summary) ? r.publication_info.summary : null,
    type: r.type || '',
  };
}

function extractAuthorsFromSummary(summary) {
  // regex que tenta capturar até abreviações de iniciais
  // exemplo summary: "M. Medina, C Ferting - 2006 - books.google.com"
  const regex = /^([\w.\s,]+?)\s*-\s*(19|20)\d{2}/;
  const m = summary.match(regex);
  if (!m) return [];
  const authorsPart = m[1];  // "M. Medina, C Ferting"
  return authorsPart.split(',').map(a => a.trim());
}

function extractYearFromSerp(r) {
  if (r.publication_info && r.publication_info.summary) {
    const m = r.publication_info.summary.match(/(19|20)\d{2}/);
    return m ? Number(m[0]) : null;
  }
  return null;
}

function extractFromDogResult(r) {
  // Ajuste conforme modelo JSON de ScrapingDog
  return {
    title: r.title || '',
    authors: r.authors || [],
    year: extractYearFromDog(r),
    publisher: null,
    type: r.type || '',
  };
}

function extractYearFromSerp(r) {
  if (r.publication_info && r.publication_info.summary) {
    const m = r.publication_info.summary.match(/(19|20)\d{2}/);
    return m ? Number(m[0]) : null;
  }
  return null;
}

function extractYearFromDog(r) {
  if (r.issued && r.issued['date-parts'] && r.issued['date-parts'][0].length > 0) {
    return r.issued['date-parts'][0][0];
  }
  if (r.publication_info && r.publication_info.summary) {
    const m = r.publication_info.summary.match(/(19|20)\d{2}/);
    return m ? Number(m[0]) : null;
  }
  return null;
}


// --- Funções de consulta das APIs ---

async function consultaSerpAPI(refString, serpApiKey) {
  const url = 'https://serpapi.com/search';
  const params = {
    engine: 'google_scholar',
    q: refString,
    hl: 'en',
    api_key: serpApiKey
  };
  try {
    const resp = await axios.get(url, { params });
    return resp.data;
  } catch (err) {
    console.error('Erro SerpAPI - requisição:', err.toString());
    return null;
  }
}

async function consultaScrapingDog(refString, scrapingDogKey) {
  const url = 'https://api.scrapingdog.com/google_scholar';
  const params = {
    api_key: scrapingDogKey,
    query: refString,
    language: 'en',
    page: 0,
    results: 10
  };
  try {
    const resp = await axios.get(url, { params });
    return resp.data;
  } catch (err) {
    console.error('Erro ScrapingDog:', err.toString());
    return null;
  }
}


// --- Função para formatar ABNT simples ---

function formatarReferenciaABNT(item, refParsed) {
  let autoresArr = [];
  if (Array.isArray(item.authors) && item.authors.length > 0) {
    autoresArr = item.authors;
  } else if (item.author && Array.isArray(item.author)) {
    autoresArr = item.author.map(a => {
      if (typeof a === 'object') {
        const family = a.family || '';
        const given = a.given || '';
        return `${family.toUpperCase()}, ${given}`;
      }
      return a;
    });
  } else if (refParsed.authors) {
    autoresArr = refParsed.authors;
  }

  const autoresFormatados = autoresArr.join('; ');

  const title = item.title || refParsed.title;
  const publisher = item.publisher || item['publisher'] || '';
  const year = item.year || refParsed.year;

  return `${autoresFormatados}. ${title}. ${publisher}, ${year}.`.replace(/\s+/g, ' ').trim();
}

module.exports = { verificaReferenciaCompleta };
