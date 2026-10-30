const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const source = fs.readFileSync('lib/async/with-timeout.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function('exports', 'module', compiled.outputText)(loaded.exports, loaded);
const { withTimeout } = loaded.exports;

test('a stalled submission returns control so the student can retry', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 10), /timed out/);
});
test('successful submission results are preserved', async () => {
  assert.deepEqual(await withTimeout(Promise.resolve({ error: null }), 100), { error: null });
});
test('submission errors reach the recovery handler', async () => {
  await assert.rejects(withTimeout(Promise.reject(new Error('offline')), 100), /offline/);
});
