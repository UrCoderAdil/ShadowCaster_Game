import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHand, HandTracker } from '../src/cv/hand.js';
import { classifyShape, TemporalSmoother } from '../src/cv/classifier.js';
import { SHAPE } from '../src/core/constants.js';

function hand(up) {
  const points = Array.from({length:21},()=>({x:.5,y:.5,z:0}));
  points[0]={x:.5,y:.8,z:0};
  [5,9,13,17].forEach((base,f)=>{
    const x=.38+f*.08;
    points[base]={x,y:.59,z:0};points[base+1]={x,y:.44,z:0};
    points[base+2]={x,y:up[f]?.34:.54,z:0};points[base+3]={x,y:up[f]?.24:.64,z:0};
  });
  [1,2,3,4].forEach((i)=>points[i]={x:.32-i*.015,y:.65-i*.025,z:0});
  return points;
}
for(const [name,up] of [[SHAPE.OPEN_HAND,[1,1,1,1]],[SHAPE.FIST,[0,0,0,0]],[SHAPE.SCISSORS,[1,1,0,0]],[SHAPE.PEACE_SIGN,[1,0,0,1]],[SHAPE.POINTING,[1,0,0,0]]]) {
  test(`finger pose ${name}: mirrored, rotated and scaled`,()=>{
    const points=hand(up);
    assert.equal(classifyHand(points).shape,name);
    assert.equal(classifyHand(points.map(p=>({...p,x:1-p.x}))).shape,name);
    assert.equal(classifyHand(points.map(p=>({x:.5-(p.y-.5)*.7,y:.5+(p.x-.5)*.7,z:0}))).shape,name);
  });
}
test('unsupported, small, clipped and low-score hands are neutral',()=>{
  assert.equal(classifyHand(hand([0,1,0,0])).shape,SHAPE.UNKNOWN);
  assert.equal(classifyHand(hand([1,1,1,1]),.3).shape,SHAPE.UNKNOWN);
  const clipped=hand([1,1,1,1]);clipped[8].x=1.1;
  assert.equal(classifyHand(clipped).shape,SHAPE.UNKNOWN);
  assert.equal(classifyHand(hand([1,1,1,1]).map(p=>({x:.5+(p.x-.5)*.05,y:.5+(p.y-.5)*.05,z:0}))).shape,SHAPE.UNKNOWN);
});
test('smoother requires dwell, ignores flicker and releases lost tracking',()=>{
  const s=new TemporalSmoother();
  assert.equal(s.update(SHAPE.FIST,.9,0).stable,false);
  s.update(SHAPE.FIST,.9,100);assert.equal(s.update(SHAPE.FIST,.9,200).shape,SHAPE.FIST);
  assert.equal(s.update(SHAPE.OPEN_HAND,.9,250).stable,false);
  assert.equal(s.update(SHAPE.FIST,.9,300).shape,SHAPE.FIST);
  assert.equal(s.update(SHAPE.UNKNOWN,0,400).stable,false);
  assert.deepEqual(s.update(SHAPE.UNKNOWN,0,600),{shape:SHAPE.UNKNOWN,confidence:0,stable:true});
  s.update(SHAPE.FIST,.2,700);assert.equal(s.currentShape,SHAPE.UNKNOWN);
});
test('smoother never accepts a rapid series before minimum dwell',()=>{
  const s=new TemporalSmoother();s.update(SHAPE.FIST,.9,0);s.update(SHAPE.FIST,.9,20);
  assert.equal(s.update(SHAPE.FIST,.9,40).stable,false);
});
test('silhouette valley angle separates narrow and wide V',()=>{
  const f={solidity:.65,fingerCount:1,aspectRatio:.9,circularity:.3,blobCount:1,defectAngles:[35]};
  assert.equal(classifyShape(f).shape,SHAPE.SCISSORS);
  assert.equal(classifyShape({...f,defectAngles:[75]}).shape,SHAPE.PEACE_SIGN);
  assert.equal(classifyShape({...f,blobCount:5}).shape,SHAPE.UNKNOWN);
});

test('a frozen camera frame cannot keep its last finger gesture alive',()=>{
  const tracker=new HandTracker();tracker.detector={};tracker.lastVideoTime=1;tracker.lastFrameAt=0;
  tracker.lastResult=classifyHand(hand([1,0,0,0]));
  assert.equal(tracker.process({readyState:2,currentTime:1},100).shape,SHAPE.POINTING);
  assert.equal(tracker.process({readyState:2,currentTime:1},500).shape,SHAPE.UNKNOWN);
});
