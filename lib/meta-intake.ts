import {enqueueMeta,inboxStatus,markMeta} from './meta-store';
export {enqueueMeta} from './meta-store';
import {adsConfig} from './ads-store';
import {readState,saveState} from './store';
import {activity,now,ownerFor,sessionFor,uid,type Lead} from './crm';
import {metaContact,metaAnswers,type MetaEvent} from './meta-protocol';
export function metaConfig(){const e=process.env;let tokens:Record<string,string>={};try{tokens=JSON.parse(e.META_PAGE_TOKENS||'{}');}catch{}return {secret:e.META_APP_SECRET||'',tokens,version:e.META_GRAPH_VERSION||''};}
async function graph(id:string,fields:string,token:string,version:string){
  if(!/^\d+$/.test(id)||!/^v\d+\.\d+$/.test(version))throw new Error('Meta ID 或 API 版本未配置');
  const url=new URL(`https://graph.facebook.com/${version}/${id}`);url.searchParams.set('fields',fields);
  const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
  const p=await r.json() as any;
  if(!r.ok||p.error)throw new Error(`Meta 读取失败（HTTP ${r.status} / Code ${p.error?.code||'未知'}）；检查对应 Page 或广告账户权限、Token 后重试`);
  return p;
}
const mark=markMeta;
export async function processMeta(e:MetaEvent){
  if(await inboxStatus(e.leadId)==='imported')return;
  try{
    const {secret,tokens,version}=metaConfig();const token=tokens[e.pageId];if(!secret||!token||!version)throw new Error('尚未配置此 Page 的 Meta 授权');
    const externalId='meta:'+e.leadId;
    let snapshot=await readState();
    if(snapshot.state.leads.some(l=>l.externalId===externalId||l.metaLeadIds?.includes(e.leadId))){await mark(e.leadId,'imported','重复通知已去重');return;}
    const p=await graph(e.leadId,'id,created_time,field_data,ad_id,form_id',token,version);
    if(String(p.id)!==e.leadId||!Array.isArray(p.field_data))throw new Error('Meta Lead 返回资料不完整');
    const adId=String(p.ad_id||e.adId||'');const formId=String(p.form_id||e.formId||'');
    let account='',campaign='';
    if(adId){const ad=await graph(adId,'id,account_id,campaign_id',process.env.META_ADS_TOKEN||token,version);account=String(ad.account_id||'').replace(/^act_/,'');campaign=String(ad.campaign_id||'');}
    let pageName='';try{pageName=String((await graph(e.pageId,'name',token,version)).name||'');}catch{}
    let questions:any[]=[];if(formId){try{questions=(await graph(formId,'id,questions',token,version)).questions||[];}catch{/* Preserve raw answers even if question labels are unavailable. */}}
    const submission={leadId:e.leadId,pageId:e.pageId,formId,submittedAt:Number.isFinite(Date.parse(p.created_time))?new Date(p.created_time).toISOString():e.createdTime?new Date(e.createdTime*1000).toISOString():now(),answers:metaAnswers(p.field_data,questions)};
    const contact=metaContact(p.field_data);
    if(contact.phone&&!/^\+?\d{8,15}$/.test(contact.phone))throw new Error('Meta 电话格式异常，请检查表单');
    for(let attempt=0;attempt<3;attempt++){
      snapshot=await readState();const {state:s,revision}=snapshot;
      if(s.demo)throw new Error('请先清除示例工作区后接收真实 Lead');
      if(s.leads.some(l=>l.externalId===externalId||l.metaLeadIds?.includes(e.leadId))){await mark(e.leadId,'imported','重复通知已去重');return;}
      s.sourceNames ||= {accounts:{},pages:{}};for(const a of adsConfig().accounts)s.sourceNames.accounts[a.id]=a.name;if(pageName)s.sourceNames.pages[e.pageId]=pageName;
      const rules=s.rules.filter(r=>(!r.account||r.account.replace(/^act_/,'')===account)&&(!r.page||r.page===e.pageId)&&(!r.form||r.form===formId));
      if(rules.length!==1)throw new Error(rules.length?'来源匹配多条规则，请调整后重试':'未匹配课程，请建立 Page / Form 来源规则后重试');
      const rule=rules[0],course=s.courses.find(c=>c.id===rule.courseId);if(!course)throw new Error('来源规则课程不存在');
      const at=now();const chosen=rule.sessionId?s.sessions.find(x=>x.id===rule.sessionId&&x.courseId===course.id&&x.accepting&&x.startsAt>at&&x.intakeUntil>at):sessionFor(s,course.id);
      const existing=contact.phone?s.leads.find(l=>l.phone.replace(/^\+/,'')===contact.phone.replace(/^\+/,'')&&l.courseId===course.id):null;
      if(existing){existing.metaSubmissions=[...(existing.metaSubmissions||[]).filter(x=>x.leadId!==e.leadId),submission];existing.metaLeadIds=[...(existing.metaLeadIds||[]),e.leadId];activity(existing,'lead',`Meta 重复报名；Page ${pageName||'已连接 Page'} / Form ${formId} / Lead ${e.leadId}。保留原场次，请负责人确认是否转场。`,'Meta Lead Ads');}
      else{
        const l:Lead={id:uid(),...contact,courseId:course.id,sessionId:chosen?.id||null,ownerId:ownerFor(s,course),stage:'New Lead',account,page:e.pageId,campaign,ad:adId,form:formId,createdAt:at,nextFollowUp:'',optedIn:false,aiPaused:true,revenue:0,externalId,metaLeadIds:[e.leadId],metaSubmissions:[submission],activities:[]};
        activity(l,'lead',`Meta 直接进入；Lead ${e.leadId}；分配至「${chosen?.name||'待分配场次'}」。WhatsApp 尚未发送。`,'Meta Lead Ads');s.leads.unshift(l);
      }
      try{await saveState(s,revision);await mark(e.leadId,'imported',existing?'重复报名已记录':'已进入客户工作台');return;}catch(err){if(attempt===2)throw err;}
    }
  }catch(e2){await mark(e.leadId,'pending',(e2 as Error).message);}
}
