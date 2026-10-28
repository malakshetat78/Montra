import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import webpush from 'npm:web-push@3.6.7';
const site='https://montra-finance.khaledshetat4.chatgpt.site';
const allowedOrigins=new Set([site,'http://terminal.local:4173']);
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
function allowedEndpoint(endpoint:string){try{let u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false}}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:site,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(origin&&!allowedOrigins.has(origin))return reply({error:'Origin not allowed'},403);
 try{
 const {data:secrets,error:secretError}=await admin.rpc('montra_delivery_secrets');if(secretError)throw new Error('Notification configuration unavailable');
 const job=req.headers.get('x-montra-job');const isJob=Boolean(job&&job===secrets.montra_job_token);
 if(!isJob){
   const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
   if(!bearer)return reply({error:'Sign in required'},401);
   const {data,error}=await admin.auth.getUser(bearer);if(error||!data.user)return reply({error:'Sign in required'},401);
   // Public status only; no credentials, endpoints or tokens are returned.
   return reply({publicKey:secrets.montra_vapid_public,pushReady:Boolean(secrets.montra_vapid_public&&secrets.montra_vapid_private),emailReady:Boolean(secrets.montra_email_api_key&&secrets.montra_email_from)});
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 webpush.setVapidDetails(site,secrets.montra_vapid_public,secrets.montra_vapid_private);
 const {data:queue,error:qError}=await admin.rpc('montra_delivery_claim');if(qError)throw new Error('Unable to claim notification queue');
 let handled=0;
 for(const entry of queue||[]){
   const n=entry.notification;let pushOK=Boolean(entry.push_done),emailOK=Boolean(entry.email_done),issue:string|null=null;
   if(!pushOK){
     const {data:subscriptions,error}=await admin.from('montra_push_subscriptions').select('*').eq('user_id',n.user_id);
     if(error){issue='Unable to load push subscriptions';}else{
       pushOK=true;
       for(const subscription of subscriptions||[]){
         if(!allowedEndpoint(subscription.endpoint)){await admin.from('montra_push_subscriptions').delete().eq('id',subscription.id);continue;}
         const {data:receipt}=await admin.from('montra_delivery_receipts').select('subscription_id').eq('notification_id',n.id).eq('subscription_id',subscription.id).maybeSingle();if(receipt)continue;
         try{
           await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:'Montra',body:'You have a new update. Open Montra to view it.',id:n.id,view:n.destination}),{TTL:3600,timeout:8000,topic:n.id.replaceAll('-','').slice(0,32)});
           const {error:receiptError}=await admin.from('montra_delivery_receipts').insert({notification_id:n.id,subscription_id:subscription.id});if(receiptError){pushOK=false;issue='Unable to confirm push delivery';}
         }catch(err){const status=(err as {statusCode?:number}).statusCode;if(status===404||status===410)await admin.from('montra_push_subscriptions').delete().eq('id',subscription.id);else{pushOK=false;issue='Push service delivery failed';}}
       }
     }
   }
   if(!emailOK){
     const {data:profile,error:profileError}=await admin.from('montra_profiles').select('email_notifications').eq('user_id',n.user_id).maybeSingle();
     if(profileError){issue='Unable to load email preferences';}
     else if(!profile?.email_notifications){emailOK=true;}
     else if(!secrets.montra_email_api_key||!secrets.montra_email_from){issue='Email sender is not configured';}
     else{
       const {data:account,error:accountError}=await admin.auth.admin.getUserById(n.user_id);
       if(accountError||!account.user?.email_confirmed_at||!account.user.email){emailOK=true;}
       else{
         const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${secrets.montra_email_api_key}`,'Content-Type':'application/json','Idempotency-Key':`montra-${n.id}`},body:JSON.stringify({from:secrets.montra_email_from,to:[account.user.email],subject:'Your Montra account has an update',text:`You have a new notification in Montra.\n\nOpen your account: ${site}/?view=${n.destination}\n\nManage notifications in Settings.`})});
         emailOK=result.ok;if(!result.ok)issue='Email provider rejected delivery';
       }
     }
   }
   const {error:finishError}=await admin.rpc('montra_delivery_finish',{nid:n.id,push_ok:pushOK,email_ok:emailOK,issue});if(finishError)throw new Error('Unable to finalize delivery');handled++;
 }
 return reply({handled});
 }catch{return reply({error:'Notification service is temporarily unavailable'},500)}
});
