const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v;const sh=t=>{v=c.renderVals();console.log(t,'|',v.wybor?'WYBOR '+v.pytanie:v.trwa?v.dzialy.map(d=>(d.otwarty?'['+d.nazwa+': '+d.pozycje.map(p=>(p.zrobione?'✓':'')+p.nazwa).join(', ')+']':(d.zrobiony?'✓':'')+d.nazwa+' '+d.licznik)).join(' | ')+' | '+v.kasaTxt:v.koniec?'KONIEC':'cala','|',v.postep);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{sh('start');v.opcje[0].wybierz();sh('lidl');v.dzialy[0].pozycje[0].przelacz();sh('tick1');v=c.renderVals();v.dzialy[0].pozycje[1].przelacz();sh('tick2');await wait(700);sh('po 650ms');
v.dzialy[0].rozwin();sh('podgląd zrobionego');v.dzialy[0].pozycje[0].przelacz();await wait(700);sh('odznaczony');v=c.renderVals();v.dzialy[0].pozycje[0].przelacz();await wait(700);sh('znów');
v=c.renderVals();v.dzialy[2].rozwin();sh('podgląd 3');v.dzialy[1].rozwin();sh('powrót do aktualnego');
for(let k=0;k<4;k++){v=c.renderVals();const d=v.dzialy.find(d=>d.otwarty);if(!d)break;d.pozycje.forEach(p=>{if(!p.zrobione){p.przelacz();}v=c.renderVals();});await wait(700);sh('sekcja');}
})();
