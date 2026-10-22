import {useState} from 'react';
import {storyLessons} from './story-lessons';
import {completedStoryCount,seenCount,type StoryProgress} from './story-progress';

export default function AcademyStories({progress,onOpen,onLab}:{progress:StoryProgress;onOpen:(id:string)=>void;onLab:()=>void}){
 const [showAll,setShowAll]=useState(false);
 const inProgress=storyLessons.find(l=>progress.lessons[l.id]&&!progress.lessons[l.id].completedAt);
 const next=inProgress??storyLessons.find(l=>!progress.lessons[l.id]?.completedAt)??storyLessons[0];
 const completed=completedStoryCount(progress);
 const nextRecord=progress.lessons[next.id];
 const lessons=showAll?storyLessons:storyLessons.slice(0,4);
 return <div className="story-academy">
  <div className="story-academy-heading"><span className="eyebrow">ОБУЧЕНИЕ</span><h1>Уроки покера</h1><p>Правила, комбинации и решения в раздаче.</p></div>
  <button className="story-feature" onClick={()=>onOpen(next.id)}>
   <span className="story-feature-label">{inProgress?'ПРОДОЛЖИТЬ УРОК':'СЛЕДУЮЩИЙ УРОК'} <span>{String(Math.max(1,storyLessons.findIndex(l=>l.id===next.id)+1)).padStart(2,'0')} / {storyLessons.length}</span></span>
   <span className="story-feature-middle"><span className="story-feature-copy"><strong>{next.title}</strong><small>{next.teaser}</small></span><span className="story-feature-art" aria-hidden="true"><span>A♠</span><span>K♥</span></span></span>
   <span className="story-feature-bottom"><span>{nextRecord?seenCount(progress,next.id)+' / '+next.scenes.length+' частей пройдено':next.scenes.length+' частей'}</span><span>{inProgress?'Продолжить':'Начать'} →</span></span>
  </button>
  <div className="story-shelf-heading"><div><span className="eyebrow">СОДЕРЖАНИЕ</span><h2>Темы</h2></div><span>{completed} из {storyLessons.length}</span></div>
  <div className="story-shelf">
   {lessons.map((lesson,i)=>{
    const record=progress.lessons[lesson.id],done=Boolean(record?.completedAt);
    return <button className="story-shelf-item" key={lesson.id} onClick={()=>onOpen(lesson.id)}>
     <span className={'story-shelf-index story-shelf-index-'+(i%4)}>{String(i+1).padStart(2,'0')}</span>
     <span className="story-shelf-copy"><small>{lesson.chapter}</small><strong>{lesson.title}</strong><span>{done?'Пройдено':record?seenCount(progress,lesson.id)+' / '+lesson.scenes.length+' частей':lesson.scenes.length+' частей · '+lesson.teaser}</span></span>
     <span className="story-shelf-end">{done?'✓':'→'}</span>
    </button>;
   })}
  </div>
  <button className="story-more-chapters" onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{showAll?'Свернуть темы':'Все темы'} <span>{showAll?'↑':'↓'}</span></button>
  <div className="story-lab-section"><div><span className="eyebrow">ПРАКТИКА</span><h2>Лаборатория</h2><p>Сравнение комбинаций, ставки и история раздач.</p></div><button onClick={onLab} className="story-lab-open"><span>♣</span><strong>Открыть лабораторию</strong><span>→</span></button></div>
 </div>;
}
