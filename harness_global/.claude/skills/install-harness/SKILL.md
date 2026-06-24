---
name: install-harness
description: |
  아래 조건 중 하나라도 해당하면 반드시 이 스킬을 사용하라.

  하네스 설치해줘, 하네스 구축해줘, 하네스 적용해줘, 하네스 셋업해줘,
  install harness, setup harness, 하네스 넣어줘, 하네스 복사해줘
---

# 하네스 설치 오케스트레이터

이 스킬은 `harness_build` 레포의 하네스 파일을 대상 프로젝트에 설치한다.

## 워크플로우

### Step 1: 설치 경로 확인

사용자에게 대상 프로젝트 경로를 묻는다:

```
어느 프로젝트에 설치할까요?
경로를 입력해 주세요. (예: /Users/me/my-project)
현재 디렉토리에 설치하려면 그냥 ok 입력
```

> 사용자가 ok/ㅇㅋ/현재/여기 등으로 응답하면 현재 작업 디렉토리(`pwd`)를 대상 경로로 사용한다.
> 경로를 직접 입력하면 그 경로를 대상으로 사용한다.

### Step 2: 경로 존재 여부 확인

대상 경로가 실제로 존재하는지 확인한다:

```bash
ls {TARGET_PATH}
```

경로가 없으면 사용자에게 알리고 다시 입력을 요청한다.

### Step 3: harness_build 루트 경로 확인

이 스킬 파일의 위치를 기준으로 `harness_build` 루트를 찾는다.
`harness_global/` 디렉토리가 있는 곳이 루트다.

### Step 4: 파일 설치

아래 순서로 파일을 복사한다:

```bash
# 1. core .claude/ 폴더 복사 (스택 무관 오케스트레이터 + 공통 에이전트)
cp -r {HARNESS_ROOT}/harness_global/.claude {TARGET_PATH}/

# 1-1. stack 전용 에이전트 복사 (기본값: next)
cp {HARNESS_ROOT}/harness_global/stacks/next/agents/* {TARGET_PATH}/.claude/agents/

# 2. stack 컨벤션 문서 복사
cp {HARNESS_ROOT}/harness_global/stacks/next/REACT_NEXT_CONVENTIONS.md {TARGET_PATH}/
cp {HARNESS_ROOT}/harness_global/stacks/next/CSS_CONVENTIONS.md {TARGET_PATH}/

# 3. CLAUDE.md 처리
#    - 대상에 CLAUDE.md가 없으면: 그냥 복사
#    - 대상에 CLAUDE.md가 있으면: 기존 파일 끝에 하네스 내용 append

# 4. harness.config.yaml 생성 (없는 경우만)
cp {HARNESS_ROOT}/harness_global/harness.config.yaml {TARGET_PATH}/

# 5. 버전 기록
cat {HARNESS_ROOT}/harness_global/VERSION > {TARGET_PATH}/.harness-version

# 6. Cursor 룰 복사 (.cursor/ 디렉토리가 있는 경우만)
if [ -d {TARGET_PATH}/.cursor ]; then
  cp -r {HARNESS_ROOT}/harness_global/cursor/* {TARGET_PATH}/.cursor/rules/
fi
```

CLAUDE.md append 방법:
```bash
# 기존 파일이 있는 경우
echo "" >> {TARGET_PATH}/CLAUDE.md
echo "---" >> {TARGET_PATH}/CLAUDE.md
cat {HARNESS_ROOT}/harness_global/CLAUDE.md >> {TARGET_PATH}/CLAUDE.md
```

### Step 5: 설치 완료 보고

```
## 하네스 설치 완료

설치 경로: {TARGET_PATH}

설치된 파일:
[core]
- .claude/skills/frontend-dev/     ← 개발 파이프라인 스킬
- .claude/skills/code-review/      ← 리뷰 스킬 (PR diff 리뷰 포함)
- .claude/skills/install-harness/  ← 설치 스킬 (이 파일)
- .claude/agents/test-writer.md    ← 테스트 선행 생성 에이전트 (Phase 1.5)
- .claude/agents/qa-validator.md   ← QA 에이전트 (Phase 3)

[stack: next]
- .claude/agents/code-analyzer.md  ← Next.js 분석 에이전트 (Phase 1)
- .claude/agents/implementer.md    ← MVVM 구현 에이전트 (Phase 2)
- REACT_NEXT_CONVENTIONS.md        ← Next.js 컨벤션 문서
- CSS_CONVENTIONS.md               ← CSS/Tailwind 스타일 규칙

[공통]
- CLAUDE.md                        ← 트리거 정의 (기존 파일에 추가됨)
- harness.config.yaml              ← 프로젝트별 하네스 설정
- .harness-version                 ← 설치된 하네스 버전

[Cursor — .cursor/ 디렉토리가 있을 때만]
- .cursor/rules/react-next.mdc     ← Next.js App Router 규칙
- .cursor/rules/css.mdc            ← CSS/Tailwind 규칙
- .cursor/rules/mvvm-tdd.mdc       ← MVVM + TDD 원칙

이제 해당 프로젝트에서 Claude Code를 열고 아래 명령을 사용하세요:

  low/mid/high: [기능 설명]    ← 개발 파이프라인
  리뷰해줘                     ← 코드 리뷰
```

## 에러 핸들링

- **경로 없음**: 다시 입력 요청
- **권한 없음**: `sudo cp` 또는 수동 복사 안내
- **이미 .claude/ 존재**: 덮어쓸지 사용자에게 확인 후 진행
