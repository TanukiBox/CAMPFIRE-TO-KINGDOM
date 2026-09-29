// 主人公：移動・近くの物に合わせた自動アクション・HP
import * as THREE from './lib/three.module.min.js';
import { scene } from './gfx.js';
import { playerModel } from './models.js';
import { PLAYER, NODE_TYPES } from './data.js';

const IDLE_ARM = 0.2;

export class Player {
  constructor() {
    this.m = playerModel();
    scene.add(this.m.root);
    this.pos = this.m.root.position;
    this.yaw = 0;
    this.vel = new THREE.Vector3();
    this.lag = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this.maxHp = PLAYER.hp; this.hp = this.maxHp;
    this.speed = PLAYER.speed; this.dmg = PLAYER.dmg;
    this.alive = true;
    this.invul = 0; this.sinceHit = 99; this.hurtT = 0;
    this.swingT = -1; this.swingDur = 0.5; this.target = null; this.targetKind = null; this.hitDone = false;
    this.tool = null; this.toolShow = 0;
    this.walk = 0; this.moveAmt = 0;
    this.kx = 0; this.kz = 0;
    this.fullNear = false;
  }

  setTool(name) {
    if (this.tool === name) return false;
    for (const k in this.m.tools) this.m.tools[k].visible = k === name;
    this.tool = name;
    return true;
  }

  damage(n, fx, fz) {
    if (!this.alive || this.invul > 0) return;
    this.hp = Math.max(0, this.hp - n);
    this.invul = 0.7; this.sinceHit = 0; this.hurtT = 0.25;
    const dx = this.pos.x - fx, dz = this.pos.z - fz, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 7; this.kz = dz / d * 7;
    this.hooks.onHurt(n);
    if (this.hp <= 0) { this.alive = false; this.hooks.onDown(); }
  }

  // ctx: { move, world, resources, enemies, items }
  update(dt, ctx) {
    const { move, world, resources, enemies, items } = ctx;
    this.invul = Math.max(0, this.invul - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.sinceHit += dt;
    if (!this.alive) { this.vel.set(0, 0, 0); this.animate(dt); return; }

    // 回復
    if (this.sinceHit > PLAYER.regenDelay && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + PLAYER.regenPerSec * dt);

    // 移動
    const swinging = this.swingT >= 0;
    const sp = this.speed * move.m * (swinging ? 0.85 : 1);
    this.vel.set(move.x * sp, 0, move.z * sp);
    this.pos.x += (this.vel.x + this.kx) * dt;
    this.pos.z += (this.vel.z + this.kz) * dt;
    const k = Math.pow(0.002, dt); this.kx *= k; this.kz *= k;
    world.resolve(this.pos, 0.36);
    this.moveAmt += ((move.m > 0 ? 1 : 0) - this.moveAmt) * Math.min(1, dt * 10);
    this.lag.lerp(this.vel, Math.min(1, dt * 5));

    // 近くにある物で行動を決める（敵 → 剣、木 → 斧、岩 → つるはし）
    this.fullNear = false;
    if (!swinging) {
      let target = enemies.nearest(this.pos.x, this.pos.z, PLAYER.reachEnemy), kind = 'enemy';
      if (!target) {
        const n = resources.nearest(this.pos.x, this.pos.z);
        if (n) { if (items.full) this.fullNear = true; else { target = n; kind = 'node'; } }
      }
      if (target) {
        this.target = target; this.targetKind = kind;
        const tool = kind === 'enemy' ? 'sword' : NODE_TYPES[target.type].tool;
        if (this.setTool(tool)) this.hooks.onSwap(tool);
        this.swingT = 0; this.swingDur = PLAYER.swing[tool]; this.hitDone = false;
      }
    }
    if (this.swingT >= 0) {
      this.toolShow = 1.2;
      this.swingT += dt / this.swingDur;
      if (!this.hitDone && this.swingT >= 0.58) {
        this.hitDone = true;
        const t = this.target;
        const ok = this.targetKind === 'enemy'
          ? t.alive && Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < PLAYER.reachEnemy + 0.8
          : t.state === 'ok' && Math.hypot(t.x - this.pos.x, t.z - this.pos.z) < t.def.reach + 0.8;
        if (ok) this.hooks.onHit(this.targetKind, t);
      }
      if (this.swingT >= 1) this.swingT = -1;
    } else {
      this.toolShow -= dt;
      if (this.toolShow <= 0 && this.tool) this.setTool(null);
    }

    // 向き
    let want = null;
    if (this.swingT >= 0 && this.target) want = Math.atan2(this.target.x - this.pos.x, this.target.z - this.pos.z);
    else if (move.m > 0) want = Math.atan2(move.x, move.z);
    if (want !== null) {
      let da = want - this.yaw; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.yaw += da * Math.min(1, dt * 14);
    }
    this.animate(dt);
  }

  animate(dt) {
    const m = this.m;
    m.root.rotation.y = this.yaw;
    const moving = this.moveAmt;
    this.walk += dt * 11 * moving;
    const sw = Math.sin(this.walk);
    m.legL.rotation.x = sw * 0.7 * moving;
    m.legR.rotation.x = -sw * 0.7 * moving;
    m.armL.rotation.x = -sw * 0.6 * moving;
    m.body.position.y = Math.abs(Math.cos(this.walk)) * 0.07 * moving;
    // 振り
    let arm = IDLE_ARM + sw * 0.4 * moving, lean = 0;
    const t = this.swingT;
    if (t >= 0) {
      if (t < 0.45) { const k = t / 0.45; arm = IDLE_ARM + (-2.7 - IDLE_ARM) * (1 - (1 - k) * (1 - k)); lean = -0.08 * k; }
      else if (t < 0.6) { const k = (t - 0.45) / 0.15; arm = -2.7 + 2.8 * k * k; lean = -0.08 + 0.3 * k; }
      else { const k = (t - 0.6) / 0.4; arm = 0.1 + (IDLE_ARM - 0.1) * k; lean = 0.22 * (1 - k); }
    }
    m.armR.rotation.x = arm;
    m.body.rotation.x = lean;
    // 倒れた・攻撃を受けた
    if (!this.alive) m.body.rotation.z = Math.min(Math.PI / 2, m.body.rotation.z + dt * 6);
    else m.body.rotation.z = 0;
    m.root.visible = !(this.invul > 0 && this.alive && Math.floor(this.invul * 16) % 2 === 1);
    m.root.updateMatrixWorld(true);
    m.anchor.getWorldPosition(this.anchor);
  }

  respawn(x, z) {
    this.pos.set(x, 0, z);
    this.hp = this.maxHp; this.alive = true; this.invul = 2; this.sinceHit = 99;
    this.kx = this.kz = 0; this.swingT = -1; this.m.body.rotation.z = 0;
    this.lag.set(0, 0, 0);
  }
}
