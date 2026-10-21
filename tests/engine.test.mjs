import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,nextHand,act,amountToCall,botMove,maxRaiseTo,minRaiseTo,cardText,evaluateHand,compareValues,deckOfCards} from '../src/engine.ts';
const c=(rank,suit)=>({rank,suit});
test('52 unique cards',()=>assert.equal(new Set(deckOfCards().map(cardText)).size,52));
test('ace-low wheel straight',()=>{
 const v=evaluateHand([c(14,'♠'),c(2,'♦'),c(3,'♣'),c(4,'♥'),c(5,'♠')]);
 assert.deepEqual(v.score,[4,5]);
});
test('picks best five of seven and handles royal flush',()=>{
 const v=evaluateHand([c(14,'♠'),c(13,'♠'),c(12,'♠'),c(11,'♠'),c(10,'♠'),c(2,'♥'),c(4,'♦')]);
 assert.deepEqual(v.score,[8,14]);
});
test('full house outranks flush and wins ties by triples first',()=>{
 const a=evaluateHand([c(14,'♠'),c(14,'♣'),c(14,'♥'),c(3,'♠'),c(3,'♦')]);
 const b=evaluateHand([c(13,'♠'),c(13,'♣'),c(13,'♥'),c(14,'♦'),c(14,'♠')]);
 assert.equal(compareValues(a,b),1);
 const flush=evaluateHand([c(2,'♠'),c(4,'♠'),c(6,'♠'),c(8,'♠'),c(10,'♠')]);
 assert.equal(compareValues(a,flush),1);
});
test('dealing/rounds conserve chips and never duplicate visible cards',()=>{
 for(let match=0;match<20;match++) {
  let s=newMatch();
  for(let step=0;step<450;step++){
   if(s.result){if(s.matchOver) break;s=nextHand(s);continue;}
   const id=s.actor;
   assert.ok(id);
   const action=id==='bot'?botMove(s):(() => {
      const roll=Math.random(),call=amountToCall(s,'hero');
      if(roll<.09)return {kind:'fold'};
      if(roll<.20 && maxRaiseTo(s,'hero')>s.currentBet)return {kind:'raise',to:Math.min(minRaiseTo(s),maxRaiseTo(s,'hero'))};
      return {kind:call?'call':'check'};
   })();
   const next=act(s,id,action);
   assert.notEqual(next,s,`Action should be legal: ${JSON.stringify(action)}`);
   s=next;
   assert.equal(s.players.hero.stack+s.players.bot.stack+s.pot,2000);
   const visible=[...s.players.hero.hand,...s.players.bot.hand,...s.board,...s.deck].map(cardText);
   assert.equal(new Set(visible).size,visible.length);
  }
 }
});
