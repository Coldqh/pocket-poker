import type {StoryScene} from './story-lessons';

/** The changes visible when moving between two story panels.
 * A missing previous panel means initial entrance or explicit replay.
 * Slots are positional: cards that remain in the same slot do not get dealt again.
 */
export type CardMotion='still'|'deal'|'flip'|'highlight';
export type StoryMotion={
 hero:CardMotion[];
 villain:CardMotion[];
 board:CardMotion[];
 potChanged:boolean;
 chipsChanged:boolean;
 chipDirection:'in'|'out'|null;
 showWinner:boolean;
};
function cardMotion(current:string[]|undefined,previous:string[]|undefined,highlights:string[],oldHighlights:string[],reveal:boolean,wasRevealed:boolean,fullReplay:boolean):CardMotion[]{
 return (current??[]).map((card,i)=>{
  if(fullReplay||!previous||previous[i]!==card)return 'deal';
  if(reveal!==wasRevealed)return 'flip';
  if(highlights.includes(card)&&!oldHighlights.includes(card))return 'highlight';
  return 'still';
 });
}
export function storyMotion(previous:StoryScene|null,current:StoryScene,fullReplay=false):StoryMotion{
 const first=fullReplay||previous===null;
 const reveal=current.type==='compare',wasRevealed=previous?.type==='compare'??false;
 const highlights=current.highlight??[],oldHighlights=previous?.highlight??[];
 const potChanged=first?current.pot!==undefined:current.pot!==previous.pot;
 const chipsChanged=first?Boolean(current.heroBet||current.villainBet):current.heroBet!==previous.heroBet||current.villainBet!==previous.villainBet;
 const betting=current.type==='blinds'||current.type==='action-demo';
 const moved=betting&&(potChanged||chipsChanged);
 const delta=(current.pot??0)-(previous?.pot??0);
 return {
  hero:cardMotion(current.heroCards,previous?.heroCards,highlights,oldHighlights,false,false,first),
  villain:cardMotion(current.villainCards,previous?.villainCards,highlights,oldHighlights,reveal,wasRevealed,first),
  board:cardMotion(current.board,previous?.board,highlights,oldHighlights,false,false,first),
  potChanged,chipsChanged,
  chipDirection:moved?(delta<0?'out':'in'):null,
  showWinner:current.animation==='winner'&&(first||previous?.animation!=='winner')
 };
}
