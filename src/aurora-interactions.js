/* Aurora interaction highlights: event-driven, no repeating animation loop. */
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=window.matchMedia('(hover:hover) and (pointer:fine)');

function initializeLights(){
  if (reducedMotion.matches || !finePointer.matches) return;
  const hero=document.querySelector('.hero');
  const targets='.component-card,.slide,.compose-panel,.compose-output,.pane,.contribute-card';
  let pending=false;
  let nextEvent=null;
  document.addEventListener('pointermove',event=>{
    nextEvent={x:event.clientX,y:event.clientY,target:event.target};
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{
      pending=false;
      if(!nextEvent)return;
      const {x,y,target}=nextEvent;
      nextEvent=null;
      if(hero){
        const rect=hero.getBoundingClientRect();
        if(y>=rect.top&&y<=rect.bottom&&x>=rect.left&&x<=rect.right){
          hero.style.setProperty('--hx',((x-rect.left)/rect.width*100).toFixed(1)+'%');
          hero.style.setProperty('--hy',((y-rect.top)/rect.height*100).toFixed(1)+'%');
        }
      }
      const surface=target instanceof Element?target.closest(targets):null;
      if(surface){
        const rect=surface.getBoundingClientRect();
        if(rect.width>0&&rect.height>0){
          surface.style.setProperty('--spot-x',((x-rect.left)/rect.width*100).toFixed(1)+'%');
          surface.style.setProperty('--spot-y',((y-rect.top)/rect.height*100).toFixed(1)+'%');
        }
      }
    });
  },{passive:true});
  // A short, user-triggered energy pulse replaces fake perpetual loading spinners.
  document.addEventListener('click',event=>{
    const control=event.target instanceof Element?
      event.target.closest('button,.btn,.studio-actions .btn'):null;
    if(!control||typeof control.animate!=='function')return;
    control.animate(
      [{filter:'brightness(1)'},{filter:'brightness(1.16)'},{filter:'brightness(1)'}],
      {duration:460,easing:'cubic-bezier(.22,1,.36,1)',iterations:1}
    );
  });
}
initializeLights();
