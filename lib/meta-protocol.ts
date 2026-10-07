export type MetaEvent = {leadId:string;pageId:string;formId:string;adId:string;createdTime:number};
export async function validMetaSignature(raw:string, signature:string|null, secret:string){
  if(!secret||!signature||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
  const bytes=new Uint8Array(signature.slice(7).match(/../g)!.map(x=>parseInt(x,16)));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(raw));
}
export function metaEvents(payload:any):MetaEvent[]{
  if(payload?.object!=='page'||!Array.isArray(payload.entry))throw new Error('Expected Page webhook');
  const events:MetaEvent[]=[];
  for(const entry of payload.entry){for(const change of entry.changes||[]){
    if(change.field!=='leadgen')continue;
    const v=change.value;
    if(!v||!/^\d+$/.test(String(v.leadgen_id||''))||!/^\d+$/.test(String(v.page_id||entry.id||'')))throw new Error('Invalid leadgen event');
    events.push({leadId:String(v.leadgen_id),pageId:String(v.page_id||entry.id),formId:String(v.form_id||''),adId:String(v.ad_id||''),createdTime:Number(v.created_time)||0});
  }}
  if(events.length>100)throw new Error('Batch too large');
  return events;
}
export function metaContact(fields:{name:string;values:string[]}[]){
  const get=(key:string)=>String(fields.find(f=>f.name===key)?.values?.[0]||'').trim();
  return {name:get('full_name')||[get('first_name'),get('last_name')].filter(Boolean).join(' ')||'Meta 客户',phone:get('phone_number').replace(/[\s()-]/g,''),company:get('company_name')};
}
