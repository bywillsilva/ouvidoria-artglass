'use client'

import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, Clock, Target, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type AnalyticsResponse = {
  monthlyData: Array<{ month: string; total: number; closed: number; denuncias: number }>
  typeDistribution: Array<{ key: string; name: string; value: number }>
  sectorData: Array<{ setor: string; total: number; resolvidas: number }>
  satisfactionData: Array<{ month: string; nota: number }>
  topSubjects: Array<{ subject: string; total: number }>
  kpis: {
    resolutionRate: number
    averageResponseHours: number
    satisfactionAverage: number
    slaRate: number
  }
}

const colors = ['#009CA6', '#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#DC2626']

export default function IndicadoresPage() {
  const [period, setPeriod] = useState('12m')
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadData() {
      const response = await fetch('/api/admin/analytics', { cache: 'no-store' })
      const result = await response.json()

      if (mounted && response.ok) {
        setData(result)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [period])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores</h1>
          <p className="text-muted-foreground">
            KPIs da Ouvidoria para acompanhamento de desempenho, satisfacao e SLA.
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">Ultimos 30 dias</SelectItem>
            <SelectItem value="90d">Ultimos 90 dias</SelectItem>
            <SelectItem value="12m">Ultimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de resolucao</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpis.resolutionRate.toFixed(1) || '0'}%</div>
            <Progress value={data?.kpis.resolutionRate || 0} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo medio inicial</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpis.averageResponseHours.toFixed(1) || '0'}h</div>
            <Progress value={Math.min((data?.kpis.averageResponseHours || 0) * 4, 100)} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacao media</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpis.satisfactionAverage.toFixed(1) || '0'}/5</div>
            <Progress value={((data?.kpis.satisfactionAverage || 0) / 5) * 100} className="mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA cumprido</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.kpis.slaRate.toFixed(1) || '0'}%</div>
            <Progress value={data?.kpis.slaRate || 0} className="mt-3" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolucao mensal</CardTitle>
            <CardDescription>Recebidas, resolvidas e denuncias por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data?.monthlyData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Recebidas" fill="#009CA6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="closed" name="Resolvidas" fill="#16A34A" radius={[6, 6, 0, 0]} />
                <Bar dataKey="denuncias" name="Denuncias" fill="#7C3AED" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuicao por natureza</CardTitle>
            <CardDescription>Participacao de cada tipo de manifestacao</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={data?.typeDistribution || []} dataKey="value" innerRadius={60} outerRadius={100}>
                  {(data?.typeDistribution || []).map((item, index) => (
                    <Cell key={item.key} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance por area</CardTitle>
            <CardDescription>Total de casos recebidos e resolvidos por area</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data?.sectorData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" />
                <YAxis type="category" width={120} dataKey="setor" />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#2563EB" radius={[0, 6, 6, 0]} />
                <Bar dataKey="resolvidas" name="Resolvidas" fill="#16A34A" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfacao ao longo do tempo</CardTitle>
            <CardDescription>Notas medias registradas nas pesquisas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data?.satisfactionData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Line type="monotone" dataKey="nota" name="Nota media" stroke="#16A34A" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assuntos mais recorrentes</CardTitle>
          <CardDescription>Ranking dos temas com maior volume de registros</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {(data?.topSubjects || []).map((subject, index) => (
            <div key={subject.subject} className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Posicao {index + 1}</p>
              <p className="mt-2 font-medium">{subject.subject}</p>
              <p className="mt-2 text-2xl font-bold text-primary">{subject.total}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
