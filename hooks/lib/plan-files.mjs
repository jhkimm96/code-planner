import fs from 'node:fs';
import path from 'node:path';

const PLANS_DIR = path.join('docs', 'code-plans');
const ACCEPTED_STATUSES = new Set(['approved', 'skipped-by-user']);

export function readAcceptedPlans(projectRoot) {
  const plansDir = path.join(projectRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) return [];

  return fs.readdirSync(plansDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => parsePlanFrontmatter(fs.readFileSync(path.join(plansDir, fileName), 'utf8')))
    .filter((plan) => plan !== null && ACCEPTED_STATUSES.has(plan.status));
}

// 계획 파일이 쓰는 형식만 읽는다. 모르는 형태가 섞이면 승인 여부를 믿을 수 없으므로 null로 본다.
export function parsePlanFrontmatter(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return null;
  const closingIndex = lines.indexOf('---', 1);
  if (closingIndex === -1) return null;

  const plan = { status: null, files: [], testsFirst: [] };
  let openList = null;

  for (const rawLine of lines.slice(1, closingIndex)) {
    const line = rawLine.replace(/\s+#.*$/, '');
    if (line.trim() === '') continue;

    const keyValue = line.match(/^([a-z_]+):\s*(.*)$/);
    if (keyValue) {
      const [, key, value] = keyValue;
      openList = null;
      if (key === 'status') plan.status = value.trim();
      else if (key === 'approved_at') continue;
      else if (key === 'files' && value === '') openList = 'files';
      else if (key === 'tests_first' && value === '') openList = 'testsFirst';
      else return null;
      continue;
    }

    const implEntry = line.match(/^\s+-\s+impl:\s*(.+)$/);
    const testEntry = line.match(/^\s+test:\s*(.+)$/);
    const fileEntry = line.match(/^\s+-\s+(.+)$/);
    const lastPair = plan.testsFirst.at(-1);

    if (openList === 'testsFirst' && implEntry) plan.testsFirst.push({ impl: implEntry[1].trim(), test: null });
    else if (openList === 'testsFirst' && testEntry && lastPair?.test === null) lastPair.test = testEntry[1].trim();
    else if (openList === 'files' && fileEntry) plan.files.push(fileEntry[1].trim());
    else return null;
  }

  const everyPairHasTest = plan.testsFirst.every((pair) => pair.test !== null);
  if (!plan.status || !everyPairHasTest) return null;
  return plan;
}
