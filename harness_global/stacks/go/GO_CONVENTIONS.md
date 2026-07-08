# Go 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [Effective Go](https://go.dev/doc/effective_go), [Go Project Layout](https://go.dev/doc/modules/layout), [net/http](https://pkg.go.dev/net/http)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 언어 | **Go** 1.22+ | `go.mod` 모듈 |
| HTTP | **net/http** (ServeMux) / **chi** / **gin** / **echo** | 프로젝트 기존 패턴 우선 |
| 검증 | struct tag + **go-playground/validator** | JSON decode 후 검증 |
| ORM (선택) | **sqlc** / **GORM** / database/sql | 프로젝트 기존 패턴 우선 |
| 테스트 | **`testing`** + **testify** (선택) | table-driven tests |
| 린트 | **golangci-lint** | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[Standard Go Project Layout](https://github.com/golang-standards/project-layout) 및 [Effective Go — Packages](https://go.dev/doc/effective_go#packages) 구조를 따른다.

```
project-root/
├── cmd/
│   └── server/
│       └── main.go              # 진입점, 의존성 조립
├── internal/
│   ├── {domain}/
│   │   ├── handler.go           # HTTP 핸들러
│   │   ├── service.go           # 비즈니스 로직
│   │   ├── repository.go        # DB 접근 (선택)
│   │   └── model.go             # 도메인 타입
│   ├── middleware/
│   │   └── error.go
│   └── server/
│       └── router.go            # 라우트 등록
├── pkg/                         # 외부 공개 패키지 (필요 시)
├── go.mod
└── go.sum
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 패키지 | 소문자 단수, 짧게 | `user`, `auth` |
| 파일 | snake_case 또는 도메인 단위 | `handler.go`, `service.go` |
| 타입 | `PascalCase` | `User`, `CreateUserRequest` |
| 인터페이스 | 동작 + `er` 접미사 (관례) | `UserRepository`, `UserService` |
| 핸들러 | `func (h *Handler) ListUsers(...)` | 메서드 리시버 |
| 테스트 | `{file}_test.go` | `handler_test.go` |

---

## 4. Handler 패턴

[net/http Handler](https://pkg.go.dev/net/http#Handler) 기준:

```go
// internal/user/handler.go
package user

import (
    "encoding/json"
    "net/http"
    "strconv"
)

type Handler struct {
    svc Service
}

func NewHandler(svc Service) *Handler {
    return &Handler{svc: svc}
}

func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
    users, err := h.svc.List(r.Context())
    if err != nil {
        writeError(w, err)
        return
    }
    writeJSON(w, http.StatusOK, users)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid json"})
        return
    }
    user, err := h.svc.Create(r.Context(), req)
    if err != nil {
        writeError(w, err)
        return
    }
    writeJSON(w, http.StatusCreated, user)
}
```

- 핸들러는 **얇게** — 비즈니스 로직은 `Service`에
- `r.Context()` 전달으로 취소·타임아웃 지원

---

## 5. Service 패턴

[Effective Go — Interfaces](https://go.dev/doc/effective_go#interfaces) 기준:

```go
// internal/user/service.go
package user

import (
    "context"
    "errors"
)

var ErrNotFound = errors.New("user not found")

type Service interface {
    List(ctx context.Context) ([]User, error)
    Create(ctx context.Context, req CreateUserRequest) (User, error)
    GetByID(ctx context.Context, id int64) (User, error)
}

type service struct {
    repo Repository
}

func NewService(repo Repository) Service {
    return &service{repo: repo}
}

func (s *service) GetByID(ctx context.Context, id int64) (User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return User{}, err
    }
    if user.ID == 0 {
        return User{}, ErrNotFound
    }
    return user, nil
}
```

- 인터페이스는 **소비자 측**에서 정의 (필요한 메서드만)
- 생성자 `NewXxx()` 로 의존성 주입

---

## 6. Model / Request 타입

[Effective Go — Names](https://go.dev/doc/effective_go#names) 기준:

```go
// internal/user/model.go
package user

