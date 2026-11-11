import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const env=(k:string)=>Deno.env.get(k)||'';
const dateOnly=(d:Date)=>d.toISOString().slice(0,10);
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply(405,{error:'POST only'});
 const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!jwt)return reply(401,{error:'Sign in first'});
 const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),service=env('SUPABASE_SERVICE_ROLE_KEY');
 const clientId=env('PAYPAL_SANDBOX_CLIENT_ID'),secret=env('PAYPAL_SANDBOX_CLIENT_SECRET');
 if(!url||!anon||!service||!clientId||!secret)return reply(503,{error:'Server configuration incomplete. Configure Supabase and PayPal Sandbox secrets.'});
 const authClient=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${jwt}`}}});
 const {data:{user},error:authError}=await authClient.auth.getUser(jwt);
 if(authError||!user)return reply(401,{error:'Invalid session'});
 try{
  const tokenResponse=await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(`${clientId}:${secret}`),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  if(!tokenResponse.ok)return reply(502,{error:'PayPal Sandbox authentication failed',provider_status:tokenResponse.status});
  const token=await tokenResponse.json();
  const end=new Date(),start=new Date(end.getTime()-6*86400000);
  const qs=new URLSearchParams({start_date:start.toISOString(),end_date:end.toISOString(),fields:'all',page_size:'100',page:'1'});
  const response=await fetch(`https://api-m.sandbox.paypal.com/v1/reporting/transactions?${qs}`,{headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'}});
  if(!response.ok){const body=await response.text();return reply(502,{error:'PayPal Transaction Search unavailable. Check account eligibility, API permission and sandbox transaction availability.',provider_status:response.status,provider_issue:body.slice(0,300)});}
  const payload=await response.json();
  const records=Array.isArray(payload.transaction_details)?payload.transaction_details:[];
  const rows=records.flatMap((r:any)=>{
    const t=r.transaction_info||{},a=t.transaction_amount||{},amount=Number(a.value),id=String(t.transaction_id||'');
    const currency=String(a.currency_code||'').toUpperCase(),date=String(t.transaction_initiation_date||t.transaction_updated_date||'');
    if(!id||!Number.isFinite(amount)||amount===0||!['USD','EGP'].includes(currency)||!/^\d{4}-\d\d-\d\d/.test(date))return [];
    return [{user_id:user.id,external_id:id,booked_on:dateOnly(new Date(date)),description:String(r.payer_info?.email_address||t.transaction_subject||'PayPal transaction').slice(0,200),amount,currency,direction:amount<0?'expense':'income',provider_status:String(t.transaction_status||'unknown').slice(0,50),source:'paypal_sandbox',raw_type:String(t.transaction_event_code||'').slice(0,40)}];
  });
  const admin=createClient(url,service);
  if(rows.length){const {error}=await admin.from('montra_paypal_sandbox_transactions').upsert(rows,{onConflict:'user_id,external_id'});if(error)throw error;}
  return reply(200,{ok:true,received:records.length,stored:rows.length,skipped:records.length-rows.length,has_more:Number(payload.total_pages||1)>1,notice:'Sandbox merchant transactions only. No real payments or personal-account access.'});
 }catch(e){return reply(500,{error:'Sync failed',detail:e instanceof Error?e.message:'Unknown error'});}
});
