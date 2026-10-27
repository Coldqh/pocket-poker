import test from 'node:test';
import assert from 'node:assert/strict';
import {act,amountToCall,exchangeForBet,minRaiseTo,newMatch,nextHand,hydrateGameChips} from '../src/engine.ts';
import {captureDecisionTable,decisionsForHand,DECISION_HISTORY_VERSION} from '../src/decision-history.ts';
import {restoreSavedGame} from '../src/save-state.ts';

function heroCall(s){
 const owed=amountToCall(s,'hero');
 if(owed&&!s.players.hero.chips[1])s=exchangeForBet(s,'hero',owed);
 return act(s,'hero',{kind:owed?'call':'check'});
}

test('first action contains accurate BEFORE and AFTER with no opponent private cards',()=>{
 const start=newMatch(2);
 const actor=start.actor;
 assert.ok(actor);
 const before=captureDecisionTable(start);
 const after=act(start,actor,{kind:'fold'});
 const event=after.decisionEvents[0];
 assert.equal(event.version,DECISION_HISTORY_VERSION);
 assert.equal(event.sequence,1);
 assert.equal(event.playerId,actor);
 assert.equal(event.action.kind,'fold');
 assert.equal(event.amountCommitted,0);
 assert.deepEqual(event.before,before);
 assert.equal(event.before.street,'preflop');
 assert.deepEqual(event.before.heroCards,start.players.hero.hand);
 assert.equal(event.before.players.length,3);
 for(const p of event.before.players){
  assert.ok(!Object.hasOwn(p,'hand'));
  assert.ok(!Object.hasOwn(p,'cards'));
 }
 assert.ok(!Object.hasOwn(event.before,'deck'));
 assert.ok(!Object.hasOwn(event.after,'deck'));
 assert.notStrictEqual(event.before.board,start.board);
 assert.equal(start.decisionEvents.length,0,'original not mutated');
 assert.equal(event.handId,after.tournamentId+':'+after.handNumber);
});

test('invalid action returns the original game and emits no event',()=>{
 let state=newMatch(1);
 assert.equal(state.actor,'hero');
 const wrong=act(state,'bot-1',{kind:'fold'});
 assert.strictEqual(wrong,state);
 const illegalCheck=act(state,'hero',{kind:'check'});
 assert.strictEqual(illegalCheck,state);
 for(const goal of [NaN,Infinity,-100,1.5]){
  assert.strictEqual(act(state,'hero',{kind:'raise',to:goal}),state);
 }
 assert.equal(state.decisionEvents.length,0);
});

test('real raises and calls record amount committed and full street transition',()=>{
 let state=newMatch(1);
 const initialPot=state.pot;
 const goal=minRaiseTo(state);
 state=act(state,'hero',{kind:'raise',to:goal});
 assert.equal(state.decisionEvents.length,1);
 const raised=state.decisionEvents[0];
 assert.equal(raised.action.kind,'raise');
 assert.equal(raised.action.to,goal);
 assert.equal(raised.amountCommitted,goal-10);
 assert.equal(raised.before.pot,initialPot);
 assert.equal(raised.after.pot,initialPot+raised.amountCommitted);
 assert.equal(raised.options.toCall,10);
 const serialized=JSON.stringify(raised);
 state=act(state,'bot-1',{kind:'call'});
 assert.equal(state.decisionEvents.length,2);
 const called=state.decisionEvents[1];
 assert.equal(called.action.kind,'call');
 assert.equal(called.before.street,'preflop');
 assert.equal(called.after.street,'flop');
 assert.equal(called.after.board.length,3);
 assert.equal(called.amountCommitted,goal-20);
 assert.equal(state.decisionEvents[0].before.board.length,0);
 assert.equal(JSON.stringify(state.decisionEvents[0]),serialized,'prior event snapshot immutable');
});

test('check and call also have exactly one factual event',()=>{
 let state=newMatch(1);
 state=heroCall(state);
 assert.equal(state.decisionEvents.length,1);
 assert.equal(state.decisionEvents[0].action.kind,'call');
 assert.equal(state.decisionEvents[0].amountCommitted,10);
 state=act(state,'bot-1',{kind:'check'});
 assert.equal(state.decisionEvents.length,2);
 assert.equal(state.decisionEvents[1].action.kind,'check');
 assert.equal(state.decisionEvents[1].amountCommitted,0);
 assert.equal(state.decisionEvents[1].after.street,'flop');
});

test('finishing a hand archives the final decision, and nextHand resets current history',()=>{
 let s=newMatch(1);
 const id=s.actor;
 s=act(s,id,{kind:'fold'});
 assert.ok(s.result);
 assert.equal(s.replayArchive.length,1);
 const archived=s.replayArchive[0];
 assert.equal(archived.decisions.length,1);
 assert.equal(archived.decisions[0].sequence,1);
 assert.equal(archived.decisions[0].after.street,'showdown');
 assert.equal(archived.decisions[0].after.actor,null);
 assert.deepEqual(decisionsForHand(s,s.handNumber),archived.decisions);
 const previousHand=s.handNumber;
 s=nextHand(s);
 assert.equal(s.handNumber,previousHand+1);
 assert.equal(s.decisionEvents.length,0);
 assert.equal(s.replayArchive[0].decisions.length,1);
 assert.deepEqual(decisionsForHand(s,previousHand),archived.decisions);
});

test('legacy saves migrate cleanly with missing decision arrays',()=>{
 const start=newMatch(1);
 const old=JSON.parse(JSON.stringify(start));
 delete old.decisionEvents;
 old.replayArchive=[{number:0,result:'Ранее сыграна',frames:[]}];
 const restored=restoreSavedGame(JSON.stringify(old));
 assert.equal(restored.corrupt,false);
 assert.deepEqual(restored.game.decisionEvents,[]);
 assert.deepEqual(restored.game.replayArchive[0].decisions,[]);
 const after=act(restored.game,restored.game.actor,{kind:'fold'});
 assert.equal(after.decisionEvents.length,1);
 assert.ok(after.replayArchive[1].decisions?.length);
});

test('archive remains bounded to last 25 hands while preserving actions',()=>{
 let s=newMatch(1);
 for(let i=0;i<27;i++){
  assert.ok(s.actor,'actor exists');
  s=act(s,s.actor,{kind:'fold'});
  assert.equal(s.decisionEvents.length,1);
  assert.equal(s.replayArchive.at(-1).decisions.length,1);
  s=nextHand(s);
 }
 assert.equal(s.replayArchive.length,25);
 const numbers=s.replayArchive.map(x=>x.number);
 assert.deepEqual(numbers,Array.from({length:25},(_,i)=>i+3));
 for(const h of s.replayArchive)assert.equal(h.decisions[0].handNumber,h.number);
});

test('round-trip persistence retains all recorded decisions without a grading field',()=>{
 let s=newMatch(1);
 s=act(s,s.actor,{kind:'fold'});
 const revived=restoreSavedGame(JSON.stringify(s));
 assert.equal(revived.corrupt,false);
 assert.equal(revived.game.decisionEvents.length,1);
 assert.equal(revived.game.replayArchive.at(-1).decisions.length,1);
 assert.deepEqual(revived.game.decisionEvents,s.decisionEvents);
 assert.equal('evaluation' in revived.game.decisionEvents[0],false);
});
