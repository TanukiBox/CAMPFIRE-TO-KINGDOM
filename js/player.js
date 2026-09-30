// 主人公：移動・近くの物に合わせた自動アクション・HP。背中に素材を積む「運び手」でもある
import * as THREE from './lib/three.module.min.js';
import { scene } from './gfx.js';
import { playerModel, LEVEL_COLORS } from './models.js';
import { PLAYER, NODE_TYPES } from './data.js';
import { S, stat, weaponOf, armorOf } from './state.js';

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
    this.bag = [];
    this.applyStats();
    this.hp = this.maxHp;
    this.alive = true;
    this.invul = 0; this.sinceHit = 99; this.hurtT = 0;
    this.swingT = -1; this.swingDur = 0.5; this.target = null; this.targetKind = null; this.hitDone = false;
    this.tool = null; this.toolShow = 0;
    this.walk = 0; this.moveAmt = 0;
    this.kx = 0; this.kz = 0;
    this.fullNear = false;
    // 剣の軌跡
    const tg = new THREE.RingGeometry(0.55, 1.45, 18, 1, -0.75, 2.5).rotateY(-Math.PI / 2);
    this.trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    this.trail = new THREE.Mesh(tg, this.trailMat);
    this.trail.position.set(0.28, 0.95, 0.1);
    this.trail.visible = false;
    this.m.root.add(this.trail);
  }

  // 強化の値を反映し、見た目も変える
  applyStats() {
    this.cap = stat.cap();
    this.speed = stat.speed();
    const oldMax = this.maxHp;
    this.maxHp = stat.maxHp();
    if (oldMax && this.maxHp > oldMax) this.hp += this.maxHp - oldMax;
    const m = this.m;
    // 武器：刃の色と長さ。炎の剣・竜の剣は光る
    const w = weaponOf(), a = armorOf();
    m.toolMat.sword.color.setHex(w.color);
    m.toolMat.sword.emissive.setHex(w.glow ? w.color : 0x000000);
    m.toolMat.sword.emissiveIntensity = w.glow ? 0.45 : 0;
    m.tools.sword.scale.set(1 + (w.len - 1) * 0.6, 1 + (w.len - 1) * 0.6, w.len);
    m.toolMat.axe.color.setHex(LEVEL_COLORS.blade[S.tool.axe]);
    m.toolMat.pick.color.setHex(LEVEL_COLORS.blade[S.tool.pick]);
    for (const k of ['axe', 'pick']) m.tools[k].scale.setScalar(1 + S.tool[k] * 0.12);
    m.shoe.color.setHex(LEVEL_COLORS.shoe[Math.min(3, Math.ceil(S.up.speed / 3))]);
    // 防具：よろいの色
    m.armor.visible = a.id !== 'cloth';
    m.armorMat.color.setHex(a.color);
    m.pack.scale.set(1 + S.up.bag * 0.05, 1 + S.up.bag * 0.06, 1 + S.up.bag * 0.05);
    m.packMat.color.setHex(LEVEL_COLORS.pack[Math.min(5, Math.ceil(S.up.bag / 2))]);
  }

  setTool(name) {
    if (this.tool === name) return false;
    for (const k in this.m.tools) this.m.tools[k].visible = k === name;
    this.tool = name;
    return true;
  }

  damage(n, fx, fz) {
    if (!this.alive || this.invul > 0) return;
    // 防具の守りの分だけ減らす（半分より下にはならない）
    n = Math.max(Math.ceil(n * 0.4), n - stat.def());
    this.hp = Math.max(0, this.hp - n);
    this.invul = 0.7; this.sinceHit = 0; this.hurtT = 0.25;
    const dx = this.pos.x - fx, dz = this.pos.z - fz, d = Math.hypot(dx, dz) || 1;
    this.kx = dx / d * 7; this.kz = dz / d * 7;
    this.hooks.onHurt(n);
    if (this.hp <= 0) { this.alive = false; this.hooks.onDown(); }
  }

  // ctx: { move, world, resources, enemies }
  update(dt, ctx) {
    const { move, world, resources, enemies } = ctx;
    this.invul = Math.max(0, this.invul - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.sinceHit += dt;
    if (!this.alive) { this.vel.set(0, 0, 0); this.animate(dt); return; }

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
        if (n) { if (this.bag.length >= this.cap) this.fullNear = true; else { target = n; kind = 'node'; } }
      }
      if (target) {
        this.target = target; this.targetKind = kind;
        const tool = kind === 'enemy' ? 'sword' : NODE_TYPES[target.type].tool;
        if (this.setTool(tool)) this.hooks.onSwap(tool);
        this.swingT = 0; this.swingDur = stat.swing(tool); this.hitDone = false;
      }
    }
    if (this.swingT >= 0) {
      this.toolShow = 1.2;
      this.swingT += dt / this.swingDur;
      if (!this.hitDone && this.swingT >= 0.58) {
        this.hitDone = true;
        const t = this.target;
        const ok = this.targetKind === 'enemy'
          ? t.alive && Math.hypot(t.x - this.pos.x, t.z - this.pos.z) - t.r < PLAYER.reachEnemy + 0.8
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
    let arm = IDLE_ARM + sw * 0.4 * moving, lean = 0;
    const t = this.swingT;
    if (t >= 0) {
      if (t < 0.45) { const k = t / 0.45; arm = IDLE_ARM + (-2.7 - IDLE_ARM) * (1 - (1 - k) * (1 - k)); lean = -0.08 * k; }
      else if (t < 0.6) { const k = (t - 0.45) / 0.15; arm = -2.7 + 2.8 * k * k; lean = -0.08 + 0.3 * k; }
      else { const k = (t - 0.6) / 0.4; arm = 0.1 + (IDLE_ARM - 0.1) * k; lean = 0.22 * (1 - k); }
    }
    m.armR.rotation.x = arm;
    // 剣を振ったときだけ、振り下ろす間に光の弧を出す
    const tr = t >= 0.4 && t < 0.85 && this.tool === 'sword';
    this.trail.visible = tr;
    if (tr) {
      const k = (t - 0.4) / 0.45;
      this.trailMat.opacity = (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75) * 0.75;
      this.trailMat.color.setHex(weaponOf().glow ? weaponOf().color : 0xfff6d0);
      this.trail.scale.setScalar(weaponOf().len);
    }
    m.body.rotation.x = lean;
    if (!this.alive) m.body.rotation.z = Math.min(Math.PI / 2, m.body.rotation.z + dt * 6);
    else m.body.rotation.z = 0;
    m.root.visible = !(this.invul > 0 && this.invul < 100 && this.alive && Math.floor(this.invul * 16) % 2 === 1);
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
