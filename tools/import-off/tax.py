"""Parser taksonomii OFF: klucz kanoniczny -> polskie nazwy + rodzice."""
import re, io, json, unicodedata

def slug(s):
    s = s.strip().lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r"[^a-z0-9]+", "-", s).strip('-')
    return s

def parse(path):
    """Zwraca {klucz: {'pl': [...], 'en': [...], 'parents': [...]}}"""
    wpisy = {}
    blok = []
    def zamknij(blok):
        if not blok: return
        nazwy, rodzice = {}, []
        for ln in blok:
            if ln.startswith('<'):
                rodzice.append(ln[1:].strip()); continue
            m = re.match(r'^([a-z]{2,3}):\s*(.+)$', ln)
            if not m: continue
            lang, reszta = m.group(1), m.group(2)
            nazwy.setdefault(lang, [x.strip() for x in reszta.split(',') if x.strip()])
        # klucz kanoniczny: pierwszy jezyk w bloku (OFF uzywa en, czasem fr/pl)
        if not nazwy: return
        glowny = 'en' if 'en' in nazwy else next(iter(nazwy))
        klucz = f"{glowny}:{slug(nazwy[glowny][0])}"
        wpisy[klucz] = {
            'pl': nazwy.get('pl', []),
            'en': nazwy.get('en', []),
            'parents': [f"{p.split(':',1)[0]}:{slug(p.split(':',1)[1])}" if ':' in p else p
                        for p in rodzice],
        }
    for raw in io.open(path, encoding='utf-8'):
        ln = raw.rstrip('\n')
        if ln.startswith('#') or ln.startswith('synonyms:') or ln.startswith('stopwords:'):
            continue
        if not ln.strip():
            zamknij(blok); blok = []
        else:
            blok.append(ln)
    zamknij(blok)
    return wpisy

if __name__ == '__main__':
    for f in ['bazy/food-categories.txt','bazy/beauty-categories.txt','bazy/petfood-categories.txt']:
        w = parse(f)
        zpl = {k:v for k,v in w.items() if v['pl']}
        formy = sum(len(v['pl']) for v in zpl.values())
        print(f"{f:<34} wpisow: {len(w):>6,}  z polskimi: {len(zpl):>5,}  form polskich: {formy:>5,}")
        json.dump(w, io.open(f.replace('bazy/','tax-').replace('.txt','.json'),'w',encoding='utf-8'),
                  ensure_ascii=False)
