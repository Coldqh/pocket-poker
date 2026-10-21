import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch,nextHand,act,amountToCall,botMove,maxRaiseTo,minRaiseTo,potFractionRaiseTo,cardText,evaluateHand,compareValues,deckOfCards} from '../src/engine.ts';
const c=(rank,suit)=>({rank,suit});
test('52 unique cards',()=>assert.equal(new Set(deckOfCards().map(cardText)).size,52));
test('ace-low wheel straight',()=>assert.deepEqual(evaluateHand([c(14,'♠'),c(2,'♦'),c(3,'♣'),c(4,'♥'),c(5,'♠')]).score,[4,5]));
test('best five of seven, including a royal flush',()=>assert.deepEqual(evaluateHand([c(14,'♠'),c(13,'♠'),c(12,'♠'),c(11,'♠'),c(10,'♠'),c(2,'♥'),c(4,'♦')]).score,[8,14]));
test('full house beats flush, highest triple breaks ties',()=>{
 const a=evaluateHand([c(14,'♠'),c(14,'♣'),c(14,'♥'),c(3,'♠'),c(3,'♦')]);
 const b=evaluateHand([c(13,'♠'),c(13,'♣'),c(13,'♥'),c(14,'♦'),c(14,'♠')]);
 const flush=evaluateHand([c(2,'♠'),c(4,'♠'),c(6,'♠'),c(8,'♠'),c(10,'♠')]);
 assert.equal(compareValues(a,b),1);assert.equal(compareValues(a,flush),1);
});
function verifyState(s,count){
 assert.equal(s.order.length,count+1);
 assert.equal(s.order.reduce((n,id)=>n+s.players[id].stack,0)+s.pot,(count+1)*1000,'chips must be conserved across every action');
 const all=[...s.deck,...s.board,...s.order.flatMap(id=>s.players[id].hand)];
 assert.equal(new Set(all.map(cardText)).size,all.length,'unique cards');
 assert.ok(s.players.hero.stack>=0,'nonnegative hero stack');
 assert.ok(s.order.every(id=>s.players[id].stack>=0));
}
test('2–6 players: 30 random sessions with folds, raises and all-ins; players can continue at same table',()=>{
 for(let opponents=1;opponents<=5;opponents++){
  for(let match=0;match<30;match++){
   let s=newMatch(opponents);
   verifyState(s,opponents);
   let progressed=0;
   for(let step=0;step<800;step++){
    if(s.result){
      const old=s;
      s=nextHand(s);
      verifyState(s,opponents);
      if(old.matchOver){assert.equal(s.handNumber,1);progressed++;break;}
      assert.equal(s.handNumber,old.handNumber+1);
      progressed++;
      continue;
    }
    const id=s.actor;assert.ok(id, 'unfinished hand must have an actor');
    let action;
    if(id!=='hero') action=botMove(s,id);
    else {
      const roll=Math.random(),toCall=amountToCall(s,id),max=maxRaiseTo(s,id);
      if(roll<.12)action={kind:'fold'};
      else if(roll<.40 && max>s.currentBet){
        const to=roll<.23?max:Math.min(minRaiseTo(s),max);
        action={kind:'raise',to};
      } else action={kind:toCall?'call':'check'};
    }
    const next=act(s,id,action);
    assert.notEqual(next,s,`Legal action expected: ${id} ${JSON.stringify(action)} / ${JSON.stringify({street:s.street,currentBet:s.currentBet,stack:s.players[id].stack,streetBet:s.players[id].streetBet})}`);
    s=next;verifyState(s,opponents);
   }
   assert.ok(progressed>0||s.matchOver||s.handNumber>1,'game should make progress');
  }
 }
});
test('short stack all-in does not reopen a previously closed raise',()=>{
 let s=newMatch(2);
 // Hero opened, bot-1 calls, bot-2 still to act: partial all-in could be simulated
 // by giving bot-2 a short stack (and refunding the removed chips to bot-1).
 s.players['bot-2'].stack=30;s.players['bot-1'].stack+=970;
 // Since the previous blinds have already been posted, short all-in is to 50.
 s=act(s,'hero',{kind:'raise',to:40});
 assert.equal(s.actor,'bot-1');
 s=act(s,'bot-1',{kind:'call'});
 assert.equal(s.actor,'bot-2');
 s=act(s,'bot-2',{kind:'raise',to:50});
 assert.equal(s.actor,'hero');
 assert.equal(maxRaiseTo(s,'hero'),s.currentBet);
 s=act(s,'hero',{kind:'call'});
 assert.equal(s.actor,'bot-1');
 assert.equal(maxRaiseTo(s,'bot-1'),s.currentBet);
});

test('pot-sized raise includes outstanding call; 10/20 blinds from small blind',()=>{
 const s=newMatch(1);assert.equal(s.actor,'hero');
 assert.equal(s.pot,30);assert.equal(amountToCall(s,'hero'),10);
 assert.equal(potFractionRaiseTo(s,'hero',1),60);
 assert.equal(potFractionRaiseTo(s,'hero',.5),40);
 const raised=act(s,'hero',{kind:'raise',to:potFractionRaiseTo(s,'hero',1)});
 assert.notEqual(raised,s);assert.equal(raised.currentBet,60);
});
test('pot fraction presets always respect min and max raise limits',()=>{
 let s=newMatch(1);
 for(const fraction of [.33,.5,1,1.5,4]) {
  const value=potFractionRaiseTo(s,'hero',fraction);
  assert.ok(value>=Math.min(minRaiseTo(s),maxRaiseTo(s,'hero')));
  assert.ok(value<=maxRaiseTo(s,'hero'));
 }
 s.players.hero.stack=15;
 assert.equal(potFractionRaiseTo(s,'hero',1),25);
});

import {chipInventoryTotal, DEFAULT_STARTING_CHIPS} from '../src/chips.ts';
test('real denominations remain balanced through an entire 3-player hand',()=>{
 let s=newMatch(2,{500:0,100:6,25:12,5:16,1:20});
 assert.equal(s.players.hero.stack,1000);
 for(let i=0;i<200&&!s.result;i++){
   const id=s.actor;
   assert.ok(id);
   s=act(s,id,{kind:amountToCall(s,id)>0?'call':'check'});
   assert.equal(s.order.reduce((total,p)=>total+chipInventoryTotal(s.players[p].chips),0)+chipInventoryTotal(s.potChips),3000);
   for(const p of s.order)assert.equal(chipInventoryTotal(s.players[p].chips),s.players[p].stack);
   assert.equal(chipInventoryTotal(s.potChips),s.pot);
 }
 assert.ok(s.result);
 assert.equal(s.order.reduce((total,p)=>total+chipInventoryTotal(s.players[p].chips),0),3000);
 const next=nextHand(s);
 assert.equal(next.handNumber,2);
 assert.equal(chipInventoryTotal(next.startingChips),chipInventoryTotal(DEFAULT_STARTING_CHIPS));
});
