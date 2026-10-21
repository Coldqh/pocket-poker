import { DEFAULT_STARTING_CHIPS, chipInventoryTotal, copyInventory, emptyInventory, inventoryFromAmount, moveChips, validStartingChips, type ChipInventory } from './chips.ts';
export type Suit = '♠' | '♥' | '♦' | '♣';
export type PlayerId = string;
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type Action = { kind: 'fold' | 'check' | 'call' | 'raise'; to?: number };
export type Card = { rank: number; suit: Suit };
export type Player = {
  id: PlayerId; name: string; stack: number; chips: ChipInventory; hand: Card[];
  streetBet: number; contributed: number; acted: boolean; folded: boolean; raiseLocked: boolean;
};
export type HandValue = { score: number[]; name: string };
export type GameState = {
  deck: Card[]; board: Card[]; players: Record<PlayerId, Player>; order: PlayerId[];
  opponentCount: number; pot: number; currentBet: number; minRaise: number;
  startingChips: ChipInventory; potChips: ChipInventory;
  actor: PlayerId | null; button: PlayerId; buttonIndex: number; street: Street;
  handNumber: number; handsFinished: number; heroWins: number; ties: number;
  history: string[]; result: string | null; revealBot: boolean; matchOver: boolean;
};
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const BIG_BLIND = 20;

