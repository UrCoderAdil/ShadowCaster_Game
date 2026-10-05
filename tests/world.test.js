import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/game/world.js';
import state from '../src/core/state.js';
import events from '../src/core/events.js';

test('disposed worlds release input and creature listeners; pause prevents casts',()=>{
  state.reset();
  const originalShape=events._listeners.get('shape:changed')?.size || 0;
  const originalSmash=events._listeners.get('game:smash')?.size || 0;
  for(let i=0;i<3;i++) { const old=new World(800,600);old.start();old.start();old.destroy(); }
  assert.equal(events._listeners.get('shape:changed').size,originalShape);
  assert.equal(events._listeners.get('game:smash').size,originalSmash);
  const world=new World(800,600);world.start();
  try {
    state.set('isPaused',true);events.emit('shape:changed',{shape:'pointing',confidence:.9});
    assert.equal(state.get('totalLightningStrikes'),0);
    state.set('isPaused',false);events.emit('shape:changed',{shape:'pointing',confidence:.9});
    assert.equal(state.get('totalLightningStrikes'),1);
    const positions=world.plants.map(p=>p.x);
    world.resize(400,600);world.plants.forEach((plant,i)=>assert.equal(plant.x,positions[i]*.5));
  } finally { world.destroy(); }
});
