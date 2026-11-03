/* README Component Hub — pure, testable README layout/serialization. */
export const RAW_ROOT = 'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/';
export const WIDTH_PRESETS = [30,50,70,100];
export const ALIGNS = ['left','center','right'];
export const SPACING_PRESETS = [0,10,20,30,40];
export const THEMES = ['dark','light','neon'];

export const DEFAULT_REPOSITORY = Object.freeze({slug:'RuslanSharifov/readme-component-hub',branch:'main'});
export const INSTALL_PATH = '.github/workflows/readme-component-hub.yml';
export const GENERATED_PATH = '.github/readme-component-hub';
export const ASSET_BRANCH = 'readme-component-hub-assets';
export const DYNAMIC_COMPONENT_IDS = new Set([
  'repository-stats','chrome-ui-gallery-stats','star-growth-chart','ci-status-card',
  'contribution-heatmap','language-analytics','latest-release-card','project-progress-tracker'
]);
const REPO_PART = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,98}[a-zA-Z0-9])?$/;
export function parseRepository(value) {
  const input=String(value??'').trim();
  if (!input) return {...DEFAULT_REPOSITORY};
  let slug=input.replace(/\/+$/,'');
  if (/^https?:\/\//i.test(slug)) {
    let url;
    try {url=new URL(slug)} catch {throw new TypeError('Enter a valid GitHub repository URL');}
    if (url.protocol!=='https:' || url.hostname.toLowerCase()!=='github.com' ||
        url.username || url.password || url.search || url.hash)
      throw new TypeError('Only https://github.com/OWNER/REPO is supported');
    slug=url.pathname.replace(/^\/|\/$/g,'');
  }
  slug=slug.replace(/\.git$/i,'');
  const parts=slug.split('/');
  if(parts.length!==2 || !parts.every(x=>REPO_PART.test(x)) ||
     parts.some(x=>x==='.'||x==='..'||x.includes('..')))
    throw new TypeError('Use a public GitHub repository link: https://github.com/OWNER/REPO');
  if (slug.toLowerCase()===DEFAULT_REPOSITORY.slug.toLowerCase())
    return {...DEFAULT_REPOSITORY};
  return {slug,branch:'main'};
}
export function safeBranch(value) {
  const s=String(value||'main');
  if (!/^[a-zA-Z0-9._/-]{1,200}$/.test(s) || s.startsWith('/') || s.includes('..') || s.includes('//'))
    return 'main';
  return s.split('/').map(encodeURIComponent).join('/');
}
export function isDynamicComponent(entry) {
  return entry?.category==='Dynamic' && DYNAMIC_COMPONENT_IDS.has(entry.id);
}
export function repoAssetURL(entry,theme='dark',target=DEFAULT_REPOSITORY) {
  if (!isDynamicComponent(entry)) return imageURL(entry,theme);
  const selected=chooseTheme(entry,theme);
  const config=target?.slug?target:DEFAULT_REPOSITORY;
  const slug=parseRepository(config.slug).slug;
  if (slug.toLowerCase()===DEFAULT_REPOSITORY.slug.toLowerCase()) {
    // The legacy Chrome UI Gallery card must not show Chrome stats in the hub's README.
    if(entry.id==='chrome-ui-gallery-stats')
      return RAW_ROOT+'generated/repository-stats/'+selected+'.svg';
    return imageURL(entry,selected);
  }
  return 'https://raw.githubusercontent.com/'+slug+'/'+ASSET_BRANCH+'/' +
    GENERATED_PATH+'/'+entry.id+'/'+selected+'.svg';
}
export function workflowTemplate() {
  return 'name: Update README Component Hub cards\n'+
    'on:\n'+
    '  workflow_dispatch:\n'+
    '  schedule:\n'+
    "    - cron: '23 * * * *'\n"+
    'permissions:\n'+
    '  contents: write\n'+
    'jobs:\n'+
    '  update:\n'+
    '    uses: RuslanSharifov/readme-component-hub/.github/workflows/render-repository.yml@main\n'+
    '    permissions:\n'+
    '      contents: write\n';
}
export function rebindDesignerMarkdown(source,catalog,repository=DEFAULT_REPOSITORY) {
  const byId=new Map(catalog.map(c=>[c.id,c]));
  return String(source).replace(BLOCK_REGEX,(whole,id,kind,ids,width,align,offset,theme)=>{
    const entries=ids.split(',').map(name=>byId.get(name));
    if (entries.some(e=>!e)) return whole;
    const o={id,kind,items:ids.split(','),width:Number(width),align,offset:Number(offset),theme};
    const html=kind==='row'?rowHTML(entries,o,repository):imageMarkdown(entries[0],o,repository);
    return makeBlock(o,html);
  });
}

