## 구현 완료 목록

### 신규 생성
- 없음

### 수정
- `apps/issue-board/src/components/WireframeBoard.tsx` 34번째 줄 — 최상위 컨테이너 `className`에서 `mx-auto` 제거. 변경 후: `className="w-full min-w-0 max-w-5xl space-y-4 sm:space-y-5"` (git diff로 반영 확인, `max-w-5xl`은 유지). 헤더 행(`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`)은 flex 정렬이 컨테이너 자체 엣지 기준이라 `mx-auto` 제거와 무관하게 정상. IssueList.tsx / WireframeList.tsx의 좌측 정렬 컨벤션과 일치.
- `apps/issue-board/src/components/wireframe-preview/ScreenPreview.tsx` — 변경 없음 — 검증 결과 코드 수정 불필요 확인. iframe은 `srcDoc={screen.html}` + `sandbox="allow-scripts"` 그대로 유지. `allow-same-origin` 등 추가 플래그 부여하지 않음(opaque origin 격리 유지).

## 검증 결과

### 스크립트 내용 분석 (issue_id=12, project 4 "로그인")
DB에서 실제 screens JSON을 추출해 `<script>` 블록을 읽음. 스크립트 동작:
- DOM 셀렉터: `getElementById('email')`, `getElementById('pw')`, `getElementById('loginBtn')`, `getElementById('msg')` — 전부 id 조회.
- 실행 시점: `<script>`가 해당 4개 요소들 **뒤에**(div 최하단) 위치. 따라서 스크립트 실행 시 대상 요소가 이미 파싱되어 존재. `DOMContentLoaded`/defer 불필요, 그대로 즉시 실행돼도 정상.
- 바인딩 이벤트: email/pw에 `input`, loginBtn에 `click`. 핸들러는 (a) 두 입력값 길이로 버튼 `disabled` 및 `style.background`(#ccc↔#4F46E5)·`cursor` 토글, (b) 클릭 시 `msg.style.display = 'block'`.
- sandbox 플래그 판단: `window.open`/`form.submit()`/`document.cookie`/`top.location`/팝업 **없음**. `<form>` 요소 자체가 없고 버튼도 form 밖의 일반 `<button>`이라 폼 제출 경로 없음 → `allow-forms`/`allow-popups`/`allow-same-origin` **불필요**. 순수 DOM 조작·인라인 이벤트뿐이므로 현재의 `allow-scripts` 단독으로 완전히 동작. **조사 결론(코드 수정 불필요)이 실제 데이터로 확인됨.**

### curl 검증 (실제 출력)
- 데이터 파이프라인 보존:
  - `curl -s http://localhost:4000/api/issues/12/wireframe | grep -c '<script'` → **1** (백엔드가 script 포함 html을 sanitize 없이 그대로 전달).
- 진입 경로 A (와이어프레임 라우팅, 이슈 탭 경유와 동일 URL 형태) `/projects/4/wireframe?issueId=12`:
  - HTTP **200**.
  - 렌더된 RSC 페이로드 내 `loginBtn` **4회**, `addEventListener` **6회**, `script` 문자열 **62회** 등장 → 스크립트 본문이 srcDoc까지 문자 그대로 보존됨(React JSON-escape 상태로 chunk에 실림).
- 진입 경로 B 수렴점 (와이어프레임 탭) `/projects/4/wireframe`:
  - HTTP **200**. 목록이 `wireframe?issueId=12` 링크를 포함(**2회**, "로그인"/issue #1 항목이 issueId=12로 연결) → 탭 경로도 동일 컴포넌트/동일 URL(`?issueId=12`)로 수렴함을 확인. 두 경로 모두 같은 WireframeBoard→ScreenPreview를 렌더하므로 인터랙션 결과 동일.
- 좌측 정렬 렌더 반영 (경로 A 출력):
  - `max-w-5xl mx-auto` 조합 **0회**, 렌더된 WireframeBoard wrapper 클래스는 `max-w-5xl space-y-4 sm:space-y-5`. 해당 페이지 전체 `mx-auto` 등장 **0회** → 제거가 렌더에 반영됨.
- 회귀 (project 1, script 없는 구형) `/projects/1/wireframe?issueId=1`:
  - HTTP **200**, `ConnectionErrorBanner` **0회**(500/에러 배너 없음), 화면 헤더 텍스트("화면 프리뷰 · ...") **1회** 노출 → 정적 렌더 정상, 회귀 없음.

### tsc --noEmit 결과
- `cd apps/issue-board && npx tsc --noEmit` → 에러 없음(TSC_OK). 타입 에러 0.

## 테스트 파일과 구현 일치 여부
(SKIP_TESTS: true — 해당 없음, 수동/curl 검증으로 대체)

## 미구현 항목
없음

## QA 검증 요청 사항
- curl/RSC 페이로드 레벨에서 script 보존·좌측 정렬·회귀는 모두 확인됨. 다만 iframe **내부에서 script가 실제로 실행되어 버튼 색 변화(#ccc→#4F46E5) 및 msg 노출**이 일어나는지는 실 브라우저(또는 헤드리스)에서 두 진입 경로(A: 이슈 탭→와이어프레임 보기, B: 와이어프레임 탭→목록)로 최종 시각 확인 권장. 정적 파이프라인 분석상 동작에 필요한 조건은 모두 충족.
