'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ReceiptPercentIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

type Props = {
  open: boolean;
  usuarioId: string;
  onClose: () => void;
  onCreated?: () => void;
};

type Step = 'formulario' | 'sucesso';

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

export default function RegistrarTransferenciaModal({
  open,
  usuarioId,
  onClose,
  onCreated,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>('formulario');

  const [nomeCliente, setNomeCliente] = useState('');
  const [valorTransferencia, setValorTransferencia] = useState('');
  const [clienteSugestoes, setClienteSugestoes] = useState<string[]>([]);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);

  const [taxaManualAtiva, setTaxaManualAtiva] = useState(false);
  const [taxaManualPercentual, setTaxaManualPercentual] = useState('');
  const [taxaManualFixa, setTaxaManualFixa] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const preview = useMemo(() => {
    const valor = toNumber(valorTransferencia);
    const percentual = taxaManualAtiva ? toNumber(taxaManualPercentual) : 0;
    const fixa = taxaManualAtiva ? toNumber(taxaManualFixa) : 0;

    const valorPercentual = valor * (percentual / 100);
    const lucroManual = valorPercentual + fixa;
    const totalManual = valor + lucroManual;

    return {
      valor,
      percentual,
      fixa,
      valorPercentual,
      lucroManual,
      totalManual,
    };
  }, [
    valorTransferencia,
    taxaManualAtiva,
    taxaManualPercentual,
    taxaManualFixa,
  ]);

  useEffect(() => {
    const termo = nomeCliente.trim();

    if (!open || step !== 'formulario' || !usuarioId || termo.length < 2) {
      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setAutocompleteLoading(true);

      const { data, error } = await supabase
        .from('transferencias')
        .select('nome_cliente')
        .eq('usuario_id', usuarioId)
        .ilike('nome_cliente', `%${termo}%`)
        .order('created_at', { ascending: false })
        .limit(12);

      if (cancelled) return;

      if (error) {
        setClienteSugestoes([]);
        setAutocompleteLoading(false);
        return;
      }

      const nomes = (data || []).reduce<string[]>((acc, item) => {
        const nome = String(item.nome_cliente || '').trim();
        const alreadyExists = acc.some(
          (savedName) => savedName.toLowerCase() === nome.toLowerCase(),
        );

        if (nome && !alreadyExists) {
          acc.push(nome);
        }

        return acc;
      }, []);

      setClienteSugestoes(nomes.slice(0, 5));
      setAutocompleteLoading(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [nomeCliente, open, step, supabase, usuarioId]);

  const showAutocomplete =
    autocompleteOpen &&
    nomeCliente.trim().length >= 2 &&
    (autocompleteLoading || clienteSugestoes.length > 0);

  if (!open) return null;

  function resetModal() {
    setStep('formulario');
    setNomeCliente('');
    setValorTransferencia('');
    setClienteSugestoes([]);
    setAutocompleteOpen(false);
    setAutocompleteLoading(false);
    setTaxaManualAtiva(false);
    setTaxaManualPercentual('');
    setTaxaManualFixa('');
    setLoading(false);
    setErrorMessage('');
  }

  function handleClose() {
    resetModal();
    onClose();
  }

  async function handleSalvarTransferencia() {
    setErrorMessage('');

    if (!usuarioId) {
      setErrorMessage('Usuário do sistema não encontrado.');
      return;
    }

    if (!nomeCliente.trim()) {
      setErrorMessage('Informe o nome completo da pessoa.');
      return;
    }

    if (preview.valor <= 0) {
      setErrorMessage('Informe um valor válido para a transferência.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('transferencias').insert({
      usuario_id: usuarioId,
      nome_cliente: nomeCliente.trim(),
      valor_transferencia: preview.valor,

      taxa_manual_ativa: taxaManualAtiva,
      taxa_manual_percentual: taxaManualAtiva
        ? toNumber(taxaManualPercentual)
        : null,
      taxa_manual_fixa: taxaManualAtiva ? toNumber(taxaManualFixa) : null,

      status: 'concluida',
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStep('sucesso');
    onCreated?.();
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 px-3 pb-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-9 items-center gap-2 rounded-full bg-[#F7F7F5] px-3 text-xs font-medium text-zinc-600">
              <BanknotesIcon className="h-4 w-4" />
              Registrar transferência
            </div>

            <h2 className="text-xl font-semibold text-[#181818]">
              {step === 'formulario' && 'Nova transferência'}
              {step === 'sucesso' && 'Transferência registrada'}
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {step === 'formulario' &&
                'Informe o nome da pessoa e o valor transferido. A taxa será calculada automaticamente, exceto se você ativar a taxa manual.'}
              {step === 'sucesso' &&
                'O comprovante foi registrado com sucesso no sistema.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-500 transition hover:text-[#181818]"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="h-5 w-5" />
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

        {step === 'formulario' && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="nomeCliente"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Nome completo
                </label>

                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                  <input
                    id="nomeCliente"
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => {
                      setNomeCliente(e.target.value);
                      setAutocompleteOpen(true);
                    }}
                    onFocus={() => setAutocompleteOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setAutocompleteOpen(false), 120);
                    }}
                    placeholder="Ex: Tiago de Oliveira Ribeiro"
                    autoComplete="off"
                    className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                  />

                  {showAutocomplete && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-200/70">
                      {autocompleteLoading && clienteSugestoes.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-zinc-400">
                          Buscando clientes...
                        </div>
                      ) : (
                        clienteSugestoes.map((nome) => (
                          <button
                            key={nome}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setNomeCliente(nome);
                              setAutocompleteOpen(false);
                            }}
                            className="flex min-h-11 w-full items-center rounded-[18px] px-4 text-left text-sm font-medium text-[#181818] transition hover:bg-[#F7F7F5]"
                          >
                            {nome}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="valorTransferencia"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Valor da transferência
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                    R$
                  </span>

                  <input
                    id="valorTransferencia"
                    type="text"
                    inputMode="decimal"
                    value={valorTransferencia}
                    onChange={(e) => setValorTransferencia(e.target.value)}
                    placeholder="Ex: 500,00"
                    className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-200 bg-[#FAFAFA] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ReceiptPercentIcon className="h-5 w-5 text-[#181818]" />
                    <p className="text-sm font-semibold text-[#181818]">
                      Usar taxa manual
                    </p>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Quando ativado, o sistema ignora a regra de taxa padrão e
                    usa a taxa definida apenas para esta transferência.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setTaxaManualAtiva((prev) => !prev)}
                  className={`relative h-8 w-14 flex-none rounded-full transition ${
                    taxaManualAtiva ? 'bg-[#181818]' : 'bg-zinc-300'
                  }`}
                  aria-pressed={taxaManualAtiva}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
                      taxaManualAtiva ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {taxaManualAtiva && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="taxaManualPercentual"
                      className="mb-2 block text-sm font-medium text-zinc-700"
                    >
                      Taxa percentual manual
                    </label>

                    <div className="relative">
                      <input
                        id="taxaManualPercentual"
                        type="text"
                        inputMode="decimal"
                        value={taxaManualPercentual}
                        onChange={(e) =>
                          setTaxaManualPercentual(e.target.value)
                        }
                        placeholder="Ex: 3"
                        className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 pr-12 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818]"
                      />

                      <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="taxaManualFixa"
                      className="mb-2 block text-sm font-medium text-zinc-700"
                    >
                      Taxa fixa manual
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                        R$
                      </span>

                      <input
                        id="taxaManualFixa"
                        type="text"
                        inputMode="decimal"
                        value={taxaManualFixa}
                        onChange={(e) => setTaxaManualFixa(e.target.value)}
                        placeholder="Ex: 5,00"
                        className="h-14 w-full rounded-full border border-zinc-200 bg-white pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[28px] bg-[#181818] p-5 text-white">
              <p className="text-sm text-white/50">Prévia da transferência</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">Valor transferido</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(preview.valor)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">
                    {taxaManualAtiva ? 'Lucro manual' : 'Lucro'}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {taxaManualAtiva
                      ? formatCurrency(preview.lucroManual)
                      : 'Calculado ao salvar'}
                  </p>
                </div>

                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">
                    {taxaManualAtiva ? 'Total cobrado' : 'Taxa aplicada'}
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {taxaManualAtiva
                      ? formatCurrency(preview.totalManual)
                      : 'Pela faixa padrão'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] sm:w-auto"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSalvarTransferencia}
                disabled={loading}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                {loading ? 'Salvando...' : 'Salvar transferência'}
              </button>
            </div>
          </div>
        )}

        {step === 'sucesso' && (
          <div className="space-y-5">
            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircleIcon className="h-8 w-8" />

              <h3 className="mt-4 text-lg font-semibold">
                Transferência cadastrada com sucesso
              </h3>

              <p className="mt-2 text-sm leading-6 text-emerald-700">
                O registro já foi salvo e aparecerá na dashboard conforme o
                período selecionado.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  resetModal();
                }}
                className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
              >
                Registrar outra
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
