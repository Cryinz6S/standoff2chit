/* Tactical Aim Lab — browser / Android WebView entry point.
   Intentionally isolated from external game processes and networks. */
(() => {
  'use strict';
  const Core = window.AimLabCore;
  if (!Core) throw new Error('AimLabCore was not loaded');
  const {WIDTH, HEIGHT, WALLS, clamp, nearestTarget, hasLineOfSight,
    turnTowards, traceShot, canOccupy} = Core;
  const canvas = document.getElementById('arena');
  const viewport = document.getElementById('viewport');
  const ctx = canvas.getContext('2d', {alpha: false});
  const buttonFire = document.getElementById('fire');
  const switches = ['aimbot', 'esp', 'wallbang'];
  const smoothEl = document.getElementById('smooth');
  const config = { aimbot: false, esp: false, wallbang: false, smooth: 65 };
  const player = { x: 122, y: 340, radius: 15, angle: 0 };
  let enemies = [];
  let input = {x: 0, y: 0};
  let joystick = null;
  let aimPointer = null;
  let firing = false;
  let shots = 0;
  let kills = 0;
  let lastShot = 0;
  let lastFrame = 0;
  let target = null;
  let tracer = null;
  let ticks = 0;
  let nextId = 1;
  let seed = 0x9e3779b9;
  const pressed = new Set();
  const $ = id => document.getElementById(id);
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const randomSpot = () => {
    for (let i = 0; i < 80; i++) {
      const x = 90 + rand() * (WIDTH - 180);
      const y = 52 + rand() * (HEIGHT - 105);
      if (x > 350 && canOccupy(x, y, 22, WALLS)) return {x, y};
    }
    return {x: 840, y: 340};
  };
  const makeEnemy = () => {
    const at = randomSpot();
    return {id: nextId++, x: at.x, y: at.y, radius: 17, alive: true,
      speed: 28 + rand()*24, goal: randomSpot(), respawnAt: 0};
  };
  function resetMatch() {
    shots = 0; kills = 0; player.x = 122; player.y = 340; player.angle = 0;
    nextId = 1; enemies = Array.from({length: 7}, makeEnemy);
    firing = false; tracer = null; lastShot = 0; target = null;
    updateStats();
  }
  function updateStats() {
    $('kills').textContent = String(kills).padStart(2,'0');
    $('shots').textContent = String(shots).padStart(2,'0');
    $('accuracy').textContent = shots ? `${Math.round(100*kills/shots)}%` : '0%';
  }
  function setupControls() {
    for (const name of switches) {
      const node = $(name);
      node.addEventListener('click', () => {
        config[name] = !config[name];
        node.setAttribute('aria-checked', String(config[name]));
      });
    }
    smoothEl.addEventListener('input', () => {
      config.smooth = Number(smoothEl.value);
      $('smooth-value').textContent = `${config.smooth}%`;
    });
    $('respawn').addEventListener('click', resetMatch);
    $('reset').addEventListener('click', () => {
      for (const key of switches) { config[key] = false; $(key).setAttribute('aria-checked', 'false'); }
      config.smooth = 65; smoothEl.value = '65'; $('smooth-value').textContent = '65%';
      resetMatch();
    });
    const toWorld = ev => {
      const bounds = canvas.getBoundingClientRect();
      return {x: (ev.clientX-bounds.left)*WIDTH/bounds.width,
        y: (ev.clientY-bounds.top)*HEIGHT/bounds.height};
    };
    viewport.addEventListener('pointerdown', ev => {
      if (ev.target === buttonFire) return;
      if (ev.pointerType === 'mouse') {
        if (ev.button === 0) firing = true;
        const p = toWorld(ev); aimAt(p.x, p.y); return;
      }
      const p = toWorld(ev);
      if (p.x < 430 && !joystick) {
        joystick = {id: ev.pointerId, sx: p.x, sy: p.y};
      } else if (!aimPointer) {
        aimPointer = ev.pointerId; aimAt(p.x, p.y);
      }
      try {viewport.setPointerCapture(ev.pointerId);} catch (_) {}
    });
    viewport.addEventListener('pointermove', ev => {
      const p = toWorld(ev);
      if (ev.pointerType === 'mouse') { aimAt(p.x, p.y); return; }
      if (joystick && joystick.id === ev.pointerId) {
        const dx = p.x - joystick.sx, dy = p.y - joystick.sy;
        const n = Math.max(65, Math.hypot(dx, dy));
        input.x = dx / n; input.y = dy / n;
      } else if (aimPointer === ev.pointerId) aimAt(p.x, p.y);
    });
    const release = ev => {
      if (ev.pointerType === 'mouse') {firing = false; return;}
      if (joystick && joystick.id === ev.pointerId) { joystick = null; input.x = 0; input.y = 0; }
      if (aimPointer === ev.pointerId) aimPointer = null;
    };
    viewport.addEventListener('pointerup', release);
    viewport.addEventListener('pointercancel', release);
    window.addEventListener('blur', () => {firing = false; pressed.clear(); joystick = null; aimPointer = null; input = {x:0,y:0};});
    const startFire = ev => {ev.preventDefault(); ev.stopPropagation(); firing = true;
      buttonFire.classList.add('firing');
      try {buttonFire.setPointerCapture(ev.pointerId);} catch (_) {}
    };
    const stopFire = ev => {ev.preventDefault(); firing = false; buttonFire.classList.remove('firing');};
    buttonFire.addEventListener('pointerdown', startFire);
    buttonFire.addEventListener('pointerup', stopFire);
    buttonFire.addEventListener('pointercancel', stopFire);
    window.addEventListener('keydown', ev => {
      if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.code)) ev.preventDefault();
      pressed.add(ev.code);
    });
    window.addEventListener('keyup', ev => pressed.delete(ev.code));
  }
  function aimAt(x, y) {
    if (!config.aimbot) player.angle = Math.atan2(y-player.y, x-player.x);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(canvas.width/WIDTH, 0, 0, canvas.height/HEIGHT, 0, 0);
  }
  function update(dt, t) {
    ticks += dt;
    let vx = input.x + (pressed.has('KeyD') || pressed.has('ArrowRight') ? 1:0)
      - (pressed.has('KeyA') || pressed.has('ArrowLeft') ? 1:0);
    let vy = input.y + (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1:0)
      - (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1:0);
    const len = Math.max(1, Math.hypot(vx, vy)); vx /= len; vy /= len;
    const px = player.x + vx*170*dt, py = player.y + vy*170*dt;
    if (canOccupy(px, player.y, player.radius)) player.x = px;
    if (canOccupy(player.x, py, player.radius)) player.y = py;
    for (const enemy of enemies) {
      if (!enemy.alive) {
        if (t >= enemy.respawnAt) {
          const at = randomSpot(); enemy.x = at.x; enemy.y = at.y;
          enemy.goal = randomSpot(); enemy.alive = true;
        }
        continue;
      }
      const dx = enemy.goal.x-enemy.x, dy = enemy.goal.y-enemy.y;
      const d = Math.hypot(dx,dy);
      if (d < 8) {enemy.goal=randomSpot(); continue;}
      const nx = enemy.x + dx/d*enemy.speed*dt, ny = enemy.y+dy/d*enemy.speed*dt;
      if (canOccupy(nx, ny, enemy.radius)) {enemy.x=nx; enemy.y=ny;}
      else enemy.goal = randomSpot();
    }
    target = config.aimbot ? nearestTarget(player,enemies,WALLS,config.wallbang) : null;
    if (target) {
      const desired = Math.atan2(target.y-player.y, target.x-player.x);
      player.angle = turnTowards(player.angle, desired, dt, config.smooth);
    }
    if ((firing || pressed.has('Space')) && t-lastShot>135) {
      lastShot=t; shots++;
      const hit = traceShot(player,player.angle,enemies,WALLS,config.wallbang,1200);
      if (hit.victim) {hit.victim.alive=false; hit.victim.respawnAt=t+1500; kills++;}
      tracer = {sx:player.x, sy:player.y, ex:hit.end.x, ey:hit.end.y, at:t,
        blocked:hit.blocked, victim:!!hit.victim};
      updateStats();
    }
    $('lock').textContent = config.aimbot ? target ? `TARGET / BOT ${target.id}` : 'TARGET / NONE' : 'TARGET / MANUAL';
    $('engine-status').textContent = 'RUNNING';
  }
  function line(x1,y1,x2,y2,color,width=1) {
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
  }
  function box(x,y,w,h,color,fill=null) {
    if(fill) {ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  }
  function draw(t) {
    ctx.fillStyle='#0a1722';ctx.fillRect(0,0,WIDTH,HEIGHT);
    // Map grid and navigation lines.
    for(let x=0;x<WIDTH;x+=40) line(x,0,x,HEIGHT,'#153043',.6);
    for(let y=0;y<HEIGHT;y+=40) line(0,y,WIDTH,y,'#153043',.6);
    box(16,16,WIDTH-32,HEIGHT-32,'#244357');
    ctx.fillStyle='#152b3c';
    ctx.font='bold 12px sans-serif';ctx.fillText('TACTICAL TRAINING / ALPHA SITE',24,38);
    for(const e of enemies) {
      if(!e.alive) continue;
      ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);
      ctx.fillStyle='#b94c58';ctx.fill();ctx.strokeStyle='#fa8791';ctx.lineWidth=3;ctx.stroke();
      ctx.beginPath();ctx.arc(e.x,e.y,5,0,Math.PI*2);ctx.fillStyle='#f5c0be';ctx.fill();
    }
    for(const wall of WALLS) {
      ctx.fillStyle='#425566';ctx.fillRect(wall.x,wall.y,wall.w,wall.h);
      ctx.fillStyle='#172e3c';ctx.fillRect(wall.x+5,wall.y+5,wall.w-10,wall.h-10);
      ctx.strokeStyle='#6d8292';ctx.lineWidth=1;ctx.strokeRect(wall.x+2,wall.y+2,wall.w-4,wall.h-4);
    }
    if(config.esp) {
      for(const e of enemies) {
        if(!e.alive) continue;
        const covered=!hasLineOfSight(player,e);
        box(e.x-25,e.y-28,50,56,covered?'#ffca78':'#66eacb');
        ctx.fillStyle=covered?'#ffca78':'#66eacb';ctx.font='bold 11px monospace';
        ctx.fillText(`BOT ${e.id}  ${covered?'COVER':'CLEAR'}`,e.x-25,e.y-35);
        if(config.aimbot && target === e) {
          ctx.beginPath();ctx.arc(e.x,e.y,34,0,Math.PI*2);ctx.lineWidth=1;
          ctx.strokeStyle='#d2fcef';ctx.stroke();
        }
      }
    }
    // Current facing direction and crosshair.
    const ax=player.x+Math.cos(player.angle)*60, ay=player.y+Math.sin(player.angle)*60;
    line(player.x,player.y,ax,ay,'#a7eade',2);
    ctx.beginPath();ctx.arc(player.x,player.y,player.radius,0,Math.PI*2);
    ctx.fillStyle='#2ba994';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#c1fff0';ctx.stroke();
    line(ax-8,ay,ax+8,ay,'#d6fff5',1.5);
    line(ax,ay-8,ax,ay+8,'#d6fff5',1.5);
    if(tracer && t-tracer.at<170) {
      const alpha=1-(t-tracer.at)/170;
      ctx.save();ctx.globalAlpha=alpha;
      line(tracer.sx,tracer.sy,tracer.ex,tracer.ey,tracer.victim?'#65ffcb':'#ffe1a2',3);
      ctx.beginPath();ctx.arc(tracer.ex,tracer.ey,5,0,Math.PI*2);
      ctx.fillStyle=tracer.blocked?'#ff817f':'#ffe1a2';ctx.fill();ctx.restore();
    }
    if(joystick) {
      ctx.beginPath();ctx.arc(joystick.sx,joystick.sy,68,0,Math.PI*2);
      ctx.strokeStyle='#77b7b87a';ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.arc(joystick.sx+input.x*50,joystick.sy+input.y*50,25,0,Math.PI*2);
      ctx.fillStyle='#80d9cb59';ctx.fill();
    }
  }
  function frame(t) {
    const dt = lastFrame ? clamp((t-lastFrame)/1000,0,.05) : 0;
    lastFrame = t;
    update(dt,t);draw(t);
    window.requestAnimationFrame(frame);
  }
  setupControls(); resetMatch(); resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  window.requestAnimationFrame(frame);
})();
