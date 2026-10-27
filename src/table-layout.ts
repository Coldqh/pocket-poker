export type SeatPoint={x:number;y:number};
const desktop:Record<number,SeatPoint[][]>={
1:[[{x:50,y:12}]],2:[[{x:28,y:13},{x:72,y:13}]],3:[[{x:15,y:32},{x:50,y:11},{x:85,y:32}]],
4:[[{x:14,y:33},{x:34,y:10},{x:66,y:10},{x:86,y:33}]],
5:[[{x:12,y:37},{x:25,y:14},{x:50,y:8},{x:75,y:14},{x:88,y:37}]]};
const phone:Record<number,SeatPoint[]>={
1:[{x:50,y:6}],2:[{x:30,y:6},{x:70,y:6}],3:[{x:13,y:34},{x:50,y:6},{x:87,y:34}],
4:[{x:13,y:34},{x:34,y:6},{x:66,y:6},{x:87,y:34}],
5:[{x:12,y:35},{x:28,y:6},{x:50,y:5},{x:72,y:6},{x:88,y:35}]};
export function seatLayout(count:number,width:number,height:number):SeatPoint[]{
 const n=Math.max(1,Math.min(5,Math.floor(count)));
 if(width>700)return desktop[n][0].map(p=>({...p}));
 return phone[n].map(p=>({x:p.x,y:height<390&&p.y>=30?36:p.y}));
}
export function betPosition(p:SeatPoint,width:number):SeatPoint{
 if(width>700)return{x:p.x+(50-p.x)*.37,y:p.y+(53-p.y)*.35};
 if(p.y>=70)return{x:50,y:74};
 if(p.x<=18||p.x>=82)return{x:p.x,y:p.y+12};
 return{x:p.x,y:p.y+22};
}
export function isCompactStage(width:number,height:number){return width<=700&&height<390;}
