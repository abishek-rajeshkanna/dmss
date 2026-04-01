import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log('Page loaded. Capturing body HTML...');
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('HTML length:', html.length);
  console.log('HTML start:', html.slice(0, 500));
  
  await browser.close();
})();
