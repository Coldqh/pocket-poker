import test from 'node:test';
import assert from 'node:assert/strict';
import {potOddsRequired,facingBetOdds,chanceToImprove,simplifiedCallEV,decodeCard,evaluateBuiltHand,compareBuiltHands,LAB_CARD_OPTIONS} from '../src/lab.ts';

test('pot odds and EV for a simple call agree exactly',()=>{
  assert.equal(potOddsRequired(120,60),.25);
  assert.equal(facingBetOdds(180,60),.25);
  assert.ok(Math.abs(simplifiedCallEV(120,60,.25))<1e-10);
  assert.ok(simplifiedCallEV(120,60,.19)<0);
  assert.ok(simplifiedCallEV(120,60,.3)>0);
});
test('clean outs across turn and flop, including zero and all',()=>{
  assert.ok(Math.abs(chanceToImprove(9,46,1)-9/46)<1e-12);
  assert.ok(Math.abs(chanceToImprove(9,47,2)-(1-38/47*37/46))<1e-12);
  assert.equal(chanceToImprove(0,47,2),0);
  assert.equal(chanceToImprove(47,47,1),1);
  assert.throws(()=>chanceToImprove(48,47,1),RangeError);
  assert.throws(()=>potOddsRequired(100,0),RangeError);
});
test('deck options are all distinct, with readable face cards',()=>{
  assert.equal(LAB_CARD_OPTIONS.length,52);
  assert.equal(new Set(LAB_CARD_OPTIONS).size,52);
  assert.deepEqual(decodeCard('A♠'),{rank:14,suit:'♠'});
  assert.deepEqual(decodeCard('10♥'),{rank:10,suit:'♥'});
  assert.equal(decodeCard('17♠'),null);
});
test('builder evaluates five-to-seven cards without inventing draws',()=>{
 assert.equal(evaluateBuiltHand(['A♠','K♠'],['Q♠','J♠','10♠']),'Стрит-флеш');
 assert.equal(evaluateBuiltHand(['A♠','K♠'],['2♦','4♦']),null);
 assert.equal(evaluateBuiltHand(['A♠','K♠'],['A♠','J♠','10♠']),null);
});
test('builder determines winner or tie only with a full distinct board',()=>{
 const board=['2♥','3♥','4♥','5♥','6♥'];
 assert.equal(compareBuiltHands(['A♠','A♣'],['K♣','Q♣'],board),0);
 assert.equal(compareBuiltHands(['A♠','A♣'],['K♣','Q♣'],['2♦','7♠','J♥','3♣','9♦']),1);
 assert.equal(compareBuiltHands(['A♠','A♣'],['K♣','Q♣'],['2♦','7♠','J♥','3♣']),null);
});
