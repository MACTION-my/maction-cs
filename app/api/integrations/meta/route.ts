import {after} from 'next/server';
import {processMetaBatch} from '@/lib/meta-batch';
import {enqueueMeta,metaConfig,processMeta} from '@/lib/meta-intake';
import {metaEvents,validMetaSignature} from '@/lib/meta-protocol';
import {waWebhook} from '@/lib/whatsapp';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){const u=new URL(request.url),token=process.env.META_VERIFY_TOKEN;if(!token)return new Response('Meta not configured',{status:503});if(u.searchParams.get('hub.mode')==='subscribe'&&u.searchParams.get('hub.verify_token')===token)return new Response(u.searchParams.get('hub.challenge')||'');return new Response('Forbidden',{status:403});}
export async function POST(request:Request){const c=metaConfig();if(!c.secret)return new Response('Meta not configured',{status:503});const raw=await request.text();if(raw.length>262144)return new Response('Too large',{status:413});if(!await validMetaSignature(raw,request.headers.get('x-hub-signature-256'),c.secret))return new Response('Forbidden',{status:403});try{const payload=JSON.parse(raw);if(payload.object==='whatsapp_business_account'){await waWebhook(payload);return Response.json({received:true});}const events=metaEvents(payload);await enqueueMeta(events);after(()=>processMetaBatch(events,processMeta));return Response.json({received:events.length});}catch{return new Response('Please retry',{status:503});}}
