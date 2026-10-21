import test from 'node:test';
import assert from 'node:assert/strict';
import {getStoryLesson} from '../src/story-lessons.ts';
import {storyMotion} from '../src/story-motion.ts';

const scenes=getStoryLesson('firstmoves').scenes;

test('deal to blinds keeps existing hero and hidden opponent cards still',()=>{
 const motion=storyMotion(scenes[1],scenes[2]);
 assert.deepEqual(motion.hero,['still','still']);
 assert.deepEqual(motion.villain,['still','still']);
 assert.deepEqual(motion.board,[]);
 assert.equal(motion.potChanged,true);
 assert.equal(motion.chipDirection,'in');
});

test('blinds 15 to call/check 20 changes only bank and chip movement',()=>{
 const motion=storyMotion(scenes[2],scenes[3]);
 assert.deepEqual(motion.hero,['still','still']);
 assert.deepEqual(motion.villain,['still','still']);
 assert.deepEqual(motion.board,[]);
 assert.equal(motion.potChanged,true);
 assert.equal(motion.chipDirection,'in');
 assert.equal(motion.showWinner,false);
});

test('call/check 20 to flop 20 deals only newly opened board cards',()=>{
 const motion=storyMotion(scenes[3],scenes[4]);
 assert.deepEqual(motion.hero,['highlight','still']);
 assert.deepEqual(motion.villain,['still','still']);
 assert.deepEqual(motion.board,['deal','deal','deal']);
 assert.equal(motion.potChanged,false);
 assert.equal(motion.chipDirection,null);
});

test('flop to turn to river deals only appended card',()=>{
 const turn=storyMotion(scenes[4],scenes[5]);
 assert.deepEqual(turn.hero,['still','still']);
 assert.deepEqual(turn.board,['still','still','still','deal']);
 assert.equal(turn.potChanged,false);
 assert.equal(turn.chipDirection,null);
 const river=storyMotion(scenes[5],scenes[6]);
 assert.deepEqual(river.board,['still','still','still','still','deal']);
 assert.deepEqual(river.hero,['still','still']);
 assert.equal(river.potChanged,false);
});

test('showdown flips only hidden opponent cards; winner highlight changes only marked cards',()=>{
 const motion=storyMotion(scenes[6],scenes[7]);
 assert.deepEqual(motion.villain,['flip','flip']);
 assert.deepEqual(motion.hero,['highlight','still']);
 assert.deepEqual(motion.board,['highlight','still','still','still','still']);
 assert.equal(motion.potChanged,false);
 assert.equal(motion.showWinner,true);
});

test('backwards navigation animates removed bets but leaves identical cards stable',()=>{
 const reverse=storyMotion(scenes[3],scenes[2]);
 assert.deepEqual(reverse.hero,['still','still']);
 assert.deepEqual(reverse.villain,['still','still']);
 assert.equal(reverse.chipDirection,'out');
 const previousFlop=storyMotion(scenes[5],scenes[4]);
 assert.deepEqual(previousFlop.board,['highlight','still','still']); // returning to flop restores the ace highlight without re-dealing
 assert.deepEqual(previousFlop.hero,['highlight','still']);
});

test('explicit replay brings back full entrance animation',()=>{
 const motion=storyMotion(null,scenes[4],true);
 assert.deepEqual(motion.hero,['deal','deal']);
 assert.deepEqual(motion.villain,['deal','deal']);
 assert.deepEqual(motion.board,['deal','deal','deal']);
 assert.equal(motion.potChanged,true);
});

test('unchanged state does not animate, even across narrative-only scenes',()=>{
 const motion=storyMotion(scenes[5],scenes[5]);
 assert.deepEqual(motion.hero,['still','still']);
 assert.deepEqual(motion.board,['still','still','still','still']);
 assert.equal(motion.potChanged,false);
 assert.equal(motion.chipDirection,null);
});
