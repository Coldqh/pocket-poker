import {test,expect} from '@playwright/test';
const boxesOverlap=(a,b)=>{
 const w=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
 const h=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 return w>3&&h>3;
};
async function openTable(page,count){
 await page.goto('/');
 await page.getByRole('button',{name:/Настроить стол/i}).first().click();
 await page.getByRole('button',{name:count+' соперников'}).click();
 await page.getByRole('button',{name:'Играть',exact:true}).click();
 await expect(page.locator('.table-opponent')).toHaveCount(count);
 await expect(page.locator('.table-stage')).toBeVisible();
 await page.waitForTimeout(250); // ResizeObserver must publish stage measurements
}
for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:430,height:932}]){
 for(const count of [1,3,5]){
  test('table at '+viewport.width+'x'+viewport.height+' with '+count+' bots',async({page})=>{
   await page.setViewportSize(viewport);
   await openTable(page,count);
   const layout=await page.evaluate(()=>{
    const rect=(el)=>{const a=el.getBoundingClientRect();return{left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height};};
    const one=(selector)=>rect(document.querySelector(selector));
    const many=(selector)=>[...document.querySelectorAll(selector)].map(rect);
    return {viewport:{width:window.innerWidth,height:window.innerHeight},stage:one('.table-stage'),dock:one('.action-dock'),toolbar:one('.game-toolbar'),hero:one('.table-hero'),opponents:many('.table-opponent'),board:one('.community-cards'),buttons:many('.table-actions button')};
   });
   const {stage,dock,toolbar,hero,opponents,board,buttons}=layout;
   expect(stage.height).toBeGreaterThan(225);
   expect(toolbar.top).toBeGreaterThanOrEqual(-1);
   expect(dock.bottom).toBeLessThanOrEqual(viewport.height+2);
   expect(stage.bottom).toBeLessThanOrEqual(dock.top+1);
   expect(hero.bottom).toBeLessThanOrEqual(stage.bottom+1);
   expect(hero.top).toBeGreaterThanOrEqual(stage.top-1);
   expect(board.left).toBeGreaterThanOrEqual(-1);
   expect(board.right).toBeLessThanOrEqual(viewport.width+1);
   expect(buttons.length).toBeGreaterThanOrEqual(3);
   for(const b of buttons){expect(b.height).toBeGreaterThanOrEqual(44);expect(b.bottom).toBeLessThanOrEqual(viewport.height+2);}
   for(let i=0;i<opponents.length;i++){
    const a=opponents[i];
    expect(a.left).toBeGreaterThanOrEqual(-1);
    expect(a.right).toBeLessThanOrEqual(viewport.width+1);
    expect(a.top).toBeGreaterThanOrEqual(stage.top-1);
    expect(a.bottom).toBeLessThanOrEqual(stage.bottom+1);
    expect(boxesOverlap(a,hero)).toBe(false);
    expect(boxesOverlap(a,board)).toBe(false);
    for(let j=i+1;j<opponents.length;j++)expect(boxesOverlap(a,opponents[j])).toBe(false);
   }
  });
 }
}
test('save and resume on a narrow screen',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await openTable(page,3);
 await page.reload();
 await expect(page.locator('.table-opponent')).toHaveCount(3);
 await expect(page.locator('.action-dock')).toBeVisible();
});
test('invalid saved game is backed up and not loaded as playable',async({page})=>{
 await page.setViewportSize({width:375,height:667});
 await page.goto('/');
 await page.evaluate(()=>{
  localStorage.setItem('pocket-v2-game','{damaged:');
  localStorage.setItem('pocket-v6-table-ready','true');
 });
 await page.reload();
 await expect(page.getByRole('alert')).toContainText('Предыдущее сохранение');
 const stored=await page.evaluate(()=>localStorage.getItem('pocket-v252-recovered-game'));
 expect(stored).toBe('{damaged:');
 await expect(page.locator('.table-stage')).toHaveCount(0);
});
