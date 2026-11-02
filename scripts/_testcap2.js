const { chromium } = require('/Users/valenlongfeather/Documents/finance-animation/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 256, height: 256 } });
  const page = await context.newPage();
  const HTML_PATH = path.resolve('/Users/valenlongfeather/Documents/finance-animation/fiery_physarum_simulation.html');
  await page.goto(`file://${HTML_PATH}?preset=good&size=256&hideUI=true&mode=loop&period=900`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  for (let i=0;i<5;i++){
    await page.screenshot({ path: `/tmp/scratchpad/f${i}.png` });
    await page.waitForTimeout(100);
  }
  console.log('done');
  await browser.close();
})();
