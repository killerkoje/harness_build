# 하네스

모든 스택 (Next.js / React / Node.js / 백엔드 / 앱) 프로젝트에서 사용하는 Claude 하네스 모음.

## 하네스: 기능 개발 (TDD 파이프라인)

**목표:** 기획 확인 → 테스트 선행 작성 → 레이어 구현 → 실제 테스트 실행 검증 → 커밋 파이프라인으로 기능을 일관성 있게 개발한다.

**파이프라인:**
1. **Phase 1** — 코드 분석 + 기획 의도 정리 → **사용자 확인 필수**
2. **Phase 1.5** — `SKIP_TESTS: false`일 때 테스트 선행 작성
3. **Phase 2** — 스택별 레이어 순서로 구현
4. **Phase 3** — 테스트 실행 + 정적 검증
5. **Phase 4** — 완료 보고 → 커밋
6. **Phase 4.5** — 커밋 **후** 질문 → 승인 시 `.harness/patterns/local/` 등록
7. **Phase 5** — `팀에 올려줘` 요청 시 `team-patterns/` draft PR 승격

**트리거:** 컴포넌트, 페이지, API, 엔드포인트, 훅, 서비스, 모델, 라우터, 컨트롤러 등 코드 작업 요청 시 `dev` 스킬을 사용하라. 단순 질문은 직접 응답 가능.

---

## 하네스: 기획-코드 리뷰

**목표:** 사용자가 기획한 의도와 실제 적용 코드를 4단계로 검토한다.
기획 파악 → 코드 절충 검토 → 연결 도메인 나열 → 잠재 에러 진단

**트리거:** 이미 구현한 코드에 대해 리뷰/검토를 요청할 때 `code-review` 스킬을 사용하라.
예: "리뷰해봐", "기획 의도랑 어긋난 거 있어?", "코드 검토해줘", "내 기획이랑 맞는지 봐줘"

**Phase 3 주의:** 연결된 도메인은 나열만 한다. 영향 여부 판단은 사용자가 한다.

---

## 컨벤션 문서

Next.js 스택에서는 코드 작성 전 아래 두 문서를 참조한다.

| 문서 | 용도 |
|------|------|
| `REACT_NEXT_CONVENTIONS.md` | Next.js 공식 문서 기반 구조·타입·라우팅 규칙 (next 스택에서만 참조) |
| `CSS_CONVENTIONS.md` | Tailwind/Pure CSS/CSS Modules 스타일 규칙 + 리팩토링 기준 (next 스택에서만 참조) |

두 문서는 Next.js 스택 구현·분석·QA의 공통 기준이다.

---

## 파일 구조

```
harness_global/
├── CLAUDE.md                          ← 이 파일 (하네스 트리거)
├── REACT_NEXT_CONVENTIONS.md          ← Next.js 스택 컨벤션 (next 스택에서만 참조)
├── CSS_CONVENTIONS.md                 ← CSS/Tailwind 스타일 규칙 (next 스택에서만 참조)
└── .claude/
    ├── skills/
    │   ├── dev/SKILL.md               ← 기능 개발 오케스트레이터 (범용, TDD 파이프라인)
    │   ├── code-review/SKILL.md       ← 기획-코드 리뷰어 (범용)
    │   └── install-harness/SKILL.md   ← 설치 오케스트레이터 (신규/기존 프로젝트 분기)
    └── agents/
        ├── code-analyzer.md           ← 코드베이스 분석 전담 (범용, Phase 1)
        ├── implementer.md             ← 레이어 순서 구현 전담 (범용, Phase 2)
        ├── test-writer.md             ← 테스트 파일 선행 생성 전담 (범용, Phase 1.5)
        ├── qa-validator.md            ← 테스트 실행 + 검증 전담 (범용, Phase 3)
        ├── pattern-extractor.md       ← 로컬 패턴 저장 (Phase 4.5)
        └── pattern-promoter.md        ← 팀 패턴 승격 draft PR (Phase 5)
```

## 사용법

이 디렉토리의 `.claude/` 폴더를 프로젝트 루트에 복사하거나,
`CLAUDE.md` 내용을 프로젝트의 `CLAUDE.md`에 합쳐서 사용한다.

---

## 변경 이력

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-23 | 초기 구성 | 전체 | - |
| 2026-06-23 | CSS_CONVENTIONS.md 추가 및 전 에이전트 적용 | CLAUDE.md, code-analyzer.md, implementer.md, qa-validator.md | CSS/Tailwind 스타일 컨벤션 통합 |
| 2026-06-24 | 실제 TDD 파이프라인 구현 | test-writer.md(신규), implementer.md, qa-validator.md, dev/SKILL.md, CLAUDE.md | 문서형 TDD → 테스트 파일 선행 생성 + vitest/jest 실제 실행 + FAIL 자동 재시도 |
| 2026-06-26 | 패턴 학습 기준 명확화 | pattern-extractor.md, dev/SKILL.md | 반복 횟수 기반 → source 태그(user_approved/qa_pass/repeated) + reason 필드 추가로 "나쁜 습관 자동 등록" 방지 |
| 2026-06-08 | 패턴 학습·스펙 추적 강화 | pattern-extractor.md, dev/SKILL.md, code-analyzer.md | Step 4-B 선택 이유, deprecated/superseded_by 스키마, patterns_applied 감사 추적 |
| 2026-06-26 | 범용 하네스 확장 | 전체 | Next.js 전용 → 모든 스택 지원 (범용 코어 + 스택 플러그인) |
| 2026-07-08 | 파이프라인 단순화 v0.4.0 | dev/SKILL.md, pattern-extractor, code-analyzer | 레벨 제거, SKIP_TESTS, ok+저장 시만 패턴 |
| 2026-07-08 | Lighthouse CLI 제거 | dev/SKILL.md, harness.config.yaml, install.sh | Phase 3.5·performance-validator·스크립트 삭제 |
| 2026-07-08 | 팀 패턴 중앙 레포 v0.5.0 | team-patterns/, sync-team-patterns.sh | team/local 분리, --sync-patterns |
| 2026-07-08 | 패턴 UX v0.5.1 | dev/SKILL.md, pattern-promoter | 커밋→로컬저장 분리, Phase 5 승격 |
| 2026-07-08 | Cursor team-patterns v0.5.2 | cursor/team-patterns.mdc, install.sh | alwaysApply 팀·로컬 패턴 참조 |
