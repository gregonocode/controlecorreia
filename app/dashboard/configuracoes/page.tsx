'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

type ConfigState = {
  taxaPercentual: string;
  taxaFixa: string;
  valorExemplo: string;
};

const initialState: ConfigState = {
  taxaPercentual: '3',
  taxaFixa: '5,00',
  valorExemplo: '500,00',
};

function toNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function formatDecimalValue(value: string) {
  if (!value.trim()) {
    return '';
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<ConfigState>(initialState);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => {
    const valorExemplo = toNumber(config.valorExemplo);
    const taxaPercentual = toNumber(config.taxaPercentual);
    const taxaFixa = toNumber(config.taxaFixa);

    const valorTaxaPercentual = valorExemplo * (taxaPercentual / 100);
    const lucroTotal = valorTaxaPercentual + taxaFixa;
    const totalCobrado = valorExemplo + lucroTotal;

    return {
      valorExemplo,
      taxaPercentual,
      taxaFixa,
      valorTaxaPercentual,
      lucroTotal,
      totalCobrado,
    };
  }, [config.valorExemplo, config.taxaPercentual, config.taxaFixa]);

  function updateField(field: keyof ConfigState, value: string) {
    setSaved(false);

    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function formatMoneyField(field: 'taxaFixa' | 'valorExemplo') {
    updateField(field, formatDecimalValue(config[field]));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    console.log('Configurações salvas:', {
      ...config,
      preview,
    });

    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 mb-3">
        <div className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#F7F7F5] px-3 text-xs font-medium text-zinc-600">
          <Cog6ToothIcon className="h-4 w-4" />
          Configurações
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
          Configurações do sistema
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Defina as taxas usadas no cálculo das transferências e simule o valor
          cobrado do cliente.
        </p>
      </section>

      {saved && (
        <div className="flex items-start gap-3 rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-none" />

          <div>
            <p className="text-sm font-semibold">
              Configurações salvas com sucesso.
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              Por enquanto esse salvamento é apenas visual. Depois conectamos
              com Supabase.
            </p>
          </div>
        </div>
      )}

      <section className="mb-3 grid gap-5 xl:grid-cols-[1.12fr_0.88fr] ">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7"
        >
          <div className="mb-7">
            <h2 className="text-lg font-semibold text-[#181818]">
              Taxas da transferência
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Defina a taxa percentual e a taxa fixa padrão para novos
              cadastros.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="taxaPercentual"
                className="block text-sm font-medium text-zinc-700"
              >
                Taxa percentual
              </label>

              <div className="flex h-14 items-center rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 transition focus-within:border-[#181818] focus-within:bg-white">
                <input
                  id="taxaPercentual"
                  type="text"
                  inputMode="decimal"
                  value={config.taxaPercentual}
                  onChange={(e) =>
                    updateField('taxaPercentual', e.target.value)
                  }
                  placeholder="Ex: 3"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#181818] outline-none placeholder:text-zinc-400"
                />

                <span className="pointer-events-none shrink-0 pl-3 text-sm font-semibold text-zinc-400">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="taxaFixa"
                className="block text-sm font-medium text-zinc-700"
              >
                Taxa fixa
              </label>

              <div className="flex h-14 items-center gap-2 rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 transition focus-within:border-[#181818] focus-within:bg-white">
                <span className="pointer-events-none shrink-0 text-sm font-semibold text-zinc-400">
                  R$
                </span>

                <input
                  id="taxaFixa"
                  type="text"
                  inputMode="decimal"
                  value={config.taxaFixa}
                  onChange={(e) => updateField('taxaFixa', e.target.value)}
                  onBlur={() => formatMoneyField('taxaFixa')}
                  placeholder="Ex: 5,00"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#181818] outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label
                htmlFor="valorExemplo"
                className="block text-sm font-medium text-zinc-700"
              >
                Valor de exemplo para simulação
              </label>

              <div className="flex h-14 max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 transition focus-within:border-[#181818] focus-within:bg-white md:max-w-md">
                <span className="pointer-events-none shrink-0 text-sm font-semibold text-zinc-400">
                  R$
                </span>

                <input
                  id="valorExemplo"
                  type="text"
                  inputMode="decimal"
                  value={config.valorExemplo}
                  onChange={(e) => updateField('valorExemplo', e.target.value)}
                  onBlur={() => formatMoneyField('valorExemplo')}
                  placeholder="Ex: 500,00"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#181818] outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center mt-5">
            <button
              type="submit"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 sm:flex-1"
            >
              <CheckCircleIcon className="h-5 w-5 flex-none" />
              <span>Salvar configurações</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfig(initialState);
                setSaved(false);
              }}
              className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] sm:w-auto sm:min-w-[170px]"
            >
              Restaurar padrão
            </button>
          </div>
        </form>

        <aside className="mb-3 flex flex-col gap-3">
          <div className="rounded-[32px] border border-zinc-200 bg-[#181818] p-5 text-white shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
              <ReceiptPercentIcon className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              Prévia do cálculo
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Simule como a taxa será aplicada em uma transferência antes de
              salvar.
            </p>

            <div className="mt-6 space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/45">Valor enviado no Pix</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(preview.valorExemplo)}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Taxa percentual</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatCurrency(preview.valorTaxaPercentual)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Taxa fixa</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatCurrency(preview.taxaFixa)}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 text-[#181818]">
                <p className="text-sm text-zinc-500">Lucro por transferência</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatCurrency(preview.lucroTotal)}
                </p>

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-zinc-500">
                      Total cobrado do cliente
                    </span>
                    <strong className="text-sm">
                      {formatCurrency(preview.totalCobrado)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#F7F7F5]">
                <InformationCircleIcon className="h-6 w-6 text-[#181818]" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-[#181818]">
                  Regra usada
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  O lucro é calculado somando a taxa percentual sobre o valor do
                  Pix com a taxa fixa configurada.
                </p>

                <div className="mt-4 rounded-[24px] bg-[#F7F7F5] p-4 text-xs leading-5 text-zinc-500">
                  Lucro = valor enviado × taxa percentual + taxa fixa.
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#181818]">
              Resumo atual
            </h2>

            <div className="mt-4">
              <div className="flex flex-col gap-1 rounded-[24px] bg-[#F7F7F5] p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-zinc-500">Taxa padrão</span>
                <strong className="text-sm text-[#181818]">
                  {config.taxaPercentual || '0'}% +{' '}
                  {formatCurrency(toNumber(config.taxaFixa))}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
