export type Suit = '♠' | '♥' | '♦' | '♣';
export type PlayerId = 'hero' | 'bot';
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Action = { kind: 'fold' | 'check' | 'call' | 'raise'; to?: number };
export type Card = { rank: number; suit: Suit };
export type Player = {
  id: PlayerId;
  stack: number;
  hand: Card[];
  streetBet: number;
  acted: boolean;
  folded: boolean;
};
export type HandValue = { score: number[]; name: string };
export type GameState = {
  deck: Card[];
  board: Card[];
  players: Record<PlayerId, Player>;
  pot: number;
  currentBet: number;
  minRaise: number;
  actor: PlayerId | null;
  button: PlayerId;
  street: Street;
  handNumber: number;
  handsFinished: number;
  heroWins: number;
  ties: number;
  history: string[];
  result: string | null;
  revealBot: boolean;
  matchOver: boolean;
};
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const BET = 20;
const NAMES = ['Старшая карта','Пара','Две пары','Сет','Стрит','Флеш','Фулл-хаус','Каре','Стрит-флеш'];
export const cardRank = (rank: number) => ({11:'J',12:'Q',13:'K',14:'A'} as Record<number,string>)[rank] ?? String(rank);
export const cardText = (card: Card) => `${cardRank(card.rank)}${card.suit}`;
const other = (id: PlayerId): PlayerId => id === 'hero' ? 'bot' : 'hero';

