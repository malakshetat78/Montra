// Pure portfolio calculations. All amounts use one selected ledger currency.
(function(root){
function position(a){const quantity=Number(a.quantity),price=Number(a.unit_price),automatic=a.quote_source&&a.quote_source!=='manual';const valued=Number.isFinite(price)&&price>=0&&(!automatic||Boolean(a.price_updated_at));const value=valued?quantity*price:null;const known=a.purchase_price!==null&&a.purchase_price!==undefined&&a.purchase_price!==''&&Number.isFinite(Number(a.purchase_price));const cost=known?quantity*Number(a.purchase_price)+Number(a.purchase_fees||0):null;const gain=known&&valued?value-cost:null;return {value,cost,gain,percent:gain!==null&&cost>0?gain/cost*100:null,valued,known};}
function portfolio(assets){return assets.reduce((t,a)=>{const p=position(a);if(p.valued)t.value+=p.value;else t.pending++;if(p.known)t.cost+=p.cost;else t.unknown++;if(p.gain!==null){t.gain+=p.gain;t.comparableCost+=p.cost;t.comparable++;}return t;},{value:0,cost:0,gain:0,comparableCost:0,comparable:0,pending:0,unknown:0});}
root.MontraInvestments={position,portfolio};
})(globalThis);
