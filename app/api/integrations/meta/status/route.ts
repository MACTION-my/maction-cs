import {getUser} from '@/app/firebase-auth';
import {sameOrigin} from '@/lib/auth-policy';
import {metaConfig,processMeta} from '@/lib/meta-intake';
import {recentMeta,pendingMeta} from '@/lib/meta-store';
export const dynamic='force-dynamic';
export async function GET(){if(!await getUser())return new Response('Unauthorized',{status:401});try{const c=metaConfig();return Response.json({configured:!!(c.secret&&c.version&&Object.keys(c.tokens).length),pages:Object.keys(c.tokens),events:await recentMeta()});}catch{return Response.json({error:'读取接收记录失败'},{status:503});}}
export async function POST(request:Request){if(!await getUser())return new Response('Unauthorized',{status:401});if(!sameOrigin(request))return new Response('Forbidden',{status:403});try{const events=await pendingMeta();for(const event of events)await processMeta(event);return Response.json({retried:events.length});}catch{return new Response('Retry failed',{status:503});}}
