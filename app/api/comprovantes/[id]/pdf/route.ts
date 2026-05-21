import { NextRequest } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type StatusComprovante = 'concluida' | 'cancelada';

type UsuarioSistema = {
  id: string;
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

const pageWidth = 595.28;
const pageHeight = 841.89;

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

function sanitizePdfText(value: string) {
  return value
    .replace(/[^\x20-\x7e\xa0-\xff]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function wrapText(value: string, maxLength: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;

    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
      return;
    }

    line = next;
  });

  if (line) lines.push(line);

  return lines.length ? lines : ['-'];
}

function createPdfBuffer(comprovante: Comprovante, usuario: UsuarioSistema) {
  const statusLabel =
    comprovante.status === 'concluida' ? 'Concluído' : 'Cancelado';

  const taxa = `${Number(comprovante.taxa_percentual_aplicada || 0)}% + ${formatCurrency(
    Number(comprovante.taxa_fixa_aplicada || 0),
  )}`;

  const commands: string[] = [
    'q 0.965 0.965 0.955 rg 0 0 595.28 841.89 re f Q',
    'q 0.095 0.095 0.095 rg 48 704 499.28 86 re f Q',
  ];

  function text(
    value: string,
    x: number,
    y: number,
    size: number,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) {
    const font = options?.bold ? 'F2' : 'F1';
    const [r, g, b] = options?.color || [0.095, 0.095, 0.095];

    commands.push(
      `BT /${font} ${size} Tf ${r} ${g} ${b} rg ${x} ${y} Td (${sanitizePdfText(
        value,
      )}) Tj ET`,
    );
  }

  function line(x1: number, y1: number, x2: number, y2: number) {
    commands.push(`q 0.88 0.88 0.88 RG 1 w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }

  function labelValue(label: string, value: string, x: number, y: number) {
    text(label, x, y, 9, { color: [0.42, 0.42, 0.42] });
    text(value, x, y - 18, 13, { bold: true });
  }

  text('Cash Correia', 72, 752, 22, {
    bold: true,
    color: [1, 1, 1],
  });
  text('Comprovante de transferência', 72, 729, 12, {
    color: [0.88, 0.88, 0.88],
  });
  text(`Emitido em ${formatDateTime(new Date().toISOString())}`, 354, 752, 10, {
    color: [0.88, 0.88, 0.88],
  });

  text('Dados do comprovante', 72, 660, 16, { bold: true });
  line(72, 644, 523, 644);

  labelValue('Código', comprovante.id, 72, 610);
  labelValue('Cliente', truncate(comprovante.nome_cliente, 44), 72, 560);
  labelValue('Data da transferência', formatDateTime(comprovante.created_at), 72, 510);
  labelValue('Status', statusLabel, 354, 510);

  text('Valores', 72, 452, 16, { bold: true });
  line(72, 436, 523, 436);

  labelValue(
    'Valor transferido',
    formatCurrency(Number(comprovante.valor_transferencia || 0)),
    72,
    402,
  );
  labelValue('Taxa aplicada', taxa, 354, 402);
  labelValue(
    'Lucro da taxa',
    formatCurrency(Number(comprovante.lucro_taxa || 0)),
    72,
    352,
  );
  labelValue(
    'Total cobrado',
    formatCurrency(Number(comprovante.valor_total_cobrado || 0)),
    354,
    352,
  );

  text('Responsável', 72, 294, 16, { bold: true });
  line(72, 278, 523, 278);

  labelValue('Nome', usuario.nome || 'Usuário do sistema', 72, 244);
  labelValue('Telefone', usuario.telefone || '-', 354, 244);

  text('Observação', 72, 186, 16, { bold: true });
  line(72, 170, 523, 170);

  const observationLines = wrapText(
    comprovante.observacao || 'Nenhuma observação registrada.',
    78,
  ).slice(0, 4);

  observationLines.forEach((observationLine, index) => {
    text(observationLine, 72, 142 - index * 18, 11, {
      color: [0.32, 0.32, 0.32],
    });
  });

  text(
    'Documento gerado automaticamente pelo Cash Correia.',
    72,
    64,
    9,
    { color: [0.42, 0.42, 0.42] },
  );

  const content = commands.join('\n');
  const contentBuffer = Buffer.from(content, 'latin1');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    Buffer.concat([
      Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`, 'latin1'),
      contentBuffer,
      Buffer.from('\nendstream', 'latin1'),
    ]),
  ];

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'latin1')];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.concat(chunks).length);
    chunks.push(Buffer.from(`${index + 1} 0 obj\n`, 'latin1'));
    chunks.push(typeof object === 'string' ? Buffer.from(object, 'latin1') : object);
    chunks.push(Buffer.from('\nendobj\n', 'latin1'));
  });

  const xrefOffset = Buffer.concat(chunks).length;
  const xrefLines = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ];

  chunks.push(Buffer.from(xrefLines.join('\n'), 'latin1'));

  return Buffer.concat(chunks);
}

export async function GET(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Usuário não autenticado.' }, { status: 401 });
  }

  const { data: usuarioData, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, nome, telefone')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (usuarioError) {
    return Response.json({ error: usuarioError.message }, { status: 500 });
  }

  if (!usuarioData) {
    return Response.json(
      { error: 'Usuário do sistema não encontrado.' },
      { status: 404 },
    );
  }

  const { data: comprovanteData, error: comprovanteError } = await supabase
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
    .eq('id', id)
    .eq('usuario_id', usuarioData.id)
    .maybeSingle();

  if (comprovanteError) {
    return Response.json({ error: comprovanteError.message }, { status: 500 });
  }

  if (!comprovanteData) {
    return Response.json(
      { error: 'Comprovante não encontrado.' },
      { status: 404 },
    );
  }

  const pdf = createPdfBuffer(
    comprovanteData as Comprovante,
    usuarioData as UsuarioSistema,
  );
  const shouldDownload = request.nextUrl.searchParams.get('download') === '1';
  const filename = `comprovante-${id.slice(0, 8)}.pdf`;

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'no-store',
    },
  });
}
