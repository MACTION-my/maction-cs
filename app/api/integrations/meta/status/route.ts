import {getUser} from '@/app/firebase-auth';
import {sameOrigin} from '@/lib/auth-policy';
import {metaConfig,processMeta} from '@/lib/meta-intake';
import {recentMeta,pendingMeta} from '@/lib/meta-store';
export const dynamic='force-dynamic';
import {readState} from '@/lib/store';
export async function GET(){const user=await getUser();if(!user)return new Response('Unauthorized',{status:401});if(user.access.role!=='admin')return new Response('Forbidden',{status:403});try{const c=metaConfig();const result=await readState();return Response.json({configured:!!(c.secret&&c.version&&Object.keys(c.tokens).length),pages:Object.keys(c.tokens).map(id=>result.state.sourceNames?.pages[id]||'名称待同步'),events:await recentMeta()});}catch{return Response.json({error:'读取接收记录失败'},{status:503});}}
export async function POST(request:Request){const user=await getUser();if(!user)return new Response('Unauthorized',{status:401});if(user.access.role!=='admin')return new Response('Forbidden',{status:403});if(!sameOrigin(request))return new Response('Forbidden',{status:403});try{const events=await pendingMeta();for(const event of events)await processMeta(event);return Response.json({retried:events.length});}catch{return new Response('Retry failed',{status:503});}}
