const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../web/engine.js');
const wall = [{x: 100,y: 0,w: 20,h: 100}];
const player = {x: 30,y: 50};
const covered = {id: 1,x: 160,y: 50,radius: 10,alive: true};
const clear = {id: 2,x: 50,y: 80,radius: 10,alive: true};

test('unobstructed ray passes', () => {
  assert.equal(e.hasLineOfSight(player, clear, wall), true);
});
test('wall blocks ray', () => {
  assert.equal(e.hasLineOfSight(player, covered, wall), false);
  assert.ok(e.wallsHit(player.x,player.y,covered.x,covered.y,wall) !== null);
});
test('aimbot target selection obeys occlusion', () => {
  assert.equal(e.nearestTarget(player,[covered,clear],wall,false)?.id,2);
  assert.equal(e.nearestTarget(player,[covered],wall,false),null);
  assert.equal(e.nearestTarget(player,[covered],wall,true)?.id,1);
});
test('wall penetration changes shot result', () => {
  const normal = e.traceShot(player,0,[covered],wall,false,200);
  assert.equal(normal.victim,null);
  assert.equal(normal.blocked,true);
  const piercing = e.traceShot(player,0,[covered],wall,true,200);
  assert.equal(piercing.victim,covered);
  assert.equal(piercing.blocked,false);
});
test('smooth aim moves gradually, is dt bound and wraps angle', () => {
  const a=e.turnTowards(0,Math.PI/2,0.016,95);
  assert.ok(a>0 && a<Math.PI/2);
  const b=e.turnTowards(Math.PI-.05,-Math.PI+.05,0.016,70);
  assert.ok(b>Math.PI-.05 || b < -Math.PI+.05);
});
test('world collision respects walls and map', () => {
  assert.equal(e.canOccupy(110,50,10,wall),false);
  assert.equal(e.canOccupy(40,50,10,wall),true);
  assert.equal(e.canOccupy(0,50,10,wall),false);
});
test('ignores inactive targets',()=>{
  assert.equal(e.nearestTarget(player,[{...covered,alive:false}],wall,true),null);
});
