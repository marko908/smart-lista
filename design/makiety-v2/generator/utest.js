const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v;const L=()=>{v=c.renderVals();return v.czesci[0].pozycje;};const sh=t=>console.log(t,'|',L().map(p=>p.nazwa+' '+p.ilosc).join(', '),v.maArkusz?'| '+v.ark.jednTxt:'');
c.setState({wpis:'mąka'});v=c.renderVals();v.dodajWpis();sh('mąka');
let k=L().findIndex(p=>p.nazwa==='Mąka');L()[k].otworz();sh('arkusz');v.ark.typy[1].wybierz();sh('na wagę');v.zamknij();
L()[k].usun();c.setState({wpis:'mąka'});v=c.renderVals();v.dodajWpis();sh('mąka znowu');c.setState({wpis:'mąka 500'});v=c.renderVals();v.dodajWpis();sh('mąka 500');c.setState({wpis:'mąka 3 szt'});v=c.renderVals();v.dodajWpis();sh('mąka 3 szt');
