'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import RegistrarTransferenciaModal from '../components/transferencias/RegistrarTransferenciaModal';
import { createClient } from '@/app/lib/supabase/client';

type PeriodoFiltro = 'hoje' | 'ontem' | 'semana' | 'mes';

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
  status: 'concluida' | 'cancelada';
  observacao: string | null;
  created_at: string;
};

const filtros: { label: string; value: PeriodoFiltro }[] = [
  { label: 'Hoje', value: 'hoje' },
  { label: 'Ontem', value: 'ontem' },
  { label: 'Essa semana', value: 'semana' },
  { label: 'Esse mês', value: 'mes' },
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

function getPeriodRange(periodo: PeriodoFiltro) {
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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTransferencias, setLoadingTransferencias] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resumo = useMemo(() => {
    const concluidas = transferencias.filter(
      (item) => item.status === 'concluida',
    );

    const totalEnviado = concluidas.reduce(
      (acc, item) => acc + Number(item.valor_transferencia || 0),
      0,
    );

    const lucroTotal = concluidas.reduce(
      (acc, item) => acc + Number(item.lucro_taxa || 0),
      0,
    );

    const totalCobrado = concluidas.reduce(
      (acc, item) => acc + Number(item.valor_total_cobrado || 0),
      0,
    );

    const ticketMedio =
      concluidas.length > 0 ? totalEnviado / concluidas.length : 0;

    return {
      totalEnviado,
      lucroTotal,
      totalCobrado,
      ticketMedio,
      quantidade: concluidas.length,
    };
  }, [transferencias]);

  const taxaAtual = useMemo(() => {
    const ultimaComTaxa = transferencias.find(
      (item) =>
        Number(item.taxa_percentual_aplicada || 0) > 0 ||
        Number(item.taxa_fixa_aplicada || 0) > 0,
    );

    return {
      percentual: ultimaComTaxa?.taxa_percentual_aplicada ?? 0,
      fixa: ultimaComTaxa?.taxa_fixa_aplicada ?? 0,
    };
  }, [transferencias]);

  const carregarTransferencias = useCallback(
    async (usuarioId: string, periodoAtual: PeriodoFiltro) => {
      setLoadingTransferencias(true);
      setErrorMessage('');

      const range = getPeriodRange(periodoAtual);

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
        .gte('created_at', range.start)
        .lte('created_at', range.end)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setTransferencias([]);
        setLoadingTransferencias(false);
        return;
      }

      setTransferencias((data || []) as Transferencia[]);
      setLoadingTransferencias(false);
    },
    [supabase],
  );

  const carregarDashboard = useCallback(async () => {
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
      setErrorMessage(
        'Usuário do sistema não encontrado. Verifique se a tabela usuarios foi criada e se o trigger de cadastro automático está funcionando.',
      );
      setLoading(false);
      return;
    }

    setUsuarioSistema(usuarioData as UsuarioSistema);
    await carregarTransferencias(usuarioData.id, periodo);

    setLoading(false);
  }, [carregarTransferencias, periodo, router, supabase]);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  useEffect(() => {
    if (!usuarioSistema?.id) return;

    carregarTransferencias(usuarioSistema.id, periodo);
  }, [carregarTransferencias, periodo, usuarioSistema?.id]);

  function handleTransferenciaCriada() {
    setModalTransferenciaOpen(false);

    if (usuarioSistema?.id) {
      carregarTransferencias(usuarioSistema.id, periodo);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <CalendarDaysIcon className="h-4 w-4" />
            Visão geral
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Acompanhe transferências, comprovantes e lucro por período no
            Controle Correia.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalTransferenciaOpen(true)}
          disabled={!usuarioSistema?.id}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          Registrar transferência
        </button>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-[28px] border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-none" />

          <div>
            <p className="text-sm font-semibold">Atenção</p>
            <p className="mt-1 text-sm leading-6 text-amber-700">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <section className="flex gap-2 overflow-x-auto pb-1">
        {filtros.map((filtro) => {
          const active = periodo === filtro.value;

          return (
            <button
              key={filtro.value}
              type="button"
              onClick={() => setPeriodo(filtro.value)}
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
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Lucro no período"
          value={loading ? 'Carregando...' : formatCurrency(resumo.lucroTotal)}
          description="Baseado nas taxas aplicadas."
          icon={ArrowTrendingUpIcon}
        />

        <ResumoCard
          title="Total enviado"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalEnviado)}
          description="Soma das transferências concluídas."
          icon={BanknotesIcon}
        />

        <ResumoCard
          title="Comprovantes"
          value={loading ? '...' : String(resumo.quantidade)}
          description="Registros concluídos neste período."
          icon={DocumentTextIcon}
        />

        <ResumoCard
          title="Ticket médio"
          value={loading ? 'Carregando...' : formatCurrency(resumo.ticketMedio)}
          description="Média por transferência concluída."
          icon={ReceiptPercentIcon}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#181818]">
                Transferências recentes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Últimos cadastros feitos no período selecionado.
              </p>
            </div>

            <Link
              href="/dashboard/comprovantes"
              className="hidden rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 sm:inline-flex"
            >
              Ver todos
            </Link>
          </div>

          {loadingTransferencias ? (
            <div className="flex min-h-64 items-center justify-center rounded-[28px] bg-[#FAFAFA]">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Carregando transferências...
              </div>
            </div>
          ) : transferencias.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-[#FAFAFA] p-8 text-center">
              <DocumentTextIcon className="mx-auto h-10 w-10 text-zinc-300" />

              <h3 className="mt-4 text-sm font-semibold text-[#181818]">
                Nenhuma transferência encontrada
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Clique em registrar transferência para adicionar o primeiro
                comprovante deste período.
              </p>

              <button
                type="button"
                onClick={() => setModalTransferenciaOpen(true)}
                disabled={!usuarioSistema?.id}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
                Registrar transferência
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {transferencias.slice(0, 6).map((item) => (
                <TransferenciaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[32px] border border-zinc-200 bg-[#181818] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
            <ReceiptPercentIcon className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-xl font-semibold tracking-tight">
            Resumo financeiro
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Dados calculados com base nas transferências do período selecionado.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45">Total cobrado</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(resumo.totalCobrado)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/45">Última taxa percentual</p>
                <p className="mt-1 text-2xl font-semibold">
                  {Number(taxaAtual.percentual || 0)}%
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/45">Última taxa fixa</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(Number(taxaAtual.fixa || 0))}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/configuracoes"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#181818] transition hover:opacity-90"
          >
            Ajustar taxas
          </Link>
        </aside>
      </section>

      <RegistrarTransferenciaModal
        open={modalTransferenciaOpen}
        usuarioId={usuarioSistema?.id || ''}
        onClose={() => setModalTransferenciaOpen(false)}
        onCreated={handleTransferenciaCriada}
      />
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

function TransferenciaCard({ item }: { item: Transferencia }) {
  const statusLabel = item.status === 'concluida' ? 'Concluída' : 'Cancelada';

  return (
    <div className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
            <UserIcon className="h-5 w-5 text-zinc-600" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-[#181818]">
                {item.nome_cliente}
              </h3>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.status === 'concluida'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-4 w-4" />
                {formatDateTime(item.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left sm:text-right">
          <div>
            <p className="text-xs text-zinc-400">Transferido</p>
            <p className="mt-1 text-sm font-semibold text-[#181818]">
              {formatCurrency(Number(item.valor_transferencia || 0))}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-400">Lucro</p>
            <p className="mt-1 text-sm font-semibold text-[#181818]">
              {formatCurrency(Number(item.lucro_taxa || 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}