# dev 파이프라인

harness_build `dev` 스킬 Phase 흐름 (**v0.6.1**)

---

## 전체 흐름

```mermaid
flowchart TB
  START([사용자 지시]) --> P0

  subgraph ISSUE["이슈 (프로젝트 단위)"]
    P0["Phase 0<br/>ISSUE_ID 결정<br/>신규 or 이슈 N번 수정"]
    STORE[(".harness/issues/N.yaml<br/>runs · files")]
  end

  subgraph CLAUDE["Claude Code"]
    P1["Phase 1<br/>code-analyzer<br/>→ 01_spec.md<br/><i>issue_id frontmatter</i>"]
    GATE{{"사용자 확인"}}
    P15["Phase 1.5<br/>test-writer<br/>→ 01_test_plan.md"]
    P3["Phase 3<br/>qa-validator<br/>→ 03_qa_report.md"]
    P4["Phase 4<br/>커밋 & 푸시"]
    REPORT["harness-report.sh"]
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
  P4 --> P45
  P45 -.->|팀에 올려줘| P5

  AMEND([이슈 N번 수정]) -.-> P0

  style P2 fill:#e0e7ff,stroke:#6366f1
  style GATE fill:#fef3c7,stroke:#d97706
  style P5 fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray:5 5
  style STORE fill:#ecfdf5,stroke:#10b981
  style REPORT fill:#f0f9ff,stroke:#0ea5e9
```

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

## Phase 4 — 이슈 sync

```mermaid
sequenceDiagram
  participant C as Claude Code
  participant G as git
  participant R as harness-report.sh
  participant Y as .harness/issues/N.yaml
  participant H as Harness Hub

  C->>G: 커밋 & 푸시
  C->>R: sync
  R->>Y: runs[] files[] 갱신
  H->>Y: 이슈 탭 조회
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
| 4.5 | pattern-extractor | Claude | `local/*.yaml` |
| 5 | pattern-promoter | Claude | team-patterns PR |

---

## Hub 연동

```mermaid
flowchart LR
  HUB[Harness Hub]
  HUB --> T1[이슈 탭]
  HUB --> T2[기획 탭]
  HUB --> T3[화면 탭]
  HUB --> T4[패턴 탭]

  T1 --> Y1[".harness/issues/"]
  T2 --> S1["_workspace/*/01_spec.md"]
  T3 --> S2["_workspace/*/02_impl.md"]
  T4 --> P1[".harness/patterns/"]
```
