import fs from 'node:fs';
import path from 'node:path';

export const SMALL_EDIT_LIMIT = 5;

export function countIncomingLines(toolName, toolInput) {
  if (toolName === 'Edit') return countLines(toolInput.new_string);
  if (toolName === 'MultiEdit') return toolInput.edits.reduce((sum, edit) => sum + countLines(edit.new_string), 0);
  if (toolName === 'Write') return countLines(toolInput.content);
  if (toolName === 'NotebookEdit') return countLines(toolInput.new_source);
  throw new Error(`지원하지 않는 도구: ${toolName}`);
}

function countLines(text) {
  if (!text) return 0;
  return text.replace(/\n$/, '').split('\n').length;
}

// 5줄씩 나눠 고쳐 큰 변경을 통과시키지 못하게, 계획 없이 통과한 줄 수를 세션·파일별로 누적한다.
export function trySpendSmallEditBudget({ stateDir, sessionId, filePath, lines }) {
  const stateFile = path.join(stateDir, `${sessionId}.json`);
  const spentLinesByFile = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  const spentLinesAfter = (spentLinesByFile[filePath] ?? 0) + lines;
  if (spentLinesAfter > SMALL_EDIT_LIMIT) return false;

  spentLinesByFile[filePath] = spentLinesAfter;
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(spentLinesByFile));
  return true;
}
