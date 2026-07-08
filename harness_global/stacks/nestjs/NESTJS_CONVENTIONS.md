# NestJS 프로젝트 컨벤션

> 하네스 파이프라인(분석 → 구현 → QA)에서 **모든 에이전트가 구현 전 반드시 참조**하는 규칙 문서.
> 기준: [NestJS Overview](https://docs.nestjs.com/), [Modules](https://docs.nestjs.com/modules), [Controllers](https://docs.nestjs.com/controllers), [Providers](https://docs.nestjs.com/providers), [Validation](https://docs.nestjs.com/techniques/validation)

---

## 1. 기술 스택

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **NestJS** | Express/Fastify 어댑터 |
| 언어 | **TypeScript** | strict 모드 권장 |
| 검증 | **class-validator** + **class-transformer** | `ValidationPipe` 전역 적용 |
| ORM (선택) | TypeORM / Prisma | 프로젝트 기존 패턴 우선 |
| 테스트 | **Jest** + **@nestjs/testing** | e2e: `supertest` |
| 린트 | **ESLint** + **Prettier** | `harness.config.yaml` test_runner 연동 |

---

## 2. 폴더 구조

[공식 Modules](https://docs.nestjs.com/modules) 및 [Feature modules](https://docs.nestjs.com/modules#feature-modules) 구조를 따른다.

```
project-root/
├── src/
│   ├── main.ts                  # bootstrap, global pipes/filters
│   ├── app.module.ts            # 루트 모듈
│   ├── common/
│   │   ├── filters/             # ExceptionFilter
│   │   ├── interceptors/
│   │   └── pipes/
│   └── {domain}/
│       ├── {domain}.module.ts
│       ├── {domain}.controller.ts
│       ├── {domain}.service.ts
│       ├── dto/
│       │   ├── create-{entity}.dto.ts
│       │   └── update-{entity}.dto.ts
│       └── entities/
│           └── {entity}.entity.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
└── package.json
```

---

## 3. 파일·네이밍 규칙

| 종류 | 규칙 | 예시 |
|------|------|------|
| 모듈 | `{domain}.module.ts` | `users.module.ts` |
| 컨트롤러 | `{domain}.controller.ts` | `users.controller.ts` |
| 서비스 | `{domain}.service.ts` | `users.service.ts` |
| DTO | `create-{entity}.dto.ts`, `update-{entity}.dto.ts` | `create-user.dto.ts` |
| 엔티티 | `{entity}.entity.ts` | `user.entity.ts` |
| 테스트 | `{domain}.service.spec.ts`, `{domain}.controller.spec.ts` | `users.service.spec.ts` |

---

## 4. Module 패턴

[Modules](https://docs.nestjs.com/modules) 기준:

```typescript
// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- 기능 단위로 **Feature Module** 분리
- `AppModule`에 `imports: [UsersModule, ...]` 등록
- 공유 서비스는 `exports`로 노출

---

## 5. Controller 패턴

[Controllers](https://docs.nestjs.com/controllers) 기준:

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
```

- 라우트 prefix는 `@Controller('users')`에 선언
- 핸들러는 **얇게** — 비즈니스 로직은 Service에

---

## 6. Service (Provider) 패턴

[Providers](https://docs.nestjs.com/providers) 기준:

```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto) {
    return this.userRepository.save(dto);
  }
}
```

- `@Injectable()` 데코레이터 필수
- 생성자 주입으로 의존성 해결 (Repository, 다른 Service)

---

## 7. DTO 및 검증

[Validation](https://docs.nestjs.com/techniques/validation) 기준:

```typescript
// src/users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  name: string;
}
```

`main.ts` 전역 파이프:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

- 요청 DTO와 응답 타입 분리
- `PartialType(CreateUserDto)` 로 Update DTO 생성 ([Mapped Types](https://docs.nestjs.com/openapi/mapped-types))

---

## 8. 에러 처리

[Exception filters](https://docs.nestjs.com/exception-filters) 기준:

```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

throw new NotFoundException('User not found');
```

- 서비스: `HttpException` 하위 클래스 throw
- 전역 `@Catch()` 필터로 일관된 에러 응답 형식
- 500 스택 트레이스는 프로덕션 응답에 노출 금지

---

## 9. 테스트

[Testing](https://docs.nestjs.com/fundamentals/testing) 기준:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- 단위: `TestingModule` + mock provider
- e2e: `supertest` + 실제 HTTP 요청

---

## 10. 금지 사항

| 금지 | 대안 |
|------|------|
| 컨트롤러에 비즈니스 로직 직접 작성 | `Service` 분리 |
| `any` 타입 남용 | DTO + 명시적 반환 타입 |
| 모듈 없이 전역 singleton | Nest DI (`providers` / `exports`) |
| ValidationPipe 미적용 | 전역 `ValidationPipe` |
| 요청 범위 밖 리팩토링 | 스펙 범위만 수정 |

---

## 11. 구현 순서 (하네스 Implementer용)

```
1. src/{domain}/dto/              ← Create/Update DTO + class-validator
2. src/{domain}/entities/         ← 엔티티 (ORM 사용 시)
3. src/{domain}/{domain}.service.ts  ← 비즈니스 로직
4. src/{domain}/{domain}.controller.ts  ← 라우트 핸들러
5. src/{domain}/{domain}.module.ts  ← Module 등록
6. src/app.module.ts              ← Feature Module import (신규 도메인 시)
7. test/ 또는 *.spec.ts           ← 단위/e2e 테스트
```

### Implementer 체크리스트

- [ ] DTO에 `class-validator` 데코레이터 적용
- [ ] `@Injectable()` + 생성자 주입
- [ ] `@Controller` prefix 기존 패턴 준수
- [ ] `HttpException` 하위로 도메인 에러 처리
- [ ] Module `exports` 필요 시 설정

---

## 참고 문서

- [NestJS Overview](https://docs.nestjs.com/)
- [Modules](https://docs.nestjs.com/modules)
- [Controllers](https://docs.nestjs.com/controllers)
- [Providers](https://docs.nestjs.com/providers)
- [Validation](https://docs.nestjs.com/techniques/validation)
- [Exception Filters](https://docs.nestjs.com/exception-filters)
- [Testing](https://docs.nestjs.com/fundamentals/testing)

---

**변경 이력**

| 날짜 | 변경 내용 |
|------|----------|
| 2026-07-08 | 초기 작성 — NestJS 공식 문서 기반 컨벤션 |
