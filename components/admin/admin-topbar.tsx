'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import { ADMIN_PROFILE_LABELS, getDefaultAdminPath, hasAdminCapability } from '@/lib/admin-access'
import type { AdminCapability, PerfilUsuario } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type NotificationItem = {
  id: string
  title: string
  description: string
  time: string
  link: string
  severity: 'info' | 'warning' | 'critical'
}

type CurrentUser = {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  deveTrocarSenha?: boolean
  capabilities: AdminCapability[]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function getProfileLabel(profile?: string) {
  return profile ? ADMIN_PROFILE_LABELS[profile as PerfilUsuario] || profile : 'Painel administrativo'
}

export function AdminTopbar({ currentUser }: { currentUser: CurrentUser }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const router = useRouter()
  const canSearchManifestations = hasAdminCapability(
    currentUser.perfil,
    'manifestacoes',
    currentUser.capabilities,
  )
  const canSearchDenuncias = hasAdminCapability(
    currentUser.perfil,
    'denuncias',
    currentUser.capabilities,
  )
  const canViewNotifications = hasAdminCapability(
    currentUser.perfil,
    'notificacoes',
    currentUser.capabilities,
  )
  const canManageSettings = hasAdminCapability(
    currentUser.perfil,
    'configuracoes',
    currentUser.capabilities,
  )

  useEffect(() => {
    let mounted = true

    async function loadTopbarData() {
      try {
        if (!canViewNotifications) {
          if (mounted) {
            setNotifications([])
          }
          return
        }

        const notificationsResponse = await fetch('/api/admin/notifications', { cache: 'no-store' })
        if (!mounted || !notificationsResponse.ok) {
          return
        }

        const notificationsResult = await notificationsResponse.json()
        setNotifications(notificationsResult.items || [])
      } catch {
        if (mounted) {
          setNotifications([])
        }
      }
    }

    loadTopbarData()
    return () => {
      mounted = false
    }
  }, [canViewNotifications])

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      toast.success('Sessao encerrada com sucesso.')
      router.push('/admin/login')
    } catch {
      toast.error('Nao foi possivel encerrar a sessao neste momento.')
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = searchQuery.trim()
    const targetPath = canSearchManifestations
      ? '/admin/manifestacoes'
        : canSearchDenuncias
          ? '/admin/denuncias'
        : getDefaultAdminPath(currentUser.perfil, currentUser.capabilities)

    router.push(term ? `${targetPath}?search=${encodeURIComponent(term)}` : targetPath)
  }

  const initials = useMemo(
    () => getInitials(currentUser.nome || 'OU'),
    [currentUser.nome],
  )

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {(canSearchManifestations || canSearchDenuncias) ? (
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar protocolo, manifestante, assunto..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </form>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-2">
        {canViewNotifications && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-destructive-foreground">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificacoes</span>
                <Badge variant="secondary" className="text-xs">
                  {notifications.length} novas
                </Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  Nenhuma notificacao pendente.
                </DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    asChild
                    className="flex flex-col items-start gap-1 p-3"
                  >
                    <Link href={notification.link}>
                      <div className="flex w-full items-start justify-between">
                        <span className="text-sm font-medium">{notification.title}</span>
                        <span className="text-xs text-muted-foreground">{notification.time}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {notification.description}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/notificacoes"
                  className="w-full text-center text-sm text-primary"
                >
                  Ver painel de notificacoes
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left md:flex">
                <span className="text-sm font-medium">{currentUser.nome || 'Ouvidoria ArtGlass'}</span>
                <span className="text-xs text-muted-foreground">
                  {getProfileLabel(currentUser.perfil)}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {currentUser.email || 'Perfil'}
            </DropdownMenuItem>
            {canManageSettings && (
              <DropdownMenuItem asChild>
                <Link href="/admin/configuracoes">
                  <Settings className="mr-2 h-4 w-4" />
                  Configuracoes
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
