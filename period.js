import {addDays,dayKey,daysBetween,monthDays,pad,parseDay,uid} from './core.js?v=20261118-ai-record-1';

const LEVELS={flow:['少量','中等','大量'],pain:['轻微','中度','严重']};
const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&dayKey(parseDay(value))===value;
const sortedCycles=period=>[...(period.cycles||[])].filter(c=>isDate(c.start)).sort((a,b)=>a.start.localeCompare(b.start));
const settings=period=>({length:Math.max(1,Math.trunc(Number(period.settings?.length)||5)),cycle:Math.max(1,Math.trunc(Number(period.settings?.cycle)||28))});
const minimum=(...dates)=>dates.filter(Boolean).sort()[0];

function actualEnd(cycle,cycles,today){
 const index=cycles.indexOf(cycle),next=cycles[index+1];
 return minimum(cycle.end||today,today,next?addDays(next.start,-1):'');
}

function monthAnchor(period,monthDate){
 const month=parseDay(String(monthDate).slice(0,7)+'-01');
 const end=`${month.getFullYear()}-${pad(month.getMonth()+1)}-${pad(monthDays(month.getFullYear(),month.getMonth()))}`;
 const cycles=sortedCycles(period);
 return cycles.filter(c=>c.start<=end).at(-1)||cycles[0]||null;
}

/** Degrees always fill from the first mark, including older sparse mark arrays. */
export function dayMarks(day,key){
 if(!day)return[];
 if(Array.isArray(day[key+'Marks'])){
  const highest=Math.max(0,...day[key+'Marks'].filter(v=>Number.isInteger(v)&&v>=1&&v<=3));
  return Array.from({length:highest},(_,i)=>i+1);
 }
 const index=LEVELS[key]?.indexOf(day[key])??-1;
 return index<0?[]:Array.from({length:index+1},(_,i)=>i+1);
}

export function hasDayRecord(day){
 if(!day||typeof day!=='object')return false;
 return dayMarks(day,'flow').length>0||dayMarks(day,'pain').length>0||
  (Array.isArray(day.symptoms)&&day.symptoms.length>0)||Boolean(typeof day.note==='string'&&day.note.trim());
}

/** The month uses its latest known start, matching the reference calendar when viewing history. */
export function dayInfo(period,date,monthDate=date,today=dayKey()){
 const cycles=sortedCycles(period),configuration=settings(period),anchor=monthAnchor(period,monthDate);
 const actualCycle=cycles.filter(c=>c.start<=date&&date<=actualEnd(c,cycles,today)).at(-1)||null;
 const actual=Boolean(actualCycle);
 let predicted=false,fertile=false,ovulationDay=false,dayNumber=0,summary='尚无经期记录';
 let cycle=actualCycle,action=null;
 if(actual){
  dayNumber=daysBetween(date,actualCycle.start)+1;
  summary=`经期第${dayNumber}天`;
 }else if(anchor){
  const offset=daysBetween(date,anchor.start),cycleLength=configuration.cycle;
  const periodIndex=Math.floor(offset/cycleLength),periodOffset=offset-periodIndex*cycleLength;
  const openForecast=!anchor.end&&date>today&&date>=anchor.start&&daysBetween(date,anchor.start)<configuration.length;
  const nextForecast=periodIndex>=1&&periodOffset<configuration.length;
  predicted=openForecast||nextForecast;
  // Fertile windows repeat in both directions around the month anchor.
  const firstWindow=cycleLength-19,windowIndex=Math.floor((offset-firstWindow)/cycleLength);
  const windowStart=firstWindow+windowIndex*cycleLength,windowOffset=offset-windowStart;
  fertile=!predicted&&windowOffset>=0&&windowOffset<=9;
  ovulationDay=fertile&&windowOffset===5;
  if(predicted){
   dayNumber=openForecast?daysBetween(date,anchor.start)+1:periodOffset+1;
   summary=`预测经期第${dayNumber}天`;
  }else if(fertile){
   dayNumber=windowOffset+1;
   summary=`排卵期第${dayNumber}天`;
  }else{
   summary=`距离排卵期${windowStart+cycleLength-offset}天`;
  }
 }
 if(date<=today){
  if(actualCycle){
   action=date===actualCycle.start?'cancel-cycle':actualCycle.end&&date===actualCycle.end?'undo-end':'end';
  }else{
   // A cancelled end date can be restored without starting a second overlapping cycle.
   const extendable=cycles.filter(c=>c.end&&c.end<date&&date>=c.start&&daysBetween(date,c.start)<configuration.length&&
    !cycles.some(next=>next.start>c.start&&next.start<=date)).at(-1);
   if(extendable){cycle=extendable;action='end';}
   else action='start';
  }
 }
 return{cycle,actual,predicted,fertile,ovulationDay,hasRecord:hasDayRecord(period.days?.[date]),dayNumber,summary,action};
}

