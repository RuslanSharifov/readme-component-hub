import {
  BLOCK_OPEN, DEFAULTS, block, insertBlock, updateBlocks, exportMarkdown,
  escapeHTML, options, parseRepo
} from './neon-core.mjs';

const $=(selector)=>document.querySelector(selector);
const source=$('#markdownInput');
const rendered=$('#readmePreview');
const key='readme-hub-neon-studio-v2';
const repoKey='readme-hub-studio-repository';
let component=null;
let config={...DEFAULTS};
let editingTheme='dark';
let toastTimer=0;

const starter='# My GitHub README\n\nCreate something remarkable.\n\n'+block(config)+'\n\n---\n\nBuilt with [README Component Hub](https://github.com/RuslanSharifov/readme-component-hub).\n';
function readStorage(name){
  try{return window.localStorage.getItem(name)}catch{return null}
}
function writeStorage(name,value){
  try{window.localStorage.setItem(name,value)}catch{}
}
function showToast(message){
  const el=$('#designerToast');
  el.textContent=message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('visible'),2400);
}
function save(){
  writeStorage(key,JSON.stringify({markdown:source.value,config}));
}
function updateControls(){
  $('#neonCaption').value=config.caption;
  $('#neonTheme').value=config.theme;
  $('#neonAlign').value=config.align;
  $('#neonWidth').value=String(config.width);
  $('#neonWidthValue').textContent=config.width+'%';
}
function preview(){
  const md=exportMarkdown(source.value);
  if(window.markdownit&&window.DOMPurify){
    const parser=window.markdownit({html:true,breaks:true,linkify:true});
    const safe=window.DOMPurify.sanitize(parser.render(md),{
      ADD_ATTR:['align','width','valign'],FORBID_TAGS:['script','style','iframe','object','embed','form']
    });
    rendered.innerHTML=safe;
    for(const link of rendered.querySelectorAll('a')){
      link.rel='noopener noreferrer';link.target='_blank';
    }
  }else{
    rendered.textContent=md;
    rendered.style.whiteSpace='pre-wrap';
  }
  $('#sourceLength').textContent=source.value.length+' characters';
}
function refresh(){
  save();
  preview();
}
function insertAtCursor(value){
  const from=source.selectionStart,to=source.selectionEnd;
  const prefix=from>0&&!source.value.slice(0,from).endsWith('\n\n')?'\n\n':'';
  const suffix=to<source.value.length&&!source.value.slice(to).startsWith('\n\n')?'\n\n':'';
  source.setRangeText(prefix+value+suffix,from,to,'end');
  refresh();
}
function addNeon(){
  if(!component)return;
  insertAtCursor(block(config));
  showToast('Neon Waveform added to README');
}
function applyChanges(){
  config=options({
    caption:$('#neonCaption').value,theme:$('#neonTheme').value,
    align:$('#neonAlign').value,width:$('#neonWidth').value
  });
  $('#neonWidthValue').textContent=config.width+'%';
  source.value=updateBlocks(source.value,config);
  refresh();
}
function formatSelection(kind){
  const a=source.selectionStart,b=source.selectionEnd;
  const selected=source.value.slice(a,b)||'text';
  const snippets={
    h1:'# '+selected,h2:'## '+selected,bold:'**'+selected+'**',
    italic:'*'+selected+'*',quote:'> '+selected,list:'- '+selected,
    link:'['+selected+'](https://github.com/)',divider:'\n---\n',
    code:'\n~~~text\n'+selected+'\n~~~\n'
  };
  if(!(kind in snippets))return;
  source.setRangeText(snippets[kind],a,b,'end');refresh();source.focus();
}
function saveFile(name,contents,mime){
  const blob=new Blob([contents],{type:mime});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;document.body.appendChild(anchor);
  anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function copy(contents){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(contents);return}
  const ta=document.createElement('textarea');
  ta.value=contents;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  const ok=document.execCommand('copy');ta.remove();
  if(!ok)throw new Error('Clipboard is not available');
}
function updateRepository(){
  try{
    const slug=parseRepo($('#repositoryInput').value);
    $('#repoStatus').textContent='Target: '+slug+' · Neon GIF is hosted by Component Hub';
    $('#repoStatus').classList.remove('error');
    writeStorage(repoKey,'https://github.com/'+slug);
  }catch(err){
    $('#repoStatus').textContent=err.message;
    $('#repoStatus').classList.add('error');
  }
}
function drawLibrary(){
  const list=$('#componentLibrary');
  if(!component){
    list.textContent='Could not load the component catalog.';
    return;
  }
  const image=new URL(component.themes.dark,document.baseURI).href;
  list.innerHTML='<article class="component-card" draggable="true" id="neonLibraryCard">'+
   '<div class="component-art"><img src="'+escapeHTML(image)+'" alt="Animated Neon Waveform preview" /></div>'+
   '<div class="component-row"><strong>'+escapeHTML(component.title)+'</strong><small>GIF · LOOP</small></div>'+
   '<p>'+escapeHTML(component.description)+'</p>'+
   '<button type="button" id="addNeon" aria-label="Add Neon Waveform to README">+ Add to README</button></article>';
  $('#addNeon').addEventListener('click',addNeon);
  $('#neonLibraryCard').addEventListener('dragstart',e=>{
    e.dataTransfer.setData('application/x-neon-wave','neon-wave');
    e.dataTransfer.effectAllowed='copy';
  });
}
function allowDrop(element){
  element.addEventListener('dragover',e=>{
    if([...e.dataTransfer.types].includes('application/x-neon-wave')){
      e.preventDefault();e.dataTransfer.dropEffect='copy';
    }
  });
  element.addEventListener('drop',e=>{
    if(e.dataTransfer.getData('application/x-neon-wave')!=='neon-wave')return;
    e.preventDefault();
    if(element.id==='previewDropZone'){
      source.setSelectionRange(source.value.length,source.value.length);
    }else{
      source.focus();
      const selectionStart=source.selectionStart;
      source.setSelectionRange(selectionStart,selectionStart);
    }
    addNeon();
  });
}
function updateScreen(){
  const px=Number($('#screenWidth').value);
  rendered.style.width=px+'px';
  $('#screenWidthValue').textContent=px+'px';
}
function initEvents(){
  source.addEventListener('input',refresh);
  source.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&(e.key==='b'||e.key==='i')){
      e.preventDefault();formatSelection(e.key==='b'?'bold':'italic');
    }else if(e.key==='Tab'){
      e.preventDefault();
      source.setRangeText('  ',source.selectionStart,source.selectionEnd,'end');
      refresh();
    }
  });
  for(const id of ['neonCaption','neonTheme','neonAlign','neonWidth']){
    $('#'+id).addEventListener('input',applyChanges);
  }
  for(const button of document.querySelectorAll('[data-format]'))
    button.addEventListener('click',()=>formatSelection(button.dataset.format));
  $('#screenWidth').addEventListener('input',updateScreen);
  $('#togglePreviewTheme').addEventListener('click',()=>{
    editingTheme=editingTheme==='light'?'dark':'light';
    rendered.classList.toggle('dark',editingTheme==='dark');
    $('#togglePreviewTheme').textContent=editingTheme==='light'?'Dark':'Light';
  });
  $('#newReadme').addEventListener('click',()=>{
    if(source.value.trim()&&!confirm('Replace your current README draft?'))return;
    config={...DEFAULTS};updateControls();source.value=starter;refresh();showToast('New README ready');
  });
  $('#copyReadme').addEventListener('click',async()=>{
    try{parseRepo($('#repositoryInput').value);await copy(exportMarkdown(source.value));
      showToast('GitHub-ready Markdown copied');
    }catch(e){showToast(e.message)}
  });
  $('#downloadReadme').addEventListener('click',()=>{
    try{parseRepo($('#repositoryInput').value);
      saveFile('README.md',exportMarkdown(source.value),'text/markdown;charset=utf-8');
      showToast('README.md downloaded');
    }catch(e){showToast(e.message)}
  });
  $('#repositoryInput').addEventListener('change',updateRepository);
  $('#repositoryInput').addEventListener('input',updateRepository);
  allowDrop(source);allowDrop($('#previewDropZone'));
}
async function init(){
  let stored;
  try{stored=JSON.parse(readStorage(key)||'null')}catch{}
  if(stored&&typeof stored.markdown==='string'){
    source.value=stored.markdown;
    config=options(stored.config||DEFAULTS);
    // Old designs from prior versions are not imported automatically.
  }else{source.value=starter}
  $('#repositoryInput').value=readStorage(repoKey)||'https://github.com/RuslanSharifov/readme-component-hub';
  rendered.classList.add('dark');
  updateRepository();updateControls();updateScreen();initEvents();refresh();
  try{
    const res=await fetch('./components/catalog.json',{cache:'no-store'});
    if(!res.ok)throw new Error('Catalog HTTP '+res.status);
    const entries=await res.json();
    component=entries.find(item=>item.id==='neon-wave')||null;
    $('#libraryCount').textContent=component?'01':'00';
    drawLibrary();
    const query=new URLSearchParams(location.search).get('component');
    if(query==='neon-wave'&&component){
      source.setSelectionRange(source.value.length,source.value.length);
      addNeon();
      history.replaceState(null,'',location.pathname);
    }
  }catch(err){console.error(err);drawLibrary();showToast('Component library unavailable')}
}
init();
