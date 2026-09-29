import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readAcceptedPlans } from './lib/plan-files.mjs';
import { countIncomingLines, trySpendSmallEditBudget } from './lib/small-edit-budget.mjs';

const CODE_EXTENSIONS = new Set(['.java', '.kt', '.py', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.go', '.sql']);
const OPT_OUT_MARKER = '.code-planner-off';
const DEFAULT_STATE_DIR = path.join(os.tmpdir(), 'code-planner');

export function decideFileWrite({ toolName, toolInput, sessionId }, { stateDir = DEFAULT_STATE_DIR } = {}) {
  const filePath = path.resolve(toolInput.file_path ?? toolInput.notebook_path);
  if (!CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return allow();

  const projectRoot = findGitRoot(filePath);
  if (projectRoot === null) return allow();
  if (fs.existsSync(path.join(projectRoot, OPT_OUT_MARKER))) return allow();

  const projectPath = toProjectPath(projectRoot, filePath);
  if (projectPath.startsWith('docs/')) return allow();

  const plans = readAcceptedPlans(projectRoot);
  const missingTestPath = findMissingFirstTest(plans, projectRoot, projectPath);
  if (missingTestPath) return block(`테스트 파일을 먼저 작성하세요: ${missingTestPath}`);
  if (isCoveredByPlan(plans, projectPath)) return allow();

  if (fs.existsSync(filePath)) {
    const lines = countIncomingLines(toolName, toolInput);
    const budget = { stateDir, sessionId: sessionId ?? 'unknown-session', filePath, lines };
    if (trySpendSmallEditBudget(budget)) return allow();
  }
  return block(`code-planner로 계획을 먼저 세우고 승인받으세요: ${projectPath}`);
}

function findGitRoot(filePath) {
  let directory = path.dirname(filePath);
  while (true) {
    if (fs.existsSync(path.join(directory, '.git'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function toProjectPath(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function findMissingFirstTest(plans, projectRoot, projectPath) {
  const pair = plans
    .flatMap((plan) => plan.testsFirst)
    .find((candidate) => candidate.impl === projectPath && !fs.existsSync(path.join(projectRoot, candidate.test)));
  return pair?.test ?? null;
}

function isCoveredByPlan(plans, projectPath) {
  return plans.some((plan) => plan.files.some((pattern) => path.posix.matchesGlob(projectPath, pattern)));
}

function allow() {
  return { allowed: true };
}

function block(reason) {
  return { allowed: false, reason };
}
