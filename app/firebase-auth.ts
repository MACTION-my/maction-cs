import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {adminAuth} from '@/lib/firebase-admin';
import {resolveAccess} from '@/lib/access-policy';
import {readState} from '@/lib/store';
export async function getUser(){const value=(await cookies()).get('__session')?.value;if(!value)return null;try{const user=await adminAuth().verifySessionCookie(value,true);const access=resolveAccess(user.email,user.email_verified===true,process.env.CRM_ALLOWED_EMAILS||'',(await readState()).state);if(!access)return null;return {userId:user.uid,email:user.email!,displayName:user.name||user.email!,access};}catch{return null;}}
export async function requireUser(){const user=await getUser();if(!user)redirect('/login');return user;}
