import {readLayout,serializeLayout,blocksInOrder,moveBlock,appendBlock,resizeBlock,resizeHeight,blockWidth,blockHeight} from './layout-core.mjs';
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
let selectedIndex=0;
let draggingIndex=null;
let resizing=null;

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
    enhancePreview();
    for(const link of rendered.querySelectorAll('a')){
      link.rel='noopener noreferrer';link.target='_blank';
    }
  }else{
    rendered.textContent=md;
    rendered.style.whiteSpace='pre-wrap';
  }
  $('#sourceLength').textContent=source.value.length+' characters';
}
function enhancePreview(){
  const imgs=[...rendered.querySelectorAll('img[src*="/neon-wave/"]')];
  const nodes=readLayout(source.value);
  const items=blocksInOrder(nodes);
  imgs.forEach((img,index)=>{
    const wrapper=document.createElement('div');
    wrapper.className='layout-component'+(index===selectedIndex?' selected':'');
    wrapper.draggable=true;
    wrapper.dataset.blockIndex=String(index);
    wrapper.tabIndex=0;
    wrapper.setAttribute('role','group');
    wrapper.setAttribute('aria-label','Neon component '+(index+1)+'. Drag to move or resize from right edge.');
    const host=img.closest('p')||img;
    host.parentNode.insertBefore(wrapper,host);
    wrapper.appendChild(host);
    const badge=document.createElement('span');
    badge.className='layout-badge';badge.textContent='↕ Move · '+(index+1);
    wrapper.appendChild(badge);
    const handle=document.createElement('button');
    handle.type='button';handle.className='resize-handle';
    handle.title='Drag to resize width';handle.setAttribute('aria-label','Resize component '+(index+1));
    handle.textContent='↔';
    wrapper.appendChild(handle);
    const heightHandle=document.createElement('button');
    heightHandle.type='button';heightHandle.className='resize-height-handle';
    heightHandle.title='Drag to resize height';heightHandle.setAttribute('aria-label','Resize component height '+(index+1));
    heightHandle.textContent='↕';wrapper.appendChild(heightHandle);
    heightHandle.addEventListener('pointerdown',event=>{
      event.preventDefault();event.stopPropagation();
      const rect=img.getBoundingClientRect();
      resizing={index,axis:'y',startY:event.clientY,startHeight:rect.height};
      heightHandle.setPointerCapture(event.pointerId);
    });
    heightHandle.addEventListener('pointermove',event=>{
      if(!resizing||resizing.index!==index||resizing.axis!=='y')return;
      const px=Math.max(60,Math.min(480,Math.round((resizing.startHeight+event.clientY-resizing.startY)/10)*10));
      img.style.height=px+'px';img.style.objectFit='fill';
      heightHandle.dataset.height=String(px);
    });
    const finishHeight=()=>{
      if(!resizing||resizing.index!==index||resizing.axis!=='y')return;
      const height=Number(heightHandle.dataset.height)||Math.round(resizing.startHeight/10)*10;
      resizing=null;source.value=resizeHeight(source.value,index,height);
      selectedIndex=index;refresh();showToast('Height: '+height+'px');
    };
    heightHandle.addEventListener('pointerup',finishHeight);
    heightHandle.addEventListener('pointercancel',finishHeight);
    wrapper.addEventListener('click',()=>{
      selectedIndex=index;
      rendered.querySelectorAll('.layout-component').forEach(el=>el.classList.toggle('selected',Number(el.dataset.blockIndex)===index));
      const width=blockWidth(items[index]);
      $('#neonWidth').value=String(width);
      $('#neonWidthValue').textContent=width+'%';
      const text=items[index]||'';
      const caption=text.match(/<strong>([\s\S]*?)<\/strong>/);
      const theme=text.includes('/light.gif')?'light':'dark';
      const align=text.match(/<p align="(left|right|center)"/)?.[1]||'center';
      if(caption)$('#neonCaption').value=new DOMParser().parseFromString(caption[1],'text/html').documentElement.textContent||'';
      $('#neonTheme').value=theme;$('#neonAlign').value=align;
      config=options({caption:$('#neonCaption').value,theme,align,width});
    });
    wrapper.addEventListener('dragstart',event=>{
      if(resizing){event.preventDefault();return}
      draggingIndex=index;
      event.dataTransfer.setData('application/x-layout-index',String(index));
      event.dataTransfer.effectAllowed='move';
      wrapper.classList.add('dragging');
    });
    wrapper.addEventListener('dragend',()=>{draggingIndex=null;clearDropHints()});
    wrapper.addEventListener('dragover',event=>{
      if(!event.dataTransfer.types.includes('application/x-layout-index')&&!event.dataTransfer.types.includes('application/x-neon-wave'))return;
      event.preventDefault();event.stopPropagation();
      const rect=wrapper.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width;
      const y=(event.clientY-rect.top)/rect.height;
      const side=x<.27?'left':x>.73?'right':y<.5?'before':'after';
      clearDropHints();wrapper.classList.add('drop-'+side);wrapper.dataset.dropSide=side;
    });
    wrapper.addEventListener('dragleave',event=>{
      if(!wrapper.contains(event.relatedTarget))wrapper.classList.remove('drop-left','drop-right','drop-before','drop-after');
    });
    wrapper.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();
      const side=wrapper.dataset.dropSide||'after';
      const from=Number(event.dataTransfer.getData('application/x-layout-index'));
      const isLibrary=event.dataTransfer.getData('application/x-neon-wave')==='neon-wave';
      if(isLibrary){
        const count=blocksInOrder(readLayout(source.value)).length;
        source.value=appendBlock(source.value,config);
        source.value=moveBlock(source.value,count,index,side);
      }else if(Number.isInteger(from)&&event.dataTransfer.getData('application/x-layout-index')!==''){
        source.value=moveBlock(source.value,from,index,side);
      }
      selectedIndex=index;
      clearDropHints();refresh();
      showToast(side==='left'||side==='right'?'Two-column layout updated':'Component moved');
    });
    handle.addEventListener('pointerdown',event=>{
      event.preventDefault();event.stopPropagation();
      const rect=wrapper.getBoundingClientRect();
      resizing={index,startX:event.clientX,startWidth:blockWidth(items[index]),parentWidth:rect.width};
      handle.setPointerCapture(event.pointerId);
      wrapper.classList.add('resizing');
    });
    handle.addEventListener('pointermove',event=>{
      if(!resizing||resizing.index!==index)return;
      const width=Math.max(20,Math.min(100,resizing.startWidth+(event.clientX-resizing.startX)/resizing.parentWidth*100));
      const snap=Math.round(width/5)*5;
      img.style.width=snap+'%';
      $('#neonWidthValue').textContent=snap+'%';
      handle.dataset.width=String(snap);
    });
    const finish=event=>{
      if(!resizing||resizing.index!==index)return;
      const width=Number(handle.dataset.width)||resizing.startWidth;
      resizing=null;
      source.value=resizeBlock(source.value,index,width);
      selectedIndex=index;refresh();showToast('Width: '+width+'%');
    };
    handle.addEventListener('pointerup',finish);
    handle.addEventListener('pointercancel',finish);
    wrapper.addEventListener('keydown',event=>{
      if(!event.altKey)return;
      if(event.key==='ArrowUp'||event.key==='ArrowDown'){
        event.preventDefault();
        const target=index+(event.key==='ArrowUp'?-1:1);
        if(target>=0&&target<items.length){
          source.value=moveBlock(source.value,index,target,event.key==='ArrowUp'?'before':'after');
          selectedIndex=target;refresh();
        }
      }
    });
  });
}
function clearDropHints(){
  rendered.querySelectorAll('.layout-component').forEach(el=>el.classList.remove('drop-left','drop-right','drop-before','drop-after','dragging'));
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
  source.value=appendBlock(source.value,config);
  selectedIndex=blocksInOrder(readLayout(source.value)).length-1;
  refresh();
  showToast('Neon Waveform added to README');
}
function applyChanges(){
  config=options({
    caption:$('#neonCaption').value,theme:$('#neonTheme').value,
    align:$('#neonAlign').value,width:$('#neonWidth').value
  });
  $('#neonWidthValue').textContent=config.width+'%';
  // Apply controls only to the selected component; other blocks retain their own settings.
  const nodes=readLayout(source.value);
  let cursor=0;
  for(const node of nodes){
    if(node.type!=='components')continue;
    for(let i=0;i<node.items.length;i++,cursor++){
      if(cursor===selectedIndex){
        const height=blockHeight(node.items[i]);
        let updated=block(config);
        if(height)updated=updated.replace(/(<img\b[^>]*?)(\s*\/>)/,'$1 height="'+height+'"$2');
        node.items[i]=updated;break
      }
    }
  }
  source.value=serializeLayout(nodes);
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
  list.insertAdjacentHTML('beforeend','<article class="component-card language-library-card"><div class="component-art language-art"><span>◉</span><div><b>JavaScript</b><i style="width:72%"></i><b>CSS</b><i style="width:40%"></i></div></div><div class="component-row"><strong>Repository Languages</strong><small>LIVE · SVG</small></div><p>Animated donut, row and column charts with GitHub language percentages, hover and touch details.</p><a class="language-library-link" href="./languages.html">Customize component ↗</a></article>');
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
    if(e.target.closest('.layout-component'))return;
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
  $('#previewDropZone').addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('application/x-layout-index'))e.preventDefault()});
  $('#previewDropZone').addEventListener('drop',e=>{
    if(e.target.closest('.layout-component'))return;
    const index=Number(e.dataTransfer.getData('application/x-layout-index'));
    if(e.dataTransfer.getData('application/x-layout-index')==='')return;
    e.preventDefault();
    const count=blocksInOrder(readLayout(source.value)).length;
    if(count>1){source.value=moveBlock(source.value,index,count-1,'after');selectedIndex=count-1;refresh()}
  });
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
    $('#libraryCount').textContent=component?'02':'01';
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
