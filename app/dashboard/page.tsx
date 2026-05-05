//app\dashboard\page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import RegistrarTransferenciaModal from '../components/transferencias/RegistrarTransferenciaModal';

type PeriodoFiltro = 'hoje' | 'ontem' | 'semana' | 'mes';

type Transferencia = {
  id: string;
  cliente: string;
  telefone: string;
  recebedor: string;
  valorEnviado: number;
  taxaPercentual: number;
  taxaFixa: number;
  data: string;
  status: 'concluida' | 'pendente';
};

const transferenciasMock: Transferencia[] = [
  {
    id: 'TRF-001',
    cliente: 'Marcos Silva',
    telefone: '(93) 99111-2233',
    recebedor: 'Ana Beatriz',
    valorEnviado: 500,
    taxaPercentual: 3,
    taxaFixa: 5,
    data: 'Hoje, 09:42',
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
    data: 'Hoje, 11:10',
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
    data: 'Hoje, 13:25',
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
    data: 'Ontem, 16:04',
    status: 'concluida',
  },
];

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
  }).format(value);
}

function calcularLucro(item: Transferencia) {
  const taxaPercentualValor = item.valorEnviado * (item.taxaPercentual / 100);
  return taxaPercentualValor + item.taxaFixa;
}

export default function DashboardPage() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);

  const resumo = useMemo(() => {
    const transferenciasConcluidas = transferenciasMock.filter(
      (item) => item.status === 'concluida',
    );

    const totalEnviado = transferenciasConcluidas.reduce(
      (acc, item) => acc + item.valorEnviado,
      0,
    );

    const lucroTotal = transferenciasConcluidas.reduce(
      (acc, item) => acc + calcularLucro(item),
      0,
    );

    const ticketMedio =
      transferenciasConcluidas.length > 0
        ? totalEnviado / transferenciasConcluidas.length
        : 0;

    return {
      totalEnviado,
      lucroTotal,
      ticketMedio,
      quantidade: transferenciasConcluidas.length,
    };
  }, []);

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
          onClick={() => {
            console.log('Clicou em registrar transferência');
            setModalTransferenciaOpen(true);
          }}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <PlusIcon className="h-5 w-5" />
          Registrar transferência
        </button>
      </section>

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
        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <ArrowTrendingUpIcon className="h-6 w-6 text-[#181818]" />
          </div>

          <p className="text-sm text-zinc-500">Lucro no período</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
            {formatCurrency(resumo.lucroTotal)}
          </h2>

          <p className="mt-3 text-xs text-zinc-400">
            Baseado em taxa percentual + taxa fixa.
          </p>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <BanknotesIcon className="h-6 w-6 text-[#181818]" />
          </div>

          <p className="text-sm text-zinc-500">Total enviado</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
            {formatCurrency(resumo.totalEnviado)}
          </h2>

          <p className="mt-3 text-xs text-zinc-400">
            Soma das transferências concluídas.
          </p>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <DocumentTextIcon className="h-6 w-6 text-[#181818]" />
          </div>

          <p className="text-sm text-zinc-500">Comprovantes</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
            {resumo.quantidade}
          </h2>

          <p className="mt-3 text-xs text-zinc-400">
            Registros concluídos neste período.
          </p>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[22px] bg-[#F7F7F5]">
            <ReceiptPercentIcon className="h-6 w-6 text-[#181818]" />
          </div>

          <p className="text-sm text-zinc-500">Ticket médio</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#181818]">
            {formatCurrency(resumo.ticketMedio)}
          </h2>

          <p className="mt-3 text-xs text-zinc-400">
            Média por transferência concluída.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#181818]">
                Transferências recentes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Últimos cadastros feitos no sistema.
              </p>
            </div>

            <Link
              href="/dashboard/comprovantes"
              className="hidden rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 sm:inline-flex"
            >
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {transferenciasMock.map((item) => {
              const lucro = calcularLucro(item);

              return (
                <div
                  key={item.id}
                  className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
                        <UserIcon className="h-5 w-5 text-zinc-600" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-[#181818]">
                            {item.cliente}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.status === 'concluida'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.status === 'concluida'
                              ? 'Concluída'
                              : 'Pendente'}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-zinc-500">
                          Para: {item.recebedor}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                          <span>{item.telefone}</span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {item.data}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left sm:text-right">
                      <div>
                        <p className="text-xs text-zinc-400">Enviado</p>
                        <p className="mt-1 text-sm font-semibold text-[#181818]">
                          {formatCurrency(item.valorEnviado)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-400">Lucro</p>
                        <p className="mt-1 text-sm font-semibold text-[#181818]">
                          {formatCurrency(lucro)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[32px] border border-zinc-200 bg-[#181818] p-5 text-white shadow-sm sm:p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
            <ReceiptPercentIcon className="h-6 w-6" />
          </div>

          <h2 className="mt-6 text-xl font-semibold tracking-tight">
            Taxa configurada
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Essa configuração será usada para calcular automaticamente o lucro
            em cada transferência.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45">Taxa percentual</p>
              <p className="mt-1 text-2xl font-semibold">3%</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45">Taxa fixa</p>
              <p className="mt-1 text-2xl font-semibold">R$ 5,00</p>
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
        onClose={() => setModalTransferenciaOpen(false)}
      />

      {modalTransferenciaOpen && (
        <div className="fixed left-4 top-4 z-[10000] rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Modal aberto
        </div>
      )}
    </div>
  );
}
