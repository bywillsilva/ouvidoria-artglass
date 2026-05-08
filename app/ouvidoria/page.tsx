import Link from 'next/link'
import { 
  Shield, 
  Scale, 
  UserCheck, 
  Database, 
  Clock, 
  Heart,
  AlertTriangle,
  MessageSquare,
  Lightbulb,
  ThumbsUp,
  HelpCircle,
  FileQuestion,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const principios = [
  {
    icon: Shield,
    titulo: 'Confidencialidade',
    descricao: 'Sua identidade e informações são protegidas.'
  },
  {
    icon: Scale,
    titulo: 'Imparcialidade',
    descricao: 'As manifestações são analisadas de forma técnica e independente.'
  },
  {
    icon: UserCheck,
    titulo: 'Não Retaliação',
    descricao: 'É vedada qualquer represália contra quem manifesta.'
  },
  {
    icon: Database,
    titulo: 'Proteção de Dados',
    descricao: 'Tratamento de dados conforme a LGPD.'
  },
  {
    icon: Clock,
    titulo: 'Celeridade',
    descricao: 'Acompanhamento por protocolo e controle de prazos.'
  },
  {
    icon: Heart,
    titulo: 'Respeito',
    descricao: 'Acolhimento profissional e respeitoso.'
  }
]

const tiposManifestacao = [
  {
    icon: AlertTriangle,
    titulo: 'Denúncia',
    descricao: 'Comunicação de possível violação ao Código de Conduta e Ética, políticas internas, leis, ordens de serviço ou condutas que representem risco à ArtGlass, colaboradores, clientes, fornecedores ou reputação institucional.',
    cor: 'text-destructive bg-destructive/10'
  },
  {
    icon: MessageSquare,
    titulo: 'Reclamação',
    descricao: 'Demonstração de insatisfação relativa a atendimento, produtos, serviços ou processos.',
    cor: 'text-warning bg-warning/10'
  },
  {
    icon: Lightbulb,
    titulo: 'Sugestão',
    descricao: 'Ideia ou proposta de melhoria para processos, atendimento, conduta, produtos, serviços ou ambiente.',
    cor: 'text-info bg-info/10'
  },
  {
    icon: ThumbsUp,
    titulo: 'Elogio',
    descricao: 'Reconhecimento ou satisfação sobre produtos, serviços, atendimento, equipe ou colaborador.',
    cor: 'text-success bg-success/10'
  },
  {
    icon: HelpCircle,
    titulo: 'Consulta',
    descricao: 'Perguntas, dúvidas ou solicitações de informação de baixa complexidade.',
    cor: 'text-primary bg-primary/10'
  },
  {
    icon: FileQuestion,
    titulo: 'Solicitação Complexa',
    descricao: 'Pedido que exige análise técnica, orientação especial ou tratativa por área responsável.',
    cor: 'text-committee bg-committee/10'
  }
]

const etapasProcesso = [
  {
    numero: 1,
    titulo: 'Registro',
    descricao: 'Você registra sua manifestação através do formulário.'
  },
  {
    numero: 2,
    titulo: 'Protocolo',
    descricao: 'O sistema gera um número de protocolo para acompanhamento.'
  },
  {
    numero: 3,
    titulo: 'Análise',
    descricao: 'A Ouvidoria analisa e classifica sua manifestação.'
  },
  {
    numero: 4,
    titulo: 'Encaminhamento',
    descricao: 'A manifestação é encaminhada para a área responsável ou Comitê de Ética.'
  },
  {
    numero: 5,
    titulo: 'Tratativa',
    descricao: 'Você recebe retorno inicial, intermediário se necessário, e resposta conclusiva.'
  },
  {
    numero: 6,
    titulo: 'Avaliação',
    descricao: 'Ao final, você pode responder uma pesquisa de satisfação.'
  }
]

export default function OuvidoriaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-secondary to-secondary/90 py-20 text-secondary-foreground md:py-28">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Ouvidoria ArtGlass
            </h1>
            <p className="mt-4 text-lg text-secondary-foreground/90 md:text-xl">
              Um canal seguro, confidencial e imparcial para registrar manifestações, sugestões, reclamações, elogios, consultas e denúncias.
            </p>
            <p className="mt-4 text-secondary-foreground/80">
              A Ouvidoria atua como ponte oficial entre você e a ArtGlass, contribuindo para a ética, transparência, integridade e melhoria contínua dos nossos processos.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link href="/ouvidoria/nova-manifestacao">
                  Registrar manifestação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10 sm:w-auto">
                <Link href="/ouvidoria/acompanhar">
                  Acompanhar protocolo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Princípios Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Nossos Princípios
            </h2>
            <p className="mt-4 text-muted-foreground">
              A Ouvidoria ArtGlass opera com base em princípios que garantem um atendimento ético, seguro e eficiente.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principios.map((principio) => (
              <Card key={principio.titulo} className="border-border/50 transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <principio.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{principio.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {principio.descricao}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tipos de Manifestação Section */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              O que você pode registrar
            </h2>
            <p className="mt-4 text-muted-foreground">
              Conheça os tipos de manifestações que podem ser registradas em nossa Ouvidoria.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiposManifestacao.map((tipo) => (
              <Card key={tipo.titulo} className="border-border/50 transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tipo.cor}`}>
                      <tipo.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{tipo.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {tipo.descricao}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Como funciona
            </h2>
            <p className="mt-4 text-muted-foreground">
              Acompanhe o passo a passo do processo de tratamento da sua manifestação.
            </p>
          </div>
          <div className="mt-12">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-1/2 hidden h-full w-0.5 -translate-x-1/2 bg-border md:block" />
              
              <div className="space-y-8 md:space-y-0">
                {etapasProcesso.map((etapa, index) => (
                  <div
                    key={etapa.numero}
                    className={`relative flex items-center gap-6 md:gap-0 ${
                      index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Content */}
                    <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                      <Card className="inline-block border-border/50">
                        <CardHeader className="pb-2">
                          <div className={`flex items-center gap-3 ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>
                            <CardTitle className="text-lg">{etapa.titulo}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <CardDescription>{etapa.descricao}</CardDescription>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md md:absolute md:left-1/2 md:-translate-x-1/2">
                      <span className="text-sm font-bold">{etapa.numero}</span>
                    </div>
                    
                    {/* Spacer for alternating layout */}
                    <div className="hidden flex-1 md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Pronto para registrar sua manifestação?
            </h2>
            <p className="mt-4 text-primary-foreground/90">
              Sua voz é importante para nós. Registre sua manifestação de forma segura e confidencial.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/ouvidoria/nova-manifestacao">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Registrar manifestação
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
