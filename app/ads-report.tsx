'use client';
import {useEffect,useState,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow} from '@/components/ui/table';
import {type AdsRow} from '@/lib/ads-protocol';
const day=(offset=0)=>new Date(Date.now()+offset*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Kuala_Lumpur'});
const amount=(n:number,currency:string)=>new Intl.NumberFormat('en-MY',{style:'currency',currency}).format(n);
export default function AdsReport(){
 const [since,setSince]=useState(()=>day(-6)),[until,setUntil]=useState(()=>day()),[account,setAccount]=useState(''),[info,setInfo]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const activeRequest=useRef<AbortController|null>(null);
 async function refresh(syncIfStale:boolean,force=false){
  activeRequest.current?.abort();const controller=new AbortController();activeRequest.current=controller;setBusy(true);setError('');
  const current=()=>activeRequest.current===controller&&!controller.signal.aborted;
  const query=new URLSearchParams({since,until,account}).toString();
  async function load(){const r=await fetch('/api/integrations/meta/ads?'+query,{signal:controller.signal});const p=await r.json();if(!r.ok)throw Error(p.error||'读取广告报告失败');return p;}
  try{let p=await load();if(!current())return;setInfo(p);const selected=p.accounts.filter((a:any)=>!account||a.id===account);
   const stale=selected.some((a:any)=>!a.lastSyncedAt||Date.now()-Date.parse(a.lastSyncedAt)>15*60000||!a.since||a.since>since||a.until<until);
   if(p.configured&&(force||syncIfStale&&stale)){const r=await fetch('/api/integrations/meta/ads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({since,until,account}),signal:controller.signal});const result=await r.json();if(!r.ok)throw Error(result.error||'同步失败');if(!current())return;const failures=result.results.filter((x:any)=>x.error);if(failures.length)setError(failures.map((x:any)=>x.name+'：'+x.error).join('；'));p=await load();if(current())setInfo(p);}
  }catch(e){if(current())setError((e as Error).message);}finally{if(current())setBusy(false);}
 }
 async function sync(){return refresh(false,true);}
 useEffect(()=>{setInfo(null);void refresh(true);return()=>activeRequest.current?.abort();},[since,until,account]);
 const rows:AdsRow[]=info?.rows||[];const totals=new Map<string,{spend:number;impressions:number;clicks:number;leads:number}>();for(const r of rows){const total=totals.get(r.currency)||{spend:0,impressions:0,clicks:0,leads:0};total.spend+=r.spend;total.impressions+=r.impressions;total.clicks+=r.clicks;total.leads+=r.leads;totals.set(r.currency,total);}
 function download(){const csv=[['Date','Account','Currency','Campaign ID','Campaign','Spend','Impressions','Clicks','Native form leads'],...rows.map(r=>[r.date,r.accountName,r.currency,r.campaignId,r.campaignName,r.spend,r.impressions,r.clicks,r.leads])].map(row=>row.map(v=>`"${(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:String(v)).replaceAll('"','""')}"`).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`meta-ads-${since}-${until}.csv`;a.click();URL.revokeObjectURL(u);}
 return <section className="panel padded"><div className="panel-toolbar"><h2>Meta Ads Report</h2><span className="badge outline">{info?.configured?`${info.accounts.length} 个账户 · 只读连接`:'尚未配置广告账户'}</span></div>
 <div className="section-toolbar"><label className="field"><span>广告账户</span><select aria-label="Meta 广告账户" className="pick" disabled={busy} value={account} onChange={e=>setAccount(e.target.value)}><option value="">全部账户</option>{info?.accounts.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label className="field"><span>开始日期</span><Input aria-label="Meta 报告开始日期" type="date" disabled={busy} value={since} onChange={e=>setSince(e.target.value)}/></label><label className="field"><span>结束日期</span><Input aria-label="Meta 报告结束日期" type="date" disabled={busy} value={until} onChange={e=>setUntil(e.target.value)}/></label><Button disabled={busy||!info?.configured} onClick={sync}>{busy?'正在同步…':'同步 Meta 数据'}</Button><Button variant="outline" disabled={!rows.length} onClick={download}>导出 CSV</Button></div>
 {error&&<p className="warning" role="alert">{error}</p>}
 {[...totals].map(([currency,t])=><div className="metrics" key={currency}>{[{label:`广告花费 (${currency})`,value:amount(t.spend,currency)},{label:'展示',value:t.impressions.toLocaleString()},{label:'点击',value:t.clicks.toLocaleString()},{label:'原生表单 Lead',value:t.leads.toLocaleString()},{label:'表单 CPL',value:t.leads?amount(t.spend/t.leads,currency):'—'}].map(m=><div className="metric" key={m.label}><span>{m.label}</span><strong>{m.value}</strong></div>)}</div>)}
 <p className="footnote">打开本页时刷新过期数据，或点击同步；每次最多 31 天。日期采用各广告账户时区，Lead 为 Meta 归因的原生表单提交数，与 CRM 去重后的客户数可能不同。未关联课程的广告仍按原 Campaign 展示。</p>
 <details><summary>账户连接与最后同步时间</summary>{info?.accounts.map((a:any)=><p key={a.id}>{a.name} · {a.currency} · {a.timeZone} · {a.lastSyncedAt?new Date(a.lastSyncedAt).toLocaleString('zh-CN',{timeZone:'Asia/Kuala_Lumpur'}):'尚未同步'}{a.error&&<span className="warning"> · {a.error}</span>}</p>)}</details>
 <div style={{overflowX:'auto'}}><Table><TableHeader><TableRow>{['日期','广告账户','Campaign','花费','展示','点击','表单 Lead','CPL'].map(x=><TableHead key={x}>{x}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={`${r.date}_${r.accountId}_${r.campaignId}`}><TableCell>{r.date}</TableCell><TableCell>{r.accountName}</TableCell><TableCell>{r.campaignName}<small>{r.campaignId}</small></TableCell><TableCell>{amount(r.spend,r.currency)}</TableCell><TableCell>{r.impressions.toLocaleString()}</TableCell><TableCell>{r.clicks.toLocaleString()}</TableCell><TableCell>{r.leads}</TableCell><TableCell>{r.leads?amount(r.spend/r.leads,r.currency):'—'}</TableCell></TableRow>)}</TableBody></Table></div>{!rows.length&&<div className="empty">{busy?'正在读取 Meta 报表…':'此区间暂无已同步的广告投放数据。'}</div>}</section>;
}
