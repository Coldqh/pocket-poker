import {type CSSProperties} from 'react';
import type {StoryScene} from './story-lessons';
import {storyMotion,type CardMotion} from './story-motion';

function Face({value,hidden=false,marked=false,motion='still',delay=0}:{value:string;hidden?:boolean;marked?:boolean;motion?:CardMotion;delay?:number}){
 const red=value.includes('♥')||value.includes('♦');
 const animated=motion==='deal'?'enter':motion==='flip'?'flip':motion==='highlight'?'highlight-new':'';
 return <div className={'story-card '+(hidden?'back ':'')+(red?'red ':'')+(marked?'marked ':'')+animated} style={{'--deal-delay':delay+'ms'} as CSSProperties} aria-label={hidden?'Карта рубашкой вверх':value}>
  <span>{hidden?'':value}</span><b>{hidden?'P':value.slice(-1)}</b>
 </div>;
}
function CardRow({cards=[],hidden=false,highlight=[],motions=[],offset=0,replay=0}:{cards?:string[];hidden?:boolean;highlight?:string[];motions?:CardMotion[];offset?:number;replay?:number}){
 return <div className="story-cards">{cards.map((value,i)=><Face key={i+'-'+value+'-'+(hidden?'back':'face')+'-'+replay} value={value} hidden={hidden} marked={highlight.includes(value)} motion={motions[i]??'still'} delay={offset+i*130}/>)}</div>;
}
function ChipPile({count=3}:{count?:number}){
 return <span className="story-chip-pile" aria-hidden="true">{Array.from({length:count},(_,i)=><i key={i} style={{'--chip-layer':i} as CSSProperties}/>)}</span>;
}
const demoHands=[['A♠','A♥'],['K♠','Q♠'],['8♣','7♣'],['7♦','2♠']];
export default function LessonVisual({scene,previousScene=null,replay=0,reducedMotion=false}:{scene:StoryScene;previousScene?:StoryScene|null;replay?:number;reducedMotion?:boolean}){
 const cards=[scene.heroCards??[],scene.villainCards??[],scene.board??[]];
 const hasActual=cards.some(x=>x.length);
 const reveal=scene.type==='compare';
 const marked=scene.highlight??[];
 const motion=storyMotion(previousScene,scene);
 // Keep the same outer table DOM between scenes: only newly dealt / revealed
 // cards remount and animate. The replay token changes solely on user request.
 return <section className={'story-visual story-visual-'+scene.type+(reducedMotion?' story-still':'')} aria-label={'Учебная иллюстрация: '+scene.title}>
  <div className="story-felt" aria-hidden="true"><div className="story-felt-rim"/>
   <div className="story-opponent">
     <span className="story-seat"><span className="story-seat-icon">♠</span><small>СОПЕРНИК</small></span>
     {scene.villainCards?.length?<CardRow cards={scene.villainCards} hidden={!reveal} highlight={marked} motions={motion.villain} offset={0} replay={replay}/>:<span className="story-avatar-filler">??</span>}
   </div>
   <div className="story-table-middle">
    <div className={'story-pot '+(motion.showWinner?'story-pot-winner':'')}>
     <ChipPile/>
     <span className={motion.potChanged?'story-pot-new':''} key={(scene.pot??'empty')+'-'+replay}>{scene.pot!==undefined?'БАНК '+scene.pot:'БАНК'}</span>
    </div>
    {scene.board?.length?<CardRow cards={scene.board} highlight={marked} motions={motion.board} offset={350} replay={replay}/>:<div className="story-board-placeholders">{Array.from({length:5},(_,i)=><span key={i}/>)}</div>}
   </div>
   <div className="story-player">
    <span className="story-seat story-seat-hero"><span className="story-seat-icon">★</span><small>ТЫ</small></span>
    {scene.heroCards?.length?<CardRow cards={scene.heroCards} highlight={marked} motions={motion.hero} offset={180} replay={replay}/>:<div className="story-hand-placeholder"><i/><i/></div>}
   </div>
   {motion.chipDirection&&<div key={scene.id+'-'+replay} className={'story-bet-flow '+(motion.chipDirection==='out'?'reverse':'')} aria-hidden="true"><span className="story-bet-chip"/><span className="story-bet-chip"/><span className="story-bet-chip"/></div>}
  </div>
  {scene.type==='range'&&<div className="story-hand-range">{demoHands.map((hand,i)=><span key={hand.join('')} className={'story-range-set '+(i>1?'muted':'')}>{hand.join(' ')}</span>)}</div>}
  {(scene.visualLabel||scene.animation==='winner')&&<div className="story-visual-stamp">{scene.visualLabel??'БАНК ТЕБЕ'}</div>}
  {!hasActual&&scene.type!=='range'&&<span className="story-visual-footnote">{scene.type==='intro'?'Учимся прямо за столом':'Наблюдаем, как меняется раздача'}</span>}
 </section>;
}
