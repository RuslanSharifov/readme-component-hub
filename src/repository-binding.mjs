import {parseRepo,escapeHTML} from './neon-core.mjs';

export const COLORS=['#78b9ff','#8a88ff','#5be0c2','#ffb879','#f78ec2','#e0dc83'];
const ALLOWED=['donut','row','column'];
export function languagePercentages(input){
  const entries=Object.entries(input||{}).filter(([name,value])=>/^[\w.+# -]{1,35}$/.test(name)&&Number.isFinite(Number(value))&&Number(value)>0)
    .sort((a,b)=>Number(b[1])-Number(a[1]));
  const total=entries.reduce((s,p)=>s+Number(p[1]),0);
  if(!total)return [];
  const top=entries.slice(0,5).map(([name,size])=>({name,percent:Number((Number(size)/total*100).toFixed(1))}));
  if(entries.length>5)top.push({name:'Other',percent:Number((entries.slice(5).reduce((s,p)=>s+Number(p[1]),0)/total*100).toFixed(1))});
  return top;
}
export function quickChartUrl(mode,languages){
  if(!ALLOWED.includes(mode))throw new TypeError('Unsupported language chart');
  if(!Array.isArray(languages)||!languages.length)throw new TypeError('No language data');
  const names=languages.slice(0,6).map(x=>String(x.name).slice(0,30));
  const values=languages.slice(0,6).map(x=>Number(x.percent));
  const colors=COLORS.slice(0,names.length);
  const donut=mode==='donut',horizontal=mode==='row';
  const config={
    type:donut?'doughnut':horizontal?'horizontalBar':'bar',
    data:{labels:names.map((name,i)=>name+' '+values[i].toFixed(1)+'%'),
      datasets:[{data:values,backgroundColor:colors,borderWidth:0,barPercentage:.72,categoryPercentage:.9}]},
    options:{responsive:false,animation:false,
      legend:{display:donut,position:'bottom',labels:{fontColor:'#eaf2ff',fontSize:12,boxWidth:12,padding:12}},
      cutoutPercentage:donut?64:0,
      tooltips:{enabled:true},
      layout:{padding:16},
      scales:donut?undefined:{
        xAxes:[{display:true,ticks:{beginAtZero:true,max:100,fontColor:'#a8b9df'},gridLines:{color:'rgba(140,170,210,.12)'}}],
        yAxes:[{display:true,ticks:{fontColor:'#eaf2ff',fontSize:12},gridLines:{display:false}}]
      }
    }
  };
  const query=encodeURIComponent(JSON.stringify(config));
  return 'https://quickchart.io/chart?version=2&format=png&backgroundColor=%23202f58&width=720&height='+ (donut?'460':'365') +'&devicePixelRatio=1&c='+query;
}
export function createLanguageBlock(mode,repository,languageData){
  if(!ALLOWED.includes(mode))throw new TypeError('Unknown language chart');
  const slug=parseRepo(repository);
  const values=languagePercentages(languageData);
  if(!values.length)throw new TypeError('Repository has no language data');
  const labels=values.map(v=>escapeHTML(v.name)+' '+v.percent.toFixed(1)+'%').join(' · ');
  const url=quickChartUrl(mode,values);
  return '<!-- RCH:LANG:'+mode+' -->\n<p align="center"><strong>'+escapeHTML(slug)+'</strong><br />\n  <img src="'+url+'" alt="'+escapeHTML('Repository languages '+mode+' for '+slug)+'" width="100%" /><br />\n  <sub>'+labels+'</sub>\n</p>\n<!-- /RCH:LANG:'+mode+' -->';
}
export function repoOverviewBlock(info,commits){
  const slug=parseRepo(info.full_name);
  const owner=slug.split('/')[0],name=slug.split('/')[1];
  const badge=(kind,label)=>'<img src="https://img.shields.io/github/'+kind+'/'+slug+'?style=for-the-badge" alt="'+label+'" />';
  return '<!-- RCH:REPO -->\n<p align="center"><a href="https://github.com/'+slug+'"><strong>'+escapeHTML(name)+'</strong></a></p>\n'+
    '<p align="center">'+badge('stars','Stars')+' '+badge('forks','Forks')+' '+badge('issues','Issues')+' '+badge('last-commit','Last commit')+'</p>\n'+
    '<p align="center"><sub>'+escapeHTML(info.description||'GitHub repository')+' · '+(Number.isInteger(commits)?commits.toLocaleString('en-US')+' commits (at sync)':'Commit count unavailable')+'</sub></p>\n<!-- /RCH:REPO -->';
}
export function updateBoundComponents(markdown,repo,languageData,info,commits){
  let count=0;
  let output=String(markdown||'').replace(/<!-- RCH:LANG:(donut|row|column) -->[\s\S]*?<!-- \/RCH:LANG:\1 -->/g,(_,mode)=>{
    count++;return createLanguageBlock(mode,repo,languageData);
  });
  output=output.replace(/<!-- RCH:REPO -->[\s\S]*?<!-- \/RCH:REPO -->/g,()=>{
    count++;return repoOverviewBlock(info,commits);
  });
  return {markdown:output,count};
}
export async function fetchRepositoryData(input,fetcher=fetch){
  const slug=parseRepo(input);
  const url='https://api.github.com/repos/'+slug;
  const headers={Accept:'application/vnd.github+json'};
  const [repoResponse,langsResponse,commitResponse]=await Promise.all([
    fetcher(url,{headers}),fetcher(url+'/languages',{headers}),fetcher(url+'/commits?per_page=1',{headers})
  ]);
  if(!repoResponse.ok)throw new Error(repoResponse.status===404?'Repository tapılmadı və ya şəxsi repodur':'GitHub API xətası: '+repoResponse.status);
  if(!langsResponse.ok)throw new Error(langsResponse.status===403?'GitHub API limiti dolub':'Dillər oxunmadı: '+langsResponse.status);
  const info=await repoResponse.json(),languages=await langsResponse.json();
  if(!languagePercentages(languages).length)throw new Error('Bu repoda dil statistikası yoxdur');
  if(!info||typeof info.full_name!=='string'||parseRepo(info.full_name).toLowerCase()!==slug.toLowerCase())throw new Error('Repository cavabı uyğun deyil');
  let commits=null;
  if(commitResponse.ok){
    const links=commitResponse.headers?.get?.('link')||'';
    const last=links.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    if(last)commits=Number(last[1]);
    else{
      const first=await commitResponse.json();
      commits=Array.isArray(first)?first.length:0;
    }
  }
  return {repo:info.full_name,info,languages,commits};
}
