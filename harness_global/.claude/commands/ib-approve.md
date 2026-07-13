---
description: 이슈를 검토·확정하고 개발 착수를 승인한다 (게이트)
argument-hint: <이슈 번호>
---

너는 issue-board의 개발 승인 게이트를 수행하는 에이전트다. 이 커맨드는 코드를 작성하지 않고,
사람이 대시보드에서 검토를 마친 이슈에 대해 "개발 착수 승인"만 기록한다.

## 이슈 번호

$ARGUMENTS

## 진행 순서

### 1) 이슈 번호 확인

$ARGUMENTS에서 이슈 번호를 읽는다. 없거나 여러 개로 해석될 수 있으면 **추측하지 말고**
사용자에게 물어라: "승인할 이슈 번호가 무엇인가요?"

### 2) 승인 전 명시적 확인 (게이트)

이 커맨드는 자동 승인이 아니다. `approve_issue`를 호출하기 전에 반드시 `AskUserQuestion`으로
확인한다:

"대시보드(http://localhost:5173)에서 이슈 N번의 기획/와이어프레임을 확인하셨나요?
이 내용을 기반으로 코드 작성을 진행할까요?"

- 옵션: "예, 승인합니다" / "아니요, 더 수정하겠습니다"
- **"아니요"거나 애매하면 여기서 멈춘다.** `approve_issue`를 호출하지 않는다.

### 3) issueId 확인

`get_issue_by_number({ projectRoot, number })`로 표시 번호 → 내부 `issueId`를 조회한다.
도구가 실패하면 사용자에게 프로젝트 루트/번호를 확인하라고 안내하고 중단한다.

### 4) 승인 호출

확인이 끝나면 `approve_issue({ issueId })`를 호출한다.

- **성공** — 응답의 `status`가 `dev_approved`인지 확인하고 사용자에게 보고한다. 다음 단계를
  명확히 안내한다: "승인 완료. `.harness/issues/{번호}.yaml`이 시딩되었습니다. 이제 '이슈
  N번 개발해줘'라고 말씀하시면 기존 dev 파이프라인이 시작됩니다." 이 커맨드 자체는 dev
  파이프라인을 실행하지 않는다 — 승인과 핸드오프 파일 시딩까지만 한다.
- **실패(이슈 없음)** — 도구가 `isError: true`와 함께 not found를 반환하면
  이를 그대로 사용자에게 보고한다.

## 주의

- 이 커맨드는 issue-board MCP 서버(`http://localhost:4000/mcp`)에 의존한다.
- 주요 도구: `get_issue_by_number`, `approve_issue`, `list_issues`, `get_design_system`,
  `create_wireframe`, `sync_plan_issues`, `update_plan`, …
- 이 커맨드는 승인만 한다. 와이어는 `/ib-wireframe`, 개발은 "이슈 N번 개발해줘".
