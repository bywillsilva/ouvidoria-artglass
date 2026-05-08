'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ADMIN_CAPABILITY_OPTIONS,
  ADMIN_PROFILE_LABELS,
} from '@/lib/admin-access'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { AdminCapability, PerfilUsuario } from '@/lib/types'

type AppSettings = {
  empresa: {
    nomeEmpresa: string
    cnpj: string
    emailOuvidoria: string
    telefone: string
    endereco: string
    portalTitulo: string
    portalMensagemBoasVindas: string
    permitirAnonimo: boolean
    permitirAnexos: boolean
    canalDenunciasAtivo: boolean
    smtpHost: string
    smtpPort: string
    smtpUser: string
    smtpPasswordMasked: string
    smtpTls: boolean
  }
  notificacoes: Record<string, boolean>
  sla: {
    reclamacao: { respostaInicialHoras: number; resolucaoDias: number }
    sugestao: { respostaInicialHoras: number; resolucaoDias: number }
    denuncia: { respostaInicialHoras: number; analiseInicialDias: number }
    proximidadePercentual: number
    alertaVencido: boolean
    escalacaoAutomatica: boolean
  }
  acessos: Record<PerfilUsuario, AdminCapability[]>
}

type Department = {
  id: string
  nome: string
  responsavel: string
  email: string
  ativo?: boolean
}

type User = {
  id: string
  nome: string
  email: string
  perfil: string
  areaId?: string
  ativo: boolean
  deveTrocarSenha?: boolean
  ultimoAcessoEm?: string
  senhaTemporaria?: string
  isNovo?: boolean
}

type Template = {
  id: string
  titulo: string
  descricao: string
  assunto: string
  corpo: string
  tipo: string
  envioAutomatico: boolean
  categoria: string
}

type SettingsResponse = {
  settings: AppSettings
  departamentos: Department[]
  usuarios: User[]
  templates: Template[]
  credenciaisTemporarias?: TemporaryCredential[]
}

type TemporaryCredential = {
  nome: string
  email: string
  senhaTemporaria: string
}

function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const digits = '23456789'
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const secureRandom = (max: number) => {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
      const buffer = new Uint32Array(1)
      globalThis.crypto.getRandomValues(buffer)
      return buffer[0] % max
    }

    return Math.floor(Math.random() * max)
  }
  const randomChar = (source: string) => source[secureRandom(source.length)] || source[0]

  return [
    'Ag',
    randomChar(upper),
    randomChar(lower),
    randomChar(digits),
    Array.from({ length: 7 }, () => randomChar(alphabet)).join(''),
  ].join('')
}

function validateTemporaryPassword(password: string) {
  if (password.length < 8) {
    return 'A senha temporaria deve ter pelo menos 8 caracteres.'
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return 'A senha temporaria deve conter letras maiusculas, minusculas e numeros.'
  }

  return ''
}

function formatLastAccess(value?: string) {
  return value ? new Date(value).toLocaleString('pt-BR') : 'Ainda nao acessou'
}

const accessProfileOrder: PerfilUsuario[] = [
  'admin',
  'ouvidoria',
  'comite_etica',
  'area_tecnica',
  'rh',
  'gestor',
  'diretoria',
  'auditor',
  'visualizador',
]

