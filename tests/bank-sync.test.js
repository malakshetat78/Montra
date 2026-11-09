const assert=require('node:assert/strict');const test=require('node:test');const sync=require('../bank-sync-core.js');
test('demo data is deterministic and has separate currencies',()=>{assert.equal(sync.demo('egypt_bank_mock').length,4);assert.equal(sync.demo('paypal_mock').length,3);assert.equal(sync.demo('egypt_bank_mock')[0].currency,'EGP');});
test('transactions have explicit direction and category',()=>{const bank=sync.demo('egypt_bank_mock');assert.equal(bank[0].direction,'expense');assert.equal(bank[2].direction,'income');assert.equal(bank[0].category,'Groceries');});
test('duplicate external IDs per account are filtered',()=>{const row={account_id:'a',external_id:'x'};assert.equal(sync.unique([row],[row,{account_id:'b',external_id:'x'}]).length,1);assert.equal(sync.unique([], [row,row]).length,1);});
test('invalid provider rejected',()=>assert.throws(()=>sync.demo('real_bank')));
