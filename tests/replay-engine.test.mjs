import test from 'node:test';
import assert from 'node:assert/strict';
import {act,newMatch,nextHand} from '../src/engine.ts';
import {actionLabel,listReplayHands,replaySteps,stepView,streetLabel} from '../src/replay-engine.ts';
const finish=(s)=>act(s,s.actor,{kind:'fold'});

test('in-progress hand is offered ahead of prior completed hands',()=>{
 let game=newMatch(1);
 game=finish(game);
 game=nextHand(game);
 const hands=listReplayHands(game);
 assert.deepEqual(hands.map(h=>h.number),[2,1]);
 assert.equal(hands[0].inProgress,true);
 assert.equal(hands[1].inProgress,false);
});
test('completed hand is not duplicated and every decision is navigable',()=>{
 let game=newMatch(1);
 game=act(game,'hero',{kind:'call'});
 game=act(game,'bot-1',{kind:'check'});
 const hands=listReplayHands(game);
 assert.equal(hands.length,1);
 assert.equal(hands[0].inProgress,true);
 const steps=replaySteps(hands[0]);
 assert.equal(steps.length,2);
 assert.ok(steps.every(s=>s.kind==='decision'));
 assert.equal(steps[0].label,'Ты: колл 10');
 assert.equal(steps[1].label,'Мартин: чек');
 assert.equal(steps[0].street,'preflop');
 assert.equal(stepView(steps[1],'after').street,'flop');
});
test('final action after settlement is available in archive without duplicate ongoing hand',()=>{
 let game=finish(newMatch(1));
 const hands=listReplayHands(game);
 assert.equal(hands.length,1);
 const steps=replaySteps(hands[0]);
 assert.equal(steps.length,1);
 assert.equal(steps[0].label,'Ты: фолд');
 assert.equal(stepView(steps[0],'before').street,'preflop');
 assert.equal(stepView(steps[0],'after').street,'showdown');
});
test('decision views are isolated from mutable game data and never expose bot hole cards',()=>{
 let state=newMatch(2);
 state=act(state,state.actor,{kind:'fold'});
 const event=replaySteps(listReplayHands(state)[0])[0];
 assert.equal(event.kind,'decision');
 for(const phase of ['before','after']){
  const view=stepView(event,phase);
  assert.deepEqual(view.heroCards,state.players.hero.hand);
  assert.equal('deck' in view,false);
  for(const p of view.players)assert.equal('hand' in p||'cards' in p,false);
 }
 const beforeText=JSON.stringify(stepView(event,'before'));
 state.players.hero.stack=999;
 assert.equal(JSON.stringify(stepView(event,'before')),beforeText);
});
test('legacy recordings retain available frames and are never labeled graded decisions',()=>{
 let state=newMatch(1);
 const old={number:5,result:'старая раздача',frames:state.replayFrames.map(x=>({...x}))};
 state={...state,replayArchive:[old]};
 const hands=listReplayHands(state);
 assert.equal(hands[1].number,5);
 const steps=replaySteps(hands[1]);
 assert.equal(steps.length,old.frames.length);
 assert.ok(steps.every(x=>x.kind==='legacy'));
 assert.equal(stepView(steps[0],'before'),null);
});
test('empty current decision list still shows start frame',()=>{
 const game=newMatch(1);
 const hand=listReplayHands(game)[0];
 assert.equal(hand.inProgress,true);
 assert.equal(replaySteps(hand)[0].kind,'legacy');
});
test('decision labels reflect all poker actions and do not imply quality',()=>{
 const sample={amountCommitted:0,action:{kind:'check'}};
 assert.equal(actionLabel(sample),'чек');
 assert.equal(actionLabel({...sample,action:{kind:'fold'}}),'фолд');
 assert.equal(actionLabel({...sample,action:{kind:'call'},amountCommitted:20}),'колл 20');
 assert.equal(actionLabel({...sample,action:{kind:'raise',to:80}}),'рейз до 80');
 assert.equal(streetLabel('river'),'Ривер');
});
test('same hand before/after states survive JSON persistence',()=>{
 let game=newMatch(1);
 game=act(game,'hero',{kind:'call'});
 game=act(game,'bot-1',{kind:'check'});
 const copy=JSON.parse(JSON.stringify(game));
 const a=replaySteps(listReplayHands(game)[0]);
 const b=replaySteps(listReplayHands(copy)[0]);
 assert.deepEqual(b,a);
 assert.notEqual(stepView(b[0],'before'),stepView(b[0],'after'));
});
