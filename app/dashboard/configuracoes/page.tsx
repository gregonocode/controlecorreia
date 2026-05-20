'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  ReceiptPercentIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

type UsuarioSistema = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  telefone: string | null;
};

type TaxaFaixa = {
  id: string;
  usuario_id: string;
  nome: string;
  valor_min: number;
  valor_max: number | null;
  taxa_percentual: number;
  taxa_fixa: number;
  ativo: boolean;
  created_at: string;
};

type FormState = {
  nome: string;
  valorMin: string;
  valorMax: string;
  taxaPercentual: string;
  taxaFixa: string;
};

const initialForm: FormState = {
  nome: '',
  valorMin: '',
  valorMax: '',
  taxaPercentual: '',
  taxaFixa: '',
};

function toNumber(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

function getFaixaLabel(faixa: TaxaFaixa) {
  if (faixa.valor_max === null) {
    return `A partir de ${formatCurrency(Number(faixa.valor_min))}`;
  }

  return `De ${formatCurrency(Number(faixa.valor_min))} até ${formatCurrency(
    Number(faixa.valor_max),
  )}`;
}

function calcularPreview(valor: number, faixa: TaxaFaixa | null) {
  if (!faixa) {
    return {
      taxaPercentualValor: 0,
      lucro: 0,
      totalCobrado: valor,
    };
  }

  const taxaPercentualValor =
    valor * (Number(faixa.taxa_percentual || 0) / 100);
  const lucro = taxaPercentualValor + Number(faixa.taxa_fixa || 0);

  return {
    taxaPercentualValor,
    lucro,
    totalCobrado: valor + lucro,
  };
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );

  const [faixas, setFaixas] = useState<TaxaFaixa[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [valorSimulacao, setValorSimulacao] = useState('500,00');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const valorSimulado = toNumber(valorSimulacao);

  const faixaSimulada = useMemo(() => {
    return (
      faixas.find((faixa) => {
        if (!faixa.ativo) return false;

        const min = Number(faixa.valor_min || 0);
        const max = faixa.valor_max === null ? null : Number(faixa.valor_max);

        return valorSimulado >= min && (max === null || valorSimulado <= max);
      }) || null
    );
  }, [faixas, valorSimulado]);

  const preview = useMemo(() => {
    return calcularPreview(valorSimulado, faixaSimulada);
  }, [valorSimulado, faixaSimulada]);

  const carregarFaixas = useCallback(
    async (usuarioId: string) => {
      const { data, error } = await supabase
        .from('taxa_faixas')
        .select(
          `
          id,
          usuario_id,
          nome,
          valor_min,
          valor_max,
          taxa_percentual,
          taxa_fixa,
          ativo,
          created_at
        `,
        )
        .eq('usuario_id', usuarioId)
        .order('valor_min', { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setFaixas([]);
        return;
      }

      setFaixas((data || []) as TaxaFaixa[]);
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
        'Usuário do sistema não encontrado. Verifique se a tabela usuarios e o trigger de cadastro automático foram criados.',
      );
      setLoading(false);
      return;
    }

    setUsuarioSistema(usuarioData as UsuarioSistema);
    await carregarFaixas(usuarioData.id);

    setLoading(false);
  }, [carregarFaixas, router, supabase]);

  useEffect(() => {
    carregarPagina();
  }, [carregarPagina]);

  function updateField(field: keyof FormState, value: string) {
    setSuccessMessage('');
    setErrorMessage('');

    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function limparFormulario() {
    setForm(initialForm);
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function validarFormulario() {
    const valorMin = toNumber(form.valorMin);
    const valorMax = form.valorMax.trim() ? toNumber(form.valorMax) : null;
    const taxaPercentual = toNumber(form.taxaPercentual);
    const taxaFixa = toNumber(form.taxaFixa);

    if (!usuarioSistema?.id) {
      return 'Usuário do sistema não encontrado.';
    }

    if (!form.nome.trim()) {
      return 'Informe um nome para a faixa. Ex: Até R$ 100.';
    }

    if (valorMin < 0) {
      return 'O valor mínimo não pode ser negativo.';
    }

    if (valorMax !== null && valorMax <= valorMin) {
      return 'O valor máximo precisa ser maior que o valor mínimo.';
    }

    if (taxaPercentual < 0 || taxaFixa < 0) {
      return 'As taxas não podem ser negativas.';
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validarFormulario();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!usuarioSistema?.id) return;

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      usuario_id: usuarioSistema.id,
      nome: form.nome.trim(),
      valor_min: toNumber(form.valorMin),
      valor_max: form.valorMax.trim() ? toNumber(form.valorMax) : null,
      taxa_percentual: toNumber(form.taxaPercentual),
      taxa_fixa: toNumber(form.taxaFixa),
      ativo: true,
    };

    const { error } = editingId
      ? await supabase.from('taxa_faixas').update(payload).eq('id', editingId)
      : await supabase.from('taxa_faixas').insert(payload);

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      editingId
        ? 'Faixa de taxa atualizada com sucesso.'
        : 'Faixa de taxa cadastrada com sucesso.',
    );

    limparFormulario();
    await carregarFaixas(usuarioSistema.id);
  }

  function handleEdit(faixa: TaxaFaixa) {
    setEditingId(faixa.id);
    setSuccessMessage('');
    setErrorMessage('');

    setForm({
      nome: faixa.nome,
      valorMin: String(faixa.valor_min).replace('.', ','),
      valorMax:
        faixa.valor_max === null ? '' : String(faixa.valor_max).replace('.', ','),
      taxaPercentual: String(faixa.taxa_percentual).replace('.', ','),
      taxaFixa: String(faixa.taxa_fixa).replace('.', ','),
    });
  }

  async function handleDelete(faixaId: string) {
    if (!usuarioSistema?.id) return;

    const confirmDelete = window.confirm(
      'Deseja realmente excluir esta faixa de taxa?',
    );

    if (!confirmDelete) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('taxa_faixas')
      .delete()
      .eq('id', faixaId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage('Faixa de taxa excluída com sucesso.');
    await carregarFaixas(usuarioSistema.id);
  }

  async function handleToggleAtivo(faixa: TaxaFaixa) {
    if (!usuarioSistema?.id) return;

    setErrorMessage('');
    setSuccessMessage('');

    const { error } = await supabase
      .from('taxa_faixas')
      .update({
        ativo: !faixa.ativo,
      })
      .eq('id', faixa.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await carregarFaixas(usuarioSistema.id);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full bg-[#F7F7F5] px-3 text-xs font-medium text-zinc-600">
          <Cog6ToothIcon className="h-4 w-4" />
          Configurações
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
          Regras de taxas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Cadastre diferentes taxas por faixa de valor. Ao registrar uma
          transferência, o sistema aplica automaticamente a regra correspondente.
        </p>
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

      <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7"
          >
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#181818]">
                  {editingId ? 'Editar faixa de taxa' : 'Nova faixa de taxa'}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Defina o intervalo de valores e a taxa que será aplicada
                  automaticamente.
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="nome"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Nome da faixa
                </label>

                <input
                  id="nome"
                  type="text"
                  value={form.nome}
                  onChange={(e) => updateField('nome', e.target.value)}
                  placeholder="Ex: De R$ 100 até R$ 500"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>

              <MoneyInput
                id="valorMin"
                label="Valor mínimo"
                value={form.valorMin}
                onChange={(value) => updateField('valorMin', value)}
                placeholder="Ex: 0,00"
              />

              <MoneyInput
                id="valorMax"
                label="Valor máximo"
                value={form.valorMax}
                onChange={(value) => updateField('valorMax', value)}
                placeholder="Deixe vazio para sem limite"
              />

              <PercentInput
                id="taxaPercentual"
                label="Taxa percentual"
                value={form.taxaPercentual}
                onChange={(value) => updateField('taxaPercentual', value)}
                placeholder="Ex: 3"
              />

              <MoneyInput
                id="taxaFixa"
                label="Taxa fixa"
                value={form.taxaFixa}
                onChange={(value) => updateField('taxaFixa', value)}
                placeholder="Ex: 5,00"
              />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={saving || loading || !usuarioSistema?.id}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {saving ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : editingId ? (
                  <PencilSquareIcon className="h-5 w-5" />
                ) : (
                  <PlusIcon className="h-5 w-5" />
                )}

                <span>
                  {saving
                    ? 'Salvando...'
                    : editingId
                      ? 'Salvar alterações'
                      : 'Adicionar faixa'}
                </span>
              </button>

              <button
                type="button"
                onClick={limparFormulario}
                className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] sm:w-auto sm:min-w-[150px]"
              >
                Limpar
              </button>
            </div>
          </form>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#181818]">
                  Faixas cadastradas
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  O banco usa essas regras para calcular a taxa da transferência.
                </p>
              </div>

              <button
                type="button"
                onClick={() => usuarioSistema?.id && carregarFaixas(usuarioSistema.id)}
                disabled={loading || !usuarioSistema?.id}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center rounded-[28px] bg-[#FAFAFA]">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Carregando regras...
                </div>
              </div>
            ) : faixas.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-zinc-200 bg-[#FAFAFA] p-8 text-center">
                <ReceiptPercentIcon className="mx-auto h-10 w-10 text-zinc-300" />

                <h3 className="mt-4 text-sm font-semibold text-[#181818]">
                  Nenhuma faixa cadastrada
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Cadastre a primeira regra para que o sistema calcule as taxas
                  automaticamente nas transferências.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {faixas.map((faixa) => (
                  <article
                    key={faixa.id}
                    className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[#181818]">
                            {faixa.nome}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              faixa.ativo
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}
                          >
                            {faixa.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-zinc-500">
                          {getFaixaLabel(faixa)}
                        </p>

                        <p className="mt-2 text-sm font-medium text-[#181818]">
                          {formatPercent(Number(faixa.taxa_percentual))} +{' '}
                          {formatCurrency(Number(faixa.taxa_fixa))}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAtivo(faixa)}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
                        >
                          {faixa.ativo ? 'Desativar' : 'Ativar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(faixa)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(faixa.id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-rose-100 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="rounded-[32px] border border-zinc-200 bg-[#181818] p-5 text-white shadow-sm sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
              <ReceiptPercentIcon className="h-6 w-6" />
            </div>

            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              Simulador de taxa
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Digite um valor para ver qual faixa será aplicada.
            </p>

            <div className="mt-6">
              <label
                htmlFor="valorSimulacao"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Valor da transferência
              </label>

              <div className="flex h-14 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 transition focus-within:border-white/30">
                <span className="shrink-0 text-sm font-semibold text-white/40">
                  R$
                </span>

                <input
                  id="valorSimulacao"
                  type="text"
                  inputMode="decimal"
                  value={valorSimulacao}
                  onChange={(e) => setValorSimulacao(e.target.value)}
                  placeholder="Ex: 500,00"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/45">Faixa aplicada</p>
                <p className="mt-1 text-base font-semibold">
                  {faixaSimulada ? faixaSimulada.nome : 'Nenhuma regra ativa'}
                </p>
                <p className="mt-1 text-xs leading-5 text-white/40">
                  {faixaSimulada
                    ? getFaixaLabel(faixaSimulada)
                    : 'Cadastre ou ative uma faixa compatível com esse valor.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Taxa percentual</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {faixaSimulada
                      ? formatCurrency(preview.taxaPercentualValor)
                      : formatCurrency(0)}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/45">Taxa fixa</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {faixaSimulada
                      ? formatCurrency(Number(faixaSimulada.taxa_fixa))
                      : formatCurrency(0)}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] bg-white p-5 text-[#181818]">
                <p className="text-sm text-zinc-500">Lucro estimado</p>

                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {formatCurrency(preview.lucro)}
                </p>

                <div className="mt-5 border-t border-zinc-100 pt-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-zinc-500">
                      Total cobrado
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
                  Como funciona
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Na hora de salvar a transferência, o banco procura a faixa
                  ativa correspondente ao valor transferido e aplica a taxa
                  automaticamente.
                </p>

                <div className="mt-4 rounded-[24px] bg-[#F7F7F5] p-4 text-xs leading-5 text-zinc-500">
                  Exemplo: se uma transferência for de R$ 500,00 e existir uma
                  regra de R$ 100,00 até R$ 500,00, essa regra será aplicada.
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

type MoneyInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function MoneyInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: MoneyInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>

      <div className="flex h-14 items-center gap-2 rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 transition focus-within:border-[#181818] focus-within:bg-white">
        <span className="pointer-events-none shrink-0 text-sm font-semibold text-zinc-400">
          R$
        </span>

        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#181818] outline-none placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}

type PercentInputProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function PercentInput({
  id,
  label,
  value,
  placeholder,
  onChange,
}: PercentInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>

      <div className="flex h-14 items-center rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 transition focus-within:border-[#181818] focus-within:bg-white">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[#181818] outline-none placeholder:text-zinc-400"
        />

        <span className="pointer-events-none shrink-0 pl-3 text-sm font-semibold text-zinc-400">
          %
        </span>
      </div>
    </div>
  );
}