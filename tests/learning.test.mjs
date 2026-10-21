import test from 'node:test';
import assert from 'node:assert/strict';
import {modules} from '../src/lessons.ts';
import {decodeCard} from '../src/lab.ts';

test('introductory practice has three short, playable scenarios',()=>{
 const intro=modules[0];
 assert.equal(intro.id,'firstmoves');
 assert.equal(intro.scenarios.length,3);
 assert.equal(intro.scenarios[0].correct,2);
 assert.equal(intro.scenarios[1].correct,0);
 assert.equal(intro.scenarios[2].correct,1);
});
test('every learning scenario has an answer, cards and an explanation',()=>{
 const ids=new Set();
 for(const module of modules){
  assert.ok(module.theory.length>=1, module.id);
  for(const spot of module.scenarios){
   assert.ok(!ids.has(spot.id),'duplicate '+spot.id);
   ids.add(spot.id);
   assert.ok(spot.choices.length>=2);
   assert.ok(spot.correct>=0&&spot.correct<spot.choices.length);
   assert.ok(spot.context.length>=30);
   assert.ok(spot.explanation.length>=30);
   const cards=[...(spot.hand??[]),...(spot.board??[])];
   assert.equal(cards.length,new Set(cards).size,spot.id+' duplicate cards');
   for(const card of cards)assert.ok(decodeCard(card),'invalid card '+card);
  }
 }
});
