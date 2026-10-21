import test from 'node:test';
import assert from 'node:assert/strict';
import {storyLessons,validStoryData,getStoryLesson} from '../src/story-lessons.ts';
import {STORY_KEY,emptyStoryProgress,openStory,visitStoryScene,completeStory,closeStory,hydrateStoryProgress,completedStoryCount,seenCount} from '../src/story-progress.ts';
import {decodeCard,bestFiveBuiltHand,evaluateBuiltHand} from '../src/lab.ts';

test('all nine chapters exist with unique, non-empty visual scenes',()=>{
 assert.equal(storyLessons.length,9);
 assert.equal(validStoryData(),true);
 assert.ok(storyLessons.every(lesson=>lesson.scenes.length>=5));
 for(const lesson of storyLessons)for(const scene of lesson.scenes){
  const cards=[...(scene.heroCards??[]),...(scene.villainCards??[]),...(scene.board??[])];
  for(const c of cards)assert.ok(decodeCard(c),lesson.id+': invalid '+c);
 }
});
test('first hand is a coherent eight-scene story, not a quiz',()=>{
 const intro=getStoryLesson('firstmoves');
 assert.ok(intro);
 assert.deepEqual(intro.scenes.map(x=>x.type),['intro','deal','blinds','action-demo','board-reveal','board-reveal','board-reveal','compare']);
 assert.equal(intro.scenes[2].pot,15);
 assert.equal(intro.scenes[3].pot,20);
 assert.deepEqual(intro.scenes[4].board,['A♦','7♣','2♥']);
 assert.equal(intro.scenes[7].pot,20);
 assert.equal(intro.scenes[7].villainCards[1],'Q♥');
 assert.equal(evaluateBuiltHand(intro.scenes[7].heroCards,intro.scenes[7].board),'Пара');
});
test('story progress resumes a scene and completes only on explicit finish',()=>{
 let progress=emptyStoryProgress();
 progress=openStory(progress,'firstmoves');
 assert.equal(progress.activeLesson,'firstmoves');
 assert.equal(progress.lessons.firstmoves.scene,0);
 progress=visitStoryScene(progress,'firstmoves',4);
 assert.equal(progress.lessons.firstmoves.scene,4);
 assert.equal(seenCount(progress,'firstmoves'),2);
 progress=closeStory(progress);
 assert.equal(progress.activeLesson,null);
 progress=openStory(progress,'firstmoves');
 assert.equal(progress.lessons.firstmoves.scene,4);
 assert.equal(completedStoryCount(progress),0);
 progress=completeStory(progress,'firstmoves',12345678);
 assert.equal(completedStoryCount(progress),1);
 assert.equal(seenCount(progress,'firstmoves'),8);
 assert.equal(progress.activeLesson,null);
 progress=openStory(progress,'firstmoves');
 assert.equal(progress.lessons.firstmoves.scene,0);
 assert.equal(progress.lessons.firstmoves.completedAt,12345678);
});
test('story hydration rejects corrupted and unknown data safely',()=>{
 assert.equal(STORY_KEY,'pocket-v23-stories');
 assert.deepEqual(hydrateStoryProgress(null),emptyStoryProgress());
 assert.deepEqual(hydrateStoryProgress({version:8,lessons:{}}),emptyStoryProgress());
 const raw={version:1,activeLesson:'unknown',lessons:{firstmoves:{scene:999,seen:['deal','ghost','deal'],completedAt:-9},unknown:{scene:1,seen:['x']}}};
 const fixed=hydrateStoryProgress(raw);
 assert.equal(fixed.activeLesson,null);
 assert.equal(fixed.lessons.firstmoves.scene,7);
 assert.deepEqual(fixed.lessons.firstmoves.seen,['deal']);
 assert.equal(fixed.lessons.unknown,undefined);
 assert.equal(fixed.lessons.firstmoves.completedAt,undefined);
 assert.equal(openStory(fixed,'unknown'),fixed);
});
test('best-five highlights real made combinations without fake cards',()=>{
 const hero=['A♠','K♠'],board=['Q♠','J♠','10♠','7♥','2♦'];
 const best=bestFiveBuiltHand(hero,board);
 assert.equal(best.length,5);
 assert.deepEqual(new Set(best),new Set(['A♠','K♠','Q♠','J♠','10♠']));
 assert.equal(evaluateBuiltHand(hero,board),'Стрит-флеш');
 assert.equal(bestFiveBuiltHand(['A♠','K♠'],['A♠','J♠','10♠']),null);
 assert.equal(bestFiveBuiltHand(['A♠','K♠'],['2♦']),null);
});
