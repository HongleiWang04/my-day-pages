// One pending edit across the whole list; scrolling or leaving cancels it.
let suppressPinClickUntil=0;
export function bindCountdownCards(root,{onOpen,onPin}){
 const controller=new AbortController(),options={signal:controller.signal};
 let holdTimer,openTimer,origin=null,moved=false,lastTap=null;
 const cardAt=event=>{const c=event.target.closest?.('[data-countdown-id]');return c&&root.contains(c)?c:null;};
 const clearHold=()=>{clearTimeout(holdTimer);origin=null;};
 const clearOpen=()=>{clearTimeout(openTimer);lastTap=null;};
 const cancel=()=>{clearHold();clearOpen();};
 const pin=card=>{cancel();suppressPinClickUntil=Date.now()+700;onPin(card.dataset.countdownId);};
 document.addEventListener('pointerdown',event=>{
  const card=cardAt(event);clearTimeout(openTimer);clearHold();
  if(!card){clearOpen();return;}
  if(lastTap?.card!==card)clearOpen();
  if(!event.isPrimary||event.button!==0)return;
  suppressPinClickUntil=0;moved=false;origin={x:event.clientX,y:event.clientY};
  holdTimer=setTimeout(()=>{if(card.isConnected&&!moved)pin(card);},550);
 },{...options,capture:true});
 document.addEventListener('pointermove',event=>{if(origin&&Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>10){moved=true;cancel();}},options);
 document.addEventListener('pointerup',clearHold,options);
 document.addEventListener('pointercancel',()=>{moved=true;cancel();},options);
 document.addEventListener('scroll',cancel,{...options,capture:true,passive:true});
 document.addEventListener('wheel',cancel,{...options,passive:true});
 root.addEventListener('click',event=>{
  const card=cardAt(event);if(!card){clearOpen();return;}
  if(event.detail===0){clearOpen();onOpen(card.dataset.countdownId);return;}
  if(moved||Date.now()<suppressPinClickUntil){event.preventDefault();return;}
  const now=Date.now();clearTimeout(openTimer);
  if(lastTap?.card===card&&now-lastTap.time<360){event.preventDefault();pin(card);return;}
  lastTap={card,time:now};openTimer=setTimeout(()=>{lastTap=null;if(card.isConnected)onOpen(card.dataset.countdownId);},360);
 },options);
 root.addEventListener('dblclick',event=>{const card=cardAt(event);if(card){event.preventDefault();if(Date.now()>=suppressPinClickUntil)pin(card);}},options);
 root.addEventListener('contextmenu',event=>{const card=cardAt(event);if(card){event.preventDefault();if(Date.now()>=suppressPinClickUntil)pin(card);}},options);
 root.addEventListener('keydown',event=>{const card=cardAt(event);if(card&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){event.preventDefault();pin(card);}},options);
 return{destroy(){cancel();controller.abort();}};
}
