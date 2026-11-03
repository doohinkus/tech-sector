const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HTML_PATH = path.resolve(__dirname, '../mirror_scene.html');
const ASSETS_DIR = path.resolve(__dirname, '../assets');
const FRAMES_DIR = path.resolve(__dirname, '../.frames_tmp');

async function captureState(state, period = 900, fps = 30) {
  const framesDir = path.join(FRAMES_DIR, state);
  fs.mkdirSync(framesDir, { recursive: true });
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 256, height: 256 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  
  const url = `file://${HTML_PATH}?preset=${state}&size=256&hideUI=true&mode=loop&period=${period}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  
  // Capture exactly one period of frames
  for (let i = 0; i < period; i++) {
    const framePath = path.join(framesDir, `frame${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    await page.waitForTimeout(Math.floor(1000 / fps));
  }
  
  await browser.close();
  
  const outGif = path.join(ASSETS_DIR, `xlk-${state}.gif`);
  const palettePath = path.join(FRAMES_DIR, `palette_${state}.png`);
  
  // Generate palette and create GIF
  try {
    execSync(`ffmpeg -y -framerate ${fps} -i ${framesDir}/frame%04d.png -vf "scale=256:256:flags=lanczos,palettegen=stats_mode=diff" ${palettePath}`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -framerate ${fps} -i ${framesDir}/frame%04d.png -i ${palettePath} -lavfi "scale=256:256:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 ${outGif}`, { stdio: 'inherit' });
    console.log(`Created ${outGif}`);
  } catch (e) {
    console.error(`Failed to create GIF for ${state}:`, e.message);
  }
  
  // Clean up frames
  fs.rmSync(framesDir, { recursive: true, force: true });
}

async function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  
  const period = 900;
  const fps = 30;
  
  for (const state of ['good', 'neutral', 'bad']) {
    await captureState(state, period, fps);
  }
  
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  console.log('All GIFs generated!');
}

main().catch(console.error);
