'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'

import { getDefaultAdminPath } from '@/lib/admin-access'
import type { AdminCapability } from '@/lib/types'
import { Logo } from '@/components/logo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CurrentUser = {
  nome: string
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

export default function PrimeiroAcessoPage() {
  const router = useRouter()
  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const response = await fetch('/api/admin/auth/me', { cache: 'no-store' })
        if (!response.ok) {
          router.replace('/admin/login')
          return
        }

        const payload = (await response.json()) as { user: CurrentUser }
        if (!mounted) {
          return
        }

        setCurrentUser(payload.user)

        if (!payload.user.deveTrocarSenha) {
          router.replace(getDefaultAdminPath(payload.user.perfil, payload.user.capabilities))
        }
      } finally {
        if (mounted) {
          setLoadingSession(false)
        }
      }
    }

    loadSession()
    return () => {
      mounted = false
    }
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senhaAtual,
          novaSenha,
          confirmarSenha,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        const message = payload.message || 'Nao foi possivel atualizar a senha.'
        setError(message)
        toast.error(message)
        return
      }

      const message = 'Senha atualizada com sucesso. Redirecionando para o painel...'
      setSuccess(message)
      toast.success('Senha atualizada com sucesso.')
      if (currentUser) {
        router.replace(getDefaultAdminPath(currentUser.perfil, currentUser.capabilities))
      } else {
        router.replace('/admin')
      }
    } catch {
      const message = 'Nao foi possivel atualizar a senha neste momento.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Validando seu acesso...</span>
        </div>
      </div>
    )
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
              <LockKeyhole className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Primeiro acesso</CardTitle>
            <CardDescription>
              Para concluir seu acesso ao painel, altere agora a senha temporaria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Atualizacao nao concluida</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertTitle>Senha atualizada</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="senha-atual">Senha atual</Label>
                <Input
                  id="senha-atual"
                  type={showPasswords ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova-senha">Nova senha</Label>
                <Input
                  id="nova-senha"
                  type={showPasswords ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
                <Input
                  id="confirmar-senha"
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  required
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setShowPasswords((current) => !current)}
              >
                {showPasswords ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
              </Button>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Atualizando senha...' : 'Atualizar senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
