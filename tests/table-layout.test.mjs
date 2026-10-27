import test from 'node:test';
import assert from 'node:assert/strict';
import {seatLayout,betPosition,isCompactStage} from '../src/table-layout.ts';
const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2;
for(const [w,h] of [[320,280],[320,340],[375,450],[390,530],[430,740],[810,650]]){
 test(`seat layout ${w}x${h} has no overlapping opponent summaries`,()=>{
  for(let n=1;n<=5;n++){
   const pts=seatLayout(n,w,h);
   assert.equal(pts.length,n);
   const sh=isCompactStage(w,h)?65:w>700?100:83,sw=w>700?95:60;
   const boxes=pts.map(p=>({x:p.x*w/100,y:p.y*h/100+sh/2,w:sw,h:sh}));
   for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)assert.ok(!overlaps(boxes[i],boxes[j]),`${n} seats ${i},${j}`);
   for(const p of pts){const bet=betPosition(p,w);assert.ok(bet.x>=0&&bet.x<=100&&bet.y<70);}
  }
  const heroBet=betPosition({x:50,y:84},w);assert.ok(heroBet.y>65&&heroBet.y<90);
 });
}
test('seat layouts do not share mutable seat objects',()=>{seatLayout(5,320,450)[0].x=99;assert.equal(seatLayout(5,320,450)[0].x,12);});
