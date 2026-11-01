import type {GameState,HandReplay,ReplayFrame,Street} from './engine.ts';
import type {DecisionEvent,DecisionTableView} from './decision-history.ts';

export type ReplayHand=HandReplay&{inProgress:boolean};
export type ReplayStep=
 |{kind:'decision';id:string;label:string;street:Street;decision:DecisionEvent}
 |{kind:'legacy';id:string;label:string;street:Street;frame:ReplayFrame};

/** The newest hand first, including the currently running one. No duplicate final hand. */
export function listReplayHands(game:GameState):ReplayHand[]{
 const archive=(game.replayArchive??[]).filter(h=>h&&Array.isArray(h.frames)).map(h=>({...h,inProgress:false}));
 const active=!game.result?{
  number:game.handNumber,result:'Раздача идёт',
  frames:game.replayFrames??[],decisions:game.decisionEvents??[],inProgress:true
 } satisfies ReplayHand:null;
 return [...(active?[active]:[]),...archive.reverse()];
}
/**
 * Decision history is the authoritative timeline for hands played since 2.6.
 * Older saved hands keep their original, less precise replay frames.
 * Never pretend a legacy frame is a reconstructible pre-decision snapshot.
 */
export function replaySteps(hand:ReplayHand):ReplayStep[]{
 const events=hand.decisions??[];
 if(events.length>0)return events.map((event,i)=>({
   kind:'decision' as const,
   id:`decision-${event.sequence}-${i}`,
   street:event.before.street,
   label:`${event.before.players.find(p=>p.id===event.playerId)?.name??event.playerId}: ${actionLabel(event)}`,
   decision:event
 }));
 return hand.frames.map((frame,i)=>({
   kind:'legacy' as const,id:`frame-${i}`,label:frame.label,street:frame.street,frame
 }));
}
export function actionLabel(event:DecisionEvent):string{
 switch(event.action.kind){
  case 'fold':return 'фолд';
  case 'check':return 'чек';
  case 'call':return event.amountCommitted>0?`колл ${event.amountCommitted}`:'чек';
  case 'raise':return `рейз до ${event.action.to??'?'}`;
 }
}
export function streetLabel(street:Street):string{
 return ({preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Вскрытие'} as const)[street];
}
export function stepView(step:ReplayStep,phase:'before'|'after'):DecisionTableView|null{
 return step.kind==='decision'?step.decision[phase]:null;
}
