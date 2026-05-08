import { FileLock, Scale, ShieldAlert, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const clauses = [
  {
    icon: FileLock,
    title: 'Uso restrito das informacoes',
    text:
      'As informacoes registradas neste canal sao utilizadas exclusivamente para analise, tratativa e acompanhamento da manifestacao, vedado qualquer uso indevido ou desconectado da finalidade institucional da Ouvidoria.',
  },
  {
    icon: ShieldAlert,
    title: 'Sigilo de identidade',
    text:
      'Nos casos sigilosos ou sensiveis, a identidade do manifestante deve ser preservada perante areas envolvidas, terceiros e demais agentes que nao necessitem do dado para tratamento do caso.',
  },
  {
    icon: Users,
    title: 'Acesso por necessidade',
    text:
      'Somente usuarios autorizados, dentro de seu perfil funcional, podem acessar registros, anexos e comunicacoes, observando o principio do menor privilegio e a segregacao de responsabilidades.',
  },
  {
    icon: Scale,
    title: 'Integridade e boa-fe',
    text:
      'O canal da Ouvidoria deve ser utilizado com respeito, veracidade e boa-fe. O tratamento interno das manifestacoes ocorre com imparcialidade, rastreabilidade e compromisso com a integridade organizacional.',
  },
]

export default function TermosConfidencialidadePage() {
  return (
    <div className="py-10 md:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Termos de confidencialidade
          </h1>
          <p className="mt-3 text-muted-foreground">
            Diretrizes de sigilo aplicaveis ao uso do canal da Ouvidoria ArtGlass.
          </p>
        </div>

        <div className="grid gap-6">
          {clauses.map((clause) => (
            <Card key={clause.title}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <clause.icon className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>{clause.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{clause.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
