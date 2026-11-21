/* 由本地开发脚本整理而来：node tests/stream-queue.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
const fs = require('fs');
const vm = require('vm');
const P = __P;
const s = fs.readFileSync(P, 'utf8');
const src = s.slice(s.indexOf('/* ===== z94：全局播放队列'), s.indexOf('function renderMdLite')).trim();

function makeEnv() {
  const played = [];
  const sandbox = {
    Date, Promise, Math, console,
    setTimeout: (fn, ms) => fn(),
    renderMdLite: (t) => t,
    scrollBottom: () => {},
    aiMsgShell: (m) => { const b = { html: '', name: m.name }; played.push(b); return { el: { classList: { add() {}, remove() {} } }, bubble: b }; },
  };
  vm.createContext(sandbox);
  vm.runInContext(src + '\nglobalThis.__g={groupReset,groupPump,groupDrain,groupPlayer,makeStreamView};', sandbox);
  const mkView = (name) => {
    const lazy = { ensure() { const b = { innerHTML: '', name }; played.push(b); return { el: { classList: { add() {}, remove() {} } }, bubble: b }; } };
    return sandbox.__g.makeStreamView({ name }, lazy, name);
  };
  return { sandbox, played, mkView };
}
const seqOf = (played) => played.map(b => b.innerHTML).join('→');
const ok = (b) => b ? '✅' : '❌';

(async () => {
  // ── A：先到先得（Nyx 先完成，两句连播；后来的人排后面）──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta', 'Demeter']);
    const n = mkView('Nyx'), v = mkView('Vesta'), d = mkView('Demeter');
    n.push('N1\nN2'); v.push('V1'); d.push('D1');
    await Promise.all([n.finish('N1\nN2'), v.finish('V1'), d.finish('D1')]);
    console.log('A 先到先得:', seqOf(played), '|', ok(seqOf(played) === 'N1→N2→V1→D1') + ' 按入队顺序，无轮转');
  }
  // ── B：完全按到达顺序（Nyx 的第二句排在 Demeter 之后，证明不按人轮转）──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta', 'Demeter']);
    const n = mkView('Nyx'), v = mkView('Vesta'), d = mkView('Demeter');
    n.push('N1\n'); v.push('V1\n'); d.push('D1\n'); n.push('N2\n');
    await Promise.all([n.finish('N1\nN2'), v.finish('V1'), d.finish('D1')]);
    console.log('B 纯到达序:', seqOf(played), '|', ok(seqOf(played) === 'N1→V1→D1→N2') + ' 先到先说，不按人轮');
  }
  // ── C：有人取消（catch 里 _done=true）不卡住别人 ──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta', 'Demeter']);
    const n = mkView('Nyx'), v = mkView('Vesta'), d = mkView('Demeter');
    const p1 = (async () => { n.push('N1'); return n.finish('N1'); })();
    const p3 = (async () => { d.push('D1'); return d.finish('D1'); })();
    v._done = true; sandbox.__g.groupPump();
    await Promise.all([p1, p3]);
    console.log('C 取消:', seqOf(played), '|', ok(played.length === 2) + ' 无死锁');
  }
  // ── D：单人三条 ──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Vesta']);
    const v = mkView('Vesta');
    v.push('V1\nV2\nV3');
    await v.finish('V1\nV2\nV3');
    console.log('D 单人:', seqOf(played), '|', ok(played.length === 3));
  }
  // ── E：同轮撞句丢弃 ──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta', 'Demeter']);
    const n = mkView('Nyx'), v = mkView('Vesta'), d = mkView('Demeter');
    n.push('你去死吧'); v.push('你去死吧！'); d.push('草，你干嘛');
    await Promise.all([n.finish('你去死吧'), v.finish('你去死吧！'), d.finish('草，你干嘛')]);
    console.log('E 查重:', seqOf(played), '|', ok(played.length === 2) + ' 撞句被丢');
  }
  // ── E2：应声虫豁免（复读牌允许重复）──
  {
    const { sandbox, played } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta']);
    const mk = (name, allow) => {
      const lazy = { ensure() { const b = { innerHTML: '', name }; played.push(b); return { el: { classList: { add() {}, remove() {} } }, bubble: b }; } };
      return sandbox.__g.makeStreamView({ name }, lazy, name, allow);
    };
    const n = mk('Nyx', false), v = mk('Vesta', true);
    n.push('你去死吧'); v.push('你去死吧！');
    await Promise.all([n.finish('你去死吧'), v.finish('你去死吧！')]);
    console.log('E2 豁免:', seqOf(played), '|', ok(played.length === 2) + ' 复读牌不被丢');
  }
  // ── F：死锁复现——某人 finish 但一句没入队，其他人正挂着等 ──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta']);
    const n = mkView('Nyx'), v = mkView('Vesta');
    let done = false;
    const p1 = (async () => { n.push('N1'); await n.finish('N1'); done = true; })();
    await new Promise(r => setTimeout(r, 0));
    await v.finish('');          // Vesta 空回复：必须唤醒等着的人
    await Promise.race([p1, new Promise((_, rej) => setTimeout(() => rej(new Error('卡死')), 500))])
      .then(() => console.log('F 空回复:', ok(done) + ' 未卡死'))
      .catch(e => console.log('F 空回复: ❌', e.message));
  }
  // ── G：插队门闩——有人 view 还没建（在等门闩），起头的人不能被卡死 ──
  {
    const { sandbox, played, mkView } = makeEnv();
    sandbox.__g.groupReset(['Nyx', 'Vesta']);
    const n = mkView('Nyx');     // Vesta 的 view 故意不建（模拟 await leadGate 期间）
    let done = false;
    n.push('N1');
    await Promise.race([
      n.finish('N1').then(() => { done = true; }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('卡死')), 500)),
    ]).then(() => console.log('G 门闩:', ok(done) + ' 起头的人没被未进场的角色卡住'))
      .catch(e => console.log('G 门闩: ❌', e.message));
  }
})();
