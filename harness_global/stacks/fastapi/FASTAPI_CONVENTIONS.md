# FastAPI 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/), [Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/), [Pydantic V2](https://docs.pydantic.dev/latest/)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **FastAPI** | ASGI, OpenAPI 자동 생성 |
| 검증/스키마 | **Pydantic v2** | `BaseModel`, `Field`, `model_validator` |
| 서버 | **Uvicorn** | `uvicorn app.main:app --reload` |
| ORM (선택) | SQLAlchemy 2.0 / SQLModel | 프로젝트 기존 패턴 우선 |
| 테스트 | **pytest** + **httpx** `AsyncClient` | `pytest-asyncio` |
| 린트 | **ruff**, **mypy** | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[공식 Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/) 구조를 따른다.

```
project-root/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI() 인스턴스, router include
│   ├── dependencies.py      # 공통 Depends (DB session, auth)
│   ├── core/
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   └── exceptions.py      # HTTPException 래퍼
│   ├── schemas/             # Pydantic 입출력 모델
│   │   └── {domain}.py
│   ├── models/              # ORM 엔티티 (SQLAlchemy 등)
│   │   └── {domain}.py
│   ├── services/            # 비즈니스 로직 (DB 접근 포함)
│   │   └── {domain}.py
│   └── routers/             # APIRouter per domain
│       └── {domain}.py
├── tests/
│   ├── conftest.py
│   └── test_{domain}.py
└── pyproject.toml
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 스키마 | `{Entity}Create`, `{Entity}Update`, `{Entity}Response` | `UserCreate`, `UserResponse` |
| 라우터 | `routers/{domain}.py`, 변수명 `router` | `routers/users.py` |
| 서비스 | `{domain}_service.py` 또는 `{domain}.py` | `services/user.py` |
| 테스트 | `test_{domain}.py` | `test_users.py` |

---

## 4. APIRouter 패턴

[APIRouter 공식 가이드](https://fastapi.tiangolo.com/tutorial/bigger-applications/#apirouter) 기준:

```python
# app/routers/users.py
from fastapi import APIRouter, Depends, status

from app.schemas.user import UserCreate, UserResponse
from app.services.user import UserService
from app.dependencies import get_user_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserResponse])
async def list_users(service: UserService = Depends(get_user_service)):
    return await service.list_users()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    service: UserService = Depends(get_user_service),
):
    return await service.create_user(body)
```

`main.py`에서 `app.include_router(users.router)` 로 등록.

---

## 5. Pydantic 스키마

[Pydantic Models](https://fastapi.tiangolo.com/tutorial/body/) 기준:

```python
from pydantic import BaseModel, ConfigDict, Field

class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    name: str = Field(..., min_length=1)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
```

- 요청/응답 스키마 분리 (`Create` / `Update` / `Response`)
- ORM → 응답: `from_attributes=True` (구 `orm_mode`)
- `dict` raw 반환 금지 → `response_model` 명시

---

## 6. 의존성 주입 (Depends)

[Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/) 기준:

- DB 세션, 인증, 서비스 인스턴스는 `dependencies.py` 또는 도메인별 `deps.py`
- 라우터 핸들러는 **얇게** — 비즈니스 로직은 `services/`에
- `yield` 패턴으로 DB 세션 생명주기 관리

```python
# app/dependencies.py
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
```

---

## 7. 비동기 규칙

[Async path operations](https://fastapi.tiangolo.com/async/) 기준:

- I/O 바운드 핸들러·서비스: `async def` 기본
- 동기 ORM/라이브러리 호출 시 `run_in_threadpool` 또는 sync def (프로젝트 기존 패턴 따름)
- 라우터·서비스 간 async/sync 혼용 시 기존 코드 패턴 유지

---

## 8. 에러 처리

[Handling Errors](https://fastapi.tiangolo.com/tutorial/handling-errors/) 기준:

```python
from fastapi import HTTPException, status

raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="User not found",
)
```

- 서비스 레이어: 도메인 예외 throw (`UserNotFoundError`)
- 라우터/전역 핸들러: `HTTPException` 또는 `@app.exception_handler`로 변환
- 500 상세 스택은 프로덕션 응답에 노출 금지

---

## 9. 테스트

[Testing](https://fastapi.tiangolo.com/tutorial/testing/) 기준:

```python
from httpx import ASGITransport, AsyncClient
import pytest

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post("/users/", json={"email": "a@b.com", "name": "A"})
    assert response.status_code == 201
    assert response.json()["email"] == "a@b.com"
```

- `conftest.py`에 `AsyncClient` + dependency override
- DB는 테스트 전용 DB 또는 transaction rollback

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| 라우터에 비즈니스 로직 직접 작성 | `services/` 분리 |
| `dict` / `Any` 반환 | Pydantic `response_model` |
| 전역 mutable 상태 | Depends + DB |
| 동기 blocking I/O in async handler (무분별) | async 라이브러리 또는 threadpool |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. app/schemas/{domain}.py     ← Pydantic Create/Update/Response
2. app/models/{domain}.py      ← ORM 모델 (필요 시)
3. app/services/{domain}.py    ← 비즈니스 로직
4. app/routers/{domain}.py     ← APIRouter 엔드포인트
5. app/main.py                 ← router include (신규 도메인 시)
6. tests/test_{domain}.py      ← httpx 테스트
```

### Implementer 체크리스트

- [ ] `response_model` + 적절한 `status_code`
- [ ] `tags`로 OpenAPI 그룹화
- [ ] Depends로 서비스/DB 주입
- [ ] 타입 힌트 전면 적용 (`mypy` 통과)
- [ ] 기존 router prefix 패턴 준수

---

## 참고 문서

- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Bigger Applications](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [SQL (ORM)](https://fastapi.tiangolo.com/tutorial/sql-databases/)
- [Pydantic V2](https://docs.pydantic.dev/latest/)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — FastAPI 공식 문서 기반 컨벤션 |
