/* Read-only reports and conservative cash-flow estimates. No database writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MontraReports=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const finite=x=>Number.isFinite(Number(x))?Number(x):0;
const dateKey=d=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const monthKey=d=>dateKey(d).slice(0,7);
function report(expenses,selectedMonth){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth))throw Error('Invalid month');const rows=(expenses||[]).filter(x=>String(x.date||x.expense_date||'').slice(0,7)===selectedMonth);const categories={};for(const x of rows){const category=String(x.category||'Other');categories[category]=(categories[category]||0)+Math.max(0,finite(x.amount))}return {month:selectedMonth,count:rows.length,total:Object.values(categories).reduce((a,b)=>a+b,0),categories,rows};}
function forecast({expenses=[],monthlyIncome=0,incomes=[],commitments=[],start=new Date(),days=90,openingBalance=null}){
 if(!(start instanceof Date)||Number.isNaN(start.getTime())||!Number.isInteger(days)||days<1||days>366)throw Error('Invalid forecast window');
 const today=new Date(start.getFullYear(),start.getMonth(),start.getDate());
 // Historical expenses are used to estimate future variable spending; recorded payments are not re-posted.
 const first=new Date(today.getFullYear(),today.getMonth()-3,1);const history=expenses.filter(x=>{const d=String(x.date||x.expense_date||'');return d>=dateKey(first)&&d<dateKey(today)});
 const variable=history.filter(x=>!x.recurring_rule_id&&!x.commitment_id);
 const historicalMonths=new Set(variable.map(x=>String(x.date||x.expense_date).slice(0,7)));
 const months=Math.max(1,historicalMonths.size);
 const avgVariable=variable.reduce((s,x)=>s+Math.max(0,finite(x.amount)),0)/months;
 const fixed=(commitments||[]).filter(x=>x.active!==false).reduce((s,x)=>s+Math.max(0,finite(x.amount)),0);
 // Monthly income sources may already be included in the profile's total. Never add both.
 const sources=(incomes||[]).reduce((s,x)=>s+Math.max(0,finite(x.amount)),0);
 const income=Math.max(0,finite(monthlyIncome))||sources;
 const netMonthly=income-avgVariable-fixed;
 const projections=[30,60,90].filter(d=>d<=days).map(d=>({days:d,netChange:Math.round(netMonthly*d/30.4375*100)/100,projectedBalance:openingBalance===null?null:Math.round((finite(openingBalance)+netMonthly*d/30.4375)*100)/100}));
 return {income,avgVariable,fixed,netMonthly,projections,historyCount:history.length,historyMonths:historicalMonths.size,assumptions:'Estimated from up to 3 calendar months of recorded non-recurring expenses, current monthly income and commitments. Commitments may overlap expenses; verify before relying on results. No actual bank balance is available.'};
}
function csv(reportData){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\uFEFF'+[['Month','Category','Amount'],...Object.entries(reportData.categories).sort((a,b)=>b[1]-a[1]).map(([category,amount])=>[reportData.month,category,amount.toFixed(2)])].map(row=>row.map(q).join(',')).join('\r\n')+'\r\n'}
return {report,forecast,csv,monthKey,dateKey};
});
