import state from '../core/state.js';

const palettes = {
  meadow: ['#07141d','#173c3e','#37695c','#aee6c5'],
  forest: ['#060f16','#102e2e','#295644','#89dbb4'],
  desert: ['#211829','#60414a','#926951','#ffd0a2'],
  reef: ['#041627','#123e58','#23646e','#8fedee'],
  crystal: ['#121127','#30294c','#65537a','#d8b8ff'],
};
const noise = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/** Deterministic environment details avoid flicker and regenerate at any viewport size. */
export class Scene {
  draw(ctx, w, h, time, biome = 'meadow', attract = false, phase = 'night') {
    const [sky, haze, hills, light] = palettes[biome] || palettes.meadow;
    const t = state.get('reducedMotion') ? 0 : time / 1000;
    const center = attract ? w * 0.75 : w * 0.61, moonY = h * 0.29;
    const gradient = ctx.createLinearGradient(0,0,0,h);
    gradient.addColorStop(0, sky); gradient.addColorStop(0.6, haze); gradient.addColorStop(1, '#071714');
    ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
    // Moon / sun halo and a faint diagonal ribbon of starlight.
    const radius = Math.min(w * 0.11, h * 0.18);
    const halo = ctx.createRadialGradient(center,moonY,0,center,moonY,radius * 3.4);
    halo.addColorStop(0, `${light}38`); halo.addColorStop(0.45, `${light}13`); halo.addColorStop(1,'transparent');
    ctx.fillStyle = halo; ctx.fillRect(0,0,w,h);
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `${light}08`; ctx.lineWidth = 26 + i * 15;
      ctx.beginPath(); ctx.moveTo(w * 0.22, h * 0.1);
      ctx.bezierCurveTo(w * 0.5,h * (0.24 + Math.sin(t * 0.1 + i) * 0.04),w * 0.84, -h * 0.15,w * 1.1,h * 0.36); ctx.stroke();
    }
    ctx.restore();
    for (let i = 0; i < 105; i++) {
      const x = noise(i + 2) * w, y = noise(i + 206) * h * 0.65;
      ctx.fillStyle = `rgba(225,242,229,${(phase === 'day' && !attract ? 0.18 : 0.5) + Math.sin(t * 0.6 + i) * 0.15})`;
      ctx.beginPath(); ctx.arc(x,y,noise(i + 403) * 1.3 + 0.35,0,Math.PI * 2); ctx.fill();
    }
    ctx.save(); ctx.shadowColor = light; ctx.shadowBlur = 25; ctx.fillStyle = phase === 'day' && !attract ? '#f9dab0' : '#dce8c9';
    ctx.beginPath(); ctx.arc(center,moonY,radius * 0.56,0,Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    if (phase !== 'day' || attract) { ctx.fillStyle = sky; ctx.beginPath(); ctx.arc(center + radius * 0.22,moonY - radius * 0.14,radius * 0.55,0,Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = `${light}22`; ctx.lineWidth = 1;
    for (const r of [0.9, 1.02, 1.42]) { ctx.beginPath(); ctx.arc(center,moonY,radius * r,0,Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 + t * 0.008;
      ctx.beginPath(); ctx.moveTo(center + Math.cos(a) * radius * 0.96,moonY + Math.sin(a) * radius * 0.96);
      ctx.lineTo(center + Math.cos(a) * radius * 1.01,moonY + Math.sin(a) * radius * 1.01); ctx.stroke();
    }
    ctx.restore();
    // Three ridgelines, each with a forest of silhouettes.
    for (let layer = 0; layer < 3; layer++) {
      const base = h * (0.56 + layer * 0.085);
      ctx.fillStyle = [hills, '#153e38', '#0b2c27'][layer];
      ctx.globalAlpha = 0.35 + layer * 0.22;
      ctx.beginPath(); ctx.moveTo(0,h);
      for (let x = 0; x <= w + 12; x += 12) ctx.lineTo(x,base + Math.sin(x / w * 8 + layer * 2.3) * h * 0.04 + Math.sin(x / w * 17) * 12);
      ctx.lineTo(w,h); ctx.fill();
      for (let i = 0; i < 26; i++) {
        const x = (i + noise(i + layer)) / 26 * w;
        const y = base + Math.sin(x / w * 8 + layer * 2.3) * h * 0.04 + Math.sin(x / w * 17) * 12;
        const size = h * (0.03 + noise(i * 7 + layer) * 0.11) * (layer + 1) * 0.55;
        if (biome === 'desert') { ctx.beginPath(); ctx.ellipse(x,y,size * 0.4,size,0,0,Math.PI * 2); ctx.fill(); }
        else if (biome === 'crystal') { ctx.beginPath(); ctx.moveTo(x,y-size); ctx.lineTo(x+size*.2,y); ctx.lineTo(x-size*.2,y); ctx.fill(); }
        else this._pine(ctx,x,y,size);
      }
    }
    ctx.globalAlpha = 1;
    // Ground-level mist, drifting slowly across the valley.
    for (let i = 0; i < 3; i++) {
      const mist = ctx.createRadialGradient(w * (0.3 + i * 0.3) + Math.sin(t * 0.05 + i) * 40,h * 0.71,0,w * 0.5,h * 0.7,w * 0.6);
      mist.addColorStop(0, `${light}09`); mist.addColorStop(1,'transparent'); ctx.fillStyle = mist; ctx.fillRect(0,h * 0.5,w,h * 0.4);
    }
  }
  _pine(ctx, x, y, size) {
    ctx.fillRect(x - size * 0.025,y - size,size * 0.05,size);
    for (let j = 0; j < 4; j++) { const top = y - size + j * size * 0.18, width = size * (0.17 + j * 0.075);
      ctx.beginPath(); ctx.moveTo(x,top); ctx.lineTo(x + width,top + size * 0.47); ctx.lineTo(x - width,top + size * 0.47); ctx.fill(); }
  }
  ground(ctx, w, h, terrain, time, biome = 'meadow') {
    const [, , , light] = palettes[biome] || palettes.meadow;
    const gradient = ctx.createLinearGradient(0,h * 0.73,0,h);
    gradient.addColorStop(0, biome === 'desert' ? '#664b38' : '#193d2d'); gradient.addColorStop(0.24,'#10281e'); gradient.addColorStop(1,'#04100e');
    ctx.beginPath(); ctx.moveTo(0,h);
    for (let x=0;x<=w+4;x+=4) ctx.lineTo(x,terrain.getGroundY(x));
    ctx.lineTo(w,h); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.save(); ctx.clip();
    // A reflective pool and soft moonbeam on the soil.
    const glow = ctx.createRadialGradient(w * 0.61,h * 0.79,0,w * 0.61,h * 0.79,w * 0.36);
    glow.addColorStop(0,`${light}14`); glow.addColorStop(1,'transparent'); ctx.fillStyle = glow; ctx.fillRect(0,0,w,h);
    for (let i=0;i<6;i++) {
      ctx.strokeStyle = `${light}${i % 2 ? '18' : '0b'}`; ctx.lineWidth = 1;
      const y = h * 0.86 + i * 4;
      ctx.beginPath(); ctx.ellipse(w * 0.64,y,w * 0.095 + Math.sin(time / 1500 + i) * 8,2.5,0,0,Math.PI * 2); ctx.stroke();
    }
    for(let i=0;i<180;i++) {
      const x=noise(i+30)*w,y=terrain.getGroundY(x)+noise(i+999)*(h-terrain.getGroundY(x));
      ctx.fillStyle=`${light}16`; ctx.beginPath(); ctx.ellipse(x,y,1+noise(i+4)*3,0.6,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    // Fine grass blades at the playable horizon.
    ctx.strokeStyle = `${light}54`; ctx.lineWidth = 1;
    const t = state.get('reducedMotion') ? 0 : time / 1500;
    ctx.beginPath();
    for(let i=0;i<Math.min(550,w/3);i++) {
      const x=i*3+noise(i)*4,y=terrain.getGroundY(x),len=3+noise(i+200)*12;
      ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.sin(t+i)*2,y-len*.7,x+Math.sin(t+i)*4,y-len);
    }
    ctx.stroke();
  }
  foreground(ctx,w,h,time) {
    const t = state.get('reducedMotion') ? 0 : time / 1000;
    ctx.save();ctx.strokeStyle='#04110c';ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=0;i<90;i++) {
      const x=noise(i+500)*w,len=10+noise(i+600)*h*.1;
      ctx.moveTo(x,h+4);ctx.quadraticCurveTo(x-10,h-len*.5,x+Math.sin(t*.4+i)*8,h-len);
    }
    ctx.stroke();ctx.globalCompositeOperation='screen';
    const count = state.get('particleDensity') === 1 ? 18 : 48;
    for(let i=0;i<count;i++) {
      const x=noise(i+123)*w+Math.sin(t*.3+i)*25,y=h*(.43+noise(i+333)*.47)+Math.cos(t*.25+i)*15;
      const alpha=.3+Math.sin(t+i)*.22;
      const g=ctx.createRadialGradient(x,y,0,x,y,12);g.addColorStop(0,`rgba(205,235,148,${alpha})`);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.fillRect(x-12,y-12,24,24);ctx.fillStyle=`rgba(230,249,173,${alpha+.2})`;ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
}
