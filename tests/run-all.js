/* 一键跑全部测试：node tests/run-all.js */
const path = require('path');
const { execFileSync } = require('child_process');

const files = [
  'smoke.js',
  'stream-queue.js',
  'key-store.js',
  'lead-chain.js',
  'reply-length.js',
  'memes.js',
  'rate-limit.js',
  'context-shape.js',
];

let bad = 0;
console.log('跑 ' + files.length + ' 组测试（不需要浏览器，全部是假 DOM + 假接口）\n');
for (const f of files) {
  const t0 = Date.now();
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, f)], {
      encoding: 'utf8',
      timeout: 120000,
    });
    const errs = (out.match(/❌/g) || []).length;
    const ms = Date.now() - t0;
    if (errs) {
      bad++;
      console.log('  ⚠️  ' + f.padEnd(20) + errs + ' 处 ❌  (' + ms + 'ms)');
      out.split('\n').filter(l => l.indexOf('❌') >= 0).forEach(l => console.log('        ' + l.trim()));
    } else {
      console.log('  ✅  ' + f.padEnd(20) + ms + 'ms');
    }
  } catch (e) {
    bad++;
    console.log('  ❌  ' + f.padEnd(20) + '跑挂了：' + String(e.message).slice(0, 120));
  }
}
console.log('\n' + (bad ? '❌ ' + bad + ' 组有问题' : '✅ 全部通过'));
process.exit(bad ? 1 : 0);
