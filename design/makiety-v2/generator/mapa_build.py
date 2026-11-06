import json
# Z2: plan sklepu z prawdziwej mapy Lidla (mapy/lidl-rybnik-zorska.alejka.json w repo)
d = json.load(open('/home/claude/smart-lista/mapy/lidl-rybnik-zorska.alejka.json'))['store']['map']

def cells(b):
    out = []
    r = (b.get('rot') or 0) % 360
    for u in range(b['w']):
        for v in range(b['h']):
            if r == 0: out.append((b['x'] + u, b['y'] + v))
            elif r == 90: out.append((b['x'] - v, b['y'] + u))
            elif r == 180: out.append((b['x'] - u, b['y'] - v))
            else: out.append((b['x'] + v, b['y'] - u))
    return out

bloki = []
for b in d['blocks']:
    cs = cells(b)
    xs = [c[0] for c in cs]; ys = [c[1] for c in cs]
    bloki.append({'t': b['type'], 'x': min(xs), 'y': min(ys), 'w': max(xs) - min(xs) + 1, 'h': max(ys) - min(ys) + 1, 's': b['sections']})

tpl = open('gen/mapa.tpl.html').read()
html = tpl.replace('__BLOKI__', json.dumps(bloki, ensure_ascii=False)).replace('__GW__', str(d['gridW'])).replace('__GH__', str(d['gridH'])).replace('__PW__', str(d['gridW'] * 12.5)).replace('__PH__', str(d['gridH'] * 12.5))
open('makiety/project/A-3-Mapa.dc.html', 'w').write(html)
print('ok', len(bloki))
