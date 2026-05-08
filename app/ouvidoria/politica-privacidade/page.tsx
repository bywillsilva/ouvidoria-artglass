import { ShieldCheck, Lock, Database, EyeOff } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  {
    icon: ShieldCheck,
    title: 'Finalidade do tratamento',
    body:
      'Os dados fornecidos neste canal sao utilizados exclusivamente para receber, registrar, classificar, tratar e acompanhar manifestacoes dirigidas a Ouvidoria da ArtGlass.',
  },
  {
    icon: Lock,
    title: 'Confidencialidade',
    body:
      'Informacoes pessoais e sensiveis sao acessadas apenas por perfis autorizados, dentro da necessidade de tratamento do caso, respeitando sigilo, nao retaliacao e boas praticas de governanca.',
  },
  {
    icon: Database,
    title: 'Base legal e retencao',
    body:
      'O tratamento ocorre com fundamento em deveres legitimos de governanca, conformidade, exercicio regular de direitos e, quando aplicavel, mediante consentimento do manifestante. Os registros permanecem armazenados pelo prazo necessario ao atendimento e a obrigacoes legais.',
  },
  {
    icon: EyeOff,
    title: 'Direitos do titular',
    body:
      'Sempre que aplicavel, o titular pode solicitar informacoes sobre seus dados, correcoes cadastrais e esclarecimentos sobre o uso das informacoes, observados os limites de sigilo, investigacao e protecao de terceiros.',
  },
]

export default function PoliticaPrivacidadePage() {
  return (
    <div className="py-10 md:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Politica de privacidade da Ouvidoria
          </h1>
          <p className="mt-3 text-muted-foreground">
            Compromisso institucional com confidencialidade, protecao de dados e
            tratamento responsavel das informacoes compartilhadas neste canal.
          </p>
        </div>

        <div className="grid gap-6">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <section.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
