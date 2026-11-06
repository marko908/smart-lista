const fs=require('fs');const f=process.argv[2];const s=fs.readFileSync(f,'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+'\nglobalThis.C=Component;');
const c=new C({});let v=c.renderVals();
console.log(v.pozycje.map(p=>p.sklep+": "+p.nazwa+' | '+p.ilosc+' | '+p.sekcja+' | '+p.cena+(p.maOferte?' [PROMO]':'')).join('\n'));console.log('suma',v.suma,v.zostalo,'arkusz',v.maArkusz);
for (const t of ['3 ziemniaki','ziemniaki 500','woda 6','cola 2l','ogórek','2 pomidory','szynka 20 dag','10 jajek','fasolka','3 kg jabłek','chipsy','mleko']) {const r=c.rozpoznaj(t);console.log(t,'=>',r.nazwa,'|',c.fmt(r.typ,r.ile),'|',r.sekcja);}
const ser=v.pozycje.find(p=>p.maOferte); if(ser){ser.pokazOferte();v=c.renderVals();console.log('OF',v.of.nazwa,v.of.twoje);v.of.tak();v=c.renderVals();console.log(v.pozycje.map(p=>p.sklep+": "+p.nazwa+(p.maOferte?'*':'')).join(', '),v.suma);}
c.setState({otw:null});v=c.renderVals();
if(v.pozycje.length){v.pozycje[0].otworz();v=c.renderVals();console.log('ARK',v.ark.nazwa,v.ark.ilosc,v.ark.szybkie.map(x=>x.n));v.ark.mniej();v=c.renderVals();console.log(v.ark.ilosc);v.ark.typy[0].wybierz();v=c.renderVals();console.log(v.ark.ilosc);v.zamknij();}
c.setState({wpis:'chleb, 2 kg ziem'});v=c.renderVals();console.log('PG',v.podglad);v.dodajWpis();v=c.renderVals();console.log(v.pozycje.length, v.pozycje.map(p=>p.nazwa).join(', '));
