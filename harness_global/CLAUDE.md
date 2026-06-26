# 프론트엔드 하네스

React / Next.js (App Router) + TypeScript + TanStack Query + MVVM 구조 프로젝트에서 사용하는 Claude 하네스 모음.

## 하네스: 기능 개발 (TDD 파이프라인)

**목표:** 기획 확인 → 테스트 선행 작성 → MVVM 구현 → 실제 테스트 실행 검증 → 커밋 파이프라인으로 기능을 일관성 있게 개발한다.

**파이프라인:**
1. **Phase 1** — 기획 레벨 결정 + 코드 분석 + 기획 의도 정리 → **사용자 확인 필수**
2. **Phase 1.5** — 확정 스펙 기준으로 테스트 파일 선행 생성 (TDD Red 단계)
3. **Phase 2** — Model(타입) → API Service → ViewModel(훅) → View(페이지/컴포넌트) 순 MVVM 구현
4. **Phase 3** — 테스트 실제 실행(vitest/jest) + 정적 검증 + FAIL 시 자동 재시도(최대 2회)
5. **Phase 4** — 구현 완료 보고 → **커밋 & 푸시 여부 사용자 확인**

**트리거:** React 컴포넌트, 훅, 서비스, 페이지, 버그 수정 등 프론트엔드 코드 작업 요청 시 `frontend-dev` 스킬을 사용하라.

---

## 하네스: 기획-코드 리뷰

**목표:** 사용자가 기획한 의도와 실제 적용 코드를 4단계로 검토한다.
기획 파악 → 코드 절충 검토 → 연결 도메인 나열 → 잠재 에러 진단

**트리거:** 이미 구현한 코드에 대해 리뷰/검토를 요청할 때 `code-review` 스킬을 사용하라.
예: "리뷰해봐", "기획 의도랑 어긋난 거 있어?", "코드 검토해줘", "내 기획이랑 맞는지 봐줘"

**Phase 3 주의:** 연결된 도메인은 나열만 한다. 영향 여부 판단은 사용자가 한다.

---

## 컨벤션 문서

모든 에이전트는 코드 작성 전 아래 두 문서를 참조한다.

| 문서 | 용도 |
|------|------|
| `REACT_NEXT_CONVENTIONS.md` | Next.js 공식 문서 기반 구조·타입·라우팅 규칙 |
| `CSS_CONVENTIONS.md` | Tailwind/Pure CSS/CSS Modules 스타일 규칙 + 리팩토링 기준 |

두 문서는 구현·분석·QA의 공통 기준이다.

---

## 파일 구조

```
harness_global/
├── CLAUDE.md                          ← 이 파일 (하네스 트리거)
├── REACT_NEXT_CONVENTIONS.md          ← 공식 문서 기반 컨벤션 (모든 에이전트 참조)
├── CSS_CONVENTIONS.md                 ← Tailwind/Pure CSS/Modules 스타일 규칙 (모든 에이전트 참조)
└── .claude/
    ├── skills/
    │   ├── frontend-dev/SKILL.md      ← 기능 개발 오케스트레이터 (TDD 파이프라인)
    │   └── code-review/SKILL.md       ← 기획-코드 리뷰어
    └── agents/
        ├── code-analyzer.md           ← React/Next.js 코드베이스 분석 전담 (Phase 1)
        ├── test-writer.md             ← 스펙 기반 테스트 파일 선행 생성 전담 (Phase 1.5)
        ├── implementer.md             ← MVVM 순서 코드 구현 전담 (Phase 2)
        └── qa-validator.md            ← 테스트 실행 + 정적 검증 + 위험 진단 전담 (Phase 3)
```

## 사용법

이 디렉토리의 `.claude/` 폴더를 프로젝트 루트에 복사하거나,
`CLAUDE.md` 내용을 프로젝트의 `CLAUDE.md`에 합쳐서 사용한다.

## 기술 스택

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Server State**: TanStack Query (React Query v5)
- **Architecture**: MVVM (types → services → hooks → components/pages)

---

## 변경 이력

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-06-23 | 초기 구성 | 전체 | - |
| 2026-06-23 | CSS_CONVENTIONS.md 추가 및 전 에이전트 적용 | CLAUDE.md, code-analyzer.md, implementer.md, qa-validator.md | CSS/Tailwind 스타일 컨벤션 통합 |
| 2026-06-24 | 실제 TDD 파이프라인 구현 | test-writer.md(신규), implementer.md, qa-validator.md, frontend-dev/SKILL.md, CLAUDE.md | 문서형 TDD → 테스트 파일 선행 생성 + vitest/jest 실제 실행 + FAIL 자동 재시도 |
| 2026-06-26 | 패턴 학습 기준 명확화 | pattern-extractor.md, frontend-dev/SKILL.md | 반복 횟수 기반 → source 태그(user_approved/qa_pass/repeated) + reason 필드 추가로 "나쁜 습관 자동 등록" 방지 |
