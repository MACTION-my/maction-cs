import {cookies} from 'next/headers';
import {adminAuth} from '@/lib/firebase-admin';
import {sameOrigin} from '@/lib/auth-policy';
import {resolveAccess} from '@/lib/access-policy';
import {readState} from '@/lib/store';
export async function POST(request:Request){if(!sameOrigin(request))return new Response('Forbidden',{status:403});try{const {idToken}=await request.json();if(typeof idToken!=='string'||idToken.length>10000)return new Response('Invalid token',{status:400});const user=await adminAuth().verifyIdToken(idToken,true);if(!resolveAccess(user.email,user.email_verified===true,process.env.CRM_ALLOWED_EMAILS||'',(await readState()).state,user.uid,process.env.CRM_ADMIN_UIDS||''))return Response.json({error:'此账号没有客服工作区权限，请联系管理员'},{status:403});if(Date.now()/1000-user.auth_time>300)return Response.json({error:'请重新登录'},{status:401});const expiresIn=5*24*3600*1000;const session=await adminAuth().createSessionCookie(idToken,{expiresIn});(await cookies()).set('__session',session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:expiresIn/1000,path:'/'});return Response.json({ok:true});}catch{return Response.json({error:'登录失败，请重试'},{status:401});}}
export async function DELETE(request:Request){if(!sameOrigin(request))return new Response('Forbidden',{status:403});(await cookies()).delete('__session');return Response.json({ok:true});}
