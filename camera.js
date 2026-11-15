export function createCamera({getVideo,onStatus}){
 let stream=null,request=0;
 function stop(){request++;stream?.getTracks().forEach(track=>track.stop());stream=null;const video=getVideo();if(video)video.srcObject=null;}
 async function start(){
  stop();const current=++request;onStatus('loading','正在开启相机…');
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('unavailable');
   const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
   const video=getVideo();if(current!==request||!video){next.getTracks().forEach(track=>track.stop());return;}
   stream=next;video.srcObject=stream;await video.play();
   if(current!==request)return;
   onStatus('ready','');
  }catch(error){
   if(current!==request)return;
   stream?.getTracks().forEach(track=>track.stop());stream=null;
   const video=getVideo();if(video)video.srcObject=null;
   onStatus('error',['NotAllowedError','SecurityError'].includes(error.name)?'未开启相机权限，可使用系统相机或选择照片。':error.name==='NotFoundError'?'未检测到相机，可选择照片记录。':'相机暂时无法打开，可使用系统相机或选择照片。');
  }
 }
 function capture(){
  const video=getVideo();if(!stream||!video?.videoWidth||video.readyState<2)return null;
  const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.85);
 }
 return{start,stop,capture};
}