const NAMES = ['Старшая карта', 'Пара', 'Две пары', 'Сет', 'Стрит', 'Флеш', 'Фулл-хаус', 'Каре', 'Стрит-флеш'];
const BOT_NAMES = ['Мартин', 'Софи', 'Алекс', 'Ника', 'Лео'];
export const cardRank = (rank: number) => ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank);
export const cardText = (card: Card) => `${cardRank(card.rank)}${card.suit}`;
export function deckOfCards(): Card[] { return SUITS.flatMap(suit => Array.from({ length: 13 }, (_, i) => ({ suit, rank: i + 2 }))); }
export function shuffledDeck(): Card[] {
  const d = deckOfCards();
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
function straightHigh(ranks: number[]): number {
  const all = [...new Set(ranks)];
  if (all.includes(14)) all.push(1);
  for (let h = 14; h >= 5; h--) if ([0,1,2,3,4].every(i => all.includes(h-i))) return h;
  return 0;
}
export function evaluateFive(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('Expected exactly five cards');
  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a,b) => b[1]-a[1] || b[0]-a[0]);
  const ranks = cards.map(c => c.rank).sort((a,b) => b-a);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const straight = straightHigh(ranks);
  let score: number[];
  if (flush && straight) score = [8, straight];
  else if (groups[0][1] === 4) score = [7, groups[0][0], groups[1][0]];
  else if (groups[0][1] === 3 && groups[1][1] === 2) score = [6, groups[0][0], groups[1][0]];
  else if (flush) score = [5, ...ranks];
  else if (straight) score = [4, straight];
  else if (groups[0][1] === 3) score = [3, groups[0][0], ...groups.slice(1).map(g => g[0]).sort((a,b) => b-a)];
  else if (groups[0][1] === 2 && groups[1][1] === 2) score = [2, ...groups.slice(0,2).map(g => g[0]).sort((a,b) => b-a), groups[2][0]];
  else if (groups[0][1] === 2) score = [1, groups[0][0], ...groups.slice(1).map(g => g[0]).sort((a,b) => b-a)];
  else score = [0, ...ranks];
  return { score, name: NAMES[score[0]] };
}
export function compareValues(a: HandValue, b: HandValue): number {
  for (let i = 0; i < Math.max(a.score.length, b.score.length); i++) {
    const diff = (a.score[i] ?? 0) - (b.score[i] ?? 0); if (diff) return Math.sign(diff);
  }
  return 0;
}
export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error('Expected 5–7 cards');
  let best: HandValue | null = null;
  for (let a=0;a<cards.length-4;a++) for (let b=a+1;b<cards.length-3;b++)
    for (let c=b+1;c<cards.length-2;c++) for (let d=c+1;d<cards.length-1;d++)
      for (let e=d+1;e<cards.length;e++) {
        const v = evaluateFive([cards[a],cards[b],cards[c],cards[d],cards[e]]);
        if (!best || compareValues(v,best)>0) best=v;
      }
  return best!;
}
const inHand = (s: GameState) => s.order.filter(id => s.players[id].hand.length === 2 && !s.players[id].folded);
const canAct = (s: GameState, id: PlayerId) => !s.players[id].folded && s.players[id].hand.length===2 && s.players[id].stack>0;
function nextAround(s: GameState, index: number, pred: (id: PlayerId)=>boolean): PlayerId | null {
  for (let i=1;i<=s.order.length;i++) {const id=s.order[(index+i)%s.order.length]; if(pred(id)) return id;}
  return null;
}
function clone(s: GameState): GameState {
  return {...s, deck:[...s.deck], board:[...s.board], order:[...s.order], potChips:copyInventory(s.potChips),startingChips:copyInventory(s.startingChips),
    players:Object.fromEntries(s.order.map(id => [id, {...s.players[id],chips:copyInventory(s.players[id].chips),hand:[...s.players[id].hand]}])), history:[...s.history]};
}
function log(s:GameState, text:string) { s.history = [text, ...s.history].slice(0,40); }
function draw(s:GameState):Card {const c=s.deck.pop();if(!c)throw new Error('Deck empty');return c;}
function pay(s:GameState,id:PlayerId,amount:number) {
  const p=s.players[id],paid=Math.min(p.stack,Math.max(0,amount));
  moveChips(p.chips,s.potChips,paid);
  p.stack-=paid;p.streetBet+=paid;p.contributed+=paid;s.pot+=paid;
}
function currentInHand(s:GameState) {return s.order.filter(id=>s.players[id].hand.length===2);}
function beginHand(players:Record<PlayerId,Player>,order:PlayerId[],buttonIndex:number,handNumber:number,handsFinished:number,heroWins:number,ties:number,startingChips:ChipInventory):GameState {
  const s:GameState={deck:shuffledDeck(),board:[],players:Object.fromEntries(order.map(id=>[id,{...players[id],hand:[],streetBet:0,contributed:0,acted:false,folded:false,raiseLocked:false}])),
    order,opponentCount:order.length-1,pot:0,potChips:emptyInventory(),startingChips:copyInventory(startingChips),currentBet:0,minRaise:BIG_BLIND,actor:null,button:order[buttonIndex],buttonIndex,
    street:'preflop',handNumber,handsFinished,heroWins,ties,history:[],result:null,revealBot:false,matchOver:false};
  const seated=order.filter(id=>s.players[id].stack>0);
  if(seated.length<2 || s.players.hero.stack===0) {s.matchOver=true;s.result='Матч завершён.';s.street='showdown';return s;}
  // Deal clockwise from the dealer, two passes. No one receives another player's cards.
  const dealStart=nextAround(s,buttonIndex,id=>s.players[id].stack>0)!;
  const sequence=[dealStart];let pointer=order.indexOf(dealStart);
  while(sequence.length<seated.length){const next=nextAround(s,pointer,id=>s.players[id].stack>0)!;sequence.push(next);pointer=order.indexOf(next);}
  for(let pass=0;pass<2;pass++) for(const id of sequence)s.players[id].hand.push(draw(s));
  const sb=seated.length===2?s.button:nextAround(s,buttonIndex,id=>s.players[id].stack>0)!;
  const bb=nextAround(s,order.indexOf(sb),id=>s.players[id].stack>0)!;
  pay(s,sb,10);pay(s,bb,BIG_BLIND);
  s.currentBet=Math.max(s.players[sb].streetBet,s.players[bb].streetBet);
  log(s,`Раздача №${handNumber}. Блайнды 10 / 20 · ${seated.length} игроков.`);
  s.actor=nextAround(s,order.indexOf(bb),id=>canAct(s,id));
  if(!s.actor) progress(s);
  return s;
}
export function newMatch(opponents=1,selectedChips:ChipInventory=DEFAULT_STARTING_CHIPS):GameState {
  const startingChips=validStartingChips(selectedChips)?copyInventory(selectedChips):copyInventory(DEFAULT_STARTING_CHIPS);
  const startingStack=chipInventoryTotal(startingChips);
  const count=Math.min(5,Math.max(1,Math.floor(opponents)));
  const order=['hero',...Array.from({length:count},(_,i)=>`bot-${i+1}`)];
  const players=Object.fromEntries(order.map((id,i)=>[id,{id,name:i===0?'Ты':BOT_NAMES[i-1],stack:startingStack,chips:copyInventory(startingChips),hand:[],streetBet:0,contributed:0,acted:false,folded:false,raiseLocked:false} as Player]));
  return beginHand(players,order,0,1,0,0,0,startingChips);
}
export function nextHand(old:GameState):GameState {
  if (!old.result) return old;
  if (old.matchOver) return newMatch(old.opponentCount,old.startingChips);
  const next=nextAround(old,old.buttonIndex,id=>old.players[id].stack>0);
  if(!next)return newMatch(old.opponentCount,old.startingChips);
  return beginHand(old.players,old.order,old.order.indexOf(next),old.handNumber+1,old.handsFinished,old.heroWins,old.ties,old.startingChips);
}
export function amountToCall(s:GameState,id:PlayerId):number {
  const p=s.players[id];return Math.min(p.stack,Math.max(0,s.currentBet-p.streetBet));
}
export function maxRaiseTo(s:GameState,id:PlayerId):number {
  const p=s.players[id];
  // A raise is pointless when every opponent is already all-in.
  if(p.raiseLocked||!inHand(s).some(opp=>opp!==id && s.players[opp].stack>0))return s.currentBet;
  return p.streetBet+p.stack;
}
export function minRaiseTo(s:GameState):number {return s.currentBet+s.minRaise;}
/** Total bet size for a fraction of the pot, including a call before raising.
 * pot-size raise TO = currentBet + pot + amountToCall.
 * Returned amount is legal under our no-limit rules, including short all-ins.
 */
