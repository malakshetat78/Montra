(function(root){
function scenario({target,saved,monthly,budget,change}){for(const v of [target,saved,monthly,budget,change])if(!Number.isFinite(Number(v)))throw new Error('Invalid scenario');if(target<=0||saved<0||monthly<0||budget<=0||Math.abs(change)>100)throw new Error('Invalid scenario');const gain=budget*change/100,remaining=Math.max(0,target-saved),after=Math.max(0,target-saved-gain);return {gain,value:budget+gain,baselineMonths:remaining===0?0:monthly>0?Math.ceil(remaining/monthly):null,scenarioMonths:after===0?0:monthly>0?Math.ceil(after/monthly):null};}
root.MontraOpportunities={scenario};
})(globalThis);
