import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decideFileWrite } from './check-plan.mjs';

const HOOK_SCRIPT = fileURLToPath(new URL('./check-plan.mjs', import.meta.url));

function createProject({ files = {}, plans = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-project-'));
  fs.mkdirSync(path.join(root, '.git'));
  for (const [relativePath, content] of Object.entries(files)) writeFile(root, relativePath, content);
  for (const [fileName, content] of Object.entries(plans)) writeFile(root, `docs/code-plans/${fileName}`, content);
  return root;
}

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function writeRequest(root, relativePath, content = 'x') {
  return { toolName: 'Write', toolInput: { file_path: path.join(root, relativePath), content }, sessionId: 's1' };
}

function editRequest(root, relativePath, newString, sessionId = 's1') {
  return { toolName: 'Edit', toolInput: { file_path: path.join(root, relativePath), old_string: 'a', new_string: newString }, sessionId };
}

function decide(request) {
  return decideFileWrite(request, { stateDir: fs.mkdtempSync(path.join(os.tmpdir(), 'cp-state-')) });
}

const planFor = (...files) => `---\nstatus: approved\nfiles:\n${files.map((f) => `  - ${f}`).join('\n')}\n---\n`;

test('코드 파일이 아니면 통과한다', () => {
  const root = createProject();
  assert.deepEqual(decide(writeRequest(root, 'README.md')), { allowed: true });
});

test('git 저장소 밖의 코드 파일은 통과한다', () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-outside-'));
  assert.deepEqual(decide(writeRequest(outside, 'scratch.py')), { allowed: true });
});

test('.code-planner-off가 있는 프로젝트는 통과한다', () => {
  const root = createProject({ files: { '.code-planner-off': '' } });
  assert.deepEqual(decide(writeRequest(root, 'tool.py')), { allowed: true });
});

test('docs 아래 코드 파일은 통과한다', () => {
  const root = createProject();
  assert.deepEqual(decide(writeRequest(root, 'docs/example.py')), { allowed: true });
});

test('계획 없이 새 코드 파일을 만들면 막는다', () => {
  const root = createProject();
  const decision = decide(writeRequest(root, 'src/app.py'));
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /code-planner로 계획을 먼저 세우고 승인받으세요: src\/app\.py/);
});

test('한 줄짜리 새 파일도 계획이 필요하다', () => {
  const root = createProject();
  assert.equal(decide(writeRequest(root, 'src/one.py', 'x')).allowed, false);
});

test('승인된 계획의 files에 있는 파일은 통과한다', () => {
  const root = createProject({ plans: { 'p.md': planFor('src/app.py') } });
  assert.deepEqual(decide(writeRequest(root, 'src/app.py')), { allowed: true });
});

test('계획의 glob에 맞는 파일은 통과한다', () => {
  const root = createProject({ plans: { 'p.md': planFor('src/**/*.py') } });
  assert.deepEqual(decide(writeRequest(root, 'src/deep/nested/app.py')), { allowed: true });
});

test('계획에 없는 파일은 막는다', () => {
  const root = createProject({ plans: { 'p.md': planFor('src/app.py') } });
  assert.equal(decide(writeRequest(root, 'src/other.py')).allowed, false);
});

test('승인되지 않은 계획은 인정하지 않는다', () => {
  const root = createProject({ plans: { 'p.md': '---\nstatus: draft\nfiles:\n  - src/app.py\n---\n' } });
  assert.equal(decide(writeRequest(root, 'src/app.py')).allowed, false);
});

test('frontmatter가 깨진 계획은 인정하지 않는다', () => {
  const root = createProject({ plans: { 'p.md': '---\nstatus: approved\nfiles:\n  - src/app.py\n' } });
  assert.equal(decide(writeRequest(root, 'src/app.py')).allowed, false);
});

test('skipped-by-user 계획은 통과한다', () => {
  const root = createProject({ plans: { 'p.md': '---\nstatus: skipped-by-user\nfiles:\n  - src/app.py\n---\n' } });
  assert.deepEqual(decide(writeRequest(root, 'src/app.py')), { allowed: true });
});

const TEST_FIRST_PLAN = `---
status: approved
files:
  - src/Settlement.java
  - test/SettlementTest.java
tests_first:
  - impl: src/Settlement.java
    test: test/SettlementTest.java
---
`;

test('짝인 테스트 파일이 없으면 구현 파일을 막는다', () => {
  const root = createProject({ plans: { 'p.md': TEST_FIRST_PLAN } });
  const decision = decide(writeRequest(root, 'src/Settlement.java'));
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /테스트 파일을 먼저 작성하세요: test\/SettlementTest\.java/);
});

test('짝인 테스트 파일 작성은 허용한다', () => {
  const root = createProject({ plans: { 'p.md': TEST_FIRST_PLAN } });
  assert.deepEqual(decide(writeRequest(root, 'test/SettlementTest.java')), { allowed: true });
});

test('테스트 파일이 생긴 뒤에는 구현 파일을 허용한다', () => {
  const root = createProject({ plans: { 'p.md': TEST_FIRST_PLAN }, files: { 'test/SettlementTest.java': 'class T {}' } });
  assert.deepEqual(decide(writeRequest(root, 'src/Settlement.java')), { allowed: true });
});

test('기존 파일의 5줄 이하 수정은 계획 없이 통과한다', () => {
  const root = createProject({ files: { 'src/app.py': 'a' } });
  assert.deepEqual(decide(editRequest(root, 'src/app.py', '1\n2\n3')), { allowed: true });
});

test('같은 파일을 나눠 고쳐 누적 5줄을 넘으면 막는다', () => {
  const root = createProject({ files: { 'src/app.py': 'a' } });
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-state-'));
  assert.equal(decideFileWrite(editRequest(root, 'src/app.py', '1\n2\n3'), { stateDir }).allowed, true);
  assert.equal(decideFileWrite(editRequest(root, 'src/app.py', '4\n5\n6'), { stateDir }).allowed, false);
});

test('계획 파일이 있어도 docs/code-plans 밖의 md 계획은 읽지 않는다', () => {
  const root = createProject({ files: { 'plan.md': planFor('src/app.py') } });
  assert.equal(decide(writeRequest(root, 'src/app.py')).allowed, false);
});

function runHook(stdin) {
  return spawnSync(process.execPath, ['--no-warnings', HOOK_SCRIPT], { input: stdin, encoding: 'utf8' });
}

test('훅 프로세스는 통과면 exit 0이다', () => {
  const root = createProject();
  const input = { session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(root, 'README.md'), content: 'x' } };
  assert.equal(runHook(JSON.stringify(input)).status, 0);
});

test('훅 프로세스는 차단이면 exit 2와 이유를 stderr에 쓴다', () => {
  const root = createProject();
  const input = { session_id: 's1', tool_name: 'Write', tool_input: { file_path: path.join(root, 'src/app.py'), content: 'x' } };
  const result = runHook(JSON.stringify(input));
  assert.equal(result.status, 2);
  assert.match(result.stderr, /code-planner로 계획을 먼저 세우고 승인받으세요/);
});

test('훅이 오류로 죽으면 차단한다', () => {
  const result = runHook('{ not json');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /code-planner 훅 오류로 차단했습니다/);
});
