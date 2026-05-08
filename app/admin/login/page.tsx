'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { toast } from 'sonner'

import type { AdminCapability } from '@/lib/types'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

type CurrentUser = {
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
  deveTrocarSenha?: boolean
  capabilities: AdminCapability[]
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function checkSession() {
        const response = await fetch('/api/admin/auth/me', { cache: 'no-store' })
        if (mounted && response.ok) {
          const payload = (await response.json()) as { user: CurrentUser }
          router.replace(payload.user.deveTrocarSenha ? '/admin/primeiro-acesso' : '/admin')
        }
      }

    checkSession()

    return () => {
      mounted = false
    }
  }, [router])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json()

      if (!response.ok) {
        const message = payload.message || 'Nao foi possivel autenticar.'
        setError(message)
        toast.error(message)
        return
      }

      toast.success('Acesso autorizado. Redirecionando para o painel.')
      router.replace(payload.user?.deveTrocarSenha ? '/admin/primeiro-acesso' : '/admin')
    } catch {
      const message = 'Nao foi possivel autenticar no momento.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary via-secondary to-secondary/90 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo variant="white" className="justify-center" />
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Painel Administrativo</CardTitle>
            <CardDescription>Acesse o sistema de gestao da Ouvidoria ArtGlass</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Solicite acesso ou redefinicao de senha ao administrador do sistema.
              </p>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Sistema protegido. Acesso restrito a usuarios autorizados.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                O acesso ao painel e restrito a usuarios internos devidamente autorizados.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-secondary-foreground/60">
          Ouvidoria ArtGlass Esquadrias - Sistema de Gestao
        </p>
      </div>
    </div>
  )
}
