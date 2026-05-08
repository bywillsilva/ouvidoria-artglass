'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type NotificationItem = {
  id: string
  title: string
  description: string
  time: string
  link: string
  severity: 'info' | 'warning' | 'critical'
}

export default function NotificacoesPage() {
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    let mounted = true

    async function loadItems() {
      const response = await fetch('/api/admin/notifications', { cache: 'no-store' })
      const result = await response.json()

      if (mounted && response.ok) {
        setItems(result.items || [])
      }
    }

    loadItems()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notificacoes</h1>
          <p className="text-muted-foreground">
            Alertas operacionais para prazos, denuncias e sinais de reabertura.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{item.time}</Badge>
                  <Button variant="outline" asChild>
                    <Link href={item.link}>Abrir</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
