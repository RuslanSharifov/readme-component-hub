/* Public GitHub API preview; this is a browser-only visualization.
   README embeds still require generated SVGs in the target repository. */
import {escapeHTML} from './designer-core.mjs';

const API='https://api.github.com/repos/';
const HEADERS={'Accept':'application/vnd.github+json'};
async function request(url) {
  const response=await fetch(url,{headers:HEADERS,cache:'no-store'});
  if(response.status===404)return null;
  if(!response.ok)throw new Error(response.status===403?'GitHub API limit reached':('GitHub API '+response.status));
  return response.json();
}
export async function fetchRepositorySnapshot(slug) {
  const base=API+slug;
  const repo=await request(base);
  if(!repo || !repo.full_name)throw new Error('Repository not found or not public');
  const since=new Date(Date.now()-84*86400000).toISOString();
  const extra=await Promise.allSettled([
    request(base+'/actions/runs?per_page=15'),
    request(base+'/languages'),
    request(base+'/releases/latest'),
    request(base+'/issues?state=all&per_page=100'),
    request(base+'/commits?since='+encodeURIComponent(since)+'&per_page=100')
  ]);
  const output={repo};
  ['runs','languages','release','issues','commits'].forEach((name,i)=>{
    output[name]=extra[i].status==='fulfilled'?extra[i].value:null;
  });
  return output;
}
const palettes={
 dark:{bg:'#101A22',panel:'#1B2B34',text:'#E5F7EF',muted:'#8BA8A4',line:'#344D50',accent:'#8FF0BC',sub:'#2B5144'},
 light:{bg:'#F0F5F5',panel:'#FFFFFF',text:'#1B3939',muted:'#587672',line:'#C5D8D2',accent:'#13815C',sub:'#DAF3E5'},
 neon:{bg:'#140F28',panel:'#211C3B',text:'#F0E9FF',muted:'#A59DCA',line:'#554673',accent:'#C2A8FF',sub:'#44325E'}
};
const esc=value=>escapeHTML(String(value??'').replace(/[\u0000-\u001F\u007F]/g,'').slice(0,90));
const text=(x,y,value,size,color,weight='normal')=>
  '<text x="'+x+'" y="'+y+'" font-family="Arial,sans-serif" font-size="'+size+'" fill="'+color+
  '" font-weight="'+weight+'">'+esc(value)+'</text>';
const rect=(x,y,w,h,color,r=6)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+color+'"/>';
const date=s=>{const d=new Date(s);return Number.isNaN(d.getTime())?'Unknown':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});};
const count=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US'):'—';

