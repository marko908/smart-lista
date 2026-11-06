const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v;const off=k=>(k.stylKarty.match(/translateX\((-?\d+)/)||[])[1];const w=(st)=>(st.match(/width: (\d+)px/)||[])[1];
const sh=(t)=>{v=c.renderVals();console.log(t,'|',v.karty.map(k=>k.nazwa+'('+off(k)+' L'+w(k.stylL)+' P'+w(k.stylP)+(k.stylWiersza.includes('max-height: 0')?' znika':'')+')').join(', '),'| toast:',v.maToast2?v.toast2Txt+(v.toast2Cofnij?' [Cofnij]':''):'-');};
const sw=(k,dx)=>{v=c.renderVals();v.karty[k].dol({clientX:200,pointerId:1,target:{closest:()=>null},currentTarget:{setPointerCapture(){}}});v=c.renderVals();v.karty[k].ruch({clientX:200+dx});sh('  drag '+dx);v=c.renderVals();v.karty[k].gora();};
sh('start');sw(1,-80);sh('1. w lewo');sw(1,-80);sh('2. w lewo');
setTimeout(()=>{sh('po animacji');v.cofnij();sh('cofnij');sw(0,90);sh('w prawo');v=c.renderVals();v.karty[0].akcjaL();sh('klik Udostępnij');sw(2,-30);sh('za mało');sw(2,-70);sh('odsłonięty');sw(2,40);sh('z powrotem w prawo');},400);
