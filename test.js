/**
 * test.js — Suite di test per CercaFile
 * Verifica i criteri di accettazione e la correttezza del parser.
 * Richiede Node.js (usa moduli built-in, nessuna dipendenza esterna).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// Carica il parser
const CercaFile = require('./public/parser.js');

let passed = 0;
let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertContains(haystack, needle, msg) {
  if (!haystack.includes(needle)) {
    throw new Error(msg || `Expected "${haystack}" to contain "${needle}"`);
  }
}

function assertNotContains(haystack, needle, msg) {
  if (haystack.includes(needle)) {
    throw new Error(msg || `Expected "${haystack}" NOT to contain "${needle}"`);
  }
}

console.log('CercaFile — Test Suite\n' + '='.repeat(50));

/* ================================================================
   CRITERI DI ACCETTAZIONE
   ================================================================ */

console.log('\n📋 Criteri di accettazione:');

test('"tutti i file pdf creati la settimana scorsa" genera un comando con find e -newermt', () => {
  const parsed = CercaFile.parseQuery('tutti i file pdf creati la settimana scorsa');
  const cmd = CercaFile.generateCommand(parsed);

  assert(cmd.startsWith('find'), 'Il comando deve iniziare con "find"');
  assertContains(cmd, '-type f', 'Deve contenere -type f');
  assertContains(cmd, '-name "*.pdf"', 'Deve contenere -name "*.pdf"');
  assertContains(cmd, '-newermt', 'Deve contenere -newermt per il filtro data');
  assert(parsed.exts.includes('pdf'), 'Deve rilevare estensione pdf');
  assert(parsed.date.dateAfter !== null, 'Deve rilevare una data di inizio');
});

test('"file più grandi di 100 MB" genera un comando con find -size', () => {
  const parsed = CercaFile.parseQuery('file più grandi di 100 MB');
  const cmd = CercaFile.generateCommand(parsed);

  assert(cmd.startsWith('find'), 'Il comando deve iniziare con "find"');
  assertContains(cmd, '-type f', 'Deve contenere -type f');
  assertContains(cmd, '-size +100M', 'Deve contenere -size +100M');
  assert(parsed.size.sizeMin === 100, 'Deve rilevare sizeMin = 100');
  assert(parsed.size.sizeUnit === 'M', 'Deve rilevare unità M (MB)');
});

/* ================================================================
   ESTENSIONI
   ================================================================ */

console.log('\n📋 Riconoscimento estensioni:');

test('Rileva estensione jpg', () => {
  const p = CercaFile.parseQuery('tutti i file jpg');
  assert(p.exts.includes('jpg'), 'jpg');
  assert(p.exts.includes('jpeg'), 'jpeg (mapped)');
});

test('Rileva estensione docx', () => {
  const p = CercaFile.parseQuery('file docx');
  assert(p.exts.includes('doc'), 'doc (mapped)');
  assert(p.exts.includes('docx'), 'docx');
});

test('Rileva categoria "immagini"', () => {
  const p = CercaFile.parseQuery('tutte le immagini sul desktop');
  assert(p.exts.length > 3, 'Deve mappare molte estensioni per "immagini"');
  assert(p.exts.includes('jpg'), 'deve includere jpg');
  assert(p.exts.includes('png'), 'deve includere png');
});

test('Rileva categoria "documenti"', () => {
  const p = CercaFile.parseQuery('documenti modificati oggi');
  assert(p.exts.includes('pdf'), 'deve includere pdf');
  assert(p.exts.includes('doc'), 'deve includere doc');
});

test('Rileva categoria "video"', () => {
  const p = CercaFile.parseQuery('tutti i video');
  assert(p.exts.includes('mp4'), 'deve includere mp4');
  assert(p.exts.includes('mov'), 'deve includere mov');
});

test('Rileva categoria "audio"', () => {
  const p = CercaFile.parseQuery('file audio');
  assert(p.exts.includes('mp3'), 'deve includere mp3');
});

test('Rileva categoria "archivi"', () => {
  const p = CercaFile.parseQuery('archivi compressi');
  assert(p.exts.includes('zip'), 'deve includere zip');
});

test('Rileva categoria "codice"', () => {
  const p = CercaFile.parseQuery('file di codice');
  assert(p.exts.includes('js'), 'deve includere js');
  assert(p.exts.includes('py'), 'deve includere py');
});

test('Estensioni multiple (pdf e doc)', () => {
  const p = CercaFile.parseQuery('file pdf e doc');
  assert(p.exts.includes('pdf'), 'pdf');
  assert(p.exts.includes('doc'), 'doc');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '\\(');
  assertContains(cmd, '-o');
});

/* ================================================================
   DIMENSIONE
   ================================================================ */

console.log('\n📋 Riconoscimento dimensione:');

