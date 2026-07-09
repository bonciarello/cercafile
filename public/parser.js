/**
 * parser.js — Generatore di comandi find da descrizioni in italiano.
 * Espone l'oggetto globale `CercaFile` con le funzioni di parsing e generazione.
 */
(function (global) {
  'use strict';

  /* ================================================================
     MAPPATURE
     ================================================================ */

  const EXT_MAP = {
    pdf: ['pdf'], jpg: ['jpg','jpeg'], jpeg: ['jpg','jpeg'],
    png: ['png'], gif: ['gif'], bmp: ['bmp'], svg: ['svg'],
    webp: ['webp'], tiff: ['tiff','tif'], ico: ['ico'], heic: ['heic'],
    doc: ['doc','docx'], docx: ['doc','docx'],
    xls: ['xls','xlsx'], xlsx: ['xls','xlsx'],
    ppt: ['ppt','pptx'], pptx: ['ppt','pptx'],
    txt: ['txt'], md: ['md'], rtf: ['rtf'],
    csv: ['csv'], json: ['json'], xml: ['xml'],
    html: ['html','htm'], css: ['css'], scss: ['scss'], less: ['less'],
    js: ['js','mjs','cjs'], ts: ['ts','tsx'], jsx: ['jsx'],
    py: ['py'], rb: ['rb'], php: ['php'],
    java: ['java'], c: ['c','h'], cpp: ['cpp','cxx','hpp','hxx'],
    swift: ['swift'], kt: ['kt','kts'], go: ['go'], rs: ['rs'],
    mp3: ['mp3'], mp4: ['mp4'], mov: ['mov'], avi: ['avi'],
    mkv: ['mkv'], webm: ['webm'], flv: ['flv'], wmv: ['wmv'],
    wav: ['wav'], flac: ['flac'], aac: ['aac'], ogg: ['ogg'], m4a: ['m4a'],
    zip: ['zip'], rar: ['rar'], tar: ['tar'], gz: ['gz','gzip'],
    '7z': ['7z'], bz2: ['bz2'], xz: ['xz'],
    dmg: ['dmg'], iso: ['iso'], pkg: ['pkg'], app: ['app'],
    exe: ['exe'], msi: ['msi'], bat: ['bat'], sh: ['sh','bash','zsh'],
    log: ['log'], ini: ['ini'], cfg: ['cfg','conf'],
    yaml: ['yaml','yml'], toml: ['toml'], lock: ['lock'],
    sql: ['sql'], db: ['db','sqlite'], env: ['env'],
    psd: ['psd'], ai: ['ai'], eps: ['eps'], svgz: ['svgz'],
    otf: ['otf'], ttf: ['ttf'], woff: ['woff'], woff2: ['woff2'],
  };

  const CATEGORY_MAP = {
    immagine: ['jpg','jpeg','png','gif','bmp','svg','webp','tiff','ico','heic','raw','psd'],
    immagini: ['jpg','jpeg','png','gif','bmp','svg','webp','tiff','ico','heic','raw','psd'],
    foto: ['jpg','jpeg','png','gif','heic','webp','raw'],
    fotografia: ['jpg','jpeg','png','gif','heic','webp','raw'],
    fotografie: ['jpg','jpeg','png','gif','heic','webp','raw'],
    documento: ['pdf','doc','docx','txt','odt','rtf','md','pages'],
    documenti: ['pdf','doc','docx','txt','odt','rtf','md','pages'],
    video: ['mp4','mov','avi','mkv','webm','flv','wmv','m4v'],
    filmato: ['mp4','mov','avi','mkv','webm'],
    filmati: ['mp4','mov','avi','mkv','webm'],
    audio: ['mp3','wav','flac','aac','ogg','m4a','wma','aiff'],
    musica: ['mp3','wav','flac','aac','ogg','m4a'],
    canzone: ['mp3','m4a','flac','ogg','wav'],
    canzoni: ['mp3','m4a','flac','ogg','wav'],
    archivio: ['zip','rar','tar','gz','7z','bz2','xz'],
    archivi: ['zip','rar','tar','gz','7z','bz2','xz'],
    compresso: ['zip','rar','tar','gz','7z','bz2'],
    compressi: ['zip','rar','tar','gz','7z','bz2'],
    foglio: ['xls','xlsx','csv','ods','numbers'],
    fogli: ['xls','xlsx','csv','ods','numbers'],
    'foglio di calcolo': ['xls','xlsx','csv','ods','numbers'],
    'fogli di calcolo': ['xls','xlsx','csv','ods','numbers'],
    presentazione: ['ppt','pptx','odp','key'],
    presentazioni: ['ppt','pptx','odp','key'],
    testo: ['txt','md','rtf','log'],
    codice: ['js','ts','jsx','tsx','py','rb','java','c','cpp','h','html','css','scss','less','json','xml','yaml','yml','sh','bash','zsh','swift','kt','go','rs','php','sql'],
    sorgente: ['js','ts','jsx','tsx','py','rb','java','c','cpp','h','swift','kt','go','rs','php'],
    eseguibile: ['exe','app','sh','bash','command','bat','msi','com'],
    font: ['otf','ttf','woff','woff2','eot'],
  };

  const SIZE_UNITS = {
    'byte': 'c', 'bytes': 'c', 'b': 'c',
    'kb': 'k', 'kilobyte': 'k', 'kib': 'k', 'kilo': 'k',
    'mb': 'M', 'megabyte': 'M', 'mib': 'M', 'mega': 'M',
    'gb': 'G', 'gigabyte': 'G', 'gib': 'G', 'giga': 'G',
    'tb': 'T', 'terabyte': 'T', 'tib': 'T',
  };

  /* ================================================================
     NORMALIZZAZIONE
     ================================================================ */

  function normalize(q) {
    return q
      .toLowerCase()
      // Preserva le virgole decimali (1,5 → 1.5) prima di rimuovere la punteggiatura
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/[,;:!?()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* ================================================================
     PATTERN MATCHING
     ================================================================ */

  function matchExt(q) {
    const exts = [];

    // Estensioni specifiche menzionate
    const extPattern = /\b(pdf|jpe?g|png|gif|bmp|svgz?|webp|tiff?|ico|heic|docx?|xlsx?|pptx?|txt|md|rtf|csv|json|xml|html?|css|scss|less|jsx?|tsx?|mjs|cjs|pyc?|rb|php|java|class|cpp|cxx|hpp|hxx|mp[34]|mov|avi|mkv|webm|flv|wmv|wav|flac|aac|ogg|m4a|zip|rar|tar|gz|7z|bz2|xz|dmg|iso|pkg|app|exe|msi|bat|sh|bash|zsh|log|ini|cfg|conf|ya?ml|toml|lock|sql|db|sqlite|env|psd|ai|eps|otf|ttf|woff2?)\b/gi;
    let m;
    while ((m = extPattern.exec(q)) !== null) {
      const raw = m[1].toLowerCase();
      const mapped = EXT_MAP[raw] || [raw];
      for (const e of mapped) {
        if (!exts.includes(e)) exts.push(e);
      }
    }

    // Categorie (es. "immagini", "documenti")
    for (const [cat, catExts] of Object.entries(CATEGORY_MAP)) {
      const catRegex = new RegExp('\\b' + cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (catRegex.test(q)) {
        for (const e of catExts) {
          if (!exts.includes(e)) exts.push(e);
        }
      }
    }

    return exts;
  }

  function matchSize(q) {
    let sizeMin = null, sizeMax = null, sizeExact = null, sizeUnit = 'M';

    // "più grandi di X MB", "maggiori di X MB", "almeno X MB", "oltre X MB"
    let m = q.match(/(?:più\s+grand[ei]|maggior[ei]|superior[ei]|almeno|oltre|sopra\s+(?:i\s+)?)\s+(?:di\s+)?(\d+(?:[.,]\d+)?)\s*(mb|gb|kb|tb|byte|bytes|megabyte|gigabyte|kilobyte|terabyte|mega|giga|kilo)?\b/i);
    if (m) {
      sizeMin = parseFloat(m[1].replace(',', '.'));
      if (m[2]) sizeUnit = SIZE_UNITS[m[2].toLowerCase()] || 'M';
    }

    // "più piccoli di X MB", "minori di X MB", "meno di X MB", "sotto X MB"
    m = q.match(/(?:più\s+piccol[ei]|minor[ei]|inferior[ei]|meno\s+di|sotto\s+(?:i\s+)?)\s+(?:di\s+)?(\d+(?:[.,]\d+)?)\s*(mb|gb|kb|tb|byte|bytes|megabyte|gigabyte|kilobyte|terabyte|mega|giga|kilo)?\b/i);
    if (m) {
      sizeMax = parseFloat(m[1].replace(',', '.'));
      if (m[2]) sizeUnit = SIZE_UNITS[m[2].toLowerCase()] || 'M';
    }

    // "esattamente X MB", "precisamente X MB"
    m = q.match(/(?:esattamente|precisamente|di\s+esattamente)\s+(\d+(?:[.,]\d+)?)\s*(mb|gb|kb|tb|byte|bytes|megabyte|gigabyte|kilobyte|terabyte|mega|giga|kilo)?\b/i);
    if (m) {
      sizeExact = parseFloat(m[1].replace(',', '.'));
      if (m[2]) sizeUnit = SIZE_UNITS[m[2].toLowerCase()] || 'M';
    }

    // Forma breve: "> 100 MB" o "100+ MB"
    if (sizeMin === null && sizeMax === null && sizeExact === null) {
      m = q.match(/[>≥]\s*(\d+(?:[.,]\d+)?)\s*(mb|gb|kb|tb|byte|bytes|mega|giga|kilo)?\b/i);
      if (m) {
        sizeMin = parseFloat(m[1].replace(',', '.'));
        if (m[2]) sizeUnit = SIZE_UNITS[m[2].toLowerCase()] || 'M';
      }
      m = q.match(/[<≤]\s*(\d+(?:[.,]\d+)?)\s*(mb|gb|kb|tb|byte|bytes|mega|giga|kilo)?\b/i);
      if (m) {
        sizeMax = parseFloat(m[1].replace(',', '.'));
        if (m[2]) sizeUnit = SIZE_UNITS[m[2].toLowerCase()] || 'M';
      }
    }

    return { sizeMin, sizeMax, sizeExact, sizeUnit };
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function matchDate(q) {
    let dateAfter = null;
    let dateBefore = null;
    const now = new Date();

    // Ieri
    if (/\bieri\b/i.test(q)) {
      const d = new Date(now); d.setDate(d.getDate() - 1);
      dateAfter = formatDate(d);
      dateBefore = formatDate(now);
    }
    // Oggi
    else if (/\boggi\b/i.test(q)) {
      dateAfter = formatDate(now);
    }
    // L'altro ieri
    else if (/\bl['’]?altro\s+ieri\b/i.test(q) || /\baltroieri\b/i.test(q)) {
      const d = new Date(now); d.setDate(d.getDate() - 2);
      dateAfter = formatDate(d);
      const d2 = new Date(now); d2.setDate(d2.getDate() - 1);
      dateBefore = formatDate(d2);
    }
    // Settimana scorsa
    else if (/\b(?:la\s+)?(?:settimana|scorsa)\s+(?:scorsa|settimana)\b/i.test(q) ||
             /\bsettimana\s+scorsa\b/i.test(q) || /\bscorsa\s+settimana\b/i.test(q)) {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      dateAfter = formatDate(d);
    }
    // Mese scorso
    else if (/\b(?:il|lo)\s+(?:mese|scorso)\s+(?:scorso|mese)\b/i.test(q) ||
             /\bmese\s+scorso\b/i.test(q) || /\bscorso\s+mese\b/i.test(q)) {
      const d = new Date(now); d.setMonth(d.getMonth() - 1);
      dateAfter = formatDate(d);
    }
    // Anno scorso
    else if (/\banno\s+scorso\b/i.test(q) || /\bscorso\s+anno\b/i.test(q)) {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
      dateAfter = formatDate(d);
    }
    // Negli ultimi X giorni/ore/mesi/settimane/anni
    else {
      let dm = q.match(/(?:negli|nelle)\s+ultim[ei]\s+(\d+)\s+(giorni|ore|mesi|settimane|anni)\b/i);
      if (dm) {
        const num = parseInt(dm[1], 10);
        const unit = dm[2].toLowerCase();
        const d = new Date(now);
        if (unit === 'ore' || unit === 'ora') d.setHours(d.getHours() - num);
        else if (unit === 'giorni' || unit === 'giorno') d.setDate(d.getDate() - num);
        else if (unit === 'settimane' || unit === 'settimana') d.setDate(d.getDate() - num * 7);
        else if (unit === 'mesi' || unit === 'mese') d.setMonth(d.getMonth() - num);
        else if (unit === 'anni' || unit === 'anno') d.setFullYear(d.getFullYear() - num);
        dateAfter = formatDate(d);
      }
    }

    // X giorni/ore fa
    if (!dateAfter) {
      let dm = q.match(/(\d+)\s+(giorni?|ore?|settimane?|mesi?|anni?)\s+fa\b/i);
      if (dm) {
        const num = parseInt(dm[1], 10);
        const unit = dm[2].toLowerCase();
        const d = new Date(now);
        if (unit.startsWith('or')) d.setHours(d.getHours() - num);
        else if (unit.startsWith('giorn')) d.setDate(d.getDate() - num);
        else if (unit.startsWith('settiman')) d.setDate(d.getDate() - num * 7);
        else if (unit.startsWith('mes')) d.setMonth(d.getMonth() - num);
        else if (unit.startsWith('ann')) d.setFullYear(d.getFullYear() - num);
        dateAfter = formatDate(d);
      }
    }

    // Data specifica: "creati il GG/MM/AAAA"
    const datePatterns = [
      /(?:creati?|modificati?|creato|modificato|datati?|del|il)\s+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      /(?:creati?|modificati?|creato|modificato)\s+(?:il\s+)?(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,
    ];

    for (const pat of datePatterns) {
      let dm = q.match(pat);
      if (dm) {
        if (dm[2] && dm[3]) {
          // Formato "15 marzo 2025"
          const day = parseInt(dm[1], 10);
          const monthNames = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
          const month = monthNames.indexOf(dm[2].toLowerCase());
          const year = parseInt(dm[3], 10);
          if (month >= 0 && !isNaN(year)) {
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) {
              if (/\bprima\s+d[eiè]\b/i.test(q)) { dateBefore = formatDate(d); }
              else if (/\bdopo\s+(?:il|la)\b/i.test(q)) { dateAfter = formatDate(d); }
              else {
                dateAfter = formatDate(d);
                const nd = new Date(d); nd.setDate(nd.getDate() + 1);
                dateBefore = formatDate(nd);
              }
            }
          }
        } else {
          // Formato GG/MM/AAAA
          const parts = dm[1].split(/[\/\-.]/);
          let day, month, year;
          if (parts[0].length === 4) { year = parts[0]; month = parts[1]; day = parts[2]; }
          else { day = parts[0]; month = parts[1]; year = parts[2]; }
          if (year.length === 2) year = '20' + year;
          const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
          if (!isNaN(d.getTime())) {
            if (/\bprima\s+d[eiè]\b/i.test(q)) { dateBefore = formatDate(d); }
            else if (/\bdopo\s+(?:il|la)\b/i.test(q)) { dateAfter = formatDate(d); }
            else {
              dateAfter = formatDate(d);
              const nd = new Date(d); nd.setDate(nd.getDate() + 1);
              dateBefore = formatDate(nd);
            }
          }
        }
        break;
      }
    }

    return { dateAfter, dateBefore };
  }

  function matchName(q) {
    let namePattern = null;
    let nameMatchType = 'contains'; // 'exact' | 'contains' | 'startsWith' | 'endsWith'

    // "con nome X", "chiamati X", "di nome X"
    let m = q.match(/(?:con\s+nome|chiamat[oi]|nominat[oi]|di\s+nome)\s+["'«]([^"»']+)["'»]/i);
    if (!m) m = q.match(/(?:con\s+nome|chiamat[oi]|nominat[oi]|di\s+nome)\s+(\S+)/i);
    if (m) {
      namePattern = m[1].replace(/[\\"']/g, '');
      nameMatchType = 'exact';
      return { namePattern, nameMatchType };
    }

    // "che iniziano con X", "il cui nome inizia con X", "iniziano per X"
    m = q.match(/(?:che\s+iniziano?\s+con|il\s+cui\s+nome\s+inizia\s+con|iniziano?\s+per)\s+["'«]?([^"»'\s,;]+)["'»]?/i);
    if (m) {
      namePattern = m[1].replace(/[\\"']/g, '');
      nameMatchType = 'startsWith';
      return { namePattern, nameMatchType };
    }

    // "che finiscono con X", "il cui nome finisce con X", "finiscono per X"
    m = q.match(/(?:che\s+finiscono?\s+con|il\s+cui\s+nome\s+finisce\s+con|finiscono?\s+per)\s+["'«]?([^"»'\s,;]+)["'»]?/i);
    if (m) {
      namePattern = m[1].replace(/[\\"']/g, '');
      nameMatchType = 'endsWith';
      return { namePattern, nameMatchType };
    }

    // "che contengono X", "contenenti X", "che hanno X nel nome"
    m = q.match(/(?:che\s+conteng[ao]no|contenenti|che\s+hanno?\s+["']?|con\s+la\s+parola\s+)\s*["'«]?([^"»'\s,;]{2,})["'»]?/i);
    if (m && m[1].length >= 2) {
      namePattern = m[1].replace(/[\\"']/g, '');
      nameMatchType = 'contains';
    }

    return { namePattern, nameMatchType };
  }

  function matchPath(q) {
    // Percorso esplicito: "in /percorso", "in ~/Documenti"
    let m = q.match(/\bin\s+([~\/][^\s,;]*)/i);
    if (m) return m[1];

    // "nella cartella X", "nella directory X"
    m = q.match(/(?:nella|nello|nel)\s+(?:cartella|directory|percorso|path)\s+["'«]?([^\s,;"'»]+)["'»]?/i);
    if (m) return m[1];

    // "sotto /percorso"
    m = q.match(/\bsotto\s+([~\/][^\s,;]*)/i);
    if (m) return m[1];

    // Luoghi comuni
    if (/\b(?:desktop|scrivania)\b/i.test(q)) return '~/desktop';
    if (/\b(?:documenti|documents)\b/i.test(q)) return '~/documents';
    if (/\b(?:download|scaricati)\b/i.test(q)) return '~/downloads';
    if (/\b(?:home|utente)\b/i.test(q) && !/\b(?:desktop|document|download)\b/i.test(q)) return '~';
    if (/\b(?:radice|root|origine)\b/i.test(q)) return '/';
    if (/\b(?:corrente|qui|attuale)\b/i.test(q)) return '.';

    return '.';
  }

  function matchType(q) {
    // Solo se menziona esplicitamente cartelle/directory e NON file
    const hasFolder = /\b(?:cartell[ae]|director[y|ies]|folder)\b/i.test(q);
    const hasFile = /\bfile?\b/i.test(q) || /\bdocumento\b/i.test(q) || /\barchivio\b/i.test(q);
    if (hasFolder && !hasFile) return 'd';
    return 'f';
  }

  function matchDepth(q) {
    let m = q.match(/(?:massimo|max|profondità\s+(?:massima|max))\s+(\d+)\s*(?:livelli?)?/i);
    if (m) return parseInt(m[1], 10);
    if (/\bsolo\s+nella\s+cartella\s+corrente\b/i.test(q) || /\bsolo\s+qui\b/i.test(q)) return 1;
    return null;
  }

  function matchCaseInsensitive(q) {
    return /\b(?:case[-\s]?insensitive|non\s+sensibile|ignorando?\s+(?:il\s+)?case|maiuscol[ae]\/minuscol[ae])\b/i.test(q);
  }

  /* ================================================================
     COSTRUZIONE COMANDO
     ================================================================ */

  function shellQuote(str) {
    return '"' + String(str).replace(/["$`\\!]/g, '\\$&') + '"';
  }

  function parseQuery(query) {
    const q = normalize(query);
    const exts = matchExt(q);
    const size = matchSize(q);
    const date = matchDate(q);
    const name = matchName(q);
    const path = matchPath(q);
    const type = matchType(q);
    const depth = matchDepth(q);
    const caseInsensitive = matchCaseInsensitive(q);
    return { exts, size, date, name, path, type, depth, caseInsensitive, raw: query };
  }

  function generateCommand(parsed) {
    const segments = ['find'];

    // Percorso
    segments.push(parsed.path || '.');

    // Profondità massima
    if (parsed.depth) {
      segments.push('-maxdepth', String(parsed.depth));
    }

    // Tipo (file o directory)
    segments.push('-type', parsed.type);

    // Filtri nome/estensione
    const nameFlag = parsed.caseInsensitive ? '-iname' : '-name';
    const namePatterns = [];
    const extPatterns = [];

    if (parsed.name && parsed.name.namePattern) {
      let p = parsed.name.namePattern;
      switch (parsed.name.nameMatchType) {
        case 'exact': break;
        case 'startsWith': p = p + '*'; break;
        case 'endsWith': p = '*' + p; break;
        case 'contains':
        default: p = '*' + p + '*'; break;
      }
      namePatterns.push(p);
    }

    if (parsed.exts && parsed.exts.length > 0) {
      for (const ext of parsed.exts) {
        extPatterns.push('*.' + ext);
      }
    }

    // Combina i pattern: quelli nome in AND con quelli estensione (OR tra loro)
    if (namePatterns.length > 0 || extPatterns.length > 0) {
      const allClauses = [];

      // Pattern nome (AND tra loro — ma normalmente è solo uno)
      for (const p of namePatterns) {
        allClauses.push(nameFlag + ' ' + shellQuote(p));
      }

      // Pattern estensione (OR tra loro)
      if (extPatterns.length === 1) {
        allClauses.push(nameFlag + ' ' + shellQuote(extPatterns[0]));
      } else if (extPatterns.length > 1) {
        const orClauses = extPatterns.map(p => nameFlag + ' ' + shellQuote(p)).join(' -o ');
        allClauses.push('\\(' + ' ' + orClauses + ' ' + '\\)');
      }

      segments.push(...allClauses);
    }

    // Filtro dimensione
    if (parsed.size) {
      const unit = parsed.size.sizeUnit || 'M';
      if (parsed.size.sizeExact !== null) {
        segments.push('-size', String(parsed.size.sizeExact) + unit);
      } else {
        if (parsed.size.sizeMin !== null) {
          segments.push('-size', '+' + String(parsed.size.sizeMin) + unit);
        }
        if (parsed.size.sizeMax !== null) {
          segments.push('-size', '-' + String(parsed.size.sizeMax) + unit);
        }
      }
    }

    // Filtro data
    if (parsed.date) {
      if (parsed.date.dateAfter) {
        segments.push('-newermt', shellQuote(parsed.date.dateAfter));
      }
      if (parsed.date.dateBefore) {
        segments.push('!', '-newermt', shellQuote(parsed.date.dateBefore));
      }
    }

    // Azione finale
    segments.push('-print');

    return segments.join(' ');
  }

  /* ================================================================
     SPIEGAZIONE IN ITALIANO
     ================================================================ */

  function generateExplanation(parsed) {
    const parts = [];

    if (parsed.type === 'd') parts.push('cartelle');
    else parts.push('file');

    if (parsed.exts && parsed.exts.length > 0) {
      parts.push(parsed.exts.join(', ').toUpperCase());
    }

    if (parsed.name && parsed.name.namePattern) {
      let desc;
      switch (parsed.name.nameMatchType) {
        case 'exact': desc = 'con nome esatto "' + parsed.name.namePattern + '"'; break;
        case 'startsWith': desc = 'il cui nome inizia con "' + parsed.name.namePattern + '"'; break;
        case 'endsWith': desc = 'il cui nome finisce con "' + parsed.name.namePattern + '"'; break;
        default: desc = 'che contengono "' + parsed.name.namePattern + '" nel nome'; break;
      }
      parts.push(desc);
    }

    if (parsed.size) {
      const unitLabels = { c: 'byte', k: 'KB', M: 'MB', G: 'GB', T: 'TB' };
      const ul = unitLabels[parsed.size.sizeUnit] || 'MB';
      if (parsed.size.sizeExact !== null) {
        parts.push('di esattamente ' + parsed.size.sizeExact + ' ' + ul);
      } else {
        if (parsed.size.sizeMin !== null && parsed.size.sizeMax !== null) {
          parts.push('tra ' + parsed.size.sizeMin + ' e ' + parsed.size.sizeMax + ' ' + ul);
        } else if (parsed.size.sizeMin !== null) {
          parts.push('più grandi di ' + parsed.size.sizeMin + ' ' + ul);
        } else if (parsed.size.sizeMax !== null) {
          parts.push('più piccoli di ' + parsed.size.sizeMax + ' ' + ul);
        }
      }
    }

    if (parsed.date && parsed.date.dateAfter) {
      parts.push('modificati dopo il ' + parsed.date.dateAfter);
    }
    if (parsed.date && parsed.date.dateBefore) {
      parts.push('modificati prima del ' + parsed.date.dateBefore);
    }

    if (parsed.path && parsed.path !== '.') {
      parts.push('in ' + parsed.path);
    }

    if (parsed.depth) {
      parts.push('(massimo ' + parsed.depth + ' livelli)');
    }

    return parts.join(' ');
  }

  /* ================================================================
     ESPORTAZIONE
     ================================================================ */

  const api = {
    parseQuery,
    generateCommand,
    generateExplanation,
    // Esponi anche le funzioni interne per i test
    _normalize: normalize,
    _matchExt: matchExt,
    _matchSize: matchSize,
    _matchDate: matchDate,
    _matchName: matchName,
    _matchPath: matchPath,
    _matchType: matchType,
    _matchDepth: matchDepth,
    _matchCaseInsensitive: matchCaseInsensitive,
    _formatDate: formatDate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.CercaFile = api;
  }
})(typeof window !== 'undefined' ? window : global);
