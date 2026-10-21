/* POCKET 0.1 — local play-money Texas Hold'em prototype. */
'use strict';

const STORE = 'pocket-game-v1', LEARN = 'pocket-lessons-v1';
const SUITS = ['♠','♥','♦','♣'], NAMES = ['Старшая карта','Пара','Две пары','Сет','Стрит','Флеш','Фулл-хаус','Каре','Стрит-флеш'];
const chapters = [
 {id:'rules', group:'01 · Первые карты',name:'Как устроена раздача',duration:'3 минуты',theory:'В техасском холдеме каждый получает две закрытые карты. Пять общих карт постепенно появляются на столе: три на флопе, одна на тёрне, одна на ривере. Побеждает лучшая комбинация из любых пяти карт либо игрок, который заставил остальных сбросить карты.',q:'Сколько общих карт может быть на столе к риверу?',options:['Две','Четыре','Пять'],answer:2,reason:'Флоп даёт три карты, тёрн четвёртую, а ривер пятую.'},
 {id:'hands',group:'01 · Первые карты',name:'Сила комбинаций',duration:'4 минуты',theory:'Комбинации по возрастанию: старшая карта, пара, две пары, сет, стрит, флеш, фулл-хаус, каре, стрит-флеш. При равенстве типов сравниваются достоинства карт и кикеры.',q:'Что сильнее?',options:['Флеш','Фулл-хаус','Стрит'],answer:1,reason:'Фулл-хаус сильнее флеша и стрита.'},
 {id:'position',group:'02 · Основы стратегии',name:'Позиция за столом',duration:'3 минуты',theory:'Игрок в позиции действует после оппонента на постфлопе. Это позволяет получать больше информации перед решением. В хедз-апе дилер действует первым префлоп и последним после флопа.',q:'Кто действует первым на флопе в хедз-апе?',options:['Дилер','Большой блайнд','Игрок с большим стеком'],answer:1,reason:'После флопа первым действует игрок вне позиции — большой блайнд.'},
 {id:'preflop',group:'02 · Основы стратегии',name:'Стартовые руки',duration:'5 минут',theory:'Сила стартовой руки зависит от парности, рангов, одномастности, связности, позиции и глубины стеков. Большие пары и сильные бродвейные комбинации обычно легче разыгрывать, чем случайные низкие разномастные карты.',q:'Какая из стартовых рук обычно наиболее сильная?',options:['A♠ A♥','8♣ 3♦','J♠ 4♥'],answer:0,reason:'Карманные тузы — самая сильная стартовая рука в холдеме.'},
 {id:'potodds',group:'03 · Покерная математика',name:'Шансы банка',duration:'6 минут',theory:'Если в банке 100 фишек и соперник ставит 50, колл стоит 50 ради итогового банка 200. Для безубыточного колла нужен шанс победы минимум 50 / 200 = 25%. Это упрощение без будущих ставок и рейка.',q:'Банк 100, ставка соперника 50. Какой минимальный шанс победы нужен для колла?',options:['20%','25%','33%'],answer:1,reason:'После твоего колла банк станет 200. 50 / 200 = 25%.'},
 {id:'variance',group:'03 · Покерная математика',name:'Дисперсия и результат',duration:'4 минуты',theory:'Хорошее решение иногда проигрывает, а плохое иногда выигрывает. Надёжный прогресс проверяют по качеству решений, большой выборке и силе соперников, а не по одной удачной сессии.',q:'Ты проиграл с вероятностью победы 80%. Значит ли это, что решение было плохим?',options:['Да, ведь проиграл','Нет, исход сам по себе не определяет качество решения'],answer:1,reason:'20% поражений всё равно случатся. Оценивать нужно решение и доступную на момент действия информацию.'}
];
const $ = (sel) => document.querySelector(sel);
let page = 'play', selected = null, picked = null;
let completed = read(LEARN, []);
let game = read(STORE, null);
function read(key, fallback){try{const data=JSON.parse(localStorage.getItem(key));return data==null?fallback:data;}catch{return fallback;}}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(game));localStorage.setItem(LEARN,JSON.stringify(completed));}catch{}}
function rank(r){return ({11:'J',12:'Q',13:'K',14:'A'})[r]||String(r);}
function cardLabel(c){return rank(c.r)+c.s;}
function makeDeck(){const a=[];for(const s of SUITS)for(let r=2;r<=14;r++)a.push({s,r});for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function straightHigh(r){const v=[...new Set(r)];if(v.includes(14))v.push(1);for(let high=14;high>=5;high--)if([0,1,2,3,4].every(d=>v.includes(high-d)))return high;return 0;}
function five(cs){
 const counts={};cs.forEach(c=>counts[c.r]=(counts[c.r]||0)+1);
 const groups=Object.entries(counts).map(([r,n])=>[+r,n]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
 const ranks=cs.map(c=>c.r).sort((a,b)=>b-a), flush=cs.every(c=>c.s===cs[0].s),str=straightHigh(ranks);
 let v;
 if(flush&&str)v=[8,str];
 else if(groups[0][1]===4)v=[7,groups[0][0],groups[1][0]];
 else if(groups[0][1]===3&&groups[1][1]===2)v=[6,groups[0][0],groups[1][0]];
 else if(flush)v=[5,...ranks];
 else if(str)v=[4,str];
 else if(groups[0][1]===3)v=[3,groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];
 else if(groups[0][1]===2&&groups[1][1]===2)v=[2,...groups.slice(0,2).map(g=>g[0]).sort((a,b)=>b-a),groups[2][0]];
 else if(groups[0][1]===2)v=[1,groups[0][0],...groups.slice(1).map(g=>g[0]).sort((a,b)=>b-a)];
 else v=[0,...ranks];
 return v;
}
function cmp(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return Math.sign((a[i]||0)-(b[i]||0));}return 0;}
function evaluate(cards){let best=null;for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){const value=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||cmp(value,best)>0)best=value;}return best;}
function makeGame(stacks=[1000,1000],button=0,hand=1,wins=0,played=0,ties=0){
 const deck=makeDeck(),players=stacks.map(stack=>({stack,bet:0,acted:false,hand:[],folded:false}));
 const g={deck,board:[],players,button,hand,wins,played,ties,pot:0,currentBet:0,minRaise:20,turn:button,street:'preflop',result:'',reveal:false,over:false,history:[]};
 for(let i=0;i<2;i++){players[button].hand.push(deck.pop());players[1-button].hand.push(deck.pop());}
 bet(g,button,10);bet(g,1-button,20);g.currentBet=20;
 say(g,'Раздача №'+hand+' · блайнды 10 / 20');
 return g;
}
function say(g,s){g.history.unshift(s);g.history.length=Math.min(g.history.length,30);}
function bet(g,p,n){const paid=Math.min(n,g.players[p].stack);g.players[p].stack-=paid;g.players[p].bet+=paid;g.pot+=paid;return paid;}
function callAmount(g,p){return Math.min(g.players[p].stack,Math.max(0,g.currentBet-g.players[p].bet));}
function maxRaise(g,p){const me=g.players[p],them=g.players[1-p];return Math.min(me.bet+me.stack,them.bet+them.stack);}
function minRaise(g,p){return Math.min(maxRaise(g,p),g.currentBet+g.minRaise);}
function finish(g,winner,show){
 if(winner===null){const h=Math.floor(g.pot/2);g.players[0].stack+=h;g.players[1].stack+=g.pot-h;g.ties++;}
 else{g.players[winner].stack+=g.pot;if(winner===0)g.wins++;}
 g.played++;g.pot=0;g.turn=null;g.street='showdown';g.reveal=show;g.over=g.players.some(p=>p.stack<20);
}
function showdown(g){
 const a=evaluate([...g.players[0].hand,...g.board]),b=evaluate([...g.players[1].hand,...g.board]),result=cmp(a,b);
 g.result=result>0?'Ты выиграл — '+NAMES[a[0]].toLowerCase()+'!':result<0?'Мартин выиграл — '+NAMES[b[0]].toLowerCase()+'.':'Ничья! Банк поделён.';
 say(g,'Вскрытие · ты: '+NAMES[a[0]].toLowerCase()+' · Мартин: '+NAMES[b[0]].toLowerCase());
 finish(g,result>0?0:result<0?1:null,true);
}
function nextStreet(g){
 if(g.street==='river'){showdown(g);return;}
 if(g.street==='preflop'){g.deck.pop();g.board.push(g.deck.pop(),g.deck.pop(),g.deck.pop());g.street='flop';}
 else if(g.street==='flop'){g.deck.pop();g.board.push(g.deck.pop());g.street='turn';}
 else {g.deck.pop();g.board.push(g.deck.pop());g.street='river';}
 g.players.forEach(p=>{p.bet=0;p.acted=false;});g.currentBet=0;g.minRaise=20;g.turn=1-g.button;
 say(g,({flop:'Флоп',turn:'Тёрн',river:'Ривер'})[g.street]+' · '+g.board.map(cardLabel).join(' '));
}
function act(p,kind,to){
 const g=game;if(!g||g.turn!==p||g.result)return false;
 const me=g.players[p],opp=g.players[1-p],due=g.currentBet-me.bet;
 if(kind==='fold'){
  me.folded=true;g.result=p===0?'Ты сбросил карты.':'Мартин сбросил карты. Банк твой!';
  say(g,(p===0?'Ты':'Мартин')+' · фолд');finish(g,1-p,false);
 }else{
  if(kind==='check'&&due>0)return false;
  if(kind==='raise'){
   const max=maxRaise(g,p),min=minRaise(g,p);
   if(!(max>g.currentBet&&to>g.currentBet&&to>=min&&to<=max))return false;
   const increment=to-g.currentBet;bet(g,p,to-me.bet);
   g.currentBet=to;g.minRaise=Math.max(1,increment);opp.acted=false;
   say(g,(p===0?'Ты':'Мартин')+' · рейз до '+to);
  }else if(kind==='call'){
   const paid=bet(g,p,due);
   say(g,(p===0?'Ты':'Мартин')+' · '+(paid?'колл '+paid:'чек'));
  }else if(kind==='check')say(g,(p===0?'Ты':'Мартин')+' · чек');
  else return false;
  me.acted=true;
  if(g.players[0].bet===g.players[1].bet&&g.players.some(x=>x.stack===0)){
   while(g.street!=='river')nextStreet(g);showdown(g);
  }else if(g.players.every(x=>x.acted)&&g.players[0].bet===g.players[1].bet){nextStreet(g);}
  else g.turn=1-p;
 }
 persist();render();
 if(game.turn===1&&!game.result)setTimeout(botAction,500);
 return true;
}
function botAction(){
 const g=game;if(!g||g.turn!==1||g.result)return;
 const me=g.players[1],due=callAmount(g,1),potOdds=due/(g.pot+due||1);
 let strength;
 if(g.street==='preflop'){
  const a=me.hand.map(x=>x.r).sort((a,b)=>b-a);
  strength=.16+a[0]/14*.23+a[1]/14*.1+(a[0]===a[1]?.33:0)+(me.hand[0].s===me.hand[1].s?.065:0);
 }else{
  const v=evaluate([...me.hand,...g.board]);strength=[.23,.43,.63,.79,.82,.87,.94,.98,.995][v[0]];
  if(SUITS.some(s=>[...me.hand,...g.board].filter(c=>c.s===s).length===4))strength=Math.max(strength,.43);
 }
 if(due>0&&strength<potOdds+.07&&Math.random()>.12){act(1,'fold');return;}
 const max=maxRaise(g,1),min=minRaise(g,1);
 if(max>g.currentBet&&strength>(due?.75:.57)&&Math.random()<(due?.24:.45)){
  const target=Math.min(max,Math.max(min,Math.round((g.currentBet+g.pot*.6+20)/10)*10));
  if(act(1,'raise',target))return;
 }
 act(1,due?'call':'check');
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(c,small=false,hidden=false){
 if(!c)return '<span class="card slot">✦</span>';
 if(hidden)return '<span class="card back'+(small?' small':'')+'">✦</span>';
 return '<span class="card'+(small?' small':'')+('♥♦'.includes(c.s)?' red':'')+'"><span>'+rank(c.r)+'</span><b>'+c.s+'</b></span>';
}
const chips=n=>Number(n||0).toLocaleString('ru-RU');
function table(){
 const g=game,h=g.players[0],b=g.players[1],my=g.turn===0&&!g.result,due=callAmount(g,0),max=maxRaise(g,0),min=minRaise(g,0);
 return '<section class="page"><div class="herohead"><div><p class="eyebrow">СВОБОДНАЯ ИГРА</p><h1>Твой покерный стол</h1><p>Хедз-ап · No-Limit Texas Hold’em · условные фишки</p></div><button class="subtle" id="restart">Новый матч ↗</button></div>'+
 '<div class="felt-frame"><div class="felt"><div class="opponent player"><div class="avatar orange">М</div><div class="player-name"><strong>Мартин</strong><small>Бот · осторожный</small><div class="stack">● '+chips(b.stack)+'</div></div><div class="pocket-cards">'+b.hand.map(c=>card(c,true,!g.reveal)).join('')+'</div>'+(g.button===1?'<span class="dealer">D</span>':'')+'</div>'+
 '<div class="tablecenter"><div class="pot"><small>БАНК</small><strong>● '+chips(g.pot)+'</strong></div><div class="board">'+Array.from({length:5},(_,i)=>card(g.board[i])).join('')+'</div><div class="street">'+({preflop:'Префлоп',flop:'Флоп',turn:'Тёрн',river:'Ривер',showdown:'Завершено'})[g.street]+' · №'+g.hand+'</div></div>'+
 '<div class="human player"><div class="avatar violet">Я</div><div class="player-name"><strong>Ты</strong><small>Игрок</small><div class="stack">● '+chips(h.stack)+'</div></div><div class="pocket-cards">'+h.hand.map(c=>card(c,true)).join('')+'</div>'+(g.button===0?'<span class="dealer">D</span>':'')+'</div></div></div>'+
 (g.result?'<div class="actions result"><div><strong>'+esc(g.result)+'</strong><p>'+(g.over?'Матч завершён. Начни новый.':'Можно сыграть следующую раздачу.')+'</p></div><button class="primary" id="next">'+(g.over?'Новый матч':'Следующая раздача')+' →</button></div>':
 '<div class="actions"><div class="acthead"><strong>'+(my?'Твой ход':'Мартин думает…')+'</strong><small>'+(my?'К ответу: '+chips(due)+' фишек':'Подбирает действие')+'</small></div><div class="actbuttons"><button id="fold" class="fold" '+(!my?'disabled':'')+'>Фолд</button><button id="call" class="light" '+(!my?'disabled':'')+'>'+(due?'Колл '+chips(due):'Чек')+'</button><button id="raise" class="primary" '+(!my||max<=g.currentBet?'disabled':'')+'>Рейз до <span id="raisevalue">'+chips(min)+'</span></button></div>'+
 (max>g.currentBet?'<div class="sliderline"><span>Размер рейза</span><input id="raiseamount" type="range" min="'+min+'" max="'+max+'" step="1" value="'+min+'" '+(!my?'disabled':'')+'><span>'+chips(max)+' макс.</span></div>':'')+'</div>')+
 '<div class="under"><div><h3>История раздачи</h3><div class="history">'+g.history.slice(0,7).map(x=>'<p>'+esc(x)+'</p>').join('')+'</div></div><aside class="note"><span>♡</span><strong>Играй в своём темпе</strong><p>Здесь нет реальных денег, таймеров и штрафов. Можно спокойно экспериментировать и ошибаться.</p></aside></div></section>';
}
function academy(){
 const num=completed.filter(x=>chapters.some(l=>l.id===x)).length;
 let text='<section class="page"><div class="herohead"><div><p class="eyebrow">АКАДЕМИЯ</p><h1>Умение начинается с любопытства.</h1><p>Короткие уроки, простые объяснения, практика сразу после теории.</p></div></div><div class="progress"><strong>'+num+' / '+chapters.length+'</strong><span> уроков пройдено</span><div><i style="width:'+(num/chapters.length*100)+'%"></i></div></div>';
 const lesson=chapters.find(l=>l.id===selected);
 if(lesson){
  text+='<button id="back" class="subtle">← Все уроки</button><div class="lesson"><p class="eyebrow">'+esc(lesson.group)+' · '+esc(lesson.duration)+'</p><h2>'+esc(lesson.name)+'</h2><p class="theory">'+esc(lesson.theory)+'</p><div class="quiz"><p class="eyebrow">ПРОВЕРЬ СЕБЯ</p><h3>'+esc(lesson.q)+'</h3><div class="answers">'+lesson.options.map((x,i)=>'<button data-answer="'+i+'" class="'+(picked===i?(i===lesson.answer?'correct':'wrong'):'')+'">'+esc(x)+'</button>').join('')+'</div>'+(picked!==null?'<div class="feedback"><strong>'+(picked===lesson.answer?'Верно!':'Попробуй ещё.')+'</strong><p>'+esc(lesson.reason)+'</p>'+(picked===lesson.answer?'<button id="complete" class="primary">Завершить урок →</button>':'')+'</div>':'')+'</div></div>';
 }else{
  const groups=[...new Set(chapters.map(l=>l.group))];
  text+=groups.map(g=>'<div class="chapter"><h2>'+esc(g)+'</h2><div class="lesson-grid">'+chapters.filter(l=>l.group===g).map(l=>'<button class="lesson-tile" data-lesson="'+l.id+'"><span class="number '+(completed.includes(l.id)?'done':'')+'">'+(completed.includes(l.id)?'✓':'✦')+'</span><strong>'+esc(l.name)+'</strong><small>'+esc(l.duration)+' · урок + тест</small><b>↗</b></button>').join('')+'</div></div>').join('');
 }
 return text+'</section>';
}
function stats(){
 const g=game,p=g.players[0].stack,net=p-1000;
 const tile=(a,b)=>'<div class="stat"><small>'+a+'</small><strong>'+b+'</strong></div>';
 return '<section class="page"><div class="herohead"><div><p class="eyebrow">МОЙ ПРОГРЕСС</p><h1>Растёшь с каждой раздачей.</h1><p>Пока здесь результаты текущего локального матча и учебный прогресс.</p></div></div><div class="stat-grid">'+tile('Пройдено уроков',completed.length+' / '+chapters.length)+tile('Завершено раздач',g.played)+tile('Победы',g.wins)+tile('Ничьи',g.ties)+'</div><div class="stat-hero"><p class="eyebrow">ТЕКУЩИЙ МАТЧ</p><h2>'+(net>=0?'+':'')+chips(net)+' фишек</h2><p>Текущий стек: '+chips(p)+' · стартовый стек: 1 000</p></div><div class="note full"><strong>Почему здесь нет оценки мастерства?</strong><p>Короткий матч ничего не доказывает. Позже добавим анализ решений и статистическую уверенность, чтобы не путать удачу с навыком.</p></div></section>';
}
function render(){
 if(!game||!game.players||!Array.isArray(game.players)||game.players.length!==2||!Array.isArray(game.deck))game=makeGame();
 $('#root').innerHTML='<div class="layout"><aside class="sidebar"><div class="brand"><span>♠</span><div><strong>POCKET<i>.</i></strong><small>poker club & academy</small></div></div><p class="menulabel">МЕНЮ</p><nav>'+nav('play','♠','Играть')+nav('academy','✧','Академия')+nav('stats','▤','Прогресс')+'</nav><div class="sidefoot"><span>♡</span><strong>У тебя всё получится.</strong><p>Один ход за другим. Без спешки.</p><small>POCKET · бесплатный прототип</small></div></aside><main><header class="topbar"><span>POCKET <i>/</i> '+({play:'Покерный клуб',academy:'Карта знаний',stats:'Твоя статистика'})[page]+'</span><small><b>●</b> офлайн · без ставок</small></header>'+(page==='play'?table():page==='academy'?academy():stats())+'</main></div><div class="mobile-nav">'+nav('play','♠','Играть')+nav('academy','✧','Академия')+nav('stats','▤','Прогресс')+'</div>';
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{page=b.dataset.nav;selected=null;picked=null;render();});
 if(page==='play'){
  $('#restart').onclick=()=>{if(confirm('Начать новый матч?')){game=makeGame();persist();render();if(game.turn===1)setTimeout(botAction,500);}};
  if(game.result)$('#next').onclick=()=>{game=game.over?makeGame():makeGame(game.players.map(x=>x.stack),1-game.button,game.hand+1,game.wins,game.played,game.ties);persist();render();if(game.turn===1)setTimeout(botAction,500);};
  else{
   $('#fold').onclick=()=>act(0,'fold');$('#call').onclick=()=>act(0,callAmount(game,0)?'call':'check');
   const range=$('#raiseamount');if(range){range.oninput=()=>$('#raisevalue').textContent=chips(range.value);}
   $('#raise').onclick=()=>act(0,'raise',Number(range?range.value:0));
  }
 }
 if(page==='academy'){
  document.querySelectorAll('[data-lesson]').forEach(x=>x.onclick=()=>{selected=x.dataset.lesson;picked=null;render();});
  if($('#back'))$('#back').onclick=()=>{selected=null;picked=null;render();};
  document.querySelectorAll('[data-answer]').forEach(x=>x.onclick=()=>{picked=Number(x.dataset.answer);render();});
  if($('#complete'))$('#complete').onclick=()=>{if(!completed.includes(selected))completed.push(selected);selected=null;picked=null;persist();render();};
 }
}
function nav(id,symbol,label){return '<button data-nav="'+id+'" class="nav '+(page===id?'active':'')+'"><span>'+symbol+'</span>'+label+'</button>';}
render();
if(game.turn===1&&!game.result)setTimeout(botAction,500);
