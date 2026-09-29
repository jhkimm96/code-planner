# 코드 품질 루브릭 (14개 카테고리)

code-planner가 계획 단계에서 위반을 예측하고, 비공개 `publish-quality`가 코드를 쓴 뒤 같은
기준으로 측정한다. 이 파일이 원본이다.

## 카테고리

| 카테고리 | 판정 내용 |
|---|---|
| `controller-thin` | 컨트롤러에는 호출·위임 로직만. 비즈니스 로직 혼입 금지 |
| `entity-encapsulation` | 엔티티는 setter 반복이 아닌 자기 상태 관리. 단, 과도한 로직 집중도 위반 |
| `http-semantics` | HTTP 상태코드를 의미에 맞게 반환 |
| `logging-quality` | 원인 추적에 도움 되는 좋은 로그 (필요한 곳에 있고, 무의미한 남발 없음) |
| `exception-discipline` | try-catch는 실제 예외가 날 만한 곳에만. 무분별한 감싸기 금지 |
| `layer-separation` | 외부 기술(인프라 클라이언트·SDK)을 비즈니스 서비스에 직접 혼입 금지 |
| `dead-code` | 실질적 미사용 코드. 미사용 외부 연동 코드 포함(안 쓰는 클라이언트·죽은 토픽 컨슈머·설정 잔재) |
| `duplication-semantic` | jscpd가 못 잡는 의미론적 중복 로직 |
| `diagnosability` | 예외 삼킴·모호한 에러 메시지 등 원인 추적 방해 요소 |
| `integration-robustness` | 서비스 간 통신(gRPC·Kafka·REST)의 실패 처리 — 타임아웃 없는 원격 호출, 실패 무시, 컨슈머 예외 삼킴, 응답 무검증 |
| `service-boundary` | 경계 위반 — 다른 서비스 DB/스키마 직접 접근, 타 도메인 로직 중복 구현, 순환 호출 유발, 이벤트가 자연스러운 곳의 동기 호출 체인 |
| `value-object-design` | (v2) 긴 매개변수 목록·데이터 뭉치·기본형 집착 — id·상태·금액·기간 등을 원시타입 덩어리로 넘기거나, 늘 함께 다니는 값들을 값객체로 묶지 않음 |
| `polymorphism-opportunity` | (v2) 반복되는 switch·타입/상태 기반 조건 분기가 여러 곳에 흩어져 다형성으로 대체할 수 있는데 안 함 |
| `cohesion-coupling` | (v2) 응집도·결합도 — 뒤엉킨 변경(한 클래스가 여러 이유로 바뀜)·산탄총 수술(하나 고치려 여러 곳 손댐)·기능 편애(남의 데이터를 자기 것보다 더 씀)·메시지 체인 |

## 근거

- `cohesion-coupling`, `value-object-design`: Martin Fowler 『Refactoring』의 code smell
  (뒤엉킨 변경, 산탄총 수술, 기능 편애, 메시지 체인, 데이터 뭉치, 기본형 집착)
- `polymorphism-opportunity`: 같은 책의 "Replace Conditional with Polymorphism"
- `entity-encapsulation`: 빈약한 도메인 모델(Anemic Domain Model) 안티패턴
- `service-boundary`: DDD의 Bounded Context
- `integration-robustness`: Michael Nygard 『Release It!』의 회복성 패턴

## 다른 언어에 적용할 때

카테고리는 Spring·MSA 기준이다. 해당하지 않는 항목은 억지로 판정하지 않고 "해당 없음 + 이유"로
쓴다. 다른 언어에서는 가장 가까운 대응으로 판정한다. 예: FastAPI 라우트는 `controller-thin`,
외부 API 호출의 타임아웃은 `integration-robustness`.
