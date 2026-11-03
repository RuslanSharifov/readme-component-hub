/* README Component Hub — pure, testable README layout/serialization. */
export const RAW_ROOT = 'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/';
export const WIDTH_PRESETS = [30,50,70,100];
export const ALIGNS = ['left','center','right'];
export const SPACING_PRESETS = [0,10,20,30,40];
export const THEMES = ['dark','light','neon'];
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
export function imageHTML(entry,options={}) {
  const o=normalizeOptions(entry,options);
  const img='<img src="'+imageURL(entry,o.theme)+'" alt="'+escapeHTML(entry.title)+'" width="'+o.width+'%" />';
  if (!o.offset) return '<p align="'+o.align+'">\n  '+img+'\n</p>';
  const remaining=100-o.offset;
  return '<table width="100%"><tr><td width="'+o.offset+'%">&nbsp;</td><td width="'+remaining+'%" align="'+o.align+'">\n'+img+'\n</td></tr></table>';
}
export function imageMarkdown(entry,options={}) {
  const o=normalizeOptions(entry,options);
  if (o.width===100 && o.offset===0 && o.align==='left')
    return '!['+escapeMD(entry.title)+']('+imageURL(entry,o.theme)+')';
  return imageHTML(entry,o);
}
export function rowHTML(entries,options={}) {
  if (!Array.isArray(entries) || entries.length<2 || entries.length>3)
    throw new TypeError('A row needs two or three components');
  const sizes=entries.map((_,i)=>i===entries.length-1?
    100-Math.floor(100/entries.length)*(entries.length-1):Math.floor(100/entries.length));
  const cells=entries.map((entry,i)=>'<td width="'+sizes[i]+'%" align="center" valign="top"><img src="'+
    imageURL(entry,options.theme??'dark')+'" alt="'+escapeHTML(entry.title)+'" width="100%" /></td>').join('\n');
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