type User struct {
    ID    int64  `json:"id"`
    Email string `json:"email"`
    Name  string `json:"name"`
}

type CreateUserRequest struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name"  validate:"required,min=1"`
}
```

- JSON tag 명시, export 필드만 직렬화
- 요청/응답 타입 분리

---

## 7. Router 등록

[http.ServeMux (Go 1.22+)](https://go.dev/blog/routing-enhancements) 기준:

```go
// internal/server/router.go
package server

import (
    "net/http"

    "myapp/internal/user"
)

func NewRouter(userHandler *user.Handler) http.Handler {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /users", userHandler.ListUsers)
    mux.HandleFunc("POST /users", userHandler.CreateUser)
    mux.HandleFunc("GET /users/{id}", userHandler.GetUser)
    return mux
}
```

- `cmd/server/main.go`에서 Handler·Service·Repository 조립
- 미들웨어: `func middleware(next http.Handler) http.Handler`

---

## 8. 에러 처리

[Effective Go — Errors](https://go.dev/doc/effective_go#errors) 기준:

```go
// internal/user/errors.go
package user

import "errors"

var (
    ErrNotFound      = errors.New("user not found")
    ErrAlreadyExists = errors.New("user already exists")
)
```

```go
func writeError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, user.ErrNotFound):
        writeJSON(w, http.StatusNotFound, map[string]string{"message": err.Error()})
    default:
        writeJSON(w, http.StatusInternalServerError, map[string]string{"message": "internal error"})
    }
}
```

- `errors.New` / `fmt.Errorf("...: %w", err)` 로 래핑
- `errors.Is` / `errors.As` 로 분기
- 500 내부 에러 상세는 프로덕션 응답에 노출 금지

---

## 9. 테스트

[Effective Go — Testing](https://go.dev/doc/effective_go#testing) 기준:

```go
// internal/user/service_test.go
package user_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "myapp/internal/user"
)

func TestGetByID_NotFound(t *testing.T) {
    svc := user.NewService(&mockRepo{})
    _, err := svc.GetByID(context.Background(), 999)
    assert.ErrorIs(t, err, user.ErrNotFound)
}
```

- table-driven test 권장
- HTTP: `httptest.NewRecorder()` + `httptest.NewRequest()`
- `_test` 패키지로 export API만 테스트 (black-box)

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| `main` 패키지에 비즈니스 로직 | `internal/{domain}/` |
| handler에서 DB 직접 접근 | `Repository` / `Service` |
| `panic`으로 HTTP 에러 처리 | `error` 반환 + 핸들러 변환 |
| 무시된 `error` (`_, _ =`) | 명시적 처리 또는 로깅 |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. internal/{domain}/model.go       ← 도메인 타입, Request/Response
2. internal/{domain}/repository.go  ← DB 접근 (필요 시)
3. internal/{domain}/service.go     ← 비즈니스 로직 + 인터페이스
4. internal/{domain}/handler.go     ← HTTP 핸들러
5. internal/server/router.go        ← 라우트 등록 (신규 도메인 시)
6. cmd/server/main.go               ← 의존성 조립 (신규 도메인 시)
7. internal/{domain}/*_test.go      ← table-driven 테스트
```

### Implementer 체크리스트

- [ ] `context.Context` 첫 인자 전달
- [ ] `error` 명시적 처리, `%w` 래핑
- [ ] 적절한 HTTP status code
- [ ] JSON tag + export 필드
- [ ] `internal/` 패키지 경계 준수

---

## 참고 문서

- [Effective Go](https://go.dev/doc/effective_go)
- [Go Modules](https://go.dev/doc/modules)
- [net/http](https://pkg.go.dev/net/http)
- [Go 1.22 Routing Enhancements](https://go.dev/blog/routing-enhancements)
- [Testing](https://go.dev/doc/tutorial/add-a-test)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — Effective Go 및 Go 공식 문서 기반 컨벤션 |
