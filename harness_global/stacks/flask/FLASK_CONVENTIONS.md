# Flask 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [Flask Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/), [Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/), [Error Handling](https://flask.palletsprojects.com/en/stable/errorhandling/)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Flask** 3.x | WSGI 마이크로 프레임워크 |
| 언어 | **Python** 3.11+ | type hints 권장 |
| 검증 | **Pydantic** / **marshmallow** | 프로젝트 기존 패턴 우선 |
| ORM (선택) | SQLAlchemy / Flask-SQLAlchemy | 프로젝트 기존 패턴 우선 |
| 테스트 | **pytest** + **Flask test client** | `app.test_client()` |
| 린트 | **ruff**, **mypy** | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/) 및 [Application Factory](https://flask.palletsprojects.com/en/stable/patterns/appfactories/) 구조를 따른다.

```
project-root/
├── app/
│   ├── __init__.py              # create_app() 팩토리
│   ├── extensions.py            # db, migrate 등
│   ├── {domain}/
│   │   ├── __init__.py
│   │   ├── routes.py            # Blueprint
│   │   ├── services.py
│   │   ├── schemas.py           # Pydantic/marshmallow
│   │   └── models.py
│   └── errors.py                # error handlers
├── tests/
│   ├── conftest.py
│   └── test_{domain}.py
├── wsgi.py
└── pyproject.toml
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| Blueprint | `{domain}` 이름, `routes.py` | `users/routes.py` |
| 라우트 함수 | `{action}_{resource}` | `list_users`, `create_user` |
| 서비스 | `services.py` | `users/services.py` |
| 스키마 | `{Entity}Create`, `{Entity}Response` | `UserCreate` |
| 모델 | `PascalCase` | `User` |
| 테스트 | `test_{domain}.py` | `test_users.py` |

---

## 4. Application Factory

[Application Factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/) 기준:

```python
# app/__init__.py
from flask import Flask

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(f"app.config.{config_name.capitalize()}Config")

    from app.users.routes import users_bp
    app.register_blueprint(users_bp, url_prefix="/users")

    from app.errors import register_error_handlers
    register_error_handlers(app)

    return app
```

- `create_app()` 팩토리 패턴 필수
- `wsgi.py`: `app = create_app()`

---

## 5. Blueprint / Route 패턴

[Routing](https://flask.palletsprojects.com/en/stable/quickstart/#routing) 및 [Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/) 기준:

```python
# app/users/routes.py
from flask import Blueprint, jsonify, request

from app.users.schemas import UserCreate
from app.users import services

users_bp = Blueprint("users", __name__)

@users_bp.get("/")
def list_users():
    return jsonify(services.find_all())

@users_bp.post("/")
def create_user():
    data = UserCreate.model_validate(request.get_json())
    user = services.create(data)
    return jsonify(user.model_dump()), 201

@users_bp.get("/<int:user_id>")
def get_user(user_id: int):
    user = services.find_by_id(user_id)
    return jsonify(user.model_dump())
```

- 도메인별 Blueprint 분리
- 라우트 핸들러는 **얇게** — 로직은 `services.py`

---

## 6. Schema (검증) 패턴

[Pydantic](https://docs.pydantic.dev/latest/) 기준 (프로젝트 선택 시):

```python
# app/users/schemas.py
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

- 요청: `model_validate(request.get_json())`
- 응답: `model_dump()` → `jsonify`

---

## 7. Service 패턴

```python
# app/users/services.py
from app.extensions import db
from app.users.models import User
from app.users.schemas import UserCreate

class UserNotFoundError(Exception):
    pass

def find_by_id(user_id: int) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")
    return user

def create(data: UserCreate) -> User:
    user = User(email=data.email, name=data.name)
    db.session.add(user)
    db.session.commit()
    return user
```

- DB 세션은 `extensions.py`에서 초기화
- 도메인 예외는 서비스에서 throw

---

## 8. 에러 처리

[Error Handling](https://flask.palletsprojects.com/en/stable/errorhandling/) 기준:

```python
# app/errors.py
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from app.users.services import UserNotFoundError

def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(UserNotFoundError)
    def handle_not_found(err: UserNotFoundError):
        return jsonify({"message": str(err)}), 404

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        return jsonify({"message": err.description}), err.code

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        app.logger.exception(err)
        return jsonify({"message": "Internal Server Error"}), 500
```

- `@app.errorhandler` 또는 Blueprint 레벨 핸들러
- 500 상세 스택은 프로덕션 응답에 노출 금지

---

## 9. 테스트

[Testing Flask Applications](https://flask.palletsprojects.com/en/stable/testing/) 기준:

```python
import pytest

@pytest.fixture
def client(app):
    return app.test_client()

def test_create_user(client):
    response = client.post("/users/", json={"email": "a@b.com", "name": "A"})
    assert response.status_code == 201
    assert response.json["email"] == "a@b.com"
```

- `conftest.py`에 `app` fixture (`create_app("testing")`)
- 테스트 DB 또는 transaction rollback

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| 단일 `app.py`에 모든 라우트 | Blueprint 분리 |
| 라우트에 비즈니스 로직 직접 작성 | `services/` |
| `request.get_json()` 무반증 사용 | Pydantic/marshmallow |
| 전역 mutable 상태 | `g`, `current_app`, DB session |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. app/{domain}/schemas.py       ← 요청/응답 스키마
2. app/{domain}/models.py        ← ORM 모델 (필요 시)
3. app/{domain}/services.py      ← 비즈니스 로직
4. app/{domain}/routes.py        ← Blueprint 라우트
5. app/__init__.py               ← blueprint register (신규 도메인 시)
6. app/errors.py                 ← 도메인 예외 핸들러 (필요 시)
7. tests/test_{domain}.py        ← test_client 테스트
```

### Implementer 체크리스트

- [ ] `create_app()` 팩토리 패턴 유지
- [ ] Blueprint `url_prefix` 기존 패턴 준수
- [ ] 요청 검증 + 적절한 status code
- [ ] `@app.errorhandler`로 도메인 예외 변환
- [ ] type hints 적용

---

## 참고 문서

- [Flask Quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/)
- [Application Factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)
- [Error Handling](https://flask.palletsprojects.com/en/stable/errorhandling/)
- [Testing](https://flask.palletsprojects.com/en/stable/testing/)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — Flask 공식 문서 기반 컨벤션 |
