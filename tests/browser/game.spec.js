import { test, expect } from '@playwright/test';

test('exploration, spells, pause, settings, and restart preserve one active world', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#btn-explore').click();
  await expect(page.locator('#hud')).toBeVisible();
  await page.locator('[data-shape="pointing"]').click();
  expect(await page.evaluate(async () => (await import('/src/core/state.js')).default.get('totalLightningStrikes'))).toBe(1);
  await page.locator('#btn-pause').click(); await page.locator('#btn-open-settings').click();
  await page.locator('#setting-volume').fill('0'); await page.locator('#setting-motion').check();
  await page.locator('#btn-close-settings').click(); await expect(page.locator('#pause-menu')).toBeVisible();
  await page.locator('#btn-resume').click(); await page.locator('#btn-biomes').click(); await page.locator('#btn-close-biomes').click();
  expect(await page.evaluate(async () => (await import('/src/core/state.js')).default.get('isPaused'))).toBe(false);
  await page.locator('#btn-pause').click(); await page.locator('#btn-quit').click();
  await page.locator('#btn-explore').click(); await page.locator('[data-shape="pointing"]').click();
  expect(await page.evaluate(async () => {
    const state = (await import('/src/core/state.js')).default;
    return { strikes: state.get('totalLightningStrikes'), volume: state.get('volume'), motion: state.get('reducedMotion') };
  })).toEqual({ strikes: 1, volume: 0, motion: true });
  expect(errors).toEqual([]);
});

test('both local vision engines, recalibration and synthetic shadow fixtures', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#btn-start').click();
  await expect(page.locator('#calibration-screen')).toBeVisible({ timeout: 40000 });
  await expect(page.locator('#calibration-title')).toHaveText('Meet your hands.');
  await page.locator('#btn-cal-skip').click(); await page.locator('#btn-skip-tutorial').click();
  await page.locator('#btn-pause').click(); await page.locator('#btn-switch-mode').click();
  await expect(page.locator('#calibration-screen')).toBeVisible({ timeout: 35000 });
  await expect(page.locator('#calibration-title')).toHaveText('Find your shadow.');
  await page.locator('#btn-cal-capture-bg').click(); await page.locator('#btn-cal-capture-shadow').click();
  await page.locator('#btn-cal-skip').click();
  const before = await page.evaluate(async () => (await import('/src/core/state.js')).default.get('totalPlayTimeMs'));
  await page.locator('#btn-pause').click(); await page.locator('#btn-recalibrate').click();
  await expect(page.locator('#calibration-screen')).toBeVisible(); await page.locator('#btn-cal-skip').click();
  expect(await page.evaluate(async () => (await import('/src/core/state.js')).default.get('totalPlayTimeMs'))).toBeGreaterThanOrEqual(before);
  const fixtures = await page.evaluate(async () => {
    const { Processor } = await import('/src/cv/processor.js'); const { classifyShape } = await import('/src/cv/classifier.js');
    const processor = new Processor(); processor.init();
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 240; const ctx = canvas.getContext('2d');
    const clear = color => { ctx.fillStyle = color; ctx.fillRect(0, 0, 320, 240); };
    clear('#e0e0e0'); processor.captureBackground(canvas);
    ctx.fillStyle = '#707070'; ctx.beginPath(); ctx.arc(160, 120, 38, 0, Math.PI * 2); ctx.fill();
    const threshold = processor.autoDetectThreshold(canvas); processor.setThreshold(threshold);
    const fist = classifyShape(processor.processFrame(canvas)).shape;
    clear('#ffffff'); const brighter = processor.processFrame(canvas);
    clear('#e0e0e0'); ctx.fillStyle = '#101010'; ctx.fillRect(0, 40, 100, 180); const clipped = processor.processFrame(canvas);
    clear('#e0e0e0'); ctx.fillStyle = '#707070';ctx.beginPath();ctx.arc(160,120,38,0,Math.PI*2);ctx.fill();ctx.fillRect(144,145,32,95);
    const wrist = classifyShape(processor.processFrame(canvas)).shape;
    for (let i = 0; i < 100; i++) processor.processFrame(canvas);
    processor.init(); processor.destroy(); return { threshold, fist, brighter, clipped, wrist };
  });
  expect(fixtures.threshold).toBeLessThan(112);
  expect(fixtures).toMatchObject({ fist: 'fist', brighter: null, clipped: null, wrist: 'fist' });
  await page.locator('#btn-pause').click(); await page.locator('#btn-quit').click();
  expect(await page.evaluate(() => document.getElementById('webcam-video').srcObject)).toBeNull();
  expect(errors).toEqual([]);
});

test('camera denial shows a useful message and permits camera-free exploration', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.locator('#btn-start').click(); await expect(page.locator('#start-error')).toContainText('denied');
  await expect(page.locator('#start-screen')).toBeVisible();
  await page.locator('#btn-explore').click(); await expect(page.locator('#hud')).toBeVisible();
});

test('title controls and gesture dock fit a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  const bounds = await page.locator('#btn-start').boundingBox(); expect(bounds.y + bounds.height).toBeLessThan(844);
  await page.locator('#btn-explore').click();
  const dock = await page.locator('.spell-dock').boundingBox(); expect(dock.x).toBeGreaterThanOrEqual(0); expect(dock.x + dock.width).toBeLessThanOrEqual(390);
  await page.locator('[data-shape="open_hand"]').click();
  expect(await page.evaluate(async () => (await import('/src/core/state.js')).default.get('totalRainCalls'))).toBe(1);
});

test('soundscape produces audio, mutes fully, and suspends on pause', async ({ page }) => {
  await page.addInitScript(()=>{const NativeContext=window.AudioContext;window.AudioContext=class extends NativeContext {constructor(...args){super(...args);window.gameAudioContext=this;}};});
  await page.goto('/');await page.locator('#btn-explore').click();
  const result=await page.evaluate(async()=>{
    const {AudioEngine}=await import('/src/audio/engine.js');const audio=new AudioEngine();
    const ctx=new OfflineAudioContext(2,44100,44100);audio.ctx=ctx;audio.master=ctx.createGain();audio.master.connect(ctx.destination);
    audio.sfxGain=ctx.createGain();audio.sfxGain.connect(audio.master);audio.reverb=ctx.createGain();audio.reverb.gain.value=0;audio.reverb.connect(audio.master);
    audio.master.gain.setValueAtTime(1,0);audio.master.gain.setValueAtTime(0,.5);audio.chime([440,660,880]);const rendering=ctx.startRendering();
    const buffer=await rendering,data=buffer.getChannelData(0);
    const peak=(start,end)=>data.slice(start,end).reduce((value,next)=>Math.max(value,Math.abs(next)),0);
    return {audible:peak(0,18000),muted:peak(30000,44000)};
  });
  expect(result.audible).toBeGreaterThan(.001);expect(result.muted).toBeLessThan(.001);
  await page.locator('#btn-pause').click();await page.waitForFunction(()=>window.gameAudioContext.state==='suspended');
  await page.locator('#btn-resume').click();await page.waitForFunction(()=>window.gameAudioContext.state==='running');
});
