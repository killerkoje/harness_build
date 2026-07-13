# Musinsa Store — Design System (MVP)

무신사 스토어 앱 MVP용 디자인 시스템 초안. 토큰 원본: `tokens.json`.

## 방향

- **브랜드**: 블랙 베이스 + 오렌지 액센트(`#FF4800`) — 커머스 CTA·세일 강조
- **밀도**: comfortable (터치 타깃 ≥ 44px)
- **타이포**: Pretendard 우선, 숫자/가격은 tabular에 가깝게 읽히도록 정렬

## 핵심 토큰

| 역할 | 값 |
|------|-----|
| Primary | `#111111` |
| Accent / Sale | `#FF4800` |
| Canvas | `#FFFFFF` |
| Border | `#E8E8E8` |
| Text secondary | `#525252` |

## 컴포넌트 우선순위 (MVP)

1. **TopNav / TabBar** — 5탭: 홈 · 카테고리 · 검색 · 좋아요 · 마이
2. **ProductCard** — 3:4 이미지, 브랜드/상품명/가격/세일/위시
3. **Button** — primary(구매) · secondary · ghost
4. **Chip** — 필터·세일·랭킹
5. **BottomSheet** — 옵션/필터/배송
6. **Price** — 정가·할인가·할인율 규칙 고정

## 이슈 매핑

| 이슈 | DS 의존 |
|------|---------|
| 홈 피드 | ProductCard, Chip(랭킹/세일), TabBar |
| 카테고리·브랜드 | Chip(filter), TopNav |
| 검색·필터 | Chip, BottomSheet |
| 상품 상세 | Price, Button(primary), BottomSheet(옵션) |
| 장바구니 | ProductCard(compact), Button |
| 주문·결제 | Button, Price |
| 위시리스트 | ProductCard, TabBar |
| 마이·주문내역 | TopNav, list rows |

## 범위 밖 (DS v0.1)

- 다크 모드 완성 팔레트
- 일러스트/모션 라이브러리
- 웹 전용 그리드(12col) 상세 스펙