export function liveSVG(entry,theme,slug,snapshot) {
  const p=palettes[theme]||palettes.dark;
  const title=({
    'repository-stats':'Repository Stats','chrome-ui-gallery-stats':'Repository Stats',
    'star-growth-chart':'Star Growth','ci-status-card':'CI/CD Health',
    'contribution-heatmap':'Contribution Activity','language-analytics':'Languages',
    'latest-release-card':'Latest Release','project-progress-tracker':'Issue Progress'
  })[entry.id]||'GitHub Stats';
  const base=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280" width="720" height="280" role="img" aria-label="'+esc(slug+' '+title)+'">',
    rect(0,0,720,280,p.bg,20),rect(15,16,690,249,p.panel,15),
    text(39,49,'●  GITHUB / LIVE PREVIEW',13,p.accent,'bold'),
    text(39,94,title,27,p.text,'bold'),text(40,120,slug,14,p.muted)];
  if(!snapshot){
    base.push(text(40,171,'GitHub API data unavailable',19,p.muted),
      text(40,207,'README cards require a one-time workflow setup.',14,p.muted));
  } else {
    const data=snapshot.repo||{};
    switch(entry.id){
      case 'repository-stats':
      case 'chrome-ui-gallery-stats': {
        const vals=[['STARS',count(data.stargazers_count)],['FORKS',count(data.forks_count)],['OPEN ISSUES*',count(data.open_issues_count)],['LATEST PUSH',date(data.pushed_at)]];
        vals.forEach(([label,value],i)=>{const x=40+i*169;base.push(text(x,163,label,13,p.muted),text(x,205,value,i===3?16:25,i===0?p.accent:p.text,'bold'));});
        base.push(text(40,243,'* GitHub issue count may include pull requests.',11,p.muted));
        break;
      }
      case 'star-growth-chart': {
        base.push(text(41,174,count(data.stargazers_count),45,p.accent,'bold'),
          text(230,174,'current stars',18,p.muted),
          text(41,217,'History begins after the repository workflow is installed.',13,p.muted));
        break;
      }
      case 'ci-status-card': {
        const runs=snapshot.runs?.workflow_runs;
        if(!Array.isArray(runs))base.push(text(40,191,'Workflow run data unavailable',18,p.muted));
        else if(!runs.length)base.push(text(40,191,'No workflow runs found',20,p.muted));
        else {
          const state=runs[0].conclusion||runs[0].status||'unknown';
          base.push(text(40,178,state.toUpperCase(),30,p.accent,'bold'),text(40,208,runs[0].name||'Workflow',16,p.muted));
          runs.slice(0,12).forEach((r,i)=>base.push(rect(40+i*49,228,35,14,r.conclusion==='success'?p.accent:r.conclusion==='failure'?'#E68485':p.sub,3)));
        } break;
      }
      case 'contribution-heatmap': {
        if(!Array.isArray(snapshot.commits))base.push(text(40,193,'Commit history unavailable',18,p.muted));
        else {
          const days=new Map();snapshot.commits.forEach(row=>{
            const day=row.commit?.author?.date?.slice(0,10);if(day)days.set(day,(days.get(day)||0)+1);
          });
          const current=new Date();current.setUTCHours(0,0,0,0);
          for(let i=0;i<84;i++) {
            const d=new Date(current.getTime()-(83-i)*86400000).toISOString().slice(0,10);
            const n=days.get(d)||0;
            base.push(rect(40+Math.floor(i/7)*51,146+(i%7)*13,36,9,n? (n>3?p.accent:'#468D69'):p.sub,3));
          }
          base.push(text(40,260,'Most recent 100 commits in the past 84 days (API sample)',11,p.muted));
        } break;
      }
      case 'language-analytics': {
        const langs=snapshot.languages;
        if(!langs || !Object.keys(langs).length)base.push(text(40,193,'Language breakdown unavailable',18,p.muted));
        else {
          const top=Object.entries(langs).sort((a,b)=>b[1]-a[1]).slice(0,4);
          const total=Object.values(langs).reduce((a,b)=>a+b,0);
          const colors=['#6FC6D1','#B4A1EE','#EAC878','#8FE9B6'];
          let x=40;
          top.forEach(([name,bytes],i)=>{const w=bytes/total*610;base.push(rect(x,147,Math.max(3,w-2),17,colors[i],3));x+=w;});
          top.forEach(([name,bytes],i)=>base.push(text(40+i%2*310,195+Math.floor(i/2)*36,
            name+' '+(bytes/total*100).toFixed(1)+'%',16,colors[i])));
        } break;
      }
      case 'latest-release-card': {
        if(!snapshot.release)base.push(text(40,189,'NO PUBLISHED RELEASE',24,p.accent,'bold'),
          text(40,223,'This repository has no published GitHub release.',15,p.muted));
        else base.push(text(40,184,snapshot.release.tag_name||'Release',34,p.accent,'bold'),
          text(40,218,date(snapshot.release.published_at),16,p.muted));break;
      }
      case 'project-progress-tracker': {
        if(!Array.isArray(snapshot.issues))base.push(text(40,184,'Issue data unavailable',18,p.muted));
        else {
          const issues=snapshot.issues.filter(issue=>!issue.pull_request);
          const closed=issues.filter(issue=>issue.state==='closed').length, total=issues.length;
          if(!total)base.push(text(40,187,'NO TRACKED ISSUES',25,p.accent,'bold'));
          else {
            const percent=Math.round(closed/total*100);
            base.push(text(40,193,percent+'%',43,p.accent,'bold'),
              text(190,181,closed+' / '+total+' issues closed',21,p.text));
            base.push(rect(190,199,435,20,p.sub,9),rect(190,199,435*percent/100,20,p.accent,9));
          }
          base.push(text(40,249,'Based on first 100 GitHub issues (pull requests excluded)',11,p.muted));
        } break;
      }
    }
  }
  base.push('</svg>');
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(base.join(''));
}
export function dynamicImageMetadata(url) {
  const match=String(url).match(/\/(?:generated|\.github\/readme-component-hub)\/([a-z0-9-]+)\/(dark|light|neon)\.svg(?:\?.*)?$/);
  return match?{id:match[1],theme:match[2]}:null;
}
