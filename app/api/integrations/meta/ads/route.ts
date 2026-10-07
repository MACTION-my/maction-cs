import {getUser} from '@/app/firebase-auth';
import {sameOrigin} from '@/lib/auth-policy';
import {readAds,syncAds} from '@/lib/ads-store';
export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){if(!await getUser())return new Response('Unauthorized',{status:401});try{const q=new URL(request.url).searchParams;return Response.json(await readAds(q.get('since')||'',q.get('until')||'',q.get('account')||''));}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
export async function POST(request:Request){if(!await getUser())return new Response('Unauthorized',{status:401});if(!sameOrigin(request))return new Response('Forbidden',{status:403});try{const b=await request.json();const results=await syncAds(b.since,b.until,b.account||'');return Response.json({results});}catch(e){return Response.json({error:(e as Error).message},{status:400});}}
