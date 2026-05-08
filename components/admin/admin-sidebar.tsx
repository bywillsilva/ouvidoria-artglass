'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Users,
  Building2,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Settings,
  Shield,
  FileCheck,
  Clock,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { hasAdminCapability } from '@/lib/admin-access'
import type { AdminCapability } from '@/lib/admin-access'
import type { PerfilUsuario } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

type SidebarUser = {
  perfil: PerfilUsuario
  capabilities: AdminCapability[]
}

const menuItems: Array<{
  title: string
  items: Array<{
    href: string
    label: string
    icon: typeof LayoutDashboard
    badge?: string
    capability: AdminCapability
  }>
}> = [
  {
    title: 'Principal',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, capability: 'dashboard' },
      { href: '/admin/manifestacoes', label: 'Manifestacoes', icon: FileText, capability: 'manifestacoes' },
      {
        href: '/admin/denuncias',
        label: 'Denuncias',
        icon: AlertTriangle,
        badge: 'sigilo',
        capability: 'denuncias',
      },
    ],
  },
  {
    title: 'Gestao',
    items: [
      { href: '/admin/comite-etica', label: 'Comite de Etica', icon: Shield, capability: 'comite_etica' },
      { href: '/admin/areas-tecnicas', label: 'Areas Tecnicas', icon: Building2, capability: 'areas_tecnicas' },
      { href: '/admin/usuarios', label: 'Usuarios', icon: Users, capability: 'usuarios' },
    ],
  },
  {
    title: 'Relatorios',
    items: [
      { href: '/admin/relatorios', label: 'Relatorios', icon: BarChart3, capability: 'relatorios' },
      { href: '/admin/indicadores', label: 'Indicadores', icon: TrendingUp, capability: 'indicadores' },
      { href: '/admin/pesquisas-satisfacao', label: 'Pesquisas', icon: MessageSquare, capability: 'pesquisas' },
    ],
  },
  {
    title: 'Configuracoes',
    items: [
      { href: '/admin/modelos-resposta', label: 'Modelos de Resposta', icon: FileCheck, capability: 'modelos_resposta' },
      { href: '/admin/prazos', label: 'Prazos e SLA', icon: Clock, capability: 'prazos' },
      { href: '/admin/notificacoes', label: 'Notificacoes', icon: Bell, capability: 'notificacoes' },
      { href: '/admin/auditoria', label: 'Auditoria', icon: Shield, capability: 'auditoria' },
      { href: '/admin/configuracoes', label: 'Configuracoes', icon: Settings, capability: 'configuracoes' },
    ],
  },
]

export function AdminSidebar({ currentUser }: { currentUser: SidebarUser }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const visibleSections = useMemo(
    () =>
      menuItems
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            hasAdminCapability(currentUser.perfil, item.capability, currentUser.capabilities),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [currentUser.capabilities, currentUser.perfil],
  )

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && <Logo variant="white" />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((current) => !current)}
          className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-2">
          {visibleSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + '/') ||
                    (item.href.startsWith('/admin/configuracoes') && pathname === '/admin/configuracoes')

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {!collapsed && (
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground/80">Ouvidoria ArtGlass</p>
            <p className="text-xs text-sidebar-foreground/60">v1.1.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}
