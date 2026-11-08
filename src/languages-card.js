const $=id=>document.getElementById(id);
const COLORS=['#78b9ff','#8a88ff','#5be0c2','#ffb879','#f78ec2','#e0dc83','#a9b9d5','#eab0ff'];
let languages=[{name:'JavaScript',bytes:62000},{name:'HTML',bytes:23000},{name:'CSS',bytes:15000}];
let svgMarkup='';
let currentSlug='RuslanSharifov/readme-component-hub';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function normalized(){
  const data=languages.filter(l=>l.name.trim()&&Number(l.bytes)>0).slice(0,8);
  const total=data.reduce((a,b)=>a+Number(b.bytes),0)||1;
  return data.map((d,i)=>({...d,color:COLORS[i],percent:100*Number(d.bytes)/total}));
}
function format(n){return n.toFixed(1)+'%'}
function renderFields(){
  $('languageFields').innerHTML='';
  languages.forEach((l,i)=>{
    const row=document.createElement('div');row.className='manual-row';
    const name=document.createElement('input');name.value=l.name;name.setAttribute('aria-label','Language name');
    const value=document.createElement('input');value.type='number';value.min='0';value.value=String(l.bytes);value.setAttribute('aria-label','Language size or weight');
    const del=document.createElement('button');del.textContent='×';del.title='Remove language';
    name.addEventListener('input',()=>{languages[i].name=name.value;render()});
    value.addEventListener('input',()=>{languages[i].bytes=Math.max(0,Number(value.value)||0);render()});
    del.addEventListener('click',()=>{languages.splice(i,1);renderFields();render()});
    row.append(name,value,del);$('languageFields').append(row);
  });
}
function chart(data,mode){
  if(!data.length)return '<text x="360" y="145" text-anchor="middle" fill="#b6c5e9">No language data</text>';
  if(mode==='donut'){
    const radius=89,circ=2*Math.PI*radius;let offset=0;
    const paths=data.map((l,i)=>{
      const len=circ*l.percent/100,segment='<circle class="segment" data-language="'+i+'" tabindex="0" role="img" aria-label="'+esc(l.name)+' '+format(l.percent)+'" cx="360" cy="145" r="'+radius+'" fill="none" stroke="'+l.color+'" stroke-width="37" stroke-dasharray="'+Math.max(0,len-.8)+' '+circ+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 360 145)"><title>'+esc(l.name)+' — '+format(l.percent)+'</title></circle>';
      offset+=len;return segment;
    }).join('');
    return '<circle cx="360" cy="145" r="'+radius+'" fill="none" stroke="#6b769e" stroke-opacity=".17" stroke-width="37"/>'+paths+'<text x="360" y="137" text-anchor="middle" font-size="14" fill="currentColor" opacity=".6">LANGUAGES</text><text x="360" y="165" text-anchor="middle" font-size="29" font-weight="700" fill="currentColor">100%</text>';
  }
  if(mode==='row'){
    return data.map((l,i)=>{
      const y=20+i*37,w=Math.max(1,l.percent/100*430);
      return '<text x="15" y="'+(y+14)+'" font-size="14" fill="currentColor">'+esc(l.name.slice(0,15))+'</text><rect x="190" y="'+y+'" width="430" height="17" rx="8" fill="#7e8bb7" opacity=".17"/><rect class="bar" data-language="'+i+'" tabindex="0" role="img" aria-label="'+esc(l.name)+' '+format(l.percent)+'" x="190" y="'+y+'" width="'+w+'" height="17" rx="8" fill="'+l.color+'"><title>'+esc(l.name)+' — '+format(l.percent)+'</title></rect><text x="680" y="'+(y+14)+'" font-size="13" text-anchor="end" fill="currentColor">'+format(l.percent)+'</text>';
    }).join('');
  }
  const barWidth=Math.min(68,540/data.length-12);
  return data.map((l,i)=>{
    const x=90+i*(540/data.length)+10,h=Math.max(2,l.percent/100*185);
    return '<rect class="bar" data-language="'+i+'" tabindex="0" role="img" aria-label="'+esc(l.name)+' '+format(l.percent)+'" x="'+x+'" y="'+(235-h)+'" width="'+barWidth+'" height="'+h+'" rx="7" fill="'+l.color+'"><title>'+esc(l.name)+' — '+format(l.percent)+'</title></rect><text x="'+(x+barWidth/2)+'" y="256" font-size="12" text-anchor="middle" fill="currentColor">'+esc(l.name.slice(0,9))+'</text><text x="'+(x+barWidth/2)+'" y="'+(225-h)+'" font-size="12" text-anchor="middle" fill="currentColor">'+format(l.percent)+'</text>';
  }).join('');
}
function buildSVG(){
  const data=normalized(),mode=$('mode').value,light=$('theme').value==='light',width=Number($('size').value);
  const chartHeight=mode==='row'?Math.max(285,data.length*37+20):290;
  const height=chartHeight+100+Math.ceil(data.length/2)*30+44;
  const ink=light?'#273455':'#eaf2ff',bg=light?'#f0f4ff':'#202f58';
  const legend=data.map((l,i)=>{
    const col=i%2,row=Math.floor(i/2),x=40+col*320,y=chartHeight+93+row*30;
    return '<circle cx="'+x+'" cy="'+(y-5)+'" r="6" fill="'+l.color+'"/><text x="'+(x+13)+'" y="'+y+'" font-size="15" fill="'+ink+'">'+esc(l.name.slice(0,18))+'</text><text x="'+(x+272)+'" y="'+y+'" text-anchor="end" font-size="15" font-weight="700" fill="'+ink+'">'+format(l.percent)+'</text>';
  }).join('');
  svgMarkup='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+Math.round(height*width/720)+'" viewBox="0 0 720 '+height+'" role="img" aria-label="'+esc($('title').value)+' repository languages"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="'+bg+'"/><stop offset="1" stop-color="'+(light?'#e2eafa':'#182343')+'"/></linearGradient></defs><rect width="720" height="'+height+'" rx="25" fill="url(#bg)"/><rect x="1" y="1" width="718" height="'+(height-2)+'" rx="24" fill="none" stroke="'+(light?'#c4cfe9':'#6578aa')+'"/><text x="34" y="44" fill="'+ink+'" font-size="26" font-weight="700" font-family="Arial,sans-serif">'+esc($('title').value.slice(0,44))+'</text><text x="34" y="67" fill="'+(light?'#64728e':'#a8b9df')+'" font-size="12" letter-spacing="2" font-family="Arial,sans-serif">REPOSITORY LANGUAGES</text><g font-family="Arial,sans-serif" style="color:'+ink+'">'+chart(data,mode)+'</g><g font-family="Arial,sans-serif">'+legend+'</g></svg>';
  return svgMarkup;
}
function render(){
  const data=normalized(),mode=$('mode').value;
  const card=$('card');card.classList.toggle('light',$('theme').value==='light');
  const svg=buildSVG();
  // Interactive preview uses real SVG nodes; exported SVG is self-contained and script-free.
  const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
  const chartSVG=parsed.documentElement;
  const graph=chartSVG.querySelector('g[style]');
  const legend='<div class="legend">'+data.map(l=>'<div class="legend-item"><span class="dot" style="background:'+l.color+'"></span><span class="name">'+esc(l.name)+'</span><b>'+format(l.percent)+'</b></div>').join('')+'</div>';
  card.innerHTML='<div class="card-title">'+esc($('title').value)+'</div><div class="card-subtitle">REPOSITORY LANGUAGES</div><div id="tooltip" class="tooltip" aria-live="polite">Hover / tap a language</div><div id="chartHost"></div>'+legend;
  const host=$('chartHost');
  const interactive=document.createElementNS('http://www.w3.org/2000/svg','svg');
  interactive.setAttribute('viewBox','0 0 720 '+(mode==='row'?Math.max(285,data.length*37+20):290));
  interactive.setAttribute('class','chart');
  interactive.setAttribute('role','group');
  interactive.setAttribute('aria-label','Interactive language chart');
  interactive.style.color=$('theme').value==='light'?'#273455':'#eaf2ff';
  if(graph)for(const node of [...graph.childNodes])interactive.append(document.importNode(node,true));
  host.append(interactive);
  interactive.querySelectorAll('[data-language]').forEach(el=>{
    const i=Number(el.getAttribute('data-language'));
    const display=()=>{$('tooltip').textContent=data[i].name+' · '+format(data[i].percent)};
    el.addEventListener('mouseenter',display);el.addEventListener('focus',display);el.addEventListener('click',display);
    el.addEventListener('touchstart',display,{passive:true});
  });
  $('total').textContent=data.length+' languages';
}
async function load(){
  const raw=$('repo').value.trim().replace(/^https:\/\/github\.com\//i,'').replace(/\/$/,'');
  if(!/^[\w.-]+\/[\w.-]+$/.test(raw)){status('Use owner/repository');return}
  status('GitHub məlumatları yüklənir…');
  $('load').disabled=true;
  try{
    const response=await fetch('https://api.github.com/repos/'+raw+'/languages',{headers:{Accept:'application/vnd.github+json'}});
    if(!response.ok)throw Error(response.status===403?'GitHub API limitinə çatıldı':response.status===404?'Repo tapılmadı':'GitHub HTTP '+response.status);
    const result=await response.json();
    languages=Object.entries(result).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,bytes])=>({name,bytes}));
    if(!languages.length)throw Error('Repo üçün dil statistikası yoxdur');
    currentSlug=raw;$('title').value=raw.split('/')[1];renderFields();render();
    status('GitHub dilləri yeniləndi.');
  }catch(e){status(e.message)}finally{$('load').disabled=false}
}
function status(message){$('status').textContent=message}
function download(){
  const blob=new Blob([buildSVG()],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='repository-languages.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status('SVG yükləndi. Faylı GitHub repository-yə əlavə et.');
}
async function copy(){
  const slug=currentSlug||'OWNER/REPO';
  const snippet='[![Repository Languages](./repository-languages.svg)](https://github.com/'+slug+')';
  try{await navigator.clipboard.writeText(snippet);status('README kodu kopyalandı. SVG-ni README.md ilə eyni qovluğa yüklə.')}
  catch{status(snippet)}
}
$('load').addEventListener('click',load);
$('download').addEventListener('click',download);
$('copy').addEventListener('click',copy);
$('addLanguage').addEventListener('click',()=>{if(languages.length>=8){status('Maximum 8 languages');return}languages.push({name:'New language',bytes:10});renderFields();render()});
for(const id of ['title','mode','theme','size'])$(id).addEventListener('input',render);
renderFields();render();load();
