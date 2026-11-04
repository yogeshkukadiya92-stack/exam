const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('app/admin/exams/actions.ts', 'utf8');
const compiled = ts.transpileModule(source + '\nexports.writeExam = writeExam;', {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const mod = { exports: {} };
new Function('require', 'exports', 'module', compiled.outputText)(() => ({}), mod.exports, mod);
const { writeExam } = mod.exports;
const missing = (field) => ({ code: 'PGRST204', message: `Could not find the '${field}' column of 'exams' in the schema cache` });
test('legacy single-batch write preserves practical settings and all edits', async () => {
  const writes = [];
  await writeExam({ batch_ids: ['b'], batch_id: 'b', exam_mode: 'practical', title: 'Edited' }, async (payload) => {
    writes.push({ ...payload });
    return { error: payload.batch_ids ? missing('batch_ids') : null };
  });
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[1], { batch_id: 'b', exam_mode: 'practical', title: 'Edited' });
});
test('legacy multi-batch assignment fails without silently dropping batches', async () => {
  let calls = 0;
  await assert.rejects(writeExam({ batch_ids: ['a', 'b'] }, async () => {
    calls++; return { error: missing('batch_ids') };
  }), /Multiple batches require the database update/);
  assert.equal(calls, 1);
});
test('multiple missing optional fields are handled independently', async () => {
  let calls = 0;
  const result = await writeExam({ batch_ids: ['b'], exam_mode: 'standard', title: 'Edited' }, async (payload) => {
    calls++;
    const field = ['batch_ids', 'exam_mode'].find((key) => key in payload);
    return { error: field ? missing(field) : null };
  });
  assert.equal(result.error, null);
  assert.equal(calls, 3);
});
test('permission and unrelated schema errors are never retried', async () => {
  for (const error of [{ code: '42501', message: 'permission denied' }, missing('title')]) {
    let calls = 0;
    const result = await writeExam({ batch_ids: ['b'] }, async () => { calls++; return { error }; });
    assert.equal(result.error, error);
    assert.equal(calls, 1);
  }
});
