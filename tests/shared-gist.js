/* z116 验证：群聊摘要合成一份、私聊不串台、老存档能迁移 */
const fs = require('fs');
const vm = require('vm');
const P = process.argv[2] || 'index.html';
const html = fs.readFileSync(P, 'utf8');

function mkEl(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(), style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } }, dataset: {}, children: [], files: [],
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
function mkMember(n) { return { id: n, name: n, avatar: 'img:gpt|gpt_bust2.webp', url: 'https://api.siliconflow.cn/v1', key: 'sk-t', model: 'zai-org/GLM-5.3-Flash', persona: n, pv: 8, history: [] }; }
const members = [mkMember('Nyx'), mkMember('Vesta'), mkMember('Demeter')];
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
vm.runInContext([...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'), win, { filename: 't.js' });

let bad = 0;
const chk = (ok, msg) => { if (!ok) bad++; console.log((ok ? '✅' : '❌') + ' ' + msg); };
const run = code => vm.runInContext(code, win);

console.log('== 群聊：三人共一份 ==');
run(`
  sharedGist=""; saveGist();
  members.forEach(m=>{m.gist=undefined;m.history=[];
    for(let i=0;i<13;i++)m.history.push({role:i%2?"assistant":"user",content:"测试第"+i+"句"});
  });
  members.forEach(m=>trimHist(m));
`);
const g = run('sharedGist');
console.log('   共享摘要：' + JSON.stringify(g));
chk(g.length > 0, '群聊 trim 后生成了共享摘要');
chk(run('members.every(m=>!m.gist)'), '三个人自己的那份已经不再写（m.gist 全空）');
chk(run('!!localStorage.getItem("ai_shared_gist_v1")'), '共享摘要已落盘（刷新不丢）');
const dupCount = g.split('；').length - new Set(g.split('；')).size;
chk(dupCount === 0, '三个人重复的那几条已经去重（重复项 ' + dupCount + '）');

console.log('\n== 私聊：不串进群聊 ==');
const before = run('sharedGist');
run(`
  privateWith=members[0];
  privateWith.history=[];
  for(let i=0;i<13;i++)privateWith.history.push({role:i%2?"assistant":"user",content:"私聊第"+i+"句"});
  trimHist(privateWith);
`);
chk(run('sharedGist') === before, '私聊没污染共享摘要');
chk(!!run('members[0].gist'), '私聊摘要写进了自己那条线（m.gist）');
chk(run('members[0].gist').indexOf('私聊') >= 0, '私聊摘要内容是私聊的');
run('privateWith=null');

console.log('\n== 老存档迁移 ==');
run(`
  sharedGist=""; members.forEach(m=>{m.gist="";});
  localStorage.removeItem("ai_shared_gist_v1");
  localStorage.removeItem("ai_shared_gist_v1_mig");
  members[0].gist="在成都上班；养了只狗";
  members[1].gist="在成都上班；喜欢打游戏";
  members[2].gist="喜欢打游戏；最近在学剪辑";
  loadGist();
`);
const mig = run('sharedGist');
console.log('   合并结果：' + JSON.stringify(mig));
chk(mig.split('；').length === 4, '三份合并去重后是 4 条（在成都/狗/打游戏/剪辑）');
chk(run('members.every(m=>!m.gist)'), '迁移后各人那份已清空');
chk(run('localStorage.getItem("ai_shared_gist_v1_mig")') === '1', '迁移只做一次（打标记）');

console.log('\n== 提示词接线 ==');
chk(/const gistShow=isPrivate\?m\.gist:sharedGist;/.test(html), '群聊读共享、私聊读自己那条线');
chk(/【之前聊过、别装不记得】"\+gistShow/.test(html), '仍然挂在同一句提示词上');

console.log(bad === 0 ? '\n全部通过' : '\n有 ' + bad + ' 项没过');
process.exit(bad ? 1 : 0);
