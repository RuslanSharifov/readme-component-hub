/* GitHub-safe reusable Neon Waveform caption and GIF embed builder. */
export const BLOCK_OPEN='<!-- RCH:NEON -->';
export const BLOCK_CLOSE='<!-- /RCH:NEON -->';
export const RAW='https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/';
export const DEFAULTS=Object.freeze({caption:'the rhythm of building',theme:'dark',width:100,align:'center'});
export const BLOCKS=/<!-- RCH:NEON -->[\s\S]*?<!-- \/RCH:NEON -->/g;
export function escapeHTML(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function options(input={}){
  const n=Number(input.width);
  return {
    caption:String(input.caption??DEFAULTS.caption).replace(/[\r\n\t]+/g,' ').trim().slice(0,90),
    theme:input.theme==='light'?'light':'dark',
    width:Number.isFinite(n)?Math.max(20,Math.min(100,Math.round(n/5)*5)):100,
    align:['left','center','right'].includes(input.align)?input.align:'center'
  };
}
export function neonURL(theme){return RAW+(theme==='light'?'light':'dark')+'.gif'}
export function snippet(input=DEFAULTS){
  const o=options(input);
  const result=['<p align="'+o.align+'">'];
  if(o.caption)result.push('  <strong>'+escapeHTML(o.caption)+'</strong><br />');
  result.push('  <img src="'+neonURL(o.theme)+'" alt="Neon Waveform" width="'+o.width+'%" />');
  result.push('</p>');
  return result.join('\n');
}
export function block(input=DEFAULTS){return BLOCK_OPEN+'\n'+snippet(input)+'\n'+BLOCK_CLOSE}
export function updateBlocks(markdown,input){return String(markdown??'').replace(BLOCKS,()=>block(input))}
export function exportMarkdown(markdown){return String(markdown??'').replaceAll(BLOCK_OPEN+'\n','').replaceAll('\n'+BLOCK_CLOSE,'').trim()+'\n'}
export function insertBlock(markdown,index,input=DEFAULTS){
  const str=String(markdown??''),i=Math.min(str.length,Math.max(0,Number(index)||0));
  const before=str.slice(0,i),after=str.slice(i);
  return before+(before&&!before.endsWith('\n\n')?'\n\n':'')+block(input)+(after&&!after.startsWith('\n\n')?'\n\n':'')+after;
}
export function parseRepo(value){
  const raw=String(value??'').trim();
  if(!raw)return 'RuslanSharifov/readme-component-hub';
  let slug=raw.replace(/\/+$/,'').replace(/\.git$/i,'');
  if(slug.startsWith('https://')){
    const url=new URL(slug);
    if(url.hostname.toLowerCase()!=='github.com'||url.username||url.password||url.search||url.hash||url.port)
      throw new TypeError('Only GitHub repository links are accepted');
    slug=url.pathname.replace(/^\/|\/$/g,'');
  }
  const parts=slug.split('/');
  if(parts.length!==2||parts.some(x=>!(/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(x))||x.includes('..')))
    throw new TypeError('Use https://github.com/OWNER/REPO');
  return slug;
}
