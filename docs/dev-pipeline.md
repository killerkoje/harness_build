# dev 파이프라인

harness_build `dev` 스킬 Phase 흐름 (v0.6.0).

## 전체 흐름

```mermaid
flowchart TB
  START([사용자 명령]) --> P1

  subgraph CLAUDE["Claude Code"]
    P1["Phase 1<br/>code-analyzer<br/>→ 01_spec.md"]
    GATE{{"사용자 확인<br/>ok 전까지 Phase 2 금지"}}
    P15["Phase 1.5<br/>test-writer<br/>→ 01_test_plan.md<br/><i>SKIP_TESTS=false</i>"]
    P3["Phase 3<br/>qa-validator<br/>→ 03_qa_report.md"]
    P4["Phase 4<br/>커밋 & 푸시<br/>→ 로컬 패턴 저장할까요?"]
    P45["Phase 4.5<br/>pattern-extractor<br/>→ local/"]
    P5["Phase 5<br/>pattern-promoter<br/>→ team-patterns/ PR"]
  end

  subgraph CURSOR["Cursor Agent"]
    P2["Phase 2<br/>cursor-agent<br/>HANDOFF.md<br/>→ 02_implementation.md"]
  end

  P1 --> GATE
  GATE --> P15
  P15 --> P2
  P2 --> P3
  P3 -->|PASS| P4
  P3 -->|FAIL ≤2회| P2
  P4 --> P45
  P45 -.->|별도: 팀에 올려줘| P5

  style P2 fill:#e0e7ff,stroke:#6366f1
  style GATE fill:#fef3c7,stroke:#d97706
  style P5 fill:#f4f4f5,stroke:#a1a1aa,stroke-dasharray: 5 5
```

## Phase 요약

| Phase | 에이전트 | 도구 | 산출물 |
|-------|----------|------|--------|
| 1 | code-analyzer | Claude | `01_spec.md` |
| 1.5 | test-writer | Claude | `01_test_plan.md` |
| 2 | cursor-agent | **Cursor** | `02_implementation.md` |
| 3 | qa-validator | Claude | `03_qa_report.md` |
| 4 | — | Claude | 커밋 |
| 4.5 | pattern-extractor | Claude | `local/*.yaml` |
| 5 | pattern-promoter | Claude | team-patterns PR |

## Phase 2 상세

```mermaid
sequenceDiagram
  participant C as Claude Code
  participant H as HANDOFF.md
  participant S as run-phase2-cursor.sh
  participant A as cursor-agent

  C->>H: status pending 작성
  C->>S: --workspace 실행
  S->>A: -p --trust --force
  A->>A: 01_spec.md 기준 구현
  A->>H: status done
  A-->>C: 02_implementation.md
  C->>C: Phase 3 자동 진행
```
