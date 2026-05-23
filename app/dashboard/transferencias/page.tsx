'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';
import RegistrarTransferenciaModal from '@/app/components/transferencias/RegistrarTransferenciaModal';

type Transferencia = {
  id: string;
  usuario_id: string;
  nome_cliente: string;
  valor_transferencia: number;
  taxa_percentual_aplicada: number;
  taxa_fixa_aplicada: number;
  lucro_taxa: number;
  valor_total_cobrado: number;
  status: 'concluida' | 'cancelada' | 'pendente';
  observacao: string | null;
  created_at: string;
};

type UsuarioSistema = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  telefone: string | null;
};

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

export default function TransferenciasPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const transferenciasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return transferencias;

    return transferencias.filter((item) => {
      return (
        item.nome_cliente.toLowerCase().includes(termo) ||
        item.id.toLowerCase().includes(termo)
      );
    });
  }, [busca, transferencias]);

  const resumo = useMemo(() => {
    const concluidas = transferenciasFiltradas.filter(
      (item) => item.status === 'concluida',
    );

    const totalTransferido = concluidas.reduce(
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

    return {
      quantidade: concluidas.length,
      totalTransferido,
      lucroTotal,
      totalCobrado,
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
      setErrorMessage(
        'Usuário do sistema não encontrado. Verifique se o cadastro automático em usuarios está funcionando.',
      );
      setLoading(false);
      return;
    }

    setUsuarioSistema(usuarioData as UsuarioSistema);
    await carregarTransferencias(usuarioData.id);

    setLoading(false);
  }, [carregarTransferencias, router, supabase]);

  useEffect(() => {
    carregarPagina();
  }, [carregarPagina]);

  function handleCreated() {
    setModalOpen(false);

    if (usuarioSistema?.id) {
      carregarTransferencias(usuarioSistema.id);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <DocumentTextIcon className="h-4 w-4" />
            Transferências
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Transferências registradas
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Consulte os registros realizados, valores transferidos, taxas
            aplicadas e lucro gerado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!usuarioSistema?.id}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5" />
          Nova transferência
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          title="Registros"
          value={loading ? '...' : String(resumo.quantidade)}
          icon={DocumentTextIcon}
        />

        <ResumoCard
          title="Total transferido"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalTransferido)}
          icon={BanknotesIcon}
        />

        <ResumoCard
          title="Lucro total"
          value={loading ? 'Carregando...' : formatCurrency(resumo.lucroTotal)}
          icon={ReceiptPercentIcon}
        />

        <ResumoCard
          title="Total cobrado"
          value={loading ? 'Carregando...' : formatCurrency(resumo.totalCobrado)}
          icon={BanknotesIcon}
        />
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#181818]">
              Histórico de transferências
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Lista completa dos registros feitos no sistema.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código"
              className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[28px] bg-[#FAFAFA]">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Carregando transferências...
              </div>
            </div>
          ) : transferenciasFiltradas.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-[#FAFAFA] p-8 text-center">
              <DocumentTextIcon className="mx-auto h-10 w-10 text-zinc-300" />

              <h3 className="mt-4 text-sm font-semibold text-[#181818]">
                Nenhuma transferência encontrada
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Registre uma nova transferência para começar a gerar o histórico
                de comprovantes.
              </p>

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={!usuarioSistema?.id}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon className="h-5 w-5" />
                Nova transferência
              </button>
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
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Transferido</th>
                      <th className="px-5 py-4">Taxa</th>
                      <th className="px-5 py-4">Lucro</th>
                      <th className="px-5 py-4">Total cobrado</th>
                      <th className="px-5 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {transferenciasFiltradas.map((item) => (
                      <tr key={item.id} className="text-sm">
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-[#181818]">
                              {item.nome_cliente}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {item.id.slice(0, 8)}
                            </p>
                          </div>
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
                          {Number(item.taxa_percentual_aplicada || 0)}% +{' '}
                          {formatCurrency(Number(item.taxa_fixa_aplicada || 0))}
                        </td>

                        <td className="px-5 py-4 font-medium text-[#181818]">
                          {formatCurrency(Number(item.lucro_taxa || 0))}
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
      </section>

      <RegistrarTransferenciaModal
        open={modalOpen}
        usuarioId={usuarioSistema?.id || ''}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

type ResumoCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
};

function ResumoCard({ title, value, icon: Icon }: ResumoCardProps) {
  return (
    <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
        <Icon className="h-6 w-6 text-[#181818]" />
      </div>

      <p className="text-sm text-zinc-500">{title}</p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
        {value}
      </h2>
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
            {formatDateTime(item.created_at)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-[24px] bg-white p-4">
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

        <div>
          <p className="text-xs text-zinc-400">Taxa</p>
          <p className="mt-1 text-sm font-semibold text-[#181818]">
            {Number(item.taxa_percentual_aplicada || 0)}% +{' '}
            {formatCurrency(Number(item.taxa_fixa_aplicada || 0))}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-400">Total cobrado</p>
          <p className="mt-1 text-sm font-semibold text-[#181818]">
            {formatCurrency(Number(item.valor_total_cobrado || 0))}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Transferencia['status'] }) {
  if (status === 'pendente') {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        Pendente
      </span>
    );
  }

  const active = status === 'concluida';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {active ? 'Concluída' : 'Cancelada'}
    </span>
  );
}
