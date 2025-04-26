const puppeteer = require('puppeteer-extra');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  await page.evaluate(() => {
    localStorage.setItem('apiKeys', JSON.stringify({ openai: '123e4567-e89b-12d3-a456-426614174000' }));
  });

  await browser.close();
})();
