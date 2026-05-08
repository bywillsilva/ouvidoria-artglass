'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessAdminPath, getDefaultAdminPath } from '@/lib/admin-access'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { AdminTopbar } from '@/components/admin/admin-topbar'

type CurrentUser = {
  id: string
  nome: string
  email: string
  perfil:
    | 'admin'
    | 'ouvidoria'
    | 'comite_etica'
    | 'area_tecnica'
    | 'rh'
    | 'gestor'
    | 'diretoria'
    | 'auditor'
    | 'visualizador'
  areaId?: string
  deveTrocarSenha?: boolean
  capabilities: Array<
    | 'dashboard'
    | 'manifestacoes'
    | 'denuncias'
    | 'comite_etica'
    | 'areas_tecnicas'
    | 'usuarios'
    | 'relatorios'
    | 'indicadores'
    | 'pesquisas'
    | 'modelos_resposta'
    | 'prazos'
    | 'notificacoes'
    | 'auditoria'
    | 'configuracoes'
  >
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/admin/login'
  const isPasswordChangePage = pathname === '/admin/primeiro-acesso'
  const [checkingSession, setCheckingSession] = useState(!isLoginPage)
  const [isAuthenticated, setIsAuthenticated] = useState(isLoginPage)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    let mounted = true

    async function verifySession() {
      if (isLoginPage) {
        if (mounted) {
          setCheckingSession(false)
        }
        return
      }

      try {
        const response = await fetch('/api/admin/auth/me', { cache: 'no-store' })
        if (!response.ok) {
          if (mounted) {
            setIsAuthenticated(false)
          }
          router.replace('/admin/login')
          return
        }

        const payload = (await response.json()) as { user: CurrentUser }
        const user = payload.user
        const defaultPath = getDefaultAdminPath(user.perfil, user.capabilities)

        if (!mounted) {
          return
        }

        setCurrentUser(user)
        if (mounted) {
          setIsAuthenticated(true)
        }

        if (user.deveTrocarSenha && !isPasswordChangePage) {
          router.replace('/admin/primeiro-acesso')
          return
        }

        if (!user.deveTrocarSenha && isPasswordChangePage) {
          router.replace(defaultPath)
          return
        }

        if (!isPasswordChangePage && !canAccessAdminPath(user.perfil, pathname, user.capabilities)) {
          router.replace(defaultPath)
        }
      } catch {
        if (mounted) {
          setIsAuthenticated(false)
          setCurrentUser(null)
        }
        router.replace('/admin/login')
      } finally {
        if (mounted) {
          setCheckingSession(false)
        }
      }
    }

    verifySession()

    return () => {
      mounted = false
    }
  }, [isLoginPage, isPasswordChangePage, pathname, router])

  if (isLoginPage || isPasswordChangePage) {
    return <>{children}</>
  }

  if (checkingSession || !isAuthenticated || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Validando acesso ao painel...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar currentUser={currentUser} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar currentUser={currentUser} />
        <main className="flex-1 overflow-auto bg-muted/30 p-6">{children}</main>
      </div>
    </div>
  )
}
