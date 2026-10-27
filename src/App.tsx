import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type CSSProperties } from 'react';
import { act, amountToCall, botMove, cardText, maxRaiseTo, minRaiseTo, potFractionRaiseTo, newMatch, nextHand, hydrateGameChips, exchangeForBet, exchangePlayerChip, BOT_STYLES, SITNGO_HANDS_PER_LEVEL, type GameFormat, type BotDifficulty, type HandReplay, type Card, type GameState } from './engine';
import { modules } from './lessons';
import {storyLessons, getStoryLesson} from './story-lessons';
import {STORY_KEY, hydrateStoryProgress, openStory, visitStoryScene, completeStory, closeStory, completedStoryCount, type StoryProgress} from './story-progress';
import StoryLesson from './StoryLesson';
import AcademyStories from './AcademyStories';
import PokerLab from './PokerLab';
import HandGuide from './HandGuide';
import {describeHand} from './hand-guide';
import {seatLayout,betPosition,isCompactStage} from './table-layout';
import { breakdownChips, canPayChips, DEFAULT_STARTING_CHIPS, CHIP_DENOMINATIONS, copyInventory, chipInventoryTotal, validStartingChips, inventoryGroups, paymentChipGroups, type ChipInventory, type ChipGroup } from './chips';

type Page = 'home' | 'play' | 'academy' | 'stats';
type Progress = { completed: string[]; attempts: Record<string, {correct:number; total:number}> };
type CareerResult = {id:string;place:number;players:number;points:number;completedAt:number};
const GAME_KEY = 'pocket-v2-game';
const PROGRESS_KEY = 'pocket-v2-progress';
const PAGE_KEY = 'pocket-v3-page';
const READY_KEY = 'pocket-v6-table-ready';
const CAREER_KEY = 'pocket-v9-career';
const emptyProgress:Progress = {completed:[],attempts:{}};
const money = (n:number) => n.toLocaleString('ru-RU');
const playerCountLabel = (n:number) => `${n} ${n===2?'игрока':'игроков'}`;
type ChipSize = 'mini' | 'small' | 'large' | 'bet';
/** Each denomination is visible as a stacked set of physical-looking discs;
 * the integer badge shows the FULL count, even with a tall stack. */
