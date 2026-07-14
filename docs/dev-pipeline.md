# dev 파이프라인

harness_build `dev` 스킬 Phase 흐름 (**v0.9.0**, Issue Board 연동 반영)

---

## 전체 흐름

```mermaid
flowchart TB
  subgraph S1["세션 1 · Issue Board 세션 (기획자, 사전 실행)"]
    IBP["/ib-plan<br/>기획 승인 → 이슈 생성"]
    IBW["/ib-wireframe"]
    IBA["/ib-approve<br/>dev_approved"]
    IBP --> IBW --> IBA
    IBA --> SEED[(".harness/issues/N.yaml<br/>시딩")]
  end

  SEED ==파일로 인계==> P0

  subgraph S2["세션 2 · 개발 세션 (별도 실행, 시점도 다름)"]
    START(["이슈 N번 개발해줘"]) --> P0

    subgraph ISSUE["이슈 (프로젝트 단위)"]
      P0["Phase 0<br/>ISSUE_ID 결정<br/>신규 or 이슈 N번 수정<br/>runs 비어있으면 kind: initial"]
      STORE[(".harness/issues/N.yaml<br/>runs · files")]
    end

    subgraph CLAUDE["Claude Code"]
      P1["Phase 1<br/>code-analyzer<br/>→ 01_spec.md<br/><i>issue_id frontmatter</i>"]
      GATE{{"사용자 확인"}}
      P15["Phase 1.5<br/>test-writer<br/>→ 01_test_plan.md"]
      P3["Phase 3<br/>qa-validator<br/>→ 03_qa_report.md"]
      P4["Phase 4<br/>커밋 & 푸시"]
      REPORT["harness-report.sh"]
      COMPLETE["complete_issue<br/>(이 세션에도 issue-board MCP 연결 시만, best-effort)"]
      P45["Phase 4.5<br/>pattern-extractor<br/>→ local/"]
      P5["Phase 5<br/>pattern-promoter<br/>→ team-patterns PR"]
    end

    subgraph CURSOR["Cursor Agent"]
      P2["Phase 2<br/>cursor-agent<br/>HANDOFF.md<br/>→ 02_implementation.md"]
    end

    subgraph WS["_workspace/ (run 1회)"]
      RUN["issue-N_slug/<br/>01_spec · 02_impl · 03_qa"]
    end

    P0 --> P1
    P1 --> GATE
    GATE --> P15
    P15 --> P2
    P2 --> P3
    P3 -->|PASS| P4
    P3 -->|FAIL ≤2회| P2
    P4 --> REPORT
    REPORT --> STORE
    REPORT --> RUN
    REPORT --> COMPLETE
    P4 --> P45
    P45 -.->|팀에 올려줘| P5

    AMEND([이슈 N번 수정]) -.-> P0
  end

  NOTION[("Notion<br/>상태=완료")]
  COMPLETE -.done.-> IBA
  COMPLETE -.-> NOTION

  style P2 fill:#e0e7ff,stroke:#6366f1
  style GATE fill:#fef3c7,stroke:#d97706
  style P5 fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:5 5
  style STORE fill:#ecfdf5,stroke:#10b981
  style REPORT fill:#f0f9ff,stroke:#0ea5e9
  style COMPLETE fill:#eef2ff,stroke:#6366f1,stroke-dasharray:3 3
  style S1 fill:#fafafa,stroke:#d4d4d8,stroke-dasharray:3 3
  style S2 fill:#fafafa,stroke:#d4d4d8,stroke-dasharray:3 3
```

**세션 1(Issue Board)과 세션 2(개발)는 서로 다른 Claude Code 실행**이다 — 기획은 미리, 개발은 나중에, 종종 다른 사람이 다른 cwd에서 시작한다. 둘을 잇는 통로는 두 개뿐:

1. **`.harness/issues/N.yaml` 파일** (세션 1 → 세션 2, 필수) — Phase 0이 이 파일의 `runs: []` 여부로 최초 실행 여부를 판단
2. **`complete_issue` MCP 호출** (세션 2 → 세션 1/Notion, 선택) — 세션 2 쪽 프로젝트에도 issue-board MCP(`.mcp.json`)가 연결돼 있어야 동작. 안 되어 있으면 이 단계만 조용히 스킵되고 커밋·패턴 저장은 그대로 끝난다.

---

## 이슈 vs run

