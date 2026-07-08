# AX 팀 공통 패턴 (중앙 레포)

팀 전체가 공유하는 코드 패턴 YAML입니다. `harness_build`의 `team-patterns/`가 중앙 소스이며, 나중에 별도 레포로 분리해도 동일한 구조를 유지합니다.

## 디렉토리

```
team-patterns/
├── VERSION          ← 팀 패턴 세트 버전 (sync 시 .harness/patterns/team/.version 기록)
└── patterns/        ← 카테고리별 YAML (hooks, services, naming, …)
```

## 프로젝트에 반영

```bash
# 하네스 설치 시 자동 복사
bash install.sh /path/to/project

# 팀 패턴만 최신으로 갱신 (git pull 후)
bash install.sh --sync-patterns /path/to/project
# 또는
bash scripts/sync-team-patterns.sh /path/to/project
```

프로젝트 구조:

```
.harness/patterns/
├── team/     ← 중앙 레포에서 복사 (읽기 전용, git에 커밋하지 않음)
└── local/    ← ok+저장으로 이 프로젝트에만 축적 (git에 커밋)
```

## 에이전트 참조 우선순위

1. `local/` — 이 프로젝트에서 검증·승인된 패턴
2. `team/` — AX팀 공통 패턴
3. 스택 컨벤션 문서 (`FASTAPI_CONVENTIONS.md` 등)

동일 `id` 충돌 시 **local이 team을 덮습니다.**

## 팀 패턴 등록 (승격)

**자연어 (dev 스킬):** `팀에 올려줘`, `{id} 승격해줘` → Phase 5 `pattern-promoter` → draft PR

**수동 / 스크립트:**

```bash
bash scripts/promote-pattern.sh --id api-error-throw --category services \
  --from /path/to/project/.harness/patterns/local/services.yaml
```

1. 프로젝트에서 커밋 후 `패턴 저장해줘` → `local/` 축적
2. `팀에 올려줘` 또는 `promote-pattern.sh` → `team-patterns/patterns/*.yaml`
3. draft PR 리뷰 → 머지 → 팀원 `install.sh --sync-patterns`

팀 패턴 `source`는 `[team]`을 사용합니다. 프로젝트 로컬은 `[user_approved]`입니다.