test('"più grandi di 50 MB"', () => {
  const p = CercaFile.parseQuery('file più grandi di 50 MB');
  assert(p.size.sizeMin === 50, 'sizeMin = 50');
  assert(p.size.sizeUnit === 'M', 'unità M');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size +50M');
});

test('"maggiori di 2 GB"', () => {
  const p = CercaFile.parseQuery('file maggiori di 2 GB');
  assert(p.size.sizeMin === 2, 'sizeMin = 2');
  assert(p.size.sizeUnit === 'G', 'unità G');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size +2G');
});

test('"più piccoli di 10 KB"', () => {
  const p = CercaFile.parseQuery('file più piccoli di 10 KB');
  assert(p.size.sizeMax === 10, 'sizeMax = 10');
  assert(p.size.sizeUnit === 'k', 'unità k');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size -10k');
});

test('"minori di 500 MB"', () => {
  const p = CercaFile.parseQuery('file minori di 500 MB');
  assert(p.size.sizeMax === 500, 'sizeMax = 500');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size -500M');
});

test('"almeno 1 GB"', () => {
  const p = CercaFile.parseQuery('file almeno 1 GB');
  assert(p.size.sizeMin === 1, 'sizeMin = 1');
  assert(p.size.sizeUnit === 'G', 'unità G');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size +1G');
});

test('"esattamente 100 MB"', () => {
  const p = CercaFile.parseQuery('file esattamente 100 MB');
  assert(p.size.sizeExact === 100, 'sizeExact = 100');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-size 100M');
});

test('Dimensione con virgola (1,5 GB)', () => {
  const p = CercaFile.parseQuery('file più grandi di 1,5 GB');
  assert(p.size.sizeMin === 1.5, 'sizeMin = 1.5');
});

test('"oltre 200 mega"', () => {
  const p = CercaFile.parseQuery('file oltre 200 mega');
  assert(p.size.sizeMin === 200, 'sizeMin = 200');
});

/* ================================================================
   DATA
   ================================================================ */

console.log('\n📋 Riconoscimento data:');

test('"ieri" imposta dateAfter e dateBefore', () => {
  const p = CercaFile.parseQuery('file modificati ieri');
  assert(p.date.dateAfter !== null, 'dateAfter presente');
  assert(p.date.dateBefore !== null, 'dateBefore presente (per delimitare il giorno)');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-newermt');
  assertContains(cmd, '! -newermt');
});

test('"oggi" imposta solo dateAfter', () => {
  const p = CercaFile.parseQuery('file creati oggi');
  assert(p.date.dateAfter !== null, 'dateAfter presente');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-newermt');
  // Oggi non ha dateBefore (tutto ciò che è dopo mezzanotte)
});

test('"la settimana scorsa" imposta dateAfter a 7 giorni fa', () => {
  const p = CercaFile.parseQuery('file pdf creati la settimana scorsa');
  assert(p.date.dateAfter !== null, 'dateAfter presente');
  const now = new Date();
  const expected = new Date(now);
  expected.setDate(expected.getDate() - 7);
  const expectedStr = CercaFile._formatDate(expected);
  assert(p.date.dateAfter === expectedStr, `dateAfter = ${expectedStr}, got ${p.date.dateAfter}`);
});

test('"il mese scorso" imposta dateAfter a ~30 giorni fa', () => {
  const p = CercaFile.parseQuery('file modificati il mese scorso');
  assert(p.date.dateAfter !== null);
  const now = new Date();
  const expected = new Date(now);
  expected.setMonth(expected.getMonth() - 1);
  assert(p.date.dateAfter === CercaFile._formatDate(expected));
});

test('"negli ultimi 3 giorni"', () => {
  const p = CercaFile.parseQuery('file negli ultimi 3 giorni');
  assert(p.date.dateAfter !== null);
  const now = new Date();
  const expected = new Date(now);
  expected.setDate(expected.getDate() - 3);
  assert(p.date.dateAfter === CercaFile._formatDate(expected));
});

test('"5 giorni fa"', () => {
  const p = CercaFile.parseQuery('file modificati 5 giorni fa');
  assert(p.date.dateAfter !== null);
  const now = new Date();
  const expected = new Date(now);
  expected.setDate(expected.getDate() - 5);
  assert(p.date.dateAfter === CercaFile._formatDate(expected));
});

test('"2 ore fa"', () => {
  const p = CercaFile.parseQuery('file modificati 2 ore fa');
  assert(p.date.dateAfter !== null);
});

test('Data specifica "15/03/2025"', () => {
  const p = CercaFile.parseQuery('file creati il 15/03/2025');
  assert(p.date.dateAfter === '2025-03-15');
  assert(p.date.dateBefore === '2025-03-16');
});

