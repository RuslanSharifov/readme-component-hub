import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fetchRepositoryReadme} from '../src/readme-pull.mjs';

test('pull README retrieves GitHub API root README and returns exact Unicode text',async()=>{
  const markdown='# Salam, dünya 🌍\r\n\r\n**Bakı**\n<!-- RCH:LANG:donut -->\n';
  const raw=Buffer.from(markdown,'utf8').toString('base64');
  let calledUrl='';
  const result=await fetchRepositoryReadme('https://github.com/Demo/Repo',async(url,options)=>{
    calledUrl=url;
    assert.equal(options.headers.Accept,'application/vnd.github+json');
    return {ok:true,json:async()=>({type:'file',encoding:'base64',content:raw.slice(0,12)+'\n'+raw.slice(12)})};
  });
  assert.equal(calledUrl,'https://api.github.com/repos/Demo/Repo/readme');
  assert.equal(result,markdown);
});
test('missing and invalid README do not produce replacement content',async()=>{
  await assert.rejects(fetchRepositoryReadme('Demo/Repo',async()=>({ok:false,status:404})),/README.md tapılmadı/);
  await assert.rejects(fetchRepositoryReadme('Demo/Repo',async()=>({ok:false,status:403})),/limiti/);
  await assert.rejects(fetchRepositoryReadme('Demo/Repo',async()=>({ok:true,json:async()=>({type:'dir',encoding:'base64',content:'YQ=='})})),/formatı/);
  await assert.rejects(fetchRepositoryReadme('Demo/Repo',async()=>({ok:true,json:async()=>({type:'file',encoding:'base64',content:'invalid!!!'})})),/kodlaşdırılmayıb/);
  await assert.rejects(fetchRepositoryReadme('https://evil.example/Owner/Repo'),/Only GitHub/);
});
test('README pull is confirmed explicitly, replaces only on successful fetch, and has cancel',()=>{
  const page=readFileSync(new URL('../designer.html',import.meta.url),'utf8');
  const designer=readFileSync(new URL('../src/designer.js',import.meta.url),'utf8');
  assert.match(page,/id="pullRepositoryReadme"/);
  assert.match(page,/id="readmePullDialog"/);
  assert.match(page,/id="cancelReadmePull"/);
  assert.match(page,/id="confirmReadmePull"/);
  assert.match(page,/hazırkı Markdown məzmunu/);
  assert.match(designer,/dialog\.showModal\(\)/);
  assert.match(designer,/const markdown=await fetchRepositoryReadme\(repo\)/);
  assert.match(designer,/source\.value=markdown/);
  assert.match(designer,/readmePullDialog'\)\.close\(\)/);
  assert.match(designer,/linkedRepository\.repo/);
});
