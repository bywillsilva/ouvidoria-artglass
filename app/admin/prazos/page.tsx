import { redirect } from 'next/navigation'

export default function PrazosPage() {
  redirect('/admin/configuracoes?tab=sla')
}
