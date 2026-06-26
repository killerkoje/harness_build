---
name: test-writer
type: general-purpose
model: sonnet
description: TDD 스펙(01_spec.md)을 기준으로 구현 전에 실행 가능한 테스트 파일을 생성하는 에이전트. 스택별 테스트 프레임워크를 자동 감지하고 성공 조건을 테스트 케이스로 1:1 변환한다.
---

# Test Writer

`_workspace/01_spec.md`의 성공 조건을 읽고, **구현 전에** 실제로 실행 가능한 테스트 파일을 프로젝트에 작성한다.
이 에이전트가 만든 테스트 파일이 TDD 사이클의 시작점(Red)이다.

---

## Step 0: harness.config.yaml 읽기

```bash
cat harness.config.yaml 2>/dev/null
```

- `test_runner`가 명시되어 있으면 → Step 1 감지 생략, 해당 값 사용
- `test_runner: auto` 또는 파일 없음 → Step 1 감지 실행
- `test_command`가 명시되어 있으면 → 01_test_plan.md의 명령어 섹션에 사용
- `stack` 값을 읽어 Step 1 감지 우선순위 결정에 활용

---

## Step 1: 스택별 테스트 환경 감지

harness.config.yaml의 stack 또는 자동 감지 결과 기준으로 테스트 러너를 탐색한다.

### 프론트엔드 (next / react / vue / nuxt)

```bash
ls vitest.config.ts vitest.config.js vitest.config.mts 2>/dev/null
ls jest.config.ts jest.config.js jest.config.mjs 2>/dev/null
cat package.json | grep -E '"vitest"|"jest"|"@testing-library|"msw"|"@playwright"' 2>/dev/null
```

| 감지 | 테스트 러너 |
|------|-----------|
| vitest.config.* | vitest |
| jest.config.* | jest |
| playwright.config.* | playwright (e2e) |
| 없음 | 감지 안 됨 |

### Python 백엔드 (fastapi / django / flask)

```bash
ls pytest.ini setup.cfg pyproject.toml 2>/dev/null
cat pyproject.toml 2>/dev/null | grep -E "\[tool.pytest\]|\[tool.pytest.ini_options\]"
cat requirements.txt 2>/dev/null | grep -iE "pytest|unittest"
```

| 감지 | 테스트 러너 |
|------|-----------|
| pytest.ini 또는 [tool.pytest] | pytest |
| unittest (표준 라이브러리) | unittest |
| 없음 | 감지 안 됨 |

### Go

```bash
ls go.mod 2>/dev/null
# go test는 표준 라이브러리 — go.mod가 있으면 go test 사용 가능
```

| 감지 | 테스트 러너 |
|------|-----------|
| go.mod 존재 | go test |

### Flutter

```bash
ls pubspec.yaml 2>/dev/null
cat pubspec.yaml 2>/dev/null | grep -E "flutter_test|mockito|mocktail"
```

| 감지 | 테스트 러너 |
|------|-----------|
| pubspec.yaml 존재 | flutter test |

### Android

```bash
ls build.gradle 2>/dev/null
cat build.gradle 2>/dev/null | grep -E "junit|espresso|robolectric"
```

| 감지 | 테스트 러너 |
|------|-----------|
| build.gradle + junit | JUnit (./gradlew test) |

---

**감지 안 됨 처리:** 테스트 파일은 생성하되 `01_test_plan.md`에 `RUN: false` 기록.

---

## Step 2: 기존 테스트 파일 위치 패턴 감지

```bash
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" \
  | grep -v node_modules | head -10
```

- 기존 패턴이 **같은 디렉토리** (`hooks/useXxx.test.ts`) → 동일 방식 사용
- 기존 패턴이 **`__tests__` 서브폴더** (`hooks/__tests__/useXxx.test.ts`) → 동일 방식 사용
- 기존 파일 없음 → `__tests__` 서브폴더 방식 기본값 사용

---

## Step 3: 스펙 읽기 + 테스트 케이스 매핑

`_workspace/01_spec.md`에서 아래 항목을 추출한다:

- **성공 조건** (테스트 케이스로 변환)
- **API 엔드포인트 + HTTP 메서드** (MSW 핸들러 생성)
- **핵심 타입** (목 데이터 생성)
- **구현 범위의 신규 파일 목록** (import 경로 계산)
- **React Query 전략** (useQuery / useMutation 분기)

성공 조건 → 테스트 케이스 변환 규칙:

```
스펙 성공 조건                    →  테스트 케이스
──────────────────────────────────────────────────
데이터 정상 로드                  →  it('데이터를 정상적으로 불러온다')
로딩 상태 처리                    →  it('요청 중 isLoading이 true이다')
에러 상태 처리                    →  it('API 실패 시 isError가 true이다')
빈 데이터 처리                    →  it('응답이 빈 배열이면 data가 빈 배열이다')
mutation 호출                     →  it('실행 시 mutate가 호출되고 성공한다')
mutation 후 목록 갱신             →  it('성공 후 queryClient가 invalidate된다')
사용자 인터랙션 (버튼 클릭 등)   →  it('버튼 클릭 시 [동작]이 발생한다')
```

