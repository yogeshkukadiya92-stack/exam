const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = ts.transpileModule(fs.readFileSync('lib/answer-drafts.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const loaded = { exports: {} };
new Function('exports', 'module', compiled.outputText)(loaded.exports, loaded);
const { AnswerDraftStore } = loaded.exports;
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
const draft = (options = ['option-1']) => ({ question_id: 'q1', selected_option_ids: options, text_answer: null, marked_for_review: false });
test('unsaved selections survive reload and remain isolated to their attempt', () => {
  const disk = storage();
  new AnswerDraftStore(disk, 'attempt-1').put(draft());
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), [draft()]);
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-2').entries(), []);
});
test('acknowledged drafts are removed so newer server answers are not overwritten', () => {
  const disk = storage();
  const store = new AnswerDraftStore(disk, 'attempt-1');
  const answer = draft();
  store.put(answer);
  store.acknowledge(answer);
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), []);
});
test('slow acknowledgement cannot delete a newer selection or cleared answer', () => {
  const disk = storage();
  const store = new AnswerDraftStore(disk, 'attempt-1');
  const old = draft();
  const cleared = draft([]);
  store.put(old);
  store.put(cleared);
  store.acknowledge(old);
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), [cleared]);
});
test('text answers and review flags survive reload together', () => {
  const disk = storage();
  const answer = { ...draft([]), text_answer: 'Student response', marked_for_review: true };
  new AnswerDraftStore(disk, 'attempt-1').put(answer);
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), [answer]);
});
test('invalid backups do not replace saved server answers', () => {
  const disk = storage();
  disk.setItem('exam-answer-drafts:attempt-1', '{broken');
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), []);
  disk.setItem('exam-answer-drafts:attempt-1', JSON.stringify({ q1: { question_id: 'q1' } }));
  assert.deepEqual(new AnswerDraftStore(disk, 'attempt-1').entries(), []);
});
