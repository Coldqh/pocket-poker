/**
 * POCKET 2.6.0 — factual, actor-time information only.
 *
 * This file has no runtime dependency on the game engine. The captured
 * state intentionally excludes the future deck and opponents' hole cards.
 * Evaluators must use "before", never information learned after the move.
 */
import type {Action,Card,GameState,PlayerId,Street} from './engine.ts';

export const DECISION_HISTORY_VERSION = 1 as const;
export type DecisionPlayerView={
  id:PlayerId;name:string;stack:number;streetBet:number;contributed:number;
  folded:boolean;acted:boolean;allIn:boolean;raiseLocked:boolean;
};
export type DecisionTableView={
  street:Street;pot:number;lastPot:number;currentBet:number;minRaise:number;
  smallBlind:number;bigBlind:number;button:PlayerId;actor:PlayerId|null;
  board:Card[];heroCards:Card[];players:DecisionPlayerView[];
  recentActions:string[];result:string|null;
};
export type DecisionOptions={
  toCall:number;minRaiseTo:number|null;maxRaiseTo:number|null;
  ruleActions:Action['kind'][];
  /** Legal by poker rules, but the physical set may need change first. */
  callRequiresChange:boolean;
};
export type DecisionEvent={
  version:typeof DECISION_HISTORY_VERSION;
  handId:string;handNumber:number;sequence:number;playerId:PlayerId;
  action:Action;amountCommitted:number;
  options:DecisionOptions;
  before:DecisionTableView;after:DecisionTableView;
};

/** Snapshot values and arrays instead of holding references to mutable game data. */
export function captureDecisionTable(s:GameState):DecisionTableView {
  return {
    street:s.street,pot:s.pot,lastPot:s.lastPot??0,currentBet:s.currentBet,minRaise:s.minRaise,
    smallBlind:s.smallBlind,bigBlind:s.bigBlind,button:s.button,actor:s.actor,
    board:s.board.map(c=>({...c})),
    heroCards:(s.players.hero?.hand??[]).map(c=>({...c})),
    players:s.order.map(id=>{
      const p=s.players[id];
      return {id,name:p.name,stack:p.stack,streetBet:p.streetBet,contributed:p.contributed,
        folded:p.folded,acted:p.acted,allIn:p.stack===0,raiseLocked:p.raiseLocked};
    }),
    recentActions:s.history.slice(0,10),result:s.result
  };
}
/** Archive lookup, including a hand still in progress. */
export function decisionsForHand(s:GameState,number:number):DecisionEvent[]{
  if(number===s.handNumber)return s.decisionEvents??[];
  return s.replayArchive.find(h=>h.number===number)?.decisions??[];
}
