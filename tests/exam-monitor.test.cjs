const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
function load(path, imports = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const loaded = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)((name) => {
    if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
    return imports[name];
  }, loaded.exports, loaded);
  return loaded.exports;
}
const { examProgress } = load('lib/exam-progress.ts');
const answer = (id, options = [], text = null, review = false) => ({
  question_id: id, selected_option_ids: options, text_answer: text, marked_for_review: review,
});
test('review flags overlap answers without reducing unanswered count', () => {
  assert.deepEqual(examProgress(['a', 'b', 'c', 'd'], [answer('a', ['yes'], null, true), answer('b', [], null, true), answer('c', [], '  ')]),
    { answered: 1, review: 2, skipped: 3, total: 4 });
});
test('counts text responses and ignores answers outside this exam', () => {
  assert.deepEqual(examProgress(['a', 'b'], [answer('a', [], '0'), answer('other', ['yes'], null, true)]),
    { answered: 1, review: 0, skipped: 1, total: 2 });
});
test('latest cleared response counts as unanswered', () => {
  assert.deepEqual(examProgress(['a'], [answer('a', ['yes']), answer('a')]),
    { answered: 0, review: 0, skipped: 1, total: 1 });
});
test('empty exam has no negative skipped counts', () => {
  assert.deepEqual(examProgress([], [answer('other', ['yes'])]), { answered: 0, review: 0, skipped: 0, total: 0 });
});
function actionHarness({ admin = true, row = { id: 'attempt', status: 'in_progress' }, dbError = null, gradingError = null } = {}) {
  const calls = [];
  const query = { select: () => query, eq: (field, value) => { calls.push([field, value]); return query; }, maybeSingle: async () => ({ data: row, error: dbError }) };
  const { adminSubmitAttempt } = load('app/admin/exams/[examId]/monitor/actions.ts', {
    '@/lib/auth': { requireAdmin: async () => { calls.push('auth'); if (!admin) throw new Error('Unauthorized'); } },
    '@/lib/supabase/server': { createClient: async () => { calls.push('client'); return { from: () => query }; } },
    '@/lib/grade-attempt': { gradeAndSubmit: async (...args) => { calls.push(['grade', ...args]); if (gradingError) throw gradingError; } },
    'next/cache': { revalidatePath: (path) => calls.push(['revalidate', path]) },
  });
  return { submit: () => adminSubmitAttempt('exam', 'attempt'), calls };
}
test('unauthorised callers cannot reach privileged grading', async () => {
  const { submit, calls } = actionHarness({ admin: false });
  await assert.rejects(submit(), /Unauthorized/);
  assert.deepEqual(calls, ['auth']);
});
test('missing, inaccessible, or already submitted attempts are never graded', async () => {
  for (const options of [{ row: null }, { dbError: { message: 'denied' } }, { row: { status: 'graded' } }]) {
    const { submit, calls } = actionHarness(options);
    assert.ok((await submit()).error);
    assert.ok(!calls.some((call) => Array.isArray(call) && call[0] === 'grade'));
  }
});
test('admin submission verifies exam membership and records the admin reason', async () => {
  const { submit, calls } = actionHarness();
  assert.deepEqual(await submit(), { error: null });
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'exam_id' && call[1] === 'exam'));
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === 'id' && call[1] === 'attempt'));
  assert.ok(calls.some((call) => Array.isArray(call) && call.join(',') === 'grade,attempt,admin_submitted'));
});

test('monitor loads beyond the first 1000 answers and filters the selected attempt', async () => {
  const filters = [];
  const pages = [];
  const from = () => {
    let start = 0;
    const builder = {
      select: () => builder, order: () => builder,
      eq: (key, value) => { filters.push([key, value]); return builder; },
      range: (first, last) => { start = first; pages.push([first, last]); return builder; },
      then: (resolve) => resolve({ data: start === 0 ? Array.from({ length: 1000 }, (_, i) => ({ ...answer(`q${i}`), attempt_id: 'attempt' })) : [{ ...answer('last', ['option']), attempt_id: 'attempt' }], error: null }),
    };
    return builder;
  };
  const { readMonitorAnswers } = load('app/admin/exams/[examId]/monitor/data.ts', {
    'server-only': {}, '@/lib/supabase/server': { createClient: async () => ({ from }) },
  });
  const rows = await readMonitorAnswers('exam', 'attempt');
  assert.equal(rows.length, 1001);
  assert.deepEqual(pages, [[0, 999], [1000, 1999]]);
  assert.ok(filters.some(([key, value]) => key === 'attempts.exam_id' && value === 'exam'));
  assert.ok(filters.some(([key, value]) => key === 'attempt_id' && value === 'attempt'));
});
