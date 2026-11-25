/* 由本地开发脚本整理而来：node tests/lead-chain.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 验证 z106：他起头 → AI 接台词（按序）；第三个人自己抽牌；顺带验省钱参数 */
const fs = require('fs');
const vm = require('vm');
const P = process.argv[2] || __P;

function mkEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } }, dataset: {}, children: [], files: [],
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false,
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

const calls = [];
const store = new Map();
const els = new Map();
const getEl = id => { if (!els.has(id)) els.set(id, mkEl()); return els.get(id); };

const members = [
  { id: 'a', avatar: 'img:gpt|gpt_bust.webp', name: 'Nyx', provider: 'siliconflow', url: 'https://api.siliconflow.cn/v1', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Nyx', pv: 5, mem: '', history: [] },
  { id: 'b', avatar: 'img:claude|claude_bust.webp', name: 'Vesta', provider: 'siliconflow', url: 'https://api.siliconflow.cn/v1', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Vesta', pv: 5, mem: '', history: [] },
  { id: 'c', avatar: 'img:deepseek|deepseek_bust.webp', name: 'Demeter', provider: 'siliconflow', url: 'https://api.siliconflow.cn/v1', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Demeter', pv: 5, mem: '', history: [] },
];
store.set('ai_key_v1', 'sk-test');
store.set('ai_profile_v1', JSON.stringify({ done: true, name: '小米', step: 99, facts: [] }));
store.set('ai_groupchat_v10', JSON.stringify(members));

function stream(n) {
  let i = 0;
  return {
    getReader: () => ({
      read: () => new Promise(r => setTimeout(() => {
        if (i >= n) return r({ done: true, value: undefined });
        i++;
        r({ done: false, value: new TextEncoder().encode('data: ' + JSON.stringify({ choices: [{ delta: { content: '我回一句' } }] }) + '\n\n') });
      }, 3)),
    }),
  };
}

const win = {
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
  location: { search: '', pathname: '/', hash: '', href: 'https://x/' },
  history: { replaceState() {} },
  document: { getElementById: getEl, querySelector: () => mkEl(), querySelectorAll: () => [], createElement: t => mkEl(t), addEventListener() {}, removeEventListener() {}, body: mkEl('body'), documentElement: mkEl('html'), visibilityState: 'visible', hidden: false, title: '', cookie: '' },
  navigator: { userAgent: 'node', language: 'zh-CN', standalone: false, storage: { persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true) }, serviceWorker: { register: () => Promise.resolve({}) }, maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  indexedDB: { open() { throw new Error('no idb'); } },
  requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame() {},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  fetch: (url, opt) => {
    let name = '?', body = null;
    try {
      body = JSON.parse(opt.body);
      const all = body.messages.map(x => typeof x.content === 'string' ? x.content : '').join('\n');
      name = (all.match(/你是'?(Nyx|Vesta|Demeter)/) || [])[1] || '?';
      calls.push({ name, body, all });
    } catch (e) {}
    return Promise.resolve({ ok: true, status: 200, body: stream(2), json: () => Promise.resolve({}) });
  },
  alert() {}, confirm() { return false; }, prompt() { return ''; },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  URLSearchParams, TextDecoder, TextEncoder, AbortController, Blob: function () {}, FormData: function () {},
  FileReader: function () {}, Image: function () {},
  console: { log() {}, warn() {}, error() {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
win.window = win; win.self = win; win.globalThis = win; win.parent = win; win.top = win;
win.innerWidth = 390; win.innerHeight = 844; win.devicePixelRatio = 2;
win.scrollTo = () => {}; win.open = () => null;

vm.createContext(win);
const html = fs.readFileSync(P, 'utf8');
const code = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
vm.runInContext(code, win, { filename: 't.js' });

const send = vm.runInContext('send', win);
const setInput = v => { getEl('inputBox').value = v; };
const spoken = () => vm.runInContext('groupPlayer.spoken.slice()', win);
const reset = () => { calls.length = 0; };

(async () => {
  // ── 静态检查：起头词、台词编号、省钱参数 ──
  const pool = vm.runInContext('CHAIN_MEMES', win);
  const fear = pool.find(r => r.name === '恐惧派');
  const res = pool.find(r => r.name === '资源派');
  console.log((vm.runInContext('typeof matchChainMeme', win) === 'function' ? '✅' : '❌') + ' 连环梗匹配函数 matchChainMeme 在位');
  console.log('== 静态检查 ==');
  console.log((fear.userLead && fear.userLead.test('根本就没有这样的事情') ? '✅' : '❌') + ' 恐惧派认出「根本就没有这样的事情」');
  console.log((fear.userLead && fear.userLead.test('我吃了一包辣条') ? '❌ 误伤' : '✅') + ' 普通话不会误判成起头');
  console.log((res.userLead && res.userLead.test('有') && res.userLead.test('有的。') ? '✅' : '❌') + ' 资源派认出「有」「有的。」');
  console.log((res.userLead && !res.userLead.test('有点累了') ? '✅' : '❌') + ' 「有点累了」不会误判');
  const mm = html.match(/maxTok=\[(\d+),(\d+),(\d+),(\d+)\]/);
  console.log((mm && mm[3] === '260' ? '✅' : '❌') + ' 深度回复上限 ' + (mm ? mm[3] : '?') + ' 字');
  const memLine = html.match(/else if\(heartfelt\)memShow=sharedMem\.length<=(\d+)/);
  console.log((memLine && memLine[1] === '800' ? '✅' : '❌') + ' 深度记忆上限 ' + (memLine ? memLine[1] : '?') + ' 字');

  // ── 场景 A：他起头「根本就没有这样的事情」 ──
  console.log('\n== A：他说「根本就没有这样的事情」==');
  reset(); setInput('根本就没有这样的事情'); await send(); await new Promise(r => setTimeout(r, 4000));
  const a = spoken();
  console.log('实际蹦出来的顺序：', a.map(x => JSON.stringify(x)).join(' → '));
  console.log((a.includes('你只是怕了') && a.includes('这谁不怕') ? '✅' : '❌') + ' 两句台词都出现了');
  const i1 = a.indexOf('你只是怕了'), i2 = a.indexOf('这谁不怕');
  console.log((i1 >= 0 && i2 > i1 ? '✅' : '❌') + ' 顺序对：你只是怕了（' + i1 + '）→ 这谁不怕（' + i2 + '）');
  const rest = a.filter(x => x !== '你只是怕了' && x !== '这谁不怕');
  console.log((rest.length >= 1 ? '✅' : '❌') + ' 剩下的人自己说了 ' + rest.length + ' 句（没被拉去配台词）');

  // ── 场景 B：他只回一个「有」 ──
  console.log('\n== B：他只回一个「有」==');
  reset(); setInput('有'); await send(); await new Promise(r => setTimeout(r, 4000));
  const b = spoken();
  console.log('实际蹦出来的顺序：', b.map(x => JSON.stringify(x)).join(' → '));
  console.log((b.includes('一一一') || b.includes('这你都有') ? '✅' : '❌') + ' 资源派接上了（这两个里随机一句，原设计如此）');
  console.log('   其余人各自说了：' + b.filter(x => x !== '一一一' && x !== '这你都有').length + ' 句');

  // ── 场景 C：普通闲聊不该触发 ──
  console.log('\n== C：普通闲聊「今天好累啊」==');
  reset(); setInput('今天好累啊'); await send(); await new Promise(r => setTimeout(r, 4000));
  const c = spoken();
  console.log('实际蹦出来的顺序：', c.map(x => JSON.stringify(x)).join(' → '));
  console.log((!c.includes('你只是怕了') && !c.includes('这你都有') ? '✅' : '❌') + ' 没被误判成起头');
})();
