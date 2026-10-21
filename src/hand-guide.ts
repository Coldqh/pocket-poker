import {cardText,evaluateHand,type Card} from './engine.ts';
import {bestFiveBuiltHand} from './lab.ts';

export type HandHint={name:string;detail:string;cards:string[];ready:boolean;boardOnly:boolean};
export const HAND_RANKINGS=[
 {title:'Роял-флеш',cards:['10♠','J♠','Q♠','K♠','A♠'],description:'От десятки до туза одной масти'},
 {title:'Стрит-флеш',cards:['5♥','6♥','7♥','8♥','9♥'],description:'Пять подряд одной масти'},
 {title:'Каре',cards:['Q♠','Q♥','Q♦','Q♣','3♠'],description:'Четыре карты одного достоинства'},
 {title:'Фулл-хаус',cards:['K♠','K♥','K♦','7♣','7♠'],description:'Тройка и пара'},
 {title:'Флеш',cards:['A♦','J♦','8♦','5♦','2♦'],description:'Пять карт одной масти'},
 {title:'Стрит',cards:['5♣','6♥','7♦','8♠','9♣'],description:'Пять последовательных достоинств'},
 {title:'Тройка',cards:['9♠','9♥','9♦','A♣','3♣'],description:'Три карты одного достоинства'},
 {title:'Две пары',cards:['J♠','J♥','4♦','4♣','K♣'],description:'Две пары разных достоинств'},
 {title:'Пара',cards:['A♠','A♦','J♥','8♣','2♠'],description:'Две карты одного достоинства'},
 {title:'Старшая карта',cards:['A♠','J♥','8♣','5♦','2♠'],description:'Нет комбинации — сравниваем старшие карты'}
] as const;
const detail=['Пока только старшая карта','Пара','Две пары','Тройка','Стрит','Флеш','Фулл-хаус','Каре','Стрит-флеш'];
function bestRelevant(cards:string[],value:ReturnType<typeof evaluateHand>):string[]{
 const kind=value.score[0];
 if(kind===0)return [cards.reduce((top,card)=>{const rank=(v:string)=>({A:14,K:13,Q:12,J:11} as Record<string,number>)[v.slice(0,-1)]??Number(v.slice(0,-1));return rank(card)>rank(top)?card:top;})];
 if(kind>=4&&kind!==7)return cards;
 const ranks=kind===2?[value.score[1],value.score[2]]:[value.score[1]];
 return cards.filter(card=>ranks.includes(({A:14,K:13,Q:12,J:11} as Record<string,number>)[card.slice(0,-1)]??Number(card.slice(0,-1))));
}
export function describeHand(hole:Card[],board:Card[]):HandHint|null{
 if(hole.length!==2)return null;
 const hero=hole.map(cardText),table=board.map(cardText);
 if(board.length<3){
  const pair=hole[0].rank===hole[1].rank;
  const highest=hole[0].rank>=hole[1].rank?hero[0]:hero[1];
  return {name:pair?'Карманная пара':'Старшая карта',detail:'До флопа · комбинация ещё может измениться',cards:pair?hero:[highest],ready:false,boardOnly:false};
 }
 const names=bestFiveBuiltHand(hero,table);
 if(!names)return null;
 const value=evaluateHand([...hole,...board]);
 const royal=value.score[0]===8&&value.score[1]===14;
 const highlighted=bestRelevant(names,value);
 const boardOnly=highlighted.every(card=>table.includes(card));
 return {name:royal?'Роял-флеш':detail[value.score[0]],detail:boardOnly?'Комбинация целиком на столе · она доступна всем':'Твоя текущая комбинация · не прогноз победы',cards:highlighted,ready:true,boardOnly};
}
