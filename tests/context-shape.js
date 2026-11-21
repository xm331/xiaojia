/* 由本地开发脚本整理而来：node tests/context-shape.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 验证 z108/z109：表情包按需给、缓存前缀、群聊流水、记忆按条截、历史折叠、诊断 */
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
const store = new Map(), els = new Map(), calls = [];
const getEl = id => { if (!els.has(id)) els.set(id, mkEl()); return els.get(id); };

const members = [
  { id: 'a', name: 'Nyx', url: 'u', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Nyx', history: [], mem: '', pv: 5 },
  { id: 'b', name: 'Vesta', url: 'u', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Vesta', history: [], mem: '', pv: 5 },
  { id: 'c', name: 'Demeter', url: 'u', key: 'sk-test', model: 'zai-org/GLM-5.3-Flash', persona: 'Demeter', history: [], mem: '', pv: 5 },
];
store.set('ai_key_v1', 'sk-test');
store.set('ai_profile_v1', JSON.stringify({ done: true, name: '小米', step: 99, facts: [] }));
// 长记忆：20 条，末条是半句（测按条截断不切断）
store.set('ai_shared_mem_v1', Array.from({ length: 20 }, (_, i) => '· 第' + (i + 1) + '条记忆，内容略长一点点，用来把总字数顶到上限之外').join('\n') + '\n· 他喜欢喝冰美式，不加糖也不加奶，只喝冰的');
store.set('ai_long_mem_v1', '· 他17岁，河南人，现在住成都\n· 喜欢男生');
// 历史塞满 12 条（超过 10 要折叠）
members.forEach(m => {
  for (let i = 0; i < 6; i++) {
    m.history.push({ role: 'user', content: '第' + i + '轮他说的话' });
    m.history.push({ role: 'assistant', content: '第' + i + '轮我回的话' });
  }
});
store.set('ai_groupchat_v10', JSON.stringify(members));
getEl('inputBox').value = '我今天东西被抢光了';

function stream(txt) {
  const parts = ['data: ' + JSON.stringify({ choices: [{ delta: { content: txt } }] }) + '\n\n',
                 'data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + '\n\n',
                 'data: [DONE]\n\n'];
  let i = 0;
  return { getReader: () => ({ read: () => new Promise(r => setTimeout(() => i >= parts.length ? r({ done: true }) : r({ done: false, value: new TextEncoder().encode(parts[i++]) }), 1)) }) };
}

const win = {
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
  location: { search: '', pathname: '/', hash: '', href: 'https://x/' }, history: { replaceState() {} },
  document: { getElementById: getEl, querySelector: q => (q === '.gname' ? getEl('gname') : mkEl()), querySelectorAll: () => [], createElement: t => mkEl(t), addEventListener() {}, removeEventListener() {}, body: mkEl('body'), documentElement: mkEl('html'), visibilityState: 'visible', hidden: false, title: '', cookie: '' },
  navigator: { userAgent: 'node', language: 'zh-CN', standalone: false, storage: { persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true) }, serviceWorker: { register: () => Promise.resolve({}) }, maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  indexedDB: { open() { throw new Error('no idb'); } },
  requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame() {},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  fetch: (url, opt) => {
    let b = null;
    try { b = JSON.parse(opt.body); calls.push(b); } catch (e) {}
    return Promise.resolve({ ok: true, status: 200, body: stream('草'), json: () => Promise.resolve({}) });
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
win.innerWidth = 390; win.innerHeight = 844; win.devicePixelRatio = 2; win.scrollTo = () => {}; win.open = () => null;
vm.createContext(win);
vm.runInContext([...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'), win, { filename: 't.js' });

const send = vm.runInContext('send', win);
const sys = b => b.messages.filter(m => m.role === 'system').map(m => typeof m.content === 'string' ? m.content : '').join('\n---\n');

(async () => {
  console.log('== ① 表情包按需给（强制 pack 模式）==');
  vm.runInContext('pickEmojiMode=()=>"pack"', win);
  await send(); await new Promise(r => setTimeout(r, 1200));
  const packSys = sys(calls[0]);
  const packBlock = (packSys.match(/【表情规则】[\s\S]*?(?=\n---|$)/) || [''])[0];
  const cnt = (packBlock.match(/\{\{e\d+\}\}=/g) || []).length;
  console.log('  这一轮给出的表情包：' + cnt + ' 个（原来是 16 个全给）');
  console.log((cnt > 0 && cnt <= 6 ? '✅' : '❌') + ' 只给 6 个以内');

  console.log('\n== ② 会变的块都在最后（缓存前缀）==');
  const order = calls[0].messages.filter(m => m.role === 'system').map(m => {
    const t = typeof m.content === 'string' ? m.content : '';
    if (t.indexOf('【表情规则】') === 0) return '表情规则';
    if (t.indexOf('【三人共用') === 0) return '共享记忆';
    if (t.indexOf('【关于') === 0) return '长期事实';
    if (t.indexOf('【本轮人设') === 0) return '人设牌';
    if (t.indexOf('【别重复') === 0) return '别重复';
    if (t.indexOf('【群里刚说') === 0) return '群流水';
    if (t.indexOf('【之前聊过') === 0) return '折叠摘要';
    if (t.indexOf('【这一轮') === 0) return '场景规则';
    if (t.indexOf('【总规矩') === 0) return '总规矩';
    return '其他';
  });
  console.log('  实际顺序：' + order.join(' → '));
  const iMem = order.indexOf('共享记忆');
  const iEmo = order.indexOf('表情规则');
  console.log((iMem >= 0 && iEmo > iMem ? '✅' : '❌') + ' 记忆在表情规则前面（记忆那段能稳定命中缓存）');

  console.log('\n== ③ 群聊流水 ==');
  await new Promise(r => setTimeout(r, 2000));
  calls.length = 0;
  getEl('inputBox').value = '那你说咋办';
  await send(); await new Promise(r => setTimeout(r, 1200));
  const flow = vm.runInContext('groupFlow', win);
  console.log('  群流水条数：' + flow.length + '（内容：' + flow.map(x => x.n + ':' + x.t).join(' | ') + '）');
  const sys2 = sys(calls[0]);
  const hasFlow = sys2.indexOf('【群里刚说的话') >= 0;
  console.log((hasFlow ? '✅' : '❌') + ' 第二轮的提示词里带上了"群里刚说的话"');
  const bump = calls[0].messages.filter(m => m.role === 'user' && typeof m.content === 'string' && /^(Nyx|Vesta|Demeter)：/.test(m.content));
  console.log((bump.length === 0 ? '✅' : '❌') + ' 历史里不再有"用户：某某: 话"这种假用户发言（' + bump.length + ' 条）');

  console.log('\n== ④ 记忆按条截断 ==');
  const clipMem = vm.runInContext('clipMem', win);
  const mem = vm.runInContext('sharedMem', win);
  const clipped = clipMem(mem, 400);
  console.log('  原始 ' + mem.length + ' 字 → 截到 ' + clipped.length + ' 字');
  const lines = clipped.split('\n');
  console.log('  最后一条：「' + lines[lines.length - 1].slice(0, 30) + '」');
  console.log((clipped.length <= 460 && !clipped.endsWith('，不加') ? '✅' : '❌') + ' 按整条切，没有半句（不会出现"不加"这种断尾）');

  console.log('\n== ⑤ 历史折叠（z116：群聊三人共用一份）==');
  const gist = vm.runInContext('sharedGist||""', win);
  console.log('  折叠出来的共享摘要：「' + gist.slice(0, 40) + '…」（' + gist.length + ' 字）');
  console.log((gist.length > 0 ? '✅' : '❌') + ' 丢掉的话被折进共享摘要，没直接消失');
  console.log((vm.runInContext('members.every(m=>!m.gist)', win) ? '✅' : '❌') + ' 三个人各自的 gist 已经不再写');

  console.log('\n== ⑥ 诊断面板 ==');
  vm.runInContext('diagPush("测试","故意报一个错看能不能收进来")', win);
  const dl = vm.runInContext('diagLog', win);
  console.log((dl.length > 0 ? '✅' : '❌') + ' 诊断日志收到 ' + dl.length + ' 条');
  let ok = true;
  try { vm.runInContext('showDiag()', win); } catch (e) { ok = false; console.log('  ❌ showDiag 抛错：' + e.message); }
  if (ok) console.log('✅ showDiag() 能正常展开（长按群名 3 秒触发）');
})();
