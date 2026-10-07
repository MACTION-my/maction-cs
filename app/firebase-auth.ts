import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {adminAuth} from '@/lib/firebase-admin';
import {allowedEmail} from '@/lib/auth-policy';
export async function getUser(){const value=(await cookies()).get('__session')?.value;if(!value)return null;try{const user=await adminAuth().verifySessionCookie(value,true);if(!allowedEmail(user.email,user.email_verified===true,process.env.CRM_ALLOWED_EMAILS||''))return null;return {userId:user.uid,email:user.email!,displayName:user.name||user.email!};}catch{return null;}}
export async function requireUser(){const user=await getUser();if(!user)redirect('/login');return user;}
