/* Stock Recommendations: research watchlist, not automated financial advice. */
(()=>{
let loading=false,error='',loaded=false,alertStatus='',lastAutoCheck=0,autoUser=null;
const nav=document.querySelector('.sidebar nav');
if(nav&&!nav.querySelector('[data-page="stock-recommendations"]')){
 const b=document.createElement('button');b.className='nav';b.dataset.page='stock-recommendations';b.innerHTML='<span class="icon">⌁</span> Stock Recommendations';b.onclick=()=>navigate('stock-recommendations');nav.appendChild(b);
}
const fmtUSD=n=>'USD '+Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
function signal(a){
 const price=Number(a.price),change=Number(a.change_percent),hasChange=a.change_percent!==null&&a.change_percent!==undefined&&Number.isFinite(change);
 const time=Date.parse(a.quote_time||''),age=Date.now()-time;
 if(a.unavailable||a.stale||!Number.isFinite(price)||price<=0||!Number.isFinite(time)||age<0||age>(a.closed?7:1)*86400000)return {label:'Quote unavailable / outdated',risk:'Unknown',why:'A usable recent quote is required before research.',ready:false};
 const fund=/ETF|fund|index/i.test(String(a.type||'')+' '+String(a.name||''));
 if(!hasChange)return {label:'Research first',risk:fund?'Market / fund risk':'Single-company risk',why:'The provider did not return a valid session change. Review fundamentals and diversification.',ready:true};
 if(Math.abs(change)>=4)return {label:'High volatility · watch',risk:'Elevated short-term volatility',why:'A '+Math.abs(change).toFixed(2)+'% session move is large; it is not proof of a bargain or a reliable entry point.',ready:true};
 return {label:'Worth researching',risk:fund?'Diversified exposure; market risk remains':'Single-company concentration risk',why:'The latest session change ('+(change>=0?'+':'')+change.toFixed(2)+'%) is not a valuation signal. Compare fundamentals, fees and long-term goals.',ready:true};
}
function pageHTML(){
 const items=Array.isArray(opportunityItems)?opportunityItems:[];
 return '<div style="display:grid;gap:16px">'+
 '<div class="card panel"><div class="cardhead"><div><h2>Stock Recommendations</h2><p>Research watchlist with market quotes, reasons and risks. Simulated purchases only · real market data.</p></div><span class="pill">Research only</span></div>'+
 '<p class="plan-note">These are provider-supplied US market examples, not personalized buy orders or a ranked list. Price movements alone cannot establish a good entry price. Quotes can be delayed. Egyptian market coverage is not connected.</p>'+
 '<button class="primary" type="button" onclick="montraRefreshStockWatch()" '+(loading?'disabled':'')+'>'+(loading?'Checking quotes…':'Analyze available US stocks')+'</button>'+
 (error?'<p role="alert" class="warning">'+esc(error)+'</p>':'')+
 (!loaded?'<p class="muted">Press Analyze to load current available examples.</p>':'')+(alertStatus?'<p role="status" class="muted">'+esc(alertStatus)+'</p>':'')+
 '</div>'+
 (loaded&&!loading?(!items.length?'<div class="card panel"><p>No market data available. Try again later.</p></div>':items.map(a=>{const x=signal(a);return '<article class="card panel" style="display:grid;gap:9px"><div class="cardhead"><div><h3>'+esc(a.name||a.symbol)+' <small>'+esc(a.symbol)+'</small></h3><p>'+esc(a.type||'Market instrument')+'</p></div><span class="pill">'+esc(x.label)+'</span></div><h3>'+(x.ready?fmtUSD(a.price):'Price unavailable')+'</h3><p><b>Why:</b> '+esc(x.why)+'</p><p><b>Risk:</b> '+esc(x.risk)+'</p><p><b>Source:</b> Twelve Data · '+esc(String(a.quote_time||'Timestamp unavailable'))+(a.closed?' · Market closed':'')+'</p><button type="button" class="inlinebtn" onclick="montraStockExplain('+JSON.stringify(String(a.symbol)).replace(/"/g,'&quot;')+')">Ask Montra AI about this stock</button> <button type="button" class="primary" '+(x.ready?'':'disabled')+' onclick="montraDemoBuy('+JSON.stringify(String(a.symbol)).replace(/"/g,'&quot;')+')">Buy · Demo only</button></article>'}).join('')):'')+
 '<div class="card panel"><p class="muted">Educational research, not a recommendation to buy, sell or hold. Review your risk tolerance, emergency savings, investment horizon and independent sources before deciding.</p></div></div>';
}
async function publishStockAlerts(items){
 const candidates=items.filter(a=>signal(a).ready&&signal(a).label==='Worth researching').slice(0,4);
 if(!candidates.length){alertStatus='No new research alerts from available quotes.';return;}
 let sent=0,failed=0;
 for(const a of candidates){
   const day=String(a.quote_time||'').slice(0,10),title='Stock watch: '+String(a.symbol).slice(0,20);
   const event_key='stock-watch:'+String(a.symbol).slice(0,20)+':'+day;
   const body='Potential research opportunity · '+fmtUSD(a.price)+' · quote '+String(a.quote_time||'unknown')+'. Not a buy instruction.';
   const saved=await db.from('montra_notifications').upsert({user_id:user.id,event_key,title,body,kind:'stock',destination:'stock-recommendations'},{onConflict:'user_id,event_key',ignoreDuplicates:true});
   if(saved.error)failed++;else sent++;
 }
 if(sent)await refreshNotifications();
 alertStatus=sent?sent+' stock watch alert(s) added to the notification bell.':failed?'Could not save stock alerts to the notification bell.':'Stock watch alerts already saved today.';
 if(failed)alertStatus+=' '+failed+' alert(s) could not be saved.';
}
async function automaticStockCheck(){
 if(!user||loading||document.hidden||Date.now()-lastAutoCheck<15*60*1000)return;
 lastAutoCheck=Date.now();
 try{
   const data=await sandboxCall('explore');
   if(!user)return;
   opportunityItems=Array.isArray(data.items)?data.items:[];
   loaded=true;
   await publishStockAlerts(opportunityItems);
   if(page==='stock-recommendations')render();
 }catch(e){console.warn('Stock watch background refresh unavailable:',e.message);}
}
setInterval(()=>{if(user)automaticStockCheck();},15*60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user)automaticStockCheck();});
const stockLoadData=loadData;
loadData=async function(){await stockLoadData();if(user){if(autoUser!==user.id){autoUser=user.id;lastAutoCheck=0;}automaticStockCheck();}};
window.montraRefreshStockWatch=async()=>{
 if(loading)return;loading=true;error='';alertStatus='';render();
 try{const data=await sandboxCall('explore');opportunityItems=Array.isArray(data.items)?data.items:[];loaded=true;await publishStockAlerts(opportunityItems);}catch(e){error=e.message||'Market data could not be loaded';loaded=false;}
 finally{loading=false;if(page==='stock-recommendations')render();}
};
window.montraDemoBuy=symbol=>{
 const item=(opportunityItems||[]).find(a=>a.symbol===symbol);
 if(!item||!signal(item).ready){alert('A recent usable quote is required. Reload market data.');return;}
 showForm('<form id="stock-paypal-form"><h2>PayPal Sandbox · Demo purchase</h2><p>Test payment for '+esc(symbol)+' using PayPal Sandbox. No real money or real shares.</p><label>US stock</label><input value="'+esc(symbol)+'" readonly><label for="stock-paypal-amount">Test amount (USD)</label><input id="stock-paypal-amount" name="amount" type="number" min="1" max="10000" step="0.01" required placeholder="e.g. 10.00"><label style="display:flex;gap:8px;align-items:start;margin:12px 0"><input id="stock-paypal-consent" type="checkbox" required style="width:auto;margin-top:4px">I understand this uses PayPal Sandbox test funds, not real money or securities.</label><p class="sandbox-notice">The amount and quantity will be calculated from a refreshed quote. PayPal Sandbox approval opens after you confirm.</p><p id="stock-paypal-status" role="status"></p><div class="actions"><button class="secondary" type="button" onclick="closeForm()">Cancel</button><button class="primary" type="submit">Continue to PayPal Sandbox</button></div></form>');
 const form=document.getElementById('stock-paypal-form');
 form.onsubmit=async e=>{
   e.preventDefault();if(!form.reportValidity())return;
   const button=form.querySelector('button[type="submit"]'),status=document.getElementById('stock-paypal-status');
   button.disabled=true;status.textContent='Fetching fresh quote and creating PayPal Sandbox checkout…';
   try{
     const amount=Number(document.getElementById('stock-paypal-amount').value);
     if(!Number.isFinite(amount)||amount<1||amount>10000)throw Error('Enter a test amount between USD 1 and 10,000.');
     const preview=await sandboxCall('preview',{symbol,amount_usd:amount});
     if(!preview.draft?.id)throw Error('Could not create a demo review.');
     sandboxOrders=[preview.draft,...sandboxOrders].slice(0,30);
     const payment=await sandboxCall('create',{draft_id:preview.draft.id});
     const url=new URL(payment.approval_url);
     if(url.origin!=='https://www.sandbox.paypal.com')throw Error('Unexpected PayPal destination.');
     location.assign(url.href);
   }catch(error){status.textContent=error.message||'Sandbox checkout is unavailable.';button.disabled=false;}
 };
 document.getElementById('stock-paypal-amount')?.focus();
};
window.montraStockExplain=symbol=>{
 const item=(opportunityItems||[]).find(a=>a.symbol===symbol);
 if(!item)return;
 const x=signal(item);
 // Navigate to the existing chat, but do not inject a message or trigger a purchase.
 navigate('ai-chat');
 const input=document.getElementById('montra-chat-input');
 if(input){input.value='Explain the risks and research considerations for '+symbol+'. Quote: '+(x.ready?fmtUSD(item.price):'unavailable')+'. Do not invent current prices or tell me to buy.';input.focus();}
};
const previous=render;
render=function(){previous();if(!user||page!=='stock-recommendations')return;
 document.querySelectorAll('[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page==='stock-recommendations'));
 const crumb=document.getElementById('crumb');if(crumb)crumb.textContent='Stock Recommendations';
 const app=document.getElementById('app');if(app)app.innerHTML=pageHTML();
};
})();