import { NextResponse } from 'next/server'

import { hasAnyAdminCapability } from '@/lib/admin-access'
import { requireAuthenticatedUser } from '@/lib/server/auth'
import { findAttachment } from '@/lib/server/manifestations'
import { getAttachmentBlob } from '@/lib/server/store'

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string; attachmentId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser()
    if (!hasAnyAdminCapability(user.perfil, ['manifestacoes', 'denuncias', 'areas_tecnicas'], user.capabilities)) {
      return NextResponse.json({ message: 'Acesso negado.' }, { status: 403 })
    }
    const { id, attachmentId } = await context.params
    const attachment = await findAttachment(id, attachmentId, user)
    if (!attachment) {
      return NextResponse.json({ message: 'Anexo nao encontrado.' }, { status: 404 })
    }

    const blob = await getAttachmentBlob(attachmentId)
    if (!blob) {
      return NextResponse.json({ message: 'Conteudo do anexo nao encontrado.' }, { status: 404 })
    }

    return new NextResponse(blob.content, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.nomeArquivo}"`,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === 'FORBIDDEN'
          ? 'Acesso negado.'
          : error.message === 'UNAUTHORIZED'
            ? 'Nao autenticado.'
            : error.message
        : 'Nao foi possivel baixar o anexo.'
    const status =
      error instanceof Error
        ? error.message === 'UNAUTHORIZED'
          ? 401
          : error.message === 'FORBIDDEN'
            ? 403
            : 400
        : 400
    return NextResponse.json({ message }, { status })
  }
}