function ChipStack({value,count,size}:{value:ChipGroup['value'];count:number;size:ChipSize}){
  return <div className={`denomination denomination-${size}`} aria-label={`${count} фишек по ${value}`}>
    <div className="chip-tower" aria-hidden="true">
      {Array.from({length:Math.min(count,5)},(_,i)=><span key={i} className={`casino-chip casino-chip-${value}`} style={{'--layer':i} as CSSProperties}/>)}
    </div>
    <span className="chip-tally"><b>{count}</b><span>×{value}</span></span>
  </div>;
}
function ChipRack({amount,size='small',maxGroups=5,groups}:{amount:number;size?:ChipSize;maxGroups?:number;groups?:ChipGroup[]}){
  const breakdown=groups??breakdownChips(amount);
  const visible=breakdown.slice(0,maxGroups);
  const hidden=breakdown.slice(maxGroups);
  const summary=breakdown.map(({value,count})=>`${count} по ${value}`).join(', ') || 'фишек нет';
  return <div className={`chip-rack chip-rack-${size}`} role="img" aria-label={`Всего ${amount}: ${summary}`} title={summary}>
    {visible.length?visible.map(({value,count})=><ChipStack key={value} value={value} count={count} size={size}/>):<span className="chips-empty">0</span>}
    {hidden.length>0&&<span className="extra-denoms">+{hidden.length}</span>}
  </div>;
}
const load = <T,>(key:string,fallback:T):T => {try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as T:fallback;}catch{return fallback;}};
function loadGame():GameState {
  const s=load<GameState|null>(GAME_KEY,null);
  if(s && Array.isArray(s.order) && s.order.length>=2 && s.order.length<=6 && s.order.includes('hero') &&
    s.players?.hero && Array.isArray(s.deck) && s.opponentCount>=1 && s.opponentCount<=5 &&
    s.order.every(id=>s.players[id] && Array.isArray(s.players[id].hand) && typeof s.players[id].contributed==='number')) return hydrateGameChips(s);
  return newMatch(1);
}
function loadProgress():Progress {const p=load(PROGRESS_KEY,emptyProgress);return p && Array.isArray(p.completed) && p.attempts?p:emptyProgress;}
function loadStarted():boolean {return load<boolean>(READY_KEY,false)||!!load<GameState|null>(GAME_KEY,null)?.handsFinished;}
function loadPage():Page {const p=load<Page>(PAGE_KEY,'home');return ['home','play','academy','stats'].includes(p)?p:'home';}
function Icon({name,size=22}:{name:string;size?:number}) {
  const common={width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true as const};
  switch(name){
    case 'home':return <svg {...common}><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/></svg>;
    case 'book':return <svg {...common}><path d="M12 6c-2.4-1.9-5.3-2.2-9-1.5v15c3.6-.7 6.7-.3 9 1.5 2.3-1.8 5.4-2.2 9-1.5v-15c-3.7-.7-6.6-.4-9 1.5Zm0 0v15"/></svg>;
    case 'stats':return <svg {...common}><path d="M4 20V11m5 9V6m5 14v-8m5 8V3"/></svg>;
    case 'settings':return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M4 11V9l2-1 1-2 2-2h2l1-2h2l1 2h2l2 2 1 2 2 1v4l-2 1-1 2-2 2h-2l-1 2h-2l-1-2H9l-2-2-1-2-2-1z"/></svg>;
    case 'back':return <svg {...common}><path d="m15 5-7 7 7 7"/></svg>;
    case 'chevron':return <svg {...common}><path d="m9 5 7 7-7 7"/></svg>;
    case 'close':return <svg {...common}><path d="m5 5 14 14M19 5 5 19"/></svg>;
    case 'history':return <svg {...common}><path d="M3 9a9 9 0 1 1 0 6M3 4v5h5m4-3v6l4 2"/></svg>;
    default:return <svg {...common}><path d="M12 2c2.2 4.5 8 7 8 12a8 8 0 0 1-16 0c0-5 5.8-7.5 8-12Z"/><path d="M12 13v8"/></svg>;
  }
}
function CardFace({card,hidden=false,small=false,emphasized=false}:{card?:Card;hidden?:boolean;small?:boolean;emphasized?:boolean}){
  const red=card?.suit==='♥'||card?.suit==='♦';
  return <div className={`card-face ${small?'card-small':''} ${hidden?'card-back':''} ${!card&&!hidden?'card-empty':''} ${red?'red':''} ${emphasized?'guide-best-card':''}`} aria-label={hidden?'Закрытая карта':card?cardText(card):'Место для карты'}>
    {!hidden&&card?<><span>{cardText(card)}</span><b>{card.suit}</b></>:hidden?<span className="back-pattern">P</span>:null}
  </div>;
}
function ScenarioFace({value}:{value:string}){return <div className={`card-face scenario-face ${value.includes('♥')||value.includes('♦')?'red':''}`}><span>{value}</span><b>{value.slice(-1)}</b></div>;}
function TabBar({page,onChange}:{page:Page;onChange:(page:Page)=>void}){
  const tabs:{key:Page;label:string;icon:string}[]=[{key:'home',label:'Клуб',icon:'home'},{key:'academy',label:'Истории',icon:'book'},{key:'stats',label:'Я',icon:'stats'}];
  return <nav className="tabbar" aria-label="Основные разделы">{tabs.map(tab=><button key={tab.key} aria-current={page===tab.key?'page':undefined} className={page===tab.key?'active':''} onClick={()=>onChange(tab.key)}><Icon name={tab.icon}/><span>{tab.label}</span></button>)}</nav>;
}
function Header({onChange}:{onChange:(page:Page)=>void}){
  return <header className="app-header glow-header"><button className="wordmark" onClick={()=>onChange('home')} aria-label="На главную">pocket<span>.</span></button><span className="glow-brand-mark">ПОКЕР · ТРЕНАЖЁР</span></header>;
}
function Home({game,progress,started,onChange,onPractice,onNewTable}:{game:GameState;progress:StoryProgress;started:boolean;onChange:(page:Page)=>void;onPractice:(id:string)=>void;onNewTable:()=>void}){
  const pick=storyLessons.find(m=>progress.lessons[m.id]&&!progress.lessons[m.id].completedAt)??storyLessons.find(m=>!progress.lessons[m.id]?.completedAt)??storyLessons[0];
  const spot=pick.scenes.find(scene=>scene.heroCards?.length)??pick.scenes[0];
  const resumable=started&&!game.matchOver;
  const [guideOpen,setGuideOpen]=useState(false);
  return <section className="home-screen lounge-home">
    <header className="lounge-intro"><span className="eyebrow">ГЛАВНАЯ</span><h1>Покер<span className="soft-period">.</span></h1><p>Игра, уроки и комбинации.</p></header>
    <div className="lounge-layout">
      <button className="lounge-play" onClick={()=>resumable?onChange('play'):onNewTable()}>
        <span className="lounge-play-top"><span className="lounge-label">ИГРА</span><span className="play-status"><span className="pulse-dot"/>{resumable?'Партия сохранена':'Новый стол'}</span></span>
        <span className="lounge-play-illustration" aria-hidden="true"><span className="lounge-card lounge-card-one"><strong>A</strong><span>♠</span></span><span className="lounge-card lounge-card-two"><strong>J</strong><span>♥</span></span><span className="lounge-orbit"/></span>
        <span className="lounge-play-footer"><span><strong>{resumable?'Продолжить игру':'Настроить стол'}</strong><small>{resumable?playerCountLabel(game.opponentCount+1)+' · '+game.smallBlind+'/'+game.bigBlind+' · рука '+game.handNumber:'Настроить фишки и соперников'}</small></span><span className="lounge-arrow"><Icon name="chevron" size={22}/></span></span>
      </button>
      <div className="lounge-secondary">
        <div className="lounge-section-kicker"><span>УРОКИ</span><span>{completedStoryCount(progress)} из {storyLessons.length} уроков</span></div>
        <button className="lounge-spot" onClick={()=>onPractice(pick.id)}>
          <span className="spot-kicker">УРОК</span>
          <strong>{pick.title}</strong>
          <span className="spot-preview">{spot.heroCards?.length?spot.heroCards.map((card,i)=><span className={card.includes('♥')||card.includes('♦')?'red':''} key={i}>{card}</span>):<span>♣</span>}</span>
          <span className="spot-link">Открыть урок <Icon name="chevron" size={17}/></span>
        </button>
        <button className="lounge-guide" onClick={()=>setGuideOpen(true)}>Памятка комбинаций <Icon name="chevron" size={17}/></button>
        {resumable&&<button className="lounge-new-table" onClick={onNewTable}>Новый стол <Icon name="chevron" size={17}/></button>}
      </div>
    </div>
    {guideOpen&&<HandGuide onClose={()=>setGuideOpen(false)}/>}
  </section>;
}
function Opponent({game,id,seat,action,onInspect}:{game:GameState;id:string;seat:{x:number;y:number};action?:string;onInspect:(id:string)=>void}){
  const p=game.players[id];const out=p.stack===0&&p.hand.length===0;
  return <div className={`table-opponent ${game.actor===id?'acting':''} ${p.folded||out?'folded':''}`} style={{'--seat-x':`${seat.x}%`,'--seat-y':`${seat.y}%`} as CSSProperties}>
    <span className="opponent-avatar">{p.name.slice(0,1)}</span><strong>{p.name}{game.button===id?' · D':''}</strong>
    <button className="opponent-bankroll" onClick={()=>onInspect(id)} aria-label={`Фишки ${p.name}: ${money(p.stack)}, показать по номиналам`}>
      <span className="opponent-stack">{out?'Выбыл':money(p.stack)}</span>
    </button>
    {p.hand.length>0&&!p.folded&&<div className="opponent-cards">{p.hand.map((c,i)=><CardFace key={`${game.handNumber}-${i}`} card={c} small hidden={!game.revealBot||p.folded}/>)}</div>}
    {action&&<span key={action} className="seat-action opponent-action">{action}</span>}
  </div>;
}

const TABLE_PRESETS:{name:string;desc:string;chips:ChipInventory}[]=[
  {name:'Стандарт',desc:'1 000 фишек',chips:DEFAULT_STARTING_CHIPS},
  {name:'Глубокий',desc:'2 000 фишек',chips:{500:2,100:6,25:12,5:16,1:20}},
  {name:'Крупный стек',desc:'5 000 фишек',chips:{500:7,100:9,25:18,5:26,1:20}}
];

