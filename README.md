# code-planner

코드를 쓰기 전에 **질문 → 계획 → 승인**을 거치게 하고, 규칙이 있는 코드는 **테스트를 먼저**
쓰게 하는 Claude Code 플러그인입니다.

"코드를 쓰기 전에 계획을 보여 달라"는 지시를 프롬프트로만 남겼더니 반복해서 건너뛰어진
경험에서 만들었습니다. 그래서 이 규칙은 부탁이 아니라 `PreToolUse` 훅으로 강제합니다 — 승인된
계획의 `files`에 없는 코드 파일을 쓰려 하면 도구 호출 자체가 막힙니다. 계획 승인은
사용자만 할 수 있고(`docs/code-plans/*.md`에 `status: approved`), 규칙이 있는 로직(계산·상태
전이·검증)은 계획에 적은 테스트 파일이 먼저 있어야 구현 파일을 쓸 수 있습니다.

## 설치

```
/plugin marketplace add jhkimm96/code-planner
/plugin install code-planner@code-planner
```

계획의 "빼도 되는 것" 항목은 [ponytail](https://github.com/DietrichGebert/ponytail)(MIT,
DietrichGebert)을 기준으로 씁니다. 함께 설치하세요.

```
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

Node.js 22.13 이상이 필요합니다(`path.posix.matchesGlob` 실험적 기능).

## 흐름

1. "이 기능 만들어줘" → 스펙·대화를 읽고 모자란 것만 질문
2. 계획안: 파일, 메서드 이름과 흐름, 기존 코드와의 연관, 빼도 되는 것, 이름 점검,
   14개 루브릭 예측, 테스트 계획
3. 승인 → `docs/code-plans/YYYY-MM-DD-<작업명>.md` 저장
4. 테스트 먼저(실패 확인) → 구현

## 훅이 막는 것

| 상황 | 결과 |
|---|---|
| 승인된 계획의 `files`에 없는 코드 파일 | 차단 |
| 새 코드 파일 | 계획 필요 |
| 계획의 `tests_first` 짝 테스트가 아직 없는 구현 파일 | 차단 |
| 계획 없는 기존 파일 수정 | 세션·파일별 누적 5줄까지 통과 |
| 문서·설정 파일, `docs/` 아래, git 저장소 밖 | 통과 |
| 루트에 `.code-planner-off`가 있는 프로젝트 | 통과 |
| 훅 오류 | 차단 |

코드 확장자: `.java .kt .py .ts .tsx .js .jsx .mjs .go .sql`

## 이 플러그인이 막지 못하는 것

훅은 `Write`/`Edit`/`MultiEdit`/`NotebookEdit` 도구 호출만 검사합니다. 아래는 훅을 그냥
지나갑니다.

- **모델이 스스로 승인한 것처럼 쓰는 것.** 계획 파일(`docs/code-plans/*.md`)이나
  `.code-planner-off`는 코드 파일이 아니라 훅 대상이 아닙니다. 실제로 사용자가 승인했는지는
  계획 파일을 커밋해 기록으로 남기고 리뷰에서 확인하는 방법으로 보완하세요.
- **`Bash`로 파일을 쓰는 것.** `cat > x.py`, `sed -i` 같은 명령은 훅이 걸리는 도구가
  아닙니다.
- **`node`가 PATH에 없는 환경.** 훅 명령이 실행되지 못하면 Claude Code가 이를 차단이 아니라
  통과로 처리할 수 있습니다. Node.js가 설치돼 있는지 먼저 확인하세요.

## 포함된 기준

- `skills/write-readable-code`: 도메인을 모르는 사람도 흐름을 읽을 수 있는 코드
- `rubric.md`: 14개 코드 품질 루브릭(Fowler 『Refactoring』, DDD, 『Release It!』 기반)

## 개발

```
node --test --no-warnings
```

## License

MIT
