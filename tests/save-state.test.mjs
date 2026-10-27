import test from 'node:test';
import assert from 'node:assert/strict';
import {newMatch} from '../src/engine.ts';
import {restoreSavedGame,plausibleSavedGame} from '../src/save-state.ts';
test('current saved game rehydrates without resetting the hand',()=>{
 const s=newMatch(3);
 const result=restoreSavedGame(JSON.stringify(s));
 assert.equal(result.corrupt,false);
 assert.equal(result.game.handNumber,s.handNumber);
 assert.deepEqual(result.game.order,s.order);
 assert.equal(result.game.pot,s.pot);
});
test('older saved games receive defaults without discarding stacks',()=>{
 const s=newMatch(1);const stack=s.players.hero.stack;
 const raw=JSON.parse(JSON.stringify(s));
 delete raw.lastPot;delete raw.lastPayouts;delete raw.handStartingStacks;delete raw.replayFrames;
 const restored=restoreSavedGame(JSON.stringify(raw));
 assert.equal(restored.corrupt,false);assert.equal(restored.game.players.hero.stack,stack);
 assert.deepEqual(restored.game.lastPayouts,{});
 assert.deepEqual(restored.game.replayFrames,[]);
});
test('corrupt JSON and structurally invalid game cannot crash hydration',()=>{
 for(const raw of ['{broken','null','{}','{"order":["hero"]}']){
   const restored=restoreSavedGame(raw);
   assert.equal(restored.corrupt,true);
   assert.equal(restored.game.order.length,2);
 }
});
test('negative stacks and duplicate seats are rejected',()=>{
 const a=newMatch(1);a.players.hero.stack=-1;
 assert.equal(plausibleSavedGame(a),false);
 const b=newMatch(1);b.order=['hero','hero'];
 assert.equal(plausibleSavedGame(b),false);
});
