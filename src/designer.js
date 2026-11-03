import {
  escapeHTML, imageURL, imageMarkdown, imageHTML, rowHTML, makeBlock,
  getBlocks, replaceBlock, removeBlock, moveBlock, cleanForExport,
  validatedCatalog, normalizeOptions
} from './designer-core.mjs';

const $ = (s, root=document) => root.querySelector(s);
const source = $('#markdownInput');
const preview = $('#readmePreview');
const storageKey = 'rch_readme_designer_v1';
const defaultText = '# My GitHub README\n\nBuilding thoughtful software, one commit at a time.\n\n## My projects\n\nAdd a component from the library to customize this README.\n';
let catalog = [];
let selectedId = null;
let dragId = null;
let counter = 1;
let timer = null;
const byId = id => catalog.find(item=>item.id===id);
const getSaved = () => {try {return localStorage.getItem(storageKey)} catch {return null}};
const save = value => {try {localStorage.setItem(storageKey,value)} catch {}};
source.value = getSaved() || defaultText;

function notify(message) {
  const el = $('#designerToast');
  el.textContent=message;
  el.classList.add('visible');
  window.clearTimeout(timer);
  timer=window.setTimeout(()=>el.classList.remove('visible'),2400);
}
function assetPreview(entry,theme='dark') {
  const path=entry.themes[theme] || entry.themes.dark;
  return new URL(path,document.baseURI).href;
}
function insertRaw(text) {
  const start=source.selectionStart, end=source.selectionEnd, original=source.value;
  const before=original.slice(0,start),after=original.slice(end);
  const prefix=before && !before.endsWith('\n\n')?'\n\n':'';
  const suffix=after && !after.startsWith('\n\n')?'\n\n':'';
  source.setRangeText(prefix+text+suffix,start,end,'end');
  refresh();
}
function nextId() {
  const existing=new Set(getBlocks(source.value).map(x=>x.id));
  let id;
  do {id='b'+(Date.now().toString(36))+(counter++).toString(36)} while (existing.has(id));
  return id;
}
function addComponent(entry) {
  if (!entry) return;
  const o={id:nextId(),kind:'component',items:[entry.id],width:100,align:'center',offset:0,theme:'dark'};
  insertRaw(makeBlock(o,imageMarkdown(entry,o)));
  selectedId=o.id;
  refresh();
  notify('Component added to your README');
}
function addRow() {
  const ids=[$('#rowFirst').value,$('#rowSecond').value,$('#rowThird').value].filter(Boolean);
  const items=ids.map(byId).filter(Boolean);
  if (items.length<2) {notify('Choose at least two components');return}
  const o={id:nextId(),kind:'row',items:ids,width:100,align:'center',offset:0,theme:'dark'};
  insertRaw(makeBlock(o,rowHTML(items,o)));
  selectedId=o.id;
  refresh();
  notify('Side-by-side layout added');
}
function blockSource(block, options) {
  const item={id:block.id,kind:block.kind,items:block.items,
    width:options.width ?? block.width,
    align:options.align ?? block.align,
    offset:options.offset ?? block.offset,
    theme:options.theme ?? block.theme
  };
  if (block.kind==='row') return makeBlock(item,rowHTML(item.items.map(byId).filter(Boolean),item));
  const entry=byId(item.items[0]);
  return entry?makeBlock(item,imageMarkdown(entry,item)):block.full;
}
function selectedBlock() {
  return getBlocks(source.value).find(x=>x.id===selectedId);
}
function syncInspector() {
  const block=selectedBlock(),pane=$('#appearancePanel');
  const valid=!!block;
  pane.classList.toggle('is-disabled',!valid);
  for (const el of pane.querySelectorAll('select')) el.disabled=!valid;
  $('#selectionName').textContent=valid?(block.kind==='row'?'Side-by-side row':byId(block.items[0])?.title||'Component'):'Select a block';
  if (!valid) return;
  $('#blockWidth').value=String(block.width);
  $('#blockAlign').value=block.align;
  $('#blockOffset').value=String(block.offset);
  $('#blockTheme').value=block.theme;
  const isRow=block.kind==='row';
  $('#blockWidth').disabled=isRow;
  $('#blockOffset').disabled=isRow;
  $('#blockAlign').disabled=isRow;
  if (isRow) {
    const supported=block.items.every(id=>!!byId(id)?.themes?.[block.theme]);
    if (!supported) $('#blockTheme').value='dark';
  } else {
    const entry=byId(block.items[0]);
    for (const opt of $('#blockTheme').options)
      opt.disabled=!entry?.themes?.[opt.value];
  }
}
function renderBlocks() {
  const blocks=getBlocks(source.value);
  $('#blockCount').textContent=String(blocks.length);
  $('#blockList').innerHTML=blocks.map((block,i)=>{
    const title=block.kind==='row'?'Side-by-side ('+block.items.length+')':(byId(block.items[0])?.title||block.items[0]);
    return '<div class="block-entry'+(block.id===selectedId?' selected':'')+'" draggable="true" data-block="'+escapeHTML(block.id)+'">'+
      '<span class="block-grip" aria-hidden="true">⠿</span>'+
      '<button type="button" class="block-select" data-block-select="'+escapeHTML(block.id)+'">'+escapeHTML(title)+'</button>'+
      '<button type="button" class="block-mini" data-move="-1" data-id="'+escapeHTML(block.id)+'" aria-label="Move up"'+(i===0?' disabled':'')+'>↑</button>'+
      '<button type="button" class="block-mini" data-move="1" data-id="'+escapeHTML(block.id)+'" aria-label="Move down"'+(i===blocks.length-1?' disabled':'')+'>↓</button>'+
      '<button type="button" class="block-mini" data-remove="'+escapeHTML(block.id)+'" aria-label="Remove block">×</button></div>';
  }).join('') || '<p class="panel-help">Insert components to manage layout and order here.</p>';
  syncInspector();
}
function renderPreview() {
  const cleaned=cleanForExport(source.value);
  if (typeof window.markdownit==='function' && window.DOMPurify) {
    const parser=window.markdownit({html:true,breaks:true,linkify:true,typographer:false});
    const html=parser.render(cleaned);
    preview.innerHTML=window.DOMPurify.sanitize(html,{
      ADD_ATTR:['align','width','valign'],
      FORBID_TAGS:['style','script','iframe','object','embed','form']
    });
    for (const a of preview.querySelectorAll('a')) {
      a.target='_blank';a.rel='noopener noreferrer';
    }
  } else {
    // Never inject untrusted Markdown without a sanitization library.
    preview.textContent=cleaned;
    preview.style.whiteSpace='pre-wrap';
  }
  $('#sourceLength').textContent=String(source.value.length)+' characters';
}
function refresh() {
  save(source.value);
  renderBlocks();
  renderPreview();
}
function renderLibrary() {
  const keyword=$('#librarySearch').value.trim().toLowerCase(), category=$('#libraryCategory').value;
  const shown=catalog.filter(item=>(category==='All'||item.category===category)&&
    (!keyword||[item.title,item.description,item.category,item.author,...item.tags].join(' ').toLowerCase().includes(keyword)));
  $('#libraryCount').textContent=String(shown.length);
  $('#componentLibrary').innerHTML=shown.map(item=>
    '<div class="library-item" draggable="true" data-component="'+escapeHTML(item.id)+'">'+
    '<img src="'+escapeHTML(assetPreview(item))+'" loading="lazy" alt="" />'+
    '<div class="library-item-body"><span class="library-item-title">'+escapeHTML(item.title)+'</span>'+
    '<span class="library-item-kind">'+escapeHTML(item.category)+' · '+item.format.toUpperCase()+'</span></div>'+
    '<button class="library-item-add" type="button" data-add="'+escapeHTML(item.id)+'" aria-label="Add '+escapeHTML(item.title)+'">+ Add</button></div>'
  ).join('') || '<p class="panel-help">No matching components.</p>';
}
function populateSelects() {
  const cat=[...new Set(catalog.map(c=>c.category))].sort();
  $('#libraryCategory').innerHTML='<option value="All">All categories</option>'+
    cat.map(name=>'<option value="'+escapeHTML(name)+'">'+escapeHTML(name)+'</option>').join('');
  const choices=catalog.map(c=>'<option value="'+escapeHTML(c.id)+'">'+escapeHTML(c.title)+'</option>').join('');
  $('#rowFirst').innerHTML=choices;
  $('#rowSecond').innerHTML=choices;
  $('#rowThird').innerHTML='<option value="">None · 2 columns</option>'+choices;
  if (catalog.length>1) $('#rowSecond').selectedIndex=1;
}
function formatSnippet(format) {
  const s=source.selectionStart,e=source.selectionEnd;
  const chosen=source.value.slice(s,e) || 'your text';
  const wraps={
    h1:'# '+chosen,
    h2:'## '+chosen,
    bold:'**'+chosen+'**',
    italic:'*'+chosen+'*',
    quote:'> '+chosen,
    list:'- '+chosen,
    code:'\n~~~text\n'+chosen+'\n~~~\n',
    divider:'\n---\n',
    table:'| Name | Value |\n| --- | --- |\n| Item | Details |',
    link:'['+chosen+'](https://github.com/)'
  };
  if (!wraps[format]) return;
  source.setRangeText(wraps[format],s,e,'end');
  refresh();source.focus();
}
function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input=document.createElement('textarea');
  input.value=value;input.style.position='fixed';input.style.opacity='0';
  document.body.appendChild(input);input.select();
  const success=document.execCommand('copy');input.remove();
  return success?Promise.resolve():Promise.reject(new Error('Copy not supported'));
}
function reorderTo(dragged,target) {
  let markdown=source.value;
  const blocks=getBlocks(markdown);
  const a=blocks.findIndex(b=>b.id===dragged),b=blocks.findIndex(b=>b.id===target);
  if(a<0||b<0||a===b) return;
  const direction=a<b?1:-1;
  for(let k=0;k<Math.abs(b-a);k++) markdown=moveBlock(markdown,dragged,direction);
  source.value=markdown;selectedId=dragged;refresh();
}
function bindEvents() {
  source.addEventListener('input',()=>{
    if (selectedId && !getBlocks(source.value).some(b=>b.id===selectedId)) selectedId=null;
    refresh();
  });
  source.addEventListener('keydown',e=>{
    if ((e.ctrlKey||e.metaKey) && (e.key==='b'||e.key==='i')) {
      e.preventDefault();formatSnippet(e.key==='b'?'bold':'italic');
    }
    if(e.key==='Tab'){e.preventDefault();source.setRangeText('  ',source.selectionStart,source.selectionEnd,'end');refresh()}
  });
  $('#librarySearch').addEventListener('input',renderLibrary);
  $('#libraryCategory').addEventListener('change',renderLibrary);
  $('#componentLibrary').addEventListener('click',e=>{
    const b=e.target.closest('[data-add]');
    if(b) addComponent(byId(b.dataset.add));
    else if(e.target.closest('[data-component]')) addComponent(byId(e.target.closest('[data-component]').dataset.component));
  });
  $('#componentLibrary').addEventListener('dragstart',e=>{
    const item=e.target.closest('[data-component]');
    if(!item)return;
    e.dataTransfer.setData('text/x-rch-component',item.dataset.component);
    e.dataTransfer.effectAllowed='copy';
  });
  for(const dropTarget of [$('#previewSurface'),source]){
    dropTarget.addEventListener('dragover',e=>{
      if(e.dataTransfer.types.includes('text/x-rch-component')){e.preventDefault();e.dataTransfer.dropEffect='copy'}
    });
    dropTarget.addEventListener('drop',e=>{
      const id=e.dataTransfer.getData('text/x-rch-component');
      if(!id || !byId(id)) return;
      e.preventDefault();addComponent(byId(id));
    });
  }
  $('#blockList').addEventListener('click',e=>{
    const select=e.target.closest('[data-block-select]');
    if(select){selectedId=select.dataset.blockSelect;refresh();return}
    const mover=e.target.closest('[data-move]');
    if(mover){source.value=moveBlock(source.value,mover.dataset.id,Number(mover.dataset.move));selectedId=mover.dataset.id;refresh();return}
    const remove=e.target.closest('[data-remove]');
    if(remove){source.value=removeBlock(source.value,remove.dataset.remove);selectedId=null;refresh()}
  });
  $('#blockList').addEventListener('dragstart',e=>{
    const item=e.target.closest('[data-block]');if(!item)return;
    dragId=item.dataset.block;e.dataTransfer.setData('text/x-rch-block',dragId);e.dataTransfer.effectAllowed='move';
  });
  $('#blockList').addEventListener('dragover',e=>{if(e.target.closest('[data-block]')) e.preventDefault()});
  $('#blockList').addEventListener('drop',e=>{
    const target=e.target.closest('[data-block]');if(!target||!dragId)return;
    e.preventDefault();reorderTo(dragId,target.dataset.block);dragId=null;
  });
  for(const id of ['blockWidth','blockAlign','blockOffset','blockTheme']) {
    $('#'+id).addEventListener('change',()=>{
      const block=selectedBlock();if(!block)return;
      const changes={width:Number($('#blockWidth').value),
        align:$('#blockAlign').value,offset:Number($('#blockOffset').value),
        theme:$('#blockTheme').value};
      source.value=replaceBlock(source.value,block.id,blockSource(block,changes));refresh();
    });
  }
  for(const button of document.querySelectorAll('[data-format]'))
    button.addEventListener('click',()=>formatSnippet(button.dataset.format));
  $('#addComponentRow').addEventListener('click',addRow);
  $('#newReadme').addEventListener('click',()=>{
    if(source.value.trim() && !confirm('Create a new README? Your current draft will be replaced.'))return;
    source.value=defaultText;selectedId=null;refresh();notify('New README created');
  });
  $('#copyReadme').addEventListener('click',()=>copyText(cleanForExport(source.value))
    .then(()=>notify('README copied to clipboard')).catch(()=>notify('Unable to copy Markdown')));
  $('#downloadReadme').addEventListener('click',()=>{
    const data=new Blob([cleanForExport(source.value)],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(data),a=document.createElement('a');
    a.href=url;a.download='README.md';document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  for(const button of document.querySelectorAll('[data-size]'))
    button.addEventListener('click',()=>{
      preview.classList.toggle('mobile-size',button.dataset.size==='mobile');
      document.querySelectorAll('[data-size]').forEach(x=>{
        const yes=x===button;x.classList.toggle('selected',yes);x.setAttribute('aria-pressed',String(yes));
      });
    });
  for(const button of document.querySelectorAll('[data-skin]'))
    button.addEventListener('click',()=>{
      preview.classList.toggle('dark-skin',button.dataset.skin==='dark');
      preview.classList.toggle('light-skin',button.dataset.skin==='light');
      document.querySelectorAll('[data-skin]').forEach(x=>{
        const yes=x===button;x.classList.toggle('selected',yes);x.setAttribute('aria-pressed',String(yes));
      });
    });
}
async function init() {
  bindEvents();
  refresh();
  try {
    const response=await fetch('./components/catalog.json',{cache:'no-store'});
    if(!response.ok) throw new Error('HTTP '+response.status);
    catalog=validatedCatalog(await response.json());
    populateSelects();renderLibrary();refresh();
  } catch(error) {
    console.error(error);
    $('#componentLibrary').textContent='Unable to load the component catalog. Reload this page or check GitHub Pages.';
    notify('Component catalog unavailable');
  }
}
init();
