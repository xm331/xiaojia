/* 由本地开发脚本整理而来：node tests/rate-limit.js 直接跑，路径自动指向 ../index.html */
const __P = require('path').join(__dirname, '..', 'index.html');
/* 只验 429 分类判定：短时限流 vs 当天配额耗尽 */
const fs = require('fs');
const html = fs.readFileSync(__P, 'utf8').replace(/\r\n/g, '\n');
const m = html.match(/const quotaGone=resp\.status===429([\s\S]*?);\n/);
if (!m) { console.log('❌ 没抓到判定代码'); process.exit(1); }

const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '');
// 把两段正则抠出来
const res = [...body.matchAll(/\/.*?\/([i]*)/g)].map(x => x[0]);
console.log('抓到', res.length, '个正则');
const [pos, neg] = res.map(r => eval(r));

function judge(status, detail) {
  return status === 429 && pos.test(detail) && !neg.test(detail);
}

const cases = [
  ['硅基真实配额文案', 429, '您的使用量已超出频率限制，将在 2026-11-22 08:49:24 UTC+8 重置', true],
  ['短时 rate limit', 429, 'Rate limit reached for requests', false],
  ['上游负载饱和', 429, '当前分组上游负载已饱和，请稍后再试', false],
  ['并发超限', 429, 'Concurrency limit exceeded, please retry later', false],
  ['额度已用尽', 429, '当前账号额度已用尽', true],
  ['余额不足', 429, 'insufficient balance / 余额不足', true],
  ['500 服务端错', 500, 'internal error', false],
  ['容错：429 无 detail', 429, '', false],
];

let pass = 0;
for (const [name, st, detail, expect] of cases) {
  const got = judge(st, detail);
  const ok = got === expect;
  if (ok) pass++;
  console.log((ok ? '✅' : '❌') + ' ' + name.padEnd(20) + ' 判为配额耗尽=' + got + '（应 ' + expect + '）'
    + (ok ? '' : '  ← 要重试的却直接报 / 该报的却重试三次'));
}
console.log('\n' + (pass === cases.length ? '✅ 全部正确（' + pass + '/' + cases.length + '）' : '❌ ' + pass + '/' + cases.length));
