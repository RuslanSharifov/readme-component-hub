import {BLOCK_OPEN,BLOCK_CLOSE,PAIR_OPEN,PAIR_CLOSE,BLOCKS,block,options} from './neon-core.mjs';

const TOKENS=/<!-- RCH:PAIR -->[\s\S]*?<!-- \/RCH:PAIR -->|<!-- RCH:NEON -->[\s\S]*?<!-- \/RCH:NEON -->/g;
export function readLayout(markdown){
  const nodes=[];
  let end=0;
  for(const match of String(markdown).matchAll(TOKENS)){
    if(match.index>end)nodes.push({type:'text',value:markdown.slice(end,match.index)});
    const pair=match[0].startsWith(PAIR_OPEN);
    const items=pair?[...match[0].matchAll(BLOCKS)].map(m=>m[0]):[match[0]];
    if(items.length===2&&pair)nodes.push({type:'components',items});
    else if(items.length)for(const item of items)nodes.push({type:'components',items:[item]});
    end=match.index+match[0].length;
  }
  if(end<markdown.length)nodes.push({type:'text',value:markdown.slice(end)});
  return nodes;
}
export function serializeLayout(nodes){
  return nodes.map(node=>{
    if(node.type==='text')return node.value;
    if(node.items.length===2)return PAIR_OPEN+'\n'+node.items.join('\n')+'\n'+PAIR_CLOSE;
    return node.items[0]||'';
  }).join('');
}
export function blocksInOrder(nodes){
  return nodes.flatMap(n=>n.type==='components'?n.items:[]);
}
function locate(nodes,index){
  let k=0;
  for(let ni=0;ni<nodes.length;ni++){
    if(nodes[ni].type!=='components')continue;
    for(let ci=0;ci<nodes[ni].items.length;ci++){
      if(k===index)return {ni,ci};
      k++;
    }
  }
  return null;
}
function compact(nodes){
  return nodes.filter(n=>n.type!=='components'||n.items.length>0);
}
export function moveBlock(markdown,from,to,side='after'){
  let nodes=readLayout(markdown);
  const fromLoc=locate(nodes,from),toLoc=locate(nodes,to);
  if(!fromLoc||!toLoc||from===to)return markdown;
  const item=nodes[fromLoc.ni].items[fromLoc.ci];
  nodes[fromLoc.ni].items.splice(fromLoc.ci,1);
  nodes=compact(nodes);
  const found=locate(nodes,to-(from<to?1:0));
  if(!found)return markdown;
  const destination=nodes[found.ni];
  if(side==='left'||side==='right'){
    if(destination.items.length===1){
      destination.items.splice(side==='left'?0:1,0,item);
    }else{
      // A third component always gets its own row, never overlaps the pair.
      nodes.splice(found.ni+(side==='right'?1:0),0,{type:'components',items:[item]});
    }
  }else{
    nodes.splice(found.ni+(side==='before'?0:1),0,{type:'components',items:[item]});
  }
  return serializeLayout(nodes);
}
export function appendBlock(markdown,input){
  const trimmed=String(markdown).replace(/\s*$/,'');
  return trimmed+'\n\n'+block(input)+'\n';
}
export function resizeBlock(markdown,index,width){
  const nodes=readLayout(markdown);
  const loc=locate(nodes,index);
  if(!loc)return markdown;
  const original=nodes[loc.ni].items[loc.ci];
  const size=Math.max(20,Math.min(100,Math.round(Number(width)/5)*5));
  nodes[loc.ni].items[loc.ci]=original.replace(/width="\d+%"/,'width="'+size+'%"');
  return serializeLayout(nodes);
}
export function blockWidth(blockText){
  const match=String(blockText).match(/width="(\d+)%"/);
  return match?Number(match[1]):100;
}
export function blockTheme(blockText){
  return String(blockText).includes('/light.gif')?'light':'dark';
}

export function resizeHeight(markdown,index,height){
  const nodes=readLayout(markdown);
  const loc=locate(nodes,index);
  if(!loc)return markdown;
  const px=Math.max(60,Math.min(480,Math.round(Number(height)/10)*10));
  const original=nodes[loc.ni].items[loc.ci];
  nodes[loc.ni].items[loc.ci]=original.replace(/(<img\b[^>]*?)\s+height="\d+"(?=[^>]*>)/,'$1')
    .replace(/(<img\b[^>]*?)(\s*\/>)/,'$1 height="'+px+'"$2');
  return serializeLayout(nodes);
}
export function blockHeight(blockText){
  const match=String(blockText).match(/<img\b[^>]*height="(\d+)"/);
  return match?Number(match[1]):null;
}
