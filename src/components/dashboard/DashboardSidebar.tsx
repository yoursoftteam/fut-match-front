'use client'

import {
  LayoutDashboard,
  Swords,
  Trophy,
  Target,
  User,
  Plus,
  ChevronLeft,
  PanelRightClose,
  Menu,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export type TabId = 'resumen' | 'partidos' | 'torneos' | 'predicciones' | 'frecuentes'

interface DashboardSidebarProps {
  sidebarExpanded: boolean
  onToggleExpand: () => void
  mobileExpanded: boolean
  onMobileToggle: () => void
  onMobileClose: () => void
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Mis Partidos', icon: Swords, href: '/dashboard?tab=partidos' },
  { label: 'Torneos', icon: Trophy, href: '/dashboard?tab=torneos' },
  { label: 'Predicciones', icon: Target, href: '/dashboard?tab=predicciones' },
  { label: 'Armar Partido', icon: Plus, href: '/create' },
]

export function DashboardSidebar({
  sidebarExpanded,
  onToggleExpand,
  mobileExpanded,
  onMobileToggle,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const [isMobile, setIsMobile] = useState(true)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On mobile: ignore sidebarExpanded, only use mobileExpanded
  const expanded = isMobile ? mobileExpanded : sidebarExpanded

  const isActive = (href: string) => {
    const [basePath, tabParam] = href.split('?tab=')
    if (basePath === '/dashboard') {
      return pathname === '/dashboard' && (!tabParam || currentTab === tabParam)
    }
    return pathname === href
  }

  const content = (
    <div className={`flex flex-col h-full transition-all duration-200 ${expanded ? 'w-52' : 'w-16'}`}>
      {/* Toggle — desktop only */}
      <div className={`hidden md:flex items-center border-b border-border ${sidebarExpanded ? 'justify-end px-3' : 'justify-center'} h-12`}>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label={sidebarExpanded ? 'Colapsar' : 'Expandir'}
        >
          {sidebarExpanded ? <ChevronLeft className="size-4" /> : <PanelRightClose className="size-4" />}
        </button>
      </div>

      {/* Mobile close button when expanded */}
      {mobileExpanded && (
        <div className="flex md:hidden items-center justify-end px-3 h-12 border-b border-border">
          <button
            type="button"
            onClick={onMobileClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onMobileClose}
              className={`
                flex items-center gap-3 rounded-xl transition-colors cursor-pointer
                ${expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}
              `}
              title={item.label}
            >
              <div className={`flex items-center justify-center shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="size-5" />
              </div>
              {expanded && <span className="text-sm font-medium leading-none">{item.label}</span>}
            </Link>
          )
        })}

        <div className="mt-auto pt-2 border-t border-border">
          <Link
            href="/profile"
            onClick={onMobileClose}
            className={`
              flex items-center gap-3 rounded-xl transition-colors cursor-pointer
              ${expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
              text-muted-foreground hover:text-foreground hover:bg-muted/50
            `}
            title="Perfil"
          >
            <User className="size-5 shrink-0" />
            {expanded && <span className="text-sm font-medium leading-none">Perfil</span>}
          </Link>
        </div>
      </nav>
    </div>
  )

  return (
    <>
      {/* Sidebar — visible on all screens */}
      <aside className="fixed left-0 z-30 bg-background border-r border-border top-[57px] md:top-[65px] h-[calc(100vh-57px)] md:h-[calc(100vh-65px)]">
        {content}
      </aside>

      {/* Mobile toggle — only shows when sidebar is collapsed on mobile */}
      {!mobileExpanded && (
        <button
          type="button"
          onClick={onMobileToggle}
          className="fixed bottom-5 left-[18px] z-40 flex md:hidden size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </button>
      )}

      {/* Mobile overlay when expanded */}
      {mobileExpanded && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={onMobileClose} />
      )}
    </>
  )
}
