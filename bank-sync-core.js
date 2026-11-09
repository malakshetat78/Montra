/* Montra demo connector. Never connects to banks or PayPal. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MontraBankSync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SOURCES=['egypt_bank_mock','paypal_mock'];
const samples={
 egypt_bank_mock:[['EG-BANK-1001','2026-11-01','Supermarket purchase',-450,'EGP'],['EG-BANK-1002','2026-11-03','Taxi ride',-120,'EGP'],['EG-BANK-1003','2026-11-05','Salary transfer',15000,'EGP'],['EG-BANK-1004','2026-11-07','Mobile bill',-230,'EGP']],
 paypal_mock:[['PP-DEMO-2001','2026-11-02','Digital subscription',-200,'USD'],['PP-DEMO-2002','2026-11-06','Online store purchase',-35.5,'USD'],['PP-DEMO-2003','2026-11-08','Refund from merchant',35.5,'USD']]
};
function category(desc){const s=String(desc).toLowerCase();if(/supermarket|grocery/.test(s))return 'Groceries';if(/taxi|ride|transport/.test(s))return 'Transportation';if(/subscription|mobile|bill/.test(s))return 'Bills & subscriptions';if(/store|purchase/.test(s))return 'Shopping';return 'Other';}
function normalize(source,entry){if(!SOURCES.includes(source))throw Error('Unsupported demo source');const [external_id,booked_on,description,amount,currency]=entry;if(!/^[A-Z0-9-]{4,80}$/.test(external_id)||!/^\d{4}-\d{2}-\d{2}$/.test(booked_on)||!Number.isFinite(amount)||amount===0||!['EGP','USD'].includes(currency))throw Error('Invalid demo transaction');return {external_id,booked_on,description,amount,currency,direction:amount<0?'expense':'income',category:category(description)};}
function demo(source){if(!samples[source])throw Error('Unknown demo source');return samples[source].map(e=>normalize(source,e));}
function unique(existing,incoming){const seen=new Set(existing.map(x=>`${x.account_id}:${x.external_id}`));return incoming.filter(x=>{const k=`${x.account_id}:${x.external_id}`;if(seen.has(k))return false;seen.add(k);return true;});}
return {SOURCES,demo,unique,category};
});
