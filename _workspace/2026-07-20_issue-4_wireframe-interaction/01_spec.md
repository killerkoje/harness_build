---
issue_id: 4
parent_run_id: null
kind: initial
title: 와이어프레임 화면 프리뷰 인터랙션 + 좌측 정렬
---

# TDD 스펙 초안

## 감지된 스택
- stack: next (App Router, apps/issue-board)
- 레이어 순서: components (ScreenPreview.tsx, WireframeBoard.tsx) — 신규 types/services/hooks 불필요 (데이터 흐름 확인 결과 기존 타입/API로 충분)
- 테스트 프레임워크: vitest — 현재 프론트에는 lib 유닛 테스트만 존재(plan-rounds.test.ts, api.test.ts), 컴포넌트/UI 테스트는 없음 (확인 완료)

## patterns_applied
- 없음 (관련 team/local 패턴 없음)

## 기능
- 무엇을 만드는가: 와이어프레임 화면 프리뷰 iframe이 스크립트를 포함한 최신 wireframe html을 실제로 인터랙티브하게 렌더링함을 검증하고, WireframeBoard 컨테이너를 다른 탭과 일관되게 좌측 정렬로 변경한다.
- 성공 조건:
  1. project 4 issue #1 "로그인"(issue_id 12) 화면 iframe 안에서 script가 실행되어, 이메일+비밀번호 입력 시 로그인 버튼이 비활성(#ccc)→활성(#4F46E5)으로 바뀌고, 클릭 시 msg 요소가 display:block 으로 노출된다.
  2. WireframeBoard 최상위 컨테이너에서 `mx-auto`가 제거되어 프리뷰가 페이지 좌측에 붙는다(IssueList/WireframeList와 동일한 좌측 정렬).
  3. 위 1, 2가 "와이어프레임 라우팅"(이슈 탭 경유)과 "와이어프레임 탭"(목록 경유) 두 진입 경로 모두에서 동일하게 확인된다.
- 예외/엣지케이스:
  - script 없는 구형 wireframe(project 1, issue 1~8)은 인터랙션 없이 정적으로만 렌더링되면 됨 (에러 없이 표시). 이건 정상 동작.
  - screens.length === 0 인 경우 기존대로 "아직 와이어프레임이 없습니다" 안내 유지.
  - 화면 탭 전환 시 iframe이 remount되어 이전 화면의 입력/토글 상태가 초기화됨 — 의도된 동작(화면별 독립 상태).

## 데이터
- 변경 없음. 프론트 컴포넌트/스타일 레벨만 수정. API(fetchWireframe)·타입(WireframeScreen: name/route/html)·DB 스키마 모두 그대로. html은 api.ts에서 sanitize 없이 그대로 전달되며(확인 완료), srcDoc까지 원본 유지됨.

## 구현 범위
### 신규 생성
- 없음

### 수정
- `apps/issue-board/src/components/WireframeBoard.tsx` 34번째 줄:
  `className="w-full min-w-0 max-w-5xl mx-auto space-y-4 sm:space-y-5"`
  → `mx-auto` 제거: `className="w-full min-w-0 max-w-5xl space-y-4 sm:space-y-5"`
  (max-w-5xl은 프리뷰 폭 확보를 위해 유지)
- `apps/issue-board/src/components/wireframe-preview/ScreenPreview.tsx` (인터랙션):
  - 조사 결과 현재 iframe(59~65줄)은 `srcDoc={screen.html}` + `sandbox="allow-scripts"` 로 이미 인라인 스크립트가 실행 가능한 구성임. 코드 레벨에서 스크립트를 막는 요소(sanitize/CSP/누락된 sandbox 플래그) 없음.
  - 따라서 인터랙션을 "동작시키기 위한" 코드 수정은 원칙적으로 불필요할 가능성이 높음. **먼저 수동 브라우저 검증으로 실제 동작을 확인**하고, 만약 특정 wireframe이 실제 `<form>` submit이나 팝업/모달 기반 인터랙션을 필요로 해 막히는 경우에 한해 sandbox에 `allow-forms`(폼 제출 필요 시)만 최소 추가 검토. `allow-same-origin`은 보안상 추가하지 말 것(opaque origin 유지).

