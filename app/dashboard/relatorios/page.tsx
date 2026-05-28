'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ReceiptPercentIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

type PeriodoFiltro = 'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado';
type StatusTransferencia = 'concluida' | 'cancelada' | 'pendente';

type DateRange = {
  start: string;
  end: string;
};

type UsuarioSistema = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  telefone: string | null;
};

type Transferencia = {
  id: string;
  usuario_id: string;
  nome_cliente: string;
  valor_transferencia: number;
  taxa_percentual_aplicada: number;
  taxa_fixa_aplicada: number;
  lucro_taxa: number;
  valor_total_cobrado: number;
  status: StatusTransferencia;
  observacao: string | null;
  created_at: string;
};

const filtros: { label: string; value: PeriodoFiltro }[] = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Essa semana', value: 'semana' },
  { label: 'Esse mes', value: 'mes' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getPeriodRange(periodo: PeriodoFiltro, customRange?: DateRange) {
  if (periodo === 'personalizado' && customRange?.start && customRange?.end) {
    return {
      start: new Date(`${customRange.start}T00:00:00`).toISOString(),
      end: new Date(`${customRange.end}T23:59:59.999`).toISOString(),
    };
  }

  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (periodo === 'hoje') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (periodo === 'ontem') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }

  if (periodo === 'semana') {
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    start.setDate(start.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (periodo === 'mes') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function formatTransferenciaCode(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export default function RelatoriosPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteFocado, setClienteFocado] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const today = formatDateInputValue(new Date());

    return { start: today, end: today };
  });
  const [customRangeDraft, setCustomRangeDraft] = useState<DateRange>(() => {
    const today = formatDateInputValue(new Date());

    return { start: today, end: today };
  });
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const clientes = useMemo(() => {
    const clientesMap = new Map<string, { nome: string; total: number }>();

    transferencias.forEach((item) => {
      const nome = item.nome_cliente.trim();
      const key = normalizeSearch(nome);

      if (!nome) return;

      const cliente = clientesMap.get(key);

      if (cliente) {
        cliente.total += 1;
      } else {
        clientesMap.set(key, { nome, total: 1 });
      }
    });

    return Array.from(clientesMap.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }, [transferencias]);

  const sugestoesClientes = useMemo(() => {
    const termo = normalizeSearch(clienteBusca.trim());

    return clientes
      .filter((cliente) => !termo || normalizeSearch(cliente.nome).includes(termo))
      .slice(0, 8);
  }, [clienteBusca, clientes]);

  const rangeAtual = useMemo(
    () => getPeriodRange(periodo, customRange),
    [customRange, periodo],
  );

  const transferenciasFiltradas = useMemo(() => {
    const termo = normalizeSearch(clienteBusca.trim());
    const start = new Date(rangeAtual.start).getTime();
    const end = new Date(rangeAtual.end).getTime();

    return transferencias.filter((item) => {
      const createdAt = new Date(item.created_at).getTime();
      const matchPeriodo = createdAt >= start && createdAt <= end;
      const matchCliente =
        !termo || normalizeSearch(item.nome_cliente).includes(termo);

      return matchPeriodo && matchCliente;
    });
  }, [clienteBusca, rangeAtual.end, rangeAtual.start, transferencias]);

  const resumo = useMemo(() => {
    const concluidas = transferenciasFiltradas.filter(
      (item) => item.status === 'concluida',
    );

    const totalTransferido = concluidas.reduce(
      (acc, item) => acc + Number(item.valor_transferencia || 0),
      0,
    );
    const totalTaxas = concluidas.reduce(
      (acc, item) => acc + Number(item.lucro_taxa || 0),
      0,
    );
    const totalCobrado = concluidas.reduce(
      (acc, item) => acc + Number(item.valor_total_cobrado || 0),
      0,
    );
    const taxaMedia =
      totalTransferido > 0 ? (totalTaxas / totalTransferido) * 100 : 0;
    const ticketMedio =
      concluidas.length > 0 ? totalTransferido / concluidas.length : 0;

    return {
      registros: transferenciasFiltradas.length,
      concluidas: concluidas.length,
      pendentes: transferenciasFiltradas.filter(
        (item) => item.status === 'pendente',
      ).length,
      canceladas: transferenciasFiltradas.filter(
        (item) => item.status === 'cancelada',
      ).length,
      totalTransferido,
      totalTaxas,
      totalCobrado,
      taxaMedia,
      ticketMedio,
    };
  }, [transferenciasFiltradas]);

  const carregarTransferencias = useCallback(
    async (usuarioId: string) => {
      setErrorMessage('');

      const { data, error } = await supabase
        .from('transferencias')
        .select(
          `
          id,
          usuario_id,
          nome_cliente,
          valor_transferencia,
          taxa_percentual_aplicada,
          taxa_fixa_aplicada,
          lucro_taxa,
          valor_total_cobrado,
          status,
          observacao,
          created_at
        `,
        )
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setTransferencias([]);
        return;
      }

      setTransferencias((data || []) as Transferencia[]);
    },
    [supabase],
  );

  const carregarPagina = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push('/login');
      return;
    }

    const { data: usuarioData, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id, auth_user_id, nome, telefone')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (usuarioError) {
      setErrorMessage(usuarioError.message);
      setLoading(false);
      return;
    }

    if (!usuarioData) {
      setErrorMessage('Usuario do sistema nao encontrado.');
      setLoading(false);
      return;
    }

    setUsuarioSistema(usuarioData as UsuarioSistema);
    await carregarTransferencias(usuarioData.id);
    setLoading(false);
  }, [carregarTransferencias, router, supabase]);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (active) {
        void carregarPagina();
      }
    });

    return () => {
      active = false;
    };
  }, [carregarPagina]);

  function handleFiltroClick(value: PeriodoFiltro) {
    if (value === 'personalizado') {
      setCustomRangeDraft(customRange);
      setCustomRangeOpen(true);
      return;
    }

    setCustomRangeOpen(false);
    setPeriodo(value);
  }

  function handleAplicarPeriodoPersonalizado() {
    if (!customRangeDraft.start || !customRangeDraft.end) {
      setErrorMessage('Selecione a data inicial e a data final.');
      return;
    }

    if (customRangeDraft.start > customRangeDraft.end) {
      setErrorMessage('A data inicial nao pode ser maior que a data final.');
      return;
    }

    setErrorMessage('');
    setCustomRange(customRangeDraft);
    setPeriodo('personalizado');
    setCustomRangeOpen(false);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <ChartBarIcon className="h-4 w-4" />
            Relatorios
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Relatorio por cliente
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Selecione ou digite um cliente e escolha o periodo para ver
            transferencias, totais e taxas consolidadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => usuarioSistema?.id && carregarTransferencias(usuarioSistema.id)}
          disabled={loading || !usuarioSistema?.id}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-[28px] border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-none" />
          <div>
            <p className="text-sm font-semibold">Atencao</p>
            <p className="mt-1 text-sm leading-6 text-amber-700">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-end">
          <div>
            <label
              htmlFor="clienteBusca"
              className="mb-2 block text-sm font-medium text-zinc-700"
            >
              Cliente
            </label>

            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

              <input
                id="clienteBusca"
                type="text"
                value={clienteBusca}
                onChange={(event) => setClienteBusca(event.target.value)}
                onFocus={() => setClienteFocado(true)}
                onBlur={() => {
                  window.setTimeout(() => setClienteFocado(false), 120);
                }}
                placeholder="Selecionar ou digitar cliente"
                aria-autocomplete="list"
                className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
              />

              {clienteFocado && sugestoesClientes.length > 0 && (
                <div
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-zinc-100 bg-white p-2 shadow-xl shadow-zinc-950/10"
                >
                  {sugestoesClientes.map((cliente) => (
                    <button
                      key={normalizeSearch(cliente.nome)}
                      type="button"
                      role="option"
                      aria-selected={clienteBusca === cliente.nome}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setClienteBusca(cliente.nome);
                        setClienteFocado(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#F7F7F5]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#181818]">
                          {cliente.nome}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500">
                          {cliente.total}{' '}
                          {cliente.total === 1
                            ? 'transferencia'
                            : 'transferencias'}
                        </span>
                      </span>
                      <UserIcon className="h-4 w-4 flex-none text-zinc-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {filtros.map((filtro) => {
              const active = periodo === filtro.value;

              return (
                <button
                  key={filtro.value}
                  type="button"
                  onClick={() => handleFiltroClick(filtro.value)}
                  className={`h-11 flex-none rounded-full px-5 text-sm font-medium transition ${
                    active
                      ? 'bg-[#181818] text-white'
                      : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {filtro.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => handleFiltroClick('personalizado')}
              className={`h-11 flex-none rounded-full px-5 text-sm font-medium transition ${
                periodo === 'personalizado'
                  ? 'bg-[#181818] text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
              }`}
            >
              Personalizado
            </button>
          </div>
        </div>
      </section>

      {customRangeOpen && (
        <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
            <div>
              <label
                htmlFor="dataInicial"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Data inicial
              </label>
              <input
                id="dataInicial"
                type="date"
                value={customRangeDraft.start}
                onChange={(event) =>
                  setCustomRangeDraft((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-4 text-sm text-[#181818] outline-none transition focus:border-[#181818] focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="dataFinal"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Data final
              </label>
              <input
                id="dataFinal"
                type="date"
                value={customRangeDraft.end}
                onChange={(event) =>
                  setCustomRangeDraft((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-4 text-sm text-[#181818] outline-none transition focus:border-[#181818] focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setCustomRangeOpen(false)}
              className="mt-auto inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAplicarPeriodoPersonalizado}
              className="mt-auto inline-flex h-12 items-center justify-center rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Aplicar
            </button>
          </div>
        </section>
      )}

      {periodo === 'personalizado' && !customRangeOpen && (
        <p className="-mt-3 text-sm text-zinc-500">
          Periodo: {formatDateLabel(customRange.start)} ate{' '}
          {formatDateLabel(customRange.end)}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Transferencias"
          value={loading ? '...' : String(resumo.concluidas)}
          description={`${resumo.pendentes} pendentes, ${resumo.canceladas} canceladas`}
          icon={DocumentMagnifyingGlassIcon}
        />

        <ResumoCard
          title="Total transferido"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalTransferido)}
          description="Soma das transferencias concluidas."
          icon={BanknotesIcon}
        />

        <ResumoCard
          title="Taxas recebidas"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalTaxas)}
          description={`Taxa media: ${resumo.taxaMedia.toFixed(2)}%`}
          icon={ReceiptPercentIcon}
        />

        <ResumoCard
          title="Total cobrado"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalCobrado)}
          description={`Ticket medio: ${formatCurrency(resumo.ticketMedio)}`}
          icon={ChartBarIcon}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#181818]">
                Transferencias do cliente
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {clienteBusca.trim()
                  ? `Resultado para "${clienteBusca.trim()}".`
                  : 'Digite ou selecione um cliente para refinar o relatorio.'}
              </p>
            </div>

            <span className="inline-flex h-10 items-center rounded-full bg-[#F7F7F5] px-4 text-sm font-medium text-zinc-600">
              {resumo.registros} registros
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[28px] bg-[#FAFAFA]">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Carregando relatorio...
              </div>
            </div>
          ) : transferenciasFiltradas.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-[#FAFAFA] p-8 text-center">
              <DocumentMagnifyingGlassIcon className="mx-auto h-10 w-10 text-zinc-300" />
              <h3 className="mt-4 text-sm font-semibold text-[#181818]">
                Nenhuma transferencia encontrada
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Ajuste o cliente ou o periodo para consultar outro resultado.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {transferenciasFiltradas.map((item) => (
                  <TransferenciaCard key={item.id} item={item} />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[28px] border border-zinc-100 lg:block">
                <table className="w-full border-collapse">
                  <thead className="bg-[#FAFAFA]">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      <th className="px-5 py-4">Numero</th>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Transferido</th>
                      <th className="px-5 py-4">Taxas</th>
                      <th className="px-5 py-4">Total</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {transferenciasFiltradas.map((item) => (
                      <tr key={item.id} className="text-sm">
                        <td className="px-5 py-4 font-medium text-[#181818]">
                          {formatTransferenciaCode(item.id)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {item.nome_cliente}
                        </td>
                        <td className="px-5 py-4 text-zinc-500">
                          <div className="flex items-center gap-2">
                            <CalendarDaysIcon className="h-4 w-4" />
                            {formatDateTime(item.created_at)}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-[#181818]">
                          {formatCurrency(Number(item.valor_transferencia || 0))}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatCurrency(Number(item.lucro_taxa || 0))}
                          <span className="mt-1 block text-xs text-zinc-400">
                            {Number(item.taxa_percentual_aplicada || 0)}% +{' '}
                            {formatCurrency(Number(item.taxa_fixa_aplicada || 0))}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-medium text-[#181818]">
                          {formatCurrency(Number(item.valor_total_cobrado || 0))}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="rounded-[32px] border border-zinc-200 bg-[#181818] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
            <UserIcon className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-xl font-semibold tracking-tight">
            Resumo do cliente
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Consolidado apenas das transferencias concluidas no filtro atual.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45">Cliente</p>
              <p className="mt-1 text-xl font-semibold">
                {clienteBusca.trim() || 'Todos os clientes'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <ResumoEscuro
                label="Transferencias concluidas"
                value={String(resumo.concluidas)}
              />
              <ResumoEscuro
                label="Taxas recebidas"
                value={formatCurrency(resumo.totalTaxas)}
              />
              <ResumoEscuro
                label="Total transferido"
                value={formatCurrency(resumo.totalTransferido)}
              />
              <ResumoEscuro
                label="Total cobrado"
                value={formatCurrency(resumo.totalCobrado)}
              />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

type ResumoCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
};

function ResumoCard({ title, value, description, icon: Icon }: ResumoCardProps) {
  return (
    <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
        <Icon className="h-6 w-6 text-[#181818]" />
      </div>

      <p className="text-sm text-zinc-500">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
        {value}
      </h2>
      <p className="mt-3 text-xs text-zinc-400">{description}</p>
    </div>
  );
}

function ResumoEscuro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function TransferenciaCard({ item }: { item: Transferencia }) {
  return (
    <div className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
          <UserIcon className="h-5 w-5 text-zinc-600" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-[#181818]">{item.nome_cliente}</h3>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {formatTransferenciaCode(item.id)} - {formatDateTime(item.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-[24px] bg-white p-4">
        <InfoItem
          label="Transferido"
          value={formatCurrency(Number(item.valor_transferencia || 0))}
        />
        <InfoItem
          label="Taxas"
          value={formatCurrency(Number(item.lucro_taxa || 0))}
        />
        <InfoItem
          label="Taxa aplicada"
          value={`${Number(item.taxa_percentual_aplicada || 0)}% + ${formatCurrency(
            Number(item.taxa_fixa_aplicada || 0),
          )}`}
        />
        <InfoItem
          label="Total"
          value={formatCurrency(Number(item.valor_total_cobrado || 0))}
        />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#181818]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StatusTransferencia }) {
  if (status === 'pendente') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <ClockIcon className="h-3.5 w-3.5" />
        Pendente
      </span>
    );
  }

  if (status === 'cancelada') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
        <XCircleIcon className="h-3.5 w-3.5" />
        Cancelada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <CheckCircleIcon className="h-3.5 w-3.5" />
      Concluida
    </span>
  );
}