function TableSetup({defaultSeats,defaultChips,defaultBlind,defaultDifficulty,defaultFormat,onStart,onExit}:{defaultSeats:number;defaultChips:ChipInventory;defaultBlind:number;defaultDifficulty:BotDifficulty;defaultFormat:GameFormat;onStart:(seats:number,chips:ChipInventory,blind:number,difficulty:BotDifficulty,format:GameFormat)=>void;onExit:()=>void}){
  const [seats,setSeats]=useState(defaultSeats);
  const [format,setFormat]=useState<GameFormat>(defaultFormat);
  const [blind,setBlind]=useState(defaultBlind);
  const [difficulty,setDifficulty]=useState<BotDifficulty>(defaultDifficulty);
  const [chips,setChips]=useState<ChipInventory>(()=>copyInventory(validStartingChips(defaultChips)?defaultChips:DEFAULT_STARTING_CHIPS));
  const [editChips,setEditChips]=useState(false);
  const total=chipInventoryTotal(chips),valid=validStartingChips(chips);
  const change=(value:typeof CHIP_DENOMINATIONS[number],delta:number)=>setChips(old=>({...old,[value]:Math.min(200,Math.max(0,old[value]+delta))}));
  const matching=TABLE_PRESETS.find(p=>CHIP_DENOMINATIONS.every(v=>chips[v]===p.chips[v]));
  return <section className="table-setup setup-compact">
    <div className="study-header"><button className="icon-button" onClick={onExit} aria-label="Назад"><Icon name="back"/></button><strong>Собрать стол</strong><span className="small-muted">01 / PLAY</span></div>
    <div className="setup-main">
      <div className="setup-editor-caption"><h1>Настройки стола</h1><p>Выбери режим, соперников и фишки.</p></div>
      <div className="setup-compact-modes" role="group" aria-label="Режим игры">
        <button className={format==='practice'?'active':''} aria-pressed={format==='practice'} onClick={()=>setFormat('practice')}>Свободная игра</button>
        <button className={format==='sitngo'?'active':''} aria-pressed={format==='sitngo'} onClick={()=>setFormat('sitngo')}>Sit & Go</button>
      </div>
      <div className="setup-compact-row"><span>Соперники</span><div className="setup-seats">{[1,2,3,4,5].map(n=><button key={n} aria-label={`${n} соперников`} aria-pressed={seats===n} className={seats===n?'active':''} onClick={()=>setSeats(n)}>{n}</button>)}</div></div>
      <details className="setup-advanced"><summary><span><strong>Правила и боты</strong><small>Блайнды {blind/2}/{blind} · {difficulty==='easy'?'Легко':difficulty==='normal'?'Обычно':'Сложно'}</small></span><Icon name="chevron" size={19}/></summary>
        <div className="setup-advanced-inner"><div className="setup-compact-row"><span>{format==='sitngo'?'Начальные блайнды':'Блайнды'}</span><div className="setup-rule-grid">{[4,10,20,50].map(n=><button key={n} aria-pressed={blind===n} className={blind===n?'active':''} onClick={()=>setBlind(n)}>{n/2}/{n}</button>)}</div></div>
        <div className="setup-compact-row"><span>Сложность</span><div className="setup-rule-grid bot-rule-grid">{([['easy','Легко'],['normal','Обычно'],['hard','Сложно']] as const).map(([id,title])=><button key={id} className={difficulty===id?'active':''} aria-pressed={difficulty===id} onClick={()=>setDifficulty(id)}>{title}</button>)}</div></div></div>
      </details>
      <div className="setup-stack-summary">
        <div><span>Стартовый стек</span><strong>{money(total)}</strong><small>{matching?.name??'Свой набор'} · 1 / 5 / 25 / 100 / 500</small></div>
        <button onClick={()=>setEditChips(true)}>Настроить фишки <Icon name="chevron" size={16}/></button>
      </div>
      {format==='sitngo'&&<p className="setup-mode-hint">Рост блайндов каждые {SITNGO_HANDS_PER_LEVEL} раздачи · выбывание · учебные очки</p>}
      {!valid&&<p className="setup-error">Стартовый стек: от 200 до 20 000 фишек.</p>}
    </div>
    <div className="setup-fixed-footer"><button className="big-primary" disabled={!valid} onClick={()=>onStart(seats,chips,blind,difficulty,format)}>{format==='sitngo'?'Начать турнир':'Играть'} <Icon name="chevron" size={18}/></button></div>
    {editChips&&<div className="sheet-scrim setup-chip-scrim" onClick={()=>setEditChips(false)}><section className="bottom-sheet setup-chip-sheet" onKeyDown={e=>{if(e.key==='Escape')setEditChips(false);}} role="dialog" aria-modal="true" aria-label="Настройка количества фишек" onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>Фишки</h2><button className="icon-button" autoFocus onClick={()=>setEditChips(false)} aria-label="Закрыть"><Icon name="close"/></button></div>
      <div className="setup-presets">{TABLE_PRESETS.map(p=><button key={p.name} className={CHIP_DENOMINATIONS.every(value=>chips[value]===p.chips[value])?'chosen':''} onClick={()=>setChips(copyInventory(p.chips))}><strong>{p.name}</strong><small>{p.desc}</small></button>)}</div>
      <div className="setup-inventory">{CHIP_DENOMINATIONS.map(value=><div className="setup-denom" key={value}>
        <ChipStack value={value} count={chips[value]} size="large"/>
        <div className="setup-denom-name"><strong>{value}</strong><small>Номинал</small></div>
        <div className="setup-counter"><button disabled={chips[value]===0} onClick={()=>change(value,-1)} aria-label={`Убрать фишку ${value}`}>−</button><span>{chips[value]}</span><button disabled={chips[value]===200} onClick={()=>change(value,1)} aria-label={`Добавить фишку ${value}`}>+</button></div>
      </div>)}</div>
      <div className="chip-editor-footer"><span>Всего <strong>{money(total)}</strong></span><button className="big-primary" disabled={!valid} onClick={()=>setEditChips(false)}>Готово</button></div>
    </section></div>}
  </section>;
}
function GameTable({game,setGame,onExit,onNewTable}:{game:GameState;setGame:Dispatch<SetStateAction<GameState>>;onExit:()=>void;onNewTable:()=>void}){
  const [sheet,setSheet]=useState<'settings'|'history'|null>(null);
  const [hintOpen,setHintOpen]=useState(false);
  const [replayNumber,setReplayNumber]=useState<number|null>(null);
  const [replayIndex,setReplayIndex]=useState(0);
  const [raiseOpen,setRaiseOpen]=useState(false);
  const [raise,setRaise]=useState(40);
  const [speed,setSpeed]=useState<'normal'|'fast'>(()=>load<'normal'|'fast'>('pocket-v4-speed','normal')==='fast'?'fast':'normal');
  const [notice,setNotice]=useState<{seq:number;player:string;message:string}|null>(null);
  type ChipFlight = {key:string;from:{x:number;y:number};to:{x:number;y:number};kind:'bet'|'collect'|'award'};
  const [flights,setFlights]=useState<ChipFlight[]>([]);
  const [foldFlights,setFoldFlights]=useState<{key:number;x:number;y:number}[]>([]);
  const [inspected,setInspected]=useState<string|null>(null);
  const motionKey=useRef(0);
  const previousGame=useRef(game);
  const stageRef=useRef<HTMLDivElement|null>(null);
  const [stageSize,setStageSize]=useState(()=>({
    width:typeof window==='undefined'?390:window.innerWidth,
    height:typeof window==='undefined'?450:Math.max(260,window.innerHeight-190)
  }));
  useEffect(()=>{
    const node=stageRef.current;
    if(!node||typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      setStageSize(prev=>Math.abs(prev.width-width)<1&&Math.abs(prev.height-height)<1?prev:{width,height});
    });
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  const seats=useMemo(()=>seatLayout(game.opponentCount,stageSize.width,stageSize.height),[game.opponentCount,stageSize.width,stageSize.height]);
  useEffect(()=>{try{localStorage.setItem('pocket-v4-speed',JSON.stringify(speed));}catch{}},[speed]);
  useEffect(()=>{
    const previous=previousGame.current;
    previousGame.current=game;
    if(game.handNumber!==previous.handNumber)return;
    const opponents=game.order.filter(id=>id!=='hero');
    const folded=game.order.filter(id=>!previous.players[id].folded&&game.players[id].folded&&previous.players[id].hand.length===2);
    if(folded.length)setFoldFlights(items=>[...items,...folded.map(id=>{
      const coord=id==='hero'?{x:50,y:84}:seats[opponents.indexOf(id)];
      return {key:++motionKey.current,x:coord.x,y:coord.y};
    })]);
    if(game.history[0]!==previous.history[0]) {
      const event=game.history.find(item=>/ · (?:фолд|колл|рейз|чек)(?: |$)/.test(item));
      if(event){
        const [name,message]=event.split(' · ');
        const id=game.order.find(playerId=>game.players[playerId].name===name);
        setNotice({seq:Date.now(),player:id??'hero',message});
      }
    }
    const coord=(id:string)=>id==='hero'?{x:50,y:84}:seats[opponents.indexOf(id)];
    const motions:ChipFlight[]=[];
    const add=(from:{x:number;y:number},to:{x:number;y:number},kind:ChipFlight['kind'])=>motions.push({key:`${++motionKey.current}`,from,to,kind});
    if(game.result&&!previous.result&&previous.pot>0){
      const winners=game.order.filter(id=>game.players[id].stack>previous.players[id].stack);
      const targets=winners.length?winners:[game.result.startsWith('Ты')?'hero':opponents[0]];
      targets.forEach(id=>add({x:50,y:48},coord(id),'award'));
    } else if(game.street!==previous.street && game.pot>0){
      previous.order.forEach(id=>{
        if(previous.players[id].streetBet>0)add(betPosition(coord(id),stageSize.width),{x:50,y:44},'collect');
      });
    } else if(game.pot>previous.pot){
      game.order.forEach(id=>{
        if(game.players[id].streetBet>previous.players[id].streetBet)add(coord(id),betPosition(coord(id),stageSize.width),'bet');
      });
    }
    if(motions.length)setFlights(motions);
  },[game,seats,stageSize.width]);
  useEffect(()=>{
    if(!flights.length)return;
    const timeout=window.setTimeout(()=>setFlights([]),speed==='fast'?420:880);
    return ()=>window.clearTimeout(timeout);
  },[flights,speed]);
  useEffect(()=>{
    if(!notice)return;
    const timeout=window.setTimeout(()=>setNotice(value=>value?.seq===notice.seq?null:value),speed==='fast'?480:1050);
    return ()=>window.clearTimeout(timeout);
  },[notice,speed]);
  useEffect(()=>{
    if(!foldFlights.length)return;
    const timer=window.setTimeout(()=>setFoldFlights([]),speed==='fast'?360:780);
    return ()=>window.clearTimeout(timer);
  },[foldFlights,speed]);
  const archive:HandReplay[]=useMemo(()=>[...((game.replayArchive??[]).filter(x=>x.frames?.length)??[])].reverse(),[game.replayArchive]);
  const activeReplays:HandReplay[]=game.result?archive:[{number:game.handNumber,result:'Раздача идёт',frames:game.replayFrames??[]},...archive];
  const replay=activeReplays.find(x=>x.number===replayNumber)??activeReplays[0];
  const frame=replay?.frames[Math.min(replayIndex,(replay.frames.length||1)-1)];
  const hero=game.players.hero;
  const handHint=useMemo(()=>hero&&!hero.folded?describeHand(hero.hand,game.board):null,[hero,game.board]);
  const hintedCards=new Set(hintOpen&&handHint?handHint.cards:[]);
  const onStreet=chipInventoryTotal(game.potChips);
  const toCall=amountToCall(game,'hero');
  const minRaise=Math.min(minRaiseTo(game),maxRaiseTo(game,'hero'));
  const maxRaise=maxRaiseTo(game,'hero');
  const boundedRaise=Math.min(maxRaise,Math.max(minRaise,Math.floor(raise || minRaise)));
  const canRaise=maxRaise>game.currentBet&&maxRaise>hero.streetBet;
  const heroTurn=game.actor==='hero'&&!game.result;
  const canCallWithChips=canPayChips(hero.chips,toCall);
  const raiseContribution=Math.max(0,boundedRaise-hero.streetBet);
  const canRaiseWithChips=canPayChips(hero.chips,raiseContribution);
  useEffect(()=>{setRaise(minRaise);setRaiseOpen(false);},[game.handNumber,game.street,game.currentBet,minRaise]);
  useEffect(()=>{
    if(!game.actor||game.actor==='hero'||game.result)return;
    const id=game.actor;const timeout=setTimeout(()=>setGame(s=>s.actor===id?act(s,id,botMove(s,id)):s),speed==='fast'?140:650);
    return ()=>clearTimeout(timeout);
  },[game,setGame,speed]);
  const submit=(kind:'fold'|'call'|'check'|'raise')=>{
    if(kind==='call'&&!canCallWithChips)return;
    if(kind==='raise'&&!canRaiseWithChips)return;
    setGame(s=>act(s,'hero',{kind,to:kind==='raise'?boundedRaise:undefined}));setRaiseOpen(false);
  };
  const startNew=()=>{setSheet(null);setRaiseOpen(false);onNewTable();};
  return <section className={`game-screen motion-${speed}`}>
    <div className="game-toolbar"><button aria-label="Вернуться на главную" className="icon-button" onClick={onExit}><Icon name="back"/></button><div className="game-title"><strong>{game.format==='sitngo'?'SIT & GO':'POCKET TABLE'}</strong><span>{game.smallBlind}/{game.bigBlind} · #{game.handNumber}{game.format==='sitngo'?` · Ур. ${Math.floor((game.handNumber-1)/SITNGO_HANDS_PER_LEVEL)+1}`:''}</span></div><button className="icon-button" aria-label="История раздачи" onClick={()=>{setReplayNumber(null);setReplayIndex(0);setSheet('history');}}><Icon name="history"/></button><button className="icon-button" aria-label="Настройки стола" onClick={()=>{setSheet('settings');}}><Icon name="settings"/></button></div>
    <div className="street-ribbon" aria-label="Улица раздачи">{([['preflop','Пре'],['flop','Флоп'],['turn','Тёрн'],['river','Ривер']] as const).map(([id,label],i)=>{
      const index=['preflop','flop','turn','river','showdown'].indexOf(game.street);
      return <span key={id} className={index===i?'current':index>i?'passed':''}>{label}</span>;
    })}</div>
    <div ref={stageRef} className={`table-stage seats-${game.opponentCount} ${isCompactStage(stageSize.width,stageSize.height)?'stage-short':''}`}>
      <div className="table-felt"><div className="table-felt-inner"/><div className="table-grain"/></div>
      {game.order.filter(id=>id!=='hero').map((id,i)=><Opponent key={id} game={game} id={id} seat={seats[i]} action={notice?.player===id?notice.message:undefined} onInspect={setInspected}/>)}
      {game.order.map(id=>{
        const player=game.players[id];
        if(player.streetBet<=0||game.result)return null;
        const coords= id==='hero'?{x:50,y:84}:seats[game.order.filter(v=>v!=='hero').indexOf(id)];
        const pos=betPosition(coords,stageSize.width);
        return <div key={`bet-${id}`} className={`wager-stack wager-${id==='hero'?'hero':'opponent'}`} style={{'--bet-x':`${pos.x}%`,'--bet-y':`${pos.y}%`} as CSSProperties}>
          <ChipRack amount={player.streetBet} groups={inventoryGroups(player.streetChips)} size="bet" maxGroups={3}/>
          <span className="wager-total">{money(player.streetBet)}</span>
        </div>;
      })}
      <div className="table-center"><span className="pot-label">{game.result?'РАЗЫГРАНО':'БАНК'}</span><strong className="pot-number" key={`${game.handNumber}-${game.pot}`}>{money(game.result&&game.lastPot?game.lastPot:game.pot)}</strong>
        {onStreet>0&&<div className="collected-stack"><ChipRack amount={onStreet} groups={inventoryGroups(game.potChips)} size="large"/></div>}
        <div className="community-cards">{Array.from({length:5},(_,i)=><CardFace key={`${game.handNumber}-${i}-${game.board[i]?cardText(game.board[i]):'empty'}`} card={game.board[i]} emphasized={Boolean(game.board[i]&&hintedCards.has(cardText(game.board[i])))}/>)}</div>
      </div>
      {foldFlights.map(f=><div key={`fold-${f.key}`} className="fold-flight" style={{'--fold-x':`${f.x}%`,'--fold-y':`${f.y}%`} as CSSProperties} aria-hidden="true"><CardFace hidden small/><CardFace hidden small/></div>)}
      {flights.map(f=><div key={f.key} className={`chip-flight-real chip-motion-${f.kind}`} style={{'--start-x':`${f.from.x}%`,'--start-y':`${f.from.y}%`,'--end-x':`${f.to.x}%`,'--end-y':`${f.to.y}%`} as CSSProperties} aria-hidden="true"><i/><i/><i/></div>)}
      <span className="table-event" key={notice?.seq??'none'} role="status" aria-live="polite">{notice?`${game.players[notice.player]?.name??'Игрок'} · ${notice.message}`:''}</span>
      <div className={`table-hero ${heroTurn?'acting':''}`}>
        <button className="hero-bankroll" onClick={()=>setInspected('hero')} aria-label={`Твой стек ${money(hero.stack)} фишек, подробнее`}><span>ТЫ {game.button==='hero'?'· D':''}</span><strong>{money(hero.stack)}</strong></button>
        <div className="hero-cards">{!hero.folded&&hero.hand.map((card,i)=><CardFace key={`${game.handNumber}-${i}`} card={card} small emphasized={hintedCards.has(cardText(card))}/>)}</div>
        {notice?.player==='hero'&&<span key={notice.seq} className="seat-action hero-action">{notice.message}</span>}
      </div>
    </div>
    {game.result&&<div className="end-overlay"><span className="result-emblem">✦</span><strong>{game.result}</strong>{game.lastPot>0&&<span>Банк: {money(game.lastPot)}</span>}{game.format==='sitngo'&&game.matchOver&&<div className="tourney-finish"><b>Место {game.heroPlace} из {game.order.length}</b><span>+{game.tournamentAward} учебных очков</span></div>}<span>{game.matchOver?'Матч завершён. Можно начать новый.':'Раздача завершена, стеки сохранены.'}</span></div>}
    <div className="action-dock">
      {game.result?<button className="big-primary" onClick={()=>game.matchOver?onNewTable():setGame(s=>nextHand(s))}>{game.matchOver?'Новый матч':'Следующая раздача'} <Icon name="chevron" size={18}/></button>:
      <><div className="action-caption"><span>{heroTurn?'ТВОЙ ХОД':game.actor?`${game.players[game.actor]?.name??'Соперник'} играет…`:'РАЗДАЧА'}</span><strong>{heroTurn?toCall?`К коллу ${money(toCall)}`:'Можно сделать чек':''}</strong><button className="game-hint-open" onClick={()=>setHintOpen(true)} aria-label="Посмотреть комбинацию">?</button></div>
      <div className="table-actions"><button className="action-fold" disabled={!heroTurn} onClick={()=>submit('fold')}>Фолд</button>{toCall>0&&!canCallWithChips?<button className="action-change" disabled={!heroTurn} onClick={()=>setGame(s=>exchangeForBet(s,'hero',amountToCall(s,'hero')))}>Размен для колла</button>:<button className="action-call" disabled={!heroTurn} onClick={()=>submit(toCall?'call':'check')}>{toCall?`Колл ${money(toCall)}`:'Чек'}</button>}<button className="action-raise" disabled={!heroTurn||!canRaise} onClick={()=>setRaiseOpen(true)}>Рейз</button></div></>}
    </div>
    {hintOpen&&<div className="sheet-scrim" onClick={()=>setHintOpen(false)}><section className="bottom-sheet hint-info-sheet" role="dialog" aria-modal="true" aria-label="Комбинация" onClick={e=>e.stopPropagation()}><div className="sheet-head"><h2>Твоя комбинация</h2><button className="icon-button" aria-label="Закрыть" onClick={()=>setHintOpen(false)}><Icon name="close"/></button></div>{handHint?<><strong>{handHint.name}</strong><p>{handHint.detail}</p></>:<p>Комбинация появится после раздачи карт.</p>}</section></div>}
    {raiseOpen&&canRaise&&<div className="sheet-scrim raise-scrim" onClick={()=>setRaiseOpen(false)}><section className="raise-dialog" onKeyDown={e=>{if(e.key==='Escape')setRaiseOpen(false);}} onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Выбор размера рейза"><div className="raise-dialog-head"><div><span className="small-muted">ПОСТАВИТЬ БОЛЬШЕ</span><h2>Размер рейза</h2></div><button className="icon-button" aria-label="Закрыть окно рейза" onClick={()=>setRaiseOpen(false)}><Icon name="close"/></button></div><div className="raise-summary"><div><span>К коллу</span><strong>{money(toCall)}</strong></div><div><span>Мин. рейз</span><strong>{money(minRaise)}</strong></div><div><span>Макс.</span><strong>{money(maxRaise)}</strong></div></div><div className="raise-panel"><div><span>Рейз до</span><label className="raise-input-label"><input aria-label="Точный размер рейза" inputMode="numeric" type="number" min={minRaise} max={maxRaise} step="1" value={boundedRaise} onChange={e=>{if(e.target.value!=='')setRaise(Number(e.target.value));}}/><span>фишек</span></label></div><input type="range" aria-label="Размер рейза" min={minRaise} max={maxRaise} step={1} value={boundedRaise} onChange={e=>setRaise(Number(e.target.value))}/><div className="raise-presets"><button onClick={()=>setRaise(potFractionRaiseTo(game,'hero',.5))}>½ банка</button><button onClick={()=>setRaise(potFractionRaiseTo(game,'hero',1))}>Банк</button><button onClick={()=>setRaise(maxRaise)}>Олл-ин</button></div>{!canRaiseWithChips?<p className="raise-change-note">Для этой ставки понадобится размен.</p>:<ChipRack amount={raiseContribution} groups={paymentChipGroups(hero.chips,raiseContribution)??[]} size="small" maxGroups={5}/>}</div><div className="raise-dialog-actions"><button className="ghost-button" onClick={()=>setRaiseOpen(false)}>Отмена</button>{!canRaiseWithChips?<button className="big-primary" onClick={()=>setGame(s=>exchangeForBet(s,'hero',Math.max(0,boundedRaise-s.players.hero.streetBet)))}>Разменять для рейза</button>:<button className="big-primary" onClick={()=>submit('raise')}>Подтвердить рейз</button>}</div></section></div>}
    {inspected&&game.players[inspected]&&<div className="sheet-scrim" onClick={()=>setInspected(null)}><section className="bottom-sheet chips-detail-sheet" role="dialog" aria-modal="true" aria-label="Разбивка фишек по номиналам" onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>{game.players[inspected].name} · {money(game.players[inspected].stack)}</h2><button className="icon-button" aria-label="Закрыть" onClick={()=>setInspected(null)} autoFocus><Icon name="close"/></button></div>
      <ChipRack amount={game.players[inspected].stack} groups={inventoryGroups(game.players[inspected].chips)} size="large"/>
      {inspected!=='hero'&&BOT_STYLES[inspected]&&<p className="bot-style-detail"><strong>{BOT_STYLES[inspected].title}</strong> · {BOT_STYLES[inspected].desc}</p>}
      {inspected==='hero'&&!game.result&&<div className="exchange-list"><h3>Разменять фишку</h3>{CHIP_DENOMINATIONS.slice(0,-1).filter(value=>hero.chips[value]>0).map(value=>{
      const lower=CHIP_DENOMINATIONS[CHIP_DENOMINATIONS.indexOf(value)+1];
      return <button key={value} onClick={()=>setGame(s=>exchangePlayerChip(s,'hero',value))}>1 × {value} <span>→</span> {value/lower} × {lower}</button>;
    })}{toCall>0&&!canCallWithChips&&<button className="exchange-suggest" onClick={()=>setGame(s=>exchangeForBet(s,'hero',amountToCall(s,'hero')))}>Разменять для колла {money(toCall)}</button>}</div>}
      <p className="chip-sheet-caption">Каждая фишка сохраняет номинал. Размен происходит только по команде.</p>
    </section></div>}
    {sheet&&<div className="sheet-scrim" onClick={()=>setSheet(null)}><section className="bottom-sheet" onKeyDown={e=>{if(e.key==='Escape')setSheet(null);}} role="dialog" aria-modal="true" aria-label={sheet==='settings'?'Настройки стола':'История раздачи'} onClick={e=>e.stopPropagation()}>
      <div className="sheet-head"><h2>{sheet==='settings'?'Настройки стола':'История раздачи'}</h2><button className="icon-button" autoFocus aria-label="Закрыть" onClick={()=>setSheet(null)}><Icon name="close"/></button></div>
      {sheet==='settings'?<><p className="sheet-hint">Новый матч заменит текущую игру.</p>{game.format==='sitngo'&&<div className="tournament-standings"><strong>Турнир · уровень {Math.floor((game.handNumber-1)/SITNGO_HANDS_PER_LEVEL)+1}</strong><span>{game.order.filter(id=>game.players[id].stack>0).length} из {game.order.length} игроков осталось</span><span>Следующий рост блайндов через {SITNGO_HANDS_PER_LEVEL-((game.handNumber-1)%SITNGO_HANDS_PER_LEVEL)} разд.</span><div>{[...game.order].sort((a,b)=>game.players[b].stack-game.players[a].stack).map((id,i)=><p key={id}>{i+1}. {game.players[id].name}<b>{game.players[id].stack>0?money(game.players[id].stack):'Выбыл'}</b></p>)}</div></div>}<div className="setting-label">Скорость игры</div><div className="speed-picker" role="group" aria-label="Скорость игры"><button aria-pressed={speed==='normal'} className={speed==='normal'?'active':''} onClick={()=>setSpeed('normal')}>Обычная</button><button aria-pressed={speed==='fast'} className={speed==='fast'?'active':''} onClick={()=>setSpeed('fast')}>Быстрая</button></div><p className="sheet-hint">Количество соперников и набор фишек выбираются при создании стола.</p><button className="big-primary" onClick={startNew}>Настроить новый стол</button></>:
      <div className="replay-browser"><p className="sheet-hint">История последних 25 раздач. Листай действия по одному.</p><div className="replay-hand-list">{activeReplays.map(item=><button key={item.number} onClick={()=>{setReplayNumber(item.number);setReplayIndex(0);}} className={replay?.number===item.number?'active':''}>#{item.number}<small>{item.result||'В процессе'}</small></button>)}</div>{frame?<><div className="replay-counter"><strong>{frame.label}</strong><span>{replayIndex+1} / {replay.frames.length}</span></div><div className="replay-felt"><div className="replay-pot">Банк: <b>{money(frame.pot)}</b></div><div className="replay-board">{frame.board.map((card,i)=><ScenarioFace key={i} value={card}/>)}</div></div><div className="replay-seats">{frame.players.map(p=><div key={p.id} className={p.folded?'replay-folded':''}><strong>{p.name}</strong><span>{money(p.stack)} · ставка {money(p.streetBet)}{p.folded?' · пас':''}</span><div className="replay-cards">{p.cards.map((c,i)=><ScenarioFace value={c} key={i}/>)}</div></div>)}</div><div className="replay-controls"><button disabled={replayIndex===0} onClick={()=>setReplayIndex(n=>Math.max(0,n-1))}><Icon name="back" size={16}/> Назад</button><button disabled={replayIndex>=replay.frames.length-1} onClick={()=>setReplayIndex(n=>Math.min(replay.frames.length-1,n+1))}>Дальше <Icon name="chevron" size={16}/></button></div></>:<p>Истории пока нет. Сыграй первую раздачу.</p>}</div>}
    </section></div>}
  </section>;
}
function Academy({storyProgress,setStoryProgress,game}:{storyProgress:StoryProgress;setStoryProgress:Dispatch<SetStateAction<StoryProgress>>;game:GameState}){
 const [labOpen,setLabOpen]=useState(false);
 const selected=storyProgress.activeLesson?getStoryLesson(storyProgress.activeLesson):undefined;
 if(selected)return <section className="academy-screen"><StoryLesson lesson={selected} record={storyProgress.lessons[selected.id]??{scene:0,seen:[]}} onBack={()=>setStoryProgress(p=>closeStory(p))} onVisit={index=>setStoryProgress(p=>visitStoryScene(p,selected.id,index))} onFinish={()=>setStoryProgress(p=>completeStory(p,selected.id,Date.now()))}/></section>;
 if(labOpen)return <section className="academy-screen"><PokerLab game={game} onBack={()=>setLabOpen(false)}/></section>;
 return <section className="academy-screen"><AcademyStories progress={storyProgress} onOpen={id=>setStoryProgress(p=>openStory(p,id))} onLab={()=>setLabOpen(true)}/></section>;
}
function Stats({game,progress,storyProgress,career}:{game:GameState;progress:Progress;storyProgress:StoryProgress;career:CareerResult[]}){
  const points=career.reduce((n,x)=>n+x.points,0);
  const victories=career.filter(x=>x.place===1).length;
  const podiums=career.filter(x=>x.place<=3).length;
  const net=game.players.hero.stack-chipInventoryTotal(game.startingChips);
  const completed=modules.filter(m=>progress.completed.includes(m.id));
  const watched=storyLessons.filter(m=>Boolean(storyProgress.lessons[m.id]?.completedAt));
  return <section className="stats-screen lounge-profile">
    <header className="profile-heading"><span className="eyebrow">ПРОФИЛЬ</span><h1>Статистика</h1><p></p></header>
    <section className="profile-hero">
      <div className="profile-identity"><span className="profile-monogram">P.</span><span><small>ТЕКУЩИЙ СТЕК</small><strong>{money(game.players.hero.stack)}</strong></span></div>
      <div className="profile-session"><span>Изменение за этот матч</span><strong>{net>=0?'+':''}{money(net)} <small>фишек</small></strong></div>
    </section>
    <section className="profile-glance" aria-label="Статистика">
      <div><strong>{game.handsFinished}</strong><span>Раздач</span></div>
      <div><strong>{game.heroWins}</strong><span>Побед</span></div>
      <div><strong>{watched.length}<small>/{storyLessons.length}</small></strong><span>Уроки</span></div>
    </section>
    <div className="profile-panels">
      <details className="profile-panel"><summary><span><span className="eyebrow">РЕЗУЛЬТАТЫ</span><strong>Карьера Sit & Go</strong></span><span>{career.length} турниров <Icon name="chevron" size={19}/></span></summary>
        <div className="profile-panel-content"><div className="career-metrics"><div><strong>{career.length}</strong><small>Турниров</small></div><div><strong>{victories}</strong><small>Побед</small></div><div><strong>{points}</strong><small>Очков</small></div></div>
        <div className="career-missions"><h3>Испытания</h3><p className={career.length?'achieved':''}>{career.length?'✓':'○'} Первый турнир</p><p className={podiums?'achieved':''}>{podiums?'✓':'○'} Попасть в топ-3</p><p className={victories?'achieved':''}>{victories?'✓':'○'} Выиграть Sit & Go</p></div>
        {career.length>0&&<div className="career-results"><h3>Последние турниры</h3>{career.slice(-5).reverse().map(x=><div key={x.id}><span>{x.place}-е место из {x.players}</span><b>+{x.points}</b></div>)}</div>}</div>
      </details>
      <details className="profile-panel"><summary><span><span className="eyebrow">ИСТОРИИ</span><strong>Просмотренные уроки</strong></span><span>{watched.length} из {storyLessons.length} <Icon name="chevron" size={19}/></span></summary>
        <div className="profile-panel-content"><div className="completed-list">{watched.map(m=><div key={m.id}><span>{m.title}</span><strong>✓</strong></div>)}{watched.length===0&&<p>После первого урока здесь появится результат.</p>}</div></div>
      </details>
      <details className="profile-panel"><summary><span><span className="eyebrow">АРХИВ</span><strong>Результаты старых упражнений</strong></span><span>{completed.length} тем <Icon name="chevron" size={19}/></span></summary><div className="profile-panel-content"><div className="completed-list">{completed.map(m=><div key={m.id}><span>{m.title}</span><strong>{progress.attempts[m.id]?.correct??0}/{progress.attempts[m.id]?.total??m.scenarios.length}</strong></div>)}{completed.length===0&&<p>Старых результатов пока нет.</p>}</div></div></details>
    </div>
  </section>;
}
export default function App(){
  const [page,setPage]=useState<Page>(loadPage);
  const [game,setGame]=useState<GameState>(loadGame);
  const [started,setStarted]=useState<boolean>(loadStarted);
  const [setupPending,setSetupPending]=useState(false);
  const [saveError,setSaveError]=useState(false);
  const [progress]=useState<Progress>(loadProgress);
  const [storyProgress,setStoryProgress]=useState<StoryProgress>(()=>hydrateStoryProgress(load<unknown>(STORY_KEY,null)));
  const [career,setCareer]=useState<CareerResult[]>(()=>load<CareerResult[]>(CAREER_KEY,[]));
  const persist=(key:string,value:unknown)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{setSaveError(true);}};
  useEffect(()=>{persist(GAME_KEY,game);},[game]);
  useEffect(()=>{persist(STORY_KEY,storyProgress);},[storyProgress]);
  useEffect(()=>{persist(PAGE_KEY,page);},[page]);
  useEffect(()=>{persist(CAREER_KEY,career);},[career]);
  useEffect(()=>{
    if(game.format!=='sitngo'||!game.matchOver||game.heroPlace==null)return;
    const id=game.tournamentId;
    setCareer(items=>items.some(x=>x.id===id)?items:[...items,{id,place:game.heroPlace!,players:game.order.length,points:game.tournamentAward,completedAt:Date.now()}].slice(-100));
  },[game.format,game.matchOver,game.heroPlace,game.tournamentId,game.tournamentAward,game.order.length]);
  useEffect(()=>{if('serviceWorker' in navigator&&import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>{});},[]);
  useEffect(()=>{persist(READY_KEY,started);},[started]);
  const navigate=(to:Page)=>{setPage(to);window.scrollTo({top:0,behavior:'instant'});};
  const startTable=(seats:number,chips:ChipInventory,blind:number,difficulty:BotDifficulty,format:GameFormat)=>{
    if(started&&!window.confirm('Начать новый стол? Текущий матч будет заменён.'))return;
    setGame(newMatch(seats,chips,blind,difficulty,format));setStarted(true);setSetupPending(false);
  };
  const configureTable=()=>{setSetupPending(true);};
    const isStory=page==='academy'&&Boolean(storyProgress.activeLesson);
    return <div className={`app-shell ${page==='play'?'playing':''} ${isStory?'story-playing':''}`}>
    {page!=='play'&&!isStory&&<aside className="desktop-rail"><button className="wordmark" onClick={()=>navigate('home')}>pocket<span>.</span></button><div className="desktop-tabs">{([{page:'home',name:'Клуб',icon:'home'},{page:'play',name:'Играть',icon:'spade'},{page:'academy',name:'Уроки',icon:'book'},{page:'stats',name:'Я',icon:'stats'}] as const).map(t=><button key={t.page} onClick={()=>navigate(t.page)} className={page===t.page?'active':''}><Icon name={t.icon}/>{t.name}</button>)}</div><small>POCKET · виртуальные фишки</small></aside>}
    {saveError&&<div className="storage-warning" role="alert"><strong>Прогресс не сохраняется.</strong> Хранилище браузера заполнено или недоступно. Не закрывай страницу, пока ошибка не устранена.</div>}
    <main className="app-main">{page!=='play'&&!isStory&&<Header onChange={navigate}/>}
      {page==='home'?<Home game={game} progress={storyProgress} started={started} onChange={navigate} onPractice={id=>{setStoryProgress(p=>openStory(p,id));navigate('academy');}} onNewTable={()=>{setSetupPending(true);navigate('play');}}/>:
        page==='play'?(started&&!setupPending?<GameTable game={game} setGame={setGame} onExit={()=>navigate('home')} onNewTable={configureTable}/>:<TableSetup defaultSeats={game.opponentCount} defaultChips={game.startingChips} defaultBlind={game.initialBlind} defaultDifficulty={game.botDifficulty} defaultFormat={game.format} onStart={startTable} onExit={()=>{setSetupPending(false);navigate('home');}}/>):
        page==='academy'?<Academy storyProgress={storyProgress} setStoryProgress={setStoryProgress} game={game}/>:
        <Stats game={game} progress={progress} storyProgress={storyProgress} career={career}/>}
    </main>
    {page!=='play'&&!isStory&&<TabBar page={page} onChange={navigate}/>}
  </div>;
}