## 기존 패턴
- 레이어 구조: page(server component, fetch) → Board/List(client/presentational) → ScreenPreview(client). 데이터는 lib/api.ts의 fetch 함수로만 취득.
- 파일명 규칙: 기존 컴포넌트는 PascalCase.tsx (WireframeBoard.tsx, ScreenPreview.tsx). 이번 변경에서 리네이밍하지 않음(범위 밖).
- 좌측 정렬 컨벤션: IssueList.tsx(60줄 `max-w-2xl`)·WireframeList.tsx(20줄 `max-w-2xl`) 모두 `mx-auto` 없이 좌측 정렬. WireframeBoard만 `max-w-5xl mx-auto`로 중앙 정렬된 유일한 예외 → 이를 컨벤션에 맞춤.

## 테스트 전략
- SKIP_TESTS: true
  근거: 순수 UI/스타일 + iframe 렌더링 동작 변경. 컴포넌트/UI 테스트 인프라가 저장소에 없고(vitest는 lib 유닛만), 저장소 관례상 UI 변경은 자동화 테스트 대신 수동 브라우저 검증으로 마무리함.
- 수동 브라우저 검증 절차:
  1. (사전) MCP API 서버(BASE_URL 기본 http://localhost:4000)와 issue-board Next 앱을 기동.
  2. curl로 확인 가능한 부분(데이터 파이프라인이 script를 보존하는지):
     `curl -s http://localhost:4000/api/issues/12/wireframe | grep -c '<script'` → 1 이상이면 API가 script 포함 html을 그대로 전달함을 확인(브라우저 없이 검증 가능).
  3. 반드시 브라우저(또는 헤드리스)에서 확인해야 하는 부분(iframe 안 script 실제 실행):
     a. project 4 → 이슈 탭 → issue #1 "로그인" → "와이어프레임 보기 →" 클릭 (경로 A). 로그인 화면 iframe에서 이메일/비밀번호 입력 시 버튼 색 변화 + 클릭 시 msg 노출 확인.
     b. project 4 → 와이어프레임 탭 → 목록에서 동일 이슈 클릭 (경로 B). 동일 인터랙션 재확인. (두 경로가 동일 컴포넌트를 쓰므로 결과가 같아야 함 — 실제로 같은지 확인.)
     c. 좌측 정렬: 두 화면 모두에서 프리뷰 컨테이너가 페이지 좌측에 붙는지 확인(수정 전/후 비교).
     d. 회귀: project 1(script 없는 구형) 화면이 에러 없이 정적으로 렌더되는지 확인.

## 주의사항
- srcDoc 재설정/iframe remount(key 변경) 시 화면별 상태가 초기화되는 것은 의도된 동작 — "버그"로 오인하지 말 것.
- `sandbox`에서 절대 `allow-same-origin`을 추가하지 말 것(신뢰되지 않은 생성 html이므로 opaque origin으로 격리 유지). 인터랙션이 동작하지 않아 보이는 대부분의 원인은 코드가 아니라 "해당 wireframe에 script가 없음"일 가능성이 높음(project 1이 그 케이스).
- 좌측 정렬 변경 시 헤더/승인 버튼(우측 정렬 self-start)과 화면 탭 스크롤 영역의 레이아웃이 넓은 화면에서 깨지지 않는지 확인.
- 이번 조사 결론상 인터랙션은 코드 수정 없이도 동작할 개연성이 큼. "무조건 코드부터 고치기" 전에 반드시 수동 검증(2,3단계)으로 현상을 먼저 재현/확인할 것.
