# Django 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [Django Tutorial](https://docs.djangoproject.com/en/stable/intro/tutorial01/), [Models](https://docs.djangoproject.com/en/stable/topics/db/models/), [Views](https://docs.djangoproject.com/en/stable/topics/http/views/), [Django REST framework](https://www.django-rest-framework.org/)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Django** 5.x | MTV 패턴 |
| API (선택) | **Django REST framework (DRF)** | Serializer / ViewSet |
| ORM | **Django ORM** | `Model`, `QuerySet`, Migration |
| 검증 | DRF `Serializer` / Django `Form` | API는 Serializer 우선 |
| 테스트 | **pytest-django** / `django.test` | `TestCase`, `APIClient` |
| 린트 | **ruff**, **mypy** (django-stubs) | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[Writing your first Django app](https://docs.djangoproject.com/en/stable/intro/tutorial01/) 및 [Reusable apps](https://docs.djangoproject.com/en/stable/intro/reusable-apps/) 구조를 따른다.

```
project-root/
├── config/                      # 프로젝트 설정 (또는 {project_name}/)
│   ├── settings/
│   │   ├── base.py
│   │   └── local.py
│   ├── urls.py                  # 루트 URLconf
│   └── wsgi.py
├── apps/
│   └── {domain}/
│       ├── __init__.py
│       ├── models.py
│       ├── views.py             # 또는 views/ 패키지
│       ├── serializers.py       # DRF
│       ├── urls.py
│       ├── services.py          # 비즈니스 로직 (선택)
│       ├── admin.py
│       ├── migrations/
│       └── tests/
│           └── test_{feature}.py
├── manage.py
└── pyproject.toml
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 앱 | 소문자 단수/복수, `apps/` 하위 | `apps/users/` |
| 모델 | `PascalCase`, 단수 | `User`, `OrderItem` |
| Serializer | `{Model}Serializer`, `{Model}CreateSerializer` | `UserSerializer` |
| View | 함수: `list_users`, 클래스: `UserListView` | `UserViewSet` |
| URL name | `{app}:{action}` | `users:detail` |
| 테스트 | `test_{feature}.py` | `test_user_api.py` |

---

## 4. Model 패턴

[Models](https://docs.djangoproject.com/en/stable/topics/db/models/) 기준:

```python
# apps/users/models.py
from django.db import models

class User(models.Model):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.email
```

- 필드 타입·`Meta`·`__str__` 명시
- 스키마 변경 후 `makemigrations` → `migrate`

---

## 5. Serializer 패턴 (DRF)

[Serializers](https://www.django-rest-framework.org/api-guide/serializers/) 기준:

```python
# apps/users/serializers.py
from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "name", "created_at"]
        read_only_fields = ["id", "created_at"]

class UserCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "name"]
```

- 읽기/쓰기 Serializer 분리 (필요 시)
- `validate_{field}` / `validate()` 로 커스텀 검증

---

## 6. View / ViewSet 패턴

[Class-based views](https://docs.djangoproject.com/en/stable/topics/class-based-views/) 및 [DRF ViewSets](https://www.django-rest-framework.org/api-guide/viewsets/) 기준:

```python
# apps/users/views.py
from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import User
from .serializers import UserSerializer, UserCreateSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer
```

함수 기반 뷰 ([Writing views](https://docs.djangoproject.com/en/stable/topics/http/views/)):

```python
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def list_users(request):
    users = User.objects.all().values("id", "email", "name")
    return JsonResponse(list(users), safe=False)
```

- API 프로젝트: ViewSet + Router 우선
- 뷰는 **얇게** — 복잡한 로직은 `services.py`

---

## 7. URL 라우팅

[URL dispatcher](https://docs.djangoproject.com/en/stable/topics/http/urls/) 기준:

```python
# apps/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
]
```

```python
# config/urls.py
urlpatterns = [
    path("api/", include("apps.users.urls")),
]
```

- 앱별 `urls.py` 분리, 루트에서 `include`
- `name` 인자로 reverse URL 지원

---

## 8. 에러 처리

[DRF Exceptions](https://www.django-rest-framework.org/api-guide/exceptions/) 기준:

```python
from rest_framework.exceptions import NotFound, ValidationError

raise NotFound("User not found")
```

- 서비스: 도메인 예외 또는 DRF `APIException` 하위
- ViewSet: `get_object()` 가 404 자동 처리
- 전역 `EXCEPTION_HANDLER` 커스텀 (선택)
- 500 상세 스택은 프로덕션 응답에 노출 금지

---

## 9. 테스트

[Testing in Django](https://docs.djangoproject.com/en/stable/topics/testing/) 기준:

```python
# apps/users/tests/test_user_api.py
import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_create_user():
    client = APIClient()
    response = client.post("/api/users/", {"email": "a@b.com", "name": "A"})
    assert response.status_code == 201
    assert response.data["email"] == "a@b.com"
```

- `@pytest.mark.django_db` 또는 `TestCase`
- Factory (`factory_boy`) 또는 fixture로 테스트 데이터

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| 뷰에 복잡한 비즈니스 로직 | `services.py` 분리 |
| Raw SQL 남용 | Django ORM `QuerySet` |
| `objects.all()` 무제한 반환 | `filter`, pagination |
| Serializer 없이 `dict` 직접 반환 (DRF) | `Serializer` / `Response` |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. apps/{domain}/models.py        ← Model + migration
2. apps/{domain}/serializers.py   ← DRF Serializer (API 시)
3. apps/{domain}/services.py      ← 비즈니스 로직 (필요 시)
4. apps/{domain}/views.py         ← View / ViewSet
5. apps/{domain}/urls.py          ← URL 패턴
6. config/urls.py                 ← include (신규 앱 시)
7. apps/{domain}/tests/           ← pytest / TestCase
```

### Implementer 체크리스트

- [ ] migration 생성 및 적용
- [ ] Serializer read/write 분리 (필요 시)
- [ ] 적절한 HTTP status (`201` 생성)
- [ ] `basename` / URL `name` 설정
- [ ] 기존 `api/` prefix 패턴 준수

---

## 참고 문서

- [Django Tutorial](https://docs.djangoproject.com/en/stable/intro/tutorial01/)
- [Models](https://docs.djangoproject.com/en/stable/topics/db/models/)
- [Views](https://docs.djangoproject.com/en/stable/topics/http/views/)
- [URL dispatcher](https://docs.djangoproject.com/en/stable/topics/http/urls/)
- [Testing](https://docs.djangoproject.com/en/stable/topics/testing/)
- [Django REST framework](https://www.django-rest-framework.org/)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — Django 공식 문서 기반 컨벤션 |
