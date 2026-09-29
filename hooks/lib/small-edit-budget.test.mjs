import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { countIncomingLines, trySpendSmallEditBudget } from './small-edit-budget.mjs';

test('Edit은 새 문자열의 줄 수를 센다', () => {
  assert.equal(countIncomingLines('Edit', { new_string: 'a\nb\nc' }), 3);
});

test('끝의 줄바꿈 하나는 줄로 세지 않는다', () => {
  assert.equal(countIncomingLines('Edit', { new_string: 'a\nb\n' }), 2);
});

test('빈 문자열로 지우는 수정은 0줄이다', () => {
  assert.equal(countIncomingLines('Edit', { new_string: '' }), 0);
});

test('MultiEdit은 모든 편집의 줄 수를 합친다', () => {
  const edits = [{ new_string: 'a\nb' }, { new_string: 'c' }];
  assert.equal(countIncomingLines('MultiEdit', { edits }), 3);
});

test('Write는 파일 전체 내용의 줄 수를 센다', () => {
  assert.equal(countIncomingLines('Write', { content: '1\n2\n3\n4\n5\n6\n' }), 6);
});

test('모르는 도구면 예외를 던진다', () => {
  assert.throws(() => countIncomingLines('Bash', {}), /지원하지 않는 도구/);
});

function freshStateDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cp-budget-'));
}

test('같은 세션·파일에서 누적 5줄까지는 허용한다', () => {
  const stateDir = freshStateDir();
  const edit = { stateDir, sessionId: 's1', filePath: 'C:/p/A.java' };
  assert.equal(trySpendSmallEditBudget({ ...edit, lines: 3 }), true);
  assert.equal(trySpendSmallEditBudget({ ...edit, lines: 2 }), true);
});

test('나눠서 고쳐도 누적 5줄을 넘으면 막는다', () => {
  const stateDir = freshStateDir();
  const edit = { stateDir, sessionId: 's1', filePath: 'C:/p/A.java' };
  assert.equal(trySpendSmallEditBudget({ ...edit, lines: 3 }), true);
  assert.equal(trySpendSmallEditBudget({ ...edit, lines: 3 }), false);
});

test('막힌 수정은 누적에 더하지 않는다', () => {
  const stateDir = freshStateDir();
  const edit = { stateDir, sessionId: 's1', filePath: 'C:/p/A.java' };
  trySpendSmallEditBudget({ ...edit, lines: 4 });
  trySpendSmallEditBudget({ ...edit, lines: 3 });
  assert.equal(trySpendSmallEditBudget({ ...edit, lines: 1 }), true);
});

test('다른 파일과 다른 세션은 따로 센다', () => {
  const stateDir = freshStateDir();
  trySpendSmallEditBudget({ stateDir, sessionId: 's1', filePath: 'C:/p/A.java', lines: 5 });
  assert.equal(trySpendSmallEditBudget({ stateDir, sessionId: 's1', filePath: 'C:/p/B.java', lines: 5 }), true);
  assert.equal(trySpendSmallEditBudget({ stateDir, sessionId: 's2', filePath: 'C:/p/A.java', lines: 5 }), true);
});
