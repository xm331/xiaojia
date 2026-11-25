/* 由本地开发脚本整理而来：node tests/smoke.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
const fs = require('fs');
const vm = require('vm');
const P = __P;
const html = fs.readFileSync(P, 'utf8');
const code = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

function mkEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } }, dataset: {}, children: [], files: [],
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
  return el;
}

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => store.clear(),
};

const errors = [];
const win = {
  localStorage, sessionStorage: localStorage,
  location: { search: '', pathname: '/', hash: '', href: 'https://x/' },
  history: { replaceState() {} },
  document: {
    getElementById: () => mkEl(),
    querySelector: () => mkEl(),
    querySelectorAll: () => [],
    createElement: (t) => mkEl(t),
    addEventListener() {}, removeEventListener() {},
    body: mkEl('body'), documentElement: mkEl('html'),
    visibilityState: 'visible', hidden: false,
    title: '', cookie: '',
  },
  navigator: { userAgent: 'node', language: 'zh-CN', standalone: false, storage: { persist() { return Promise.resolve(true); }, persisted() { return Promise.resolve(true); } }, serviceWorker: { register() { return Promise.resolve({}); } }, maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  indexedDB: { open() { throw new Error('no idb'); } },
  requestAnimationFrame: (f) => setTimeout(f, 0),
  cancelAnimationFrame() {},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  fetch: () => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}), text: () => Promise.resolve('') }),
  alert() {}, confirm() { return false; }, prompt() { return ''; },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  URLSearchParams, TextDecoder, TextEncoder, AbortController, Blob: function () {}, FormData: function () {},
  FileReader: function () { this.readAsDataURL = () => { if (this.onload) this.onload({ target: { result: 'data:' } }); }; },
  Image: function () { setTimeout(() => this.onload && this.onload(), 0); },
  console: { log() {}, warn() {}, error(...a) { errors.push(a.join(' ')); } },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
win.window = win; win.self = win; win.globalThis = win; win.parent = win; win.top = win;
win.innerWidth = 390; win.innerHeight = 844; win.devicePixelRatio = 2;
win.scrollTo = () => {}; win.open = () => null;

vm.createContext(win);
try {
  vm.runInContext(code, win, { filename: 'xiaojia.js' });
  console.log('✅ 整段脚本执行完毕，无抛出');
} catch (e) {
  console.log('❌ 执行时抛错：' + e.message);
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
}
if (errors.length) {
  console.log('⚠️ console.error 次数:', errors.length);
  errors.slice(0, 5).forEach(x => console.log('   ', x.slice(0, 200)));
} else {
  console.log('✅ 没有 console.error');
}
