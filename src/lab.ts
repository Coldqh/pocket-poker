import { cardText, compareValues, deckOfCards, evaluateFive, evaluateHand, type Card } from './engine.ts';

export function potOddsRequired(potBeforeBet:number,bet:number):number {
  if(!Number.isFinite(potBeforeBet)||!Number.isFinite(bet)||potBeforeBet<0||bet<=0)throw new RangeError('Invalid pot or bet');
  return bet/(potBeforeBet+2*bet);
}
export function facingBetOdds(currentPot:number,toCall:number):number {
  if(!Number.isFinite(currentPot)||!Number.isFinite(toCall)||currentPot<0||toCall<0)throw new RangeError('Invalid wager');
  if(toCall===0)return 0;
  return toCall/(currentPot+toCall);
}
export function chanceToImprove(outs:number,unknownCards:number,draws:1|2):number {
  if(!Number.isInteger(outs)||!Number.isInteger(unknownCards)||unknownCards<=0||outs<0||outs>unknownCards||draws>unknownCards)throw new RangeError('Invalid outs or unseen cards');
  const miss=(unknownCards-outs)/unknownCards;
  if(draws===1)return 1-miss;
  return 1-miss*((unknownCards-1-outs)/(unknownCards-1));
}
export function simplifiedCallEV(potBeforeBet:number,bet:number,equity:number):number {
  if(equity<0||equity>1||!Number.isFinite(equity))throw new RangeError('Invalid equity');
  return equity*(potBeforeBet+2*bet)-bet;
}
export function decodeCard(text:string):Card|null {
  const suit=text.slice(-1),face=text.slice(0,-1).toUpperCase();
  if(!['♠','♥','♦','♣'].includes(suit))return null;
  const rank=({A:14,K:13,Q:12,J:11,T:10} as Record<string,number>)[face]??Number(face);
  return Number.isInteger(rank)&&rank>=2&&rank<=14?{rank,suit:suit as Card['suit']}:null;
}
export function evaluateBuiltHand(hole:string[],board:string[]):string|null {
  if(hole.length!==2||board.length<3||board.length>5)return null;
  const cards=[...hole,...board].map(decodeCard);
  if(cards.some(c=>c===null))return null;
  const names=[...hole,...board];
  if(new Set(names).size!==names.length)return null;
  return evaluateHand(cards as Card[]).name;
}
export function compareBuiltHands(hero:string[],opponent:string[],board:string[]):number|null {
  if(hero.length!==2||opponent.length!==2||board.length!==5)return null;
  const all=[...hero,...opponent,...board];
  if(new Set(all).size!==9)return null;
  const cards=all.map(decodeCard);
  if(cards.some(c=>!c))return null;
  return compareValues(evaluateHand([...hero,...board].map(x=>decodeCard(x)!) ), evaluateHand([...opponent,...board].map(x=>decodeCard(x)!)));
}
export const LAB_CARD_OPTIONS=deckOfCards().map(cardText);

/** Returns five cards that form the strongest made hand, with original text labels.
 * Tie between equally ranked combinations is resolved deterministically by input order. */
export function bestFiveBuiltHand(hole:string[],board:string[]):string[]|null{
 const names=[...hole,...board];
 if(hole.length!==2||board.length<3||board.length>5||new Set(names).size!==names.length)return null;
 const cards=names.map(decodeCard);
 if(cards.some(card=>card===null))return null;
 let best:string[]|null=null;
 let value:ReturnType<typeof evaluateFive>|null=null;
 for(let a=0;a<names.length-4;a++)for(let b=a+1;b<names.length-3;b++)
 for(let c=b+1;c<names.length-2;c++)for(let d=c+1;d<names.length-1;d++)
 for(let e=d+1;e<names.length;e++){
  const picks=[a,b,c,d,e],evaluated=evaluateFive(picks.map(i=>cards[i]!));
  if(!value||compareValues(evaluated,value)>0){value=evaluated;best=picks.map(i=>names[i]);}
 }
 return best;
}
