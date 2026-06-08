# harness_build

React / Next.js 프로젝트 전용 Claude 하네스.
자연어 명령 한 줄로 **기획 확인 → MVVM 구현 → TDD 검증 → 커밋**까지 자동 실행된다.

---

## 아키텍처

### 전체 구조

```
harness_global/
├── CLAUDE.md                        ← 스킬 트리거 정의 (프로젝트 루트에 복사)
├── REACT_NEXT_CONVENTIONS.md        ← Next.js 공식 문서 기반 컨벤션 (에이전트 공통 참조)
└── .claude/
    ├── skills/                      ← 사용자 명령을 받아 파이프라인을 조율하는 오케스트레이터
    │   ├── frontend-dev/SKILL.md    ← 개발 파이프라인 (Phase 1~4)
    │   └── code-review/SKILL.md     ← 기획-코드 리뷰어
    └── agents/                      ← 스킬이 호출하는 전문 서브 에이전트
        ├── code-analyzer.md         ← 코드베이스 분석 전담 (Explore 타입)
        ├── implementer.md           ← MVVM 순서 코드 구현 전담
        └── qa-validator.md          ← TDD 검증 + 컨벤션 위반 + 위험 진단
```

### 에이전트 역할 분리

```
사용자 명령
    │
    ▼
[Skill: frontend-dev]  ← 오케스트레이터. 에이전트를 순서대로 호출하고 사용자와 소통
    │
    ├─ Phase 1 ──▶ [Agent: code-analyzer]   읽기 전용. 파일 탐색 + 분석 보고서 작성
    │                       │
    │              사용자 확인 대기 (중단점)
    │
    ├─ Phase 2 ──▶ [Agent: implementer]     REACT_NEXT_CONVENTIONS.md 참조
    │                                        types → service → hooks → view 순 구현
    │
    ├─ Phase 3 ──▶ [Agent: qa-validator]    타입 경계면 + 컨벤션 위반 + 위험 진단
    │
    └─ Phase 4      결과 보고 + 커밋&푸시 여부 확인 (중단점)
```

### MVVM 계층 구조

```
types/                  ← Model    TypeScript 인터페이스, API 응답/요청 타입
services/ | lib/api/    ← Model    fetch 함수, API 레이어
hooks/                  ← ViewModel TanStack Query (useQuery / useMutation)
app/ | components/      ← View     page.tsx, React 컴포넌트
```

### 컨벤션 참조 흐름

```
REACT_NEXT_CONVENTIONS.md
        │
        ├── code-analyzer  → 분석 기준 (기존 패턴 파악 시 참조)
        ├── implementer    → 구현 기준 (§15 구현순서, §5 Server/Client, §6 비동기 API)
        └── qa-validator   → 검증 기준 (§14 금지사항 체크리스트)
```

---

## 파이프라인

### frontend-dev (개발)

```
Phase 1  코드 분석 → 기획 의도 요약
         ── 사용자 확인 대기 ──  ← ok 없으면 진행 안 함
Phase 2  MVVM 구현
           types → service → hooks → page/components
Phase 3  TDD 검증
           타입 경계면 / 컨벤션 위반 / 런타임 위험 진단
Phase 4  결과 보고
         ── 커밋&푸시 여부 확인 ──  ← ok 시 git add + commit + push
```

### code-review (리뷰)

```
Phase 1  기획 의도 파악 (핵심 동작 / 데이터 흐름 / 엣지케이스)
Phase 2  코드 절충 검토 (일치 / 불일치 / 코드에만 존재)
Phase 3  연결 도메인 나열 (영향 판단은 사용자 몫)
Phase 4  잠재적 에러 진단 [치명 / 주의 / 확인]
```

---

## 사용법

### 1. 프로젝트에 적용

```bash
# .claude/ 폴더와 컨벤션 문서를 프로젝트 루트에 복사
cp -r harness_global/.claude /your-project/
cp harness_global/REACT_NEXT_CONVENTIONS.md /your-project/

# CLAUDE.md는 프로젝트의 기존 CLAUDE.md에 내용을 합치거나 새로 생성
cp harness_global/CLAUDE.md /your-project/CLAUDE.md
```

### 2. 개발 명령 (frontend-dev 트리거)

#### 레벨 + 기능 명시 (권장)

```
low: 버튼 텍스트 바꿔줘
mid: 상품 목록 페이지 만들어줘
high: 결제 플로우 전체 만들어줘
```

#### 상세 설명 포함

```
mid: 장바구니 기능 추가해줘
     - useCart 훅 필요
     - POST /api/cart 연동
     - CartIcon에 뱃지 표시
```

#### 레벨 없이 (haiku 기본값)

```
유저 카드 컴포넌트 만들어줘
로그인 페이지 추가해줘
```

#### 버그 수정

```
버그 고쳐줘 — UserCard에서 undefined 터져
에러 수정해줘 — 로그인 후 리다이렉트 안 돼
```

#### 재실행 / 부분 수정

```
다시 해줘
아까 거 수정해줘 — API 엔드포인트 바꿔줘
구현 수정해줘 — 응답 타입 바뀌었어
```

### 3. 리뷰 명령 (code-review 트리거)

```
리뷰해줘
코드 검토해줘
기획이랑 맞는지 봐줘
기획 의도랑 어긋난 거 있어?
components/UserCard.tsx 확인해봐
```

### 4. 기획 레벨 기준

| 레벨 | 모델 | 적합한 작업 |
|------|------|------------|
| `low:` | haiku | 단일 파일 수정, 스타일 변경, 텍스트 수정 |
| `mid:` | sonnet | 훅 + 서비스 + 컴포넌트 1~2개 |
| `high:` | opus | 신규 페이지, 다수 컴포넌트, 모델 설계 포함 |
| (없음) | haiku | 기본값 |

---

## 기술 스택

| 영역 | 선택 |
|------|------|
| 프레임워크 | Next.js 15+ (App Router) |
| 언어 | TypeScript strict |
| 스타일 | Tailwind CSS + shadcn/ui |
| 서버 상태 | TanStack Query v5 |
| 아키텍처 | MVVM |
| 컨벤션 기준 | Next.js 공식 문서 + Vercel Best Practices |
