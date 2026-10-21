/** Deterministic animated lessons. Every scene has a visual action and a short narration.
 * No random cards, knowledge gates or graded questions in Story Mode. */
import {modules as legacyModules} from './lessons.ts';

export type StorySceneType = 'intro'|'deal'|'blinds'|'action-demo'|'board-reveal'|'compare'|'range'|'takeaway';
export type StoryScene={
 id:string;type:StorySceneType;title:string;narration:string;
 note?:string;heroCards?:string[];villainCards?:string[];board?:string[];
 pot?:number;heroBet?:number;villainBet?:number;highlight?:string[];
 visualLabel?:string;animation?:'cards'|'chips'|'reveal'|'winner'|'focus';
};
export type StoryLesson={id:string;title:string;chapter:string;teaser:string;scenes:StoryScene[]};
const scene=(id:string,type:StorySceneType,title:string,narration:string,rest:Partial<StoryScene>={}):StoryScene=>({id,type,title,narration,...rest});
export const storyLessons:StoryLesson[]=[
 {id:'firstmoves',title:'Твоя первая раздача',chapter:'С самого начала',teaser:'Восемь сцен, чтобы понять весь ход игры.',scenes:[
  scene('welcome','intro','Садись за стол','В покере мы собираем лучшую комбинацию из пяти карт и боремся за общий банк.',{visualLabel:'ДВА ИГРОКА · ОДИН БАНК',pot:0,animation:'focus'}),
  scene('deal','deal','Две карты — только твои','Каждый получает две личные карты. Свои ты видишь, а чужие пока закрыты.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],animation:'cards'}),
  scene('blinds','blinds','Банк появляется первым','Перед раздачей два игрока ставят блайнды: 5 и 10 фишек. В банке уже 15.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],pot:15,heroBet:5,villainBet:10,animation:'chips'}),
  scene('actions','action-demo','Три главных действия','Фолд — сбросить. Колл — ответить на ставку. Рейз — повысить. Когда отвечать не на что, можно сделать чек.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],pot:20,heroBet:10,villainBet:10,visualLabel:'КОЛЛ 5 · ЧЕК',animation:'chips'}),
  scene('flop','board-reveal','Флоп: три карты','Три общие карты доступны всем. Туз у тебя в руке и туз на столе — у тебя пара.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],board:['A♦','7♣','2♥'],pot:20,highlight:['A♠','A♦'],animation:'reveal'}),
  scene('turn','board-reveal','Тёрн: четвёртая карта','Открывается ещё одна общая карта — Q♣. После тёрна игроки снова могут ставить.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],board:['A♦','7♣','2♥','Q♣'],pot:20,animation:'reveal'}),
  scene('river','board-reveal','Ривер: последняя карта','Пятая общая карта — 4♦. Теперь доступны все семь карт: две личные и пять общих.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],board:['A♦','7♣','2♥','Q♣','4♦'],pot:20,animation:'reveal'}),
  scene('showdown','compare','Вскрытие: ты победил','У тебя пара тузов. У соперника пара дам. Побеждает старшая пара — банк из 20 фишек твой.',{heroCards:['A♠','K♠'],villainCards:['K♦','Q♥'],board:['A♦','7♣','2♥','Q♣','4♦'],pot:20,highlight:['A♠','A♦'],visualLabel:'ПАРА ТУЗОВ > ПАРА ДАМ',animation:'winner',note:'Это учебная раздача: на флопе, тёрне и ривере оба игрока делают чек.'})
 ]},
 {id:'preflop',title:'С чего начинается хорошая рука',chapter:'Префлоп',teaser:'Почему место за столом меняет решение.',scenes:[
  scene('intro','intro','Не каждая рука стоит игры','До флопа важно не только то, какие две карты ты получил.',{heroCards:['T♣','7♦'],visualLabel:'ПРЕФЛОП'}),
  scene('early','range','С ранней позиции осторожнее','После тебя ещё много игроков. Слабые руки чаще стоит пропустить.',{heroCards:['T♣','7♦'],visualLabel:'РАННЯЯ ПОЗИЦИЯ',animation:'focus'}),
  scene('button','deal','На баттоне проще','Баттон часто действует последним после флопа и видит больше действий других.',{heroCards:['A♣','8♣'],visualLabel:'БАТТОН',animation:'cards'}),
  scene('range','range','Думай группами рук','Диапазон — это набор рук, с которыми соперник способен так сыграть.',{heroCards:['A♣','8♣'],villainCards:['K♦','Q♦'],animation:'focus'}),
  scene('takeaway','takeaway','Сила зависит от места','Рука, которую стоит сбросить рано, иногда отлично подходит для рейза на баттоне.',{heroCards:['A♣','8♣'],visualLabel:'ПОЗИЦИЯ + РУКА'})
 ]},
 {id:'value',title:'Как выигрывать больше фишек',chapter:'Постфлоп',teaser:'Ставки на сильных руках без жадности.',scenes:[
  scene('intro','intro','Ты собрал сильную руку','Теперь важно не напугать соперника слишком большой ставкой.',{heroCards:['A♠','Q♠'],board:['A♦','7♣','2♥'],highlight:['A♠','A♦']}),
  scene('bet','blinds','Зачем мы ставим','Вэлью — это ставка, которую могут оплатить более слабые руки.',{heroCards:['A♠','Q♠'],board:['A♦','7♣','2♥'],pot:80,heroBet:25,animation:'chips'}),
  scene('small','action-demo','Маленькая ставка','На спокойном флопе часть слабых рук может оплатить небольшую ставку.',{heroCards:['A♠','Q♠'],board:['A♦','7♣','2♥'],pot:105,visualLabel:'СТАВКА 25 ИЗ БАНКА 80'}),
  scene('big','action-demo','Большая — не всегда лучше','Крупная ставка иногда заставит почти все слабые руки уйти.',{heroCards:['A♠','Q♠'],board:['A♦','7♣','2♥'],pot:160,heroBet:80,visualLabel:'СТАВКА 80 ИЗ БАНКА 80'}),
  scene('takeaway','takeaway','Представляй ответ соперника','Вопрос не только в том, насколько сильна твоя рука, но и в том, кто готов заплатить.',{heroCards:['A♠','Q♠'],board:['A♦','7♣','2♥']})
 ]},
 {id:'math',title:'Когда платить за следующую карту',chapter:'Шансы банка',teaser:'Одна формула, объяснённая движением фишек.',scenes:[
  scene('intro','intro','Не угадывай наугад','Иногда рука ещё не готова, но следующая карта может помочь.',{heroCards:['A♠','8♠'],board:['K♠','6♠','2♦','J♣'],animation:'cards'}),
  scene('draw','board-reveal','Не хватает одной пики','У тебя уже четыре пики. Любая следующая пика даёт флеш, но не обязательно победу.',{heroCards:['A♠','8♠'],board:['K♠','6♠','2♦','J♣'],highlight:['A♠','8♠','K♠','6♠']}),
  scene('price','blinds','Сколько стоит попытка','Банк был 100. Соперник ставит 50. Колл стоит ещё 50.',{heroCards:['A♠','8♠'],board:['K♠','6♠','2♦','J♣'],pot:150,heroBet:50,animation:'chips'}),
  scene('odds','range','Нужна хотя бы четверть','Если банк уже 150 и колл стоит 50, тебе нужна вероятность выигрыша не ниже 25% при отсутствии будущих ставок и дележа.',{heroCards:['A♠','8♠'],board:['K♠','6♠','2♦','J♣'],pot:150,visualLabel:'50 / (150 + 50) = 25%'}),
  scene('takeaway','takeaway','Не все ауты равны','Шанс улучшить руку — не то же самое, что шанс победить. Сначала оцени силу соперника.',{heroCards:['A♠','8♠'],board:['K♠','6♠','2♦','J♣']})
 ]},
 {id:'ranges',title:'Что может быть у соперника',chapter:'Диапазоны',teaser:'Не угадывай две точные карты.',scenes:[
  scene('intro','intro','Ты не видишь чужую руку','На практике мы оцениваем сразу несколько возможных комбинаций.',{heroCards:['Q♠','J♠'],villainCards:['A♦','K♦']}),
  scene('group','range','Сначала широкий выбор','До действий у соперника могут быть пары, тузы, одномастные карты и слабые руки.',{visualLabel:'МНОГО ВОЗМОЖНЫХ РУК',animation:'focus'}),
  scene('raise','action-demo','Рейз даёт подсказку','Если соперник осторожен и повышает из ранней позиции, его диапазон обычно сильнее.',{pot:40,villainBet:30,visualLabel:'РЕЙЗ ИЗ РАННЕЙ ПОЗИЦИИ',animation:'chips'}),
  scene('narrow','range','Отбрасывай менее вероятное','После действий диапазон сужается. Но нельзя уверенно приписать одну конкретную руку.',{villainCards:['A♦','K♦'],visualLabel:'ДИАПАЗОН СУЖАЕТСЯ'}),
  scene('takeaway','takeaway','Обновляй оценку','Новые ставки и карты — новая информация. Подумай, какие руки теперь правдоподобнее.',{heroCards:['Q♠','J♠'],board:['Q♦','7♣','3♠']})
 ]},
 {id:'bluff',title:'Когда блеф имеет смысл',chapter:'Блеф',teaser:'Почему одной смелости недостаточно.',scenes:[
  scene('intro','intro','Блеф — это тоже ставка','Ты можешь выиграть банк, даже если у тебя сейчас худшая рука.',{heroCards:['8♣','7♣'],board:['A♠','K♦','2♥']}),
  scene('fold','action-demo','Блеф работает, когда соперник сбрасывает','Мы ставим, надеясь выбить лучшие руки. Но не все игроки любят фолдить.',{heroCards:['8♣','7♣'],board:['A♠','K♦','2♥'],pot:100,heroBet:50,animation:'chips'}),
  scene('price','blinds','Размер имеет значение','Поставив 50 в банк 100, ты рискуешь 50 ради выигрыша 100 до своей ставки.',{pot:150,heroBet:50,visualLabel:'РИСК 50 · ПРИЗ 100'}),
  scene('read','range','Смотри, кто напротив','Если соперник почти всё коллирует, многие блефы перестают быть хорошей идеей.',{heroCards:['8♣','7♣'],villainCards:['Q♣','J♣']}),
  scene('takeaway','takeaway','Нужна причина, а не отвага','Хороший блеф учитывает диапазон соперника, размер ставки и вероятность фолда.',{heroCards:['8♣','7♣'],board:['A♠','K♦','2♥']})
 ]},
 {id:'tournament',title:'Почему в турнире фишки ценнее',chapter:'Турниры',teaser:'Выживание и призовые меняют решения.',scenes:[
  scene('intro','intro','Турнир — не обычный стол','Если потеряешь все фишки, обычно выбываешь из турнира.',{visualLabel:'ТУРНИР · ТРИ ИГРОКА'}),
  scene('stacks','range','Сравни размеры стеков','Важны не только твои карты, но и то, кто может вылететь следующим.',{visualLabel:'СТЕКИ 8 BB · 14 BB · 60 BB'}),
  scene('bubble','action-demo','На границе призов осторожнее','Близость выплат может сделать рискованный колл невыгодным даже при плюсовом chip EV.',{heroCards:['9♠','8♠'],visualLabel:'БАББЛ · ПЕРЕД ПРИЗАМИ'}),
  scene('icm','range','Фишки и деньги — разные вещи','ICM связывает фишки с вероятностями занять призовые места. Это модель, а не гарантия.',{visualLabel:'ICM ≠ CHIP EV'}),
  scene('takeaway','takeaway','Не играй как в кэш','В турнире учитывай стеки, структуру призов и цену выбывания.',{heroCards:['9♠','8♠']})
 ]},
 {id:'gto',title:'Почему нет одной волшебной стратегии',chapter:'Сильная игра',teaser:'GTO и адаптация к живым соперникам.',scenes:[
  scene('intro','intro','Одна рука — несколько линий','Иногда разные действия разумны при разных условиях и диапазонах.',{heroCards:['A♣','5♣'],board:['K♦','7♣','2♠']}),
  scene('balance','range','GTO — про сбалансированную игру','Стратегия старается быть устойчивой к эксплуатации. Некоторые действия смешиваются с разной частотой.',{visualLabel:'БАЛАНС ЧАСТОТ'}),
  scene('profile','deal','Но люди играют по-разному','Против того, кто часто сбрасывает карты, одни блефы становятся привлекательнее.',{villainCards:['Q♠','J♠'],animation:'focus'}),
  scene('exploit','action-demo','Подстройка — не случайность','Эксплойт использует подтверждённые особенности соперника, а не догадки по двум раздачам.',{heroCards:['A♣','5♣'],pot:90,heroBet:30}),
  scene('takeaway','takeaway','Всегда проверяй допущения','Решение солвера верно для его модели. Изменились стеки или диапазоны — изменится и стратегия.',{heroCards:['A♣','5♣']})
 ]},
 {id:'mindset',title:'Как мыслить на дистанции',chapter:'Дисциплина',teaser:'Хорошее решение иногда проигрывает.',scenes:[
  scene('intro','intro','Даже тузы проигрывают','Сильная стартовая рука не гарантирует победу в каждой раздаче.',{heroCards:['A♠','A♥'],villainCards:['7♣','7♦']}),
  scene('variance','board-reveal','Одна карта может всё изменить','Случайная карта меняет победителя. Это дисперсия, а не обязательно ошибка.',{heroCards:['A♠','A♥'],villainCards:['7♣','7♦'],board:['7♠','J♥','2♦','4♣','9♣'],highlight:['7♠','7♣','7♦'],animation:'reveal'}),
  scene('review','compare','Смотри на решение, а не результат','Хорошее решение оценивают по информации, доступной в момент действия.',{heroCards:['A♠','A♥'],villainCards:['7♣','7♦'],board:['7♠','J♥','2♦','4♣','9♣']}),
  scene('rest','range','После серии неудач не спеши','Когда хочется срочно отыграться, стоит остановиться и проверить свои решения.',{visualLabel:'ПАУЗА — ТОЖЕ РЕШЕНИЕ'}),
  scene('takeaway','takeaway','Покер — игра дистанции','Нужны качество решений, разумный риск и достаточная выборка, а не одна удачная серия.',{heroCards:['A♠','A♥']})
 ]}
];
// Keep the original substantive theory accessible on demand. The user sees
// one animated point at a time, and can expand each supporting explanation.
for(const lesson of storyLessons){
 if(lesson.id==='firstmoves')continue;
 const legacy=legacyModules.find(x=>x.id===lesson.id);
 legacy?.theory.forEach((part,index)=>{
  const visual=lesson.scenes[index+1];
  if(visual&&!visual.note)visual.note=part.heading+' — '+part.text;
 });
}
export const getStoryLesson=(id:string)=>storyLessons.find(lesson=>lesson.id===id);
export function validStoryData(lessons:StoryLesson[]=storyLessons):boolean{
 const ids=new Set<string>();
 for(const lesson of lessons){
  if(ids.has(lesson.id)||!lesson.scenes.length)return false;
  ids.add(lesson.id);
  const sceneIds=new Set<string>();
  for(const item of lesson.scenes){
   if(sceneIds.has(item.id)||!item.title||!item.narration||item.narration.length>230)return false;
   sceneIds.add(item.id);
   const cards=[...(item.heroCards??[]),...(item.villainCards??[]),...(item.board??[])];
   if(new Set(cards).size!==cards.length||item.board?.length&&item.board.length>5)return false;
  }
 }
 return true;
}
