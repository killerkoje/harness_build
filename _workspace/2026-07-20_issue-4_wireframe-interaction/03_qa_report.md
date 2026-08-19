# QA 리포트

## 결과: PASS

## 스펙 성공 조건 대비 검증 (독립 재검증, implementer 보고 그대로 신뢰하지 않고 재실행)

1. **인터랙션 스크립트 실행 가능성**
   - issue_id=12(project 4 "로그인") 실제 DB 데이터에서 `<script>` 블록을 직접 재추출해 확인: `getElementById('email'/'pw'/'loginBtn'/'msg')`, `input`/`click` 이벤트, disabled/style 토글, `msg.style.display` 노출 — form 태그, popup, same-origin 필요 요소 없음.
   - 4개 element id 모두 `<script>` 태그보다 앞선 위치(email@235, pw@489, loginBtn@639, msg@804 vs script@895)에 존재 — DOM 파싱 순서상 스크립트 실행 시점에 요소가 이미 존재함을 바이트 오프셋으로 확인.
   - 결론: `srcDoc` + `sandbox="allow-scripts"` 그대로 인터랙션이 동작함. 코드 수정 불필요 — ScreenPreview.tsx 변경 없음은 타당.

2. **좌측 정렬**
   - `WireframeBoard.tsx:34` git diff 확인: `max-w-5xl mx-auto` → `max-w-5xl` (mx-auto 제거). *(사용자가 직접 제거한 변경으로 확인됨.)*
   - 렌더링된 페이지에서 `max-w-5xl space-y-4 sm:space-y-5` 로 노출, `mx-auto` 미검출.

3. **두 진입 경로 동일성**
   - Path A `/projects/4/wireframe?issueId=12` (이슈 탭 라우팅과 동일 URL 패턴): HTTP 200, script 내용(`getElementById` ×5, `loginBtn` ×3) 렌더 페이로드에 포함 확인.
   - Path B `/projects/4/wireframe` (와이어프레임 탭 목록): HTTP 200, "로그인" 항목이 `?issueId=12`로 연결됨 확인. 두 경로가 동일 컴포넌트로 수렴하므로 A에서 확인된 인터랙션이 B에서도 동일하게 적용됨.

4. **회귀 — project 1(구형, script 없음)**
   - `/projects/1/wireframe?issueId=1`: HTTP 200, 에러 배너 없음, "로그인" 화면명 정상 렌더.

5. **타입체크**
   - `npx tsc --noEmit` (apps/issue-board): 에러 없음.

## 미해결/한계
- 이 환경에 헤드리스 브라우저(chromium-cli, playwright 등)가 없어 iframe 내부 실제 클릭 이벤트 발생 → 버튼 색 변화까지의 "눈으로 보는" 시각적 확인은 수행하지 못함. 대신 (a) 데이터 파이프라인이 스크립트를 원본 그대로 전달함을 SSR 페이로드 레벨에서 확인, (b) 스크립트 로직 자체를 직접 읽어 DOM 셀렉터·이벤트·엘리먼트 존재 순서를 코드/데이터 레벨에서 검증하는 방식으로 대체했다. 브라우저에서 실제로 열어보는 것은 사용자가 마지막으로 확인 가능.

## 판정
스펙의 성공 조건 3가지(인터랙션 동작 가능성, 좌측 정렬, 두 경로 동일성) 모두 충족. 회귀 없음. **PASS.**