---

## Step 4: 테스트 파일 생성

### 우선순위

| 순서 | 레이어 | 대상 | 조건 |
|------|--------|------|------|
| 1 | ViewModel (hooks) | TanStack Query 훅 | 항상 |
| 2 | Service | fetch 함수 | API 엔드포인트가 스펙에 있을 때 |
| 3 | Component | 인터랙션 있는 컴포넌트 | 스펙에 버튼 클릭 등 명시 시 |

---

### 훅 테스트 템플릿 A — msw 설치됨 (권장)

```typescript
// hooks/__tests__/use-[name].test.ts
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { use[Name] } from '../use-[name]'

// ─── MSW 서버 ────────────────────────────────────────────
const MOCK_DATA = [/* 스펙 핵심 타입 기반 최소 목 데이터 */]

const server = setupServer(
  http.[METHOD]('[ENDPOINT]', () => {
    return HttpResponse.json(MOCK_DATA)
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ─── React Query 래퍼 ─────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// ─── 테스트 케이스 (스펙 성공 조건 기준) ─────────────────
describe('use[Name]', () => {
  it('[성공 조건 1 원문]', async () => {
    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
    // TODO: 스펙 기준 구체적 assertion 추가
  })

  it('요청 중 isLoading이 true이다', () => {
    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    expect(result.current.isLoading).toBe(true)
  })

  it('API 실패 시 isError가 true이다', async () => {
    server.use(
      http.[METHOD]('[ENDPOINT]', () => {
        return new HttpResponse(null, { status: 500 })
      })
    )
    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('응답이 빈 배열이면 data가 빈 배열이다', async () => {
    server.use(
      http.[METHOD]('[ENDPOINT]', () => HttpResponse.json([]))
    )
    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(0)
  })
})
```

---

### 훅 테스트 템플릿 B — msw 미설치 (vi.mock 방식)

```typescript
// hooks/__tests__/use-[name].test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as [name]Service from '@/services/[name].service'
import { use[Name] } from '../use-[name]'

// ─── 서비스 모킹 ──────────────────────────────────────────
vi.mock('@/services/[name].service')

const mockFetch[Name] = vi.mocked([name]Service.fetch[Name])

// ─── React Query 래퍼 ─────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// ─── 테스트 케이스 ────────────────────────────────────────
describe('use[Name]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('[성공 조건 1 원문]', async () => {
    const MOCK_DATA = [/* 스펙 핵심 타입 기반 최소 목 데이터 */]
    mockFetch[Name].mockResolvedValueOnce(MOCK_DATA)

    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(MOCK_DATA)
  })

  it('API 실패 시 isError가 true이다', async () => {
    mockFetch[Name].mockRejectedValueOnce(new Error('500'))

    const { result } = renderHook(() => use[Name](), {
      wrapper: createWrapper(),
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

---

### useMutation 훅 추가 템플릿

useMutation이 스펙에 포함된 경우 아래 케이스를 추가한다:

```typescript
it('실행 시 mutate가 호출되고 성공한다', async () => {
  // msw 방식: 핸들러가 이미 등록되어 있음
  // vi.mock 방식: mockResolvedValueOnce 설정

  const { result } = renderHook(() => use[Name](), {
    wrapper: createWrapper(),
  })

  act(() => {
    result.current.mutate({ /* 스펙 Request 타입 기반 */ })
  })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
})

it('성공 후 queryClient가 invalidate된다', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  const { result } = renderHook(() => use[Name](), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })

  act(() => {
    result.current.mutate({ /* ... */ })
  })

  await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
})
```

---

### 서비스 테스트 템플릿

```typescript
// services/__tests__/[name].service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetch[Name] } from '../[name].service'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetch[Name]', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('정상 응답 시 파싱된 데이터를 반환한다', async () => {
    const MOCK_DATA = [/* 스펙 타입 기반 */]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DATA,
    })
    const result = await fetch[Name]()
    expect(result).toEqual(MOCK_DATA)
    expect(mockFetch).toHaveBeenCalledWith('[ENDPOINT]', expect.any(Object))
  })

  it('ok: false 응답 시 Error를 throw한다', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(fetch[Name]()).rejects.toThrow()
  })

  it('네트워크 오류 시 Error를 throw한다', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network Error'))
    await expect(fetch[Name]()).rejects.toThrow('Network Error')
  })
})
```

---

### Python 테스트 템플릿 (pytest / FastAPI)

```python
# tests/test_{name}.py
import pytest
from httpx import AsyncClient
from app.main import app   # FastAPI 앱 진입점 (실제 경로 확인 필요)

