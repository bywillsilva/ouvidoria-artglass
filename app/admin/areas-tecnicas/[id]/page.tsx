'use client'

import { useParams } from 'next/navigation'

import { ManifestationDetailView } from '@/components/admin/manifestation-detail-view'

export default function AreaTecnicaDetalhePage() {
  const params = useParams<{ id: string }>()

  return (
    <ManifestationDetailView
      id={String(params.id)}
      backHref="/admin/areas-tecnicas"
      mode="areas-tecnicas"
    />
  )
}
