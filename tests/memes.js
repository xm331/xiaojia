/* 由本地开发脚本整理而来：node tests/memes.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 验证 z105 新梗：{U} 是否替换成用户称呼、梗是否进了梗库并被抽到 */
const fs = require('fs');
const vm = require('vm');
const P = __P;
const html = fs.readFileSync(P, 'utf8');

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

const win = {
  console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, JSON, Math, Date, Map, Set,
  TextDecoder, TextEncoder, AbortController, Request, Response, Headers, Blob, URL, URLSearchParams,
  navigator: { userAgent: 'node', serviceWorker: { register: () => Promise.resolve() }, clipboard: {} },
  location: { search: '', hash: '', href: 'https://x/', origin: 'https://x' },
  localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i], get length() { return store.size; } },
  document: {
    getElementById: getEl, querySelector: () => mkEl(), querySelectorAll: () => [],
    createElement: t => mkEl(t), addEventListener() {}, removeEventListener() {},
    body: mkEl(), head: mkEl(), documentElement: mkEl(), visibilityState: 'visible', hidden: false,
  },
  indexedDB: null, matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {}, removeEventListener() {}, alert() {}, confirm: () => true, prompt: () => '',
  fetch: async (url, opt) => {
    let name = '?';
    try {
      const b = JSON.parse(opt.body);
      const all = b.messages.map(x => typeof x.content === 'string' ? x.content : '').join('\n');
      name = (all.match(/你是'?(Nyx|Vesta|Demeter)/) || [])[1] || '?';
      calls.push({ name, body: b });
    } catch (e) {}
    const chunks = [Buffer.from('data: {"choices":[{"delta":{"content":"好"}}]}\n'), Buffer.from('data: [DONE]\n')];
    let i = 0;
    return { ok: true, status: 200, body: { getReader: () => ({ read: async () => i < chunks.length ? { done: false, value: chunks[i++] } : { done: true } }) } };
  },
};
vm.createContext(win);
const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
try { vm.runInContext(script, win); } catch (e) { console.log('❌ 脚本执行失败:', e.message); process.exit(1); }

(async () => {
  const seeds = vm.runInContext('SEED_MEMES', win);
  console.log('梗库种子条数:', seeds.length);
  const idx = seeds.findIndex(x => x.indexOf('开播了') >= 0);
  console.log('开播梗在梗库第', idx + 1, '条:', JSON.stringify(seeds[idx]));
  console.log('降维打击梗:', seeds.filter(x => x.indexOf('降维') >= 0).map(x => JSON.stringify(x)).join(' / ') || '❌ 没有');

  // 直接把带 {U} 的梗塞进 ctx，看 callModel 有没有替换
  const callModel = vm.runInContext('callModel', win);
  await callModel(members[0], '你在干嘛', [], { memes: ['{U}开播了？真的假的', '都是同龄人，我原本没想降维打击'] }, null);
  const sys = calls[0].body.messages.map(x => typeof x.content === 'string' ? x.content : '').join('\n');
  const hit = sys.match(/[^\n]{0,12}开播了？真的假的[^\n]{0,4}/);
  console.log('\n--- 提示词里实际写进去的样子 ---');
  console.log(hit ? '「' + hit[0] + '」' : '❌ 没找到');
  console.log((sys.indexOf('小米开播了') >= 0 ? '✅ ' : '❌ ') + '{U} 已替换成用户称呼「小米」');
  console.log((sys.indexOf('{U}') < 0 ? '✅ ' : '❌ ') + '提示词里没有残留的 {U}');

  // 再跑一次：模拟"没填名字"的边界
  store.set('ai_profile_v1', JSON.stringify({ done: true, name: '', step: 99, facts: [] }));
  vm.runInContext('profile=JSON.parse(localStorage.getItem("ai_profile_v1"))', win);
  await callModel(members[0], '你在干嘛', [], { memes: ['{U}开播了？真的假的'] }, null);
  const sys2 = calls[1].body.messages.map(x => typeof x.content === 'string' ? x.content : '').join('\n');
  console.log((sys2.indexOf('{U}') < 0 ? '✅ ' : '❌ ') + '名字为空时也不漏 {U}（兜底成「' +
    (sys2.match(/([^\n]{0,6})开播了？真的假的/) || ['', '?'])[1] + '」）');
})();
