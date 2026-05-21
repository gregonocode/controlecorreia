'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

type StatusComprovante = 'concluida' | 'cancelada';

type UsuarioSistema = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  telefone: string | null;
};

type Comprovante = {
  id: string;
  usuario_id: string;
  nome_cliente: string;
  valor_transferencia: number;
  taxa_percentual_aplicada: number;
  taxa_fixa_aplicada: number;
  lucro_taxa: number;
  valor_total_cobrado: number;
  status: StatusComprovante;
  observacao: string | null;
  created_at: string;
};

const filtrosStatus: { label: string; value: 'todos' | StatusComprovante }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Concluídos', value: 'concluida' },
  { label: 'Cancelados', value: 'cancelada' },
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

function formatComprovanteCode(id: string) {
  const number = Array.from(id.replace(/-/g, '')).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) % 1000000000;
  }, 0);

  return `#${String(number || 1).padStart(9, '0')}`;
}

function getStatusConfig(status: StatusComprovante) {
  if (status === 'concluida') {
    return {
      label: 'Concluído',
      className: 'bg-emerald-50 text-emerald-700',
      icon: CheckCircleIcon,
    };
  }

  return {
    label: 'Cancelado',
    className: 'bg-rose-50 text-rose-700',
    icon: XCircleIcon,
  };
}

