# 패턴뷰어 프로젝트별 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** issue-board 대시보드의 "패턴확인" 버튼이 지금 보고 있는 프로젝트의 `.harness/patterns`만 보여주게 한다 (지금은 항상 고정된 하나의 디렉토리만 보여줌).

**Architecture:** pattern-viewer가 `?projectId=` 쿼리로 issue-board-mcp REST(`GET /api/projects/:id`)를 호출해 `rootPath`를 얻고, 그 밑의 `.harness/patterns`를 읽는다. `projectId`가 없으면 전체 프로젝트 목록에서 고르는 화면을 보여준다. `.harness/patterns` 파일 구조, `loadPatterns()`/`PatternViewer.tsx`는 그대로 재사용한다.

**Tech Stack:** Next.js 15 서버 컴포넌트 (`apps/pattern-viewer`), 순수 `fetch` (별도 HTTP 클라이언트 라이브러리 없음), 기존 `apps/issue-board-mcp` REST API.

**참고 문서:** `docs/specs/2026-07-16-pattern-viewer-per-project-design.md`

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `apps/pattern-viewer/src/lib/issue-board-client.ts` | (신규) issue-board-mcp REST 호출 — `fetchProject(id)`, `fetchProjects()` |
| `apps/pattern-viewer/src/components/ProjectPicker.tsx` | (신규) `projectId` 없을 때 보여줄 프로젝트 선택 화면 |
| `apps/pattern-viewer/src/app/patterns/page.tsx` | (수정) `searchParams.projectId` 기반 분기 — 기존 `PATTERNS_DIR` 방식 제거 |
| `apps/pattern-viewer/.env.local.example` | (수정) `PATTERNS_DIR` 문서를 `ISSUE_BOARD_API_URL`로 교체 |
| `apps/issue-board/src/components/ProjectQuickLinks.tsx` | (수정) "패턴확인" 링크에 `?projectId=` 추가 |

`apps/pattern-viewer/src/lib/patterns.ts`, `apps/pattern-viewer/src/components/PatternViewer.tsx`는 변경 없음 — 그대로 재사용.

이번 기능은 pattern-viewer 앱에 자동화 테스트가 없는 기존 관례를 따라 새 테스트 프레임워크를 도입하지 않는다 (스펙의 "테스트" 절 참고) — 마지막 태스크에서 실제 브라우저로 수동 검증한다.

---

## Task 1: issue-board-mcp REST 클라이언트

**Files:**
- Create: `apps/pattern-viewer/src/lib/issue-board-client.ts`

- [x] **Step 1: 구현**

`apps/pattern-viewer/src/lib/issue-board-client.ts` 새로 작성:

```ts
// src/lib/issue-board-client.ts
const BASE_URL = process.env.ISSUE_BOARD_API_URL ?? 'http://localhost:4000'

export interface Project {
  id: number
  rootPath: string
  name: string
  description?: string
  devUrl: string | null
}

export async function fetchProject(id: number): Promise<Project | null> {
  const res = await fetch(`${BASE_URL}/api/projects/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/api/projects`)
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}
```

`Project` 인터페이스는 `apps/issue-board-mcp/src/types.ts`의 `Project`와 동일한 필드다 (id, rootPath, name, description?, devUrl).

- [x] **Step 2: 타입 체크**

Run: `cd apps/pattern-viewer && npx tsc --noEmit`
Expected: 에러 없음

- [x] **Step 3: 커밋**

```bash
git add apps/pattern-viewer/src/lib/issue-board-client.ts
git commit -m "feat(pattern-viewer): add issue-board-mcp REST client"
```

---

## Task 2: 프로젝트 선택 화면

**Files:**
- Create: `apps/pattern-viewer/src/components/ProjectPicker.tsx`

- [x] **Step 1: 구현**

`apps/pattern-viewer/src/components/ProjectPicker.tsx` 새로 작성:

```tsx
// src/components/ProjectPicker.tsx
import type { Project } from '@/lib/issue-board-client'

export default function ProjectPicker({
  projects,
  notice,
}: {
  projects: Project[]
  notice?: string
}) {
  return (
    <div className="max-w-lg mx-auto mt-16 px-4">
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">프로젝트를 선택하세요</h1>
      <p className="text-sm text-zinc-500 mb-6">패턴을 확인할 프로젝트를 골라주세요.</p>
      {notice && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          {notice}
        </p>
      )}
      {projects.length === 0 ? (
        <p className="text-sm text-zinc-400">등록된 프로젝트가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <a
                href={`/patterns?projectId=${project.id}`}
                className="block rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{project.name}</span>
                <span className="block text-xs text-zinc-400 mt-0.5">{project.rootPath}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

이 컴포넌트는 순수 링크 네비게이션만 쓰므로 `'use client'`가 필요 없다 (issue-board의 `PlanRoundSwitcher.tsx`와 같은 패턴).

- [x] **Step 2: 타입 체크**

Run: `cd apps/pattern-viewer && npx tsc --noEmit`
Expected: 에러 없음 (이 컴포넌트는 아직 아무 곳에서도 import 안 됨 — Task 3에서 연결)

- [x] **Step 3: 커밋**

```bash
git add apps/pattern-viewer/src/components/ProjectPicker.tsx
git commit -m "feat(pattern-viewer): add project picker screen"
```

---

## Task 3: `patterns/page.tsx` — projectId 기반 라우팅

**Files:**
- Modify: `apps/pattern-viewer/src/app/patterns/page.tsx`

- [x] **Step 1: 전체 교체**

`apps/pattern-viewer/src/app/patterns/page.tsx`의 전체 내용을 아래로 교체한다 (현재 내용은 `PATTERNS_DIR` 환경변수 하나로 고정된 디렉토리를 읽는 9줄짜리 동기 컴포넌트 — 이걸 통째로 비동기·프로젝트 인지 버전으로 바꾼다):

```tsx
// src/app/patterns/page.tsx
import path from 'path'
import { loadPatterns } from '@/lib/patterns'
import { fetchProject, fetchProjects } from '@/lib/issue-board-client'
import PatternViewer from '@/components/PatternViewer'
import ProjectPicker from '@/components/ProjectPicker'

// Reads pattern YAML from disk on every request instead of at build time,
// since files under .harness/patterns change without a rebuild/redeploy.
export const dynamic = 'force-dynamic'

