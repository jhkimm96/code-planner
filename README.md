# code-planner

코드를 쓰기 전에 **질문 → 계획 → 승인**을 거치게 하는 Claude Code 플러그인입니다.
규칙이 있는 코드는 **테스트를 먼저** 쓰게 합니다. 글로 된 지시는 건너뛰어질 수 있어서,
`PreToolUse` 훅이 승인된 계획 없는 코드 작성을 실제로 막습니다.

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

Node.js 22.13 이상이 필요합니다(`path.matchesGlob` 실험적 기능).

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

## 포함된 기준

- `skills/write-readable-code`: 도메인을 모르는 사람도 흐름을 읽을 수 있는 코드
- `rubric.md`: 14개 코드 품질 루브릭(Fowler 『Refactoring』, DDD, 『Release It!』 기반)

## 개발

```
node --test --no-warnings
```

## License

MIT
