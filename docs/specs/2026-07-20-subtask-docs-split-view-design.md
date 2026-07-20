# 하위 태스크 문서 — 전용 스플릿 뷰 설계

**목표:** 방금 구현한 "하위 태스크 행 문서 아이콘 → 고정 사이드바" 방식을 걷어내고, 사용자가 직접 만든 목업(`_tmp_subtask-docs-split.html`)을 참고해 이슈별 **전용 문서 화면**(좌: 하위 태스크 목록, 드래그 리사이저, 우: 문서 편집/미리보기)으로 교체한다.

**배경:** `docs/specs/2026-07-20-subtask-notes-design.md`로 구현한 사이드바 UI(`SubtaskNoteSidebar.tsx`, `IssueSubtasks.tsx`의 📄 버튼)를 사용자가 직접 만든 스플릿 뷰 목업으로 대체해달라고 요청함. 백엔드(DB 컬럼·모델·REST)와 프론트 API 클라이언트(`updateSubtask(id, { notes })`)는 이미 완성되어 있고 그대로 재사용한다 — 이번 작업은 UI 계층 교체만이다.

## 결정 사항 (사용자 확인 완료)

- **반영 범위**: 전용 페이지로 새로 만든다. 기존 이슈카드 확장식 사이드바/문서버튼은 **제거**하고, 이 화면이 문서 기능의 유일한 진입점이 된다.
- **진입점**: 이슈 카드에서 설명 문단 아래(방금 제거한 "와이어프레임 보기 →" 링크와 같은 자리)에 "문서 보기 →" 링크. 이슈 카드를 펼치지 않아도 바로 이동 가능.
- **좌측 하위 태스크 목록**: 읽기 전용. 상태(완료/미완료)는 정적 칩으로만 표시, 상태 변경·추가·삭제는 이 화면에서 하지 않는다(기존 이슈 목록 화면에서만). 클릭하면 그 하위 태스크의 문서만 선택된다.
- **우측 문서 패널**: 편집/미리보기 **탭** 전환(기존 사이드바처럼 세로로 나란히 쌓지 않음), 저장 버튼 + 상태 메시지("저장됨 ✓" / "수정됨"), `⌘/Ctrl+S` 저장 단축키.
- **리사이저**: 좌우 패널 너비를 드래그로 조절 가능 (목업과 동일한 컨셉).

## 라우팅

기존 와이어프레임 화면과 동일한 패턴을 따른다 — 새 폴더를 만들지 않고, 기존 `/projects/[id]/issues` 라우트에 `?issueId=` 쿼리 파라미터로 분기한다:

- `?issueId` 없음 → 기존 `IssueList` (이슈 목록)
- `?issueId` 있음 → 새 `IssueDocsBoard` (해당 이슈의 문서 스플릿 뷰), 서버 컴포넌트에서 `fetchIssue(issueId)` + `fetchSubtasks(issueId)`로 데이터 로드

## 컴포넌트 설계

### `IssueDocsBoard.tsx` (신규, client component)

Props: `projectId: number`, `issue: Issue`, `subtasks: Subtask[]`

- 상단: `← 이슈 목록` 링크(`/projects/{projectId}/issues`), `#{issue.number} {issue.title}` + 완료/미완료 칩
- 좌측 리스트: 각 하위 태스크 = 제목(완료면 취소선) + 상태 칩 + "문서 있음"/"문서 없음" 필(dot 표시), 클릭 시 `selectedId` 갱신
- 하위 태스크가 0개면: "하위 태스크가 없습니다" 안내만 표시(우측 패널 없음)
- 가운데 리사이저: `mousedown`으로 드래그 시작, `window`의 `mousemove`/`mouseup`으로 좌측 패널 너비(state, px) 갱신 — 컨테이너 기준 최소/최대값으로 clamp(예: 220px ~ 컨테이너 너비-320px)
- 우측 문서 패널:
  - `편집`/`미리보기` 탭 버튼 2개 (mode state)
  - 편집 탭: textarea, 값은 로컬 `draft` state(선택된 하위 태스크의 `notes`로 초기화)
  - 미리보기 탭: `react-markdown` + `remark-gfm` (기존 `SubtaskNoteSidebar`에서 쓰던 것과 같은 컴포넌트 오버라이드 재사용 가능, 다만 그 파일은 삭제되므로 새로 이 파일 안에 작성)
  - 저장 버튼: `draft`가 초기값과 다를 때만 활성화(dirty). 클릭 또는 `⌘/Ctrl+S` → `updateSubtask(selectedId, { notes: draft })` 호출 → 성공 시 로컬 `subtasks` 배열 갱신 + "저장됨 ✓" 표시, 실패 시 인라인 에러
  - 하위 태스크 전환 시: 편집 중인 미저장 draft가 있으면 `confirm()`으로 이동 확인(목업과 동일한 UX), 확인되면 새 하위 태스크의 `notes`로 `draft` 리셋 + 탭을 `편집`으로 되돌림

### 삭제/되돌리는 것

- `apps/issue-board/src/components/SubtaskNoteSidebar.tsx` — 삭제
- `apps/issue-board/src/components/IssueSubtasks.tsx` — 📄 버튼, `noteSubtaskId` state, `SubtaskNoteSidebar` import/렌더, 감싸던 `<div>` 래퍼를 모두 제거하고 원래(하위 태스크 체크리스트만 있는) 형태로 되돌린다. 상태 변경(`handleStatusChange`)·삭제·추가 로직은 그대로 유지.

### 새로 추가/수정하는 것

- `apps/issue-board/src/components/IssueList.tsx` — `projectId` prop을 다시 받고, 설명 문단 아래에 `문서 보기 →` 링크(`/projects/{projectId}/issues?issueId={issue.id}`) 추가
- `apps/issue-board/src/app/projects/[id]/issues/page.tsx` — `searchParams.issueId` 읽어서 분기, `IssueList`에 `projectId` 다시 전달
- `apps/issue-board/src/components/IssueDocsBoard.tsx` — 신규

## 스코프 제외

- 하위 태스크 CRUD를 이 화면에 넣지 않음(읽기 전용)
- 백엔드(DB/모델/REST) 변경 없음 — 이미 완성된 `notes` 필드 그대로 사용
- 문서 리비전 이력 없음(기존과 동일하게 최신 텍스트만 덮어쓰기)
- 목업의 `header`(프로젝트명 배지·안내문구)는 반영하지 않음 — 이미 `[id]/layout.tsx`가 프로젝트 사이드바/탭을 제공하므로 중복임

## 에러 처리

- 저장 실패: 우측 패널 하단에 인라인 에러, textarea 내용은 유지(재시도 가능)
- 존재하지 않는 `issueId`로 접근: `fetchIssue`가 던지는 예외를 `page.tsx`의 기존 `try/catch`가 잡아 `ConnectionErrorBanner` 표시(기존 와이어프레임 페이지와 동일한 처리)

## 테스트

- 컴포넌트 자동 테스트는 이 저장소 관례상 작성하지 않음(RTL 미사용) — 타입 체크 + 수동 브라우저 검증(Playwright)으로 확인
- 기존 `IssueSubtasks.tsx` 관련 로직(상태 변경/삭제/추가)은 되돌리는 것이라 별도 회귀 테스트 불필요(원래 동작으로 복귀)
