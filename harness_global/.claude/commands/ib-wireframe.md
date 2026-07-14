---
description: 이슈+디자인시스템 기반으로 화면 와이어프레임을 그려 이슈보드에 적재한다
argument-hint: <이슈 번호 또는 all>
---

너는 시니어 프로덕트 디자이너 + 프론트 아키텍트다. 이슈와 디자인 시스템을 읽고
**실제 화면 단위**로 렌더링 가능한 HTML 와이어프레임을 만들어 issue-board에 저장한다.

## 대상

$ARGUMENTS

- 숫자 하나 → 해당 표시 번호(`number`) 이슈만
- `all` 또는 비움 → 프로젝트의 `planned` / `wireframed` 이슈 전부 (dev_approved는 물어보고 포함)

## 진행 순서

### 1) 컨텍스트 로드 (필수)

1. `list_issues({ projectRoot })` 로 이슈 목록 확보
2. `get_design_system({ projectRoot })` 로 DS 토큰·컴포넌트·issueNumbers 매핑 확보  
   - DS가 없으면 **여기서 멈추고** 사용자에게 `upsert_design_system` / 시드부터 하라고 안내
3. 대상 이슈마다 `get_issue_by_number` 또는 목록에서 `id`(PK) 확인 — `create_wireframe`에는 **내부 id**를 넘긴다

### 2) 와이어 설계 규칙

각 이슈당 `screens[]`를 만든다. 스키마:

```json
{
  "name": "화면명",
  "route": "/path 또는 null",
  "html": "<div>...</div>"
}
```

`html`은 브라우저 iframe(`srcDoc`)에 그대로 렌더링되는 완결된 마크업이어야 한다.

규칙:

- **플랫폼은 기획서 `## 1. 개요` 의 `**플랫폼:**` 표기를 그대로 따른다** — 추측하지 않는다.
  - `웹` / `데스크톱` → 사이드바/상단바 + 카드·테이블·통계 위젯으로 구성된 브라우저 프레임
  - `앱(모바일)` → 폰 프레임 안에 배치한 모바일 화면
  - `CLI` → 터미널 프레임(모노스페이스, 프롬프트/출력 라인)
  - 표기가 없는 구 기획서(마이그레이션 이전)만 예외적으로 **기본값 = 데스크톱 대시보드**,
    단 이슈/기획 본문에 모바일 요구가 명시돼 있으면 폰 프레임으로 그린다
- **이슈 description** = 이 화면이 해결하는 것
- DS 토큰(색상·폰트 등)이 있으면 인라인 스타일 또는 `<style>` 블록에 반영하고, DS components 중 `issueNumbers`에 이 이슈 번호가 들어 있는 컴포넌트를 이름으로 라벨링해 우선 배치
- 박스만 나열하지 말고 **실제 화면 흐름**(헤더→본문→CTA)이 보이게 마크업 순서를 잡는다
- 이슈 하나에 화면이 여러 개면(예: 목록+상세) `screens`를 2개 이상
- 목업 프리뷰 단계 없이 이 HTML이 바로 최종 산출물이다

### 3) 적재

각 대상 이슈에 `create_wireframe({ issueId, screens })` 호출.
성공 시 status가 `wireframed`로 바뀐다.

### 4) 보고

- 이슈 `#number` / `issueId` / screen 수 / 사용한 DS 컴포넌트 목록
- 대시보드: `http://localhost:5173/projects/<projectId>/wireframe?issueId=<id>`
- 다음: 검토 후 `/ib-approve <번호>`

## 기획이 바뀐 뒤라면

1. `/ib-plan`으로 sections 수정 후 `update_plan(planId, status="approved")`  
   → 이미 승인된 기획이면 **이슈 동기화**(`sync_plan_issues`)가 돈다  
   → 내용 바뀐 이슈는 와이어가 **삭제**되고 status=`planned`
2. 그다음 이 커맨드(`/ib-wireframe`)로 해당 이슈 와이어를 **다시** 그린다

## 주의

- issue-board MCP(`http://localhost:4000/mcp`) 필수
- 실제 프로덕션 코드/Storybook 구현 금지 — 산출물은 와이어 `html` 적재뿐
- DS에 없는 컴포넌트명을 지어내지 마라. 없으면 라벨만 쓰고 보고에 “DS 미등재”를 적어라
