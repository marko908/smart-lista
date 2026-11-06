import json
tpl=open('gen/flow.tpl.html').read().replace('__SILNIK__',open('gen/silnik.js').read())
P='makiety/project/'
items1=[["mleko 2","lidl"],["chleb","lidl"],["2 kg ziemniaków","lidl"],["ser","lidl"]]
items2=items1+[["filet z kurczaka 1 kg","bied"],["pomarańcze","bied"]]
F=[('F1-Pusto.dc.html','Twoje listy, pusto',{"krok":"start"}),
   ('F2-Wybor-sklepu.dc.html','Wybór sklepu',{"krok":"wybor","historia":{"lidl":12,"bied":3},"zazn":"lidl"}),
   ('F3-Lista.dc.html','Nowa lista',{"krok":"lista","sklepy":["lidl"],"items":items1}),
   ('F4-Kolejny-sklep.dc.html','Kolejny sklep',{"krok":"wybor","sklepy":["lidl"],"items":items1,"historia":{"lidl":12,"bied":3},"zazn":"bied"}),
   ('F5-Lista-dwa.dc.html','Lista na dwa sklepy',{"krok":"lista","sklepy":["lidl","bied"],"aktywny":"bied","items":items2}),
   ('F6-Gotowe.dc.html','Lista gotowa',{"krok":"gotowe","sklepy":["lidl","bied"],"items":items2})]
for f,t,c in F:
    open(P+f,'w').write(tpl.replace('__TITLE__',t).replace('__CFG__',json.dumps(c,ensure_ascii=False)))
print('ok')
