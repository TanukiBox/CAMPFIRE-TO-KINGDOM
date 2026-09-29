// 描画の土台：レンダラー・カメラ・光・画質の自動調整・共通マテリアル・形のまとめ焼き
import * as THREE from './lib/three.module.min.js';

export const params = new URLSearchParams(location.search);
export const isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const stage = document.getElementById('stage');
export const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
const DPR = window.devicePixelRatio || 1;

// 画質：スマホは影なし・解像度控えめで始め、重ければさらに下げる
export const quality = { shadows: !isMobile, maxRatio: Math.min(DPR, isMobile ? 2 : 2), ratio: 1, auto: true };
const q = params.get('q');
if (q === 'low') { quality.shadows = false; quality.maxRatio = 1; }
else if (q === 'mid') { quality.shadows = false; }
else if (q === 'high') { quality.shadows = true; quality.auto = false; }
quality.ratio = quality.maxRatio;
renderer.setPixelRatio(quality.ratio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

export const scene = new THREE.Scene();
export const SKY = new THREE.Color(0xcdeefc);
scene.background = SKY.clone();
scene.fog = new THREE.Fog(SKY, 38, 75);

export const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 150);
export const view = { dist: 22, w: 1, h: 1 };
const PITCH = 0.86; // 見下ろす角度（約49°）
const camDir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));

export const hemi = new THREE.HemisphereLight(0xfffaf0, 0x9cc27c, 1.7);
export const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
sun.castShadow = quality.shadows;
{
  const s = sun.shadow;
  s.mapSize.set(1024, 1024);
  const c = s.camera;
  c.left = -20; c.right = 20; c.top = 20; c.bottom = -20; c.near = 1; c.far = 70;
  s.bias = -0.0008; s.normalBias = 0.04; s.radius = 3;
  if ('intensity' in s) s.intensity = 0.55; // やわらかい影
}
scene.add(hemi, sun, sun.target);
const SUN_OFF = new THREE.Vector3(-10, 22, 12);

export function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  view.w = w; view.h = h;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.fov = camera.aspect < 1 ? 46 : 38;
  // 横に見える広さから距離を決める（縦画面でも左右が狭くなりすぎないように）
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const wantW = camera.aspect < 1 ? 14.5 : 22;
  view.dist = THREE.MathUtils.clamp(wantW / (2 * tan * camera.aspect), 14, 30);
  camera.updateProjectionMatrix();
}

export function placeCamera(target, sx = 0, sy = 0) {
  camera.position.copy(target).addScaledVector(camDir, view.dist);
  camera.position.x += sx; camera.position.y += sy;
  camera.lookAt(target.x + sx, target.y + sy, target.z);
  sun.target.position.set(target.x, 0, target.z - 4);
  sun.position.copy(sun.target.position).add(SUN_OFF);
}

// ---- 画質の自動調整 ----
export const perf = { fps: 60 };
let acc = 0, frames = 0, warm = 2, slow = 0;
export function perfReset() { acc = 0; frames = 0; }
export function perfTick(rawDt, onChange) {
  if (rawDt > 0.25) { acc = 0; frames = 0; return; }
  acc += rawDt; frames++;
  if (acc < 1.5) return;
  perf.fps = frames / acc; acc = 0; frames = 0;
  if (warm > 0) { warm--; return; }
  if (!quality.auto) return;
  if (perf.fps < 45) { if (++slow >= 2) { slow = 0; degrade(onChange); } } else slow = 0;
}
function degrade(onChange) {
  if (sun.castShadow) {
    sun.castShadow = false; quality.shadows = false;
    onChange && onChange();
    return;
  }
  if (quality.ratio > 1) {
    quality.ratio = Math.max(1, Math.round((quality.ratio - 0.25) * 100) / 100);
    renderer.setPixelRatio(quality.ratio);
    resize();
    onChange && onChange();
  }
}

// ---- マテリアル（色ごとに使い回す） ----
const matCache = new Map();
export function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra }); matCache.set(key, m); }
  return m;
}
export function glow(color) {
  const key = 'g' + color;
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color }); matCache.set(key, m); }
  return m;
}

// ---- 形をまとめる ----
// 形を1つにつなげる（位置と法線だけ。色は頂点色があれば引き継ぐ）
export function mergeGeos(geos) {
  let n = 0;
  const parts = geos.map(g => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
  const hasColor = parts.every(g => g.attributes.color);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = hasColor ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const g of parts) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// 部品の多い模型を、マテリアルごとに1つの形へ焼き固める（描画の回数を減らす）
export function bake(group, { cast = true, receive = true } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [material, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeos(geos), material);
    mesh.castShadow = cast && !material.isMeshBasicMaterial;
    mesh.receiveShadow = receive && !material.isMeshBasicMaterial;
    out.add(mesh);
  }
  return out;
}

// ---- 丸い影（キャラ・物の足元） ----
function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(30,45,25,0.42)');
  gr.addColorStop(0.55, 'rgba(30,45,25,0.26)');
  gr.addColorStop(1, 'rgba(30,45,25,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blobGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
const _bm = new THREE.Matrix4();
export class Blobs {
  constructor(cap) {
    this.mesh = new THREE.InstancedMesh(blobGeo, blobMat, cap);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.count = 0;
    this.cap = cap; this.n = 0;
    scene.add(this.mesh);
  }
  begin() { this.n = 0; }
  push(x, z, r, y = 0.03) {
    if (this.n >= this.cap) return;
    _bm.makeScale(r * 2, 1, r * 2); _bm.setPosition(x, y, z);
    this.mesh.setMatrixAt(this.n++, _bm);
  }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}

// ---- 画面上の位置 ----
const _v = new THREE.Vector3();
export function toScreen(x, y, z, out) {
  _v.set(x, y, z).project(camera);
  out.x = (_v.x + 1) * 0.5 * view.w;
  out.y = (1 - _v.y) * 0.5 * view.h;
  out.behind = _v.z > 1;
  out.on = _v.z < 1 && out.x > -40 && out.x < view.w + 40 && out.y > -40 && out.y < view.h + 40;
  return out;
}
