import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parsePlanFrontmatter, readAcceptedPlans } from './plan-files.mjs';

const APPROVED_PLAN = `---
status: approved          # approved | skipped-by-user
approved_at: 2026-09-29T14:05
files:
  - src/main/Settlement.java
  - src/test/**/*.java
tests_first:
  - impl: src/main/Settlement.java
    test: src/test/SettlementTest.java
---

본문
`;

test('승인된 계획에서 status, files, tests_first 짝을 읽는다', () => {
  assert.deepEqual(parsePlanFrontmatter(APPROVED_PLAN), {
    status: 'approved',
    files: ['src/main/Settlement.java', 'src/test/**/*.java'],
    testsFirst: [{ impl: 'src/main/Settlement.java', test: 'src/test/SettlementTest.java' }],
  });
});

test('CRLF 줄바꿈도 읽는다', () => {
  assert.equal(parsePlanFrontmatter(APPROVED_PLAN.replace(/\n/g, '\r\n')).status, 'approved');
});

test('frontmatter가 없으면 계획으로 보지 않는다', () => {
  assert.equal(parsePlanFrontmatter('# 제목만 있는 문서\n'), null);
});

test('닫는 --- 가 없으면 계획으로 보지 않는다', () => {
  assert.equal(parsePlanFrontmatter('---\nstatus: approved\n'), null);
});

test('모르는 키가 있으면 계획으로 보지 않는다', () => {
  assert.equal(parsePlanFrontmatter('---\nstatus: approved\nowner: me\n---\n'), null);
});

test('test가 빠진 tests_first 짝이 있으면 계획으로 보지 않는다', () => {
  const text = '---\nstatus: approved\ntests_first:\n  - impl: a.py\n---\n';
  assert.equal(parsePlanFrontmatter(text), null);
});

test('status가 없으면 계획으로 보지 않는다', () => {
  assert.equal(parsePlanFrontmatter('---\nfiles:\n  - a.py\n---\n'), null);
});

test('승인되었거나 건너뛰기로 한 계획만 읽는다', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-plans-'));
  const plansDir = path.join(root, 'docs', 'code-plans');
  fs.mkdirSync(plansDir, { recursive: true });
  fs.writeFileSync(path.join(plansDir, 'a.md'), APPROVED_PLAN);
  fs.writeFileSync(path.join(plansDir, 'b.md'), '---\nstatus: skipped-by-user\nfiles:\n  - b.py\n---\n');
  fs.writeFileSync(path.join(plansDir, 'c.md'), '---\nstatus: draft\nfiles:\n  - c.py\n---\n');
  fs.writeFileSync(path.join(plansDir, 'broken.md'), '---\nstatus: approved\n');
  fs.writeFileSync(path.join(plansDir, 'note.txt'), 'status: approved');

  const statuses = readAcceptedPlans(root).map((plan) => plan.status).sort();

  assert.deepEqual(statuses, ['approved', 'skipped-by-user']);
});

test('계획 폴더가 없으면 빈 목록이다', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-plans-'));
  assert.deepEqual(readAcceptedPlans(root), []);
});
