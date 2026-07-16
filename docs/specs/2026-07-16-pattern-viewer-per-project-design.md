# 패턴뷰어 프로젝트별 분리 설계 스펙

**날짜:** 2026-07-16
**상태:** 승인됨

---

## 배경

`harness_global`의 패턴 시스템은 `.harness/patterns/{team,local}/*.yaml`을 각 프로젝트 체크아웃(rootPath) 밑에 두는 구조라, **파일 저장 자체는 이미 프로젝트별로 분리**돼 있다. `pattern-extractor`/`pattern-promoter` 에이전트도 실행 중인 세션의 cwd(=해당 프로젝트 루트) 기준으로 정확한 경로에 쓴다.

문제는 **소비(읽기) 쪽**이다. `apps/pattern-viewer`는 단일 Next.js 프로세스로 떠서, `PATTERNS_DIR` 환경변수 하나로 고정된 디렉토리만 읽는다(`.env.local`에 특정 프로젝트 경로가 하드코딩돼 있음). `apps/issue-board`의 프로젝트 대시보드에 있는 "패턴확인" 버튼(`ProjectQuickLinks.tsx`)은 `projectId`를 이미 props로 갖고 있음에도 그걸 안 쓰고 항상 같은 정적 URL(`http://localhost:3100`)로만 연결한다.

결과적으로 issue-board 대시보드에서 어느 프로젝트를 보고 있든 "패턴확인"을 누르면 **항상 같은(고정된 PATTERNS_DIR의) 패턴**이 뜬다 — 프로젝트 1에서 저장한 패턴이 프로젝트 4에서도 그대로 보이는 것처럼 느껴지는 원인이다.

## 목표

- issue-board 대시보드의 "패턴확인" 버튼이 **지금 보고 있는 프로젝트의 패턴만** 보여주게 한다
- pattern-viewer가 `issue-board-mcp`의 `Project.id`를 기준으로 어떤 프로젝트의 `.harness/patterns`를 읽을지 결정하게 한다
- `.harness/patterns/` 파일 구조, `pattern-extractor`/`pattern-promoter` 에이전트, `PatternViewer.tsx`/`loadPatterns()`의 병합 로직은 **그대로 둔다** — 이미 올바르게 프로젝트별로 동작하고 있다

## 범위 밖

- `.harness/patterns/` 파일 스키마 변경 (예: YAML에 `projectId` 필드 추가) — 파일시스템 경로 자체가 이미 프로젝트 구분자 역할을 하므로 불필요
- `pattern-extractor.md`/`pattern-promoter.md` 에이전트 수정 — 이미 cwd 기준으로 올바른 프로젝트에 쓰고 있음
- 여러 프로젝트의 패턴을 한 화면에서 비교/통합해서 보여주는 기능
- pattern-viewer에 자동화 테스트 프레임워크 신규 도입 (기존에도 테스트 없는 앱 — 이번에도 수동 검증으로 충분)

---

## 아키텍처

```
issue-board 대시보드 "패턴확인" 클릭
  → http://localhost:3100/patterns?projectId=4
  → pattern-viewer(서버 컴포넌트)가 issue-board-mcp REST GET /api/projects/4 호출
  → rootPath 확보
  → loadPatterns(`${rootPath}/.harness/patterns`) — 기존 함수 그대로 재사용
  → 기존 PatternViewer.tsx로 렌더
```

`projectId` 쿼리 파라미터가 없이 pattern-viewer에 직접 접속하면(북마크, URL 직접 입력 등), issue-board-mcp `GET /api/projects`로 전체 프로젝트 목록을 가져와 선택 화면을 보여주고, 하나를 고르면 `?projectId=`가 붙은 URL로 이동한다.

두 앱(`issue-board`, `pattern-viewer`)은 이미 로컬에서 함께 뜨는 걸 전제로 하므로(`start:all` 스크립트에 셋 다 포함), pattern-viewer가 issue-board-mcp REST를 직접 호출하는 데 별도 인증/네트워크 이슈는 없다.

