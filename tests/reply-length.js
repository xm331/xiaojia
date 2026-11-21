/* 由本地开发脚本整理而来：node tests/reply-length.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 验证 z107：长句自动拆条 + 被掐断时不留半句 + 提示词限长 */
const fs = require('fs');
const vm = require('vm');
const P = process.argv[2] || __P;
const html = fs.readFileSync(P, 'utf8');

function mkEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), style: {}, dataset: {}, children: [], files: [],
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

const store = new Map();
const els = new Map();
const getEl = id => { if (!els.has(id)) els.set(id, mkEl()); return els.get(id); };
store.set('ai_key_v1', 'sk-test');
store.set('ai_profile_v1', JSON.stringify({ done: true, name: '小米', step: 99, facts: [] }));

let mode = 'short';      // short | long | cut
let sentBody = null;

function sse(text, finish) {
  const parts = [];
  for (const ch of text) parts.push('data: ' + JSON.stringify({ choices: [{ delta: { content: ch } }] }) + '\n\n');
  parts.push('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: finish }] }) + '\n\n');
  parts.push('data: [DONE]\n\n');
  let i = 0;
  return {
    getReader: () => ({
      read: () => new Promise(r => setTimeout(() => {
        if (i >= parts.length) return r({ done: true, value: undefined });
        r({ done: false, value: new TextEncoder().encode(parts[i++]) });
      }, 1)),
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
    try { sentBody = JSON.parse(opt.body); } catch (e) {}
    if (mode === 'long') return Promise.resolve({ ok: true, status: 200, body: sse('我今天去超市买了三包辣条然后回家躺了一会儿。结果我妈回来了。她一眼就看见桌子上的袋子。', 'stop'), json: () => Promise.resolve({}) });
    if (mode === 'cut') return Promise.resolve({ ok: true, status: 200, body: sse('那包辣条我吃了三天都没吃完。然后我妈', 'length'), json: () => Promise.resolve({}) });
    return Promise.resolve({ ok: true, status: 200, body: sse('草', 'stop'), json: () => Promise.resolve({}) });
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
const code = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
vm.runInContext(code, win, { filename: 't.js' });

const splitLong = vm.runInContext('splitLong', win);
const callModel = vm.runInContext('callModel', win);
const member = { id: 'a', name: 'Nyx', url: 'u', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'p', history: [], mem: '', pv: 5 };

(async () => {
  console.log('== A. 长句自动拆条（超过 18 字才拆）==');
  const cases = [
    '草',
    '今天真的好累啊',
    '我今天去超市买了三包辣条然后回家躺了一会儿',
    '哈哈哈。你也是。真的假的？',
    '那包辣条我吃了三天都没吃完然后我妈回来了她一眼就看见桌子上的袋子我当时就愣在那儿不知道说什么好',
  ];
  for (const c of cases) {
    const r = splitLong(c, 18);
    console.log('  ' + (c.length + '字').padEnd(5) + '→ ' + r.length + ' 条：' + r.map(x => '「' + x + '」').join(' '));
  }
  const t2 = splitLong('我今天去超市，买了三包辣条。然后回家躺了一会儿，结果我妈回来了。', 18);
  console.log('  带标点长段 → ' + t2.length + ' 条：' + t2.map(x => '「' + x + '」').join(' '));
  console.log((t2.length >= 2 ? '✅' : '❌') + ' 一长段被按句末标点拆成多条');
  const t3 = splitLong('草。真的假的？我也这么觉得。', 18);
  console.log('  三短句 → ' + t3.map(x => '「' + x + '」').join(' '));
  console.log((t3.length === 1 ? '✅' : '⚠️') + ' 合计很长时才会拆到多条（' + t3.length + ' 条）');
  const t4 = splitLong('草', 18);
  console.log((t4.length === 1 && t4[0] === '草' ? '✅' : '❌') + ' 两三个字绝不会被拆碎');

  console.log('\n== B. 提示词限长 ==');
  mode = 'short';
  await callModel(member, '在干嘛', [], {}, null);
  const sys = sentBody.messages.map(x => typeof x.content === 'string' ? x.content : '').join('\n');
  console.log((sys.indexOf('一条最多12个字') >= 0 ? '✅' : '❌') + ' 闲聊：一条最多 12 字 / 总共 25 字');
  console.log((sentBody.max_tokens === 55 ? '✅' : '❌') + ' 日常上限 = ' + sentBody.max_tokens + '（原 40）');

  console.log('\n== C. 被掐断时不留半句 ==');
  mode = 'cut';
  const cut = await callModel(member, '在干嘛', [], {}, null);
  console.log('模型吐的：「那包辣条我吃了三天都没吃完。然后我妈」（finish_reason=length）');
  console.log('最终给出：「' + cut + '」');
  console.log((cut.indexOf('然后我妈') < 0 && cut.indexOf('三天都没吃完') >= 0 ? '✅ 半句被丢掉，只留完整那句' : '❌ 半句还在'));

  console.log('\n== D. 正常结束不误伤 ==');
  mode = 'stop';
  const ok = await callModel(member, '在干嘛', [], {}, null);
  console.log('正常回复（stop）：「' + ok + '」' + (ok === '草' ? ' ✅ 没被动过' : ' ❌ 被改了'));
})();
