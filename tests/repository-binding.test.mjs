import test from 'node:test';
import assert from 'node:assert/strict';
import {languageBlock,block,exportMarkdown,DEFAULTS} from '../src/neon-core.mjs';
import {readLayout,blocksInOrder,moveBlock} from '../src/layout-core.mjs';
import {
  languagePercentages,quickChartUrl,createLanguageBlock,repoOverviewBlock,
  updateBoundComponents,fetchRepositoryData
} from '../src/repository-binding.mjs';

const alpha={JavaScript:400,TypeScript:350,CSS:200,HTML:50};
const beta={Python:750,Shell:250};
const infoA={full_name:'TestUser/Alpha',description:'The alpha repository'};
const infoB={full_name:'TestUser/Beta',description:'The beta repository'};
function fakeFetch(url){
  let repo=url.includes('/Alpha')?'Alpha':'Beta';
  const info=repo==='Alpha'?infoA:infoB,langs=repo==='Alpha'?alpha:beta;
  return Promise.resolve({
    ok:true,status:200,
    headers:{get:(key)=>key==='link'&&url.includes('/commits?')
      ?'<https://api.github.com/repos/TestUser/'+repo+'/commits?per_page=1&page=73>; rel="last"':null},
    json:async()=>url.endsWith('/languages')?langs:url.includes('/commits?')?[{sha:'x'}]:info
  });
}
test('GitHub repo connection uses the exact repository for languages and commits',async()=>{
  const result=await fetchRepositoryData('https://github.com/TestUser/Alpha',fakeFetch);
  assert.equal(result.repo,'TestUser/Alpha');
  assert.equal(result.commits,73);
  assert.deepEqual(result.languages,alpha);
  const newResult=await fetchRepositoryData('TestUser/Beta',fakeFetch);
  assert.deepEqual(newResult.languages,beta);
});
test('all donut row column blocks update repo name and actual language percentages',()=>{
  const original='# README\n\n'+['donut','row','column'].map(languageBlock).join('\n\n')+
    '\n\n'+block(DEFAULTS)+'\n\n'+repoOverviewBlock(infoA,7);
  const bound=updateBoundComponents(original,'TestUser/Alpha',alpha,infoA,73);
  assert.equal(bound.count,4);
  assert.equal((bound.markdown.match(/quickchart\.io\/chart/g)||[]).length,3);
  assert.match(bound.markdown,/TestUser\/Alpha/);
  assert.match(bound.markdown,/JavaScript 40\.0%/);
  assert.match(bound.markdown,/73 commits/);
  assert.match(bound.markdown,/neon-wave/);
  const replaced=updateBoundComponents(bound.markdown,'TestUser/Beta',beta,infoB,23);
  assert.equal(replaced.count,4);
  assert.match(replaced.markdown,/Python 75\.0%/);
  assert.match(replaced.markdown,/TestUser\/Beta/);
  assert.doesNotMatch(replaced.markdown,/TestUser\/Alpha|JavaScript 40\.0%/);
  assert.equal((replaced.markdown.match(/neon-wave\/dark\.gif/g)||[]).length,1);
  const exported=exportMarkdown(replaced.markdown);
  assert.match(exported,/quickchart\.io\/chart/);
  assert.match(exported,/23 commits/);
});
test('repo-specific chart URLs contain the selected chart type and actual data',()=>{
  const percentages=languagePercentages(alpha);
  assert.equal(percentages.reduce((a,b)=>a+b.percent,0),100);
  assert.deepEqual(percentages.map(x=>x.name),['JavaScript','TypeScript','CSS','HTML']);
  for(const [mode,expectedType] of [['donut','doughnut'],['row','horizontalBar'],['column','bar']]){
    const url=new URL(quickChartUrl(mode,percentages));
    const config=JSON.parse(url.searchParams.get('c'));
    assert.equal(config.type,expectedType);
    assert.deepEqual(config.data.datasets[0].data,[40,35,20,5]);
    assert.equal(url.searchParams.get('format'),'png');
    assert.match(createLanguageBlock(mode,'TestUser/Alpha',alpha),/TestUser\/Alpha/);
  }
  assert.throws(()=>quickChartUrl('other',percentages));
  assert.throws(()=>createLanguageBlock('row','https://evil.test/x/y',alpha));
});
test('paired language cards export for GitHub, non-dynamic text unchanged',()=>{
  let doc='# My original title\n\n'+languageBlock('donut')+'\n\n'+languageBlock('row')+
    '\n\nMy unchanged paragraph.';
  doc=moveBlock(doc,1,0,'right');
  assert.equal(blocksInOrder(readLayout(doc)).length,2);
  const linked=updateBoundComponents(doc,'TestUser/Beta',beta,infoB,13);
  const exported=exportMarkdown(linked.markdown);
  assert.match(exported,/<table width="100%">/);
  assert.match(exported,/Python 75\.0%/);
  assert.match(exported,/# My original title/);
  assert.match(exported,/My unchanged paragraph/);
  assert.doesNotMatch(exported,/RCH:LANG|RCH:PAIR/);
});
test('fetch failures leave caller able to keep the previous README',async()=>{
  const failure=async()=>({ok:false,status:404});
  await assert.rejects(fetchRepositoryData('TestUser/Missing',failure),/Repository tapılmadı/);
  assert.deepEqual(languagePercentages({}),[]);
  assert.throws(()=>createLanguageBlock('donut','TestUser/Alpha',{}));
});
