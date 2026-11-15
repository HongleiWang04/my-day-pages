// Recognize homepage gestures even when the gesture begins on a card button.
// Only a completed drag consumes the following click; ordinary taps stay intact.
export function installHomeGestures({isHome,isBlocked,onLeft,onRight,onPull,onFeedback=()=>{}}){
 let active=null,suppressUntil=0;
 const clear=()=>{active=null;onFeedback(null);};
 const point=(list,id)=>Array.from(list).find(t=>t.identifier===id);
 const start=event=>{
  suppressUntil=0;
  if(!isHome()||isBlocked()||event.touches.length!==1||event.target.closest('input,textarea,select,[contenteditable],dialog,.bottom-nav,.group-bar,.home-tabs')){clear();return;}
  const touch=event.touches[0];active={id:touch.identifier,x:touch.clientX,y:touch.clientY,top:window.scrollY,axis:null};
 };
 const move=event=>{
  if(!active)return;
  if(!isHome()||isBlocked()||event.touches.length!==1){clear();return;}
  const touch=point(event.touches,active.id);if(!touch){clear();return;}
  const dx=touch.clientX-active.x,dy=touch.clientY-active.y;
  if(!active.axis){
   if(Math.max(Math.abs(dx),Math.abs(dy))<10)return;
   if(Math.abs(dx)>Math.abs(dy)*1.3)active.axis='horizontal';
   else if(dy>0&&active.top<=2&&Math.abs(dy)>Math.abs(dx)*1.3)active.axis='pull';
   else if(Math.abs(dy)>Math.abs(dx)*1.3){clear();return;}
  }
  if(!active.axis)return;
  if(event.cancelable)event.preventDefault();
  onFeedback(active.axis==='pull'?{kind:'camera',progress:Math.max(0,Math.min(1,dy/80))}:{kind:dx<0?'left':'right',progress:Math.min(1,Math.abs(dx)/64)});
 };
 const end=event=>{
  if(!active)return;
  const state=active,touch=point(event.changedTouches,state.id);clear();
  if(!touch||!isHome()||isBlocked())return;
  const dx=touch.clientX-state.x,dy=touch.clientY-state.y;
  if(state.axis){suppressUntil=Date.now()+600;if(event.cancelable)event.preventDefault();}
  if(state.axis==='horizontal'&&Math.abs(dx)>=64&&Math.abs(dx)>Math.abs(dy)*1.3){if(dx<0)onLeft();else onRight();}
  else if(state.axis==='pull'&&dy>=80&&state.top<=2&&dy>Math.abs(dx)*1.3)onPull();
 };
 const click=event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}};
 const mouseEvent=event=>({target:event.target,touches:[{identifier:'mouse',clientX:event.clientX,clientY:event.clientY}],changedTouches:[{identifier:'mouse',clientX:event.clientX,clientY:event.clientY}],cancelable:event.cancelable,preventDefault:()=>event.preventDefault()});
 const mouseStart=event=>{if(event.pointerType==='mouse'&&event.button===0)start(mouseEvent(event));};
 const mouseMove=event=>{if(event.pointerType==='mouse'&&active?.id==='mouse')move(mouseEvent(event));};
 const mouseEnd=event=>{if(event.pointerType==='mouse'&&active?.id==='mouse')end(mouseEvent(event));};
 const mouseCancel=event=>{if(event.pointerType==='mouse')clear();};
 document.addEventListener('touchstart',start,{passive:true});
 document.addEventListener('touchmove',move,{passive:false});
 document.addEventListener('touchend',end,{passive:false});
 document.addEventListener('touchcancel',clear,{passive:true});
 document.addEventListener('click',click,true);
 document.addEventListener('pointerdown',mouseStart);
 document.addEventListener('pointermove',mouseMove);
 document.addEventListener('pointerup',mouseEnd);
 document.addEventListener('pointercancel',mouseCancel);
 return{reset:clear,destroy(){clear();document.removeEventListener('touchstart',start);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',end);document.removeEventListener('touchcancel',clear);document.removeEventListener('click',click,true);document.removeEventListener('pointerdown',mouseStart);document.removeEventListener('pointermove',mouseMove);document.removeEventListener('pointerup',mouseEnd);document.removeEventListener('pointercancel',mouseCancel);}};
}
