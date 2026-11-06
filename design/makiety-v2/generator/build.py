import json
tpl=open('gen/lista.tpl.html').read()
P='makiety/project/'
start_a=[["2 kg ziemniaków"],["4 pomidory"],["chleb żytni"],["mleko 2"],["ser"],["jogurt naturalny"],["makaron penne"],["kawa ziarnista 1 kg",{"promo":"Promocja","nazwa":"Kawa ziarnista, 1 kg","cj":39.99,"typ":"szt","ile":1}],["płyn do naczyń"],["filet z kurczaka 1 kg"]]
for s in start_a[:3]: pass
cfg_a={"sklepy":["Lidl · Zorska"],"tytul":"Na sobotę","promo":True,"podp":["Masło","Jajka","Banany"],"start":start_a}
# first two done
def wr(name,title,cfg,done=0):
    c=json.dumps(cfg,ensure_ascii=False)
    h=tpl.replace('__TITLE__',title).replace('__CFG__',c)
    if done:
        h=h.replace("const items = cfg.start.map((t, i) => Object.assign({ sklep: cfg.sklepy[0], id: 'p' + i, done: false }","const items = cfg.start.map((t, i) => Object.assign({ sklep: cfg.sklepy[0], id: 'p' + i, done: i < (cfg.zrobione || 0) }")
    open(P+name,'w').write(h)
cfg_a["zrobione"]=2
wr('E01-a-Typowy.dc.html','Lista zakupów',cfg_a,1)
cfg_e=dict(cfg_a); cfg_e["otw"]="p0"
wr('E02-Edycja.dc.html','Ilość produktu',cfg_e,1)
cfg_b={"sklepy":["Lidl · Zorska"],"tytul":"Nowa lista","czeste":["Mleko","Chleb","Jajka","Masło","Pomidory","Ser żółty","Banany","Woda"],"ostatnie":"mleko 2, chleb, 10 jajek, masło, 1 kg jabłek, woda 6","start":[]}
wr('E01-b-Pusta.dc.html','Nowa lista',cfg_b)
