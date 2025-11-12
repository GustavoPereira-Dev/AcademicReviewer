#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const ReviewOrchestrator = require('./reviewers/ReviewOrchestrator');

const program = new Command();

program
  .name('academic-reviewer')
  .description('Revisor automático de documentos acadêmicos conforme normas ABNT')
  .version('1.0.0');

program
  .command('review')
  .description('Revisar um documento acadêmico')
  .argument('<file>', 'Arquivo HTML do documento (gerado pelo Word)')
  .option('-t, --type <type>', 'Tipo do documento (monograph, article)', null)
  .option('-o, --output <file>', 'Arquivo de saída para o relatório JSON', null)
  .option('-q, --quiet', 'Modo silencioso (não imprime o relatório)', false)
  .action(async (file, options) => {
    try {
      const filePath = path.resolve(file);
      
      console.log(chalk.blue.bold('\n🎓 REVISOR ACADÊMICO ABNT'));
      console.log(chalk.gray('='.repeat(80)));
      console.log(chalk.white(`Arquivo: ${filePath}\n`));
      
      const orchestrator = new ReviewOrchestrator(filePath);
      
      if (options.output) {
        await orchestrator.exportReport(options.output, options.type);
      } else {
        await orchestrator.quickReview(options.type);
      }
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Erro: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Mostrar estatísticas do documento')
  .argument('<file>', 'Arquivo HTML do documento')
  .action(async (file) => {
    try {
      const filePath = path.resolve(file);
      const orchestrator = new ReviewOrchestrator(filePath);
      
      const stats = await orchestrator.getDocumentStatistics();
      
      console.log(chalk.blue.bold('\n📊 ESTATÍSTICAS DO DOCUMENTO'));
      console.log(chalk.gray('='.repeat(80)));
      
      console.log(chalk.cyan('\nEstrutura:'));
      console.log(`  Seções: ${chalk.white(stats.sections)}`);
      console.log(`  Cabeçalhos: ${chalk.white(stats.headings)}`);
      console.log(`  Parágrafos: ${chalk.white(stats.paragraphs)}`);
      console.log(`  Listas: ${chalk.white(stats.lists)}`);
      console.log(`  Figuras/Legendas: ${chalk.white(stats.figures)}`);
      
      console.log(chalk.cyan('\nConteúdo:'));
      console.log(`  Total de Palavras: ${chalk.white(stats.totalWords)}`);
      console.log(`  Citações: ${chalk.white(stats.citations)}`);
      console.log(`  Referências: ${chalk.white(stats.references)}`);
      
      console.log(chalk.cyan('\nMétricas:'));
      console.log(`  Palavras por Parágrafo: ${chalk.white(Math.round(stats.totalWords / stats.paragraphs))}`);
      console.log(`  Citações por Parágrafo: ${chalk.white((stats.citations / stats.paragraphs).toFixed(2))}`);
      console.log(`  Relação Citações/Referências: ${chalk.white((stats.citations / stats.references).toFixed(2))}`);
      
      console.log(chalk.gray('\n' + '='.repeat(80) + '\n'));
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Erro: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('types')
  .description('Listar tipos de documentos suportados')
  .action(() => {
    console.log(chalk.blue.bold('\n📚 TIPOS DE DOCUMENTOS SUPORTADOS'));
    console.log(chalk.gray('='.repeat(80)));
    
    console.log(chalk.cyan('\n1. Monografia (monograph)'));
    console.log('   Estrutura: Introdução, Desenvolvimento, Conclusão, Referências');
    console.log('   Uso: TCC, dissertações, trabalhos acadêmicos');
    
    console.log(chalk.cyan('\n2. Artigo Científico (article)'));
    console.log('   Estrutura: Resumo, Abstract, Introdução, Metodologia, Resultados, Conclusão, Referências');
    console.log('   Uso: Artigos para revistas, papers, publicações científicas');
    
    console.log(chalk.gray('\n' + '='.repeat(80)));
    console.log(chalk.yellow('\nDica: Use --type para especificar o tipo manualmente'));
    console.log(chalk.white('      Exemplo: review documento.htm --type article\n'));
  });

program
  .command('help-abnt')
  .description('Mostrar regras ABNT verificadas')
  .action(() => {
    console.log(chalk.blue.bold('\n📖 REGRAS ABNT VERIFICADAS'));
    console.log(chalk.gray('='.repeat(80)));
    
    console.log(chalk.cyan('\nFormatação Geral:'));
    console.log('  ✓ Tamanho da fonte: 12pt');
    console.log('  ✓ Fonte: Arial ou Times New Roman');
    console.log('  ✓ Espaçamento entre linhas: 1,5');
    console.log('  ✓ Alinhamento: Justificado');
    console.log('  ✓ Recuo de parágrafo: 35.4pt (1,25cm)');
    
    console.log(chalk.cyan('\nEstrutura:'));
    console.log('  ✓ Seções obrigatórias presentes');
    console.log('  ✓ Hierarquia de cabeçalhos');
    console.log('  ✓ Ordem das seções');
    
    console.log(chalk.cyan('\nReferências:'));
    console.log('  ✓ Ordem alfabética');
    console.log('  ✓ Espaçamento simples');
    console.log('  ✓ Alinhamento à esquerda');
    console.log('  ✓ Quantidade mínima de referências');
    
    console.log(chalk.cyan('\nCitações:'));
    console.log('  ✓ Formato (AUTOR, ANO)');
    console.log('  ✓ Densidade de citações');
    console.log('  ✓ Relação com referências');
    
    console.log(chalk.cyan('\nConteúdo:'));
    console.log('  ✓ Extensão do documento');
    console.log('  ✓ Tamanho médio dos parágrafos');
    console.log('  ✓ Presença de figuras e tabelas');
    
    console.log(chalk.gray('\n' + '='.repeat(80) + '\n'));
  });

program.parse();
