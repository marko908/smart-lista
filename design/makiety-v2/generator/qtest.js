const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v=c.renderVals();const show=()=>{v=c.renderVals();console.log(v.czesci.map(x=>x.pozycje.map(p=>p.nazwa+' '+p.ilosc).join(',')).join('||'),'| ark:',v.maArkusz?JSON.stringify({n:v.ark.nazwa,i:v.ark.ilosc,c:v.ark.cena,s:v.ark.szybkie.map(q=>q.n),t:v.ark.typy.map(q=>q.n+(q.styl.includes("#ffffff")?'*':''))}):'-');};
show();v.czesci[0].pozycje[0].otworz();show();v.ark.wiecej();show();v.ark.typy[1].wybierz();show();v.ark.szybkie[1].ustaw();show();v.ark.usun();show();
