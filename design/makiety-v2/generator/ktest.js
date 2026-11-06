const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v;const sh=()=>{v=c.renderVals();console.log(v.sklepyLista.map(k=>(k.on?'*':'')+k.siec).join(', '),'| karta:',(v.kartaUkryta==="false")?[v.karta.siec,v.karta.adres,v.karta.pieszo,v.karta.godz,v.karta.mapa?'mapa':'',v.karta.bywasz?v.karta.bywaszTxt:''].join(' / '):'-','=>',v.wybierzTxt);};
sh();v.piny[3].zaznacz();sh();v=c.renderVals();v.sklepyLista[3].zaznacz();sh();
