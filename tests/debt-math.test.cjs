const {test}=require('node:test'),assert=require('node:assert/strict'),{summary,cents}=require('../debt-math.js');
test('tracks partial repayment exactly',()=>assert.deepEqual(summary(1000,[{amount:250.25},{amount:49.75}]),{total:1000,paid:300,remaining:700,overpaid:false,progress:30}));
test('rejects invalid currency amounts',()=>{for(const n of [-1,NaN,'',1.001])assert.throws(()=>cents(n))});
test('flags overpayment',()=>{const x=summary(100,[{amount:110}]);assert.equal(x.overpaid,true);assert.equal(x.remaining,0)});
