/* Stock Recommendations: research watchlist, not automated financial advice. */
(()=>{
let loading=false,error='',loaded=false;
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
 '<div class="card panel"><div class="cardhead"><div><h2>Stock Recommendations</h2><p>Research watchlist with market quotes, reasons and risks. No automatic purchases.</p></div><span class="pill">Research only</span></div>'+
 '<p class="plan-note">These are provider-supplied US market examples, not personalized buy orders or a ranked list. Price movements alone cannot establish a good entry price. Quotes can be delayed. Egyptian market coverage is not connected.</p>'+
 '<button class="primary" type="button" onclick="montraRefreshStockWatch()" '+(loading?'disabled':'')+'>'+(loading?'Checking quotes…':'Analyze available US stocks')+'</button>'+
 (error?'<p role="alert" class="warning">'+esc(error)+'</p>':'')+
 (!loaded?'<p class="muted">Press Analyze to load current available examples.</p>':'')+
 '</div>'+
 (loaded&&!loading?(!items.length?'<div class="card panel"><p>No market data available. Try again later.</p></div>':items.map(a=>{const x=signal(a);return '<article class="card panel" style="display:grid;gap:9px"><div class="cardhead"><div><h3>'+esc(a.name||a.symbol)+' <small>'+esc(a.symbol)+'</small></h3><p>'+esc(a.type||'Market instrument')+'</p></div><span class="pill">'+esc(x.label)+'</span></div><h3>'+(x.ready?fmtUSD(a.price):'Price unavailable')+'</h3><p><b>Why:</b> '+esc(x.why)+'</p><p><b>Risk:</b> '+esc(x.risk)+'</p><p><b>Source:</b> Twelve Data · '+esc(String(a.quote_time||'Timestamp unavailable'))+(a.closed?' · Market closed':'')+'</p><button type="button" class="inlinebtn" onclick="montraStockExplain('+JSON.stringify(String(a.symbol)).replace(/"/g,'&quot;')+')">Ask Montra AI about this stock</button></article>'}).join('')):'')+
 '<div class="card panel"><p class="muted">Educational research, not a recommendation to buy, sell or hold. Review your risk tolerance, emergency savings, investment horizon and independent sources before deciding.</p></div></div>';
}
window.montraRefreshStockWatch=async()=>{
 if(loading)return;loading=true;error='';render();
 try{const data=await sandboxCall('explore');opportunityItems=Array.isArray(data.items)?data.items:[];loaded=true;}catch(e){error=e.message||'Market data could not be loaded';loaded=false;}
 finally{loading=false;if(page==='stock-recommendations')render();}
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