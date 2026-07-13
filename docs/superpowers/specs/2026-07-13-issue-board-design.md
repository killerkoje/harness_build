# Issue Board 설계 스펙

**날짜:** 2026-07-13
**상태:** 승인됨

---

## 배경

harness_build의 1차 목표는 **기획 / 이슈 / 와이어프레임을 확인 가능한 대시보드**이고, 실제 코드 구현(개발)은 2차 목표로 그 뒤에 조건부로 들어간다. 팀 코드 패턴 확인은 개발 시점(2차)에 4번째 탭으로 합류하며, 기존 `.harness/patterns/{team,local}` 구조를 그대로 재사용한다 — 이번 스펙 범위 밖.

기존 `apps/harness-hub`(Next.js, :3001)는 `.harness/issues/*.yaml`, `_workspace/*/01_spec.md` 등을 파일에서 직접 읽는 read-only 뷰어였다. 이슈 진단 결과 다음 문제가 있었다:
- 이슈 야멀 파싱에 방어 코드가 없어 파일 하나만 깨져도 이슈 탭 전체가 죽음
- 화면(와이어프레임) 탭이 실제 레이아웃이 아니라 스펙/구현 마크다운 본문을 정규식으로 긁은 파일경로 목록에 불과함 — 구조화 계약이 없어 fragile
- install.sh 기본 `.gitignore`가 `.harness/docs/`(기획 원본)를 커밋 대상에서 빼서 기획 탭이 팀 공유가 안 됨

이번 issue-board는 harness-hub를 대체하며 위 문제를 구조적으로 해소한다.

---

## 목표

- 기획(`/ib-plan`) → 와이어프레임(`/ib-wireframe`) → 이슈(자동 생성) 를 하나의 탭 대시보드에서 확인
- 이슈 단위로 "개발 승인" 게이트를 걸어, 승인된 이슈만 기존 dev 파이프라인(Phase 0~5)으로 핸드오프
- 데이터는 구조화 스키마로 저장 — 렌더링 시점에 자유 텍스트를 파싱하지 않는다

---

## 아키텍처

```
apps/issue-board/          Next.js (React) — 대시보드, :5173
apps/issue-board-mcp/      Node/TS — MCP 서버 + REST API, :4000, SQLite
```

한 서버 프로세스(`apps/issue-board-mcp`, :4000)가 두 인터페이스를 노출한다:

- **MCP 프로토콜** (`/mcp`) — Claude Code의 `/ib-plan`, `/ib-wireframe`, `/ib-issues` 커맨드가 호출 (에이전트 전용)
- **REST API** (`/api/*`) — Next.js 대시보드가 읽기/쓰기에 사용 (사람이 브라우저에서 조회, "개발 승인" 버튼 등)

두 인터페이스는 같은 SQLite 파일을 공유한다. MCP 프로토콜은 에이전트-툴 호출 용도라 브라우저가 직접 소비하기 부적합하므로, 대시보드는 평범한 REST로 같은 데이터를 본다.

기존 `apps/harness-hub`는 폐기한다. 유일하게 재사용 가치가 있는 `patterns.ts`(`.harness/patterns/{team,local}` 읽기 로직)만 issue-board의 4번째 탭(패턴, 이번 스펙 범위 밖)에 포팅할 후보로 남겨둔다.

---

## 데이터 모델 (SQLite, `apps/issue-board-mcp`)

| 테이블 | 주요 필드 | 비고 |
|---|---|---|
| `projects` | id, root_path, name | issue-board가 관리하는 프로젝트 루트 |
| `plans` | id, project_id, title, sections(JSON), status(draft/approved) | sections = 개요/타깃/MVP기능표/범위밖 구조화 필드 |
| `plan_snapshots` | id, plan_id, label, content(JSON), created_at | `status=approved` 전환 시 자동 1개 + `snapshot_plan` 수동 호출 |
| `issues` | id, project_id, plan_id, title, priority, description, status | status: `planned → wireframed → dev_approved` (되돌아가 재승인 가능), plan의 MVP 기능표 각 행에서 생성 |
| `wireframes` | id, issue_id, screens(JSON) | `screens: [{name, route, layout: {regions: [{type, label}]}}]` — 정규식 파싱이 아니라 `/ib-wireframe`이 이 구조를 직접 채워 저장 (박스형 렌더링, "화면 카드 목록형"이 아닌 "실제 레이아웃 미리보기" 방식으로 확정) |

이슈 ID는 **프로젝트 내에서** issue-board가 발급하는 것이 canonical이며(기존 dev 파이프라인과 동일하게 이슈 번호는 프로젝트마다 독립), 개발 승인 시 기존 `.harness/issues/{같은 ID}.yaml`이 그대로 재사용한다 (새로 채번하지 않음).

---

## 데이터 흐름

1. `/ib-plan` 실행 → MCP `create_plan`/`update_plan` 호출 → `plans` 테이블 갱신 + 로컬 백업 `.harness/docs/plan-{planId}.md` 동시 저장 (서버 장애/마이그레이션 대비 이중화)
2. 기획 승인 시 MVP 기능표 각 행 → MCP `create_issues_from_plan` → `issues` 레코드 N개 생성 (status=`planned`)
3. `/ib-wireframe` 실행 → 이슈별 화면 레이아웃(JSON, 위 스키마) 채움 → `wireframes` 저장, 해당 이슈 status → `wireframed`
4. 대시보드 와이어프레임 탭에서 "개발 승인" 클릭 → `POST /api/issues/:id/approve` → status → `dev_approved` + **`.harness/issues/{id}.yaml`을 기획+와이어프레임 내용으로 로컬 시딩**. 이 시딩 파일이 issue-board와 기존 dev 파이프라인을 잇는 유일한 연결점이며, 이후 실제 개발(Phase 0~)은 MCP 서버가 떠 있지 않아도 진행 가능하다.
5. "보류"는 별도 상태값이 아니라 그냥 `wireframed`에 머무르는 것 — 언제든 재승인 가능해야 하므로 거부(rejected) 상태를 따로 두지 않는다.

---

## 에러 처리

- MCP 서버 다운 상태에서 `/ib-plan` 등 커맨드 실행 → 실패 안내 후 종료. 이 시점엔 기획서가 아직 로컬에 없으므로 사용자에게 재시도를 유도한다 (자동 재시도 없음).
- 대시보드는 REST 호출 실패 시 "연결 안 됨" 배너만 띄우고 앱 자체는 죽지 않는다 (정적 셸은 항상 렌더).
- 이미 `dev_approved`인 이슈에 승인 API를 다시 호출해도 멱등하게 동작한다 (파일 재시딩만 수행, 에러 아님).

---

## 테스트

- MCP 서버: `create_plan`/`update_plan`/`snapshot_plan`/`create_issues_from_plan`/`approve` 각 tool 단위 테스트, SQLite 인메모리 DB 사용
- 대시보드: REST 클라이언트 함수 위주 스모크 테스트. 브라우저 E2E는 이번 스펙 범위 밖

---

## 범위 밖 (이번 스펙에 포함하지 않음)

- 팀 코드 패턴 탭 (개발 시점 2차 작업, 기존 `.harness/patterns/{team,local}` 구조 그대로 재사용 예정)
- 기존 dev 파이프라인(Phase 0~5) 자체의 변경 — `.harness/issues/{id}.yaml` 시딩 포맷을 읽을 수 있도록 Phase 0에 소폭 확장만 필요 (구현 계획 단계에서 범위 확정)
- harness-hub의 `patterns.ts` 포팅 (패턴 탭 작업 시점으로 이연)
