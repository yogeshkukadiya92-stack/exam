const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function page({ legacy = false, failure = false } = {}) {
  const selections = [];
  const exam = { id: 'exam', title: 'Existing exam', batch_id: 'batch', course_id: 'course',
    ...(legacy ? {} : { batch_ids: ['batch', 'second'], exam_mode: 'practical' }) };
  const client = { from(table) {
    let head = false;
    let selected = '';
    const query = {
      select(fields, options) {
        selections.push(fields);
        selected = fields;
        head = options?.head;
        return query;
      },
      is(field, value) { assert.equal(field, 'deleted_at'); assert.equal(value, null); return query; },
      not() { return query; },
      order() { return query; },
      then(resolve) {
        const invalid = legacy && selected.split(',').map((field) => field.trim()).includes('batch_ids');
        return Promise.resolve(resolve({
          data: table === 'courses' ? [{ id: 'course', name: 'Course', batches: [{ id: 'batch', name: 'Batch' }] }]
            : head ? null : [exam], count: 15,
          error: !head && table === 'exams' && (failure || invalid) ? { message: 'Database query failed' } : null,
        }));
      },
    };
    return query;
  } };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { default: 'Link' },
    'lucide-react': { Trash2: 'Trash2' }, '@/lib/supabase/server': { createClient: async () => client },
    './ExamForm': { default: 'ExamForm' }, './ExamFilters': { default: 'ExamFilters' },
  };
  const compiled = ts.transpileModule(fs.readFileSync('app/admin/exams/page.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', compiled.outputText)((name) => imports[name], module.exports, module);
  return { render: module.exports.default, selections };
}

for (const legacy of [true, false]) {
  test(`exam list loads with ${legacy ? 'legacy' : 'current'} database columns`, async () => {
    const { render, selections } = page({ legacy });
    const tree = await render();
    const list = tree.props.children.find((child) => child?.type === 'ExamFilters').props.exams;
    assert.equal(list.length, 1);
    assert.deepEqual(list[0].batch_ids, legacy ? ['batch'] : ['batch', 'second']);
    assert.equal(list[0].exam_mode, legacy ? 'standard' : 'practical');
    assert.ok(selections.includes('*, courses(name), batches(name), questions(count)'));
  });
}
test('query failures surface as errors instead of an empty exam list', async () => {
  const { render } = page({ failure: true });
  await assert.rejects(render(), /Unable to load exams/);
});