export function potFractionRaiseTo(s:GameState,id:PlayerId,fraction:number):number {
  const maximum=maxRaiseTo(s,id);
  if(maximum<=s.currentBet)return s.currentBet;
  const min=Math.min(minRaiseTo(s),maximum);
  const afterCall=s.pot+amountToCall(s,id);
  const desired=s.currentBet+Math.floor(Math.max(0,fraction)*afterCall);
  return Math.min(maximum,Math.max(min,desired));
}

function awardUncontested(s:GameState,winner:PlayerId) {
  const total=s.pot;moveChips(s.potChips,s.players[winner].chips,total);s.players[winner].stack+=total;s.pot=0;
  s.result=winner==='hero'?`Все сбросили карты — банк ${total} твой.`:`${s.players[winner].name} забирает банк ${total}.`;
  log(s,s.result);finishHand(s,winner==='hero',false);
}
function finishHand(s:GameState,heroWon:boolean,tie:boolean) {
  s.handsFinished++;if(heroWon)s.heroWins++;if(tie)s.ties++;
  s.street='showdown';s.actor=null;
  s.matchOver=s.players.hero.stack===0 || s.order.filter(id=>s.players[id].stack>0).length<=1;
}
function showdown(s:GameState) {
  while(s.board.length<5)dealStreetCards(s);
  const contestants=inHand(s);
  const values=Object.fromEntries(contestants.map(id=>[id,evaluateHand([...s.players[id].hand,...s.board])]));
  const limits=[...new Set(currentInHand(s).map(id=>s.players[id].contributed).filter(Boolean))].sort((a,b)=>a-b);
  let previous=0,heroWon=false,heroTied=false,heroPayout=0;
  const orderFromButton=[...s.order.slice(s.buttonIndex+1),...s.order.slice(0,s.buttonIndex+1)];
  const heroBefore=s.players.hero.stack;
  for(const limit of limits) {
    const contributors=currentInHand(s).filter(id=>s.players[id].contributed>=limit);
    const value=(limit-previous)*contributors.length;previous=limit;
    let eligible=contributors.filter(id=>!s.players[id].folded);
    // Normally unreachable: uncalled overbet after everybody folded.
    if(!eligible.length)eligible=contestants;
    let best=values[eligible[0]];for(const id of eligible.slice(1))if(compareValues(values[id],best)>0)best=values[id];
    const winners=eligible.filter(id=>compareValues(values[id],best)===0);
    const portion=Math.floor(value/winners.length);
    for(const id of winners){moveChips(s.potChips,s.players[id].chips,portion);s.players[id].stack+=portion;}
    let remainder=value-portion*winners.length;
    for(const id of orderFromButton)if(remainder>0&&winners.includes(id)){moveChips(s.potChips,s.players[id].chips,1);s.players[id].stack++;remainder--;}
    if(winners.includes('hero')) {heroWon=true;if(winners.length>1)heroTied=true;}
  }
  heroPayout=s.players.hero.stack-heroBefore;
  s.pot=0;s.revealBot=true;
  const heroValue=values.hero?.name.toLowerCase()??'фолд';
  s.result=heroWon?(heroTied?`Твоя доля: ${heroPayout} фишек · ${heroValue}.`:`Ты выиграл ${heroPayout} фишек · ${heroValue}.`):`Вскрытие: ${heroValue}. Банк ушёл соперникам.`;
  log(s,`Вскрытие · ${contestants.map(id=>`${s.players[id].name}: ${values[id].name.toLowerCase()}`).join(' · ')}`);
  finishHand(s,heroWon,heroTied);
}
function dealStreetCards(s:GameState) {
  draw(s); // burn card
  if(s.board.length===0){s.board.push(draw(s),draw(s),draw(s));s.street='flop';}
  else if(s.board.length===3){s.board.push(draw(s));s.street='turn';}
  else if(s.board.length===4){s.board.push(draw(s));s.street='river';}
  log(s,`${({flop:'Флоп',turn:'Тёрн',river:'Ривер'} as Record<string,string>)[s.street]}: ${s.board.map(cardText).join(' ')}`);
}
function progress(s:GameState,lastActor?:PlayerId) {
  if(inHand(s).length===1){awardUncontested(s,inHand(s)[0]);return;}
  const active=inHand(s).filter(id=>s.players[id].stack>0);
  const roundDone=active.every(id=>s.players[id].acted&&s.players[id].streetBet===s.currentBet);
  if(roundDone || active.length===0) {
    if(s.street==='river'||active.length<=1){showdown(s);return;}
    dealStreetCards(s);
    for(const id of s.order){s.players[id].streetBet=0;s.players[id].acted=false;s.players[id].raiseLocked=false;}
    s.currentBet=0;s.minRaise=BIG_BLIND;
    s.actor=nextAround(s,s.buttonIndex,id=>canAct(s,id));
    if(!s.actor)showdown(s);
    return;
  }
  const from=lastActor? s.order.indexOf(lastActor):s.buttonIndex;
  s.actor=nextAround(s,from,id=>canAct(s,id)&&(!s.players[id].acted||s.players[id].streetBet<s.currentBet));
  if(!s.actor)throw new Error('No available action despite an unfinished betting round');
}
export function act(original:GameState,id:PlayerId,action:Action):GameState {
  if(original.actor!==id||original.result||!canAct(original,id))return original;
  const s=clone(original),p=s.players[id];const deficit=Math.max(0,s.currentBet-p.streetBet);
  if(action.kind==='fold'){
    p.folded=true;p.acted=true;log(s,`${p.name} · фолд`);progress(s,id);return s;
  }
  if(action.kind==='check'&&deficit!==0)return original;
  if(action.kind==='call'){
    const paid=Math.min(deficit,p.stack);pay(s,id,paid);
    log(s,`${p.name} · ${paid?'колл '+paid:'чек'}`);
  } else if(action.kind==='raise') {
    const max=maxRaiseTo(s,id);const goal=Math.floor(action.to??0);
    const min=Math.min(minRaiseTo(s),max);
    if(goal<=s.currentBet||goal<min||goal>max||max<=s.currentBet)return original;
    pay(s,id,goal-p.streetBet);
    const increment=goal-s.currentBet;s.currentBet=goal;
    if(increment>=s.minRaise){s.minRaise=increment;for(const opp of inHand(s)){if(opp!==id&&s.players[opp].stack>0){s.players[opp].acted=false;s.players[opp].raiseLocked=false;}}}
    else {for(const opp of inHand(s))if(opp!==id&&s.players[opp].stack>0&&s.players[opp].streetBet<goal){s.players[opp].raiseLocked ||= s.players[opp].acted;s.players[opp].acted=false;}}
    log(s,`${p.name} · рейз до ${goal}`);
  } else log(s,`${p.name} · чек`);
  p.acted=true;progress(s,id);return s;
}
// Recreational bots have imperfect information: their own cards + public board only.
// They are not solvers and their decisions are not instructionally authoritative.
export function botMove(s:GameState,id:PlayerId='bot-1'):Action {
  if(s.actor!==id||id==='hero')return {kind:'check'};
  const bot=s.players[id],toCall=amountToCall(s,id);
  const potOdds=toCall/(s.pot+toCall||1);
  let strength:number;
  if(s.street==='preflop'){
    const [a,b]=bot.hand.map(c=>c.rank).sort((x,y)=>y-x);
    strength=.1+a/14*.25+b/14*.09+(a===b?.3:0)+(bot.hand[0].suit===bot.hand[1].suit?.06:0)+(Math.abs(a-b)===1?.035:0);
  }else{
    const value=evaluateHand([...bot.hand,...s.board]);
    strength=[.18,.34,.56,.76,.8,.86,.94,.975,.995][value.score[0]];
    if(SUITS.some(suit=>[...bot.hand,...s.board].filter(c=>c.suit===suit).length===4))strength=Math.max(strength,.39);
  }
  // Later bots are somewhat looser; bluff occasionally.
  const personality=(Number(id.split('-')[1])||1)%3;
  const random=Math.random();
  const max=maxRaiseTo(s,id);
  if(toCall===0){
    if(max>s.currentBet&&strength>.58-personality*.04&&random<.31+personality*.07)
      return {kind:'raise',to:Math.max(Math.min(minRaiseTo(s),max),Math.min(max,Math.floor(s.currentBet+s.pot*.5+BIG_BLIND)))};
    return {kind:'check'};
  }
  if(strength+personality*.025<potOdds+.12&&random>.15)return {kind:'fold'};
  if(max>s.currentBet&&strength>.79&&random<.22)
    return {kind:'raise',to:Math.max(Math.min(minRaiseTo(s),max),Math.min(max,Math.floor(s.currentBet+s.pot*.35)))};
  return {kind:'call'};
}

/** Upgrades saved tables from earlier versions, retaining stacks and hands. */
export function hydrateGameChips(s:GameState):GameState {
  if(!s.startingChips)s.startingChips=inventoryFromAmount(s.order.length?1000:1000);
  if(!s.potChips)s.potChips=inventoryFromAmount(s.pot||0);
  for(const id of s.order){
    const p=s.players[id];
    if(!p.chips||chipInventoryTotal(p.chips)!==p.stack)p.chips=inventoryFromAmount(p.stack);
  }
  return s;
}
