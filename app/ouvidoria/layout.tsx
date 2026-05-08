import { PublicHeader } from '@/components/ouvidoria/public-header'
import { PublicFooter } from '@/components/ouvidoria/public-footer'

export default function OuvidoriaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
