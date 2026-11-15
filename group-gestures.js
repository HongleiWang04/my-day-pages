// Delegated group gestures survive every home render. Scrolling stays native.
const reserved=new Set(['所有','今日','已归档','默认','全部']);
export function installGroupGestures({isEnabled,onOpen}){
 const controller=new AbortController(),signal=controller.signal;
 let timer=null,active=null,suppress=null;
 const groupAt=event=>{const node=event.target.closest?.('.home-tabs [data-action="group"][data-group]');return node&&!reserved.has(node.dataset.group)?node:null;};
 const cancel=()=>{clearTimeout(timer);timer=null;active=null;};
 const release=()=>{if(suppress)suppress.until=Date.now()+700;cancel();};
 const open=node=>{if(!node?.isConnected||!isEnabled())return;const now=Date.now();if(suppress?.node===node&&now<suppress.until)return;cancel();suppress={node,until:now+1200};onOpen(node.dataset.group,node);};
 document.addEventListener('pointerdown',event=>{
  cancel();suppress=null;const node=groupAt(event);
  if(!node||!isEnabled()||!event.isPrimary||event.button!==0||!['touch','pen'].includes(event.pointerType))return;
  active={node,id:event.pointerId,x:event.clientX,y:event.clientY};
  timer=setTimeout(()=>{const node=active?.node;cancel();open(node);},550);
 },{signal,capture:true});
 document.addEventListener('pointermove',event=>{if(active&&event.pointerId===active.id&&Math.hypot(event.clientX-active.x,event.clientY-active.y)>=10)cancel();},{signal,capture:true,passive:true});
 document.addEventListener('pointerup',release,{signal,capture:true});
 document.addEventListener('touchend',release,{signal,capture:true,passive:true});
 document.addEventListener('pointercancel',cancel,{signal,capture:true});
 document.addEventListener('scroll',cancel,{signal,capture:true,passive:true});
 document.addEventListener('wheel',cancel,{signal,passive:true});
 document.addEventListener('contextmenu',event=>{const node=groupAt(event);if(!node)return;if(suppress?.node===node&&Date.now()<suppress.until){event.preventDefault();return;}if(!isEnabled())return;event.preventDefault();suppress=null;open(node);},{signal,capture:true});
 document.addEventListener('click',event=>{const node=groupAt(event);if(event.detail!==0&&suppress&&Date.now()<suppress.until){event.preventDefault();event.stopImmediatePropagation();}},{signal,capture:true});
 document.addEventListener('keydown',event=>{const node=groupAt(event);if(node&&isEnabled()&&(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10')){event.preventDefault();suppress=null;open(node);}},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},{signal});
 window.addEventListener('pagehide',cancel,{signal});
 return{destroy(){cancel();controller.abort();}};
}
