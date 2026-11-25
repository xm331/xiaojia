/* 由本地开发脚本整理而来：node tests/key-store.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 钥匙机制验证：每台设备只用自己填的钥匙，绝不串用 */
const fs = require('fs');
const vm = require('vm');

const CASES = [
  {
    name: 'A 全新设备（什么都没填）',
    seed: {},
    expect: (KEY, ms) => KEY === '' && ms.every(m => !m.key),
    desc: '弹出填钥匙框，一个请求都不发',
  },
  {
    name: 'B 本机填过钥匙',
    seed: { 'ai_key_v1': 'sk-own-device-111' },
    expect: (KEY, ms) => KEY === 'sk-own-device-111' && ms.every(m => m.key === 'sk-own-device-111'),
    desc: '三个成员全用这把',
  },
  {
    name: 'C 主存储被清、只剩 cookie',
    seed: { __cookie: 'ai_k=sk-from-cookie-222' },
    expect: (KEY, ms) => KEY === 'sk-from-cookie-222' && ms.every(m => m.key === 'sk-from-cookie-222'),
    desc: 'cookie 兜住，不会丢',
  },
  {
    name: 'D 只剩备份项',
    seed: { 'ai_key_v1_bak': 'sk-from-backup-333' },
    expect: (KEY, ms) => KEY === 'sk-from-backup-333' && ms.every(m => m.key === 'sk-from-backup-333'),
    desc: '备份项兜住',
  },
  {
    name: 'E 老存档成员里带钥匙、本机没别的',
    seed: {
      'ai_groupchat_v10': JSON.stringify([
        { id: 'a', name: 'Nyx', url: 'u', model: 'm', key: 'sk-legacy-444', history: [] },
        { id: 'b', name: 'Vesta', url: 'u', model: 'm', key: 'sk-legacy-444', history: [] },
        { id: 'c', name: 'Demeter', url: 'u', model: 'm', key: 'sk-legacy-444', history: [] },
      ]),
    },
    expect: (KEY, ms) => KEY === 'sk-legacy-444' && ms.every(m => m.key === 'sk-legacy-444'),
    desc: '从老数据捞回来',
  },
  {
    name: 'F 成员里混着别人的钥匙',
    seed: {
      'ai_key_v1': 'sk-own-555',
      'ai_groupchat_v10': JSON.stringify([
        { id: 'a', name: 'Nyx', url: 'u', model: 'm', key: 'sk-SOMEONE-ELSE-999', history: [] },
        { id: 'b', name: 'Vesta', url: 'u', model: 'm', key: '', history: [] },
        { id: 'c', name: 'Demeter', url: 'u', model: 'm', key: 'sk-SOMEONE-ELSE-999', history: [] },
      ]),
    },
    expect: (KEY, ms) => KEY === 'sk-own-555' && ms.every(m => m.key === 'sk-own-555'),
    desc: '★ 别人的钥匙被本机钥匙覆盖，绝不上他的额度',
  },
];

function mkEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } }, dataset: {}, children: [], files: [],
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false,
    scrollTop: 0, scrollHeight: 0, offsetHeight: 0, offsetWidth: 0, clientHeight: 0, clientWidth: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, insertBefore() {}, replaceChildren() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, hasAttribute() { return false; },
    querySelector() { return mkEl(); }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; },
    focus() {}, blur() {}, click() {}, scrollIntoView() {}, closest() { return null; },
    contains() { return false; }, animate() { return { finished: Promise.resolve(), cancel() {} }; },
    getContext() { return null; }, toDataURL() { return ''; },
  };
}

function run(seed) {
  const store = new Map();
  let cookie = seed.__cookie || '';
  for (const k of Object.keys(seed)) if (k !== '__cookie') store.set(k, seed[k]);
  const localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
  const doc = {
    getElementById: () => mkEl(), querySelector: () => mkEl(), querySelectorAll: () => [],
    createElement: t => mkEl(t), addEventListener() {}, removeEventListener() {},
    body: mkEl('body'), documentElement: mkEl('html'),
    visibilityState: 'visible', hidden: false, title: '',
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
  };
  const win = {
    localStorage, sessionStorage: localStorage,
    location: { search: '', pathname: '/', hash: '', href: 'https://x/' },
    history: { replaceState() {} },
    document: doc,
    navigator: { userAgent: 'node', language: 'zh-CN', standalone: false, storage: { persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true) }, serviceWorker: { register: () => Promise.resolve({}) }, maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    indexedDB: { open() { throw new Error('no idb'); } },
    requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame() {},
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    fetch: () => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
    alert() {}, confirm() { return false; }, prompt() { return ''; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    URLSearchParams, TextDecoder, TextEncoder, AbortController, Blob: function () {}, FormData: function () {},
    FileReader: function () { this.readAsDataURL = () => { if (this.onload) this.onload({ target: { result: 'data:' } }); }; },
    Image: function () { setTimeout(() => this.onload && this.onload(), 0); },
    console: { log() {}, warn() {}, error() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  };
  win.window = win; win.self = win; win.globalThis = win; win.parent = win; win.top = win;
  win.innerWidth = 390; win.innerHeight = 844; win.devicePixelRatio = 2;
  win.scrollTo = () => {}; win.open = () => null;

  vm.createContext(win);
  const html = fs.readFileSync(__P, 'utf8');
  const code = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  vm.runInContext(code, win, { filename: 't.js' });
  // 把内部变量暴露出来看（start 是 async IIFE，已经在跑）
  return new Promise(res => setTimeout(() => {
    const g = vm.runInContext('({KEY, members: members.map(m=>({name:m.name,key:m.key}))})', win);
    res({ g, store, cookie });
  }, 80));
}

(async () => {
  console.log('钥匙机制验证（每个场景独立沙箱）\n');
  for (const c of CASES) {
    const { g, store, cookie } = await run(c.seed);
    const ok = c.expect(g.KEY, g.members);
    console.log((ok ? '✅ ' : '❌ ') + c.name);
    console.log('     ' + c.desc);
    console.log('     KEY=' + (g.KEY ? g.KEY.slice(0, 4) + '…(' + g.KEY.length + '位)' : '(空)') +
      '  成员钥匙=' + JSON.stringify(g.members.map(m => m.key ? m.key.slice(0, 4) + '…' : '(空)')));
    // 三处存储是否都写了
    const hasLS = !!store.get('ai_key_v1'), hasBak = !!store.get('ai_key_v1_bak'), hasCk = /ai_k=/.test(cookie);
    console.log('     存三处: localStorage ' + (hasLS ? '✅' : '—') + ' / 备份 ' + (hasBak ? '✅' : '—') + ' / cookie ' + (hasCk ? '✅' : '—'));
    console.log();
  }
})();
