export type AdsAccount={id:string;name:string;currency:string;timeZone:string};
export type AdsRow={date:string;accountId:string;accountName:string;currency:string;campaignId:string;campaignName:string;spend:number;impressions:number;clicks:number;leads:number};
export function adsRange(since:string,until:string){
 const date=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!date(since)||!date(until)||since>until||(Date.parse(until)-Date.parse(since))/86400000>30)throw new Error('请选择不超过 31 天的有效日期区间');
 return {since,until};
}
export function adsDates(since:string,until:string){adsRange(since,until);const out=[];for(let n=Date.parse(since);n<=Date.parse(until);n+=86400000)out.push(new Date(n).toISOString().slice(0,10));return out;}
export function normalizeAds(row:any,account:AdsAccount):AdsRow{
 const number=(v:unknown)=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0)throw new Error('Meta 报表返回无效数字');return n;};
 if(!/^\d+$/.test(String(row.campaign_id))||String(row.account_id)!==account.id||row.account_currency!==account.currency)throw new Error('Meta 报表账户或币种不一致');
 adsRange(row.date_start,row.date_stop);if(row.date_start!==row.date_stop)throw new Error('Meta 未返回按日统计');
 // The generic lead action can include website leads. Count only native lead-form submissions.
 const native=row.actions?.find((a:any)=>a.action_type==='onsite_conversion.lead_grouped');
 return {date:row.date_start,accountId:account.id,accountName:account.name,currency:account.currency,campaignId:String(row.campaign_id),campaignName:String(row.campaign_name||''),spend:number(row.spend),impressions:number(row.impressions),clicks:number(row.clicks),leads:number(native?.value)};
}
