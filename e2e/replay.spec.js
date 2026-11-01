import {test,expect} from '@playwright/test';
async function createGame(page){
 await page.goto('/');
 await page.getByRole('button',{name:/Настроить стол/i}).first().click();
 await page.getByRole('button',{name:'1 соперников'}).click();
 await page.getByRole('button',{name:'Играть',exact:true}).click();
 await expect(page.locator('.table-stage')).toBeVisible();
}
for(const size of [{width:320,height:568},{width:390,height:844}]){
 test(`review actions before and after on ${size.width}px`,async({page})=>{
  await page.setViewportSize(size);
  await createGame(page);
  await expect(page.locator('.action-fold')).toBeEnabled();
  await page.locator('.action-fold').click();
  await page.getByRole('button',{name:'История раздачи'}).click();
  await expect(page.locator('.review-root')).toBeVisible();
  await expect(page.locator('.review-step-heading')).toContainText('Ты: фолд');
  await expect(page.locator('.review-status')).toContainText('ДО ХОДА');
  await page.getByRole('button',{name:'После хода'}).click();
  await expect(page.locator('.review-status')).toContainText('ПОСЛЕ ХОДА');
  await expect(page.locator('.review-status')).toContainText('Внесено в банк: 0');
  await expect(page.locator('.review-player-list')).toHaveCount(0);
  await page.locator('.review-player-details summary').click();
  await expect(page.locator('.review-player-list>div')).toHaveCount(2);
 });
}
test('replay survives reload and is accessible through the laboratory',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await createGame(page);
 await page.locator('.action-fold').click();
 await page.reload();
 await page.getByRole('button',{name:'История раздачи'}).click();
 await expect(page.locator('.review-step-heading')).toContainText('Ты: фолд');
 await page.getByRole('button',{name:'Закрыть',exact:true}).last().click();
 await page.getByRole('button',{name:/На главную/i}).first().click();
 await page.getByRole('button',{name:/Уроки/i}).first().click();
 await expect(page.locator('.academy-screen')).toBeVisible();
});
