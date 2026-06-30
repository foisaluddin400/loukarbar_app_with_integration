const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      if (msg.type() === 'error') {
          console.log('PAGE ERROR LOG:', msg.text());
      }
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating...");
  await page.goto('http://localhost:4003', { waitUntil: 'networkidle2' });
  
  console.log("Waiting...");
  await new Promise(r => setTimeout(r, 2000));

  // If we are at login, login
  try {
    const emailInput = await page.$('input[placeholder="Email"]');
    if (emailInput) {
        console.log("Logging in...");
        await emailInput.type('lou@example.com');
        const passInput = await page.$('input[placeholder="Password"]');
        await passInput.type('password');
        
        const buttons = await page.$$('div[role="button"]');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text && text.toLowerCase().includes('log in')) {
                await btn.click();
                break;
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }
  } catch(e) {}

  // Click Vibe Check option
  try {
    console.log("Finding cards...");
    await page.waitForSelector('div[role="button"]', { timeout: 5000 });
    const cards = await page.$$('div[role="button"]');
    let clicked = false;
    for (const card of cards) {
        const text = await page.evaluate(el => el.innerText, card);
        if (text && text.toLowerCase().includes('vibe check')) {
            console.log("Clicking vibe check card...");
            await card.click();
            clicked = true;
            break;
        }
    }
    if (!clicked) {
        console.log("Could not find vibe check card. Current body:");
        console.log(await page.evaluate(() => document.body.innerText));
    } else {
        console.log("Clicked vibe check, waiting 3s for error...");
        await new Promise(r => setTimeout(r, 3000));
    }
  } catch(e) {
    console.log("Failed to click vibe check", e);
  }

  await browser.close();
})();
