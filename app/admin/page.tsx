import { redirect } from 'next/navigation'

import { getDefaultAdminPath } from '@/lib/admin-access'
import { getAuthenticatedUser } from '@/lib/server/auth'

export default async function AdminPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect('/admin/login')
  }

  if (user.deveTrocarSenha) {
    redirect('/admin/primeiro-acesso')
  }

  redirect(getDefaultAdminPath(user.perfil, user.capabilities))
}
