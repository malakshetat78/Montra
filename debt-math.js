(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MontraDebtMath=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
function cents(v){if(typeof v==='string'&&v.trim()==='')throw Error('Amount required');const n=Number(v);if(!Number.isFinite(n)||n<0||Math.round(n*100)/100!==n)throw Error('Invalid amount');return Math.round(n*100)}
function summary(principal,payments){const total=cents(principal);let paid=0;for(const p of payments){const amount=cents(p.amount);if(amount<=0)throw Error('Payment must be positive');paid+=amount;}return {total:total/100,paid:paid/100,remaining:Math.max(0,total-paid)/100,overpaid:paid>total,progress:total?Math.min(100,Math.round(paid/total*100)):100};}
return {cents,summary};
});
