export function bindSearchGestures(root,{getScope,onChange,isBlocked=()=>false}){
 const controller=new AbortController(),options={signal:controller.signal};let start=null,suppressUntil=0;
 root.addEventListener('pointerdown',event=>{
  suppressUntil=0;
  if(event.button!==0||!event.isPrimary||isBlocked()||event.target.closest('input,textarea,select,dialog,[contenteditable]')){start=null;return;}
  start={id:event.pointerId,x:event.clientX,y:event.clientY,axis:null};
 },options);
 root.addEventListener('pointermove',event=>{
  if(!start||start.id!==event.pointerId)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;
  if(!start.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=10){if(Math.abs(dx)>Math.abs(dy)*1.3)start.axis='x';else if(Math.abs(dy)>Math.abs(dx)*1.3){start=null;return;}}
  if(start?.axis==='x'&&event.cancelable)event.preventDefault();
 },{...options,passive:false});
 root.addEventListener('pointerup',event=>{
  if(!start||start.id!==event.pointerId)return;const state=start;start=null;
  const dx=event.clientX-state.x,dy=event.clientY-state.y;if(state.axis!=='x'||Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.3||isBlocked())return;
  suppressUntil=Date.now()+600;event.preventDefault();const next=dx<0?'countdowns':'events';if(next!==getScope())onChange(next,true);
 },options);
 root.addEventListener('pointercancel',()=>{start=null;},options);
 root.addEventListener('click',event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},{...options,capture:true});
 root.addEventListener('keydown',event=>{if(!event.target.closest('.search-kind-tabs')||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=event.key==='ArrowRight'?'countdowns':'events';onChange(next,false);root.querySelector('[data-scope="'+next+'"]')?.focus();},options);
 return{destroy(){start=null;controller.abort();}};
}
