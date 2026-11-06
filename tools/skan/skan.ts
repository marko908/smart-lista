/**
 * Skan sklepu → plik sklepu Alejki. Narzędzie na komputer.
 *
 *   npm run skan -- rozpakuj  <plik.alejka-skan.json> <katalog>
 *   npm run skan -- etykietuj <katalog>
 *   npm run skan -- szkic     <katalog> "<nazwa sklepu>" [sieć]
 *   npm run skan -- film      <film.mp4> <czujniki.alejka-skan.json> <katalog> [przesunięcie s]
 *
 * 1. rozpakuj  — wyciąga zdjęcia i dane czujników z pliku z telefonu,
 *                odrzuca klatki, przy których człowiek stał w miejscu.
 * 2. etykietuj — model wizyjny opisuje każdą klatkę: jakie kategorie z katalogu
 *                widać po lewej i po prawej. Wymaga klucza API Anthropic
 *                (ANTHROPIC_API_KEY albo `ant auth login`). Model można zmienić
 *                zmienną SKAN_MODEL. Wynik: etykiety.json — można go poprawić ręcznie.
 * film     — zamiast „rozpakuj", gdy zdjęcia robiła osobna kamera (telefon w kieszeni
 *            w trybie „tylko czujniki"). Bez przesunięcia wycina tylko pierwsze 20 s
 *            do katalogu synchro/: odczytaj z nich licznik z ekranu telefonu
 *            (przesunięcie = licznik − czas klatki w filmie) i uruchom ponownie.
 *            Wymaga ffmpeg.
 * 3. szkic     — z trasy i etykiet składa plik .alejka.json, który wczytuje się
 *                w aplikacji przyciskiem „Wczytaj sklep z pliku".
 */

import Anthropic from '@anthropic-ai/sdk';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { CHAIN_BY_KEY, type ChainKey } from '../../src/data/chains';
import { SECTIONS, isSectionKey } from '../../src/data/sections';
import { serializeStore } from '../../src/lib/mapFile';
import { parseSesja, szkicPlanu, type Etykieta, type SkanSesja } from '../../src/lib/skan';

const MODEL = process.env.SKAN_MODEL || 'claude-opus-5-5';
const NA_ZAPYTANIE = 6;

function czytajJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

/** Stanie w miejscu daje serię prawie identycznych klatek — zostawiamy jedną. */
function odrzucStanie(s: SkanSesja): SkanSesja['klatki'] {
  const krokiW = (t: number) => {
    let k = 0;
    for (const pr of s.probki) if (pr.t <= t) k = pr.kroki;
    return k;
  };
  const zostaw: SkanSesja['klatki'] = [];
  let ost = -Infinity;
  for (const k of s.klatki) {
    const kr = krokiW(k.t);
    if (kr - ost < 0.5 && zostaw.length) continue;
    ost = kr;
    zostaw.push(k);
  }
  return zostaw;
}

function film(wideo: string, plikCzujnikow: string, kat: string, przesuniecie?: string) {
  const p = parseSesja(fs.readFileSync(plikCzujnikow, 'utf8'));
  if (!p.ok) throw new Error(p.error);
  const ff = (args: string[]) => {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    if (r.error) throw new Error('Nie znalazłem ffmpeg — zainstaluj go (https://ffmpeg.org) i spróbuj ponownie.');
    if (r.status !== 0) throw new Error('ffmpeg zakończył się błędem.');
  };
  if (przesuniecie === undefined) {
    const syn = path.join(kat, 'synchro');
    fs.mkdirSync(syn, { recursive: true });
    ff(['-y', '-t', '20', '-i', wideo, '-vf', 'fps=2,scale=960:-2', path.join(syn, 's%03d.jpg')]);
    console.log(`Klatki synchronizacji w ${syn}: s001 = 0,0 s filmu, s002 = 0,5 s, s003 = 1,0 s…`);
    console.log('Znajdź klatkę z licznikiem telefonu; przesunięcie = licznik − czas tej klatki. Potem:');
    console.log(`  npm run skan -- film "${wideo}" "${plikCzujnikow}" "${kat}" <przesunięcie>`);
    return;
  }
  const dt = Number(przesuniecie.replace(',', '.'));
  if (!Number.isFinite(dt)) throw new Error(`Przesunięcie to liczba sekund, dostałem: ${przesuniecie}`);
  const katK = path.join(kat, 'klatki');
  fs.mkdirSync(katK, { recursive: true });
  // Klatka n (od 1) to (n − 1) s filmu, czyli (n − 1 + dt) s na zegarze telefonu.
  ff(['-y', '-i', wideo, '-vf', 'fps=1,scale=1280:-2', '-q:v', '4', path.join(katK, 'f%04d.jpg')]);
  const koniec = p.sesja.probki[p.sesja.probki.length - 1]?.t ?? Infinity;
  const wszystkie = fs
    .readdirSync(katK)
    .filter((f) => /^f\d{4}\.jpg$/.test(f))
    .sort()
    .map((plik) => ({ t: Number(plik.slice(1, 5)) - 1 + dt, plik }));
  const wZakresie = wszystkie.filter((k) => k.t >= 0 && k.t <= koniec);
  const s: SkanSesja = { ...p.sesja, klatki: wZakresie };
  const zostaw = odrzucStanie(s);
  const nazwy = new Set(zostaw.map((k) => k.plik));
  for (const k of wszystkie) if (!nazwy.has(k.plik)) fs.unlinkSync(path.join(katK, k.plik));
  fs.writeFileSync(path.join(kat, 'sesja.json'), JSON.stringify({ ...s, klatki: zostaw }, null, 2));
  console.log(`Klatek z filmu: ${wszystkie.length}, w czasie nagrania czujników: ${wZakresie.length}, po odrzuceniu stania: ${zostaw.length}.`);
}