test('Data specifica "01-01-2024"', () => {
  const p = CercaFile.parseQuery('file modificati il 01-01-2024');
  assert(p.date.dateAfter === '2024-01-01');
});

/* ================================================================
   NOME
   ================================================================ */

console.log('\n📋 Riconoscimento nome:');

test('"con nome relazione" → nome esatto', () => {
  const p = CercaFile.parseQuery('file con nome relazione');
  assert(p.name.namePattern === 'relazione');
  assert(p.name.nameMatchType === 'exact');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-name "relazione"');
});

test('"chiamati fattura" → nome esatto', () => {
  const p = CercaFile.parseQuery('file chiamati fattura');
  assert(p.name.namePattern === 'fattura');
  assert(p.name.nameMatchType === 'exact');
});

test('"che contengono progetto" → contiene', () => {
  const p = CercaFile.parseQuery('file che contengono progetto');
  assert(p.name.namePattern === 'progetto');
  assert(p.name.nameMatchType === 'contains');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-name "*progetto*"');
});

test('"che iniziano con IMG" → inizia con', () => {
  const p = CercaFile.parseQuery('file che iniziano con IMG');
  assert(p.name.namePattern === 'img', `got: ${p.name.namePattern}`);
  assert(p.name.nameMatchType === 'startsWith');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-name "img*"');
});

test('"che finiscono con backup" → finisce con', () => {
  const p = CercaFile.parseQuery('file che finiscono con backup');
  assert(p.name.namePattern === 'backup');
  assert(p.name.nameMatchType === 'endsWith');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-name "*backup"');
});

/* ================================================================
   PERCORSO
   ================================================================ */

console.log('\n📋 Riconoscimento percorso:');

test('"in ~/Documenti"', () => {
  const p = CercaFile.parseQuery('file in ~/Documenti');
  assert(p.path === '~/documenti', `got: ${p.path}`);
});

test('"in /var/log"', () => {
  const p = CercaFile.parseQuery('file in /var/log');
  assert(p.path === '/var/log');
});

test('"nella cartella Progetti"', () => {
  const p = CercaFile.parseQuery('file nella cartella Progetti');
  assert(p.path === 'progetti', `got: ${p.path}`);
});

test('"sul desktop" → ~/desktop', () => {
  const p = CercaFile.parseQuery('file sul desktop');
  assert(p.path === '~/desktop', `got: ${p.path}`);
});

test('"nei documenti" → ~/documents', () => {
  const p = CercaFile.parseQuery('file nei documenti');
  assert(p.path === '~/documents', `got: ${p.path}`);
});

test('"nei download" → ~/downloads', () => {
  const p = CercaFile.parseQuery('file nei download');
  assert(p.path === '~/downloads', `got: ${p.path}`);
});

test('"nella home" → ~', () => {
  const p = CercaFile.parseQuery('file nella home');
  assert(p.path === '~');
});

test('Percorso predefinito è "."', () => {
  const p = CercaFile.parseQuery('file pdf');
  assert(p.path === '.');
});

/* ================================================================
   TIPO (FILE vs DIRECTORY)
   ================================================================ */

console.log('\n📋 Tipo file/directory:');

test('Default: file (-type f)', () => {
  const p = CercaFile.parseQuery('file pdf');
  assert(p.type === 'f');
});

test('"cartelle" → -type d', () => {
  const p = CercaFile.parseQuery('cartelle vuote');
  assert(p.type === 'd');
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-type d');
});

test('"directory" → -type d', () => {
  const p = CercaFile.parseQuery('directory modificate oggi');
  assert(p.type === 'd');
});

/* ================================================================
   PROFONDITÀ
   ================================================================ */

console.log('\n📋 Profondità:');

test('"massimo 3 livelli" → -maxdepth 3', () => {
  const p = CercaFile.parseQuery('file pdf massimo 3 livelli');
  assert(p.depth === 3);
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-maxdepth 3');
});

test('"solo nella cartella corrente" → -maxdepth 1', () => {
  const p = CercaFile.parseQuery('file solo nella cartella corrente');
  assert(p.depth === 1);
});

/* ================================================================
   CASE INSENSITIVE
   ================================================================ */

console.log('\n📋 Case insensitive:');

test('"non sensibile al case" → -iname', () => {
  const p = CercaFile.parseQuery('file pdf non sensibile al case');
  assert(p.caseInsensitive === true);
  const cmd = CercaFile.generateCommand(p);
  assertContains(cmd, '-iname');
  assertNotContains(cmd, '-name ');
});

/* ================================================================
   COMANDI COMBINATI
   ================================================================ */

console.log('\n📋 Comandi combinati:');