export default function ComprovantesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );

  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusComprovante>(
    'todos',
  );

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const comprovantesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return comprovantes.filter((item) => {
      const matchStatus =
        statusFiltro === 'todos' || item.status === statusFiltro;

      const matchBusca =
        !termo ||
        item.id.toLowerCase().includes(termo) ||
        formatComprovanteCode(item.id).toLowerCase().includes(termo) ||
        item.nome_cliente.toLowerCase().includes(termo);

      return matchStatus && matchBusca;
    });
  }, [busca, comprovantes, statusFiltro]);

  const resumo = useMemo(() => {
    const concluidos = comprovantesFiltrados.filter(
      (item) => item.status === 'concluida',
    );

    const totalTransferido = concluidos.reduce(
      (acc, item) => acc + Number(item.valor_transferencia || 0),
      0,
    );

    const lucro = concluidos.reduce(
      (acc, item) => acc + Number(item.lucro_taxa || 0),
      0,
    );

    const totalCobrado = concluidos.reduce(
      (acc, item) => acc + Number(item.valor_total_cobrado || 0),
      0,
    );

    return {
      total: comprovantesFiltrados.length,
      concluidos: concluidos.length,
      totalTransferido,
      lucro,
      totalCobrado,
    };
  }, [comprovantesFiltrados]);

  const carregarComprovantes = useCallback(
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
        setComprovantes([]);
        return;
      }

      setComprovantes((data || []) as Comprovante[]);
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
        'Usuário do sistema não encontrado. Verifique se a tabela usuarios foi criada e se o trigger automático está funcionando.',
      );
      setLoading(false);
      return;
    }

    setUsuarioSistema(usuarioData as UsuarioSistema);
    await carregarComprovantes(usuarioData.id);

    setLoading(false);
  }, [carregarComprovantes, router, supabase]);

  useEffect(() => {
    carregarPagina();
  }, [carregarPagina]);

  function handleOpenPdf(id: string) {
    window.open(`/api/comprovantes/${id}/pdf`, '_blank', 'noopener,noreferrer');
  }

  function handleDownloadPdf(id: string) {
    window.open(
      `/api/comprovantes/${id}/pdf?download=1`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <DocumentTextIcon className="h-4 w-4" />
            Comprovantes
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Comprovantes registrados
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Consulte transferências realizadas, visualize os valores cobrados e
            abra o comprovante em PDF para impressão.
          </p>
        </div>

        <Link
          href="/dashboard/transferencias/nova"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          Nova transferência
        </Link>
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
          title="Registros encontrados"
          value={loading ? '...' : String(resumo.total)}
          icon={DocumentMagnifyingGlassIcon}
        />

        <ResumoCard
          title="Concluídos"
          value={loading ? '...' : String(resumo.concluidos)}
          icon={CheckCircleIcon}
        />

        <ResumoCard
          title="Total transferido"
          value={
            loading ? 'Carregando...' : formatCurrency(resumo.totalTransferido)
          }
          icon={BanknotesIcon}
        />

        <ResumoCard
          title="Lucro filtrado"
          value={loading ? 'Carregando...' : formatCurrency(resumo.lucro)}
          icon={ReceiptPercentIcon}
        />
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#181818]">
              Lista de comprovantes
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Use a busca ou filtros para encontrar um registro específico.
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

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {filtrosStatus.map((filtro) => {
            const active = statusFiltro === filtro.value;

            return (
              <button
                key={filtro.value}
                type="button"
                onClick={() => setStatusFiltro(filtro.value)}
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
            onClick={() => usuarioSistema?.id && carregarComprovantes(usuarioSistema.id)}
            disabled={loading || !usuarioSistema?.id}
            className="ml-auto hidden h-11 flex-none items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Atualizar
          </button>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-[28px] bg-[#FAFAFA]">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Carregando comprovantes...
              </div>
            </div>
          ) : comprovantesFiltrados.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-200 bg-[#FAFAFA] px-5 py-12 text-center">
              <DocumentMagnifyingGlassIcon className="mx-auto h-10 w-10 text-zinc-300" />

              <p className="mt-3 text-sm font-medium text-[#181818]">
                Nenhum comprovante encontrado
              </p>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">
                Tente mudar o termo de busca, o filtro selecionado ou registre
                uma nova transferência.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:hidden">
                {comprovantesFiltrados.map((item) => (
                  <ComprovanteCard
                    key={item.id}
                    item={item}
                    onView={() => handleOpenPdf(item.id)}
                    onDownload={() => handleDownloadPdf(item.id)}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-[28px] border border-zinc-100 lg:block">
                <table className="w-full border-collapse">
                  <thead className="bg-[#FAFAFA]">
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                      <th className="px-5 py-4">Código</th>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Data</th>
                      <th className="px-5 py-4">Transferido</th>
                      <th className="px-5 py-4">Taxa</th>
                      <th className="px-5 py-4">Lucro</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {comprovantesFiltrados.map((item) => {
                      const status = getStatusConfig(item.status);
                      const StatusIcon = status.icon;
                      const code = formatComprovanteCode(item.id);

                      return (
                        <tr key={item.id} className="text-sm">
                          <td className="px-5 py-4 font-medium text-[#181818]">
                            {code}
                          </td>

                          <td className="px-5 py-4">
                            <div>
                              <p className="font-medium text-[#181818]">
                                {item.nome_cliente}
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                Comprovante {code}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-zinc-500">
                              <CalendarDaysIcon className="h-4 w-4" />
                              <span>{formatDateTime(item.created_at)}</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-[#181818]">
                            {formatCurrency(
                              Number(item.valor_transferencia || 0),
                            )}
                          </td>

                          <td className="px-5 py-4 text-zinc-600">
                            {Number(item.taxa_percentual_aplicada || 0)}% +{' '}
                            {formatCurrency(
                              Number(item.taxa_fixa_aplicada || 0),
                            )}
                          </td>

                          <td className="px-5 py-4 font-medium text-[#181818]">
                            {formatCurrency(Number(item.lucro_taxa || 0))}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {status.label}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenPdf(item.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
                                aria-label="Ver comprovante"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(item.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
                                aria-label="Baixar comprovante"
                              >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
        <Icon className="h-6 w-6 text-[#181818]" />
      </div>

      <p className="text-sm text-zinc-500">{title}</p>

      <h2 className="mt-2 text-2xl font-semibold text-[#181818]">{value}</h2>
    </div>
  );
}

type ComprovanteCardProps = {
  item: Comprovante;
  onView: () => void;
  onDownload: () => void;
};

function ComprovanteCard({
  item,
  onView,
  onDownload,
}: ComprovanteCardProps) {
  const status = getStatusConfig(item.status);
  const StatusIcon = status.icon;
  const code = formatComprovanteCode(item.id);

  return (
    <div className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
            <UserIcon className="h-5 w-5 text-zinc-600" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-medium text-[#181818]">
              {item.nome_cliente}
            </h3>

            <p className="mt-1 text-xs text-zinc-400">
              Código: {code}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-white p-4">
        <InfoItem label="Data" value={formatDateTime(item.created_at)} />

        <InfoItem
          label="Transferido"
          value={formatCurrency(Number(item.valor_transferencia || 0))}
        />

        <InfoItem
          label="Taxa"
          value={`${Number(item.taxa_percentual_aplicada || 0)}% + ${formatCurrency(
            Number(item.taxa_fixa_aplicada || 0),
          )}`}
        />

        <InfoItem
          label="Lucro"
          value={formatCurrency(Number(item.lucro_taxa || 0))}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#181818] px-4 text-sm font-semibold text-white"
        >
          <EyeIcon className="h-5 w-5" />
          Ver PDF
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Baixar
        </button>
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
