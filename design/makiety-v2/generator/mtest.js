const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const i=s.indexOf('class Component');const j=s.indexOf('</script>',i);
eval('class DCLogic{constructor(p){}setState(x){Object.assign(this.state,x)}}\n'+s.slice(i,j)+';globalThis.C=Component');
const c=new C({});let v;const sh=(t)=>{v=c.renderVals();console.log(t,'|',v.czesci.map(x=>(x.blokStyl.includes('akcent-jasny')?'*':'')+x.nazwa.split(' ')[0]+'['+x.znacznik+']: '+x.pozycje.map(p=>p.nazwa).join(',')).join(' || '),'| toast:',v.maToast?v.toastTxt+' ['+v.toastAkcjaTxt+']':'-','| ph:',v.placeholder,v.maArkusz?'| ark sklepy: '+v.ark.sklepy.map(k=>k.n+(k.styl.includes('#ffffff;')?'*':'')).join('/'):'');};
sh('start');v.czesci[0].aktywuj();sh('lidl aktywny');c.setState({wpis:'masło'});v=c.renderVals();v.dodajWpis();sh('dodano');v.toastAkcja();sh('przeniesione');v.toastAkcja();sh('z powrotem');
v.czesci[1].pozycje[0].otworz();sh('arkusz');v.ark.sklepy[0].wybierz();sh('przeniesione w arkuszu');v.zamknij();sh('zamkn');