export function historyItems(period,today=dayKey()){
 const cycles=sortedCycles(period).filter(c=>c.start<=today);
 return cycles.map((cycle,index)=>{
  const next=cycles[index+1],rangeEnd=next?addDays(next.start,-1):today;
  const actualThrough=minimum(cycle.end||today,rangeEnd,today);
  const duration=Math.max(0,daysBetween(actualThrough,cycle.start)+1);
  const cycleLength=Math.max(0,daysBetween(rangeEnd,cycle.start)+1);
  const days=Array.from({length:cycleLength},(_,i)=>{const date=addDays(cycle.start,i);return{date,period:i<duration,hasRecord:hasDayRecord(period.days?.[date])};});
  return{id:cycle.id,start:cycle.start,end:cycle.end||'',rangeEnd,duration,cycleLength,ongoing:!cycle.end,days};
 }).reverse();
}

export function summaryStats(period,today=dayKey()){
 const cycles=sortedCycles(period).filter(c=>c.start<=today);
 const completed=cycles.filter(c=>c.end&&c.end<=today);
 const durations=completed.map(c=>daysBetween(c.end,c.start)+1).filter(n=>n>0);
 const intervals=cycles.slice(1).map((c,i)=>daysBetween(c.start,cycles[i].start)).filter(n=>n>0);
 const mean=values=>values.length?Math.round(values.reduce((sum,n)=>sum+n,0)/values.length*10)/10:null;
 return{completed:completed.length,averageDuration:mean(durations),averageCycle:mean(intervals)};
}

export function startPeriod(period,date,today=dayKey()){
 if(!isDate(date)||date>today)throw Error('经期开始日期不能晚于今天');
 period.cycles||=[];period.days||={};
 const cycles=sortedCycles(period),inside=cycles.find(c=>c.start<=date&&date<=actualEnd(c,cycles,today));
 if(inside)return inside;
 const configuration=settings(period),next=cycles.find(c=>c.start>date),open=cycles.find(c=>!c.end&&c.start>date&&daysBetween(c.start,date)<=configuration.length);
 if(open){
  const previous=cycles.filter(c=>c.start<open.start&&c!==open).at(-1);
  if(previous&&actualEnd(previous,cycles,today)>=date)throw Error('该日期已在其他经期内');
  open.start=date;return open;
 }
 const cycle={id:uid(),start:date,end:next?minimum(addDays(date,configuration.length-1),addDays(next.start,-1),today):''};
 period.cycles.push(cycle);return cycle;
}

export function endPeriod(period,date,today=dayKey()){
 if(!isDate(date)||date>today)throw Error('经期结束日期不能晚于今天');
 const info=dayInfo(period,date,date,today);
 if(!info.cycle||!['end','undo-end'].includes(info.action)||date<=info.cycle.start)throw Error('请从经期开始的第二天起选择结束日期');
 info.cycle.end=date;return info.cycle;
}

export function cancelPeriodCycle(period,id){
 const index=(period.cycles||[]).findIndex(c=>c.id===id);if(index<0)return null;
 return period.cycles.splice(index,1)[0];
}

/** “取消今日” removes that last actual day; it does not restore an open-ended period. */
export function undoPeriodEnd(period,id){
 const cycle=(period.cycles||[]).find(c=>c.id===id);if(!cycle?.end)return null;
 if(cycle.end<=cycle.start)return cancelPeriodCycle(period,id);
 cycle.end=addDays(cycle.end,-1);return cycle;
}

export function setDayLevel(period,date,key,value){
 const levels=LEVELS[key];if(!levels||!isDate(date))throw Error('记录选项无效');
 const level=Number.isInteger(value)?value:levels.indexOf(value)+1;
 if(level<1||level>3)throw Error('请选择有效档位');
 period.days||={};
 const day=period.days[date]||{flow:'无',pain:'无',symptoms:[],note:''};
 const current=dayMarks(day,key).at(-1)||0;
 const marks=current===level?[]:Array.from({length:level},(_,i)=>i+1);
 day[key+'Marks']=marks;day[key]=marks.length?levels[marks.at(-1)-1]:'无';
 if(hasDayRecord(day))period.days[date]=day;else delete period.days[date];
 return period.days[date]||null;
}
