import events from '../core/events.js';
import state from '../core/state.js';

/** Synthesized soundscape: sustained weather, spatial spells, soft pads and a reverb bus. */
export class AudioEngine {
  constructor() {
    this.ctx = null; this.sources = new Set(); this._musicInterval = null; this.chord = 0;
    events.on('game:rain', () => this.chime([392,523.25,659.25],.09));
    events.on('game:smash', p => { this.tone(105,.48,.55,'sine',0,p,28); this.noise(.32,.36,450,p); });
    events.on('game:harvest', p => this.chime([659.25,783.99,1046.5],.09,p));
    events.on('game:summon', p => this.chime([440,659.25,880,1318.5],.11,p));
    events.on('game:lightning', p => { this.noise(.22,.55,5500,p); this.noise(2,.26,160,p,.14); this.tone(58,1.2,.3,'sine',.08,p,30); });
    events.on('combo:triggered', () => this.chime([523.25,659.25,783.99,1046.5,1318.5],.08));
    events.on('achievement:unlocked', () => this.chime([523.25,659.25,783.99,1046.5],.16));
    events.on('weather:mix', ({rainIntensity}) => {
      if(this.ctx?.state==='running') this.rainGain.gain.setTargetAtTime(rainIntensity*.13,this.ctx.currentTime,.8);
    });
  }
  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx=this.ctx;
      this.master=ctx.createGain();this.master.gain.value=state.get('volume')??.7;
      const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=4;
      this.master.connect(compressor);compressor.connect(ctx.destination);
      this.sfxGain=ctx.createGain();this.sfxGain.gain.value=.6;this.sfxGain.connect(this.master);
      this.musicGain=ctx.createGain();this.musicGain.gain.value=.22;this.musicGain.connect(this.master);
      this.reverb=ctx.createConvolver();
      const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*1.6),ctx.sampleRate);
      for(let channel=0;channel<2;channel++) { const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.45; }
      this.reverb.buffer=impulse;const wet=ctx.createGain();wet.gain.value=.18;this.reverb.connect(wet);wet.connect(this.master);
      this.noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this._ambient(260,.04);this.rainGain=this._ambient(1800,0);
      this._music();this._musicInterval=setInterval(()=>{if(ctx.state==='running')this._music();},8500);
    } catch(error) { console.warn('[Audio]',error.message); }
  }
  _ambient(frequency,volume) {
    const ctx=this.ctx,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=this.noiseBuffer;source.loop=true;filter.type='lowpass';filter.frequency.value=frequency;gain.gain.value=volume;
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.sources.add(source);return gain;
  }
  _output(source,envelope,payload,extra=[]) {
    const ctx=this.ctx,pan=ctx.createStereoPanner();
    pan.pan.value=payload?.x==null?0:Math.max(-.85,Math.min(.85,payload.x/window.innerWidth*2-1));
    envelope.connect(pan);pan.connect(this.sfxGain);pan.connect(this.reverb);
    this.sources.add(source);
    source.onended=()=>{source.disconnect();envelope.disconnect();pan.disconnect();extra.forEach(n=>n.disconnect());this.sources.delete(source);};
  }
  tone(frequency,duration=.8,volume=.2,type='triangle',delay=0,payload=null,endFrequency=frequency) {
    if(!this.ctx || this.ctx.state==='closed')return;
    const ctx=this.ctx,start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration*.8);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);this._output(osc,gain,payload);osc.start(start);osc.stop(start+duration+.03);
  }
  noise(duration,volume,frequency,payload=null,delay=0) {
    if(!this.ctx || this.ctx.state==='closed')return;
    const ctx=this.ctx,start=ctx.currentTime+delay,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=this.noiseBuffer;source.loop=true;filter.type='lowpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(filter);filter.connect(gain);this._output(source,gain,payload,[filter]);source.start(start);source.stop(start+duration+.03);
  }
  chime(notes,spacing=.1,payload=null) { notes.forEach((note,i)=>{this.tone(note,1.1,.14/(1+i*.2),'sine',i*spacing,payload);this.tone(note*2,.5,.025,'sine',i*spacing,payload);}); }
  _music() {
    if(this.ctx?.state!=='running')return;
    const ctx=this.ctx,chords=[[130.81,196,246.94],[110,164.81,220],[98,146.83,196],[130.81,174.61,220]];
    for(const frequency of chords[this.chord++%chords.length]) {
      const osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime;
      osc.type='sine';osc.frequency.value=frequency;osc.detune.value=Math.random()*6-3;
      gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.07,start+2.5);gain.gain.linearRampToValueAtTime(.04,start+7);gain.gain.linearRampToValueAtTime(0,start+11);
      osc.connect(gain);gain.connect(this.musicGain);gain.connect(this.reverb);this.sources.add(osc);
      osc.onended=()=>{osc.disconnect();gain.disconnect();this.sources.delete(osc);};osc.start();osc.stop(start+11);
    }
  }
  setVolume(value) { if(this.master)this.master.gain.setTargetAtTime(value,this.ctx.currentTime,.04); }
  pause() { return this.ctx?.suspend().catch(()=>{}); }
  resume() { return this.ctx?.resume().then(()=>this.setVolume(state.get('volume')??.7)).catch(()=>{}); }
  destroy() { clearInterval(this._musicInterval);this.sources.forEach(s=>{try{s.stop();}catch{}});this.sources.clear();this.ctx?.close().catch(()=>{});this.ctx=null; }
}
