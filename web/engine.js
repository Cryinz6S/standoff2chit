/* Tactical Aim Lab — isolated geometry/aim logic. No game process access. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AimLabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 1000;
  const HEIGHT = 680;
  const TAU = Math.PI * 2;
  const WALLS = Object.freeze([
    { x: 260, y: 90, w: 44, h: 215 },
    { x: 260, y: 390, w: 44, h: 195 },
    { x: 390, y: 190, w: 185, h: 36 },
    { x: 406, y: 455, w: 195, h: 36 },
    { x: 635, y: 76, w: 40, h: 207 },
    { x: 635, y: 390, w: 40, h: 210 },
    { x: 768, y: 288, w: 120, h: 32 },
    { x: 753, y: 498, w: 127, h: 32 }
  ]);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  function wrapAngle(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function turnTowards(current, goal, dt, smoothness) {
    const speed = 0.65 + (100 - clamp(smoothness, 0, 100)) / 5.7;
    const delta = wrapAngle(goal - current);
    return wrapAngle(current + clamp(delta, -speed * dt, speed * dt));
  }
  function segmentRectFirstHit(ax, ay, bx, by, rect) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dy = by - ay;
    const cuts = [
      [-dx, ax - rect.x], [dx, rect.x + rect.w - ax],
      [-dy, ay - rect.y], [dy, rect.y + rect.h - ay]
    ];
    for (const [p, q] of cuts) {
      if (Math.abs(p) < 1e-9) {
        if (q < 0) return null;
      } else {
        const r = q / p;
        if (p < 0) { t0 = Math.max(t0, r); }
        else { t1 = Math.min(t1, r); }
        if (t0 > t1) return null;
      }
    }
    return t0;
  }
  function wallsHit(ax, ay, bx, by, walls = WALLS) {
    let result = null;
    for (const wall of walls) {
      const t = segmentRectFirstHit(ax, ay, bx, by, wall);
      if (t !== null && (result === null || t < result)) result = t;
    }
    return result;
  }
  function hasLineOfSight(from, to, walls = WALLS) {
    return wallsHit(from.x, from.y, to.x, to.y, walls) === null;
  }
  function nearestTarget(player, enemies, walls = WALLS, allowOccluded = false, maxDistance = Infinity) {
    let result = null, best = maxDistance ** 2;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = distanceSq(player, enemy);
      if (d < best && (allowOccluded || hasLineOfSight(player, enemy, walls))) {
        best = d;
        result = enemy;
      }
    }
    return result;
  }
  function rayCircleHit(ax, ay, bx, by, cx, cy, radius) {
    const dx = bx - ax, dy = by - ay;
    const denom = dx * dx + dy * dy;
    if (!denom) return null;
    const t = ((cx - ax) * dx + (cy - ay) * dy) / denom;
    if (t < 0 || t > 1) return null;
    const qx = ax + t * dx, qy = ay + t * dy;
    return (qx - cx) ** 2 + (qy - cy) ** 2 <= radius ** 2 ? t : null;
  }
  function traceShot(player, angle, enemies, walls = WALLS, wallPenetration = false, range = 1200) {
    const bx = player.x + Math.cos(angle) * range;
    const by = player.y + Math.sin(angle) * range;
    let closest = wallPenetration ? null : wallsHit(player.x, player.y, bx, by, walls);
    let victim = null;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const hit = rayCircleHit(player.x, player.y, bx, by, enemy.x, enemy.y, enemy.radius || 17);
      if (hit !== null && (closest === null || hit < closest)) {
        closest = hit;
        victim = enemy;
      }
    }
    return {
      victim,
      blocked: !victim && !wallPenetration && closest !== null,
      end: {
        x: player.x + (bx - player.x) * (closest === null ? 1 : closest),
        y: player.y + (by - player.y) * (closest === null ? 1 : closest)
      }
    };
  }
  function collidesCircleRect(cx, cy, r, rect) {
    const x = clamp(cx, rect.x, rect.x + rect.w);
    const y = clamp(cy, rect.y, rect.y + rect.h);
    return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
  }
  function canOccupy(x, y, radius, walls = WALLS) {
    if (x < radius + 12 || x > WIDTH - radius - 12 || y < radius + 12 || y > HEIGHT - radius - 12) return false;
    return !walls.some(w => collidesCircleRect(x, y, radius, w));
  }
  return { WIDTH, HEIGHT, WALLS, clamp, wrapAngle, turnTowards, segmentRectFirstHit,
    wallsHit, hasLineOfSight, nearestTarget, rayCircleHit, traceShot, canOccupy };
});
