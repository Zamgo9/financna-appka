const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FFMPEG = '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const FILE = 'file://' + path.resolve('/home/user/financna-appka/video-scripts/full-video-animatic.html');
const OUT = '/tmp/claude-0/-home-user-financna-appka/13403ee9-ed76-5d26-91be-264cee748612/scratchpad/exports';
const FPS = 30;
const SHOTS = [0,1,2,3,4,5];           // S1-F1 … S1-F6

fs.mkdirSync(OUT, { recursive: true });

function encode(name){
  const args = ['-y','-f','image2pipe','-framerate',String(FPS),'-i','-',
    '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p',
    '-movflags','+faststart', path.join(OUT, name)];
  const p = spawn(FFMPEG, args, { stdio: ['pipe','ignore','pipe'] });
  let err=''; p.stderr.on('data', d => { err += d; if (err.length>8000) err = err.slice(-4000); });
  return { p, errRef: () => err };
}
function writeFrame(p, buf){
  return new Promise((res, rej) => {
    p.stdin.write(buf, e => e ? rej(e) : res());
  });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox','--force-device-scale-factor=1'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(FILE + '?bare=1&cap=1&f=0', { waitUntil: 'load' });
  await page.waitForTimeout(600); // settle fonts/emoji
  const DUR = await page.evaluate(() => window.__shots.DUR);

  for (const shot of SHOTS){
    const name = `S1 - F${shot+1}.mp4`;
    const nFrames = Math.round(DUR[shot]/1000*FPS);
    const { p, errRef } = encode(name);
    const t0 = Date.now();
    for (let j=0;j<nFrames;j++){
      await page.evaluate(([fi,ms]) => window.__renderSeek(fi,ms), [shot, j*1000/FPS]);
      const buf = await page.screenshot({ type:'png', clip:{x:0,y:0,width:1920,height:1080} });
      await writeFrame(p, buf);
    }
    p.stdin.end();
    const code = await new Promise(r => p.on('close', r));
    if (code !== 0) { console.error(`FFMPEG FAIL ${name}:`, errRef().slice(-1500)); process.exit(1); }
    const kb = Math.round(fs.statSync(path.join(OUT,name)).size/1024);
    console.log(`${name}: ${nFrames} frames, ${kb} KB, ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }
  await browser.close();
  console.log('page errors:', errors.length ? errors : 'none');
})();
