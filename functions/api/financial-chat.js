// Montra AI: verified Supabase session, bounded context, no client-side AI key.
const SUPABASE='https://wkulplqfmjbjgszgofva.supabase.co';
const PUBLIC_KEY='sb_publishable_s9CY190ISRusDgva0-0f5g_n9rk3x9N';
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export async function onRequestPost({request,env}){
  try{
    const token=(request.headers.get('Authorization')||'').match(/^Bearer (.+)$/)?.[1];
    if(!token)return respond({error:'Please sign in first.'},401);
    const auth=await fetch(SUPABASE+'/auth/v1/user',{headers:{Authorization:'Bearer '+token,apikey:PUBLIC_KEY}});
    if(!auth.ok)return respond({error:'Your session has expired. Sign in again.'},401);
    const me=await auth.json();if(!me?.id)return respond({error:'Unauthorized'},401);
    const body=await request.json();const question=String(body?.question||'').trim();
    if(!question||question.length>500)return respond({error:'Enter a question (maximum 500 characters).'},400);
    if(!env.AI)return respond({error:'AI is not configured yet. Please try again later.'},503);
    const snapshot=body?.snapshot||{};
    // Snapshot is client-supplied: treat as untrusted; do not claim bank-verified balances.
    const expenses=Array.isArray(snapshot.expenses)?snapshot.expenses.slice(0,500):[];
    const goals=Array.isArray(snapshot.goals)?snapshot.goals.slice(0,40):[];
    const safeExpenses=expenses.map(x=>({amount:Number(x.amount)||0,category:String(x.category||'Other').slice(0,70),date:String(x.date||'').slice(0,10)}));
    const safeGoals=goals.map(x=>({name:String(x.name||'').slice(0,80),target:Number(x.target)||0,saved:Number(x.saved)||0}));
    const currentDate=new Date().toISOString().slice(0,10);
    const currentMonth=currentDate.slice(0,7);
    const monthlyExpenses=safeExpenses.filter(x=>x.date.startsWith(currentMonth));
    const sum=xs=>Math.round(xs.reduce((n,x)=>n+(Number.isFinite(x.amount)&&x.amount>0?x.amount:0),0)*100)/100;
    const currentTotal=sum(monthlyExpenses);
    const byCategory={};for(const x of monthlyExpenses){byCategory[x.category]=(byCategory[x.category]||0)+Math.max(0,x.amount);}
    const currency=String(snapshot.currency||'EGP').slice(0,5);
    const facts={today_utc:currentDate,current_month:currentMonth,monthly_expense_total:currentTotal,monthly_expense_count:monthlyExpenses.length,monthly_category_totals:byCategory,recorded_monthly_income:(Number(snapshot.income)>0?Number(snapshot.income):null),income_status:(Number(snapshot.income)>0?'recorded_positive':'not_recorded_or_zero'),expenses_completeness:'Only user-recorded expenses; may be incomplete',goals:safeGoals,currency};
    const isArabic=/[\u0600-\u06FF]/.test(question);
    const isMonthlySpend=/(how much|total|كم|كام|قد ايه|قد إيه|اجمالي|إجمالي).*(spend|spent|expense|صرف|مصاريف|مصروف)/i.test(question)&&/(this month|current month|الشهر|month)/i.test(question);
    const wantsCategory=/(categor|category|most on|اكتر|أكتر|تصنيف|فئة)/i.test(question);
    if(isMonthlySpend){
      const top=Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];
      let answer=isArabic?'إجمالي المصروفات المسجلة في '+currentMonth+' هو '+currentTotal.toLocaleString('en-US')+' '+currency+' من '+monthlyExpenses.length+' عملية.':'Your recorded spending in '+currentMonth+' is '+currency+' '+currentTotal.toLocaleString('en-US')+' across '+monthlyExpenses.length+' transaction(s).';
      if(wantsCategory)answer+=top?(isArabic?' أعلى تصنيف: '+top[0]+' ('+currency+' '+top[1].toLocaleString('en-US')+').':' Your top spending category is '+top[0]+' ('+currency+' '+top[1].toLocaleString('en-US')+').'):(isArabic?' لا توجد مصروفات مسجلة لتحديد أعلى تصنيف.':' No expenses are recorded to identify a top category.');
      answer+=isArabic?' الأرقام من سجلات Montra، مش رصيد البنك.':' These figures come from Montra records, not your bank balance.';
      return respond({answer,provider:'Montra verified calculation'});
    }
    const messages=[{role:'system',content:'You are Montra, a bilingual Arabic/English financial education assistant. Answer in the user language. Today (UTC) is '+currentDate+'. Never infer the current month from transaction dates. The following financial facts were computed deterministically by the app; use them exactly, never recalculate or invent numbers: '+JSON.stringify(facts)+'. Data is user-recorded, not bank-verified, and may be incomplete. CRITICAL: when recorded_monthly_income is null, it means no positive income amount is recorded; NEVER claim actual income is zero, that the user lives off savings, is unemployed, or has no income. State that income is not available and ask the user to enter it in Accounts. Do not infer real financial circumstances from missing data. Offer actionable advice grounded in available categories and goals, clearly label uncertainty. Use plain text without Markdown symbols such as ** or #. If records are missing, say so. Do not provide definitive buy/sell instructions. Be concise.'},{role:'user',content:question}];
    const result=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8-fast',{messages,max_tokens:350});
    const answer=String(result?.response||'').trim();if(!answer)throw Error('Empty AI response');
    return respond({answer,provider:'Cloudflare Workers AI'});
  }catch(e){console.error('Montra AI invocation failed:',e?.message||e);return respond({error:'Cloudflare AI request failed. Please retry later.',detail:String(e?.message||'Unknown error').slice(0,180)},503)}
}
