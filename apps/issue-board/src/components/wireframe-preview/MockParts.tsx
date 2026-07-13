import type { PreviewTheme } from './theme'
import { MOCK_PRODUCTS, formatWon } from './theme'
import type { PreviewIx, TabId } from './ix'

function IconBell({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

function IconBag({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M6 7h15l-1.4 8.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.6L5 3H2" />
      <circle cx="10" cy="20" r="1.4" fill={color} stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill={color} stroke="none" />
    </svg>
  )
}

function IconHeart({ color, filled }: { color: string; filled?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.8">
      <path d="M12 21s-7-4.4-9.5-8.2C.4 9.6 2.2 6 5.8 6c2 0 3.3 1.2 4.2 2.4C11 7.2 12.2 6 14.2 6c3.6 0 5.4 3.6 3.3 6.8C19 16.6 12 21 12 21z" />
    </svg>
  )
}

function IconBack({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

function IconShare({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.5 13.2l7 4M15.5 6.8l-7 4" />
    </svg>
  )
}

export const TAB_ICONS: TabId[] = ['홈', '카테고리', '검색', '좋아요', '마이']

const BANNERS = [
  {
    eyebrow: 'CURATION',
    title: '여름 세일 최대 50%',
    sub: '인기 브랜드 한정 특가',
    gradient: (t: PreviewTheme) => `linear-gradient(135deg, ${t.primary} 0%, #333 45%, ${t.accent} 100%)`,
  },
  {
    eyebrow: 'NEW DROP',
    title: '이번 주 신상',
    sub: 'ADER · Stussy · Nike',
    gradient: () => 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #334155 100%)',
  },
  {
    eyebrow: 'RANKING',
    title: '지금 잘 팔려요',
    sub: '실시간 랭킹 TOP 20',
    gradient: () => 'linear-gradient(135deg, #422006 0%, #78350f 40%, #ea580c 100%)',
  },
]

export function MockStatusBar({ theme }: { theme: PreviewTheme }) {
  return (
    <div
      className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide"
      style={{ color: theme.text, background: theme.canvas }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5 opacity-80">
        <span className="text-[10px]">●●●●</span>
        <span className="text-[10px]">Wi‑Fi</span>
        <span className="inline-block w-5 h-2.5 rounded-sm border border-current relative">
          <span className="absolute inset-0.5 right-1 rounded-[1px] bg-current" />
        </span>
      </div>
    </div>
  )
}

export function MockTopNav({
  theme,
  label,
  ix,
}: {
  theme: PreviewTheme
  label: string
  ix?: PreviewIx
}) {
  const hasBack = /뒤로|back/i.test(label) || Boolean(ix?.canGoBack && ix.onBack)
  const isLogo = /로고|홈|알림/.test(label) && !/뒤로/.test(label)
  const titleMatch = label.split(/[·•|]/).map((s) => s.trim()).filter(Boolean)
  const title = hasBack
    ? titleMatch.find((t) => !/뒤로|공유|장바구니|위시|back/i.test(t)) ?? ''
    : isLogo
      ? 'MUSINSA'
      : titleMatch[0] ?? label

  return (
    <div
      className="relative flex h-12 items-center justify-between px-3 shrink-0"
      style={{ background: theme.canvas, borderBottom: `1px solid ${theme.border}` }}
    >
      <div className="w-20 flex items-center gap-1">
        {hasBack ? (
          <button
            type="button"
            className="p-1.5 -ml-1 active:opacity-60"
            aria-label="뒤로"
            onClick={() => ix?.onBack?.()}
          >
            <IconBack color={theme.text} />
          </button>
        ) : isLogo ? (
          <span className="text-[15px] font-black tracking-tight" style={{ color: theme.primary }}>
            MUSINSA
          </span>
        ) : (
          <span className="text-[15px] font-semibold truncate" style={{ color: theme.text }}>
            {title}
          </span>
        )}
      </div>
      {hasBack && title ? (
        <span className="text-[15px] font-semibold absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ color: theme.text }}>
          {title}
        </span>
      ) : null}
      <div className="w-20 flex items-center justify-end gap-1">
        {/공유/.test(label) && (
          <button type="button" className="p-1.5 active:opacity-60" aria-label="공유" onClick={() => ix?.flash('링크가 복사됐어요')}>
            <IconShare color={theme.text} />
          </button>
        )}
        {/알림/.test(label) && (
          <button type="button" className="p-1.5 active:opacity-60" aria-label="알림" onClick={() => ix?.flash('새 알림 없음')}>
            <IconBell color={theme.text} />
          </button>
        )}
        {/위시|좋아요/.test(label) && !hasBack && (
          <button type="button" className="p-1.5 active:opacity-60" aria-label="위시" onClick={() => ix?.onTab('좋아요')}>
            <IconHeart color={theme.text} />
          </button>
        )}
        {/장바구니|카트/.test(label) && (
          <button type="button" className="relative p-1.5 active:opacity-60" aria-label="장바구니" onClick={() => ix?.onCartClick()}>
            <IconBag color={theme.text} />
            {(ix?.cartCount ?? 0) > 0 && (
              <span
                className="absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                style={{ background: theme.accent, color: theme.primaryInverse }}
              >
                {ix!.cartCount}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export function MockBanner({ theme, ix }: { theme: PreviewTheme; ix?: PreviewIx }) {
  const idx = ix?.bannerIndex ?? 0
  const b = BANNERS[idx % BANNERS.length]
  return (
    <button
      type="button"
      className="relative w-full aspect-[16/9] overflow-hidden shrink-0 text-left"
      onClick={() => ix?.onBannerNext()}
    >
      <div className="absolute inset-0 transition-all duration-300" style={{ background: b.gradient(theme) }} />
      <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
        <p className="text-[11px] font-medium tracking-[0.12em] opacity-80">{b.eyebrow}</p>
        <p className="text-xl font-bold leading-tight mt-1">{b.title}</p>
        <p className="text-xs opacity-80 mt-1">{b.sub}</p>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <span
            key={i}
            role="presentation"
            onClick={(e) => {
              e.stopPropagation()
              ix?.onBannerDot(i)
            }}
            className="rounded-full transition-all"
            style={{
              width: i === idx % BANNERS.length ? 16 : 4,
              height: 4,
              background: i === idx % BANNERS.length ? '#fff' : 'rgba(255,255,255,0.45)',
            }}
          />
        ))}
      </div>
    </button>
  )
}

export function MockChips({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  const chips = /랭킹|세일/.test(label)
    ? ['랭킹', '세일', '신상', '브랜드', '추천']
    : /필터|상태/.test(label)
      ? ['전체', '입금대기', '배송중', '완료']
      : label
          .split(/[·+,/]/)
          .map((s) => s.replace(/Chip|필터|상태/gi, '').trim())
          .filter((s) => s.length > 0 && s.length < 12)
          .slice(0, 5)
  const items = chips.length ? chips : ['전체', '추천', '인기']
  const selected = ix?.selectedChip ?? items[0]

  return (
    <div className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0" style={{ background: theme.canvas }}>
      {items.map((chip) => {
        const active = chip === selected
        const sale = chip === '세일'
        return (
          <button
            key={chip}
            type="button"
            onClick={() => {
              ix?.onChip(chip)
              ix?.flash(`${chip} 선택`)
            }}
            className="shrink-0 px-3 py-1.5 text-[12px] font-semibold rounded-full border active:scale-95 transition-transform"
            style={{
              background: active ? theme.primary : theme.canvas,
              color: active ? theme.primaryInverse : sale ? theme.sale : theme.text,
              borderColor: active ? theme.primary : theme.border,
            }}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}

export function MockProductGrid({ theme, ix }: { theme: PreviewTheme; ix?: PreviewIx }) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-4 px-3 py-2" style={{ background: theme.canvas }}>
      {MOCK_PRODUCTS.map((p) => {
        const wished = Boolean(ix?.wished[p.name])
        return (
          <article key={p.name} className="min-w-0">
            <button
              type="button"
              className="relative w-full aspect-[3/4] rounded-sm overflow-hidden active:opacity-90 text-left"
              style={{ background: p.tone }}
              onClick={() => ix?.onProductClick(p.name)}
            >
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,#fff,transparent_55%)]" />
              <span
                role="button"
                tabIndex={0}
                className="absolute top-2 right-2 p-1 z-10"
                aria-label="위시"
                onClick={(e) => {
                  e.stopPropagation()
                  ix?.onToggleWish(p.name)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation()
                    ix?.onToggleWish(p.name)
                  }
                }}
              >
                <IconHeart color={wished ? theme.accent : '#fff'} filled={wished} />
              </span>
              {p.rate > 0 && (
                <span
                  className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: theme.accent, color: '#fff' }}
                >
                  {p.rate}%
                </span>
              )}
            </button>
            <button type="button" className="mt-2 space-y-0.5 w-full text-left" onClick={() => ix?.onProductClick(p.name)}>
              <p className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                {p.brand}
              </p>
              <p className="text-[12px] leading-snug line-clamp-2" style={{ color: theme.text }}>
                {p.name}
              </p>
              <div className="flex items-baseline gap-1 pt-0.5">
                {p.rate > 0 && (
                  <span className="text-[12px] font-bold" style={{ color: theme.sale }}>
                    {p.rate}%
                  </span>
                )}
                <span className="text-[13px] font-bold" style={{ color: theme.text }}>
                  {formatWon(p.sale)}
                </span>
              </div>
              {p.rate > 0 && (
                <p className="text-[10px] line-through" style={{ color: theme.textTertiary }}>
                  {formatWon(p.price)}
                </p>
              )}
            </button>
          </article>
        )
      })}
    </div>
  )
}

export function MockTabBar({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  const isFullBar = /홈/.test(label) && /카테고리/.test(label)
  let fallback: TabId = '홈'
  if (isFullBar) {
    fallback = /좋아요/.test(label) && /활성/.test(label) ? '좋아요' : '홈'
  } else if (/좋아요/.test(label)) fallback = '좋아요'
  else if (/마이/.test(label)) fallback = '마이'
  else if (/카테고리/.test(label)) fallback = '카테고리'
  else if (/검색/.test(label)) fallback = '검색'

  const active = ix?.activeTab ?? fallback

  return (
    <div
      className="grid grid-cols-5 h-14 shrink-0 border-t"
      style={{ background: theme.canvas, borderColor: theme.border }}
    >
      {TAB_ICONS.map((tab) => {
        const isOn = tab === active
        return (
          <button
            key={tab}
            type="button"
            onClick={() => ix?.onTab(tab)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium active:scale-95"
            style={{ color: isOn ? theme.primary : theme.textTertiary }}
          >
            <span className="text-[15px] leading-none">
              {tab === '홈' ? '⌂' : tab === '카테고리' ? '▦' : tab === '검색' ? '⌕' : tab === '좋아요' ? '♡' : '☺'}
            </span>
            <span>{tab}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MockPrice({ theme, label }: { theme: PreviewTheme; label?: string }) {
  const withMeta = !label || /브랜드|상품명/.test(label)
  return (
    <div className="px-4 py-3 space-y-1" style={{ background: theme.canvas }}>
      {withMeta && (
        <>
          <p className="text-[12px] font-semibold" style={{ color: theme.textSecondary }}>
            ADER ERROR
          </p>
          <p className="text-[16px] font-semibold leading-snug" style={{ color: theme.text }}>
            오버핏 로고 후드 집업
          </p>
        </>
      )}
      <div className={`flex items-baseline gap-2 ${withMeta ? 'pt-1' : ''}`}>
        <span className="text-[18px] font-bold" style={{ color: theme.sale }}>
          20%
        </span>
        <span className="text-[20px] font-bold" style={{ color: theme.text }}>
          {formatWon(71200)}
        </span>
        <span className="text-[13px] line-through" style={{ color: theme.textTertiary }}>
          {formatWon(89000)}
        </span>
      </div>
    </div>
  )
}

export function MockGallery({ theme, ix }: { theme: PreviewTheme; ix?: PreviewIx }) {
  const idx = ix?.galleryIndex ?? 0
  const tones = ['#1a1a1a', '#2c3e50', '#3d4a3a', '#44403c']
  return (
    <button
      type="button"
      className="relative w-full aspect-[3/4] shrink-0"
      style={{ background: tones[idx % tones.length] }}
      onClick={() => ix?.onGalleryDot((idx + 1) % tones.length)}
    >
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_40%_30%,#666,transparent_60%)]" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {tones.map((_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: i === idx % tones.length ? theme.primaryInverse : 'rgba(255,255,255,0.4)' }}
          />
        ))}
      </div>
    </button>
  )
}

export function MockButtonBar({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  const primary =
    /구매|결제|주문|확인/.test(label)
      ? label.match(/구매하기|결제하기|주문하기|확인/)?.[0] ?? '구매하기'
      : '구매하기'
  const hasWish = /위시|좋아요/.test(label)
  const hasCart = /장바구니/.test(label)

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 shrink-0 border-t"
      style={{ background: theme.canvas, borderColor: theme.border }}
    >
      {hasWish && (
        <button
          type="button"
          className="w-11 h-11 rounded-lg border flex items-center justify-center active:scale-95"
          style={{ borderColor: theme.border }}
          aria-label="위시"
          onClick={() => ix?.onTogglePdpWish()}
        >
          <IconHeart color={ix?.pdpWished ? theme.accent : theme.text} filled={ix?.pdpWished} />
        </button>
      )}
      {hasCart && (
        <button
          type="button"
          className="flex-1 h-11 rounded-lg border text-[13px] font-semibold active:scale-[0.98]"
          style={{ borderColor: theme.primary, color: theme.primary }}
          onClick={() => ix?.onAddCart()}
        >
          장바구니
        </button>
      )}
      <button
        type="button"
        className="flex-1 h-11 rounded-lg text-[13px] font-bold active:scale-[0.98]"
        style={{ background: theme.primary, color: theme.primaryInverse }}
        onClick={() => ix?.onPrimaryCta(primary)}
      >
        {primary}
      </button>
    </div>
  )
}

export function MockBottomSheet({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  const isOption = /컬러|사이즈|수량|옵션/.test(label)
  const color = ix?.color ?? 'Black'
  const size = ix?.size ?? 'M'
  const qty = ix?.qty ?? 1

  return (
    <div
      className="mx-2 mb-2 rounded-2xl overflow-hidden shadow-lg border"
      style={{ background: theme.canvas, borderColor: theme.border }}
    >
      <div className="flex justify-center pt-2 pb-1">
        <span className="w-10 h-1 rounded-full" style={{ background: theme.border }} />
      </div>
      <p className="px-4 pb-2 text-[14px] font-bold" style={{ color: theme.text }}>
        {/필터/.test(label) ? '필터' : '옵션 선택'}
      </p>
      {isOption ? (
        <>
          <div className="px-4 pb-3">
            <p className="text-[12px] font-semibold mb-2" style={{ color: theme.textSecondary }}>
              컬러
            </p>
            <div className="flex flex-wrap gap-2">
              {['Black', 'Ivory', 'Navy'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => ix?.onColor(v)}
                  className="px-3 py-1.5 text-[12px] rounded-md border font-medium active:scale-95"
                  style={{
                    borderColor: color === v ? theme.primary : theme.border,
                    background: color === v ? theme.primary : theme.canvas,
                    color: color === v ? theme.primaryInverse : theme.text,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-3">
            <p className="text-[12px] font-semibold mb-2" style={{ color: theme.textSecondary }}>
              사이즈
            </p>
            <div className="flex flex-wrap gap-2">
              {['S', 'M', 'L', 'XL'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => ix?.onSize(v)}
                  className="px-3 py-1.5 text-[12px] rounded-md border font-medium active:scale-95"
                  style={{
                    borderColor: size === v ? theme.primary : theme.border,
                    background: size === v ? theme.primary : theme.canvas,
                    color: size === v ? theme.primaryInverse : theme.text,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-3 flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: theme.textSecondary }}>
              수량
            </span>
            <div className="flex items-center gap-3 border rounded-lg px-2 py-1" style={{ borderColor: theme.border }}>
              <button type="button" className="w-6 text-center" onClick={() => ix?.onQty(-1)}>
                −
              </button>
              <span className="text-[13px] font-semibold">{qty}</span>
              <button type="button" className="w-6 text-center" onClick={() => ix?.onQty(1)}>
                +
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {['가격', '사이즈', '색상', '브랜드'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  ix?.onChip(v)
                  ix?.flash(`${v} 필터`)
                }}
                className="px-3 py-1.5 text-[12px] rounded-md border font-medium"
                style={{
                  borderColor: ix?.selectedChip === v ? theme.primary : theme.border,
                  background: ix?.selectedChip === v ? theme.primary : theme.canvas,
                  color: ix?.selectedChip === v ? theme.primaryInverse : theme.text,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MockSidebar({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  const cats = ['상의', '아우터', '바지', '원피스', '스커트', '가방', '신발', 'ACC']
  const active = ix?.sidebarCat ?? cats[0]
  return (
    <div className="w-[88px] shrink-0 overflow-y-auto border-r" style={{ borderColor: theme.border, background: theme.sunken }}>
      {cats.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            ix?.onSidebarCat(c)
            ix?.flash(c)
          }}
          className="w-full text-left px-2.5 py-3 text-[11px] font-medium"
          style={{
            background: c === active ? theme.canvas : 'transparent',
            color: c === active ? theme.primary : theme.textSecondary,
            borderLeft: c === active ? `2px solid ${theme.primary}` : '2px solid transparent',
          }}
          title={label}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export function MockGeneric({ theme, label, ix }: { theme: PreviewTheme; label: string; ix?: PreviewIx }) {
  if (/배너|캐러셀|큐레이션/.test(label)) return <MockBanner theme={theme} ix={ix} />
  if (/갤러리|이미지/.test(label)) return <MockGallery theme={theme} ix={ix} />
  if (/브랜드 · 상품명|상품명/.test(label) && !/Price|정가/.test(label)) {
    return (
      <div className="px-4 pt-3" style={{ background: theme.canvas }}>
        <p className="text-[12px] font-semibold" style={{ color: theme.textSecondary }}>
          ADER ERROR
        </p>
        <p className="text-[16px] font-semibold mt-0.5" style={{ color: theme.text }}>
          오버핏 로고 후드 집업
        </p>
      </div>
    )
  }
  if (/배송|혜택/.test(label)) {
    return (
      <button
        type="button"
        className="mx-3 my-2 rounded-lg px-3 py-2.5 text-[12px] space-y-1 w-[calc(100%-1.5rem)] text-left active:opacity-80"
        style={{ background: theme.sunken, color: theme.textSecondary }}
        onClick={() => ix?.flash('배송 안내')}
      >
        <p>
          <span className="font-semibold" style={{ color: theme.text }}>
            오늘출발
          </span>{' '}
          · 내일(수) 도착 예정
        </p>
        <p>무신사 현대카드 최대 7% 청구할인</p>
      </button>
    )
  }
  if (/라인아이템|장바구니/.test(label) && /썸네일|수량/.test(label)) {
    return (
      <div className="px-3 py-2 space-y-3" style={{ background: theme.canvas }}>
        {MOCK_PRODUCTS.slice(0, 2).map((p) => (
          <div key={p.name} className="flex gap-3">
            <button type="button" className="w-20 aspect-[3/4] rounded-sm shrink-0" style={{ background: p.tone }} onClick={() => ix?.onProductClick(p.name)} />
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-[11px] font-semibold" style={{ color: theme.textSecondary }}>
                {p.brand}
              </p>
              <p className="text-[12px] truncate" style={{ color: theme.text }}>
                {p.name}
              </p>
              <p className="text-[11px]" style={{ color: theme.textTertiary }}>
                {ix?.color ?? 'Black'} / {ix?.size ?? 'M'}
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[13px] font-bold">{formatWon(p.sale)}</span>
                <div className="flex items-center gap-2 border rounded px-2 py-0.5 text-[12px]" style={{ borderColor: theme.border }}>
                  <button type="button" onClick={() => ix?.onQty(-1)}>
                    −
                  </button>
                  <span>{ix?.qty ?? 1}</span>
                  <button type="button" onClick={() => ix?.onQty(1)}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (/전체선택|품절/.test(label)) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-[12px]" style={{ color: theme.textSecondary }}>
        <button type="button" className="flex items-center gap-2" onClick={() => ix?.flash('전체 선택')}>
          <span className="w-4 h-4 rounded border" style={{ borderColor: theme.primary, background: theme.primary }} />
          전체선택 (2)
        </button>
        <button type="button" style={{ color: theme.textTertiary }} onClick={() => ix?.flash('선택 삭제')}>
          선택삭제
        </button>
      </div>
    )
  }
  if (/프로필|등급/.test(label)) {
    return (
      <div className="flex items-center gap-3 px-4 py-4" style={{ background: theme.canvas }}>
        <div className="w-14 h-14 rounded-full" style={{ background: theme.sunken, border: `1px solid ${theme.border}` }} />
        <div>
          <p className="text-[15px] font-bold" style={{ color: theme.text }}>
            heewon
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: theme.accent }}>
            LEVEL 4 · 그린
          </p>
        </div>
      </div>
    )
  }
  if (/메뉴|주문내역 · 쿠폰/.test(label)) {
    return (
      <div className="divide-y" style={{ borderColor: theme.border }}>
        {['주문내역', '쿠폰', '적립금', '설정'].map((m) => (
          <button
            key={m}
            type="button"
            className="w-full px-4 py-3.5 text-[14px] flex justify-between text-left active:bg-zinc-50"
            style={{ color: theme.text, borderColor: theme.border }}
            onClick={() => ix?.flash(m)}
          >
            {m}
            <span style={{ color: theme.textTertiary }}>›</span>
          </button>
        ))}
      </div>
    )
  }
  if (/주문 상태|숏컷/.test(label)) {
    return (
      <div className="grid grid-cols-4 gap-2 px-3 py-3">
        {['입금대기', '배송준비', '배송중', '완료'].map((s, i) => (
          <button
            key={s}
            type="button"
            className="text-center rounded-lg py-2.5 active:opacity-80"
            style={{ background: theme.sunken }}
            onClick={() => ix?.flash(s)}
          >
            <p className="text-[15px] font-bold" style={{ color: theme.text }}>
              {i === 2 ? 1 : 0}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: theme.textSecondary }}>
              {s}
            </p>
          </button>
        ))}
      </div>
    )
  }
  if (/완료 메시지|주문번호/.test(label)) {
    return (
      <div className="px-6 py-10 text-center space-y-3" style={{ background: theme.canvas }}>
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: theme.sunken }}>
          ✓
        </div>
        <p className="text-[18px] font-bold" style={{ color: theme.text }}>
          주문이 완료됐어요
        </p>
        <p className="text-[12px]" style={{ color: theme.textSecondary }}>
          주문번호 M20260713-8842
        </p>
      </div>
    )
  }
  if (/배송지|쿠폰 · 포인트|결제수단|약관/.test(label)) {
    return (
      <button
        type="button"
        className="w-full px-4 py-3 border-b text-left active:bg-zinc-50"
        style={{ borderColor: theme.border, background: theme.canvas }}
        onClick={() => ix?.flash(label.split(/[·(]/)[0].trim())}
      >
        <p className="text-[13px] font-semibold mb-1" style={{ color: theme.text }}>
          {label.split(/[·(]/)[0].trim()}
        </p>
        <p className="text-[12px] leading-relaxed" style={{ color: theme.textSecondary }}>
          {/배송지/.test(label)
            ? '서울 성동구 연무장길 12 · 이희원 · 010-1234-5678'
            : /쿠폰|포인트|결제/.test(label)
              ? '신용/체크카드 · 쿠폰 1장 적용 가능'
              : label}
        </p>
      </button>
    )
  }
  if (/중분류|브랜드 바로가기/.test(label)) {
    return (
      <div className="flex-1 px-3 py-2 space-y-3" style={{ background: theme.canvas }}>
        <p className="text-[13px] font-bold" style={{ color: theme.text }}>
          {ix?.sidebarCat ?? '상의'}
        </p>
        <div className="flex flex-wrap gap-2">
          {['반팔', '셔츠', '니트', '후드', '맨투맨'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => ix?.flash(c)}
              className="px-2.5 py-1.5 text-[12px] rounded-md border active:scale-95"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-[13px] font-bold pt-2" style={{ color: theme.text }}>
          인기 브랜드
        </p>
        <div className="grid grid-cols-3 gap-2">
          {['ADER', 'Nike', 'Stussy', 'Ami', 'IAB', 'UGG'].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => ix?.flash(`${b} 브랜드`)}
              className="aspect-square rounded-lg flex items-center justify-center text-[11px] font-bold active:opacity-80"
              style={{ background: theme.sunken, color: theme.text }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 text-[12px]" style={{ color: theme.textSecondary, background: theme.canvas }}>
      {label}
    </div>
  )
}

export function TabPlaceholder({ theme, tab }: { theme: PreviewTheme; tab: TabId }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center" style={{ background: theme.canvas }}>
      <p className="text-[28px]">{tab === '카테고리' ? '▦' : tab === '검색' ? '⌕' : tab === '좋아요' ? '♡' : '☺'}</p>
      <p className="text-[15px] font-semibold" style={{ color: theme.text }}>
        {tab}
      </p>
      <p className="text-[12px]" style={{ color: theme.textTertiary }}>
        탭 전환 프리뷰 · 해당 이슈 와이어로 이동하면 상세 화면이 보입니다
      </p>
    </div>
  )
}
