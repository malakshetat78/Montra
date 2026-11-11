/* Demo-only portfolio performance. Uses actual provider quotes when available. */
(()=>{
const usd=n=>'USD '+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
function performanceHTML(){
 const orders=(sandboxOrders||[]).filter(o=>['demo_completed','simulated_filled'].includes(o.status));
 if(!orders.length)return '<section class="card panel"><h3>Demo Portfolio Performance</h3><p>No completed demo stock purchases yet. Use Buy · Demo only to create one.</p></section>';
 const quotes=new Map((opportunityItems||[]).filter(a=>!a.unavailable&&!a.stale&&Number(a.price)>0&&Number.isFinite(Date.parse(a.quote_time))&&Date.now()-Date.parse(a.quote_time)<(a.closed?7:1)*86400000).map(a=>[a.symbol,a]));
 const groups=new Map();
 for(const o of orders){
   const symbol=String(o.symbol||'').toUpperCase(),quantity=Number(o.quantity),cost=Number(o.amount_usd);
   if(!symbol||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(cost)||cost<0)continue;
   const g=groups.get(symbol)||{symbol,shares:0,cost:0,orders:0};
   g.shares+=quantity;g.cost+=cost;g.orders++;groups.set(symbol,g);
 }
 let coveredCost=0,marketValue=0,covered=0;
 const rows=[...groups.values()].map(g=>{
   const q=quotes.get(g.symbol),value=q?g.shares*Number(q.price):null;
   if(value!==null){coveredCost+=g.cost;marketValue+=value;covered++;}
   const gain=value===null?null:value-g.cost;
   return '<tr><td>'+esc(g.symbol)+'</td><td>'+g.shares.toLocaleString('en-US',{maximumFractionDigits:8})+'</td><td>'+usd(g.cost)+'</td><td>'+(value===null?'Quote unavailable':usd(value))+'</td><td>'+(gain===null?'N/A':(gain>=0?'+':'')+usd(gain)+' ('+(g.cost>0?(gain/g.cost*100).toFixed(2)+'%':'N/A')+')')+'</td></tr>';
 }).join('');
 const gain=marketValue-coveredCost;
 return '<section class="card panel" id="demo-performance"><div class="cardhead"><div><h3>Demo Portfolio Performance</h3><p>Unrealized simulated gain/loss using available market quotes</p></div><span class="pill">Demo · USD</span></div>'+
 '<div class="investment-summary"><section class="card investment-stat"><span>Cost of priced positions</span><h2>'+usd(coveredCost)+'</h2></section><section class="card investment-stat"><span>Estimated market value</span><h2>'+usd(marketValue)+'</h2></section><section class="card investment-stat"><span>Unrealized P/L</span><h2>'+(covered?(gain>=0?'+':'')+usd(gain):'N/A')+'</h2><small>'+(covered&&coveredCost>0?(gain/coveredCost*100).toFixed(2)+'%':'No priced positions')+'</small></section></div>'+
 '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr><th>Stock</th><th>Demo shares</th><th>Demo cost</th><th>Estimated value</th><th>Unrealized P/L</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<p class="plan-note">Priced positions: '+covered+' of '+groups.size+'. Missing or stale quotes are excluded from totals, not treated as zero. Source: Twelve Data via Montra market exploration. Market quotes can be delayed; fees, spreads and dividends are excluded. This is not real investment performance.</p></section>';
}
const oldRender=render;
render=function(){
 oldRender();
 if(!user||!['investments','stock-recommendations'].includes(page))return;
 const app=document.getElementById('app');if(!app)return;
 const block=document.createElement('div');block.innerHTML=performanceHTML();
 const node=block.firstElementChild;
 if(node)app.appendChild(node);
};
})();