'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

type StatusComprovante = 'concluida' | 'cancelada' | 'pendente';

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

type PdfAction = 'view' | 'download';
type PdfFormato = 'a4' | 'pdv';
type EditarTransferenciaPayload = {
  nomeCliente: string;
  taxaPercentual: number;
  taxaFixa: number;
};
const ITENS_POR_PAGINA = 15;

const filtrosStatus: { label: string; value: 'todos' | StatusComprovante }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Concluídos', value: 'concluida' },
  { label: 'Pendentes', value: 'pendente' },
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

function toNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getStatusConfig(status: StatusComprovante) {
  if (status === 'concluida') {
    return {
      label: 'Concluído',
      className: 'bg-emerald-50 text-emerald-700',
      icon: CheckCircleIcon,
    };
  }

  if (status === 'pendente') {
    return {
      label: 'Pendente',
      className: 'bg-amber-50 text-amber-700',
      icon: ClockIcon,
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
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusComprovante>(
    'todos',
  );
  const [paginaAtual, setPaginaAtual] = useState(1);

  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);
  const [concluindoId, setConcluindoId] = useState<string | null>(null);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [comprovanteParaEditar, setComprovanteParaEditar] =
    useState<Comprovante | null>(null);
  const [comprovanteParaCancelar, setComprovanteParaCancelar] =
    useState<Comprovante | null>(null);
  const [comprovanteParaConcluir, setComprovanteParaConcluir] =
    useState<Comprovante | null>(null);
  const [pdfSelection, setPdfSelection] = useState<{
    item: Comprovante;
    action: PdfAction;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const clientesAutocomplete = useMemo(() => {
    const clientes = new Map<string, { nome: string; total: number }>();

    comprovantes.forEach((item) => {
      const nome = item.nome_cliente.trim();
      const key = normalizeSearch(nome);

      if (!nome) return;

      const cliente = clientes.get(key);

      if (cliente) {
        cliente.total += 1;
      } else {
        clientes.set(key, { nome, total: 1 });
      }
    });

    return Array.from(clientes.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }, [comprovantes]);

  const sugestoesClientes = useMemo(() => {
    const termo = normalizeSearch(busca.trim());

    return clientesAutocomplete
      .filter((cliente) => !termo || normalizeSearch(cliente.nome).includes(termo))
      .slice(0, 8);
  }, [busca, clientesAutocomplete]);

  const comprovantesFiltrados = useMemo(() => {
    const termo = normalizeSearch(busca.trim());

    return comprovantes.filter((item) => {
      const matchStatus =
        statusFiltro === 'todos' || item.status === statusFiltro;

      const matchBusca =
        !termo ||
        normalizeSearch(item.nome_cliente).includes(termo);

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

  const totalPaginas = Math.max(
    1,
    Math.ceil(comprovantesFiltrados.length / ITENS_POR_PAGINA),
  );
  const paginaAtualSegura = Math.min(paginaAtual, totalPaginas);

  const comprovantesPaginados = useMemo(() => {
    const start = (paginaAtualSegura - 1) * ITENS_POR_PAGINA;

    return comprovantesFiltrados.slice(start, start + ITENS_POR_PAGINA);
  }, [comprovantesFiltrados, paginaAtualSegura]);

  const primeiroItemPagina =
    comprovantesFiltrados.length === 0
      ? 0
      : (paginaAtualSegura - 1) * ITENS_POR_PAGINA + 1;
  const ultimoItemPagina = Math.min(
    paginaAtualSegura * ITENS_POR_PAGINA,
    comprovantesFiltrados.length,
  );

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

  async function handleCancelarTransferencia() {
    if (!usuarioSistema?.id || !comprovanteParaCancelar) return;

    setCancelandoId(comprovanteParaCancelar.id);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('transferencias')
      .update({ status: 'cancelada' })
      .eq('id', comprovanteParaCancelar.id)
      .eq('usuario_id', usuarioSistema.id);

    setCancelandoId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setComprovantes((current) =>
      current.map((item) =>
        item.id === comprovanteParaCancelar.id
          ? { ...item, status: 'cancelada' }
          : item,
      ),
    );
    setSuccessMessage('Transferência cancelada com sucesso.');
    setComprovanteParaCancelar(null);
  }

  async function handleConcluirTransferencia() {
    if (!usuarioSistema?.id || !comprovanteParaConcluir) return;

    setConcluindoId(comprovanteParaConcluir.id);
    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('transferencias')
      .update({ status: 'concluida' })
      .eq('id', comprovanteParaConcluir.id)
      .eq('usuario_id', usuarioSistema.id);

    setConcluindoId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setComprovantes((current) =>
      current.map((item) =>
        item.id === comprovanteParaConcluir.id
          ? { ...item, status: 'concluida' }
          : item,
      ),
    );
    setSuccessMessage('Transferência concluída com sucesso.');
    setComprovanteParaConcluir(null);
  }

  async function handleEditarTransferencia({
    nomeCliente,
    taxaPercentual,
    taxaFixa,
  }: EditarTransferenciaPayload) {
    if (!usuarioSistema?.id || !comprovanteParaEditar) return;

    setEditandoId(comprovanteParaEditar.id);
    setErrorMessage('');
    setSuccessMessage('');

    const valorTransferencia = Number(
      comprovanteParaEditar.valor_transferencia || 0,
    );
    const lucroTaxa = valorTransferencia * (taxaPercentual / 100) + taxaFixa;
    const valorTotalCobrado = valorTransferencia + lucroTaxa;

    const { error } = await supabase
      .from('transferencias')
      .update({
        nome_cliente: nomeCliente,
        taxa_manual_ativa: true,
        taxa_manual_percentual: taxaPercentual,
        taxa_manual_fixa: taxaFixa,
        taxa_percentual_aplicada: taxaPercentual,
        taxa_fixa_aplicada: taxaFixa,
        lucro_taxa: lucroTaxa,
        valor_total_cobrado: valorTotalCobrado,
      })
      .eq('id', comprovanteParaEditar.id)
      .eq('usuario_id', usuarioSistema.id);

    setEditandoId(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setComprovantes((current) =>
      current.map((item) =>
        item.id === comprovanteParaEditar.id
          ? {
              ...item,
              nome_cliente: nomeCliente,
              taxa_percentual_aplicada: taxaPercentual,
              taxa_fixa_aplicada: taxaFixa,
              lucro_taxa: lucroTaxa,
              valor_total_cobrado: valorTotalCobrado,
            }
          : item,
      ),
    );
    setSuccessMessage('Transferência editada com sucesso.');
    setComprovanteParaEditar(null);
  }

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

  function openPdf(id: string, action: PdfAction, formato: PdfFormato) {
    const endpoint = formato === 'pdv' ? 'pdf-pdv' : 'pdf';
    const downloadQuery = action === 'download' ? '?download=1' : '';

    window.open(
      `/api/comprovantes/${id}/${endpoint}${downloadQuery}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function handleSelectPdfFormat(formato: PdfFormato) {
    if (!pdfSelection) return;

    openPdf(pdfSelection.item.id, pdfSelection.action, formato);
    setPdfSelection(null);
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

      {successMessage && (
        <div className="flex items-start gap-3 rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-none" />

          <div>
            <p className="text-sm font-semibold">Tudo certo</p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              {successMessage}
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
              Use a busca por cliente ou filtros para encontrar um registro
              especifico.
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

            <input
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPaginaAtual(1);
              }}
              onFocus={() => setBuscaFocada(true)}
              onBlur={() => {
                window.setTimeout(() => setBuscaFocada(false), 120);
              }}
              placeholder="Buscar cliente"
              aria-label="Buscar comprovantes por cliente"
              aria-autocomplete="list"
              className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-10 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
            />

            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  setPaginaAtual(1);
                }}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-[#181818]"
                aria-label="Limpar busca"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            )}

            {buscaFocada && sugestoesClientes.length > 0 && (
              <div
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-zinc-100 bg-white p-2 shadow-xl shadow-zinc-950/10"
              >
                {sugestoesClientes.map((cliente) => (
                  <button
                    key={normalizeSearch(cliente.nome)}
                    type="button"
                    role="option"
                    aria-selected={busca === cliente.nome}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setBusca(cliente.nome);
                      setBuscaFocada(false);
                      setPaginaAtual(1);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#F7F7F5]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#181818]">
                        {cliente.nome}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {cliente.total}{' '}
                        {cliente.total === 1 ? 'comprovante' : 'comprovantes'}
                      </span>
                    </span>
                    <UserIcon className="h-4 w-4 flex-none text-zinc-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {filtrosStatus.map((filtro) => {
            const active = statusFiltro === filtro.value;

            return (
              <button
                key={filtro.value}
                type="button"
                onClick={() => {
                  setStatusFiltro(filtro.value);
                  setPaginaAtual(1);
                }}
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
                {comprovantesPaginados.map((item) => (
                  <ComprovanteCard
                    key={item.id}
                    item={item}
                    onView={() =>
                      setPdfSelection({ item, action: 'view' })
                    }
                    onDownload={() =>
                      setPdfSelection({ item, action: 'download' })
                    }
                    onEdit={() => {
                      setMenuAbertoId(null);
                      setComprovanteParaEditar(item);
                    }}
                    menuAberto={menuAbertoId === item.id}
                    onToggleMenu={() =>
                      setMenuAbertoId((current) =>
                        current === item.id ? null : item.id,
                      )
                    }
                    onCloseMenu={() => setMenuAbertoId(null)}
                    onCancel={() => {
                      setMenuAbertoId(null);
                      setComprovanteParaCancelar(item);
                    }}
                    onConclude={() => setComprovanteParaConcluir(item)}
                  />
                ))}
              </div>

              <div className="hidden rounded-[28px] border border-zinc-100 lg:block">
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
                    {comprovantesPaginados.map((item) => {
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
                                onClick={() =>
                                  setPdfSelection({ item, action: 'view' })
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
                                aria-label="Ver comprovante"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setPdfSelection({ item, action: 'download' })
                                }
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
                                aria-label="Baixar comprovante"
                              >
                                <ArrowDownTrayIcon className="h-5 w-5" />
                              </button>

                              {item.status === 'pendente' && (
                                <button
                                  type="button"
                                  onClick={() => setComprovanteParaConcluir(item)}
                                  className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                >
                                  Concluir
                                </button>
                              )}

                              <ComprovanteActionsMenu
                                item={item}
                                open={menuAbertoId === item.id}
                                onToggle={() =>
                                  setMenuAbertoId((current) =>
                                    current === item.id ? null : item.id,
                                  )
                                }
                                onClose={() => setMenuAbertoId(null)}
                                onCancel={() => {
                                  setMenuAbertoId(null);
                                  setComprovanteParaCancelar(item);
                                }}
                                onEdit={() => {
                                  setMenuAbertoId(null);
                                  setComprovanteParaEditar(item);
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Paginacao
                paginaAtual={paginaAtualSegura}
                totalPaginas={totalPaginas}
                primeiroItem={primeiroItemPagina}
                ultimoItem={ultimoItemPagina}
                totalItens={comprovantesFiltrados.length}
                onPrevious={() =>
                  setPaginaAtual((current) => Math.max(1, current - 1))
                }
                onNext={() =>
                  setPaginaAtual((current) =>
                    Math.min(totalPaginas, current + 1),
                  )
                }
              />
            </>
          )}
        </div>
      </section>

      {comprovanteParaEditar && (
        <EditarTransferenciaModal
          item={comprovanteParaEditar}
          loading={editandoId === comprovanteParaEditar.id}
          onClose={() => {
            if (editandoId) return;
            setComprovanteParaEditar(null);
          }}
          onConfirm={handleEditarTransferencia}
        />
      )}

      {comprovanteParaCancelar && (
        <ConfirmCancelModal
          item={comprovanteParaCancelar}
          loading={cancelandoId === comprovanteParaCancelar.id}
          onClose={() => {
            if (cancelandoId) return;
            setComprovanteParaCancelar(null);
          }}
          onConfirm={handleCancelarTransferencia}
        />
      )}

      {comprovanteParaConcluir && (
        <ConfirmConcludeModal
          item={comprovanteParaConcluir}
          loading={concluindoId === comprovanteParaConcluir.id}
          onClose={() => {
            if (concluindoId) return;
            setComprovanteParaConcluir(null);
          }}
          onConfirm={handleConcluirTransferencia}
        />
      )}

      {pdfSelection && (
        <PdfFormatModal
          item={pdfSelection.item}
          action={pdfSelection.action}
          onClose={() => setPdfSelection(null)}
          onSelect={handleSelectPdfFormat}
        />
      )}
    </div>
  );
}

type PaginacaoProps = {
  paginaAtual: number;
  totalPaginas: number;
  primeiroItem: number;
  ultimoItem: number;
  totalItens: number;
  onPrevious: () => void;
  onNext: () => void;
};

function Paginacao({
  paginaAtual,
  totalPaginas,
  primeiroItem,
  ultimoItem,
  totalItens,
  onPrevious,
  onNext,
}: PaginacaoProps) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-500">
        Mostrando {primeiroItem} a {ultimoItem} de {totalItens} comprovantes
      </p>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onPrevious}
          disabled={paginaAtual === 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <span className="min-w-28 text-center text-sm font-medium text-[#181818]">
          Página {paginaAtual} de {totalPaginas}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={paginaAtual === totalPaginas}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Próxima página"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
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
  onEdit: () => void;
  menuAberto: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onCancel: () => void;
  onConclude: () => void;
};

function ComprovanteCard({
  item,
  onView,
  onDownload,
  onEdit,
  menuAberto,
  onToggleMenu,
  onCloseMenu,
  onCancel,
  onConclude,
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

        <div className="flex flex-none items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </span>

          <ComprovanteActionsMenu
            item={item}
            open={menuAberto}
            onToggle={onToggleMenu}
            onClose={onCloseMenu}
            onCancel={onCancel}
            onEdit={onEdit}
          />
        </div>
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

      {item.status === 'pendente' && (
        <button
          type="button"
          onClick={onConclude}
          className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white"
        >
          <CheckCircleIcon className="h-5 w-5" />
          Concluir
        </button>
      )}
    </div>
  );
}

type ComprovanteActionsMenuProps = {
  item: Comprovante;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCancel: () => void;
  onEdit: () => void;
};

function ComprovanteActionsMenu({
  item,
  open,
  onToggle,
  onClose,
  onCancel,
  onEdit,
}: ComprovanteActionsMenuProps) {
  const isCancelada = item.status === 'cancelada';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
        aria-label="Mais ações"
        aria-expanded={open}
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            onClick={onClose}
            className="fixed inset-0 z-20 cursor-default bg-transparent"
            aria-label="Fechar menu de ações"
          />

          <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-zinc-100 bg-white p-1 shadow-lg shadow-zinc-950/10">
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-700 transition hover:bg-[#F7F7F5] hover:text-[#181818]"
          >
            <PencilSquareIcon className="h-4 w-4" />
            Editar transferência
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelada}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent"
          >
            <XCircleIcon className="h-4 w-4" />
            {isCancelada ? 'Já cancelada' : 'Cancelar transferência'}
          </button>
          </div>
        </>
      )}
    </div>
  );
}

type PdfFormatModalProps = {
  item: Comprovante;
  action: PdfAction;
  onClose: () => void;
  onSelect: (formato: PdfFormato) => void;
};

function PdfFormatModal({
  item,
  action,
  onClose,
  onSelect,
}: PdfFormatModalProps) {
  const title =
    action === 'download' ? 'Baixar comprovante' : 'Ver comprovante';
  const primaryLabel = action === 'download' ? 'Baixar A4' : 'Ver A4';
  const pdvLabel = action === 'download' ? 'Baixar PDV' : 'Ver PDV';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl shadow-zinc-950/20 sm:p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5] text-[#181818]">
          <DocumentTextIcon className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-semibold text-[#181818]">{title}</h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Escolha o tamanho do PDF para o comprovante de {item.nome_cliente}.
        </p>

        <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Comprovante
          </p>
          <p className="mt-1 font-semibold text-[#181818]">
            {formatComprovanteCode(item.id)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatCurrency(Number(item.valor_transferencia || 0))}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect('a4')}
            className="flex min-h-28 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-[#181818]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#181818] text-white">
              <DocumentTextIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#181818]">
                {primaryLabel}
              </span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                Folha A4 tradicional.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('pdv')}
            className="flex min-h-28 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-[#181818]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-[#181818]">
              <ReceiptPercentIcon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-[#181818]">
                {pdvLabel}
              </span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                Bobina 80 mm.
              </span>
            </span>
          </button>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmCancelModalProps = {
  item: Comprovante;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

type EditarTransferenciaModalProps = {
  item: Comprovante;
  loading: boolean;
  onClose: () => void;
  onConfirm: (payload: EditarTransferenciaPayload) => void;
};

function EditarTransferenciaModal({
  item,
  loading,
  onClose,
  onConfirm,
}: EditarTransferenciaModalProps) {
  const [nomeCliente, setNomeCliente] = useState(item.nome_cliente);
  const [taxaPercentual, setTaxaPercentual] = useState(
    String(Number(item.taxa_percentual_aplicada || 0)).replace('.', ','),
  );
  const [taxaFixa, setTaxaFixa] = useState(
    String(Number(item.taxa_fixa_aplicada || 0)).replace('.', ','),
  );
  const [errorMessage, setErrorMessage] = useState('');

  const preview = useMemo(() => {
    const percentual = toNumber(taxaPercentual);
    const fixa = toNumber(taxaFixa);
    const valorTransferencia = Number(item.valor_transferencia || 0);
    const lucro = valorTransferencia * (percentual / 100) + fixa;

    return {
      percentual,
      fixa,
      lucro,
      total: valorTransferencia + lucro,
    };
  }, [item.valor_transferencia, taxaFixa, taxaPercentual]);

  function handleConfirm() {
    setErrorMessage('');

    if (!nomeCliente.trim()) {
      setErrorMessage('Informe o nome completo da pessoa.');
      return;
    }

    if (preview.percentual < 0 || preview.fixa < 0) {
      setErrorMessage('Informe uma taxa válida.');
      return;
    }

    onConfirm({
      nomeCliente: nomeCliente.trim(),
      taxaPercentual: preview.percentual,
      taxaFixa: preview.fixa,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-[28px] bg-white p-5 shadow-2xl shadow-zinc-950/20 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-9 items-center gap-2 rounded-full bg-[#F7F7F5] px-3 text-xs font-medium text-zinc-600">
              <PencilSquareIcon className="h-4 w-4" />
              Editar transferência
            </div>

            <h2 className="text-lg font-semibold text-[#181818]">
              Ajustar dados do comprovante
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Altere somente o nome do cliente e a taxa aplicada.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-500 transition hover:text-[#181818] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Fechar modal"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-amber-800">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />
            <p className="text-sm leading-6 text-amber-700">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="editarNomeCliente"
              className="mb-2 block text-sm font-medium text-zinc-700"
            >
              Nome completo
            </label>

            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

              <input
                id="editarNomeCliente"
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="editarTaxaPercentual"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Taxa percentual
              </label>

              <div className="relative">
                <input
                  id="editarTaxaPercentual"
                  type="text"
                  inputMode="decimal"
                  value={taxaPercentual}
                  onChange={(e) => setTaxaPercentual(e.target.value)}
                  placeholder="Ex: 3"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 pr-12 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />

                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                  %
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="editarTaxaFixa"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Taxa fixa
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                  R$
                </span>

                <input
                  id="editarTaxaFixa"
                  type="text"
                  inputMode="decimal"
                  value={taxaFixa}
                  onChange={(e) => setTaxaFixa(e.target.value)}
                  placeholder="Ex: 5,00"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#181818] p-4 text-white">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
              Prévia
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-white/5 p-3">
                <p className="text-xs text-white/40">Transferido</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(Number(item.valor_transferencia || 0))}
                </p>
              </div>

              <div className="rounded-[18px] bg-white/5 p-3">
                <p className="text-xs text-white/40">Lucro</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(preview.lucro)}
                </p>
              </div>

              <div className="rounded-[18px] bg-white/5 p-3">
                <p className="text-xs text-white/40">Total cobrado</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(preview.total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmCancelModal({
  item,
  loading,
  onClose,
  onConfirm,
}: ConfirmCancelModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl shadow-zinc-950/20 sm:p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-rose-50 text-rose-600">
          <XCircleIcon className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-semibold text-[#181818]">
          Cancelar transferência?
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          A transferência de {item.nome_cliente} será marcada como cancelada e
          não entrará mais na soma de lucro ou totais concluídos.
        </p>

        <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Comprovante
          </p>
          <p className="mt-1 font-semibold text-[#181818]">
            {formatComprovanteCode(item.id)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatCurrency(Number(item.valor_transferencia || 0))}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Manter transferência
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmConcludeModalProps = {
  item: Comprovante;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function ConfirmConcludeModal({
  item,
  loading,
  onClose,
  onConfirm,
}: ConfirmConcludeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
      <div className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl shadow-zinc-950/20 sm:p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-emerald-50 text-emerald-600">
          <CheckCircleIcon className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-semibold text-[#181818]">
          Concluir transferência?
        </h2>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          A transferência de {item.nome_cliente} será marcada como concluída e
          passará a entrar na soma de lucro e totais.
        </p>

        <div className="mt-4 rounded-2xl bg-[#FAFAFA] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Comprovante
          </p>
          <p className="mt-1 font-semibold text-[#181818]">
            {formatComprovanteCode(item.id)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {formatCurrency(Number(item.valor_transferencia || 0))}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Manter pendente
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Concluindo...' : 'Confirmar conclusão'}
          </button>
        </div>
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
