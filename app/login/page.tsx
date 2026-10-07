'use client';
import {useState} from 'react';
import {initializeApp,getApps} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,sendPasswordResetEmail,setPersistence,inMemoryPersistence,signOut,type Auth} from 'firebase/auth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {ArrowRight,Eye,EyeOff,ShieldCheck} from 'lucide-react';
import styles from './login.module.css';
export default function Login(){
 const [showPassword,setShowPassword]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function authClient(){const r=await fetch('/api/auth/config');const p=await r.json();if(!r.ok)throw new Error('登录服务暂时不可用，请稍后重试');const auth=getAuth(getApps()[0]||initializeApp(p));await setPersistence(auth,inMemoryPersistence);return auth;}
 async function login(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');let auth:Auth|undefined;try{
  auth=await authClient();const result=await signInWithEmailAndPassword(auth,email.trim(),password);
  const r=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await result.user.getIdToken(true)})});if(!r.ok){let p:any={};try{p=await r.json();}catch{}throw new Error(p.error||'登录失败，请重试');}window.location.assign('/');
 }catch(e){const code=(e as {code?:string}).code;setError(code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found'?'邮箱或密码不正确':code==='auth/too-many-requests'?'操作过于频繁，请稍后重试':code==='auth/operation-not-allowed'?'邮箱密码登录尚未启用，请联系管理员':code==='auth/network-request-failed'?'网络连接失败，请重试':code==='auth/user-disabled'?'此账号已停用，请联系管理员':code?'登录失败，请检查邮箱和密码后重试':(e as Error).message);}finally{if(auth)await signOut(auth).catch(()=>{});setPassword('');setBusy(false);}}
 async function reset(){if(busy)return;if(!email.trim()){setError('请先填写登录邮箱');return;}setBusy(true);setError('');setNotice('');let auth:Auth|undefined;try{auth=await authClient();await sendPasswordResetEmail(auth,email.trim(),{url:window.location.origin+'/login'});setNotice('如果该邮箱已注册，你会收到密码重设邮件。请自行在邮件链接中设置密码。');}catch{setError('暂时无法发送重设邮件，请稍后重试');}finally{if(auth)await signOut(auth).catch(()=>{});setBusy(false);}}
 return <main className={styles.page}>
  <header className={styles.top}><span className={styles.wordmark}>MACTION CS</span><span className={styles.topLabel}>CUSTOMER OPERATIONS</span></header>
  <div className={styles.content}>
   <section className={styles.brand} aria-label="MACTION 品牌">
    <img className={styles.logo} src="/maction-gold-logo.png" alt="MACTION · 连锁、绩效、资本" width={2172} height={724}/>
    <p className={styles.brandCaption}>MACTION CUSTOMER RELATIONSHIP MANAGEMENT</p>
    <div className={styles.brandLine}/><p className={styles.brandPhrase}>连结客户，成就增长。</p>
   </section>
   <section className={styles.formArea} aria-labelledby="login-title">
    <div className={styles.eyebrow}>MACTION CRM</div><h1 id="login-title" className={styles.title}>欢迎回来</h1><p className={styles.subtitle}>客户、课程与服务管理中心</p>
    <form className={styles.form} onSubmit={login}>
     <label className={styles.field}><span className={styles.label}>登录邮箱</span><Input className={styles.input} type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} placeholder="name@maction.com.my"/></label>
     <div className={styles.field}><label htmlFor="login-password" className={styles.label}>密码</label><div className={styles.passwordWrap}><Input className={styles.input+' '+styles.passwordInput} id="login-password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} placeholder="输入你的登录密码"/><button type="button" className={styles.eye} aria-label={showPassword?'隐藏密码':'显示密码'} aria-pressed={showPassword} disabled={busy} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
     <div className={styles.formTools}><span>你的专属团队工作区</span><button type="button" className={styles.forgot} disabled={busy} onClick={reset}>忘记密码？</button></div>
     <Button type="submit" className={styles.submit} disabled={busy}><span>{busy?'正在处理…':'登入系统'}</span><span className={styles.submitIcon}><ArrowRight size={16}/></span></Button>
    </form>
    {error&&<p className={styles.error} role="alert">{error}</p>}{notice&&<p className={styles.notice} role="status">{notice}</p>}
    <p className={styles.secure}><ShieldCheck size={14} aria-hidden="true"/>仅供获授权的团队成员使用</p>
   </section>
  </div>
  <footer className={styles.footer}><span className={styles.values}>连锁<span className={styles.dot}>·</span>绩效<span className={styles.dot}>·</span>资本</span><span className={styles.footerNote}>MACTION · EVERY CONNECTION COUNTS</span></footer>
 </main>;
}