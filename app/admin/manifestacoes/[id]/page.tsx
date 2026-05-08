'use client'

import { useParams } from 'next/navigation'

import { ManifestationDetailView } from '@/components/admin/manifestation-detail-view'

export default function ManifestacaoDetalhePage() {
  const params = useParams<{ id: string }>()

  return (
    <ManifestationDetailView
      id={String(params.id)}
      backHref="/admin/manifestacoes"
      mode="manifestacoes"
    />
  )
}
