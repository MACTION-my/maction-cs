import type {MetaEvent} from './meta-protocol';
// Limit parallel Meta calls while draining every persisted webhook event.
export async function processMetaBatch(events:MetaEvent[],process:(event:MetaEvent)=>Promise<void>){
 let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,events.length)},async()=>{
  while(cursor<events.length){const event=events[cursor++];await process(event);}
 }));
}
export function retryCandidates<T extends {event:MetaEvent;updated_at?:string}>(rows:T[]){
 return [...rows].sort((a,b)=>(a.updated_at||'').localeCompare(b.updated_at||'')).slice(0,5).map(r=>r.event);
}
