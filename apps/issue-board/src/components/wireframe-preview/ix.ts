export type TabId = '홈' | '카테고리' | '검색' | '좋아요' | '마이'

export interface PreviewIx {
  activeTab: TabId
  onTab: (tab: TabId) => void
  cartCount: number
  onCartClick: () => void
  onBack?: () => void
  canGoBack: boolean
  wished: Record<string, boolean>
  onToggleWish: (id: string) => void
  onProductClick: (id: string) => void
  selectedChip: string
  onChip: (chip: string) => void
  bannerIndex: number
  onBannerDot: (i: number) => void
  onBannerNext: () => void
  galleryIndex: number
  onGalleryDot: (i: number) => void
  color: string
  size: string
  qty: number
  onColor: (v: string) => void
  onSize: (v: string) => void
  onQty: (delta: number) => void
  sidebarCat: string
  onSidebarCat: (c: string) => void
  toast: string | null
  flash: (msg: string) => void
  onPrimaryCta: (label: string) => void
  onAddCart: () => void
  pdpWished: boolean
  onTogglePdpWish: () => void
}
