const assert=require('node:assert/strict');const test=require('node:test');const a=require('../financial-assistant.js');
const data={expenses:[{date:'2026-11-02',amount:200,category:'Food'},{date:'2026-11-05',amount:100,category:'Travel'},{date:'2026-10-05',amount:100,category:'Food'}],income:1000,goals:[{name:'Laptop',target:1000,saved:250}]};
test('totals and top category use recorded transactions',()=>{const s=a.summarize(data,'2026-11');assert.equal(s.current,300);assert.equal(s.categories[0][0],'Food');});
test('comparison includes both recorded months',()=>assert.match(a.answer('compare last month',data,{month:'2026-11'}).text,/up EGP 200/));
test('goal progress is factual',()=>assert.match(a.answer('savings goal',data,{month:'2026-11'}).text,/EGP 750/));
test('no data never fabricates spending',()=>assert.match(a.answer('top category',{expenses:[]},{month:'2026-11'}).text,/No expenses/));
test('invalid negative amounts do not inflate totals',()=>assert.equal(a.summarize({expenses:[{date:'2026-11-01',amount:-50}]},'2026-11').current,0));
