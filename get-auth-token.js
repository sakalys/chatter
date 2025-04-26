const puppeteer = require('puppeteer-extra');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Wait for a short period to allow the test login and token storage to complete
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds

  const authToken = await page.evaluate(() => {
    return localStorage.getItem('authToken');
  });

  console.log(authToken);

  await browser.close();
})();
