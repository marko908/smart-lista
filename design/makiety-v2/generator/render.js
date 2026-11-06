// prosty podgląd statyczny .dc.html (sc-for/sc-if bez zagnieżdżeń tego samego typu) -> html
const fs=require('fs');const [,,src,out,setup]=process.argv;const s=fs.readFileSync(src,'utf8');
const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v=c.renderVals();if(setup){eval(setup);v=c.renderVals();}
let body=s.slice(s.indexOf('<x-dc>')+6,s.indexOf('</x-dc>'));
const helm=body.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];body=body.replace(/<helmet>[\s\S]*?<\/helmet>/,'');
const get=(ctx,path)=>path.split('.').reduce((o,k)=>o==null?o:o[k],ctx);
function render(t,ctx){
  t=t.replace(/<sc-for list="\{\{([\w.]+)\}\}" as="(\w+)"[^>]*>([\s\S]*?)<\/sc-for>/g,(m,l,as,inner)=>(get(ctx,l)||[]).map(it=>render(inner,Object.assign({},ctx,{[as]:it}))).join(''));
  t=t.replace(/<sc-if value="\{\{([\w.]+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g,(m,l,inner)=>get(ctx,l)?render(inner,ctx):'');
  return t.replace(/\{\{([\w.]+)\}\}/g,(m,p)=>{const x=get(ctx,p);return typeof x==='function'?'':(x==null?'':x);});
}
fs.writeFileSync(out,'<!doctype html><html><head><meta charset="utf-8">'+helm+'</head><body style="margin:0">'+render(body,v)+'</body></html>');
