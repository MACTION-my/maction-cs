import type {Auth} from 'firebase-admin/auth';

export async function teamAccount(auth:Pick<Auth,'getUserByEmail'|'createUser'>,email:string,password:unknown,name:string){
 const secret=typeof password==='string'?password:'';
 if(secret&&(secret.length<12||secret.length>128))throw new Error('密码须为 12 至 128 个字符');
 let account;
 try{account=await auth.getUserByEmail(email);}catch(e){
  if((e as {code?:string}).code!=='auth/user-not-found')throw new Error('无法读取登录账号，请稍后重试');
 }
 if(account){
  if(secret)throw new Error('此邮箱已有登录账号；请清空密码以绑定现有账号，不会修改原密码');
  if(account.disabled)throw new Error('此登录账号已停用');
  return account.uid;
 }
 if(!secret)throw new Error('新登录账号必须填写密码（至少 12 个字符）');
 try{return (await auth.createUser({email,password:secret,displayName:name,emailVerified:false,disabled:false})).uid;}
 catch(e){if((e as {code?:string}).code==='auth/email-already-exists')throw new Error('此邮箱已建立登录账号，请清空密码后重新保存以绑定');throw new Error('建立登录账号失败，请检查密码或稍后重试');}
}
