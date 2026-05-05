'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  PhoneIcon,
  ReceiptPercentIcon,
  UserIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

type FormState = {
  cliente: string;
  telefone: string;
  recebedor: string;
  valorEnviado: string;
  taxaPercentual: string;
  taxaFixa: string;
  observacao: string;
};

const initialState: FormState = {
  cliente: '',
  telefone: '',
  recebedor: '',
  valorEnviado: '',
  taxaPercentual: '3',
  taxaFixa: '5',
  observacao: '',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function toNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

export default function NovaTransferenciaPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [saved, setSaved] = useState(false);

  const calculo = useMemo(() => {
    const valorEnviado = toNumber(form.valorEnviado);
    const taxaPercentual = toNumber(form.taxaPercentual);
    const taxaFixa = toNumber(form.taxaFixa);

    const valorTaxaPercentual = valorEnviado * (taxaPercentual / 100);
    const lucro = valorTaxaPercentual + taxaFixa;
    const valorTotalCliente = valorEnviado + lucro;

    return {
      valorEnviado,
      taxaPercentual,
      taxaFixa,
      valorTaxaPercentual,
      lucro,
      valorTotalCliente,
    };
  }, [form.valorEnviado, form.taxaPercentual, form.taxaFixa]);

  function updateField(field: keyof FormState, value: string) {
    setSaved(false);

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Salvamento fake por enquanto.
    console.log({
      ...form,
      calculo,
    });

    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-4 inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar
          </Link>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
            <UserPlusIcon className="h-4 w-4" />
            Nova transferência
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
            Cadastrar transferência
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Preencha os dados do cliente, valor enviado, recebedor e acompanhe o
            lucro calculado automaticamente.
          </p>
        </div>

        <div className="rounded-[28px] bg-[#181818] p-4 text-white lg:min-w-64">
          <p className="text-xs text-white/50">Lucro estimado</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {formatCurrency(calculo.lucro)}
          </p>
          <p className="mt-2 text-xs leading-5 text-white/45">
            Taxa percentual + taxa fixa configurada nesta transferência.
          </p>
        </div>
      </section>

      {saved && (
        <div className="flex items-start gap-3 rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 flex-none" />
          <div>
            <p className="text-sm font-semibold">
              Transferência cadastrada com sucesso.
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-700">
              Por enquanto o cadastro é apenas visual. Na próxima etapa podemos
              salvar no Supabase.
            </p>
          </div>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#181818]">
              Dados da transferência
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Essas informações vão aparecer depois na aba de comprovantes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cliente"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Nome do cliente
              </label>

              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="cliente"
                  type="text"
                  value={form.cliente}
                  onChange={(e) => updateField('cliente', e.target.value)}
                  placeholder="Ex: Marcos Silva"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="telefone"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Telefone
              </label>

              <div className="relative">
                <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="telefone"
                  type="tel"
                  value={form.telefone}
                  onChange={(e) => updateField('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="recebedor"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Nome de quem vai receber
              </label>

              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="recebedor"
                  type="text"
                  value={form.recebedor}
                  onChange={(e) => updateField('recebedor', e.target.value)}
                  placeholder="Ex: Ana Beatriz"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="valorEnviado"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Valor enviado no Pix
              </label>

              <div className="relative">
                <BanknotesIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="valorEnviado"
                  type="text"
                  inputMode="decimal"
                  value={form.valorEnviado}
                  onChange={(e) => updateField('valorEnviado', e.target.value)}
                  placeholder="Ex: 500,00"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="taxaPercentual"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Taxa percentual
              </label>

              <div className="relative">
                <ReceiptPercentIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="taxaPercentual"
                  type="text"
                  inputMode="decimal"
                  value={form.taxaPercentual}
                  onChange={(e) =>
                    updateField('taxaPercentual', e.target.value)
                  }
                  placeholder="Ex: 3"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-12 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />

                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">
                  %
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="taxaFixa"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Taxa fixa
              </label>

              <div className="relative">
                <ReceiptPercentIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="taxaFixa"
                  type="text"
                  inputMode="decimal"
                  value={form.taxaFixa}
                  onChange={(e) => updateField('taxaFixa', e.target.value)}
                  placeholder="Ex: 5,00"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-12 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />

                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-zinc-400">
                  R$
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="observacao"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Observação
              </label>

              <div className="relative">
                <DocumentTextIcon className="pointer-events-none absolute left-4 top-5 h-5 w-5 text-zinc-400" />

                <textarea
                  id="observacao"
                  value={form.observacao}
                  onChange={(e) => updateField('observacao', e.target.value)}
                  placeholder="Ex: Cliente enviou o comprovante pelo WhatsApp."
                  rows={4}
                  className="w-full resize-none rounded-[28px] border border-zinc-200 bg-[#FAFAFA] py-4 pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <CheckCircleIcon className="h-5 w-5" />
              Salvar transferência
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(initialState);
                setSaved(false);
              }}
              className="inline-flex h-14 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
            >
              Limpar campos
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#181818]">
              Resumo da cobrança
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Veja quanto será cobrado do cliente e quanto fica de lucro.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-[24px] bg-[#F7F7F5] p-4">
                <span className="text-sm text-zinc-500">Valor do Pix</span>
                <strong className="text-sm text-[#181818]">
                  {formatCurrency(calculo.valorEnviado)}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-[24px] bg-[#F7F7F5] p-4">
                <span className="text-sm text-zinc-500">
                  Taxa percentual
                </span>
                <strong className="text-sm text-[#181818]">
                  {formatCurrency(calculo.valorTaxaPercentual)}
                </strong>
              </div>

              <div className="flex items-center justify-between rounded-[24px] bg-[#F7F7F5] p-4">
                <span className="text-sm text-zinc-500">Taxa fixa</span>
                <strong className="text-sm text-[#181818]">
                  {formatCurrency(calculo.taxaFixa)}
                </strong>
              </div>

              <div className="rounded-[28px] bg-[#181818] p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/55">Lucro total</span>
                  <strong className="text-xl">
                    {formatCurrency(calculo.lucro)}
                  </strong>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-white/55">
                      Total cobrado do cliente
                    </span>
                    <strong className="text-lg">
                      {formatCurrency(calculo.valorTotalCliente)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-[#181818]">
              Como o cálculo funciona?
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-500">
              <p>
                O sistema soma a taxa percentual sobre o valor enviado com uma
                taxa fixa definida pelo usuário.
              </p>

              <div className="rounded-[24px] bg-[#F7F7F5] p-4 text-xs leading-5 text-zinc-500">
                Exemplo: se o Pix for de R$ 500,00, taxa de 3% e taxa fixa de
                R$ 5,00, o lucro será R$ 20,00.
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}