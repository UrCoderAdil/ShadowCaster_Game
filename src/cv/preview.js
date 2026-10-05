const connections = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
export function drawPreview(target, source, result = {}, mask = null) {
  const ctx = target.getContext('2d');
  ctx.save(); ctx.clearRect(0, 0, target.width, target.height);
  ctx.translate(target.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0, target.width, target.height);
  if (mask?.rows && window.cv?.imshow) {
    const temporary = drawPreview.maskCanvas ||= document.createElement('canvas');
    window.cv.imshow(temporary, mask);
    ctx.globalAlpha = 0.28; ctx.drawImage(temporary, 0, 0, target.width, target.height); ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = '#baffdc'; ctx.fillStyle = '#fff0b9'; ctx.lineWidth = 2;
  const points = result.landmarks || [];
  for (const [a,b] of connections) if (points[a] && points[b]) {
    ctx.beginPath(); ctx.moveTo(points[a].x * target.width, points[a].y * target.height);
    ctx.lineTo(points[b].x * target.width, points[b].y * target.height); ctx.stroke();
  }
  for (const p of points) { ctx.beginPath(); ctx.arc(p.x * target.width, p.y * target.height, 3, 0, Math.PI * 2); ctx.fill(); }
  if (result.boundingRect) {
    const r = result.boundingRect;
    ctx.strokeRect(r.x / 320 * target.width, r.y / 240 * target.height, r.width / 320 * target.width, r.height / 240 * target.height);
  }
  ctx.restore();
}
