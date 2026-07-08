# Express 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [Express Routing Guide](https://expressjs.com/en/guide/routing.html), [Writing Middleware](https://expressjs.com/en/guide/writing-middleware.html), [Error Handling](https://expressjs.com/en/guide/error-handling.html)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Express** 4.x / 5.x | Node.js HTTP 서버 |
| 언어 | **TypeScript** (권장) / JavaScript | `ts-node` 또는 빌드 후 실행 |
| 검증 | **zod** / **joi** / **express-validator** | 프로젝트 기존 패턴 우선 |
| ORM (선택) | Prisma / Sequelize / Knex | 프로젝트 기존 패턴 우선 |
| 테스트 | **Jest** + **supertest** | HTTP 통합 테스트 |
| 린트 | **ESLint** + **Prettier** | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[Express Routing](https://expressjs.com/en/guide/routing.html) 및 [Express Application](https://expressjs.com/en/starter/hello-world.html) 구조를 따른다.

```
project-root/
├── src/
│   ├── app.ts                   # express(), 미들웨어, 라우터 마운트
│   ├── server.ts                # listen (진입점)
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   └── validate.ts
│   ├── routes/
│   │   └── {domain}.routes.ts   # Router 인스턴스
│   ├── controllers/
│   │   └── {domain}.controller.ts
│   ├── services/
│   │   └── {domain}.service.ts
│   ├── schemas/                 # zod/joi 검증 스키마
│   │   └── {domain}.schema.ts
│   └── types/
│       └── express.d.ts         # Request 확장 (선택)
├── tests/
│   └── {domain}.test.ts
└── package.json
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 라우터 | `{domain}.routes.ts`, `Router` export | `users.routes.ts` |
| 컨트롤러 | `{domain}.controller.ts` | `users.controller.ts` |
| 서비스 | `{domain}.service.ts` | `users.service.ts` |
| 스키마 | `{domain}.schema.ts` | `users.schema.ts` |
| 미들웨어 | `{purpose}.ts` | `error-handler.ts` |
| 테스트 | `{domain}.test.ts` | `users.test.ts` |

---

## 4. Router 패턴

[Routing Guide](https://expressjs.com/en/guide/routing.html) 기준:

```typescript
// src/routes/users.routes.ts
import { Router } from 'express';
import * as usersController from '../controllers/users.controller';

const router = Router();

router.get('/', usersController.listUsers);
router.post('/', usersController.createUser);
router.get('/:id', usersController.getUser);

export default router;
```

`app.ts`에서 마운트:

```typescript
import usersRouter from './routes/users.routes';

app.use('/users', usersRouter);
```

- 도메인별 `Router` 분리 후 `app.use(prefix, router)` 등록
- 라우트 핸들러는 컨트롤러 함수로 위임

---

## 5. Controller 패턴

[Request / Response](https://expressjs.com/en/4x/api.html#req) 기준:

```typescript
// src/controllers/users.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';

export async function listUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const users = await usersService.findAll();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await usersService.create(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}
```

- `req` / `res` / `next` 시그니처 준수
- 비동기 에러는 `next(err)`로 전달 (또는 `express-async-errors`)

---

## 6. Service 패턴

비즈니스 로직·DB 접근은 서비스 레이어에 집중:

```typescript
// src/services/users.service.ts
import { prisma } from '../lib/prisma';

export async function findAll() {
  return prisma.user.findMany();
}

export async function findById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    const err = new Error('User not found');
    (err as any).status = 404;
    throw err;
  }
  return user;
}
```

- 컨트롤러는 HTTP 변환만, 서비스는 도메인 로직 담당

---

## 7. 미들웨어 및 검증

[Using Middleware](https://expressjs.com/en/guide/using-middleware.html) 기준:

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { createUserSchema } from '../schemas/users.schema';

export function validateCreateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  req.body = result.data;
  next();
}
```

- 검증 미들웨어를 라우트에 체인: `router.post('/', validateCreateUser, createUser)`
- 전역 미들웨어 순서: `json()` → `cors` → 라우터 → 에러 핸들러

---

## 8. 에러 처리

[Error Handling](https://expressjs.com/en/guide/error-handling.html) 기준:

```typescript
// src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status ?? 500;
  res.status(status).json({
    message: status < 500 ? err.message : 'Internal Server Error',
  });
}
```

- 4-인자 `(err, req, res, next)` 시그니처 필수
- `app.use(errorHandler)`는 **모든 라우터 뒤**에 등록
- 500 상세 스택은 프로덕션 응답에 노출 금지

---

## 9. 테스트

[supertest](https://github.com/ladjs/supertest) + Jest 기준:

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('GET /users', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

- `app` 인스턴스만 export, `listen`은 `server.ts`에서 분리
- 테스트 DB 또는 mock repository 사용

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| 라우트 핸들러에 비즈니스 로직 직접 작성 | `services/` 분리 |
| async 에러 미처리 (`throw`만) | `next(err)` 또는 async wrapper |
| `res.send` / `res.json` 중복 호출 | 단일 응답 경로 |
| 전역 mutable 상태 | 요청 스코프 또는 DI |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. src/schemas/{domain}.schema.ts   ← 요청 검증 스키마
2. src/services/{domain}.service.ts ← 비즈니스 로직
3. src/controllers/{domain}.controller.ts ← req/res 핸들러
4. src/routes/{domain}.routes.ts    ← Router + 미들웨어 체인
5. src/app.ts                       ← router mount (신규 도메인 시)
6. tests/{domain}.test.ts           ← supertest 테스트
```

### Implementer 체크리스트

- [ ] 적절한 HTTP status code (`201` 생성, `404` 미존재)
- [ ] 검증 미들웨어 라우트에 연결
- [ ] async 핸들러 `next(err)` 처리
- [ ] 에러 핸들러 4-인자 시그니처
- [ ] 기존 `/api` prefix 패턴 준수

---

## 참고 문서

- [Express Routing Guide](https://expressjs.com/en/guide/routing.html)
- [Using Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Writing Middleware](https://expressjs.com/en/guide/writing-middleware.html)
- [Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Express 4.x API](https://expressjs.com/en/4x/api.html)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — Express 공식 문서 기반 컨벤션 |
