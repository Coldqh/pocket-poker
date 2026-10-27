import {hydrateGameChips,newMatch,type GameState,type Card} from './engine.ts';
const suits=new Set(['♠','♥','♦','♣']);
const card=(v:unknown):v is Card=>!!v&&typeof v==='object'&&Number.isInteger((v as Card).rank)&&(v as Card).rank>=2&&(v as Card).rank<=14&&suits.has((v as Card).suit);
export function plausibleSavedGame(value:unknown):value is GameState {
 if(!value||typeof value!=='object')return false;
 const s=value as GameState;
 if(!Array.isArray(s.order)||s.order.length<2||s.order.length>6||new Set(s.order).size!==s.order.length||s.order[0]!=='hero')return false;
 if(!s.players||typeof s.players!=='object'||!Number.isInteger(s.opponentCount)||s.opponentCount!==s.order.length-1)return false;
 if(!Array.isArray(s.deck)||!Array.isArray(s.board)||s.board.length>5||!s.deck.every(card)||!s.board.every(card))return false;
 if(!Number.isSafeInteger(s.pot)||s.pot<0||!Number.isSafeInteger(s.currentBet)||s.currentBet<0)return false;
 if(!['preflop','flop','turn','river','showdown'].includes(s.street))return false;
 if(!s.order.every(id=>{
  const p=s.players[id];
  return !!p && Number.isSafeInteger(p.stack)&&p.stack>=0&&Number.isSafeInteger(p.contributed)&&p.contributed>=0&&
   Number.isSafeInteger(p.streetBet)&&p.streetBet>=0&&Array.isArray(p.hand)&&p.hand.length<=2&&p.hand.every(card);
 }))return false;
 return true;
}
export function restoreSavedGame(raw:string|null):{game:GameState;corrupt:boolean}{
 if(raw===null)return {game:newMatch(1),corrupt:false};
 try{
  const value:unknown=JSON.parse(raw);
  if(plausibleSavedGame(value))return {game:hydrateGameChips(value),corrupt:false};
 }catch{ /* keep original bytes for recovery */ }
 return {game:newMatch(1),corrupt:true};
}
