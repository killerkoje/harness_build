'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { WireframeScreen } from '@/lib/api'
import { resolveTheme, type PreviewTheme } from './theme'
import type { PreviewIx, TabId } from './ix'
import {
  MockStatusBar,
  MockTopNav,
  MockChips,
  MockProductGrid,
  MockTabBar,
  MockPrice,
  MockGallery,
  MockButtonBar,
  MockBottomSheet,
  MockSidebar,
  MockGeneric,
  MockBanner,
  TabPlaceholder,
} from './MockParts'

type Region = WireframeScreen['layout']['regions'][number]

function renderRegion(region: Region, theme: PreviewTheme, ix: PreviewIx) {
  const { component, label, type } = region

  if (type === 'sidebar') return <MockSidebar key={label} theme={theme} label={label} ix={ix} />
  if (component === 'TopNav') return <MockTopNav key={label + 'nav'} theme={theme} label={label} ix={ix} />
  if (component === 'TabBar') return <MockTabBar key={label + 'tab'} theme={theme} label={label} ix={ix} />
  if (component === 'Chip') return <MockChips key={label + 'chip'} theme={theme} label={label} ix={ix} />
  if (component === 'ProductCard') return <MockProductGrid key={label + 'pc'} theme={theme} ix={ix} />
  if (component === 'Price') return <MockPrice key={label + 'price'} theme={theme} label={label} />
  if (component === 'Button') return <MockButtonBar key={label + 'btn'} theme={theme} label={label} ix={ix} />
  if (component === 'BottomSheet') return <MockBottomSheet key={label + 'sheet'} theme={theme} label={label} ix={ix} />

  if (/배너|캐러셀|큐레이션/.test(label)) return <MockBanner key={label} theme={theme} ix={ix} />
  if (/갤러리|이미지 3:4|이미지 갤러리/.test(label)) return <MockGallery key={label} theme={theme} ix={ix} />

  return <MockGeneric key={label + type} theme={theme} label={label} ix={ix} />
}

function ScreenBody({
  screen,
  theme,
  ix,
}: {
  screen: WireframeScreen
  theme: PreviewTheme
  ix: PreviewIx
}) {
  const nav = screen.layout.regions.find((r) => r.type === 'nav')
  const footer = screen.layout.regions.filter((r) => r.type === 'footer')
  const sidebar = screen.layout.regions.find((r) => r.type === 'sidebar')
  const body = screen.layout.regions.filter((r) => r.type !== 'nav' && r.type !== 'footer' && r.type !== 'sidebar')

  const sheetOnly =
    screen.layout.regions.length > 0 &&
    screen.layout.regions.every((r) => r.component === 'BottomSheet' || r.component === 'Button' || r.type === 'footer')

  if (sheetOnly) {
    return (
      <div className="flex-1 flex flex-col justify-end min-h-0" style={{ background: 'rgba(17,17,17,0.45)' }}>
        <button type="button" className="flex-1 min-h-[20%]" aria-label="닫기" onClick={() => ix.onBack?.()} />
        {screen.layout.regions.map((r) => renderRegion(r, theme, ix))}
      </div>
    )
  }

  const hasTabBar = footer.some((r) => r.component === 'TabBar')
  const showPlaceholder =
    hasTabBar && ix.activeTab !== '홈' && !/카테고리|검색|좋아요|마이|위시|장바구니/.test(screen.name)

  return (
    <>
      {nav &&
        renderRegion(
          {
            ...nav,
            label: ix.canGoBack && !/뒤로/.test(nav.label) ? `뒤로 · ${nav.label}` : nav.label,
          },
          theme,
          ix
        )}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {sidebar && !showPlaceholder && renderRegion(sidebar, theme, ix)}
        <div className="flex-1 min-w-0 overflow-y-auto overscroll-contain touch-pan-y">
          {showPlaceholder ? (
            <TabPlaceholder theme={theme} tab={ix.activeTab} />
          ) : (
            body.map((r) => renderRegion(r, theme, ix))
          )}
        </div>
      </div>
      {footer.map((r) => renderRegion(r, theme, ix))}
    </>
  )
}

