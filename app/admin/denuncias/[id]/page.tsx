'use client'

import { useParams } from 'next/navigation'

import { ManifestationDetailView } from '@/components/admin/manifestation-detail-view'

export default function DenunciaDetalhePage() {
  const params = useParams<{ id: string }>()
  return (
    <ManifestationDetailView
      id={String(params.id)}
      backHref="/admin/denuncias"
      mode="denuncias"
    />
  )
}
