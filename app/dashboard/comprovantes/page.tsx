'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

type StatusComprovante = 'concluida' | 'pendente' | 'cancelada';

type Comprovante = {
  id: string;
  cliente: string;
  telefone: string;
  recebedor: string;
  valorEnviado: number;
  taxaPercentual: number;
  taxaFixa: number;
  data: string;
  hora: string;
  status: StatusComprovante;
};

const comprovantesMock: Comprovante[] = [
  {
    id: 'TRF-001',
    cliente: 'Marcos Silva',
    telefone: '(93) 99111-2233',
    recebedor: 'Ana Beatriz',
    valorEnviado: 500,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: '04/05/2026',
    hora: '09:42',
    status: 'concluida',
  },
  {
    id: 'TRF-002',
    cliente: 'João Correia',
    telefone: '(93) 98888-1020',
    recebedor: 'Carlos Henrique',
    valorEnviado: 1200,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: '04/05/2026',
    hora: '11:10',
    status: 'concluida',
  },
  {
    id: 'TRF-003',
    cliente: 'Maria Eduarda',
    telefone: '(93) 98444-7712',
    recebedor: 'Fernanda Lima',
    valorEnviado: 250,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: '04/05/2026',
    hora: '13:25',
    status: 'pendente',
  },
  {
    id: 'TRF-004',
    cliente: 'Raimundo Alves',
    telefone: '(93) 98123-4567',
    recebedor: 'Paulo Roberto',
    valorEnviado: 780,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: '03/05/2026',
    hora: '16:04',
    status: 'concluida',
  },
  {
    id: 'TRF-005',
    cliente: 'Juliana Souza',
    telefone: '(93) 98777-6543',
    recebedor: 'Renato Lima',
    valorEnviado: 350,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: '02/05/2026',
    hora: '10:18',
    status: 'cancelada',
  },
];

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

function calcularLucro(item: Comprovante) {
  return item.valorEnviado * (item.taxaPercentual / 100) + item.taxaFixa;
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
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | StatusComprovante>(
    'todos',
  );

  const comprovantesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return comprovantesMock.filter((item) => {
      const matchStatus =
        statusFiltro === 'todos' || item.status === statusFiltro;

      const matchBusca =
        !termo ||
        item.id.toLowerCase().includes(termo) ||
        item.cliente.toLowerCase().includes(termo) ||
        item.telefone.toLowerCase().includes(termo) ||
        item.recebedor.toLowerCase().includes(termo);

      return matchStatus && matchBusca;
    });
  }, [busca, statusFiltro]);

  const resumo = useMemo(() => {
    const concluidos = comprovantesFiltrados.filter(
      (item) => item.status === 'concluida',
    );

    const totalEnviado = concluidos.reduce(
      (acc, item) => acc + item.valorEnviado,
      0,
    );

    const lucro = concluidos.reduce((acc, item) => acc + calcularLucro(item), 0);

    return {
      total: comprovantesFiltrados.length,
      concluidos: concluidos.length,
      totalEnviado,
      lucro,
    };
  }, [comprovantesFiltrados]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <DocumentTextIcon className="h-4 w-4" />
            Comprovantes
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Comprovantes cadastrados
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Consulte transferências registradas, acompanhe status, lucro e dados
            dos clientes.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <DocumentMagnifyingGlassIcon className="h-6 w-6 text-[#181818]" />
          </div>
          <p className="text-sm text-zinc-500">Registros encontrados</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#181818]">
            {resumo.total}
          </h2>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <CheckCircleIcon className="h-6 w-6 text-[#181818]" />
          </div>
          <p className="text-sm text-zinc-500">Concluídos</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#181818]">
            {resumo.concluidos}
          </h2>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <BanknotesIcon className="h-6 w-6 text-[#181818]" />
          </div>
          <p className="text-sm text-zinc-500">Total enviado</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#181818]">
            {formatCurrency(resumo.totalEnviado)}
          </h2>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <ReceiptPercentIcon className="h-6 w-6 text-[#181818]" />
          </div>
          <p className="text-sm text-zinc-500">Lucro filtrado</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#181818]">
            {formatCurrency(resumo.lucro)}
          </h2>
        </div>
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:w-80">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, telefone ou código"
                className="h-12 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
              />
            </div>
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
        </div>

        {/* Mobile cards */}
        <div className="mt-5 space-y-3 lg:hidden">
          {comprovantesFiltrados.map((item) => {
            const status = getStatusConfig(item.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={item.id}
                className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
                      <UserIcon className="h-5 w-5 text-zinc-600" />
                    </div>

                    <div>
                      <h3 className="font-medium text-[#181818]">
                        {item.cliente}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Para: {item.recebedor}
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
                  <div>
                    <p className="text-xs text-zinc-400">Código</p>
                    <p className="mt-1 text-sm font-semibold text-[#181818]">
                      {item.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Data</p>
                    <p className="mt-1 text-sm font-semibold text-[#181818]">
                      {item.data} às {item.hora}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Enviado</p>
                    <p className="mt-1 text-sm font-semibold text-[#181818]">
                      {formatCurrency(item.valorEnviado)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">Lucro</p>
                    <p className="mt-1 text-sm font-semibold text-[#181818]">
                      {formatCurrency(calcularLucro(item))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#181818] px-4 text-sm font-semibold text-white"
                  >
                    <EyeIcon className="h-5 w-5" />
                    Ver
                  </button>

                  <button
                    type="button"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    Baixar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="mt-5 hidden overflow-hidden rounded-[28px] border border-zinc-100 lg:block">
          <table className="w-full border-collapse">
            <thead className="bg-[#FAFAFA]">
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Recebedor</th>
                <th className="px-5 py-4">Data</th>
                <th className="px-5 py-4">Valor</th>
                <th className="px-5 py-4">Lucro</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 bg-white">
              {comprovantesFiltrados.map((item) => {
                const status = getStatusConfig(item.status);
                const StatusIcon = status.icon;

                return (
                  <tr key={item.id} className="text-sm">
                    <td className="px-5 py-4 font-medium text-[#181818]">
                      {item.id}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-[#181818]">
                          {item.cliente}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {item.telefone}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-zinc-600">
                      {item.recebedor}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>
                          {item.data} às {item.hora}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 font-medium text-[#181818]">
                      {formatCurrency(item.valorEnviado)}
                    </td>

                    <td className="px-5 py-4 font-medium text-[#181818]">
                      {formatCurrency(calcularLucro(item))}
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
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-600 transition hover:text-[#181818]"
                          aria-label="Ver comprovante"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
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

          {comprovantesFiltrados.length === 0 && (
            <div className="bg-white px-5 py-12 text-center">
              <DocumentMagnifyingGlassIcon className="mx-auto h-10 w-10 text-zinc-300" />
              <p className="mt-3 text-sm font-medium text-[#181818]">
                Nenhum comprovante encontrado
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Tente mudar o termo de busca ou o filtro selecionado.
              </p>
            </div>
          )}
        </div>

        {comprovantesFiltrados.length === 0 && (
          <div className="mt-5 rounded-[28px] border border-zinc-100 bg-[#FAFAFA] px-5 py-12 text-center lg:hidden">
            <DocumentMagnifyingGlassIcon className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-sm font-medium text-[#181818]">
              Nenhum comprovante encontrado
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Tente mudar o termo de busca ou o filtro selecionado.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}