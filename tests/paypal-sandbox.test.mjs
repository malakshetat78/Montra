import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../supabase/functions/montra-paypal-sandbox/validation.js',import.meta.url),'utf8');
const {usdAmount,approvalURL,verifiedCapture}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(usdAmount('10.10'),'10.10');for(const value of [0,-1,10001,1.001,Infinity,'bad'])assert.throws(()=>usdAmount(value));
assert.equal(approvalURL({links:[{rel:'approve',href:'https://www.sandbox.paypal.com/checkoutnow?token=demo'}]}),'https://www.sandbox.paypal.com/checkoutnow?token=demo');
for(const url of ['https://www.paypal.com/checkoutnow','https://evil.example/checkout','https://www.sandbox.paypal.com.evil.example/checkout','javascript:alert(1)'])assert.throws(()=>approvalURL({links:[{rel:'approve',href:url}]}));
const draft={id:'draft',paypal_order_id:'ORDER',amount_usd:10};const order={id:'ORDER',status:'COMPLETED',purchase_units:[{custom_id:'draft',payments:{captures:[{id:'CAP',status:'COMPLETED',amount:{currency_code:'USD',value:'10.00'}}]}}]};assert.equal(verifiedCapture(order,draft),'CAP');
for(const mutate of [x=>x.status='APPROVED',x=>x.id='OTHER',x=>x.purchase_units[0].custom_id='other',x=>x.purchase_units[0].payments.captures[0].status='PENDING',x=>x.purchase_units[0].payments.captures[0].amount.value='9.99',x=>x.purchase_units[0].payments.captures[0].amount.currency_code='EUR',x=>x.purchase_units[0].payments.captures.push(x.purchase_units[0].payments.captures[0])]){const copy=structuredClone(order);mutate(copy);assert.throws(()=>verifiedCapture(copy,draft));}
console.log('Sandbox URL restriction, exact amounts, order identity and pending/partial/mismatched captures passed.');
