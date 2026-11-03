import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RAW_ROOT, cleanWidth,cleanOffset,chooseTheme,imageURL,
  imageMarkdown,imageHTML,rowHTML,makeBlock,getBlocks,
  replaceBlock,removeBlock,moveBlock,cleanForExport,validatedCatalog,escapeHTML
} from '../src/designer-core.mjs';

const entry={id:'test-card',title:'Example <Card>',category:'Cards',format:'svg',
  themes:{dark:'generated/test-card/dark.svg',light:'generated/test-card/light.svg',neon:'generated/test-card/neon.svg'}};
const second={...entry,id:'second-card',title:'Second',themes:{dark:'generated/second-card/dark.svg',light:'generated/second-card/light.svg'}};

test('width and offsets are clamped, themes fall back safely',()=>{
  assert.equal(cleanWidth(5),10);
  assert.equal(cleanWidth(73),75);
  assert.equal(cleanWidth(1000),100);
  assert.equal(cleanOffset(600),60);
  assert.equal(chooseTheme(second,'neon'),'dark');
});
test('README Markdown targets raw GitHub assets without scripts or styles',()=>{
  assert.match(imageMarkdown(entry,{align:'left',width:100,offset:0}),/^!\[/);
  assert.match(imageURL(entry,'dark'),/^https:\/\/raw\.githubusercontent\.com\//);
  assert.ok(imageURL(entry,'neon').endsWith('/neon.svg'));
  assert.ok(!imageMarkdown(entry,{align:'center'}).includes('style='));
  assert.match(imageMarkdown(entry,{align:'right',width:30}),/align="right"/);
  assert.match(imageHTML(entry,{align:'center',width:50,offset:20}),/<table width="100%">/);
  assert.match(imageHTML(entry,{align:'center',width:50,offset:20}),/<td width="20%">/);
  assert.match(imageHTML(entry,{align:'center',width:50,offset:20}),/width="50%"/);
  assert.match(imageMarkdown(entry,{align:'center'}),/Example &lt;Card&gt;/);
  assert.equal(escapeHTML('a&<b'), 'a&amp;&lt;b');
});
test('side-by-side layouts use GitHub-safe HTML cells',()=>{
  const two=rowHTML([entry,second],{theme:'dark'});
  assert.equal((two.match(/<td /g)||[]).length,2);
  assert.match(two,/<td width="50%"/);
  const three=rowHTML([entry,second,entry],{theme:'neon'});
  assert.equal((three.match(/<td /g)||[]).length,3);
  assert.match(three,/width="34%"/);
  assert.ok(!three.includes('undefined'));
  assert.throws(()=>rowHTML([entry]),/two or three/);
});
test('block markers are parsed, updated, reordered, removed and cleaned',()=>{
  const mk=(id,it)=>makeBlock({id,kind:'component',items:[it.id],width:70,align:'right',offset:10,theme:'neon'},imageHTML(it,{width:70,align:'right',offset:10,theme:'neon'}));
  let md='# Title\n\n'+mk('b123',entry)+'\n\nSome text.\n\n'+mk('b456',second);
  const initial=getBlocks(md);
  assert.equal(initial.length,2);
  assert.equal(initial[0].width,70);
  assert.equal(initial[0].theme,'neon');
  assert.match(cleanForExport(md),/Some text\./);
  assert.doesNotMatch(cleanForExport(md),/rch:/);
  md=moveBlock(md,'b123',1);
  assert.deepEqual(getBlocks(md).map(x=>x.id),['b456','b123']);
  md=replaceBlock(md,'b123',mk('b123',second));
  assert.match(md,/second-card/);
  md=removeBlock(md,'b456');
  assert.equal(getBlocks(md).length,1);
});
test('invalid path and catalog items cannot render arbitrary links',()=>{
  assert.throws(()=>imageURL({...entry,themes:{dark:'https://evil.test/script.svg'}},'dark'),/Invalid/);
  assert.equal(validatedCatalog([entry,null,{id:'x'}]).length,1);
});
