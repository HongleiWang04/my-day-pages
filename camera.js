export function createCamera({getVideo,onStatus,onNotice=()=>{}}){
 let stream=null,request=0,facingMode='environment',deviceId='',devices=[],busy=false;
 const details=()=>({facingMode,canSwitch:devices.length!==1});
 function stop(){request++;stream?.getTracks().forEach(track=>track.stop());stream=null;const video=getVideo();if(video)video.srcObject=null;}
 async function open({mode=facingMode,exact=false,targetDevice}={}){
  stop();const current=++request;busy=true;onStatus('loading','正在开启相机…',details());
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('unavailable');
   const constraints=targetDevice?{deviceId:{exact:targetDevice}}:{facingMode:exact?{exact:mode}:{ideal:mode}};
   const next=await navigator.mediaDevices.getUserMedia({video:{...constraints,width:{ideal:1920},height:{ideal:1080}},audio:false});
   const video=getVideo();if(current!==request||!video){next.getTracks().forEach(track=>track.stop());return{state:'cancelled',request:current};}
   stream=next;video.srcObject=stream;await video.play();
   if(current!==request)return{state:'cancelled',request:current};
   const settings=stream.getVideoTracks()[0]?.getSettings?.()||{};
   facingMode=settings.facingMode||mode;deviceId=settings.deviceId||'';
   try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(device=>device.kind==='videoinput');}catch{devices=[];}
   if(current!==request)return{state:'cancelled',request:current};
   busy=false;video.dataset.facing=facingMode;onStatus('ready','',details());return{state:'ready',request:current};
  }catch(error){
   if(current!==request)return{state:'cancelled',request:current};
   busy=false;
   stream?.getTracks().forEach(track=>track.stop());stream=null;
   const video=getVideo();if(video)video.srcObject=null;
   onStatus('error',['NotAllowedError','SecurityError'].includes(error.name)?'未开启相机权限，可使用系统相机或选择照片。':error.name==='NotFoundError'?'未检测到相机，可选择照片记录。':'相机暂时无法打开，可使用系统相机或选择照片。',details());return{state:'error',request:current};
  }
 }
 async function start(){return(await open()).state==='ready';}
 async function flip(){
  if(busy||!stream)return false;
  if(devices.length===1){onNotice('当前设备只有一个镜头');return false;}
  const previous=facingMode,previousDevice=deviceId,settings=stream.getVideoTracks()[0]?.getSettings?.()||{};
  const target=previous==='environment'?'user':'environment';
  const nextDevice=!settings.facingMode&&devices.length>1?devices[(Math.max(0,devices.findIndex(device=>device.deviceId===deviceId))+1)%devices.length].deviceId:null;
  const result=await open({mode:target,exact:true,...(nextDevice?{targetDevice:nextDevice}:{})});
  if(result.state==='ready')return true;
  if(result.state==='error'&&request===result.request&&getVideo()){
   const restored=await open({mode:previous,...(previousDevice?{targetDevice:previousDevice}:{})});
   if(restored.state==='ready')onNotice('未能切换镜头，已恢复原镜头');
  }
  return false;
 }
 function capture(){
  const video=getVideo();if(!stream||!video?.videoWidth||video.readyState<2)return null;
  const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85);
 }
 return{start,stop,flip,capture};
}
