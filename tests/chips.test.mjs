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

import {DEFAULT_STARTING_CHIPS, chipInventoryTotal, copyInventory, emptyInventory, inventoryFromAmount, moveChips, makeChangeForAmount,canPayChips,exchangeOneChip,validStartingChips} from '../src/chips.ts';

test('custom starting chips keep exact purchasing power',()=>{
  assert.equal(chipInventoryTotal(DEFAULT_STARTING_CHIPS),1000);
  assert.ok(validStartingChips(DEFAULT_STARTING_CHIPS));
  assert.equal(validStartingChips(emptyInventory()),false);
  assert.equal(chipInventoryTotal({500:2,100:6,25:12,5:16,1:20}),2000);
});

test('casino makes change without losing value, even from many high-value chips',()=>{
  const from={500:150,100:0,25:0,5:0,1:0},to=emptyInventory();
  assert.equal(canPayChips(from,1),false);
  assert.throws(()=>moveChips(from,to,1),RangeError);
  for(let i=0;i<25;i++){assert.equal(makeChangeForAmount(from,1),true);moveChips(from,to,1);assert.equal(chipInventoryTotal(from)+chipInventoryTotal(to),75000);}
  assert.equal(chipInventoryTotal(to),25);
  assert.equal(makeChangeForAmount(from,333),true);
  moveChips(from,to,333);
  assert.equal(chipInventoryTotal(to),358);
  assert.equal(chipInventoryTotal(from),75000-358);
  assert.throws(()=>moveChips(from,to,80000),RangeError);
});

test('chip inventory reconciles for fractional betting and returns',()=>{
  const a=copyInventory(DEFAULT_STARTING_CHIPS),pot=emptyInventory();
  for(const value of [10,20,33,41,70,9,117,1,250]){
    if(!canPayChips(a,value))assert.equal(makeChangeForAmount(a,value),true);
    moveChips(a,pot,value);
  }
  assert.equal(chipInventoryTotal(a)+chipInventoryTotal(pot),1000);
  const outcome=emptyInventory();
  if(!canPayChips(pot,250))makeChangeForAmount(pot,250);
  moveChips(pot,outcome,250);
  moveChips(pot,outcome,chipInventoryTotal(pot));
  assert.equal(chipInventoryTotal(pot),0);
  assert.equal(chipInventoryTotal(a)+chipInventoryTotal(outcome),1000);
  assert.equal(chipInventoryTotal(inventoryFromAmount(1234)),1234);
});

test('manual exchange preserves denominations until user requests a split',()=>{
 const chips={500:0,100:0,25:0,5:10,1:0},pot=emptyInventory();
 assert.equal(canPayChips(chips,50),true);
 moveChips(chips,pot,50);
 assert.equal(pot[5],10);
 assert.equal(pot[100],0);
 assert.equal(pot[25],0);
 const manual={500:0,100:1,25:0,5:0,1:0};
 assert.equal(canPayChips(manual,25),false);
 assert.equal(exchangeOneChip(manual,100),true);
 assert.equal(manual[25],4);
 assert.equal(canPayChips(manual,25),true);
 assert.equal(chipInventoryTotal(manual),100);
});
