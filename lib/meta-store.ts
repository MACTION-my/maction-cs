import {retryCandidates} from './meta-batch';
import {database} from './firebase-admin';
import {FieldValue} from 'firebase-admin/firestore';
import {now} from './crm';
import {type MetaEvent} from './meta-protocol';
const inbox=()=>database().collection('maction_meta_inbox');
export async function enqueueMeta(events:MetaEvent[]){for(const event of events)await database().runTransaction(async t=>{const ref=inbox().doc(event.leadId);if(!(await t.get(ref)).exists)t.create(ref,{lead_id:event.leadId,event,status:'pending',message:'',attempts:0,received_at:now(),updated_at:now()});});}
export async function inboxStatus(id:string){return (await inbox().doc(id).get()).data()?.status as string|undefined;}
export async function markMeta(id:string,status:string,message:string){await database().runTransaction(async t=>{const r=inbox().doc(id),data=(await t.get(r)).data();if(data?.status==='imported'&&status!=='imported')return;t.update(r,{status,message,attempts:FieldValue.increment(1),updated_at:now()});});}
export async function recentMeta(){return (await inbox().orderBy('received_at','desc').limit(50).get()).docs.map(d=>{const {event,...summary}=d.data();return summary;});}
export async function pendingMeta(){return retryCandidates((await inbox().where('status','==','pending').limit(1000).get()).docs.map(d=>d.data() as {event:MetaEvent;updated_at?:string}));}

export async function metaCounts(){const [imported,pending]=await Promise.all(['imported','pending'].map(status=>inbox().where('status','==',status).count().get()));return {imported:imported.data().count,pending:pending.data().count};}