export function deckOfCards(): Card[] {
  return SUITS.flatMap(suit => Array.from({ length:13 }, (_, i) => ({ suit, rank:i+2 })));
}
export function shuffledDeck(): Card[] {
  const deck = deckOfCards();
  for (let i=deck.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}
function straightHigh(ranks: number[]): number {
  const all=[...new Set(ranks)];
  if(all.includes(14)) all.push(1);
  for(let h=14;h>=5;h--) if([0,1,2,3,4].every(i=>all.includes(h-i))) return h;
  return 0;
}
export function evaluateFive(cards: Card[]): HandValue {
  if (cards.length!==5) throw new Error('Expected exactly five cards');
  const counts=new Map<number,number>();
  for(const c of cards) counts.set(c.rank,(counts.get(c.rank)??0)+1);
  const groups=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const ranks=cards.map(c=>c.rank).sort((a,b)=>b-a);
  const flush=cards.every(c=>c.suit===cards[0].suit);
  const straight=straightHigh(ranks);
  let score: number[];
  if(flush && straight) score=[8,straight];
  else if(groups[0][1]===4) score=[7,groups[0][0],groups[1][0]];
  else if(groups[0][1]===3 && groups[1][1]===2) score=[6,groups[0][0],groups[1][0]];
  else if(flush) score=[5,...ranks];
  else if(straight) score=[4,straight];
  else if(groups[0][1]===3) score=[3,groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];
  else if(groups[0][1]===2 && groups[1][1]===2) {
    const pairs=groups.slice(0,2).map(g=>g[0]).sort((a,b)=>b-a);
    score=[2,...pairs,groups[2][0]];
  } else if(groups[0][1]===2) score=[1,groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];
  else score=[0,...ranks];
  return {score,name:NAMES[score[0]]};
}
export function compareValues(a: HandValue,b: HandValue): number {
  for(let i=0;i<Math.max(a.score.length,b.score.length);i++) {
    const diff=(a.score[i]??0)-(b.score[i]??0);
    if(diff) return Math.sign(diff);
  }
  return 0;
}
export function evaluateHand(cards: Card[]): HandValue {
  if(cards.length<5||cards.length>7) throw new Error('Expected 5–7 cards');
  let best: HandValue | null=null;
  for(let a=0;a<cards.length-4;a++) for(let b=a+1;b<cards.length-3;b++)
    for(let c=b+1;c<cards.length-2;c++) for(let d=c+1;d<cards.length-1;d++)
      for(let e=d+1;e<cards.length;e++) {
        const value=evaluateFive([cards[a],cards[b],cards[c],cards[d],cards[e]]);
        if(!best||compareValues(value,best)>0) best=value;
      }
  return best!;
}
function clone(s: GameState): GameState {
  return {...s,deck:[...s.deck],board:[...s.board],
    players:{hero:{...s.players.hero,hand:[...s.players.hero.hand]},bot:{...s.players.bot,hand:[...s.players.bot.hand]}},history:[...s.history]};
}
function log(s: GameState,text:string) {s.history=[text,...s.history].slice(0,30);}
function draw(s: GameState): Card {const c=s.deck.pop(); if(!c)throw new Error('Deck empty');return c;}
function postBlind(s: GameState,id: PlayerId,amount:number) {
  const p=s.players[id];const paid=Math.min(amount,p.stack);
  p.stack-=paid;p.streetBet+=paid;s.pot+=paid;
}
function makeHand(heroStack:number,botStack:number,button:PlayerId,handNumber:number,finished:number,wins:number,ties:number): GameState {
  const s: GameState={deck:shuffledDeck(),board:[],players:{
    hero:{id:'hero',stack:heroStack,hand:[],streetBet:0,acted:false,folded:false},
    bot:{id:'bot',stack:botStack,hand:[],streetBet:0,acted:false,folded:false}
  },pot:0,currentBet:0,minRaise:BET,actor:button,button,street:'preflop',
  handNumber,handsFinished:finished,heroWins:wins,ties,history:[],result:null,revealBot:false,matchOver:false};
  for(let n=0;n<2;n++) {s.players[button].hand.push(draw(s));s.players[other(button)].hand.push(draw(s));}
  postBlind(s,button,10);postBlind(s,other(button),BET);
  s.currentBet=BET;
  log(s,`Раздача №${handNumber}. Блайнды 10 / 20.`);
  return s;
}
export function newMatch(): GameState {return makeHand(1000,1000,'hero',1,0,0,0);}
export function nextHand(old:GameState): GameState {
  if(!old.result) return old;
  if(old.matchOver) return newMatch();
  return makeHand(old.players.hero.stack,old.players.bot.stack,other(old.button),old.handNumber+1,old.handsFinished,old.heroWins,old.ties);
}
export function amountToCall(s:GameState,id:PlayerId):number {return Math.min(s.players[id].stack,Math.max(0,s.currentBet-s.players[id].streetBet));}
export function maxRaiseTo(s:GameState,id:PlayerId):number {
  const self=s.players[id],op=s.players[other(id)];
  return Math.min(self.streetBet+self.stack,op.streetBet+op.stack);
}
export function minRaiseTo(s:GameState):number {return s.currentBet + s.minRaise;}
function award(s:GameState,winner:PlayerId|null,showdown:boolean) {
  const total=s.pot;
  if(winner) {
    s.players[winner].stack+=total;
    if(winner==='hero')s.heroWins++;
  } else {
    const split=Math.floor(total/2);
    s.players.hero.stack+=split;
    s.players.bot.stack+=(total-split);
    s.ties++;
  }
  s.handsFinished++;
  s.pot=0;
  s.street='showdown';s.actor=null;
  s.revealBot=showdown;
  s.matchOver=Math.min(s.players.hero.stack,s.players.bot.stack)<BET;
}
function showdown(s:GameState) {
  const hero=evaluateHand([...s.players.hero.hand,...s.board]);
  const bot=evaluateHand([...s.players.bot.hand,...s.board]);
  const diff=compareValues(hero,bot);
  const winner=diff>0?'hero':diff<0?'bot':null;
  s.result=diff>0?`Ты выиграл! ${hero.name.toLowerCase()}.`:diff<0?`Победил соперник: ${bot.name.toLowerCase()}.`:`Ничья. Делим банк.`;
  log(s,`Вскрытие: ты — ${hero.name.toLowerCase()}, соперник — ${bot.name.toLowerCase()}.`);
  award(s,winner,true);
}
function nextStreet(s:GameState) {
  if(s.street==='river') {showdown(s);return;}
  if(s.street==='preflop') {draw(s);s.board.push(draw(s),draw(s),draw(s));s.street='flop';}
  else if(s.street==='flop') {draw(s);s.board.push(draw(s));s.street='turn';}
  else if(s.street==='turn') {draw(s);s.board.push(draw(s));s.street='river';}
  s.players.hero.streetBet=0;s.players.bot.streetBet=0;
  s.players.hero.acted=false;s.players.bot.acted=false;
  s.currentBet=0;s.minRaise=BET;s.actor=other(s.button);
  log(s,({flop:'Флоп',turn:'Тёрн',river:'Ривер'} as Record<string,string>)[s.street]+`: ${s.board.map(cardText).join(' ')}`);
}
function advance(s:GameState,actedId:PlayerId) {
  if(s.players.hero.streetBet===s.players.bot.streetBet &&
      (s.players.hero.stack===0 || s.players.bot.stack===0)) {
    while(s.street!=='river') nextStreet(s);
    showdown(s);return;
  }
  const h=s.players.hero,b=s.players.bot;
  if(h.acted&&b.acted&&h.streetBet===b.streetBet) {nextStreet(s);return;}
  s.actor=other(actedId);
}
export function act(original:GameState,id:PlayerId,action:Action):GameState {
  if(original.actor!==id || original.street==='showdown') return original;
  const s=clone(original),p=s.players[id],opp=s.players[other(id)];
  const toCall=Math.max(0,s.currentBet-p.streetBet);
  if(action.kind==='fold') {
    p.folded=true;s.result=id==='hero'?'Ты сбросил карты.':'Соперник сбросил карты. Банк твой!';
    log(s,`${id==='hero'?'Ты':'Соперник'} — фолд.`);
    award(s,other(id),false);return s;
  }
  if(action.kind==='check' && toCall!==0) return original;
  if(action.kind==='call') {
    const paid=Math.min(toCall,p.stack);
    p.stack-=paid;p.streetBet+=paid;s.pot+=paid;
    log(s,`${id==='hero'?'Ты':'Соперник'} — ${paid?'колл '+paid:'чек'}.`);
  } else if(action.kind==='raise') {
    const max=maxRaiseTo(s,id);
    const min=Math.min(minRaiseTo(s),max);
    const goal=Math.floor(action.to??0);
    if(goal<=s.currentBet || goal<min || goal>max || max<=s.currentBet) return original;
    const paid=goal-p.streetBet;
    const increment=goal-s.currentBet;
    p.stack-=paid;p.streetBet=goal;s.pot+=paid;
    s.minRaise=Math.max(1,increment);
    s.currentBet=goal;
    opp.acted=false;
    log(s,`${id==='hero'?'Ты':'Соперник'} — рейз до ${goal}.`);
  } else if(action.kind==='check') log(s,`${id==='hero'?'Ты':'Соперник'} — чек.`);
  p.acted=true;
  advance(s,id);
  return s;
}
// Bots only observe their own cards and the shared board. This is a lightweight
// recreational heuristic, NOT a solver or an opponent modelling system.
export function botMove(s:GameState):Action {
  if(s.actor!=='bot')return {kind:'check'};
  const b=s.players.bot;
  const toCall=amountToCall(s,'bot');
  const potOdds=toCall/(s.pot+toCall||1);
  let confidence:number;
  if(s.street==='preflop') {
    const [a,c]=b.hand.map(x=>x.rank).sort((x,y)=>y-x);
    confidence=.16+(a/14)*.23+(c/14)*.10+(a===c?.33:0)+(b.hand[0].suit===b.hand[1].suit?.065:0)+(a-c===1?.04:0);
  } else {
    const made=evaluateHand([...b.hand,...s.board]);
    confidence=[.23,.43,.63,.79,.82,.87,.94,.98,.995][made.score[0]];
    const boardSuits=SUITS.map(suit=>[...b.hand,...s.board].filter(c=>c.suit===suit).length);
    if(Math.max(...boardSuits)===4)confidence=Math.max(confidence,.43);
  }
  const rnd=Math.random();
  if(toCall===0) {
    const max=maxRaiseTo(s,'bot');
    const min=Math.min(minRaiseTo(s),max);
    if(confidence>.57 && rnd<.56 && max>s.currentBet) {
      const target=Math.max(min,Math.min(max,Math.round((s.currentBet+(s.pot*.6+BET))/10)*10));
      return {kind:'raise',to:target};
    }
    return {kind:'check'};
  }
  if(confidence<potOdds+.07 && rnd>.12)return {kind:'fold'};
  const max=maxRaiseTo(s,'bot');
  if(confidence>.75&&rnd<.27&&max>s.currentBet) {
    const min=Math.min(minRaiseTo(s),max);
    return {kind:'raise',to:Math.max(min,Math.min(max,Math.round((s.currentBet+s.pot*.55)/10)*10))};
  }
  return {kind:'call'};
}
