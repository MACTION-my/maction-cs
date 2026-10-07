import {database} from './firebase-admin';
import {adsDates,adsRange,normalizeAds,type AdsAccount,type AdsRow} from './ads-protocol';
import {randomUUID} from 'node:crypto';
export function adsConfig(){let accounts:AdsAccount[]=[];try{accounts=JSON.parse(process.env.META_AD_ACCOUNTS||'[]');}catch{}accounts=accounts.filter(a=>/^\d+$/.test(a.id)&&a.name&&a.currency);return {accounts,token:process.env.META_ADS_TOKEN||'',version:process.env.META_GRAPH_VERSION||''};}
const root=()=>database().collection('maction_ads');
async function graphRows(account:AdsAccount,since:string,until:string){
 const {token,version}=adsConfig();if(!token||!/^v\d+\.\d+$/.test(version))throw new Error('尚未配置广告报表授权');
 const rows:AdsRow[]=[];let after='';for(let page=0;page<30;page++){
  const u=new URL(`https://graph.facebook.com/${version}/act_${account.id}/insights`);
  u.searchParams.set('fields','date_start,date_stop,account_id,account_currency,campaign_id,campaign_name,spend,impressions,clicks,actions');u.searchParams.set('level','campaign');u.searchParams.set('time_increment','1');u.searchParams.set('time_range',JSON.stringify({since,until}));u.searchParams.set('use_unified_attribution_setting','true');u.searchParams.set('limit','500');if(after)u.searchParams.set('after',after);
  const r=await fetch(u,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(25000)});const p=await r.json();if(!r.ok||p.error)throw new Error(`Meta 报表读取失败（${p.error?.code||r.status}）；请检查账户权限、Token 或稍后重试`);
  for(const row of p.data||[]){const normalized=normalizeAds(row,account);if(normalized.date<since||normalized.date>until)throw new Error('Meta 返回超出所选区间');rows.push(normalized);}
  if(!p.paging?.next)return rows;after=p.paging?.cursors?.after;if(!after)throw new Error('Meta 分页异常');
 }throw new Error('此区间数据过多，请缩短日期区间');
}
export async function syncAds(since:string,until:string,accountId=''){
 adsRange(since,until);const config=adsConfig();if(!config.token||!config.accounts.length)throw new Error('广告账户尚未连接');const accounts=config.accounts.filter(a=>!accountId||a.id===accountId);if(!accounts.length)throw new Error('广告账户不在授权范围');const results=[];
 for(const account of accounts){const status=root().doc(account.id),lease=randomUUID();const locked=await database().runTransaction(async t=>{const s=(await t.get(status)).data();if(s?.leaseUntil>Date.now())return false;t.set(status,{lease,leaseUntil:Date.now()+15*60000},{merge:true});return true;});if(!locked){results.push({id:account.id,name:account.name,error:'此账户正在同步，请稍后刷新'});continue;}
  try{const rows=await graphRows(account,since,until);const batch=database().batch();const at=new Date().toISOString();for(const date of adsDates(since,until)){const daily=rows.filter(r=>r.date===date);if(Buffer.byteLength(JSON.stringify(daily))>800000)throw new Error('单日数据过多，请联系管理员');batch.set(status.collection('days').doc(date),{date,rows:daily,syncedAt:at});}batch.set(status,{account,lastSyncedAt:at,since,until,error:'',lease:'',leaseUntil:0},{merge:true});await batch.commit();results.push({id:account.id,name:account.name,rows:rows.length,lastSyncedAt:at});}
  catch(e){const error=(e as Error).message;await status.set({account,error,lease:'',leaseUntil:0},{merge:true});results.push({id:account.id,name:account.name,error});}
 }return results;
}
export async function readAds(since:string,until:string,accountId=''){
 adsRange(since,until);const c=adsConfig();if(accountId&&!c.accounts.some(a=>a.id===accountId))throw new Error('广告账户不在授权范围');const rows:AdsRow[]=[];const accounts=[];
 for(const a of c.accounts){const ref=root().doc(a.id),status=(await ref.get()).data();accounts.push({...a,lastSyncedAt:status?.lastSyncedAt||null,since:status?.since,until:status?.until,error:status?.error||''});if(accountId&&a.id!==accountId)continue;const docs=await ref.collection('days').where('date','>=',since).where('date','<=',until).get();for(const d of docs.docs)rows.push(...d.data().rows);}
 return {configured:!!(c.token&&c.accounts.length),accounts,rows:rows.sort((a,b)=>b.date.localeCompare(a.date)||a.accountName.localeCompare(b.accountName)),since,until};
}
