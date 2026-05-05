import Link from 'next/link';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const recursos = [
  {
    title: 'Transferências',
    description: 'Cadastre valores enviados e mantenha o histórico organizado.',
    icon: BanknotesIcon,
  },
  {
    title: 'Comprovantes',
    description: 'Consulte registros recentes com rapidez no painel.',
    icon: DocumentTextIcon,
  },
  {
    title: 'Lucro diário',
    description: 'Acompanhe ganhos por taxa fixa e percentual.',
    icon: ChartBarIcon,
  },
];

const resumo = [
  { label: 'Lucro de hoje', value: 'R$ 82,00' },
  { label: 'Total enviado', value: 'R$ 1.950,00' },
  { label: 'Comprovantes', value: '4' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F7F5] px-4 py-5 text-[#181818] sm:px-6 lg:h-screen lg:overflow-hidden lg:p-0">
      <section className="flex min-h-[calc(100vh-40px)] w-full lg:h-full lg:min-h-0">
        <div className="grid w-full gap-5 lg:h-full lg:grid-cols-2 lg:items-stretch lg:gap-0">
          {/* Card principal */}
          <div className="flex min-h-[560px] flex-col rounded-[36px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8 lg:h-full lg:min-h-0 lg:justify-center lg:overflow-y-auto lg:rounded-none lg:border-0 lg:p-10 xl:p-14 2xl:p-16">
            <div className="w-full">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-[#181818] text-white">
                  <ReceiptPercentIcon className="h-7 w-7" />
                </div>

                <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F7F7F5] px-4 text-xs font-semibold text-zinc-600 sm:text-sm">
                  <ShieldCheckIcon className="h-4 w-4" />
                  Gestão financeira simples
                </div>
              </div>

              <div className="mt-10 max-w-2xl sm:mt-12 lg:mt-14">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Controle Correia
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-zinc-500 sm:text-lg">
                  Organize transferências, comprovantes, taxas e lucro diário em
                  um sistema limpo, rápido e fácil de acompanhar.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/login"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#181818] px-8 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto sm:min-w-[190px]"
                  >
                    Acessar sistema
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>

                  <Link
                    href="/dashboard"
                    className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-200 bg-white px-8 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-[#FAFAFA] hover:text-[#181818] sm:w-auto sm:min-w-[170px]"
                  >
                    Ver dashboard
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-12">
              {recursos.map((recurso) => {
                const Icon = recurso.icon;

                return (
                  <article
                    key={recurso.title}
                    className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-5"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[18px] bg-white shadow-sm">
                      <Icon className="h-5 w-5 text-[#181818]" />
                    </div>

                    <h2 className="text-sm font-semibold text-[#181818]">
                      {recurso.title}
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      {recurso.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Card escuro */}
          <aside className="min-h-[560px] rounded-[36px] bg-[#181818] p-5 text-white shadow-sm sm:p-8 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:rounded-none lg:p-10 xl:p-14 2xl:p-16">
            <div className="flex min-h-full flex-col justify-center gap-8 rounded-[30px] border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:rounded-[36px] lg:p-8">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/45">Resumo do dia</p>

                    <h2 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                      R$ 82,00
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-white/45">
                      Lucro calculado com base nas transferências concluídas
                      hoje.
                    </p>
                  </div>

                  <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[24px] bg-white text-[#181818]">
                    <BanknotesIcon className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {resumo.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[26px] border border-white/10 bg-white/5 p-5"
                    >
                      <p className="text-xs text-white/40">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-3 mb-5">
                <div className="rounded-[28px] bg-white p-5 text-[#181818]">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-none" />

                    <div>
                      <p className="text-sm font-semibold">
                        Última transferência registrada
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        Marcos Silva enviou R$ 500,00 com taxa de R$ 20,00.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs text-white/40">Taxa percentual</p>
                    <p className="mt-2 text-2xl font-semibold">3%</p>
                  </div>

                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs text-white/40">Taxa fixa</p>
                    <p className="mt-2 text-2xl font-semibold">R$ 5,00</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
