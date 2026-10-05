import events from '../core/events.js';
import state from '../core/state.js';

export class SpellEffects {
  constructor() {
    this.items = [];
    for (const [event,color,label] of [['smash','#ffc795','IMPACT'],['harvest','#f4e5a4','ESSENCE'],['summon','#bca1ff','AWAKEN'],['lightning','#bdedff','STORM']])
      events.on(`game:${event}`, payload => this.add({ ...payload, color, label: payload?.reward ? `+${payload.reward} essence` : label, type: event }));
    events.on('game:rain', () => this.add({ x: window.innerWidth*.5, y: window.innerHeight*.34, color:'#b4e6ef', label:'LET IT RAIN', type:'rain' }));
    events.on('combo:triggered', combo => this.add({x:window.innerWidth*.5,y:window.innerHeight*.45,color:'#ddbcff',label:combo.name.toUpperCase(),type:'combo'}));
  }
  add(item) {
    item.age = 0;
    item.bolt = Array.from({length:13},(_,i)=>({x:item.x+(i===12?0:Math.sin(i*11.7)*22),y:item.y*i/12}));
    this.items.push(item); if(this.items.length>18)this.items.shift();
  }
  draw(ctx,dt,w,h,terrain) {
    const reduced = state.get('reducedMotion');
    this.items=this.items.filter(item=>item.age<1600);
    ctx.save();
    for(const item of this.items) {
      item.age+=dt;const t=item.age/1600,alpha=Math.max(0,1-t),radius=(reduced?35:20+t*160);
      ctx.globalAlpha=alpha;ctx.strokeStyle=item.color;ctx.fillStyle=item.color;
      ctx.save();ctx.translate(item.x,item.y);ctx.scale(1,.32);
      ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,radius*.7,0,Math.PI*2);ctx.stroke();ctx.restore();
      if(item.type==='lightning'&&item.age<420) {
        ctx.globalAlpha=(1-item.age/420)*(reduced?.35:1);ctx.lineJoin='round';ctx.shadowColor=item.color;ctx.shadowBlur=reduced?0:18;
        for(const width of [7,2]){ctx.lineWidth=width;ctx.strokeStyle=width===2?'#ffffff':item.color;ctx.beginPath();item.bolt.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}ctx.shadowBlur=0;
      }
      if(!reduced) {
        ctx.globalAlpha=alpha*.7;
        for(let i=0;i<14;i++) {const a=i/14*Math.PI*2+t*2,r=15+t*85;
          ctx.beginPath();ctx.arc(item.x+Math.cos(a)*r,item.y+Math.sin(a)*r*.7-t*70,1.8,0,Math.PI*2);ctx.fill();}
      }
      ctx.globalAlpha=alpha;ctx.font='500 11px Inter, sans-serif';ctx.textAlign='center';ctx.letterSpacing='2px';
      ctx.fillText(item.label,item.x,item.y-55-(reduced?0:t*40));
    }
    const aim=state.get('aim');
    if(aim&&state.get('currentShape')!=='unknown') {
      const x=aim.x*w,y=terrain.getGroundY(x);ctx.globalAlpha=.45;ctx.strokeStyle='#e1efc7';ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(x,y,18,6,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x,y-9);ctx.stroke();
    }
    ctx.restore();
  }
  clear() { this.items=[]; }
}