export function escapeHTML(input) {
  return String(input ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
export function escapeMD(input) {
  return String(input ?? '').replace(/\\/g,'\\\\').replace(/\]/g,'\\]').replace(/[\r\n]+/g,' ');
}
export function cleanWidth(input) {
  return Math.max(10,Math.min(100,Math.round(Number(input)/5)*5 || 100));
}
export function cleanOffset(input) {
  return Math.max(0,Math.min(60,Math.round(Number(input)/5)*5 || 0));
}
export function chooseTheme(entry,requested) {
  return entry?.themes?.[requested] ? requested : 'dark';
}
export function imageURL(entry,theme='dark') {
  const path=entry?.themes?.[chooseTheme(entry,theme)];
  if (!path || !/^(components|generated)\/[a-z0-9-]+\/[a-z0-9-]+\.(gif|svg)$/.test(path))
    throw new TypeError('Invalid component asset path');
  return RAW_ROOT+path;
}
export function normalizeOptions(entry,o={}) {
  return {width:cleanWidth(o.width??100),offset:cleanOffset(o.offset??0),
    align:ALIGNS.includes(o.align)?o.align:'center',theme:chooseTheme(entry,o.theme??'dark')};
}
export function imageHTML(entry,options={},repository=DEFAULT_REPOSITORY) {
  const o=normalizeOptions(entry,options);
  const img='<img src="'+repoAssetURL(entry,o.theme,repository)+'" alt="'+escapeHTML(entry.title)+'" width="'+o.width+'%" />';
  if (!o.offset) return '<p align="'+o.align+'">\n  '+img+'\n</p>';
  const remaining=100-o.offset;
  return '<table width="100%"><tr><td width="'+o.offset+'%">&nbsp;</td><td width="'+remaining+'%" align="'+o.align+'">\n'+img+'\n</td></tr></table>';
}
export function imageMarkdown(entry,options={},repository=DEFAULT_REPOSITORY) {
  const o=normalizeOptions(entry,options);
  if (o.width===100 && o.offset===0 && o.align==='left')
    return '!['+escapeMD(entry.title)+']('+repoAssetURL(entry,o.theme,repository)+')';
  return imageHTML(entry,o,repository);
}
export function rowHTML(entries,options={},repository=DEFAULT_REPOSITORY) {
  if (!Array.isArray(entries) || entries.length<2 || entries.length>3)
    throw new TypeError('A row needs two or three components');
  const sizes=entries.map((_,i)=>i===entries.length-1?
    100-Math.floor(100/entries.length)*(entries.length-1):Math.floor(100/entries.length));
  const cells=entries.map((entry,i)=>'<td width="'+sizes[i]+'%" align="center" valign="top"><img src="'+
    repoAssetURL(entry,options.theme??'dark',repository)+'" alt="'+escapeHTML(entry.title)+'" width="100%" /></td>').join('\n');
  return '<table width="100%">\n<tr>\n'+cells+'\n</tr>\n</table>';
}
export function marker(meta) {
  const id=String(meta.id??'').replace(/[^a-zA-Z0-9_-]/g,'');
  const kind=meta.kind==='row'?'row':'component';
  const ids=(meta.items||[]).map(x=>String(x).replace(/[^a-z0-9-]/g,'')).join(',');
  const width=cleanWidth(meta.width??100);
  const offset=cleanOffset(meta.offset??0);
  const align=ALIGNS.includes(meta.align)?meta.align:'center';
  const theme=THEMES.includes(meta.theme)?meta.theme:'dark';
  return '<!-- rch:'+id+'|'+kind+'|'+ids+'|'+width+'|'+align+'|'+offset+'|'+theme+' -->';
}
export function makeBlock(meta,content) {
  return marker(meta)+'\n'+content.trim()+'\n<!-- /rch:'+meta.id+' -->';
}
export const BLOCK_REGEX = /<!-- rch:([a-zA-Z0-9_-]+)\|(component|row)\|([a-z0-9,-]+)\|(\d+)\|(left|center|right)\|(\d+)\|(dark|light|neon) -->\r?\n([\s\S]*?)\r?\n<!-- \/rch:\1 -->/g;
export function getBlocks(markdown) {
  const out=[];
  for (const m of String(markdown).matchAll(BLOCK_REGEX))
    out.push({id:m[1],kind:m[2],items:m[3].split(',').filter(Boolean),
      width:Number(m[4]),align:m[5],offset:Number(m[6]),theme:m[7],
      content:m[8],full:m[0],start:m.index,end:m.index+m[0].length});
  return out;
}
export function replaceBlock(markdown,id,replacement) {
  const b=getBlocks(markdown).find(x=>x.id===id);
  return b?markdown.slice(0,b.start)+replacement+markdown.slice(b.end):markdown;
}
export function removeBlock(markdown,id) {
  const b=getBlocks(markdown).find(x=>x.id===id);
  return b?(markdown.slice(0,b.start)+markdown.slice(b.end)).replace(/\n{3,}/g,'\n\n').trim():markdown;
}
export function moveBlock(markdown,id,direction) {
  const blocks=getBlocks(markdown),i=blocks.findIndex(b=>b.id===id),j=i+direction;
  if (i<0 || j<0 || j>=blocks.length) return markdown;
  const swapped=blocks.map(b=>b.full);
  [swapped[i],swapped[j]]=[swapped[j],swapped[i]];
  let k=0;
  return markdown.replace(BLOCK_REGEX,()=>swapped[k++]);
}
export function cleanForExport(markdown) {
  return String(markdown).replace(/<!-- rch:[^\r\n]+ -->\r?\n/g,'')
    .replace(/\r?\n<!-- \/rch:[a-zA-Z0-9_-]+ -->/g,'')
    .replace(/\n{3,}/g,'\n\n').trim()+'\n';
}
export function validatedCatalog(data) {
  if (!Array.isArray(data)) throw new TypeError('Catalog must be an array');
  return data.filter(e=>e && typeof e.id==='string' && typeof e.title==='string' &&
    typeof e.category==='string' && e.themes && typeof e.themes.dark==='string' && typeof e.themes.light==='string');
}
