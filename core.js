export const pad=n=>String(n).padStart(2,'0');
export function dayKey(value=new Date()){const d=new Date(value);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
export const parseDay=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12);};
export const addDays=(s,n)=>{const d=parseDay(s);d.setDate(d.getDate()+n);return dayKey(d);};
export const daysBetween=(a,b)=>Math.round((Date.UTC(...a.split('-').map((v,i)=>i===1?+v-1:+v))-Date.UTC(...b.split('-').map((v,i)=>i===1?+v-1:+v)))/86400000);
export function weekStart(s){const d=parseDay(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return dayKey(d);}
export function monthDays(y,m){return new Date(y,m+1,0).getDate();}
export function rangeFor(period,date,custom=7,start){const d=parseDay(date),y=d.getFullYear(),m=d.getMonth();switch(period){case'day':return [date,date];case'week':{const s=weekStart(date);return[s,addDays(s,6)];}case'month':return[`${y}-${pad(m+1)}-01`,`${y}-${pad(m+1)}-${monthDays(y,m)}`];case'quarter':{const q=Math.floor(m/3)*3;return[`${y}-${pad(q+1)}-01`,`${y}-${pad(q+3)}-${monthDays(y,q+2)}`];}case'year':return[`${y}-01-01`,`${y}-12-31`];case'custom':{const anchor=start||date;const n=Math.max(1,custom),offset=Math.floor(daysBetween(date,anchor)/n)*n;const s=addDays(anchor,offset);return[s,addDays(s,n-1)];}default:return['0000-01-01','9999-12-31'];}}
export function recordsIn(records,eventId,range){return records.filter(r=>r.eventId===eventId&&r.date.slice(0,10)>=range[0]&&r.date.slice(0,10)<=range[1]);}
export function stats(records){return{count:records.length,total:Math.round(records.reduce((n,r)=>n+Number(r.value||0),0)*100)/100,days:new Set(records.map(r=>r.date.slice(0,10))).size};}
export function countdownDate(c,today=dayKey()){if(!c.repeat)return c.date;const d=parseDay(c.date);let y=parseDay(today).getFullYear();const dateForYear=year=>`${year}-${pad(d.getMonth()+1)}-${pad(Math.min(d.getDate(),monthDays(year,d.getMonth())))}`;let next=dateForYear(y);if(next<today)next=dateForYear(++y);return next;}
export const countdownDays=(c,today=dayKey())=>daysBetween(countdownDate(c,today),today);
export function sortCountdowns(countdowns,today=dayKey()){
 return countdowns.map((item,index)=>({item,index,days:countdownDays(item,today),pinned:item.pinned===true,pinnedAt:Number.isFinite(item.pinnedAt)?item.pinnedAt:0}))
  .sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(a.pinned&&b.pinned?b.pinnedAt-a.pinnedAt:0)||Number(a.days<0)-Number(b.days<0)||Math.abs(a.days)-Math.abs(b.days)||a.index-b.index)
  .map(entry=>entry.item);
}
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function seedData(today=dayKey()){
 const events=[{id:'tennis',name:'网球',icon:'tennis',color:'#8b9e71',type:'count',unit:'次',reset:'month',quick:true,note:'去球场，让身体和心情一起舒展。'},{id:'fitness',name:'健身',icon:'fitness',color:'#a494b6',type:'duration',unit:'分钟',reset:'week',quick:false,note:'专注每一次呼吸，感受一点点的进步。'},{id:'swim',name:'游泳',icon:'swim',color:'#7d9fad',type:'count',unit:'次',reset:'month',quick:true,note:'潜入水中，给思绪放个假。'}].map(e=>({...e,startDate:addDays(today,-30),endDate:'',checkmark:false,archived:false,reminder:false,reminderDays:[1,3,5],reminderTime:'19:00',customDays:7,group:'默认'}));
 const records=[];for(const [eventId,offsets,value] of [['tennis',[0,3,7,10],1],['fitness',[0,2,5,7,9,12],45],['swim',[1,4,9],1]])for(const n of offsets)records.push({id:uid(),eventId,date:`${addDays(today,-n)}T${eventId==='fitness'?'19:30':'09:00'}`,value,note:''});
 const year=parseDay(today).getFullYear();return{version:1,demo:true,events,records,countdowns:[{id:uid(),title:'新年',date:`${year+1}-01-01`,repeat:true,color:'#e8ecdf',style:'simple',note:'新的开始，慢慢来。',image:''}],memories:[],period:{cycles:[],days:{},settings:{length:5,cycle:28,flow:true,pain:true,sex:true,symptoms:true,startReminder:false,recordReminder:false}},groups:['默认']};
}
export function emptyData(){const d=seedData();return{...d,demo:false,events:[],records:[],countdowns:[]};}
export function validateData(d){
 const fail=()=>{throw Error('备份数据格式有误，未导入任何内容');};
 const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(v);
 const text=(v,max=5000)=>typeof v==='string'&&v.length<=max;
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&dayKey(parseDay(v))===v;
 const datetime=v=>typeof v==='string'&&date(v.slice(0,10))&&/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(v);
 const color=v=>/^#[0-9a-f]{6}$/i.test(v);
 const image=v=>typeof v==='string'&&/^data:image\/(jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=\s]+$/.test(v);
 if(!d||d.version!==1||!Array.isArray(d.events)||!Array.isArray(d.records)||!Array.isArray(d.countdowns)||!Array.isArray(d.memories)||!d.period||!Array.isArray(d.period.cycles)||!d.period.days||Array.isArray(d.period.days)||typeof d.period.days!=='object'||!d.period.settings)fail();
 const ids=new Set(),allIds=new Set();const unique=v=>{if(!id(v)||allIds.has(v))fail();allIds.add(v);};
 for(const e of d.events){unique(e.id);if(!text(e.name,30)||!e.name.trim()||!text(e.icon,50)||!text(e.note??'',2000)||!text(e.unit??'',10)||!['count','duration','value'].includes(e.type)||!color(e.color)||!date(e.startDate)||(e.endDate&&(!date(e.endDate)||e.endDate<e.startDate))||!['none','day','week','month','quarter','year','custom'].includes(e.reset)||!Number.isInteger(e.customDays)||e.customDays<1||e.customDays>3660||!Array.isArray(e.reminderDays)||e.reminderDays.some(v=>!Number.isInteger(v)||v<1||v>7)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.reminderTime))fail();ids.add(e.id);}
 for(const r of d.records){unique(r.id);if(!ids.has(r.eventId)||!Number.isFinite(r.value)||r.value<=0||r.value>1e9||!datetime(r.date)||!text(r.note??'',2000)||(r.photos!==undefined&&(!Array.isArray(r.photos)||r.photos.length>9||r.photos.some(p=>!image(p)))))fail();}
 for(const c of d.countdowns){unique(c.id);if(!text(c.title,40)||!date(c.date)||!color(c.color)||!['simple','outline','color'].includes(c.style)||!text(c.note??'',1000)||(c.image&&!image(c.image))||
  (c.icon!==undefined&&!text(c.icon,50))||
  (c.time!==undefined&&(typeof c.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(c.time)))||
  (c.reminder!==undefined&&!['none','on-day','day-before'].includes(c.reminder))||
  (c.pinned!==undefined&&typeof c.pinned!=='boolean')||
  (c.pinnedAt!==undefined&&(!Number.isFinite(c.pinnedAt)||c.pinnedAt<0)))fail();}
 for(const m of d.memories){unique(m.id);if(!datetime(m.date)||!text(m.text)||!Array.isArray(m.photos)||m.photos.length>9||m.photos.some(p=>!image(p)))fail();}
 for(const c of d.period.cycles){unique(c.id);if(!date(c.start)||(c.end&&(!date(c.end)||c.end<c.start)))fail();}
 for(const [key,v]of Object.entries(d.period.days)){if(!date(key)||!v||!text(v.note??'',2000)||!Array.isArray(v.symptoms)||v.symptoms.some(x=>!text(x,50))||!text(v.flow??'',30)||!text(v.pain??'',30)||!text(v.sex??'',30))fail();}
 const s=d.period.settings;if(!Number.isInteger(s.length)||s.length<1||s.length>30||!Number.isInteger(s.cycle)||s.cycle<15||s.cycle>120||s.cycle<=s.length)fail();
 if(d.brand&&(!text(d.brand.text,30)||!d.brand.text.trim()||!['rounded','system','serif','mono'].includes(d.brand.font)||!color(d.brand.color)))fail();
 if(d.groups&&(!Array.isArray(d.groups)||d.groups.some(g=>!text(g,20))))fail();
 return d;
}
