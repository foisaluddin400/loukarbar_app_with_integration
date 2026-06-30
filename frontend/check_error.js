const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log("Navigating to http://localhost:4003...");
  await page.goto('http://localhost:4003', { waitUntil: 'networkidle2' });
  
  console.log("Waiting for app to load...");
  await new Promise(r => setTimeout(r, 2000));

  // The app will either show login screen or be logged in.
  // If we are at login, we log in as lou@example.com / password
  try {
    const emailInput = await page.$('input[placeholder="Email"]');
    if (emailInput) {
        console.log("Logging in...");
        await emailInput.type('lou@example.com');
        const passInput = await page.$('input[placeholder="Password"]');
        await passInput.type('password');
        
        // Find login button
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
  } catch(e) {
    console.log("Not at login screen or failed to login", e);
  }

  // Click Vibe Check option
  try {
    console.log("Clicking Vibe Check...");
    const cards = await page.$$('div[role="button"]');
    let clicked = false;
    for (const card of cards) {
        const text = await page.evaluate(el => el.innerText, card);
        if (text && text.toLowerCase().includes('vibe check.')) {
            await card.click();
            clicked = true;
            break;
        }
    }
    if (!clicked) {
        console.log("Could not find vibe check card");
    } else {
        console.log("Clicked vibe check, waiting for error...");
        await new Promise(r => setTimeout(r, 2000));
    }
  } catch(e) {
    console.log("Failed to click vibe check", e);
  }

  await browser.close();
})();
