import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Shield } from 'lucide-react'

export function PublicFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Logo e descrição */}
          <div className="space-y-4">
            <Logo variant="white" />
            <p className="text-sm text-secondary-foreground/80">
              Canal seguro e confidencial da Ouvidoria ArtGlass, comprometido com a ética, transparência e melhoria contínua.
            </p>
          </div>

          {/* Links úteis */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Links Úteis
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/ouvidoria/nova-manifestacao"
                  className="text-sm text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                >
                  Registrar Manifestação
                </Link>
              </li>
              <li>
                <Link
                  href="/ouvidoria/acompanhar"
                  className="text-sm text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                >
                  Acompanhar Protocolo
                </Link>
              </li>
              <li>
                <Link
                  href="/ouvidoria/politica-privacidade"
                  className="text-sm text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  href="/ouvidoria/termos-confidencialidade"
                  className="text-sm text-secondary-foreground/80 transition-colors hover:text-secondary-foreground"
                >
                  Termos de Confidencialidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider">
              Contato
            </h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/80">
              <li>ouvidoria@artglass.com.br</li>
              <li>0800 123 4567</li>
              <li>Segunda a Sexta, 8h às 18h</li>
            </ul>
          </div>
        </div>

        {/* Linha inferior */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-secondary-foreground/10 pt-8 md:flex-row">
          <div className="flex items-center gap-2 text-sm text-secondary-foreground/60">
            <Shield className="h-4 w-4" />
            <span>Canal seguro e confidencial da Ouvidoria ArtGlass</span>
          </div>
          <p className="text-sm text-secondary-foreground/60">
            &copy; {currentYear} ArtGlass Esquadrias. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
