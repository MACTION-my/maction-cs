export type Delivery={status:string;timestamp:number;error?:string};
const rank:Record<string,number>={sending:-1,accepted:0,sent:1,delivered:2,read:3,failed:4};
export function deliveryPatch(old:{status?:string;statusTimestamp?:number},event:Delivery){
 // Delivered/read is stronger evidence than a late or out-of-order failed notification.
 if((old.status==='delivered'||old.status==='read')&&event.status==='failed')return null;
 if(old.status==='failed'&&(event.status==='delivered'||event.status==='read'))return{status:event.status,statusTimestamp:event.timestamp,error:''};
 if(event.timestamp<(old.statusTimestamp||0)||(rank[event.status]??-1)<(rank[old.status||'']??-1))return null;
 return{status:event.status,statusTimestamp:event.timestamp,...(event.status==='failed'?{error:event.error||'Meta 发送失败'}:{error:''})};
}
