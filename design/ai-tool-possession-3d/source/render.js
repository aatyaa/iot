const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const layers = process.argv.slice(2).length ? process.argv.slice(2) : ['art', 'text'];
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  page.on('console', m => console.log('PAGE:', m.text()));
  page.on('pageerror', e => { console.log('PAGEERR:', e); process.exit(1); });
  for (const layer of layers) {
    const t0 = Date.now();
    const [ln, qs] = layer.split('?'); const name = ln;
    await page.goto(`http://localhost:8765/index.html?layer=${ln}&${qs || ''}&v=${Date.now()}`);
    await page.waitForFunction('window.__done === true', null, { timeout: 600000, polling: 500 });
    const err = await page.evaluate(() => window.__err);
    if (err) { console.log('ERROR', err); process.exit(1); }
    const data = await page.evaluate(() => window.__out);
    fs.writeFileSync(`${__dirname}/out/${name}.png`, Buffer.from(data.split(',')[1], 'base64'));
    console.log(layer, 'done in', (Date.now() - t0) / 1000, 's');
  }
  await browser.close();
})();
