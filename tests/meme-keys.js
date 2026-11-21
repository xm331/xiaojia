/* z115 验证：关键词标注是否真的提升贴合度、有没有拼错导致静默失效 */
const fs = require('fs');
const vm = require('vm');
const P = process.argv[2] || 'index.html';

function mkEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), style: {}, dataset: {}, children: [], files: [],
    innerHTML: '', textContent: '', value: '', checked: false, disabled: false, rel: '', href: '',
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
const store = new Map(); const els = new Map();
const getEl = id => { if (!els.has(id)) els.set(id, mkEl()); return els.get(id); };
const members = [{ id: 'a', name: 'Nyx', avatar: 'img:gpt|gpt_bust2.webp', url: 'https://api.siliconflow.cn/v1', key: 'sk-t', model: 'zai-org/GLM-5.3-Flash', persona: 'Nyx', pv: 5, history: [] }];
store.set('ai_key_v1', 'sk-t');
store.set('ai_profile_v1', JSON.stringify({ done: true, name: '小米', step: 99, facts: [] }));
store.set('ai_groupchat_v10', JSON.stringify(members));
const win = {
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {}, clear() {} },
  location: { search: '', pathname: '/', hash: '', href: 'https://x/' },
  history: { replaceState() {} },
  document: { getElementById: getEl, querySelector: () => mkEl(), querySelectorAll: () => [], createElement: t => mkEl(t), addEventListener() {}, removeEventListener() {}, body: mkEl('body'), documentElement: mkEl('html'), head: mkEl('head'), visibilityState: 'visible', hidden: false, title: '', cookie: '' },
  navigator: { userAgent: 'node', language: 'zh-CN', standalone: false, storage: { persist: () => Promise.resolve(true), persisted: () => Promise.resolve(true) }, serviceWorker: { register: () => Promise.resolve({}) }, maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  indexedDB: { open() { throw new Error('no idb'); } },
  requestAnimationFrame: f => setTimeout(f, 0), cancelAnimationFrame() {},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  fetch: () => Promise.resolve({ ok: true, status: 200, body: { getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }) }, json: () => Promise.resolve({}) }),
  alert() {}, confirm() { return false; }, prompt() { return ''; },
  URL, URLSearchParams, TextDecoder, TextEncoder, AbortController, Blob: function () { }, FormData: function () { },
  FileReader: function () { }, Image: function () { },
  console: { log() {}, warn() {}, error() {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
win.window = win; win.self = win; win.globalThis = win; win.parent = win; win.top = win;
win.innerWidth = 390; win.innerHeight = 844; win.devicePixelRatio = 2;
win.scrollTo = () => {}; win.open = () => null;
vm.createContext(win);
const code = [...fs.readFileSync(P, 'utf8').matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
vm.runInContext(code, win, { filename: 't.js' });

const pick = vm.runInContext('pickMemeCandidates', win);
const pickPack = vm.runInContext('pickPackCandidates', win);
const SEED = vm.runInContext('SEED_MEMES', win);
const MK = vm.runInContext('MEME_KEYS', win);
const PACK = vm.runInContext('CUSTOM_PACK', win);
const PK = vm.runInContext('PACK_KEYS', win);
let bad = 0;
const chk = (ok, msg) => { if (!ok) bad++; console.log((ok ? '✅' : '❌') + ' ' + msg); };
const show = arr => arr.length ? JSON.stringify(arr) : '（空）';

console.log('== 标注完整性（写错一个字就会静默失效）==');
const seedSet = new Set(SEED);
const orphan = Object.keys(MK).filter(k => !seedSet.has(k));
chk(orphan.length === 0, '每个关键词的梗都在梗库里' + (orphan.length ? '，对不上：' + orphan.join(' / ') : ''));
const noKey = SEED.filter(m => !MK[m] || !MK[m].length);
chk(noKey.length === 0, '每条梗都标了关键词' + (noKey.length ? '，漏了：' + noKey.join(' / ') : ''));
const tooMany = Object.entries(MK).filter(([k, v]) => v.length > 6);
chk(tooMany.length === 0, '没有一条挂了超过 6 个词（会过拟合）');
const files = new Set(PACK.map(p => p.file));
const orphanPack = Object.keys(PK).filter(k => !files.has(k));
chk(orphanPack.length === 0, '每个表情包关键词都对得上图片' + (orphanPack.length ? '，对不上：' + orphanPack.join(' / ') : ''));
const noKeyPack = PACK.filter(p => !PK[p.file] || !PK[p.file].length);
chk(noKeyPack.length === 0, '16 个表情包都标了关键词' + (noKeyPack.length ? '，漏了：' + noKeyPack.map(p => p.file).join(' / ') : ''));

console.log('\n== 冷门话：宁可不出梗 ==');
console.log('   「好悠哉啊」→ ' + show(pick('好悠哉啊', [], 6)));
chk(pick('好悠哉啊', [], 6).length === 0, '不沾边的话，一条梗都不给');

console.log('\n== 帖题的话：能不能捞到对的梗 ==');
const cases = [
  ['你別装逼了，牛逼什么', ['小妹妹你挺牛逼克拉斯啊', '老子才是老大', '带哥']],
  ['我破防了', ['破防', '他急了']],
  ['你看到梅姨了吗好恐怖', ['姐妹们我看到梅姨啦', '救命啊，梅姨在我的眼前']],
  ['这次真的重开了', ['重开']],
  ['你放我鸽子啊', ['鸽子1']],
  ['今天加班到十点，我服了', ['我服了，爸爸']],
];
for (const [q, want] of cases) {
  const got = pick(q, [], 3);
  const hit = got.some(g => want.includes(g));
  console.log('   「' + q + '」→ ' + show(got));
  chk(hit, '捞到了对口的梗（期望含 ' + want.join(' 或 ') + '）');
}

console.log('\n== 表情包 ==');
const p1 = pickPack('我好饿，想吃肉', 6);
console.log('   「我好饿，想吃肉」→ 前三个：' + JSON.stringify(p1.slice(0, 3).map(x => x.p.name)));
chk(p1.slice(0, 2).some(x => x.p.file === 'routuan.jpg'), '饿/肉 → 看到肉帮排前面');
const p2 = pickPack('好悠哉啊', 6);
chk(p2.length === 6, '冷门话仍然给满 6 个表情包（只是没有对口优先）');
chk(p2.every(x => x.i !== undefined), '表情包索引没丢（{{eN}} 才对得上图）');

console.log(bad === 0 ? '\n全部通过' : '\n有 ' + bad + ' 项没过');
process.exit(bad ? 1 : 0);
