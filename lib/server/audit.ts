import { readDb } from '@/lib/server/store'

export async function listAuditEntries(filters?: {
  protocolo?: string
  usuario?: string
  acao?: string
}) {
  const database = await readDb()
  const protocolo = filters?.protocolo?.trim().toUpperCase()
  const usuario = filters?.usuario?.trim().toLowerCase()
  const acao = filters?.acao?.trim().toLowerCase()

  return database.manifestacoes
    .flatMap((manifestation) =>
      manifestation.timeline.map((entry) => ({
        id: entry.id,
        protocolo: manifestation.protocolo,
        natureza: manifestation.natureza,
        titulo: manifestation.titulo,
        modulo: manifestation.natureza === 'denuncia' ? 'Denuncias' : 'Manifestacoes',
        usuario: entry.usuario,
        acao: entry.acao,
        descricao: entry.descricao,
        visibilidade: entry.visibilidade,
        criadoEm: entry.data,
      })),
    )
    .filter((entry) => {
      if (protocolo && entry.protocolo.toUpperCase() !== protocolo) {
        return false
      }

      if (usuario && !entry.usuario.toLowerCase().includes(usuario)) {
        return false
      }

      if (acao && !entry.acao.toLowerCase().includes(acao)) {
        return false
      }

      return true
    })
    .sort((left, right) => new Date(right.criadoEm).getTime() - new Date(left.criadoEm).getTime())
}