function rozpakuj(plik: string, kat: string) {
  const raw = czytajJson<SkanSesja & { obrazy?: Record<string, string> }>(plik);
  const p = parseSesja(JSON.stringify({ ...raw, obrazy: undefined }));
  if (!p.ok) throw new Error(p.error);
  const s = p.sesja;
  fs.mkdirSync(path.join(kat, 'klatki'), { recursive: true });

  // Stanie w miejscu daje serię prawie identycznych klatek — zostawiamy jedną.
  const krokiW = (t: number) => {
    let k = 0;
    for (const pr of s.probki) if (pr.t <= t) k = pr.kroki;
    return k;
  };
  const zostaw: typeof s.klatki = [];
  let ost = -Infinity;
  for (const k of s.klatki) {
    const kr = krokiW(k.t);
    if (kr - ost < 0.5 && zostaw.length) continue;
    ost = kr;
    zostaw.push(k);
    const b64 = raw.obrazy?.[k.plik];
    if (b64) fs.writeFileSync(path.join(kat, 'klatki', k.plik), Buffer.from(b64, 'base64'));
  }
  fs.writeFileSync(path.join(kat, 'sesja.json'), JSON.stringify({ ...s, klatki: zostaw }, null, 2));
  console.log(`Klatek: ${s.klatki.length}, po odrzuceniu stania: ${zostaw.length}. Kroków: ${Math.round(s.probki[s.probki.length - 1]?.kroki ?? 0)}.`);
  if (s.surowe) {
    const ost = (a: { kroki: number }[]) => Math.round(a[a.length - 1]?.kroki ?? 0);
    console.log(`Kroki osobno: krokomierz ${ost(s.surowe.krokomierz)}, akcelerometr ${ost(s.surowe.akcelerometr)}.`);
  }
  if (s.dziennik?.length) {
    console.log('Dziennik:');
    s.dziennik.slice(0, 40).forEach((d) => console.log(`  ${d.t.toFixed(1)} s  ${d.co}`));
    if (s.dziennik.length > 40) console.log(`  … i ${s.dziennik.length - 40} więcej (sesja.json)`);
  }
}

const KATALOG = SECTIONS.map((s) => `${s.key} — ${s.name}${s.hint ? ` (${s.hint})` : ''}`).join('\n');
const SYSTEM = `Opisujesz zdjęcia z kamery na klatce piersiowej osoby idącej przez sklep spożywczy.
Dla każdego zdjęcia podaj, jakie kategorie produktów widać na regałach PO LEWEJ i PO PRAWEJ stronie alejki.
Używaj wyłącznie kluczy z katalogu poniżej. Najwyżej 3 kategorie na stronę, najpewniejsza pierwsza.
Gdy po danej stronie nie ma regału z produktami (ściana, kasy, przejście, rozmazane zdjęcie), zwróć pustą listę.
Odpowiedz samym JSON-em: obiekt, którego klucze to nazwy plików, a wartości to {"lewo": [...], "prawo": [...]}.

Katalog:
${KATALOG}`;