## 컴포넌트

| 파일 | 변경 | 역할 |
|---|---|---|
| `apps/pattern-viewer/src/lib/issue-board-client.ts` | 신규 | issue-board-mcp REST 호출 래퍼 — `fetchProject(id)`, `fetchProjects()` |
| `apps/pattern-viewer/src/app/patterns/page.tsx` | 수정 | `searchParams.projectId` 분기 — 있으면 프로젝트 조회 후 패턴 로드, 없으면 선택 화면 |
| `apps/pattern-viewer/src/components/ProjectPicker.tsx` | 신규 | 프로젝트 목록을 링크 카드로 렌더 (각 카드가 `?projectId=`로 이동) |
| `apps/issue-board/src/components/ProjectQuickLinks.tsx` | 수정 | "패턴확인" 링크에 `?projectId=${projectId}` 추가 |
| `apps/pattern-viewer/src/lib/patterns.ts`, `src/components/PatternViewer.tsx` | 변경 없음 | 기존 병합/렌더 로직 그대로 재사용 |

`issue-board-client.ts`는 `apps/issue-board/src/lib/api.ts`의 `fetchProjects`/기존 fetch 패턴과 동일한 스타일(간단한 `fetch` + JSON 파싱, 별도 상태관리 라이브러리 없음)을 따른다. pattern-viewer 쪽 issue-board-mcp base URL은 새 환경변수 `ISSUE_BOARD_API_URL`(서버 컴포넌트 전용, 기본값 `http://localhost:4000`)로 설정한다.

## 데이터 흐름

1. `patterns/page.tsx`가 `searchParams`에서 `projectId` 읽음
2. `projectId` 있음 → `fetchProject(projectId)` → `{ id, rootPath, name, ... }` 획득 → `loadPatterns(path.join(rootPath, '.harness/patterns'))` 호출 → 기존 `PatternViewer` prop으로 전달, 상단에 프로젝트 이름 표시
3. `projectId` 없음 → `fetchProjects()` → `ProjectPicker`에 전체 목록 전달, 각 항목 클릭 시 `?projectId=`로 이동

## 에러 처리

- issue-board-mcp 연결 실패(fetch reject/네트워크 에러): 페이지 전체가 죽지 않고 에러 배너만 표시 (issue-board의 `ConnectionErrorBanner`와 동일한 패턴 — try/catch로 감싸고 실패 시 안내 문구만 렌더)
- `fetchProject(projectId)`가 404: `ProjectPicker` 화면으로 폴백하면서 "프로젝트를 찾을 수 없습니다" 안내 문구 추가
- 프로젝트는 존재하지만 `rootPath`에 `.harness/patterns`가 없음(하네스 미설치 프로젝트): `loadPatterns`가 디렉토리 부재를 에러 없이 빈 배열로 처리하는지 구현 단계에서 `patterns.ts` 코드를 직접 확인하고, 방어 로직이 없다면 그 함수 안에서 최소한으로 보강한다 (범위 밖에서 정한 "파일 스키마 변경 없음"과는 무관 — 순수 에러 방어 코드).

## 테스트

- pattern-viewer는 기존에 자동화 테스트가 없는 앱 — 이번에도 새 테스트 프레임워크는 도입하지 않는다
- 수동 브라우저 검증 시나리오 3가지:
  1. 서로 다른 두 프로젝트(A, B)에서 각각 "패턴확인" 클릭 → 다른 프로젝트의 `.harness/patterns` 내용이 보이는지
  2. `.harness/patterns`가 없는(하네스 미설치) 프로젝트에서 "패턴확인" 클릭 → 빈 상태가 에러 없이 렌더되는지
  3. `projectId` 쿼리 없이 `http://localhost:3100/patterns` 직접 접속 → 프로젝트 선택 화면이 뜨는지, 하나 선택 시 정상 이동하는지