export default function ScreenPreview({
  screens,
  tokens,
}: {
  screens: WireframeScreen[]
  tokens?: Record<string, unknown> | null
}) {
  const theme = resolveTheme(tokens)
  const [screenIndex, setScreenIndex] = useState(0)
  const [stack, setStack] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('홈')
  const [cartCount, setCartCount] = useState(2)
  const [wished, setWished] = useState<Record<string, boolean>>({})
  const [pdpWished, setPdpWished] = useState(false)
  const [selectedChip, setSelectedChip] = useState('랭킹')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [color, setColor] = useState('Black')
  const [size, setSize] = useState('M')
  const [qty, setQty] = useState(1)
  const [sidebarCat, setSidebarCat] = useState('상의')
  const [toast, setToast] = useState<string | null>(null)

  const currentIndex = stack.length ? stack[stack.length - 1]! : screenIndex
  const screen = screens[currentIndex] ?? screens[0]
  const canGoBack = stack.length > 0

  const flash = useCallback((msg: string) => {
    setToast(msg)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const findScreen = useCallback(
    (pred: (s: WireframeScreen) => boolean) => screens.findIndex(pred),
    [screens]
  )

  const pushScreen = useCallback((idx: number) => {
    if (idx < 0) return
    setStack((s) => [...s, idx])
  }, [])

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1))
  }, [])

  const ix: PreviewIx = useMemo(
    () => ({
      activeTab,
      onTab: (tab) => {
        setActiveTab(tab)
        if (tab === '홈') {
          setStack([])
          const home = findScreen((s) => /홈/.test(s.name) || s.route === '/home')
          if (home >= 0) setScreenIndex(home)
        }
        flash(`${tab} 탭`)
      },
      cartCount,
      onCartClick: () => flash(`장바구니 ${cartCount}개`),
      onBack: canGoBack ? pop : undefined,
      canGoBack,
      wished,
      onToggleWish: (id) => {
        setWished((w) => {
          const next = !w[id]
          flash(next ? '위시 추가' : '위시 해제')
          return { ...w, [id]: next }
        })
      },
      onProductClick: (id) => {
        const pdp = findScreen((s) => /상세|상품/.test(s.name) && !/옵션/.test(s.name))
        if (pdp >= 0) {
          pushScreen(pdp)
          flash(id)
        } else {
          flash(`${id} · 상세 화면 없음`)
        }
      },
      selectedChip,
      onChip: setSelectedChip,
      bannerIndex,
      onBannerDot: setBannerIndex,
      onBannerNext: () => setBannerIndex((i) => (i + 1) % 3),
      galleryIndex,
      onGalleryDot: setGalleryIndex,
      color,
      size,
      qty,
      onColor: setColor,
      onSize: setSize,
      onQty: (d) => setQty((q) => Math.max(1, q + d)),
      sidebarCat,
      onSidebarCat: setSidebarCat,
      toast,
      flash,
      onPrimaryCta: (label) => {
        if (/구매|확인/.test(label)) {
          const opt = findScreen((s) => /옵션/.test(s.name))
          if (opt >= 0 && currentIndex !== opt) {
            pushScreen(opt)
            return
          }
          if (/확인/.test(label)) {
            setCartCount((c) => c + qty)
            flash(`${color} / ${size} · 담겼어요`)
            pop()
            return
          }
        }
        if (/결제|주문하기/.test(label)) {
          flash('주문 진행')
          return
        }
        flash(label)
      },
      onAddCart: () => {
        const opt = findScreen((s) => /옵션/.test(s.name))
        if (opt >= 0) {
          pushScreen(opt)
          return
        }
        setCartCount((c) => c + qty)
        flash('장바구니에 담았어요')
      },
      pdpWished,
      onTogglePdpWish: () => {
        setPdpWished((v) => {
          flash(!v ? '위시 추가' : '위시 해제')
          return !v
        })
      },
    }),
    [
      activeTab,
      cartCount,
      canGoBack,
      wished,
      selectedChip,
      bannerIndex,
      galleryIndex,
      color,
      size,
      qty,
      sidebarCat,
      toast,
      flash,
      findScreen,
      pushScreen,
      pop,
      currentIndex,
      pdpWished,
    ]
  )

  if (!screen) return null

  return (
    <div className="flex flex-col gap-3 sm:gap-4 w-full min-w-0">
      {screens.length > 1 && (
        <div
          className="-mx-1 px-1 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="화면 목록"
        >
          {screens.map((s, i) => {
            const active = i === currentIndex
            return (
              <button
                key={`${s.name}-${i}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStack([])
                  setScreenIndex(i)
                  setActiveTab('홈')
                }}
                className={`shrink-0 text-[11px] sm:text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {s.name}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex items-baseline justify-between gap-3 px-0.5 min-w-0">
        <h3 className="text-sm font-semibold text-zinc-800 truncate">{screen.name}</h3>
        {screen.route && (
          <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 shrink-0 truncate max-w-[45%]">
            {screen.route}
          </span>
        )}
      </div>

      {/* 뷰포트에 맞는 폰 프레임: 짧은 화면에서는 폭도 같이 줄임 */}
      <div className="w-full flex justify-center min-w-0">
        <div
          className="relative select-none w-full"
          style={{
            maxWidth: 'min(100%, 390px, calc((100dvh - 11.5rem) * 390 / 844))',
            aspectRatio: '390 / 844',
          }}
        >
          <div
            className="absolute inset-0 rounded-[clamp(1.25rem,5vw,2rem)] p-[2.4%] shadow-[0_16px_40px_rgba(17,17,17,0.16)]"
            style={{ background: '#111' }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-[clamp(0.9rem,3.8vw,1.4rem)] flex flex-col"
              style={{ background: theme.canvas, fontFamily: theme.font, color: theme.text }}
            >
              <MockStatusBar theme={theme} />
              <ScreenBody screen={screen} theme={theme} ix={ix} />

              {toast && (
                <div className="pointer-events-none absolute inset-x-0 bottom-[12%] sm:bottom-16 flex justify-center px-4 sm:px-6 z-20">
                  <div
                    className="max-w-[90%] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-[12px] font-medium shadow-lg text-center"
                    style={{ background: 'rgba(17,17,17,0.88)', color: '#fff' }}
                  >
                    {toast}
                  </div>
                </div>
              )}

              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[28%] max-w-28 h-1 rounded-full bg-black/20" />
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10px] sm:text-[11px] text-zinc-400 text-center leading-relaxed px-2">
        탭 · 칩 · 상품 · 위시 · CTA 클릭 가능
        {canGoBack ? ' · 뒤로가기로 이전 화면' : ''}
      </p>
    </div>
  )
}