test('Nome + estensione + dimensione + data + percorso', () => {
  const p = CercaFile.parseQuery('documenti che contengono fattura più grandi di 1 MB modificati la settimana scorsa in ~/Documents');
  const cmd = CercaFile.generateCommand(p);

  assert(cmd.startsWith('find ~/documents'), `cmd starts: ${cmd.substring(0, 30)}`);
  assertContains(cmd, '-type f');
  assertContains(cmd, 'fattura', 'contiene nome');
  assertContains(cmd, '*.pdf', 'estensione pdf (da documenti)');
  assertContains(cmd, '-size +1M', 'dimensione > 1MB');
  assertContains(cmd, '-newermt', 'filtro data');
});

test('Comando senza filtri specifici genera find base', () => {
  const p = CercaFile.parseQuery('trova tutti i file');
  const cmd = CercaFile.generateCommand(p);
  assert(cmd.startsWith('find . -type f'), 'find base');
  assertContains(cmd, '-print');
});

test('Spiegazione generata correttamente', () => {
  const p = CercaFile.parseQuery('file pdf più grandi di 10 MB in ~/Desktop');
  const expl = CercaFile.generateExplanation(p);
  assertContains(expl, 'file');
  assertContains(expl, 'PDF');
  assertContains(expl, '10');
  assertContains(expl.toLowerCase(), 'desktop');
});

/* ================================================================
   NORMALIZZAZIONE
   ================================================================ */

console.log('\n📋 Normalizzazione input:');

test('Rimuove punteggiatura e normalizza spazi', () => {
  const q = CercaFile._normalize('  Ciao,   mondo! Come   stai?  ');
  assert(q === 'ciao mondo come stai', `got: "${q}"`);
});

/* ================================================================
   SERVER TEST
   ================================================================ */

console.log('\n📋 Test server HTTP:');

test('Il file index.html esiste ed è servibile', (done) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  assert(fs.existsSync(filePath), 'index.html esiste');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert(content.includes('<!DOCTYPE html>'), 'Contiene DOCTYPE');
  assert(content.includes('<html lang="it">'), 'Contiene lang="it"');
  assert(content.includes('<title>CercaFile'), 'Contiene title');
  assert(content.includes('og:title'), 'Contiene Open Graph');
  assert(content.includes('application/ld+json'), 'Contiene JSON-LD');
  assert(content.includes('<link rel="canonical"'), 'Contiene canonical');
  assert(content.includes('cristianporco.it/app/cercafile/'), 'URL canonico corretto');
  assert(content.includes('<base href="./">'), 'Contiene base href');
  // Verifica che non ci siano path assoluti (eccetto quelli consentiti)
  const absolutePaths = content.match(/(?:src|href)=["']\/(?!\/)[^"']*["']/g) || [];
  // Filtra quelli consentiti (Google Fonts, schema.org)
  const forbidden = absolutePaths.filter(p => {
    return !p.includes('fonts.googleapis.com') &&
           !p.includes('fonts.gstatic.com') &&
           !p.includes('schema.org') &&
           !p.includes('sitemaps.org');
  });
  assert(forbidden.length === 0, `Path assoluti non consentiti: ${forbidden.join(', ')}`);
});

test('robots.txt esiste e contiene Sitemap', () => {
  const p = path.join(__dirname, 'public', 'robots.txt');
  assert(fs.existsSync(p), 'robots.txt esiste');
  const content = fs.readFileSync(p, 'utf-8');
  assertContains(content, 'Sitemap:');
  assertContains(content, 'cristianporco.it/app/cercafile/sitemap.xml');
});

test('sitemap.xml esiste e contiene URL canonico', () => {
  const p = path.join(__dirname, 'public', 'sitemap.xml');
  assert(fs.existsSync(p), 'sitemap.xml esiste');
  const content = fs.readFileSync(p, 'utf-8');
  assertContains(content, 'cristianporco.it/app/cercafile/');
  assertContains(content, '<urlset');
});

test('parser.js esporta le funzioni attese', () => {
  assert(typeof CercaFile.parseQuery === 'function');
  assert(typeof CercaFile.generateCommand === 'function');
  assert(typeof CercaFile.generateExplanation === 'function');
  assert(typeof CercaFile._normalize === 'function');
  assert(typeof CercaFile._matchExt === 'function');
  assert(typeof CercaFile._matchSize === 'function');
  assert(typeof CercaFile._matchDate === 'function');
  assert(typeof CercaFile._matchName === 'function');
  assert(typeof CercaFile._matchPath === 'function');
});

/* ================================================================
   RIEPILOGO
   ================================================================ */

console.log('\n' + '='.repeat(50));
console.log(`Risultati: ${passed} passati, ${failed} falliti, ${total} totali`);

if (failed > 0) {
  console.log('\n❌ Alcuni test sono falliti.');
  process.exit(1);
} else {
  console.log('\n✅ Tutti i test sono passati!');
  process.exit(0);
}