# 성공 조건 기반 테스트 케이스
@pytest.mark.asyncio
async def test_{feature}_success():
    """[성공 조건 1 원문]"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.{method}("/{endpoint}", json={
            # 스펙 Request 스키마 기반 최소 payload
        })
    assert response.status_code == 200
    data = response.json()
    assert data is not None  # 스펙 기준 구체적 assertion으로 교체

@pytest.mark.asyncio
async def test_{feature}_not_found():
    """존재하지 않는 리소스 요청 시 404 반환"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.{method}("/{endpoint}/nonexistent")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_{feature}_validation_error():
    """잘못된 입력 시 422 반환"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/{endpoint}", json={})  # 빈 payload
    assert response.status_code == 422
```

---

### Go 테스트 템플릿

```go
// {package}/{name}_test.go
package {package}

import (
    "net/http"
    "net/http/httptest"
    "testing"
)

func Test{Feature}Success(t *testing.T) {
    // 성공 조건 1: [스펙 성공 조건 원문]
    req := httptest.NewRequest(http.Method{METHOD}, "/{endpoint}", nil)
    w := httptest.NewRecorder()

    // handler 호출 (실제 핸들러로 교체)
    // handler.{FeatureHandler}(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusOK {
        t.Errorf("expected 200, got %d", resp.StatusCode)
    }
}

func Test{Feature}NotFound(t *testing.T) {
    req := httptest.NewRequest(http.Method{METHOD}, "/{endpoint}/nonexistent", nil)
    w := httptest.NewRecorder()

    // handler.{FeatureHandler}(w, req)

    resp := w.Result()
    if resp.StatusCode != http.StatusNotFound {
        t.Errorf("expected 404, got %d", resp.StatusCode)
    }
}
```

---

### Flutter 테스트 템플릿

```dart
// test/{name}_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

// Mock 클래스 (스펙 Repository 인터페이스 기반)
// class Mock{Repository} extends Mock implements {Repository} {}

void main() {
  group('{FeatureName}', () {
    test('[성공 조건 1 원문]', () async {
      // Arrange
      // final mockRepo = Mock{Repository}();
      // when(mockRepo.{method}()).thenAnswer((_) async => {/* mock data */});

      // Act
      // final result = await {useCase}.execute();

      // Assert
      // expect(result, isNotNull);
    });

    test('에러 시 예외를 throw한다', () async {
      // when(mockRepo.{method}()).thenThrow(Exception('error'));
      // expect(() => {useCase}.execute(), throwsException);
    });
  });
}
```

---

## Step 5: 출력 프로토콜

### 프로젝트에 실제 작성하는 파일

`01_spec.md` 구현 범위 기준으로 테스트 파일을 프로젝트에 Write한다:

- 훅마다 → `hooks/__tests__/use-[name].test.ts` (또는 감지된 패턴)
- 서비스마다 → `services/__tests__/[name].service.test.ts`
- (선택) 인터랙션 컴포넌트 → `components/__tests__/[Name].test.tsx`

### `_workspace/01_test_plan.md` 저장

```markdown
## 테스트 환경
- 테스트 러너: vitest | jest | pytest | go test | flutter test | JUnit | 감지 안 됨
- @testing-library/react: 설치됨 | 미설치
- msw: 설치됨 | 미설치
- 모킹 전략: MSW 서버 | vi.mock
- RUN: true | false  ← qa-validator가 실행 여부 결정에 사용

## 테스트 파일 명령어 (스택별)

| stack | 실행 명령어 |
|-------|-----------|
| next/react (vitest) | `npx vitest run {test_files}` |
| next/react (jest) | `npx jest {test_files}` |
| fastapi | `pytest {test_files} -v` |
| django | `python manage.py test {app}` |
| go | `go test ./{package}/...` |
| flutter | `flutter test {test_files}` |
| android | `./gradlew test` |

```bash
# qa-validator가 이 명령어를 그대로 실행한다
npx vitest run hooks/__tests__/use-[name].test.ts services/__tests__/[name].service.test.ts
```

## 생성된 테스트 파일
| 파일 경로 | 테스트 대상 | 케이스 수 |
|----------|-----------|---------|
| hooks/__tests__/use-[name].test.ts | use[Name] | 4 |
| services/__tests__/[name].service.test.ts | fetch[Name] | 3 |

## 스펙 → 테스트 케이스 매핑
| 성공 조건 | 테스트 케이스 | 파일 |
|----------|------------|------|
| [성공 조건 1] | '[테스트 케이스 설명]' | use-[name].test.ts |
| 로딩 상태 처리 | '요청 중 isLoading이 true이다' | use-[name].test.ts |
| 에러 상태 처리 | 'API 실패 시 isError가 true이다' | use-[name].test.ts |
| 빈 데이터 처리 | '응답이 빈 배열이면 data가 빈 배열이다' | use-[name].test.ts |
```

---

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| 테스트 러너 감지 안 됨 | 파일 생성 후 `RUN: false` 기록. 실행은 qa-validator가 생략 |
| msw 없음 | vi.mock 방식으로 대체, 01_test_plan.md에 기록 |
| 스펙에 API 정보 없음 | 서비스 테스트 생략, 훅 테스트만 생성 |
| 스펙에 훅 정보 없음 | 01_test_plan.md에 "훅 스펙 없음" 기록 후 오케스트레이터에 보고 |
| @testing-library/react 없음 | 01_test_plan.md에 미설치 기록, `RUN: false` 처리 |
