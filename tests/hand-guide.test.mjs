import test from 'node:test';
import assert from 'node:assert/strict';
import {deckOfCards,cardText,evaluateFive} from '../src/engine.ts';
import {decodeCard} from '../src/lab.ts';
import {describeHand,HAND_RANKINGS} from '../src/hand-guide.ts';
const c=(...names)=>names.map(decodeCard);

test('ten reference combinations ordered from royal flush down to high card',()=>{
 const expected=[8,8,7,6,5,4,3,2,1,0];
 assert.equal(HAND_RANKINGS.length,10);
 HAND_RANKINGS.forEach((hand,i)=>{
  assert.equal(new Set(hand.cards).size,5);
  assert.equal(evaluateFive(c(...hand.cards)).score[0],expected[i],hand.title);
 });
});
test('preflop hint shows only owned cards, not an invented finished hand',()=>{
 const pair=describeHand(c('A♠','A♥'),[]);
 assert.equal(pair.name,'Карманная пара');
 assert.equal(pair.ready,false);
 assert.deepEqual(pair.cards,['A♠','A♥']);
 const high=describeHand(c('K♣','A♦'),[]);
 assert.equal(high.name,'Старшая карта');
 assert.deepEqual(high.cards,['A♦']);
});
test('flop pair highlights only cards responsible, no unrelated kickers',()=>{
 const value=describeHand(c('A♠','K♠'),c('A♦','7♣','2♥'));
 assert.equal(value.name,'Пара');
 assert.deepEqual(new Set(value.cards),new Set(['A♠','A♦']));
});
test('board-only five-card straight is correctly marked as shared',()=>{
 const hand=describeHand(c('A♠','K♦'),c('3♣','4♦','5♥','6♠','7♣'));
 assert.equal(hand.name,'Стрит');
 assert.equal(hand.boardOnly,true);
 assert.equal(hand.cards.length,5);
});
test('two pairs highlight four cards, not kicker',()=>{
 const hand=describeHand(c('J♠','4♥'),c('J♦','4♣','A♦','7♣','2♠'));
 assert.equal(hand.name,'Две пары');
 assert.deepEqual(new Set(hand.cards),new Set(['J♠','J♦','4♥','4♣']));
});
test('best flush and royal flush highlight full made five',()=>{
 const flush=describeHand(c('A♠','J♠'),c('8♠','5♠','2♠','K♦','Q♥'));
 assert.equal(flush.name,'Флеш');
 assert.equal(flush.cards.length,5);
 const royal=describeHand(c('A♠','K♠'),c('10♠','J♠','Q♠','2♦','3♥'));
 assert.equal(royal.name,'Роял-флеш');
 assert.equal(royal.cards.length,5);
});
test('pocket helper rejects missing cards and updates with board only',()=>{
 assert.equal(describeHand(c('A♠'),[]),null);
 assert.equal(deckOfCards().length,52);
 assert.equal(new Set(deckOfCards().map(cardText)).size,52);
});
