'use client';

import { useMemo, useState } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type UsuarioEncontrado = {
  nome: string;
  tipoIdentificador: 'CPF' | 'RG' | 'Telefone';
  identificador: string;
};

type Step = 'buscar' | 'cadastrar' | 'transferencia' | 'sucesso';

type Props = {
  open: boolean;
  onClose: () => void;
};

const usuarioFake: UsuarioEncontrado = {
  nome: 'Tiago de Oliveira Ribeiro',
  tipoIdentificador: 'CPF',
  identificador: '02971595269',
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

function detectarTipoIdentificador(value: string): 'CPF' | 'RG' | 'Telefone' {
  const onlyNumbers = value.replace(/\D/g, '');

  if (onlyNumbers.length === 11) return 'CPF';
  if (onlyNumbers.length >= 8 && onlyNumbers.length <= 10) return 'RG';

  return 'Telefone';
}

export default function RegistrarTransferenciaModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('buscar');
  const [identificadorBusca, setIdentificadorBusca] = useState('');
  const [usuario, setUsuario] = useState<UsuarioEncontrado | null>(null);

  const [nomeCadastro, setNomeCadastro] = useState('');
  const [identificadorCadastro, setIdentificadorCadastro] = useState('');

  const [valorTransferencia, setValorTransferencia] = useState('');
  const [recebedor, setRecebedor] = useState('');

  const taxaPercentual = 3;
  const taxaFixa = 5;

  const calculo = useMemo(() => {
    const valor = toNumber(valorTransferencia);
    const taxaPorcentagem = valor * (taxaPercentual / 100);
    const lucro = taxaPorcentagem + taxaFixa;
    const totalCobrado = valor + lucro;

    return {
      valor,
      taxaPorcentagem,
      lucro,
      totalCobrado,
    };
  }, [valorTransferencia]);

  if (!open) return null;

  function resetAndClose() {
    setStep('buscar');
    setIdentificadorBusca('');
    setUsuario(null);
    setNomeCadastro('');
    setIdentificadorCadastro('');
    setValorTransferencia('');
    setRecebedor('');
    onClose();
  }

  function handleBuscar() {
    const clean = identificadorBusca.replace(/\D/g, '');

    if (clean === '02971595269') {
      setUsuario(usuarioFake);
      setStep('transferencia');
      return;
    }

    setIdentificadorCadastro(identificadorBusca);
    setStep('cadastrar');
  }

  function handleCadastrarUsuario() {
    const clean = identificadorCadastro.trim();

    if (!nomeCadastro.trim() || !clean) return;

    const novoUsuario: UsuarioEncontrado = {
      nome: nomeCadastro,
      identificador: clean,
      tipoIdentificador: detectarTipoIdentificador(clean),
    };

    setUsuario(novoUsuario);
    setStep('transferencia');
  }

  function handleSalvarTransferencia() {
    if (!usuario || calculo.valor <= 0) return;

    console.log('Transferência fake cadastrada:', {
      usuario,
      valorTransferencia: calculo.valor,
      recebedor,
      taxaPercentual,
      taxaFixa,
      lucro: calculo.lucro,
      totalCobrado: calculo.totalCobrado,
    });

    setStep('sucesso');
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
              {step === 'buscar' && 'Buscar usuário'}
              {step === 'cadastrar' && 'Cadastrar novo usuário'}
              {step === 'transferencia' && 'Dados da transferência'}
              {step === 'sucesso' && 'Transferência registrada'}
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {step === 'buscar' &&
                'Busque pelo telefone, CPF ou RG antes de registrar a transferência.'}
              {step === 'cadastrar' &&
                'Esse identificador ainda não existe. Cadastre o usuário para continuar.'}
              {step === 'transferencia' &&
                'Confira o usuário e informe o valor da transferência.'}
              {step === 'sucesso' &&
                'Cadastro visual concluído. Depois conectamos isso ao Supabase.'}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#F7F7F5] text-zinc-500 transition hover:text-[#181818]"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {step === 'buscar' && (
          <div className="space-y-5">
            <div>
              <label
                htmlFor="identificadorBusca"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Telefone, CPF ou RG
              </label>

              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="identificadorBusca"
                  type="text"
                  value={identificadorBusca}
                  onChange={(e) => setIdentificadorBusca(e.target.value)}
                  placeholder="Ex: 02971595269"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Teste fake: digitando <strong>02971595269</strong>, o sistema
                encontra o usuário Tiago de Oliveira Ribeiro.
              </p>
            </div>

            <button
              type="button"
              onClick={handleBuscar}
              disabled={!identificadorBusca.trim()}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Buscar usuário
            </button>
          </div>
        )}

        {step === 'cadastrar' && (
          <div className="space-y-5">
            <div className="rounded-[24px] bg-[#F7F7F5] p-4">
              <p className="text-xs text-zinc-500">
                Identificador pesquisado
              </p>
              <p className="mt-1 text-sm font-semibold text-[#181818]">
                {identificadorCadastro || identificadorBusca}
              </p>
            </div>

            <div>
              <label
                htmlFor="nomeCadastro"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Nome do usuário
              </label>

              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                <input
                  id="nomeCadastro"
                  type="text"
                  value={nomeCadastro}
                  onChange={(e) => setNomeCadastro(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="identificadorCadastro"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Identificador
              </label>

              <input
                id="identificadorCadastro"
                type="text"
                value={identificadorCadastro}
                onChange={(e) => setIdentificadorCadastro(e.target.value)}
                placeholder="CPF, RG ou telefone"
                className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep('buscar')}
                className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] sm:w-auto"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleCadastrarUsuario}
                disabled={!nomeCadastro.trim() || !identificadorCadastro.trim()}
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                Cadastrar e continuar
              </button>
            </div>
          </div>
        )}

        {step === 'transferencia' && usuario && (
          <div className="space-y-5">
            <div className="rounded-[28px] border border-zinc-100 bg-[#FAFAFA] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
                  <UserIcon className="h-5 w-5 text-[#181818]" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#181818]">
                    {usuario.nome}
                  </p>

                  <p className="mt-1 text-xs text-zinc-400">
                    {usuario.tipoIdentificador}: {usuario.identificador}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
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

              <div>
                <label
                  htmlFor="recebedor"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Para quem vai receber
                  <span className="ml-1 text-xs font-normal text-zinc-400">
                    opcional
                  </span>
                </label>

                <input
                  id="recebedor"
                  type="text"
                  value={recebedor}
                  onChange={(e) => setRecebedor(e.target.value)}
                  placeholder="Ex: Ana Beatriz"
                  className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] px-5 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                />
              </div>
            </div>

            <div className="rounded-[28px] bg-[#181818] p-5 text-white">
              <p className="text-sm text-white/50">Resumo da cobrança</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">Valor</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(calculo.valor)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">Lucro</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(calculo.lucro)}
                  </p>
                </div>

                <div className="rounded-[22px] bg-white/5 p-4">
                  <p className="text-xs text-white/40">Total cobrado</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(calculo.totalCobrado)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep('buscar')}
                className="inline-flex h-14 w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818] sm:w-auto"
              >
                Buscar outro
              </button>

              <button
                type="button"
                onClick={handleSalvarTransferencia}
                disabled={calculo.valor <= 0}
                className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
              >
                Salvar transferência
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
                Por enquanto esse cadastro está apenas no frontend. Depois a
                gente salva usuário, transferência e comprovante no Supabase.
              </p>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="inline-flex h-14 w-full items-center justify-center rounded-full bg-[#181818] px-6 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