export default function ConfiguracoesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'geral')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [temporaryCredentials, setTemporaryCredentials] = useState<TemporaryCredential[]>([])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' })
        const result = (await response.json()) as SettingsResponse

        if (!mounted) {
          return
        }

        if (!response.ok) {
          setError('Nao foi possivel carregar as configuracoes.')
          return
        }

        setSettings(result.settings)
        setDepartments(result.departamentos || [])
        setUsers((result.usuarios || []).map((user) => ({ ...user, senhaTemporaria: '', isNovo: false })))
        setTemplates(result.templates || [])
        setTemporaryCredentials([])
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar as configuracoes.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const departmentOptions = useMemo(() => departments.map((department) => ({
    value: department.id,
    label: department.nome,
  })), [departments])

  function changeTab(tab: string) {
    setActiveTab(tab)
    router.replace(`/admin/configuracoes?tab=${tab}`)
  }

  function toggleProfileAccess(profile: PerfilUsuario, capability: AdminCapability, enabled: boolean) {
    setSettings((current) => {
      if (!current) {
        return current
      }

      if (profile === 'admin') {
        return current
      }

      const currentCapabilities = current.acessos[profile] || []
      const nextCapabilities = enabled
        ? Array.from(new Set([...currentCapabilities, capability]))
        : currentCapabilities.filter((item) => item !== capability)

      const orderedCapabilities = ADMIN_CAPABILITY_OPTIONS
        .map((option) => option.capability)
        .filter((item) => nextCapabilities.includes(item))

      return {
        ...current,
        acessos: {
          ...current.acessos,
          [profile]: orderedCapabilities,
        },
      }
    })
  }

  async function saveAll() {
    if (!settings) {
      return
    }

    setError('')
    setSuccess('')
    setTemporaryCredentials([])

    const normalizedEmails = new Set<string>()
    for (const user of users) {
      const nome = user.nome.trim()
      const email = user.email.trim().toLowerCase()
      const perfil = user.perfil.trim()

      if (!nome || !email || !perfil) {
        setError('Todos os usuarios devem ter nome, e-mail e perfil preenchidos.')
        return
      }

      if (normalizedEmails.has(email)) {
        setError(`O e-mail ${email} ja esta sendo usado por outro usuario da lista.`)
        return
      }
      normalizedEmails.add(email)

      if (user.isNovo && !user.senhaTemporaria?.trim()) {
        setError(`Informe uma senha temporaria para o novo usuario ${email}.`)
        return
      }

      if (user.senhaTemporaria?.trim()) {
        const validationMessage = validateTemporaryPassword(user.senhaTemporaria.trim())
        if (validationMessage) {
          setError(`${validationMessage} Usuario: ${email}.`)
          return
        }
      }
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          departamentos: departments,
          usuarios: users,
          templates,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        const message = result.message || 'Nao foi possivel salvar as configuracoes.'
        setError(message)
        toast.error(message)
        return
      }

      setSettings(result.settings)
      setDepartments(result.departamentos || [])
      setUsers((result.usuarios || []).map((user: User) => ({ ...user, senhaTemporaria: '', isNovo: false })))
      setTemplates(result.templates || [])
      setTemporaryCredentials(result.credenciaisTemporarias || [])
      setSuccess(
        (result.credenciaisTemporarias || []).length > 0
          ? 'Configuracoes salvas. Guarde e compartilhe as senhas temporarias geradas abaixo.'
          : 'Configuracoes salvas com sucesso.',
      )
      toast.success(
        (result.credenciaisTemporarias || []).length > 0
          ? 'Configuracoes salvas e credenciais temporarias geradas.'
          : 'Configuracoes salvas com sucesso.',
      )
    } catch {
      const message = 'Nao foi possivel salvar as configuracoes.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Carregando configuracoes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
          <p className="text-muted-foreground">
            Parametrizacao administrativa do portal, do painel e do fluxo da Ouvidoria.
          </p>
        </div>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar tudo'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao salvar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertTitle>Configuracoes atualizadas</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {temporaryCredentials.length > 0 && (
        <Alert>
          <AlertTitle>Credenciais temporarias geradas</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>
                Entregue estas credenciais ao usuario e oriente a troca obrigatoria de senha no primeiro acesso.
              </p>
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                {temporaryCredentials.map((credential) => (
                  <div key={credential.email} className="rounded-md border bg-background p-3">
                    <p>{credential.nome}</p>
                    <p>{credential.email}</p>
                    <p>Senha temporaria: {credential.senhaTemporaria}</p>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={changeTab} className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="acessos">Acessos</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="sla">SLA</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificacoes</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados institucionais</CardTitle>
              <CardDescription>
                Identidade basica da empresa e do canal publico da Ouvidoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input
                  value={settings.empresa.nomeEmpresa}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? { ...current, empresa: { ...current.empresa, nomeEmpresa: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={settings.empresa.cnpj}
                  onChange={(event) =>
                    setSettings((current) =>
                      current ? { ...current, empresa: { ...current.empresa, cnpj: event.target.value } } : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail da Ouvidoria</Label>
                <Input
                  value={settings.empresa.emailOuvidoria}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? { ...current, empresa: { ...current.empresa, emailOuvidoria: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={settings.empresa.telefone}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? { ...current, empresa: { ...current.empresa, telefone: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereco</Label>
                <Input
                  value={settings.empresa.endereco}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? { ...current, empresa: { ...current.empresa, endereco: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Titulo do portal</Label>
                <Input
                  value={settings.empresa.portalTitulo}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? { ...current, empresa: { ...current.empresa, portalTitulo: event.target.value } }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Mensagem de boas-vindas</Label>
                <Textarea
                  rows={4}
                  value={settings.empresa.portalMensagemBoasVindas}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            empresa: {
                              ...current.empresa,
                              portalMensagemBoasVindas: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portal publico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['permitirAnonimo', 'Permitir manifestacoes anonimas'],
                ['permitirAnexos', 'Permitir anexos no formulario'],
                ['canalDenunciasAtivo', 'Canal de denuncias ativo'],
                ['smtpTls', 'Usar TLS no servidor de e-mail'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">
                      Parametro operacional do portal e das notificacoes.
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(settings.empresa[key as keyof AppSettings['empresa']])}
                    onCheckedChange={(checked) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              empresa: {
                                ...current.empresa,
                                [key]: checked,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acessos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modulos por perfil</CardTitle>
              <CardDescription>
                Defina quais areas do painel cada perfil interno pode acessar. O perfil administrador sempre mantem acesso completo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {accessProfileOrder.map((profile) => {
                const currentCapabilities = settings.acessos[profile] || []
                const isAdminProfile = profile === 'admin'

                return (
                  <div key={profile} className="space-y-4 rounded-xl border p-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{ADMIN_PROFILE_LABELS[profile]}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isAdminProfile
                          ? 'Acesso permanente e irrestrito para administracao do sistema.'
                          : 'Ative apenas os modulos necessarios para este perfil.'}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {ADMIN_CAPABILITY_OPTIONS.map((option) => {
                        const checked = isAdminProfile || currentCapabilities.includes(option.capability)

                        return (
                          <div
                            key={`${profile}-${option.capability}`}
                            className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 p-4"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{option.label}</p>
                              <p className="text-xs text-muted-foreground">{option.description}</p>
                            </div>
                            <Switch
                              checked={checked}
                              disabled={isAdminProfile}
                              onCheckedChange={(enabled) =>
                                toggleProfileAccess(profile, option.capability, enabled)
                              }
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios do painel</CardTitle>
                  <CardDescription>
                    Cadastre perfis, areas e acessos administrativos.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setUsers((current) => [
                      ...current,
                      {
                        id: createId(),
                        nome: '',
                        email: '',
                        perfil: 'visualizador',
                        areaId: undefined,
                        ativo: true,
                        deveTrocarSenha: true,
                        senhaTemporaria: generateTemporaryPassword(),
                        isNovo: true,
                      },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.map((user, index) => (
                <div key={user.id} className="space-y-4 rounded-xl border p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Input
                      value={user.nome}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, nome: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Nome"
                    />
                    <Input
                      value={user.email}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, email: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="E-mail"
                    />
                    <Select
                      value={user.perfil}
                      onValueChange={(value) =>
                        setUsers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, perfil: value } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="ouvidoria">Ouvidoria</SelectItem>
                        <SelectItem value="comite_etica">Comite de Etica</SelectItem>
                        <SelectItem value="area_tecnica">Area Tecnica</SelectItem>
                        <SelectItem value="rh">RH</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="diretoria">Diretoria</SelectItem>
                        <SelectItem value="auditor">Auditor</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
                    <Select
                      value={user.areaId || 'sem_area'}
                      onValueChange={(value) =>
                        setUsers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, areaId: value === 'sem_area' ? undefined : value }
                              : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_area">Sem area</SelectItem>
                        {departmentOptions.map((department) => (
                          <SelectItem key={department.value} value={department.value}>
                            {department.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="space-y-2">
                      <Input
                        value={user.senhaTemporaria || ''}
                        onChange={(event) =>
                          setUsers((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, senhaTemporaria: event.target.value, deveTrocarSenha: true }
                                : item,
                            ),
                          )
                        }
                        placeholder="Senha temporaria"
                      />
                      <p className="text-xs text-muted-foreground">
                        {user.isNovo
                          ? 'Obrigatoria para novos usuarios.'
                          : 'Preencha para redefinir o acesso e forcar troca de senha.'}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setUsers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  senhaTemporaria: generateTemporaryPassword(),
                                  deveTrocarSenha: true,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      Gerar senha
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p>{user.deveTrocarSenha ? 'Primeiro acesso pendente' : 'Senha ja atualizada pelo usuario'}</p>
                      <p>Ultimo acesso: {formatLastAccess(user.ultimoAcessoEm)}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.ativo}
                          onCheckedChange={(checked) =>
                            setUsers((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, ativo: checked } : item,
                              ),
                            )
                          }
                        />
                        <span>{user.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setUsers((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setores" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Areas e setores</CardTitle>
                  <CardDescription>
                    Defina as unidades de encaminhamento das manifestacoes.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setDepartments((current) => [
                      ...current,
                      {
                        id: createId(),
                        nome: '',
                        responsavel: '',
                        email: '',
                        ativo: true,
                      },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo setor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {departments.map((department, index) => (
                <div key={department.id} className="grid gap-4 rounded-xl border p-4 md:grid-cols-4">
                  <Input
                    value={department.nome}
                    onChange={(event) =>
                      setDepartments((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, nome: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Nome do setor"
                  />
                  <Input
                    value={department.responsavel}
                    onChange={(event) =>
                      setDepartments((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, responsavel: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Responsavel"
                  />
                  <Input
                    value={department.email}
                    onChange={(event) =>
                      setDepartments((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, email: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="E-mail do setor"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDepartments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Parametros de SLA</CardTitle>
              <CardDescription>
                Ajuste os prazos e alertas centrais da operacao.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reclamacao • resposta inicial (horas)</Label>
                <Input
                  type="number"
                  value={settings.sla.reclamacao.respostaInicialHoras}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              reclamacao: {
                                ...current.sla.reclamacao,
                                respostaInicialHoras: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Reclamacao • resolucao (dias)</Label>
                <Input
                  type="number"
                  value={settings.sla.reclamacao.resolucaoDias}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              reclamacao: {
                                ...current.sla.reclamacao,
                                resolucaoDias: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sugestao • resposta inicial (horas)</Label>
                <Input
                  type="number"
                  value={settings.sla.sugestao.respostaInicialHoras}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              sugestao: {
                                ...current.sla.sugestao,
                                respostaInicialHoras: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sugestao • resolucao (dias)</Label>
                <Input
                  type="number"
                  value={settings.sla.sugestao.resolucaoDias}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              sugestao: {
                                ...current.sla.sugestao,
                                resolucaoDias: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Denuncia • resposta inicial (horas)</Label>
                <Input
                  type="number"
                  value={settings.sla.denuncia.respostaInicialHoras}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              denuncia: {
                                ...current.sla.denuncia,
                                respostaInicialHoras: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Denuncia • analise inicial (dias)</Label>
                <Input
                  type="number"
                  value={settings.sla.denuncia.analiseInicialDias}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            sla: {
                              ...current.sla,
                              denuncia: {
                                ...current.sla.denuncia,
                                analiseInicialDias: Number(event.target.value),
                              },
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de notificacao</CardTitle>
              <CardDescription>
                Defina os gatilhos principais para equipe interna e manifestantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.notificacoes).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm text-muted-foreground">
                      Regra automatica associada ao fluxo desta notificacao.
                    </p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) =>
                      setSettings((current) =>
                        current
                          ? {
                              ...current,
                              notificacoes: {
                                ...current.notificacoes,
                                [key]: checked,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Modelos de resposta</CardTitle>
                  <CardDescription>
                    Padroes usados nas respostas iniciais, intermediarias e conclusivas.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setTemplates((current) => [
                      ...current,
                      {
                        id: createId(),
                        titulo: '',
                        descricao: '',
                        assunto: '',
                        corpo: '',
                        tipo: 'intermediaria',
                        envioAutomatico: false,
                        categoria: 'manual',
                      },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo template
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.map((template, index) => (
                <div key={template.id} className="space-y-4 rounded-xl border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      value={template.titulo}
                      onChange={(event) =>
                        setTemplates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, titulo: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Titulo"
                    />
                    <Input
                      value={template.assunto}
                      onChange={(event) =>
                        setTemplates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, assunto: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Assunto"
                    />
                    <Input
                      value={template.descricao}
                      onChange={(event) =>
                        setTemplates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, descricao: event.target.value } : item,
                          ),
                        )
                      }
                      placeholder="Descricao"
                    />
                    <Select
                      value={template.tipo}
                      onValueChange={(value) =>
                        setTemplates((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, tipo: value } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inicial">Inicial</SelectItem>
                        <SelectItem value="intermediaria">Intermediaria</SelectItem>
                        <SelectItem value="conclusiva">Conclusiva</SelectItem>
                        <SelectItem value="esclarecimento">Esclarecimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    rows={6}
                    value={template.corpo}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, corpo: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Corpo do modelo com variaveis dinamicas."
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.envioAutomatico}
                        onCheckedChange={(checked) =>
                          setTemplates((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, envioAutomatico: checked } : item,
                            ),
                          )
                        }
                      />
                      <span className="text-sm">Envio automatico</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setTemplates((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
