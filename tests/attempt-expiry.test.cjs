const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/attempt-expiry.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = { exports: {} };
new Function('exports', 'module', compiled.outputText)(loaded.exports, loaded);
const { expiredAttemptReason } = loaded.exports;
const start = Date.parse('2026-10-30T10:00:00Z');
const attempt = (changes = {}) => ({ started_at: new Date(start).toISOString(), exam: {
  duration_minutes: 60, end_time: null, timer_mode: 'continuous', exam_mode: 'standard', ...changes,
} });
test('continuous exam auto-submits after deadline with brief allowance for final save', () => {
  assert.equal(expiredAttemptReason(attempt(), start + 3600000), null);
  assert.equal(expiredAttemptReason(attempt(), start + 3615000), 'duration_expired');
});
test('old closed-browser attempts are still eligible', () => {
  assert.equal(expiredAttemptReason(attempt(), start + 24 * 3600000), 'duration_expired');
});
test('exam end window expires even when a practical exam is paused', () => {
  assert.equal(expiredAttemptReason(attempt({ timer_mode: 'pausable', exam_mode: 'practical', end_time: new Date(start + 60000).toISOString() }), start + 75000, 0), 'exam_window_expired');
});
test('practical pauses do not consume duration', () => {
  const paused = attempt({ timer_mode: 'pausable', exam_mode: 'practical' });
  assert.equal(expiredAttemptReason(paused, start + 7200000, 600), null);
  assert.equal(expiredAttemptReason(paused, start + 7200000, 3600), 'duration_expired');
});
test('invalid start times never prematurely submit a student', () => {
  assert.equal(expiredAttemptReason({ ...attempt(), started_at: 'invalid' }, start + 7200000), null);
});
test('server sweep grades expired attempts with saved responses and leaves active students alone', async () => {
  const graded = [];
  const filters = [];
  const expired = { id: 'old', started_at: new Date(start).toISOString(), exams: attempt().exam };
  const fresh = { id: 'fresh', started_at: new Date().toISOString(), exams: attempt().exam };
  const builder = {
    select: () => builder, order: () => builder, limit: () => builder,
    eq: (...args) => { filters.push(args); return builder; },
    then: (resolve) => resolve({ data: [expired, fresh], error: null }),
  };
  const source = ts.transpileModule(fs.readFileSync('lib/auto-submit-attempts.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const module = { exports: {} };
  const imports = {
    'server-only': {},
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => builder }) },
    '@/lib/grade-attempt': { gradeAndSubmit: async (...args) => graded.push(args) },
    '@/lib/attempt-expiry': { expiredAttemptReason },
  };
  new Function('require', 'exports', 'module', source.outputText)((name) => imports[name], module.exports, module);
  await module.exports.autoSubmitExpiredAttempts();
  assert.deepEqual(filters, [['status', 'in_progress']]);
  assert.deepEqual(graded, [['old', 'duration_expired']]);
});
