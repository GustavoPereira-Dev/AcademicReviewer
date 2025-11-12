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
    try {
        const dataSerp = await consultaSerpAPI(refString, serpApiKey);
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
        console.error('Erro SerpAPI:', err.toString());
    }
    }


  // --- Busca via ScrapingDog ---
  if (!resultado.success && scrapingDogKey) {
    try {
      const dataDog = await consultaScrapingDog(refString, scrapingDogKey);
      if (dataDog && dataDog.scholar_results && dataDog.scholar_results.length > 0) {
        const r = dataDog.scholar_results[0];
        const obra = extractFromDogResult(r);
        console.log('ScrapingDog encontrou:', obra.title, obra.year, obra.authors);
        const sim = cmp.test([obra.title], refParsed.title);
        console.log('Similaridade ScrapingDog:', sim.match);
        resultado.comparacoes.dog = { similarity: sim.match, obra };
        if (sim.match >= 0.6) {
          resultado.success = true;
          resultado.dadosEncontrados = obra;
          resultado.formatos.ABNT = formatarReferenciaABNT(obra, refParsed);
          return resultado;
        }
      } else {
        console.log('ScrapingDog: nenhum resultado.');
      }
    } catch (err) {
      console.error('Erro ScrapingDog:', err.toString());
    }
  }

  // --- ISBN via CrossRef (se houver) ---
  if (refParsed.isbn) {
    try {
      console.log('Tentando buscar por ISBN no CrossRef:', refParsed.isbn);
      const respISBN = await axios.get('https://api.crossref.org/works', {
        params: {
          filter: `isbn:${refParsed.isbn}`,
          rows: 1
        }
      });
      if (respISBN.data && respISBN.data.message.items && respISBN.data.message.items.length > 0) {
        const item = respISBN.data.message.items[0];
        const titleItem = Array.isArray(item.title) ? item.title[0] : item.title;
        console.log('CrossRef ISBN encontrou:', titleItem);
        const sim = cmp.test([titleItem], refParsed.title);
        console.log('Similaridade CrossRef ISBN:', sim.match);
        resultado.comparacoes.crossref = { method: 'isbn', similarity: sim.match, item };
        if (sim.match >= 0.6) {
          resultado.success = true;
          resultado.dadosEncontrados = item;
          resultado.formatos.ABNT = formatarReferenciaABNT(item, refParsed);
          return resultado;
        }
      } else {
        console.log('CrossRef ISBN: nenhum resultado.');
      }
    } catch (err) {
      console.error('Erro CrossRef ISBN:', err.toString());
    }
  }

  // --- Busca OpenAlex título parcial ---
  try {
    const paramsOA = {
      filter: `title.search:${encodeURIComponent(refParsed.title)}`,
      per_page: 5
    };
    console.log('Buscando no OpenAlex com título parcial:', refParsed.title);
    const respOA = await axios.get('https://api.openalex.org/works', { params: paramsOA });
    const dataOA = respOA.data;
    console.log('OpenAlex count:', dataOA.meta ? dataOA.meta.count : 'sem meta');
    if (dataOA && dataOA.results && dataOA.results.length > 0) {
      for (const work of dataOA.results) {
        const titleOA = work.title;
        const sim = cmp.test([titleOA], refParsed.title);
        console.log('Candidato OA:', titleOA, '=> similaridade', sim.match);
        if (sim.match >= 0.6) {
          resultado.success = true;
          resultado.dadosEncontrados = work;
          resultado.comparacoes.openalex = { similarity: sim.match, work };
          resultado.formatos.ABNT = formatarReferenciaABNT(work, refParsed);
          return resultado;
        }
      }
    } else {
      console.log('OpenAlex: nenhum resultado relevante.');
    }
  } catch (err) {
    console.error('Erro OpenAlex:', err.toString());
  }

  // --- Busca genérica CrossRef ---
  try {
    console.log('Busca genérica CrossRef:', refString);
    const respCR = await axios.get('https://api.crossref.org/works', {
      params: {
        query: refString,
        rows: 3
      }
    });
    const dataCR = respCR.data;
    console.log('CrossRef items genéricos:', (dataCR.message && dataCR.message.items) ? dataCR.message.items.length : 0);
    if (dataCR.message && dataCR.message.items && dataCR.message.items.length > 0) {
      for (const item of dataCR.message.items) {
        const titleItem = Array.isArray(item.title) ? item.title[0] : item.title;
        const sim = cmp.test([titleItem], refParsed.title);
        console.log('Candidato CrossRef genérico:', titleItem, '=>', sim.match);
        if (sim.match >= 0.6) {
          resultado.success = true;
          resultado.dadosEncontrados = item;
          resultado.comparacoes.crossref = { similarity: sim.match, item };
          resultado.formatos.ABNT = formatarReferenciaABNT(item, refParsed);
          return resultado;
        }
      }
    } else {
      console.log('CrossRef genérico: nenhum resultado.');
    }
  } catch (err) {
    console.error('Erro CrossRef genérico:', err.toString());
  }

  // --- Fallback Citation.js ---
  try {
    console.log('Tentando fallback Citation.js');
    let citationEntries = [];
    if (typeof Cite.async === 'function') {
      citationEntries = await Cite.async(refString);
      console.log('Cite.async retornou:', citationEntries.length);
    } else if (typeof Cite.inputAsync === 'function') {
      citationEntries = await Cite.inputAsync(refString);
      console.log('Cite.inputAsync retornou:', citationEntries.length);
    } else {
      console.log('Nenhum método assíncrono de Cite disponível');
    }

    if (citationEntries && citationEntries.length > 0) {
      resultado.success = true;
      resultado.dadosEncontrados = citationEntries[0];
      resultado.comparacoes.citation = { entries: citationEntries.length };
      resultado.formatos.ABNT = citationEntries[0].format('bibliography', {
        format: 'text',
        template: 'abnt',
        lang: 'pt-BR'
      });
      return resultado;
    }
  } catch (err) {
    console.error('Erro Citation.js fallback:', err.toString());
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
    console.error('Erro SerpAPI:', err.toString());
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