const CONNECTION_ERROR = (
  <p className="text-sm text-red-600 mt-16 text-center">
    issue-board-mcp 서버에 연결할 수 없습니다. 서버가 떠 있는지 확인하세요.
  </p>
)

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const { projectId: projectIdQuery } = await searchParams
  const projectId = projectIdQuery ? Number(projectIdQuery) : null

  if (projectId == null) {
    try {
      const projects = await fetchProjects()
      return <ProjectPicker projects={projects} />
    } catch {
      return CONNECTION_ERROR
    }
  }

  let project
  try {
    project = await fetchProject(projectId)
  } catch {
    return CONNECTION_ERROR
  }

  if (!project) {
    const projects = await fetchProjects().catch(() => [])
    return (
      <ProjectPicker projects={projects} notice={`프로젝트(id=${projectId})를 찾을 수 없습니다.`} />
    )
  }

  const patternsDir = path.join(project.rootPath, '.harness/patterns')
  const categories = loadPatterns(patternsDir)

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <p className="text-xs text-zinc-400">{project.name}</p>
      </div>
      <PatternViewer categories={categories} />
    </div>
  )
}
```

`loadPatterns()`는 이미 대상 디렉토리(`team/`, `local/`, 또는 `patternsDir` 자체)가 없으면 빈 배열을 반환하도록 방어돼 있다 (`apps/pattern-viewer/src/lib/patterns.ts`의 `fs.existsSync` 체크) — 하네스 미설치 프로젝트(`.harness/patterns` 없음)를 골라도 에러 없이 빈 화면이 뜬다. 이 부분은 코드 변경 불필요, 그대로 재사용.

- [x] **Step 2: 타입 체크**

Run: `cd apps/pattern-viewer && npx tsc --noEmit`
Expected: 에러 없음

- [x] **Step 3: 커밋**

```bash
git add apps/pattern-viewer/src/app/patterns/page.tsx
git commit -m "feat(pattern-viewer): route pattern loading by projectId instead of a fixed PATTERNS_DIR"
```

---

## Task 4: 환경변수 문서 갱신

**Files:**
- Modify: `apps/pattern-viewer/.env.local.example`

- [x] **Step 1: 교체**

`apps/pattern-viewer/.env.local.example`의 전체 내용을:

```
# 패턴 루트 (.harness/patterns) — team/ + local/ 자동 병합
# 미설정 시 ../../.harness/patterns (harness_build 기준)
PATTERNS_DIR=/path/to/your/project/.harness/patterns
```

아래로 교체한다:

```
# issue-board-mcp REST API 주소 — 이 URL로 프로젝트 목록/rootPath를 조회해
# ${rootPath}/.harness/patterns를 읽는다. issue-board-mcp가 기본 4000번
# 포트로 뜬다면 설정 불필요.
ISSUE_BOARD_API_URL=http://localhost:4000
```

이 파일이 문서화하던 `PATTERNS_DIR`은 Task 3에서 코드상 제거됐으므로, 예시 파일도 실제 동작과 맞춰 갱신한다. (참고: 로컬의 실제 `.env.local`은 `.gitignore` 대상이라 이 커밋으로 건드리지 않는다 — 사용자가 원하면 직접 갱신.)

- [x] **Step 2: 커밋**

```bash
git add apps/pattern-viewer/.env.local.example
git commit -m "docs(pattern-viewer): document ISSUE_BOARD_API_URL, drop stale PATTERNS_DIR"
```

---

## Task 5: 대시보드 "패턴확인" 링크에 projectId 연결

**Files:**
- Modify: `apps/issue-board/src/components/ProjectQuickLinks.tsx`

- [x] **Step 1: 링크 수정**

`apps/issue-board/src/components/ProjectQuickLinks.tsx`에서 (현재 36~43번 줄) 아래 텍스트를:

```tsx
      <a
        href={PATTERN_VIEWER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
      >
        패턴확인
      </a>
```

아래로 교체한다:

```tsx
      <a
        href={`${PATTERN_VIEWER_URL}/patterns?projectId=${projectId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap"
      >
        패턴확인
      </a>
```

`projectId`는 이미 이 컴포넌트의 props로 들어와 있다 (15번 줄 `export default function ProjectQuickLinks({ projectId, devUrl }: Props)`) — 새로 끌어올 것 없이 그대로 쓴다.

- [x] **Step 2: 타입 체크**

Run: `cd apps/issue-board && npx tsc --noEmit`
Expected: 에러 없음

- [x] **Step 3: 커밋**

```bash
git add apps/issue-board/src/components/ProjectQuickLinks.tsx
git commit -m "feat(issue-board): link 패턴확인 button to the current project's patterns"
```

---

## Task 6: 수동 브라우저 검증

**Files:** 없음 (검증 전용)

이 저장소에는 이미 검증에 쓸 수 있는 실제 데이터가 있다: issue-board-mcp에 프로젝트 두 개가 등록돼 있고 —
- `id=1` `AX_TEAM_TEST` (`rootPath=/Users/leeheewon/Documents/side-projects/AX_TEAM_TEST`) — 실제 `.harness/patterns/{team,local}`에 yaml 패턴이 있음
- `id=4` `ib-test-project` (`rootPath=/tmp/ib-test-project`) — `.harness/patterns` 자체가 없음

이 둘의 대비가 정확히 이번 버그의 재현/수정 확인 시나리오다: 수정 전에는 pattern-viewer가 어떤 프로젝트에서 접속하든 `.env.local`에 하드코딩된 `AX_TEAM_TEST`의 패턴만 보여줬다.

- [x] **Step 1: 세 서버 기동 확인**

```bash
curl -sf http://localhost:4000/api/projects -o /dev/null -w "issue-board-mcp: %{http_code}\n" || echo "issue-board-mcp 안 떠 있음 — cd apps/issue-board-mcp && npm run dev"
curl -sf http://localhost:5173 -o /dev/null -w "issue-board: %{http_code}\n" || echo "issue-board 안 떠 있음 — cd apps/issue-board && npm run dev"
curl -sf http://localhost:3100 -o /dev/null -w "pattern-viewer: %{http_code}\n" || echo "pattern-viewer 안 떠 있음 — cd apps/pattern-viewer && npm run dev"
```

세 개 다 200이 아니면 안 떠 있는 것부터 각자 터미널에서 기동하고 포트가 뜰 때까지 기다린다 (`i=0; until curl -sf http://localhost:<port> >/dev/null 2>&1 || [ $i -ge 30 ]; do sleep 1; i=$((i+1)); done` 패턴 사용).

- [x] **Step 2: 서로 다른 프로젝트가 서로 다른 패턴을 보여주는지 확인**

Run:
```bash
curl -s "http://localhost:3100/patterns?projectId=1" | grep -o '<p class="text-xs text-zinc-400">[^<]*</p>' | head -1
curl -s "http://localhost:3100/patterns?projectId=4" | grep -o '<p class="text-xs text-zinc-400">[^<]*</p>' | head -1
```
Expected: 첫 번째 줄은 `AX_TEAM_TEST`를 포함, 두 번째 줄은 `ib-test-project`를 포함 — 즉 프로젝트별로 다른 이름이 서버 렌더 HTML에 박혀 나온다.

브라우저로 직접 열어서도 확인한다:
- `http://localhost:3100/patterns?projectId=1` → 상단에 "AX_TEAM_TEST" 표시, 아래에 `hooks`/`components`/`services`/`naming` 등 실제 패턴 카드가 보임
- `http://localhost:3100/patterns?projectId=4` → 상단에 "ib-test-project" 표시, 패턴 카드는 없음(빈 상태) — **AX_TEAM_TEST의 패턴이 섞여 나오면 이번 수정이 실패한 것**

- [x] **Step 3: projectId 없이 접속 시 선택 화면 확인**

`http://localhost:3100/patterns`를 브라우저로 열어 "프로젝트를 선택하세요" 화면이 뜨는지, `AX_TEAM_TEST`/`ib-test-project` 두 카드가 보이는지, 하나를 클릭하면 `?projectId=`가 붙은 URL로 이동해 해당 프로젝트 패턴 화면이 뜨는지 확인한다.

- [x] **Step 4: 존재하지 않는 projectId 확인**

`http://localhost:3100/patterns?projectId=999`를 열어 "프로젝트(id=999)를 찾을 수 없습니다" 안내와 함께 프로젝트 목록 화면이 뜨는지 확인한다 (에러로 죽지 않아야 한다).

- [x] **Step 5: issue-board 대시보드에서 실제 클릭 경로 확인**

`http://localhost:5173/projects/4`(ib-test-project) 아무 탭이나 열어서 상단 "패턴확인" 버튼을 클릭 — 새 탭이 `http://localhost:3100/patterns?projectId=4`로 열리고 빈 상태가 뜨는지 확인한다. `http://localhost:5173/projects/1`(AX_TEAM_TEST, 등록돼 있다면)에서도 같은 버튼을 눌러 이번엔 실제 패턴이 뜨는지 확인한다.

- [x] **Step 6: 결과 보고**

문제 없으면 완료 보고. 문제가 있으면 어떤 시나리오에서 무엇이 어긋났는지 기록하고 해당 Task로 돌아가 수정한다.
