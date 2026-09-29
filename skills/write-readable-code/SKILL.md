---
name: write-readable-code
description: Implement and refactor production code so a developer new to the domain can follow the business flow through concrete names, sequential orchestration, limited indirection, and concise comments for non-obvious rules. Use for every coding task that adds, changes, fixes, or reviews application code, including Java, Kotlin, JavaScript, and TypeScript. Apply alongside repository architecture, style, testing, and security rules.
---

# Write Readable Code

Make the smallest design that exposes the domain flow clearly. Optimize for the next developer reading the code, not for the fewest lines or the most abstractions.

## Work in this order

1. Trace the affected entry point, domain rules, side effects, and tests before editing.
2. Write the public method as a top-to-bottom business flow.
3. Name each step with a concrete domain verb and target.
4. Extract code only when the extraction lowers reading or change cost.
5. Add a short comment only where names and structure cannot explain a domain rule or failure guarantee.
6. Re-read the changed flow without relying on the design document, then simplify avoidable jumps and indirection.
7. Verify behavior with focused tests and the repository's required checks.

## Expose the business flow

- Let an entry method read in execution order: validate, transform, persist, publish, respond.
- Keep one abstraction level within a method. Move SDK calls and low-level mapping behind a concrete operation name.
- Prefer guard clauses over nested conditions.
- Compute or validate a value once, then carry the named result forward.
- Keep happy-path steps together. Move cleanup and compensation into clearly named methods or callbacks.
- Do not force an arbitrary line limit. Split only where the resulting names make the flow easier to follow.

Prefer:

```java
ProductContent requestedContent = validateRequestedContent(request);
PromotedFiles promotedFiles = promoteTemporaryFiles(requestedContent);
Product draft = createDraft(requestedContent, promotedFiles);
return saveDraft(draft);
```

Avoid orchestration hidden behind generic calls such as `handle`, `process`, `execute`, `manage`, or `resolve` when a domain verb can state the behavior. Framework-required names are exempt.

## Name for a new domain reader

- Name classes by one recognizable responsibility.
- Name methods with a concrete verb and business target, such as `applyInspectionResult` or `promoteTemporaryFiles`.
- Name intermediate values by their meaning at that stage, such as `requestedContent`, `promotedFiles`, and `storedContent`.
- Use one term for one concept across controller, application, domain, storage, and tests.
- Avoid unexplained abbreviations and names that expose an implementation detail instead of the business action.

## Keep abstractions useful

Create or retain a class, interface, or helper only when it does at least one of these:

- owns a distinct domain policy or reason to change;
- forms a boundary to an external system;
- is reused meaningfully;
- makes isolated testing materially clearer.

Do not add pass-through layers, one-use helpers, speculative extension points, or parameter-heavy shared methods merely to remove duplication. Allow small, obvious duplication when its abstraction would be harder to understand. Reuse established repository patterns when they remain clear.

Apply KISS and YAGNI before DRY. Apply SOLID to manage real change boundaries, not to maximize the number of types.

## Comment only for missing context

- Let names and structure explain ordinary behavior.
- Add at most one short comment to a difficult method when a domain reason, transaction timing, compatibility constraint, or failure guarantee is not inferable from the code.
- Explain why the rule exists or what must be preserved; do not translate the next line into prose.
- Put longer explanations in the relevant tracked document and keep only a concise pointer when necessary.
- Do not add routine Javadoc to self-explanatory private methods.

Useful:

```java
// DB 롤백 시 영구 객체만 삭제하고 temp 객체는 재시도를 위해 유지한다.
registerRollbackCleanup(promotedFiles);
```

Not useful:

```java
// 임시 파일을 영구 파일로 이동한다.
promoteTemporaryFiles();
```

## Review before completion

Confirm all of the following from the actual diff:

- The entry method reveals the main business steps in their execution order.
- Method and variable names predict their behavior without opening every implementation.
- Domain terms are consistent across changed files.
- Branches use early exits where that reduces nesting.
- The same object or value is not repeatedly reconstructed, parsed, or validated without need.
- Every new layer removes more understanding cost than it adds.
- Difficult rules and recovery guarantees have one concise reason comment where needed.
- Tests name the condition and expected outcome in domain language.
- Existing behavior outside the requested scope remains covered.

If a check fails, revise the implementation before calling it complete. Do not compensate for confusing structure with a long explanation.

## Resolve competing rules

Use this priority when principles conflict:

1. Correctness and data safety
2. Security and boundary validation
3. Explicit domain behavior
4. Readable execution flow
5. Ease of change and testing
6. Deduplication
7. Fewer lines or files

Ponytail or another minimalism rule may reduce unnecessary scope, but it must not hide domain behavior, remove required validation, or replace clear names with compressed code.
