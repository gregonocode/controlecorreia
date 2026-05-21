'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErrorMessage('');

    if (!email.trim() || !senha.trim()) {
      setErrorMessage('Informe email e senha para entrar.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.refresh();
    router.push('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] lg:grid lg:grid-cols-2">
      {/* Branding - Desktop */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#181818] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[22px] bg-white text-[#181818]">
            <ReceiptPercentIcon className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Controle Correia
            </h1>
            <p className="text-xs text-white/50">
              Gestão simples de transferências
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            <ShieldCheckIcon className="h-5 w-5" />
            Controle financeiro rápido e organizado
          </div>

          <h2 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight">
            Organize seus comprovantes e acompanhe seu lucro diário.
          </h2>

          <p className="mt-5 max-w-md text-base leading-7 text-white/55">
            Cadastre transferências, configure taxas, acompanhe valores enviados
            e visualize o lucro por período em uma dashboard simples e bonita.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <BanknotesIcon className="mb-4 h-6 w-6 text-white/80" />
              <p className="text-sm font-medium">Transferências</p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Registre valores enviados.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <ReceiptPercentIcon className="mb-4 h-6 w-6 text-white/80" />
              <p className="text-sm font-medium">Taxas</p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Configure taxa fixa e percentual.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
              <ChartBarIcon className="mb-4 h-6 w-6 text-white/80" />
              <p className="text-sm font-medium">Lucro</p>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Veja ganhos do dia ou mês.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Login */}
      <section className="flex min-h-screen items-center justify-center px-4 py-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[28px] bg-[#181818] shadow-sm">
              <ReceiptPercentIcon className="h-8 w-8 text-white" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-[#181818]">
              Controle Correia
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Controle simples de transferências, comprovantes, taxas e lucro do
              dia.
            </p>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#181818]">
                Entrar no sistema
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Entre com seu email e senha cadastrados no Supabase.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 flex items-start gap-3 rounded-[24px] border border-amber-100 bg-amber-50 p-4 text-amber-800">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-none" />

                <p className="text-sm leading-6 text-amber-700">
                  {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Email
                </label>

                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Senha
                </label>

                <div className="relative">
                  <LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

                  <input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Digite sua senha"
                    autoComplete="current-password"
                    className="h-14 w-full rounded-full border border-zinc-200 bg-[#FAFAFA] pl-12 pr-4 text-sm text-[#181818] outline-none transition placeholder:text-zinc-400 focus:border-[#181818] focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Entrando...' : 'Entrar no painel'}

                {!loading && <ArrowRightIcon className="h-5 w-5" />}
              </button>
            </form>

            <div className="mt-5 rounded-[24px] bg-[#F7F7F5] p-4">
              
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Controle Correia © {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </main>
  );
}
