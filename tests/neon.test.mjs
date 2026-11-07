import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS,block,options,snippet,insertBlock,updateBlocks,
  exportMarkdown,neonURL,parseRepo,BLOCK_OPEN
} from '../src/neon-core.mjs';

test('only two real GIF themes with raw URLs',()=>{
  assert.equal(neonURL('dark'),'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/neon-wave/dark.gif');
  assert.ok(neonURL('light').endsWith('/light.gif'));
  assert.equal(neonURL('neon'),neonURL('dark'));
});

test('editing caption updates GitHub-compatible HTML without JS or CSS',()=>{
  const output=snippet({caption:'My <GitHub> & "code"',width:70,theme:'light',align:'right'});
  assert.match(output,/My &lt;GitHub&gt; &amp; &quot;code&quot;/);
  assert.match(output,/width="70%"/);
  assert.match(output,/align="right"/);
  assert.match(output,/light.gif/);
  assert.doesNotMatch(output,/style=|<script/);
  assert.doesNotMatch(output,/<GitHub>/);
});

test('Neon blocks update everywhere, preserving user-written Markdown',()=>{
  let md='# Project\n\n'+block(DEFAULTS)+'\n\nA link [docs](https://example.com).\n\n'+block(DEFAULTS);
  md=updateBlocks(md,{caption:'Updated label',theme:'dark',align:'center',width:50});
  assert.equal((md.match(/Updated label/g)||[]).length,2);
  assert.equal((md.match(/width="50%"/g)||[]).length,2);
  assert.match(md,/A link \[docs\]/);
  const output=exportMarkdown(md);
  assert.ok(!output.includes(BLOCK_OPEN));
  assert.equal((output.match(/Updated label/g)||[]).length,2);
});

test('insertion and normalization enforce safe bounds',()=>{
  assert.match(insertBlock('ABC',1,DEFAULTS),/RCH:NEON/);
  assert.equal(options({width:200}).width,100);
  assert.equal(options({width:12}).width,20);
  assert.equal(options({align:'../../',theme:'javascript:'}).align,'center');
  assert.equal(options({caption:' X \n Y '}).caption,'X   Y');
});

test('repository URL parsing is safe and optional for shared asset',()=>{
  assert.equal(parseRepo(''),'RuslanSharifov/readme-component-hub');
  assert.equal(parseRepo('https://github.com/Example/Repo.git'),'Example/Repo');
  assert.throws(()=>parseRepo('https://evil.test/Owner/Repo'));
  assert.throws(()=>parseRepo('https://github.com/Owner/Repo/tree/main'));
});

test('aurora particle design keeps at least triple density and no automated shape timer', async () => {
  const {readFileSync}=await import('node:fs');
  const hero=readFileSync(new URL('../src/hero.js',import.meta.url),'utf8');
  const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const designer=readFileSync(new URL('../designer.html',import.meta.url),'utf8');
  const neon=readFileSync(new URL('../src/aurora-theme.css',import.meta.url),'utf8');
  assert.match(hero,/mobile: \{ min: 1530, max: 2550 \}/);
  assert.match(hero,/tablet: \{ min: 2940, max: 4900 \}/);
  assert.match(hero,/desktop: \{ min: 5100, max: 8500 \}/);
  assert.doesNotMatch(hero,/setInterval\(next/);
  assert.match(hero,/const stride = s.count \/ count/);
  assert.match(neon,/--glow-purple:#ad8dff/);
  assert.match(page,/aurora-theme\.css/);
  assert.match(designer,/aurora-designer\.css/);
  assert.match(designer,/aurora-interactions\.js/);
});
