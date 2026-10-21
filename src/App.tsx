import { useEffect, useMemo, useState } from 'react';
import { act, amountToCall, botMove, cardText, maxRaiseTo, minRaiseTo, newMatch, nextHand, type Card, type GameState } from './engine';
import { lessons } from './lessons';

type Page = 'play'|'academy'|'stats';
const SAVE='pocket-v1-game';
const PROGRESS='pocket-v1-lessons';
const S = ({children}:{children:React.ReactNode})=><span className="small-muted">{children}</span>;
function loadGame():GameState {
  try {const value=JSON.parse(localStorage.getItem(SAVE)||'null');
    if(value?.players?.hero?.hand?.length===2 && value?.players?.bot?.hand?.length===2 && Array.isArray(value.deck))return value;
  } catch {/* corrupted save */}
  return newMatch();
}
function loadCompleted():string[] {try {const x=JSON.parse(localStorage.getItem(PROGRESS)||'[]');return Array.isArray(x)?x:[];}catch{return [];}}
function CardFace({card,back=false,small=false}:{card?:Card;back?:boolean;small?:boolean}) {
  const red=card?.suit==='♥'||card?.suit==='♦';
  return <div className={`poker-card ${small?'small':''} ${back||!card?'card-back':''} ${red?'red':''}`} aria-label={back?'Закрытая карта':card?cardText(card):'Пустое место'}>
    {card&&!back?<><span>{cardText(card)}</span><strong>{card.suit}</strong></>:<span className="card-symbol">✦</span>}
  </div>;
}
function CardSlot(){return <div className="card-slot">✦</div>;}
const money=(n:number)=>n.toLocaleString('ru-RU');
const streetTitle:Record<string,string>={preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Завершено'};

function GameTable({game,setGame}:{game:GameState;setGame:React.Dispatch<React.SetStateAction<GameState>>}){
  const [raise,setRaise]=useState(40);
  const hero=game.players.hero,bot=game.players.bot;
  const call=amountToCall(game,'hero');
  const minRaise=Math.min(minRaiseTo(game),maxRaiseTo(game,'hero'));
  const maxRaise=maxRaiseTo(game,'hero');
  const canRaise=maxRaise>game.currentBet && maxRaise>hero.streetBet;
  const myTurn=game.actor==='hero'&&!game.result;
  useEffect(()=>setRaise(minRaise),[game.handNumber,game.street,game.currentBet,minRaise]);
  useEffect(()=>{
    if(game.actor!=='bot'||game.result)return;
    const timeout=setTimeout(()=>setGame(s=>s.actor==='bot'?act(s,'bot',botMove(s)):s),650);
    return ()=>clearTimeout(timeout);
  },[game,setGame]);
  const submit=(kind:'fold'|'check'|'call'|'raise')=>setGame(s=>act(s,'hero',{kind,to:raise}));
  return <section className="playing-area">
    <div className="table-header">
      <div><span className="eyebrow">СВОБОДНАЯ ИГРА</span><h1>Твой покерный стол</h1><p>Хедз-ап · No-Limit Texas Hold'em · условные фишки</p></div>
      <button className="quiet-button" onClick={()=>{if(window.confirm('Начать матч заново? Текущий стек сбросится.'))setGame(newMatch());}}>Новый матч ↗</button>
    </div>
    <div className="felt-frame">
      <div className="felt">
        <div className="opponent player-panel">
          <div className="round-avatar orange">M</div>
          <div><strong>Мартин</strong><S>Бот · осторожный</S><div className="chip-counter">● {money(bot.stack)}</div></div>
          <div className="player-cards">{bot.hand.map((c,i)=><CardFace key={i} card={c} back={!game.revealBot} small />)}</div>
          {game.button==='bot'&&<span className="dealer-chip">D</span>}
          {game.actor==='bot'&&<span className="turn-marker">думает…</span>}
        </div>
        <div className="felt-center">
          <div className="pot-info"><span>БАНК</span><strong>● {money(game.pot)}</strong></div>
          <div className="board-cards">{Array.from({length:5},(_,i)=>game.board[i]?<CardFace key={i} card={game.board[i]} />:<CardSlot key={i}/>)}</div>
          <span className="street-pill">{streetTitle[game.street]} · №{game.handNumber}</span>
        </div>
        <div className="hero player-panel">
          <div className="round-avatar lavender">Я</div>
          <div><strong>Ты</strong><S>Игрок</S><div className="chip-counter">● {money(hero.stack)}</div></div>
          <div className="player-cards">{hero.hand.map((c,i)=><CardFace key={i} card={c} small />)}</div>
          {game.button==='hero'&&<span className="dealer-chip">D</span>}
          {game.actor==='hero'&&<span className="turn-marker">твой ход</span>}
        </div>
      </div>
    </div>
    {game.result?<div className="result-panel"><div><strong>{game.result}</strong><p>{game.matchOver?'Матч закончен — один из стеков меньше большого блайнда.':'Посмотри итог и начни следующую раздачу.'}</p></div><button className="primary-button" onClick={()=>setGame(s=>nextHand(s))}>{game.matchOver?'Новый матч':'Следующая раздача'} →</button></div>
      :<div className="action-panel">
        <div className="action-title"><strong>{myTurn?'Твой ход': 'Ход соперника'}</strong><S>{myTurn?`К ответу: ${money(call)} фишек`:'Соперник принимает решение…'}</S></div>
        <div className="action-buttons">
          <button disabled={!myTurn} className="fold-button" onClick={()=>submit('fold')}>Фолд</button>
          <button disabled={!myTurn} className="light-button" onClick={()=>submit(call?'call':'check')}>{call?`Колл ${money(call)}`:'Чек'}</button>
          <button disabled={!myTurn||!canRaise} className="primary-button" onClick={()=>submit('raise')}>Рейз до {money(Math.max(minRaise,Math.min(raise,maxRaise)))}</button>
        </div>
        {canRaise&&<div className="bet-controls"><span>Размер рейза</span><input aria-label="Размер рейза" type="range" min={minRaise} max={maxRaise} step="1" disabled={!myTurn} value={Math.max(minRaise,Math.min(raise,maxRaise))} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setRaise(Number(e.target.value))}/><span>{money(Math.max(minRaise,Math.min(raise,maxRaise)))}</span></div>}
      </div>}
    <div className="under-table"><div><h3>История раздачи</h3><div className="history-list">{game.history.slice(0,5).map((entry,i)=><p key={i}>{entry}</p>)}</div></div><div className="hint-card"><div className="hint-icon">♡</div><strong>Играй в своём темпе</strong><p>Здесь нет реальных денег, таймеров и штрафов. Ошибаться можно сколько угодно.</p></div></div>
  </section>;
}
function Academy({completed,setCompleted}:{completed:string[];setCompleted:React.Dispatch<React.SetStateAction<string[]>>}){
  const [selected,setSelected]=useState<string|null>(null);
  const [choice,setChoice]=useState<number|null>(null);
  const active=lessons.find(l=>l.id===selected);
  const correct=active && choice===active.answer;
  const grouped=Object.entries(lessons.reduce<Record<string,typeof lessons>>((a,l)=>{(a[l.chapter]??=[]).push(l);return a;},{}));
  return <section className="content-page">
    <div className="page-intro"><span className="eyebrow">АКАДЕМИЯ</span><h1>Умение начинается с любопытства.</h1><p>Короткие уроки, простые объяснения и сразу практика. Можно идти в любом порядке.</p></div>
    <div className="academy-progress"><div><strong>{completed.length} / {lessons.length}</strong><span>уроков пройдено</span></div><div className="progress-track"><div style={{width:`${100*completed.length/lessons.length}%`}}/></div></div>
    {active?<div className="lesson-detail">
       <button className="back-link" onClick={()=>{setSelected(null);setChoice(null)}}>← К карте уроков</button>
       <span className="eyebrow">{active.chapter} · {active.duration}</span><h2>{active.title}</h2><p className="lesson-theory">{active.theory}</p>
       <div className="quiz-panel"><span className="eyebrow">ПРОВЕРЬ СЕБЯ</span><h3>{active.prompt}</h3><div className="quiz-options">{active.options.map((opt,i)=><button key={i} className={`quiz-answer ${choice===i?(correct?'correct':'incorrect'):''}`} onClick={()=>setChoice(i)}>{opt}</button>)}</div>
       {choice!==null&&<div className={`lesson-feedback ${correct?'is-correct':''}`}><strong>{correct?'Верно!':'Пока нет, попробуй ещё.'}</strong><p>{active.explanation}</p>{correct&&<button className="primary-button" onClick={()=>{setCompleted(c=>c.includes(active.id)?c:[...c,active.id]);setSelected(null);setChoice(null)}}>Завершить урок →</button>}</div>}</div>
     </div>:<div className="chapter-list">{grouped.map(([chapter,group])=><div className="chapter" key={chapter}><h2>{chapter}</h2><div className="lesson-grid">{group.map((l,i)=><button className="lesson-tile" key={l.id} onClick={()=>{setSelected(l.id);setChoice(null)}}><div className={`lesson-icon ${completed.includes(l.id)?'done':''}`}>{completed.includes(l.id)?'✓':String(i+1).padStart(2,'0')}</div><strong>{l.title}</strong><span>{l.duration} · {completed.includes(l.id)?'пройдено':'урок + тест'}</span><b>↗</b></button>)}</div></div>)}</div>}
  </section>;
}
function Stats({game,completed}:{game:GameState;completed:string[]}){
  const h=game.players.hero.stack;
  const net=h-1000;
  const winRate=game.handsFinished?Math.round(game.heroWins/game.handsFinished*100):0;
  const badges=[['Курсы',`${completed.length} / ${lessons.length}`],['Раздачи',String(game.handsFinished)],['Победы',String(game.heroWins)],['Победы / раздачи',`${winRate}%`]];
  return <section className="content-page"><div className="page-intro"><span className="eyebrow">МОЙ ПРОГРЕСС</span><h1>Растёшь с каждой раздачей.</h1><p>Пока это статистика локального матча. Когда добавим историю решений, здесь появится глубокая аналитика игры.</p></div>
  <div className="stat-grid">{badges.map(([title,value])=><div className="stat-tile" key={title}><S>{title}</S><strong>{value}</strong></div>)}</div>
  <div className="stat-banner"><div><span className="eyebrow">ТЕКУЩИЙ МАТЧ</span><h2>{net>=0?'+':''}{money(net)} фишек</h2><p>Текущий стек: {money(h)} · стартовый стек: 1 000</p></div><div className="circle-stat">{winRate}%<small>побед</small></div></div>
  <div className="stats-note"><strong>Почему здесь пока нет «уровня мастерства»?</strong><p>Шесть уроков и один короткий матч ничего не доказывают. Позже оценка будет учитывать качество решений, выборку и сложность ситуаций — чтобы удача не маскировалась под навык.</p></div>
  </section>;
}
export default function App(){
  const [page,setPage]=useState<Page>('play');
  const [game,setGame]=useState<GameState>(loadGame);
  const [completed,setCompleted]=useState<string[]>(loadCompleted);
  useEffect(()=>{try{localStorage.setItem(SAVE,JSON.stringify(game));}catch{/* storage disabled */}},[game]);
  useEffect(()=>{try{localStorage.setItem(PROGRESS,JSON.stringify(completed));}catch{/* storage disabled */}},[completed]);
  useEffect(()=>{if('serviceWorker' in navigator && import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>{});},[]);
  const subtitle=useMemo(()=>page==='play'?'Покерный клуб':page==='academy'?'Карта знаний':'Твоя статистика',[page]);
  const navigation:[Page,string,string][]=[['play','♠','Играть'],['academy','✧','Академия'],['stats','▤','Прогресс']];
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-icon">♠</div><div><strong>POCKET<span>.</span></strong><small>poker club & academy</small></div></div>
      <div className="nav-label">МЕНЮ</div><nav>{navigation.map(([key,icon,label])=><button key={key} className={`nav-link ${page===key?'active':''}`} onClick={()=>setPage(key)}><span>{icon}</span>{label}{page===key&&<b>•</b>}</button>)}</nav>
      <div className="sidebar-footer"><div className="side-decoration">♥</div><strong>У тебя всё получится.</strong><p>Один ход за другим. Без спешки.</p><span>POCKET · бесплатный прототип</span></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumbs">POCKET <span>/</span> {subtitle}</div><div className="topbar-tag"><span className="online-dot"/> офлайн · без ставок</div></header>
     {page==='play'?<GameTable game={game} setGame={setGame}/>:page==='academy'?<Academy completed={completed} setCompleted={setCompleted}/>:<Stats game={game} completed={completed}/>}</main>
    <nav className="mobile-nav">{navigation.map(([key,icon,label])=><button className={page===key?'active':''} onClick={()=>setPage(key)} key={key}><span>{icon}</span>{label}</button>)}</nav>
  </div>;
}
