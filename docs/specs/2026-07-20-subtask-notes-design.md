# 하위 태스크 작업 로그(Notes) 설계

**목표:** 이슈 하위 태스크(`issue_subtasks`) 각 항목에 자유 형식 작업 로그(마크다운 텍스트)를 붙인다. 개발자가 하위 태스크를 진행/완료하면서 "무엇을 했는지, 어떤 이슈가 있었는지"를 남기는 사후 기록용이며, 사람이 대시보드에서 직접 작성한다 (AI 자동 생성 아님).

**배경:** `docs/plans/2026-07-16-issue-subtasks.md`로 구현된 하위 태스크(제목+완료여부만 있는 개발 체크리스트)에 문서화 기능을 얹어달라는 요청. "노션 문서처럼"이라는 표현이 나왔지만, 실제로는 노션 연동이 아니라 DB 컬럼에 마크다운 텍스트를 저장하고 프론트에서 렌더링하는 것으로 확인함 (아래 결정 사항 참고).

## 결정 사항 (브레인스토밍에서 확정)

- **용도**: 완료 후 작업 로그 / 기록 (사전 설계 스펙이나 자유 메모장이 아님)
- **작성자**: 사람이 대시보드에서 직접 작성 — `/ib-plan`이나 `add_subtasks` MCP 툴은 건드리지 않음
- **저장 형태**: 실제 `.md` 파일이 아니라 `issue_subtasks` 테이블의 `notes TEXT` 컬럼에 마크다운 원문을 그대로 저장. 프론트에서 이미 의존성으로 있는 `react-markdown`(`apps/issue-board/package.json`)으로 렌더링.
  - 파일시스템 `.md` 방식(경로만 DB에 저장)은 후보였으나, 파일 쓰기 권한/동시성/경로 충돌/서버 재배포 시 파일 유실 리스크 때문에 기각. 기존 스키마(`description`, `sections`, `screens` 등)도 전부 TEXT 컬럼이라 패턴 일관성도 있음.
- **UI 배치**: 체크리스트 행 안에 인라인으로 펼치지 않고, **사이드바(사이드패널)**로 분리해서 편집. 버튼 위치는 각 하위 태스크 행의 **상태 셀렉트(완료/미완료 드롭다운) 왼쪽**.
- **스코프 제외**: MCP `add_subtasks` 툴 변경 없음, 이슈 레벨 문서화 없음(하위 태스크 단위만), 리비전 이력 없음(최신 텍스트 덮어쓰기만)

## 현재 UI 구조 (2026-07-20 기준, 계획 문서 이후 변경됨)

`IssueSubtasks.tsx`의 하위 태스크 행은 최초 구현 계획(체크박스)과 다르게 이미 진화했다: `<li>` 안에 `제목 span (flex-1)` → `상태 select(완료/미완료 드롭다운)` → `삭제 × 버튼(hover 시에만 표시)` 순서로 배치되어 있다. 문서 버튼은 이 순서에서 **상태 select 바로 앞**에 끼워 넣는다: `제목 → 문서 버튼 → 상태 select → 삭제 ×`.

## 1. 데이터 모델

`apps/issue-board-mcp/src/db.ts`의 `issue_subtasks` 테이블에 컬럼 추가:

```sql
ALTER TABLE issue_subtasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''
```

기존 `notion_page_id`/`dev_url` 추가 때와 동일하게 `CREATE TABLE IF NOT EXISTS` 이후 `PRAGMA table_info` 체크 후 조건부 `ALTER TABLE`로 처리한다 (이미 있는 DB 파일에도 안전하게 적용되도록).

`apps/issue-board-mcp/src/types.ts`의 `Subtask` 인터페이스에 `notes: string` 추가.

## 2. 모델 함수 (`apps/issue-board-mcp/src/models/subtasks.ts`)

- `rowToSubtask`에 `notes: row.notes` 추가
- `createSubtask`는 `notes: ''`로 시작 (생성 시점엔 로그가 없음)
- `updateSubtask(db, id, fields: { title?: string; done?: boolean; notes?: string })` — 기존 부분 업데이트 패턴에 `notes?` 필드만 추가. SQL도 `notes = ?` 컬럼 추가.
- `createSubtasksBulk`는 변경 없음 (여전히 제목만 받아 빈 로그로 생성)

## 3. REST API (`apps/issue-board-mcp/src/rest/app.ts`)

새 라우트 없음. 기존 `PUT /api/subtasks/:id`의 body 파싱을 `{ title, done, notes }`로 확장하고 `updateSubtask` 호출에 그대로 전달.

## 4. 프론트 API 클라이언트 (`apps/issue-board/src/lib/api.ts`)

- `Subtask` 인터페이스에 `notes: string` 추가
- `updateSubtask(id, fields)`의 `fields` 타입에 `notes?: string` 추가 (별도 함수 신설 없이 기존 함수 재사용)

## 5. UI (`apps/issue-board/src/components/`)

- `IssueSubtasks.tsx`의 각 행에서 `제목 span` 뒤, 상태 `select` 앞에 로그 아이콘 버튼(예: 📄) 추가. `notes`가 비어있지 않은 항목은 아이콘 색을 다르게 표시해 "기록 있음"을 한눈에 구분. 기존 삭제 버튼처럼 `shrink-0`로 레이아웃 고정.
- 신규 `SubtaskNoteSidebar.tsx`: 아이콘 클릭 시 화면 오른쪽에서 슬라이드인하는 고정 사이드바로 오픈(모달 오버레이 아님 — 뒤 콘텐츠와 나란히 표시). 구성 — 상단에 대상 하위 태스크 제목, 마크다운 원문 편집 textarea, 저장 버튼, 하단 `react-markdown` 미리보기(또는 편집/미리보기 탭 전환). 저장 시 `updateSubtask(id, { notes })` 호출 후 부모(`IssueSubtasks`)의 `subtasks` 상태 갱신, 사이드바는 열어둔 채 유지(닫기는 별도 버튼/바깥 클릭).
- 사이드바 오픈/편집 상태는 `IssueSubtasks` 컴포넌트 로컬 상태로 관리 (선택된 subtask id + 편집 중 텍스트). 한 번에 하나의 사이드바만 열리며, 다른 행의 문서 버튼을 누르면 대상만 교체된다.

## 에러 처리

- 저장 실패(네트워크/서버 에러) 시 사이드바 내 인라인 에러 메시지 표시, 사이드바는 닫지 않고 재시도 가능하게 유지 (기존 `IssueSubtasks`의 토글/삭제 실패 처리와 동일한 패턴).
- 빈 문자열 저장은 정상 동작(로그 지우기)으로 취급 — 별도 검증 없음.

## 테스트

- 모델: `updateSubtask`가 `notes`를 부분 업데이트하는 테스트 (title/done과 독립적으로 동작하는지, 기존 `subtasks.test.ts`의 "toggles done and updates title independently" 테스트와 같은 패턴으로 `notes` 케이스 추가)
- REST: `PUT /api/subtasks/:id`가 `notes`를 받아 반영하는 테스트 (`app.test.ts`)
- 프론트: `updateSubtask` 클라이언트 함수가 `notes` 필드를 포함해 호출하는 테스트 (`api.test.ts`)
- UI 수동 검증: 로그 아이콘 클릭 → 사이드바 오픈 → 텍스트 입력 → 저장 → 새로고침 후에도 유지되는지, 아이콘 표시가 로그 유무에 따라 바뀌는지, 다른 행의 아이콘을 눌렀을 때 사이드바 대상이 올바르게 교체되는지
