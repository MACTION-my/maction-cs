export function waPhone(value:unknown){const v=String(value||'').replace(/[\s()+-]/g,'');if(!/^[1-9]\d{7,14}$/.test(v))throw new Error('请输入含国家代码的 WhatsApp 号码');return v;}
export function waTemplate(value:unknown){const v=String(value||'');if(!/^[a-z][a-z0-9_]{0,511}$/.test(v))throw new Error('模板名称只能包含小写英文字母、数字和下划线');return v;}
export function waLanguage(value:unknown){const v=String(value||'');if(!/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(v))throw new Error('语言代码无效');return v;}
export function waHttps(value:unknown){const u=new URL(String(value||''));if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname))throw new Error('图片需要公开的 HTTPS 链接');return u.href;}
export function waPayload(b:any,allowedRecipient:string){
 const to=waPhone(b.to);if(to!==waPhone(allowedRecipient))throw new Error('测试模式只允许发送到已验证的测试接收号码');
 const name=waTemplate(b.template),language=waLanguage(b.language);const parameters=b.parameters||[];
 if(!Array.isArray(parameters)||parameters.length>10||parameters.some((v:any)=>typeof v!=='string'||!v.trim()||v.length>1024))throw new Error('模板参数无效');
 const components:any[]=[];if(b.image)components.push({type:'header',parameters:[{type:'image',image:{link:waHttps(b.image)}}]});
 if(parameters.length)components.push({type:'body',parameters:parameters.map((text:string)=>({type:'text',text}))});
 return {messaging_product:'whatsapp',to,type:'template',template:{name,language:{code:language},...(components.length?{components}:{})}};
}
export function waTemplateDraft(b:any){
 const name=waTemplate(b.name),language=waLanguage(b.language),body=String(b.body||'').trim();
 if(!body||body.length>1024)throw new Error('模板正文须为 1 至 1024 个字符');
 if(!['MARKETING','UTILITY'].includes(b.category))throw new Error('请选择模板类别');
 const slots=[...body.matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1]));const unique=[...new Set(slots)].sort((a,b)=>a-b);
 if(unique.some((n,i)=>n!==i+1)||unique.length>10||/\{\{[^}]*\}\}/g.test(body.replace(/\{\{\d+\}\}/g,'')))throw new Error('变量请按 {{1}}、{{2}} 顺序编号');
 const examples=b.examples||[];if(!Array.isArray(examples)||examples.length!==unique.length||examples.some((v:any)=>typeof v!=='string'||!v.trim()||v.length>1024))throw new Error('每个正文变量都需要示例值');
 const components:any[]=[];
 if(b.headerHandle){if(typeof b.headerHandle!=='string'||b.headerHandle.length>10000)throw new Error('图片上传凭据无效');components.push({type:'HEADER',format:'IMAGE',example:{header_handle:[b.headerHandle]}});}
 components.push({type:'BODY',text:body,...(unique.length?{example:{body_text:[examples]}}:{})});
 return {name,language,category:b.category,components};
}
