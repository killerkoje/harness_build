# 프론트엔드 하네스

React / Next.js (App Router) + TypeScript + TanStack Query + MVVM 구조 프로젝트에서 사용하는 Claude 하네스 모음.

## 하네스: 기능 개발 (TDD 파이프라인)

**목표:** 기획 확인 → MVVM 구현 → TDD 검증 → 커밋 파이프라인으로 기능을 일관성 있게 개발한다.

**파이프라인:**
1. **Phase 1** — 기획 레벨 결정 + 코드 분석 + 기획 의도 정리 → **사용자 확인 필수**
2. **Phase 2** — Model(타입) → API Service → ViewModel(훅) → View(페이지/컴포넌트) 순 MVVM 구현
3. **Phase 3** — 타입 경계면 검증 + 잠재적 위험 진단 + 테스트 파일 확인
4. **Phase 4** — 구현 완료 보고 → **커밋 & 푸시 여부 사용자 확인**

**트리거:** React 컴포넌트, 훅, 서비스, 페이지, 버그 수정 등 프론트엔드 코드 작업 요청 시 `frontend-dev` 스킬을 사용하라.

---

## 하네스: 기획-코드 리뷰

**목표:** 사용자가 기획한 의도와 실제 적용 코드를 4단계로 검토한다.
기획 파악 → 코드 절충 검토 → 연결 도메인 나열 → 잠재 에러 진단

**트리거:** 이미 구현한 코드에 대해 리뷰/검토를 요청할 때 `code-review` 스킬을 사용하라.
예: "리뷰해봐", "기획 의도랑 어긋난 거 있어?", "코드 검토해줘", "내 기획이랑 맞는지 봐줘"

**Phase 3 주의:** 연결된 도메인은 나열만 한다. 영향 여부 판단은 사용자가 한다.

---

## 파일 구조

```
harness_global/
├── CLAUDE.md                          ← 이 파일 (하네스 트리거)
└── .claude/
    ├── skills/
    │   ├── frontend-dev/SKILL.md      ← 기능 개발 오케스트레이터 (TDD 파이프라인)
    │   └── code-review/SKILL.md       ← 기획-코드 리뷰어
    └── agents/
        ├── code-analyzer.md           ← React/Next.js 코드베이스 분석 전담
        ├── implementer.md             ← MVVM 순서 코드 구현 전담
        └── qa-validator.md            ← TDD 검증 + 잠재 위험 진단 전담
```

## 사용법

이 디렉토리의 `.claude/` 폴더를 프로젝트 루트에 복사하거나,
`CLAUDE.md` 내용을 프로젝트의 `CLAUDE.md`에 합쳐서 사용한다.

## 기술 스택

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Server State**: TanStack Query (React Query v5)
- **Architecture**: MVVM (types → services → hooks → components/pages)
