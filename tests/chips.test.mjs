import assert from 'node:assert/strict';
import test from 'node:test';
import {breakdownChips,chipsTotal,collectedPot} from '../src/chips.ts';

test('casino denominations are exact, including small remainders', () => {
  for (let amount=0;amount<=6000;amount++) {
    const groups=breakdownChips(amount);
    assert.equal(chipsTotal(groups),amount);
    assert.ok(groups.every(({count})=>count>0));
  }
  assert.deepEqual(breakdownChips(1136),[
    {value:500,count:2},{value:100,count:1},
    {value:25,count:1},{value:5,count:2},{value:1,count:1}
  ]);
});

test('pot chips and uncollected bets add up to the displayed total', () => {
  assert.equal(collectedPot(30,[10,20]),0);
  assert.equal(collectedPot(130,[25,25,0]),80);
  assert.equal(collectedPot(500,[0,0,0]),500);
  assert.throws(()=>collectedPot(15,[10,20]),RangeError);
});
