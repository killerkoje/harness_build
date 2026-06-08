# harness_build

React / Next.js 프로젝트 전용 Claude 하네스 — 기획 확인 → MVVM 구현 → TDD 검증 → 커밋 파이프라인

---

## 하네스 구조

```
harness_global/
├── CLAUDE.md                        ← 하네스 트리거 정의
├── REACT_NEXT_CONVENTIONS.md        ← 공식 문서 기반 코드 컨벤션 (에이전트 공통 참조)
└── .claude/
    ├── skills/
    │   ├── frontend-dev/SKILL.md    ← 기능 개발 오케스트레이터
    │   └── code-review/SKILL.md     ← 기획-코드 리뷰어
    └── agents/
        ├── code-analyzer.md         ← 코드베이스 분석
        ├── implementer.md           ← MVVM 구현
        └── qa-validator.md          ← TDD 검증 + 위험 진단
```

---

## 파이프라인 흐름

```
명령 입력
   ↓
[Phase 1] 코드 분석 → 기획 의도 요약 출력 → 사용자 확인 대기
   ↓ (ok)
[Phase 2] MVVM 구현: types → service → hooks → page/components
   ↓
[Phase 3] 타입 경계면 검증 + 컨벤션 위반 검사 + 위험 진단
   ↓
[Phase 4] 결과 보고 → 커밋&푸시 여부 확인
```

---

## 사용법

### 1. 프로젝트에 적용

`harness_global/.claude/` 폴더와 `harness_global/CLAUDE.md` 내용을 프로젝트 루트에 복사한다.

```bash
cp -r harness_global/.claude /your-project/
cp harness_global/REACT_NEXT_CONVENTIONS.md /your-project/
# harness_global/CLAUDE.md 내용을 프로젝트의 CLAUDE.md에 추가
```

### 2. 트리거 — `frontend-dev` (개발 파이프라인)

아래 패턴으로 명령하면 **기획 확인 → 구현 → 검증 → 커밋** 파이프라인이 자동 실행된다.

#### 기본 (레벨 없음 → haiku 모델)
```
유저 카드 컴포넌트 만들어줘
로그인 페이지 추가해줘
장바구니 기능 구현해줘
```

#### 레벨 명시 (권장)
```
low: 버튼 색상 바꿔줘          ← 단일 파일 수정 (haiku)
mid: 상품 목록 API 연결해줘    ← 훅 + 컴포넌트 (sonnet)
high: 결제 페이지 만들어줘     ← 신규 페이지 + 모델 설계 (opus)
```

#### 상세 설명 포함
```
mid: 장바구니 기능 추가해줘
     - useCart 훅 필요
     - POST /api/cart 연동
     - CartIcon에 뱃지 표시
```

#### 버그 수정
```
버그 고쳐줘 — UserCard에서 undefined 터져
에러 수정해줘 — 로그인 후 리다이렉트 안 돼
```

#### 재실행
```
다시 해줘
아까 거 수정해줘 — API 엔드포인트 바꿔줘
```

---

### 3. 트리거 — `code-review` (리뷰)

이미 구현된 코드에 대해 기획 의도와 코드 일치 여부를 4단계로 검토한다.

```
리뷰해줘
코드 검토해줘
기획이랑 맞는지 봐줘
components/UserCard.tsx 확인해봐
기획 의도랑 어긋난 거 있어?
```

---

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
| 언어 | TypeScript (strict) |
| 스타일 | Tailwind CSS + shadcn/ui |
| 서버 상태 | TanStack Query v5 |
| 아키텍처 | MVVM (types → services → hooks → view) |