async function etykietuj(kat: string) {
  const s = czytajJson<SkanSesja>(path.join(kat, 'sesja.json'));
  const wyj = path.join(kat, 'etykiety.json');
  const gotowe: Record<string, Etykieta> = fs.existsSync(wyj) ? czytajJson(wyj) : {};
  const doZrobienia = s.klatki.filter((k) => !gotowe[k.plik] && fs.existsSync(path.join(kat, 'klatki', k.plik)));
  const client = new Anthropic();
  let wej = 0;
  let wyjT = 0;

  for (let i = 0; i < doZrobienia.length; i += NA_ZAPYTANIE) {
    const paczka = doZrobienia.slice(i, i + NA_ZAPYTANIE);
    const content: Anthropic.ContentBlockParam[] = [];
    for (const k of paczka) {
      content.push({ type: 'text', text: k.plik });
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(path.join(kat, 'klatki', k.plik)).toString('base64') },
      });
    }
    content.push({ type: 'text', text: 'Opisz te zdjęcia.' });

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      cache_control: { type: 'ephemeral' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }],
    });
    wej += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
    wyjT += res.usage.output_tokens;
    if (res.stop_reason === 'refusal') {
      console.warn(`Paczka od ${paczka[0].plik}: model odmówił, pomijam.`);
      continue;
    }
    const tekst = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const json = tekst.slice(tekst.indexOf('{'), tekst.lastIndexOf('}') + 1);
    try {
      const odp = JSON.parse(json) as Record<string, { lewo?: unknown; prawo?: unknown }>;
      for (const k of paczka) {
        const e = odp[k.plik];
        const lista = (v: unknown) => (Array.isArray(v) ? v.filter(isSectionKey) : []);
        gotowe[k.plik] = { lewo: lista(e?.lewo), prawo: lista(e?.prawo) };
      }
    } catch {
      console.warn(`Paczka od ${paczka[0].plik}: nieczytelna odpowiedź, pomijam.`);
    }
    fs.writeFileSync(wyj, JSON.stringify(gotowe, null, 2));
    process.stdout.write(`\r${Math.min(i + NA_ZAPYTANIE, doZrobienia.length)}/${doZrobienia.length} klatek`);
  }
  console.log(`\nGotowe. Tokeny: ${wej} wejścia, ${wyjT} wyjścia (model ${MODEL}).`);
}

function szkic(kat: string, nazwa: string, siec: string) {
  const s = czytajJson<SkanSesja>(path.join(kat, 'sesja.json'));
  const et = czytajJson<Record<string, Etykieta>>(path.join(kat, 'etykiety.json'));
  if (!(siec in CHAIN_BY_KEY)) throw new Error(`Nieznana sieć: ${siec}. Dostępne: ${Object.keys(CHAIN_BY_KEY).join(', ')}`);
  // Rozstaw alejek w metrach (SKAN_ALEJKA); używany, gdy przejście między alejkami zginęło.
  const alejka = Number(process.env.SKAN_ALEJKA ?? 5);
  const { map, walkOrder, ostrzezenia } = szkicPlanu(s, et, { alejka });
  const teraz = new Date().toISOString();
  const tekst = serializeStore({
    id: 'skan', name: nazwa, chain: siec as ChainKey, createdAt: teraz, mappedAt: teraz, walkOrder, map,
  } as never);
  const wyj = path.join(kat, `${nazwa.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.alejka.json`);
  fs.writeFileSync(wyj, tekst);
  ostrzezenia.forEach((o) => console.warn(o));
  console.log(`Plan ${map.gridW}×${map.gridH} m, ${map.blocks.length} klocków, ${walkOrder.length} kategorii → ${wyj}`);
}

async function main() {
  const [cmd, a, b, c] = process.argv.slice(2);
  if (cmd === 'rozpakuj' && a && b) return rozpakuj(a, b);
  if (cmd === 'etykietuj' && a) return etykietuj(a);
  if (cmd === 'szkic' && a && b) return szkic(a, b, c || 'lidl');
  if (cmd === 'film' && a && b && c) return film(a, b, c, process.argv[6]);
  console.log('Użycie:\n  rozpakuj <plik.alejka-skan.json> <katalog>\n  etykietuj <katalog>\n  szkic <katalog> "<nazwa>" [sieć]\n  film <film.mp4> <czujniki.json> <katalog> [przesunięcie s]');
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
