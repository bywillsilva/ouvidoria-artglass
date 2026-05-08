import { redirect } from 'next/navigation'

export default function ModelosRespostaPage() {
  redirect('/admin/configuracoes?tab=templates')
}
