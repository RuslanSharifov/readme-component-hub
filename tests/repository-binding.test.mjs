import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REPOSITORY, parseRepository, safeBranch, repoAssetURL, workflowTemplate,
  rebindDesignerMarkdown, imageMarkdown, rowHTML, makeBlock, getBlocks, cleanForExport,
  DYNAMIC_COMPONENT_IDS
} from '../src/designer-core.mjs';
import {liveSVG,dynamicImageMetadata} from '../src/repo-preview.mjs';

const stats={id:'repository-stats',category:'Dynamic',title:'Repository Stats',format:'svg',
  themes:{dark:'generated/repository-stats/dark.svg',light:'generated/repository-stats/light.svg'}};
const growth={id:'star-growth-chart',category:'Dynamic',title:'Star Growth',format:'svg',
  themes:{dark:'generated/star-growth-chart/dark.svg',light:'generated/star-growth-chart/light.svg',neon:'generated/star-growth-chart/neon.svg'}};
const staticCard={id:'terminal-card',category:'Cards',title:'Terminal Card',format:'svg',
  themes:{dark:'components/terminal-card/dark.svg',light:'components/terminal-card/light.svg'}};

test('repository URL parser accepts GitHub links and owner/repo names',()=>{
  assert.deepEqual(parseRepository(''),DEFAULT_REPOSITORY);
  assert.deepEqual(parseRepository('https://github.com/RuslanSharifov/readme-component-hub/'),DEFAULT_REPOSITORY);
  assert.equal(parseRepository('https://github.com/OtherOrg/Project.git').slug,'OtherOrg/Project');
  assert.equal(parseRepository('OtherOrg/Project').slug,'OtherOrg/Project');
  for(const value of [
    'https://evil.test/Owner/Repo','http://github.com/Owner/Repo',
    'https://github.com/a/b/tree/main','https://github.com/Owner/Repo?ref=bad',
    'OWNER','//github.com/Owner/Repo','Owner/../Repo','owner/repo/extra',
    'https://github.com/foo/bar#tag'
  ]) assert.throws(()=>parseRepository(value),{name:'TypeError'},value);
  assert.equal(safeBranch('feature/docs'),'feature/docs');
  assert.equal(safeBranch('../bad'),'main');
});

test('new repository generates its own dynamic image URL but keeps static assets shared',()=>{
  const chosen={slug:'RuslanSharifov/chrome-ui-gallery',branch:'main'};
  assert.equal(repoAssetURL(stats,'dark',chosen),
    'https://raw.githubusercontent.com/RuslanSharifov/chrome-ui-gallery/main/.github/readme-component-hub/repository-stats/dark.svg');
  assert.equal(repoAssetURL(growth,'neon',chosen),
    'https://raw.githubusercontent.com/RuslanSharifov/chrome-ui-gallery/main/.github/readme-component-hub/star-growth-chart/neon.svg');
  assert.match(repoAssetURL(staticCard,'dark',chosen),/readme-component-hub\/main\/components\/terminal-card\/dark.svg$/);
  assert.equal(repoAssetURL(stats,'dark',DEFAULT_REPOSITORY),
    'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/generated/repository-stats/dark.svg');
  assert.equal(DYNAMIC_COMPONENT_IDS.size,8);
});

test('all previous components and rows rebind on repo change without rewriting prose',()=>{
  const first={id:'one',kind:'component',items:[stats.id],width:50,align:'left',offset:10,theme:'dark'};
  const second={id:'two',kind:'row',items:[staticCard.id,growth.id],width:100,align:'center',offset:0,theme:'neon'};
  const original='# Test README\n\nUser-written explanation.\n\n'+
    makeBlock(first,imageMarkdown(stats,first))+'\n\n## Another section\n\n'+
    makeBlock(second,rowHTML([staticCard,growth],second))+
    '\n\nExternal URL: https://example.com/this-should-not-change';
  const target={slug:'RuslanSharifov/chrome-ui-gallery',branch:'main'};
  const changed=rebindDesignerMarkdown(original,[stats,staticCard,growth],target);
  assert.match(changed,/chrome-ui-gallery\/main\/\.github\/readme-component-hub\/repository-stats\/dark.svg/);
  assert.match(changed,/chrome-ui-gallery\/main\/\.github\/readme-component-hub\/star-growth-chart\/neon.svg/);
  assert.match(changed,/readme-component-hub\/main\/components\/terminal-card\/dark.svg/);
  assert.match(changed,/User-written explanation/);
  assert.match(changed,/example\.com\/this-should-not-change/);
  assert.equal(getBlocks(changed).length,2);
  const next=rebindDesignerMarkdown(changed,[stats,staticCard,growth],DEFAULT_REPOSITORY);
  assert.doesNotMatch(next,/chrome-ui-gallery\/main\/\.github\/readme-component-hub/);
  assert.match(next,/readme-component-hub\/main\/generated\/repository-stats\/dark.svg/);
  assert.doesNotMatch(cleanForExport(next),/<!-- rch:/);
});
test('workflow template is a copyable GitHub Actions caller',()=>{
  const text=workflowTemplate();
  assert.match(text,/workflow_dispatch:/);
  assert.match(text,/cron:/);
  assert.match(text,/uses: RuslanSharifov\/readme-component-hub\/\.github\/workflows\/render-repository\.yml@main/);
  assert.match(text,/contents: write/);
});
test('GitHub API preview is repo-bound and escapes untrusted metadata',()=>{
  const snapshot={repo:{stargazers_count:4,forks_count:1,open_issues_count:2,pushed_at:'2026-11-02T12:00:00Z'}};
  const svg=liveSVG(stats,'dark','RuslanSharifov/chrome-ui-gallery',snapshot);
  assert.match(svg,/^data:image\/svg\+xml/);
  const markup=decodeURIComponent(svg.split(',').slice(1).join(','));
  assert.match(markup,/chrome-ui-gallery/);
  assert.match(markup,/STARS/);
  assert.match(markup,/>4<\/text>/);
  assert.ok(!markup.includes('<script'));
  assert.deepEqual(dynamicImageMetadata('https://raw.githubusercontent.com/x/y/main/.github/readme-component-hub/star-growth-chart/neon.svg'),
    {id:'star-growth-chart',theme:'neon'});
});