```mermaid
flowchart LR
  subgraph PROJ["프로젝트 A"]
    I1["이슈 #1 로그인"]
    R1["run initial"]
    R2["run amendment"]
    I1 --> R1
    I1 --> R2
    R2 -.parent.-> R1
  end

  subgraph PROJ2["프로젝트 B"]
    I1B["이슈 #1 결제"]
  end

  note1["#1은 프로젝트마다 독립"]
```

| 개념 | 단위 | 저장 |
|------|------|------|
| **이슈** | 기능 (고정 ID) | `.harness/issues/N.yaml` |
| **run** | 파이프라인 1회 | `_workspace/{date}_issue-N_slug/` |
| **amendment** | 이슈 N 수정 | `parent_run_id` + 새 run |

---

## Phase 2 — cursor-agent

```mermaid
sequenceDiagram
  participant C as Claude Code
  participant H as HANDOFF.md
  participant S as run-phase2-cursor.sh
  participant A as cursor-agent

  C->>H: status pending
  C->>S: --workspace 실행
  S->>A: -p --trust --force
  A->>A: 01_spec.md 기준 구현
  A->>H: status done
  A-->>C: 02_implementation.md
  C->>C: Phase 3 자동
```

---

## Phase 4 — 이슈 sync + 완료 훅

```mermaid
sequenceDiagram
  participant C as Claude Code
  participant G as git
  participant R as harness-report.sh
  participant Y as .harness/issues/N.yaml
  participant M as issue-board MCP
  participant N as Notion

  C->>G: 커밋 & 푸시
  C->>R: sync
  R->>Y: runs[] files[] 갱신
  C->>M: get_issue_by_number(number)
  alt 연결돼 있고 이슈 존재
    M-->>C: issueId
    C->>M: complete_issue(issueId)
    M->>M: status = done
    M->>N: 상태 push (완료, 수동 오버라이드 있으면 그 값)
  else 미연결 / 못 찾음
    C->>C: 조용히 스킵
  end
```

---

## Phase 요약

| Phase | 에이전트 | 도구 | 산출물 |
|-------|----------|------|--------|
| 0 | — | Claude | `ISSUE_ID`, `WORKSPACE_DIR` |
| 1 | code-analyzer | Claude | `01_spec.md` + `issue_id` |
| 1.5 | test-writer | Claude | `01_test_plan.md` |
| 2 | cursor-agent | **Cursor** | `02_implementation.md` |
| 3 | qa-validator | Claude | `03_qa_report.md` |
| 4 | — | Claude | 커밋 |
| 4+ | harness-report | shell | `.harness/issues/N.yaml` |
| 4+ | complete_issue (연결 시만) | issue-board MCP | 이슈 `done` + Notion `완료` |
| 4.5 | pattern-extractor | Claude | `local/*.yaml` |
| 5 | pattern-promoter | Claude | team-patterns PR |

---

## Issue Board 연동

Harness Hub는 폐기되고 **Issue Board**(`apps/issue-board` 대시보드 + `apps/issue-board-mcp` 백엔드, SQLite)로 대체됐다.

```mermaid
flowchart LR
  BOARD["Issue Board<br/>apps/issue-board (:5173)"]
  MCP["issue-board-mcp<br/>SQLite + REST + MCP (:4000)"]
  BOARD <--> MCP

  MCP --> T1[기획 탭]
  MCP --> T2[이슈 탭]
  MCP --> T3[와이어프레임 탭]
  MCP --> T4[디자인시스템 탭]

  MCP -.승인 시 시딩.-> Y1[".harness/issues/N.yaml"]
  Y1 -.Phase 0이 읽음.-> DEV["dev 파이프라인"]
  DEV -.완료 시 complete_issue.-> MCP
  MCP -.선택.-> NOTION[("Notion<br/>단방향 push")]
```

- 승인 이후(dev_approved) 실제 개발은 `.harness/issues/N.yaml` 파일 기반이라 **issue-board 서버가 꺼져 있어도 진행 가능** — 완료 훅(`complete_issue`)만 best-effort로 실패한다.
- Notion 연동은 issue-board-mcp에서 선택 사항(`NOTION_API_KEY`/`NOTION_DATABASE_ID` 없으면 스킵)이며, 자세한 매핑은 [README.md의 Notion 동기화 절](../README.md#notion-동기화-선택) 참고.
