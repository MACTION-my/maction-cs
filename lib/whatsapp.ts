import {createHash} from 'node:crypto';
import {database} from './firebase-admin';
import {waPayload,waTemplateDraft} from './whatsapp-protocol';
const collection=()=>database().collection('maction_whatsapp_messages');
export function waConfig(){return {configured:!!process.env.WHATSAPP_TEST_TOKEN,mode:'test',phoneId:process.env.WHATSAPP_PHONE_ID||'',wabaId:process.env.WHATSAPP_WABA_ID||'',sender:process.env.WHATSAPP_SENDER||'',recipient:process.env.WHATSAPP_TEST_RECIPIENT||'',version:process.env.META_GRAPH_VERSION||'v26.0'};}
export async function waGraph(path:string,method='GET',body?:unknown){
 const c=waConfig();if(!c.configured)throw new Error('尚未配置服务器 WhatsApp Token');
 const r=await fetch(`https://graph.facebook.com/${c.version}/${path}`,{method,headers:{Authorization:`Bearer ${process.env.WHATSAPP_TEST_TOKEN}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000),cache:'no-store'});
 const p=await r.json();if(!r.ok||p.error){const code=p.error?.code;const reason=code===190?'Token 已过期，请在 Meta 重新授权':code===133010?'发送号码尚未完成 API 注册':code===131030?'接收号码尚未通过测试名单验证':code===132001?'模板不存在或尚未获批':`Meta 请求失败（HTTP ${r.status} / Code ${code||'未知'}）`;throw new Error(reason);}
 return p;
}
export async function waTemplates(){const c=waConfig();if(!/^\d+$/.test(c.wabaId))throw new Error('尚未配置 WhatsApp Business Account');return (await waGraph(`${c.wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`)).data||[];}
export async function waOverview(){const [messages,routes]=await Promise.all([collection().orderBy('createdAt','desc').limit(50).get(),database().collection('maction_whatsapp_routes').get()]);let templates:any[]=[],templateError='';try{templates=await waTemplates();}catch(e){templateError=(e as Error).message;}return {...waConfig(),templates,templateError,messages:messages.docs.map(d=>({id:d.id,...d.data()})),routes:routes.docs.map(d=>({courseId:d.id,...d.data()}))};}
export async function waSend(b:any,actor:string){
 const c=waConfig();if(!/^\d+$/.test(c.phoneId))throw new Error('尚未配置发送号码');
 const payload=waPayload(b,c.recipient);if(!/^[0-9a-f-]{36}$/.test(b.requestId||''))throw new Error('请求编号无效');
 const ref=collection().doc(b.requestId),fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 const accepted=await database().runTransaction(async t=>{const prior=await t.get(ref);if(prior.exists){if(prior.data()?.fingerprint!==fingerprint)throw new Error('同一请求不能更改内容');return false;}const throttle=database().doc('maction_whatsapp_control/send_rate');const rate=await t.get(throttle);const time=Date.now(),data=rate.data();const count=data?.minute===Math.floor(time/60000)?Number(data.count):0;if(count>=5)throw new Error('测试发送频率上限为每分钟 5 条');t.set(throttle,{minute:Math.floor(time/60000),count:count+1});t.create(ref,{direction:'outbound',mode:'test',to:payload.to,template:b.template,language:b.language,parameters:b.parameters||[],image:b.image||'',status:'sending',actor,createdAt:new Date().toISOString(),fingerprint});return true;});
 if(!accepted){const previous=(await ref.get()).data()!;if(previous.status==='failed_or_unknown')throw new Error(previous.error||'上次请求结果不明，请先核对发送记录');return {duplicate:true,...previous};}
 try{const result=await waGraph(`${c.phoneId}/messages`,'POST',payload);const messageId=result.messages?.[0]?.id;if(typeof messageId!=='string')throw new Error('Meta 未返回消息编号，请核对接收记录后再试');await ref.update({messageId,status:'accepted',acceptedAt:new Date().toISOString()});return {messageId,status:'accepted'};}
 catch(e){await ref.update({status:'failed_or_unknown',error:(e as Error).message});throw e;}
}
export async function waCreateTemplate(b:any,actor:string){const c=waConfig(),draft=waTemplateDraft(b);const result=await waGraph(`${c.wabaId}/message_templates`,'POST',draft);await database().collection('maction_audit').add({actor,action:'whatsapp.template.create',entityId:String(result.id||draft.name),at:new Date().toISOString(),template:draft.name});return result;}
export async function waWebhook(p:any){
 if(p?.object!=='whatsapp_business_account'||!Array.isArray(p.entry))throw new Error('Invalid WhatsApp event');const c=waConfig();
 for(const entry of p.entry){if(String(entry.id)!==c.wabaId)continue;for(const change of entry.changes||[]){const v=change.value;if(change.field!=='messages'||String(v?.metadata?.phone_number_id)!==c.phoneId)continue;
  for(const m of (v.messages||[]).slice(0,100)){if(typeof m.id!=='string'||typeof m.from!=='string')continue;const key=createHash('sha256').update(m.id).digest('hex');const ref=collection().doc(key);await database().runTransaction(async t=>{if((await t.get(ref)).exists)return;t.create(ref,{direction:'inbound',messageId:m.id,from:m.from,type:m.type||'unknown',text:String(m.text?.body||'').slice(0,4096),createdAt:new Date(Number(m.timestamp)*1000||Date.now()).toISOString(),status:'received'});});}
  for(const s of (v.statuses||[]).slice(0,100)){if(typeof s.id!=='string'||!['sent','delivered','read','failed'].includes(s.status))continue;const key=createHash('sha256').update(`${s.id}:${s.status}:${s.timestamp}`).digest('hex');await database().runTransaction(async t=>{const event=database().collection('maction_whatsapp_status').doc(key);if((await t.get(event)).exists)return;const matches=await t.get(collection().where('messageId','==',s.id).limit(1));const stamp=Number(s.timestamp)||0;t.create(event,{messageId:s.id,status:s.status,timestamp:stamp,receivedAt:new Date().toISOString()});for(const d of matches.docs){const old=d.data();const rank:Record<string,number>={accepted:0,sent:1,delivered:2,read:3,failed:4};if(stamp>=(old.statusTimestamp||0)&&(rank[s.status]>= (rank[old.status]??-1)))t.update(d.ref,{status:s.status,statusTimestamp:stamp,...(s.status==='failed'?{error:`Meta 发送失败（Code ${s.errors?.[0]?.code||'未知'}）`}:{})});}});}
 }}
}
