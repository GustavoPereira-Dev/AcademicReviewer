// executarRef.js
const { loadEnvFile } = require('node:process');

// Loads environment variables from the default .env file
loadEnvFile();

console.log(process.env.TEST); // Logs '1234'

const { verificaReferenciaCompleta } = require('./verificarRef');

const refString = 'LOPES, Anita; GARCIA, Guto. Introdução à programação. Rio de Janeiro, v. 19, 2002.';
const refParsed = {
  title: 'Introdução à Programação: 500 Algoritmos Resolvidos',
  authors: ['Lopes, Anita', 'Garcia, Guto'],
  year: 2002,
  isbn: '9788535210194',
  type: 'Livro',
};
const serpApiKey = process.env.SERP_API_KEY;
const scrapingDogKey = process.env_SCRAPING_DOG_KEY;

verificaReferenciaCompleta(refString, refParsed, serpApiKey, scrapingDogKey)
  .then(resultado => {
    if (resultado.success) {
      console.log('Referência formatada (ABNT):', resultado.formatos.ABNT);
    } else {
      console.log('Não foi possível verificar a referência.');
    }
  })
  .catch(error => {
    console.error('Erro ao verificar a referência:', error);
  });