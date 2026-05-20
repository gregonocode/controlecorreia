'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/app/lib/supabase/client';
import RegistrarTransferenciaModal from '@/app/components/transferencias/RegistrarTransferenciaModal';

type UsuarioSistema = {
  id: string;
  auth_user_id: string;
  nome: string | null;
  telefone: string | null;
};

export default function NovaTransferenciaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [usuarioSistema, setUsuarioSistema] = useState<UsuarioSistema | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function carregarUsuario() {
      setLoading(true);
      setErrorMessage('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, auth_user_id, nome, telefone')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage('Usuario do sistema nao encontrado.');
        setLoading(false);
        return;
      }

      setUsuarioSistema(data as UsuarioSistema);
      setLoading(false);
    }

    void carregarUsuario();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function handleCreated() {
    router.push('/dashboard/transferencias');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={() => router.push('/dashboard/transferencias')}
          className="mb-5 inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-[#181818]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-3 py-1.5 text-xs font-medium text-zinc-600">
              <PlusIcon className="h-4 w-4" />
              Nova transferencia
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[#181818] sm:text-3xl">
              Registrar transferencia
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              O formulario de registro sera aberto automaticamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={loading || !usuarioSistema?.id}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#181818] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-5 w-5" />
            Abrir formulario
          </button>
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-[28px] border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 flex-none" />

          <div>
            <p className="text-sm font-semibold">Atencao</p>
            <p className="mt-1 text-sm leading-6 text-amber-700">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-[32px] border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
        <PlusIcon className="mx-auto h-10 w-10 text-zinc-300" />

        <h2 className="mt-4 text-lg font-semibold text-[#181818]">
          Cadastro rapido
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
          Use o modal para informar apenas o nome completo e o valor da
          transferencia. A taxa sera aplicada automaticamente pelo banco de
          dados.
        </p>
      </div>

      <RegistrarTransferenciaModal
        open={modalOpen && !!usuarioSistema?.id}
        usuarioId={usuarioSistema?.id || ''}
        onClose={() => {
          setModalOpen(false);
          router.push('/dashboard/transferencias');
        }}
        onCreated={handleCreated}
      />
    </div>
  );
}
