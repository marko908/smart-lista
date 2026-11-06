  katalog() {
    // [rdzeń, nazwa, typ (szt|kg|but), domyślnie, dział, cena za jednostkę]
    return [
      ['ziemniak', 'Ziemniaki', 'kg', 1, 'Warzywa i owoce', 2.99], ['marchew', 'Marchew', 'kg', 1, 'Warzywa i owoce', 2.49],
      ['cebul', 'Cebula', 'kg', 1, 'Warzywa i owoce', 2.99], ['jabł', 'Jabłka', 'kg', 1, 'Warzywa i owoce', 3.99],
      ['banan', 'Banany', 'kg', 1, 'Warzywa i owoce', 4.99], ['pomarańcz', 'Pomarańcze', 'kg', 1, 'Warzywa i owoce', 5.99], ['winogron', 'Winogrona', 'kg', 0.5, 'Warzywa i owoce', 12.99],
      ['pieczark', 'Pieczarki', 'kg', 0.5, 'Warzywa i owoce', 9.99], ['ogór', 'Ogórek', 'szt', 1, 'Warzywa i owoce', 1.49],
      ['pomidor', 'Pomidory', 'szt', 1, 'Warzywa i owoce', 1.29], ['papryk', 'Papryka', 'szt', 1, 'Warzywa i owoce', 2.49],
      ['cytryn', 'Cytryny', 'szt', 1, 'Warzywa i owoce', 0.99], ['sałat', 'Sałata', 'szt', 1, 'Warzywa i owoce', 3.49],
      ['chleb', 'Chleb', 'szt', 1, 'Piekarnia', 5.49], ['bułk', 'Bułki', 'szt', 4, 'Piekarnia', 0.69], ['bagiet', 'Bagietka', 'szt', 1, 'Piekarnia', 2.99],
      ['szynk', 'Szynka', 'kg', 0.2, 'Wędliny i sery', 39.9], ['kiełbas', 'Kiełbasa', 'kg', 0.3, 'Wędliny i sery', 24.9],
      ['parów', 'Parówki', 'szt', 1, 'Wędliny i sery', 6.99], ['ser', 'Ser żółty', 'szt', 1, 'Wędliny i sery', 2.99],
      ['kurczak', 'Kurczak', 'kg', 0.5, 'Mięso', 17.99], ['filet', 'Filet z kurczaka', 'kg', 0.5, 'Mięso', 17.99],
      ['mięs', 'Mięso mielone', 'kg', 0.5, 'Mięso', 19.99], ['mielon', 'Mięso mielone', 'kg', 0.5, 'Mięso', 19.99], ['schab', 'Schab', 'kg', 0.5, 'Mięso', 21.99],
      ['mlek', 'Mleko', 'szt', 1, 'Nabiał', 3.79], ['jogurt', 'Jogurt', 'szt', 1, 'Nabiał', 2.49], ['masł', 'Masło', 'szt', 1, 'Nabiał', 6.29],
      ['jaj', 'Jajka', 'szt', 10, 'Nabiał', 0.99], ['śmietan', 'Śmietana', 'szt', 1, 'Nabiał', 3.29], ['twar', 'Twaróg', 'szt', 1, 'Nabiał', 4.49],
      ['makaron', 'Makaron', 'szt', 1, 'Sypkie i przetwory', 3.99], ['ryż', 'Ryż', 'szt', 1, 'Sypkie i przetwory', 4.49],
      ['mąk', 'Mąka', 'szt', 1, 'Sypkie i przetwory', 3.29], ['cukier', 'Cukier', 'szt', 1, 'Sypkie i przetwory', 3.99],
      ['fasol', 'Fasolka', 'szt', 1, 'Sypkie i przetwory', 3.49], ['kukurydz', 'Kukurydza', 'szt', 1, 'Sypkie i przetwory', 3.49],
      ['kaw', 'Kawa', 'szt', 1, 'Sypkie i przetwory', 39.99], ['herbat', 'Herbata', 'szt', 1, 'Sypkie i przetwory', 7.99],
      ['olej', 'Olej', 'but', 1, 'Sypkie i przetwory', 8.99],
      ['wod', 'Woda', 'but', 1, 'Napoje', 1.99], ['col', 'Cola', 'but', 1, 'Napoje', 6.99], ['sok', 'Sok', 'but', 1, 'Napoje', 4.99],
      ['piw', 'Piwo', 'but', 1, 'Napoje', 3.49], ['win', 'Wino', 'but', 1, 'Napoje', 24.99],
      ['papier', 'Papier toaletowy', 'szt', 1, 'Chemia', 14.99], ['płyn', 'Płyn do naczyń', 'but', 1, 'Chemia', 8.99]
    ];
  }
  promocje() {
    // promocje w wybranym sklepie (z gazetki), dopasowane po rdzeniu nazwy
    return [
      { rdzen: 'ser', nazwa: 'Ser żółty gouda, 150 g', cena: 2.99, termin: 'do soboty', sklep: 'Lidl · Zorska' },
      { rdzen: 'kaw', nazwa: 'Kawa ziarnista, 1 kg', cena: 39.99, termin: 'do niedzieli', sklep: 'Lidl · Zorska' },
      { rdzen: 'masł', nazwa: 'Masło extra, 200 g', cena: 5.49, termin: 'do soboty', sklep: 'Lidl · Zorska' },
      { rdzen: 'filet', nazwa: 'Filet z kurczaka, 1 kg', cena: 15.99, termin: 'czw–sob', sklep: 'Biedronka · Wodzisławska' },
      { rdzen: 'kurczak', nazwa: 'Filet z kurczaka, 1 kg', cena: 15.99, termin: 'czw–sob', sklep: 'Biedronka · Wodzisławska' }
    ];
  }
  oferta(p) {
    if (p.promo || p.bezOferty) return null;
    const slowa = p.nazwa.toLowerCase().split(' ');
    return this.promocje().find((o) => slowa.some((w) => w.indexOf(o.rdzen) === 0)) || null;
  }
  dzialy() { return ['Warzywa i owoce', 'Piekarnia', 'Wędliny i sery', 'Mięso', 'Nabiał', 'Sypkie i przetwory', 'Napoje', 'Chemia', 'Inne']; }
  rozpoznaj(txt) {
    let t = (txt || '').trim();
    if (!t) return null;
    let rozmiar = '';
    const r = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|l|litr\w*)(?=\s|$)/i);
    if (r) { rozmiar = r[1].replace('.', ',') + ' ' + (r[2].toLowerCase() === 'ml' ? 'ml' : 'l'); t = t.replace(r[0], ' '); }
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo\w*|dag|deko|g|gram\w*|szt\.?|sztuk\w*|but\.?|butel\w*|x|×)?(?=\s|$)/i);
    let n = null, j = '';
    if (m) { n = parseFloat(m[1].replace(',', '.')); j = (m[2] || '').toLowerCase(); t = t.replace(m[0], ' '); }
    let nazwa = t.replace(/\s+/g, ' ').trim();
    if (!nazwa) return null;
    const slowa = nazwa.toLowerCase().split(' ');
    const kat = this.katalog();
    let k = null;
    for (const w of slowa) { k = kat.find((x) => w.indexOf(x[0]) === 0) || (w.length >= 3 ? kat.find((x) => x[0].indexOf(w) === 0) : null); if (k) break; }
    let typ = k ? k[2] : 'szt', ile = k ? k[3] : 1;
    if (j.indexOf('k') === 0) { typ = 'kg'; ile = n; }
    else if (j === 'dag' || j.indexOf('dek') === 0) { typ = 'kg'; ile = n / 100; }
    else if (j.indexOf('g') === 0) { typ = 'kg'; ile = n / 1000; }
    else if (j.indexOf('sz') === 0) { typ = 'szt'; ile = n; }
    else if (j.indexOf('b') === 0) { typ = 'but'; ile = n; }
    else if (n !== null) { ile = (typ === 'kg') ? (n >= 50 ? n / 1000 : n) : Math.max(1, Math.round(n)); }
    const ladna = (k && slowa.length === 1) ? k[1] : nazwa.charAt(0).toUpperCase() + nazwa.slice(1);
    return { nazwa: ladna + (rozmiar ? ' ' + rozmiar : ''), typ: typ, ile: ile, sekcja: k ? k[4] : 'Inne', cj: k ? k[5] : 0, jawna: !!j, liczba: n, klucz: (k ? k[1] : nazwa).toLowerCase() };
  }
  fmt(typ, ile) {
    if (typ === 'kg') return ile < 1 ? Math.round(ile * 1000) + ' g' : String(Math.round(ile * 100) / 100).replace('.', ',') + ' kg';
    if (typ === 'but') {
      const d = ile % 10, s = ile % 100;
      const sl = ile === 1 ? 'butelka' : (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? 'butelki' : 'butelek';
      return ile + ' ' + sl;
    }
    return ile + ' szt.';
  }
