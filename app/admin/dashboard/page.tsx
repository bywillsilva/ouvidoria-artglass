'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
  MessageSquareWarning,
  Shield,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NATUREZA_COLORS, PRIORIDADE_COLORS, STATUS_COLORS } from '@/lib/constants'

type DashboardStatsCard = {
  title: string
  value: string
}

type DashboardAlert = {
  type: 'warning' | 'alert' | 'danger' | 'critical'
  title: string
  action: string
  href: string
}

type SummaryItem = {
  id: string
  protocolo: string
  href: string
  natureza: string
  naturezaLabel: string
  assunto: string
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  prioridadeLabel: string
  status: string
  statusLabel: string
  dataAbertura: string
}

type DashboardResponse = {
  alertsData: DashboardAlert[]
  statsCards: DashboardStatsCard[]
  queueHref: string | null
  recentManifestacoes: SummaryItem[]
  manifestacoesPorNatureza: Array<{ key: string; name: string; value: number }>
  manifestacoesPorStatus: Array<{ key: string; name: string; value: number }>
  manifestacoesPorCanal: Array<{ name: string; value: number }>
  manifestacoesPorComplexidade: Array<{ name: string; value: number }>
  volumeMensal: Array<{ monthKey: string; month: string; total: number; concluidas: number }>
}

type AnalyticsResponse = {
  sectorData: Array<{ setor: string; total: number; resolvidas: number }>
  topSubjects: Array<{ subject: string; total: number }>
}

const statIcons = [
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  Shield,
  MessageSquareWarning,
  BarChart3,
  CheckCircle,
]

const chartColors = ['#009CA6', '#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626']

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR')
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoadingDashboard(true)
      setLoadingAnalytics(true)
      setError('')

      try {
        const dashboardRequest = fetch('/api/admin/dashboard', { cache: 'no-store' })
        const analyticsRequest = fetch('/api/admin/analytics', { cache: 'no-store' })

        const dashboardResponse = await dashboardRequest
        const dashboardResult = await dashboardResponse.json()

        if (!mounted) {
          return
        }

        if (!dashboardResponse.ok) {
          setError('Nao foi possivel carregar o dashboard administrativo.')
          return
        }

        setDashboard(dashboardResult)
        setLoadingDashboard(false)

        const analyticsResponse = await analyticsRequest
        const analyticsResult = await analyticsResponse.json()

        if (!mounted) {
          return
        }

        if (analyticsResponse.ok) {
          setAnalytics(analyticsResult)
        }
      } catch {
        if (mounted) {
          setError('Nao foi possivel carregar o dashboard administrativo.')
        }
      } finally {
        if (mounted) {
          setLoadingDashboard(false)
          setLoadingAnalytics(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const channelChart = useMemo(
    () =>
      (dashboard?.manifestacoesPorCanal || []).map((item, index) => ({
        ...item,
        fill: chartColors[index % chartColors.length],
      })),
    [dashboard?.manifestacoesPorCanal],
  )

  const statusChart = useMemo(
    () =>
      (dashboard?.manifestacoesPorStatus || []).map((item, index) => ({
        ...item,
        fill: chartColors[index % chartColors.length],
      })),
    [dashboard?.manifestacoesPorStatus],
  )

  if (loadingDashboard) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Falha ao carregar</AlertTitle>
        <AlertDescription>{error || 'Nao foi possivel montar o dashboard.'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visao consolidada da Ouvidoria ArtGlass com indicadores, riscos e prazos.
          </p>
        </div>
        {dashboard.queueHref && (
          <Button asChild>
            <Link href={dashboard.queueHref}>Abrir fila operacional</Link>
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {dashboard.alertsData.map((alert) => (
          <Alert
            key={`${alert.type}-${alert.title}`}
            variant={alert.type === 'danger' || alert.type === 'critical' ? 'destructive' : 'default'}
            className={
              alert.type === 'warning'
                ? 'border-warning/50 bg-warning/5'
                : alert.type === 'alert'
                  ? 'border-info/50 bg-info/5'
                  : alert.type === 'critical'
                    ? 'border-destructive bg-destructive/10'
                    : ''
            }
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between gap-3">
              <span>{alert.title}</span>
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href={alert.href}>{alert.action}</Link>
              </Button>
            </AlertTitle>
          </Alert>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {dashboard.statsCards.map((stat, index) => {
          const Icon = statIcons[index % statIcons.length]

          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Volume mensal</CardTitle>
            <CardDescription>Recebidas x concluidas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboard.volumeMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Recebidas" fill="#009CA6" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="concluidas"
                  name="Concluidas"
                  fill="#16A34A"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por natureza</CardTitle>
            <CardDescription>Tipos de manifestacao registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dashboard.manifestacoesPorNatureza}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {dashboard.manifestacoesPorNatureza.map((entry, index) => (
                    <Cell key={entry.key} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Manifestacoes recentes</CardTitle>
            <CardDescription>Fila prioritaria e casos mais novos do canal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentManifestacoes.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={item.href}
                        className="font-semibold text-primary hover:underline"
                      >
                        {item.protocolo}
                      </Link>
                      <Badge variant="outline" className={NATUREZA_COLORS[item.natureza as keyof typeof NATUREZA_COLORS]}>
                        {item.naturezaLabel}
                      </Badge>
                      <Badge variant="outline" className={STATUS_COLORS[item.status] || 'bg-muted'}>
                        {item.statusLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{item.assunto}</p>
                    <p className="text-xs text-muted-foreground">
                      Abertura em {formatDate(item.dataAbertura)}
                    </p>
                  </div>
                  <Badge variant="outline" className={PRIORIDADE_COLORS[item.prioridade]}>
                    {item.prioridadeLabel}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status atual</CardTitle>
            <CardDescription>Visao publica do andamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChart} dataKey="value" outerRadius={82}>
                  {statusChart.map((item) => (
                    <Cell key={item.key} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusChart.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demandas por area</CardTitle>
            <CardDescription>Total recebido x resolvido</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnalytics && !analytics ? (
              <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Atualizando indicadores analiticos...
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics?.sectorData || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="setor" width={110} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#2563EB" radius={[0, 6, 6, 0]} />
                  <Bar
                    dataKey="resolvidas"
                    name="Resolvidas"
                    fill="#16A34A"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
          <CardTitle>Ranking de assuntos</CardTitle>
          <CardDescription>Temas mais recorrentes no periodo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingAnalytics && !analytics ? (
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Carregando ranking e canais...
                </div>
              </div>
            ) : (
              <>
                {(analytics?.topSubjects || []).map((subject, index) => (
                  <div
                    key={subject.subject}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{subject.subject}</span>
                    </div>
                    <Badge variant="secondary">{subject.total}</Badge>
                  </div>
                ))}

                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-sm font-medium">Origem por canal</p>
                  <div className="mt-3 space-y-2">
                    {channelChart.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="capitalize">{item.name}</span>
                        </div>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
