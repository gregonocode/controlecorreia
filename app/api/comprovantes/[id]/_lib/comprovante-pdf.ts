import { createClient } from '@/app/lib/supabase/server';

export type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export type StatusComprovante = 'concluida' | 'cancelada' | 'pendente';

export type UsuarioSistema = {
  id: string;
  nome: string | null;
  telefone: string | null;
};

export type Comprovante = {
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

type PdfSize = {
  width: number;
  height: number;
};

type PdfDrawOptions = {
  size: PdfSize;
  commands: string[];
};

export async function getComprovantePdfData(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: Response.json(
        { error: 'Usuario nao autenticado.' },
        { status: 401 },
      ),
    };
  }

  const { data: usuarioData, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, nome, telefone')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (usuarioError) {
    return {
      error: Response.json({ error: usuarioError.message }, { status: 500 }),
    };
  }

  if (!usuarioData) {
    return {
      error: Response.json(
        { error: 'Usuario do sistema nao encontrado.' },
        { status: 404 },
      ),
    };
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
    return {
      error: Response.json(
        { error: comprovanteError.message },
        { status: 500 },
      ),
    };
  }

  if (!comprovanteData) {
    return {
      error: Response.json(
        { error: 'Comprovante nao encontrado.' },
        { status: 404 },
      ),
    };
  }

  return {
    comprovante: comprovanteData as Comprovante,
    usuario: usuarioData as UsuarioSistema,
  };
}

export function formatComprovanteCode(id: string) {
  const number = Array.from(id.replace(/-/g, '')).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) % 1000000000;
  }, 0);

  return `#${String(number || 1).padStart(9, '0')}`;
}

export function formatPdfFilename(id: string, suffix?: string) {
  const code = formatComprovanteCode(id).slice(1);
  return `comprovante-${code}${suffix ? `-${suffix}` : ''}.pdf`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function sanitizePdfText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function getStatusLabel(status: StatusComprovante) {
  if (status === 'concluida') return 'Concluido';
  if (status === 'pendente') return 'Pendente';
  return 'Cancelado';
}

function addText(
  commands: string[],
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

function addLine(
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: [number, number, number] = [0.88, 0.88, 0.88],
) {
  commands.push(
    `q ${color[0]} ${color[1]} ${color[2]} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S Q`,
  );
}

function buildPdf({ size, commands }: PdfDrawOptions) {
  const content = commands.join('\n');
  const contentBuffer = Buffer.from(content, 'latin1');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.width} ${size.height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
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

export function createA4ComprovantePdfBuffer(
  comprovante: Comprovante,
  usuario: UsuarioSistema,
) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const code = formatComprovanteCode(comprovante.id);
  const taxa = `${Number(comprovante.taxa_percentual_aplicada || 0)}% + ${formatCurrency(
    Number(comprovante.taxa_fixa_aplicada || 0),
  )}`;

  const commands: string[] = [
    'q 0.965 0.965 0.955 rg 0 0 595.28 841.89 re f Q',
    'q 0.095 0.095 0.095 rg 48 704 499.28 86 re f Q',
  ];

  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) => addText(commands, value, x, y, size, options);

  const line = (x1: number, y1: number, x2: number, y2: number) =>
    addLine(commands, x1, y1, x2, y2);

  function labelValue(label: string, value: string, x: number, y: number) {
    text(label, x, y, 9, { color: [0.42, 0.42, 0.42] });
    text(value, x, y - 18, 13, { bold: true });
  }

  text('Cash Correia', 72, 752, 22, {
    bold: true,
    color: [1, 1, 1],
  });
  text('Comprovante de transferencia', 72, 729, 12, {
    color: [0.88, 0.88, 0.88],
  });
  text(`Emitido em ${formatDateTime(new Date().toISOString())}`, 354, 752, 10, {
    color: [0.88, 0.88, 0.88],
  });

  text('Dados do comprovante', 72, 660, 16, { bold: true });
  line(72, 644, 523, 644);

  labelValue('Codigo', code, 72, 610);
  labelValue('Cliente', truncate(comprovante.nome_cliente, 44), 72, 560);
  labelValue('Data da transferencia', formatDateTime(comprovante.created_at), 72, 510);
  labelValue('Status', getStatusLabel(comprovante.status), 354, 510);

  text('Valores', 72, 452, 16, { bold: true });
  line(72, 436, 523, 436);

  labelValue(
    'Valor transferido',
    formatCurrency(Number(comprovante.valor_transferencia || 0)),
    72,
    402,
  );
  labelValue('Taxa aplicada', taxa, 354, 402);
  labelValue('Taxa', formatCurrency(Number(comprovante.lucro_taxa || 0)), 72, 352);
  labelValue(
    'Total cobrado',
    formatCurrency(Number(comprovante.valor_total_cobrado || 0)),
    354,
    352,
  );

  text('Responsavel', 72, 294, 16, { bold: true });
  line(72, 278, 523, 278);

  labelValue('Nome', usuario.nome || 'Usuario do sistema', 72, 244);
  labelValue('Telefone', usuario.telefone || '-', 354, 244);

  text('Observacao', 72, 186, 16, { bold: true });
  line(72, 170, 523, 170);

  const observationLines = wrapText(
    comprovante.observacao || 'Nenhuma observacao registrada.',
    78,
  ).slice(0, 4);

  observationLines.forEach((observationLine, index) => {
    text(observationLine, 72, 142 - index * 18, 11, {
      color: [0.32, 0.32, 0.32],
    });
  });

  text('Documento gerado automaticamente pelo Cash Correia.', 72, 64, 9, {
    color: [0.42, 0.42, 0.42],
  });

  return buildPdf({
    size: { width: pageWidth, height: pageHeight },
    commands,
  });
}

export function createPdvComprovantePdfBuffer(
  comprovante: Comprovante,
  usuario: UsuarioSistema,
) {
  const pageWidth = 226.77;
  const margin = 14;
  const code = formatComprovanteCode(comprovante.id);
  const taxa = `${Number(comprovante.taxa_percentual_aplicada || 0)}% + ${formatCurrency(
    Number(comprovante.taxa_fixa_aplicada || 0),
  )}`;
  const rows = [
    { label: 'Codigo', value: code },
    { label: 'Cliente', value: comprovante.nome_cliente },
    { label: 'Data', value: formatDateTime(comprovante.created_at) },
    { label: 'Status', value: getStatusLabel(comprovante.status) },
    {
      label: 'Valor transferido',
      value: formatCurrency(Number(comprovante.valor_transferencia || 0)),
    },
    { label: 'Taxa aplicada', value: taxa },
    { label: 'Taxa', value: formatCurrency(Number(comprovante.lucro_taxa || 0)) },
    {
      label: 'Total cobrado',
      value: formatCurrency(Number(comprovante.valor_total_cobrado || 0)),
    },
    { label: 'Responsavel', value: usuario.nome || 'Usuario do sistema' },
    { label: 'Telefone', value: usuario.telefone || '-' },
  ].map((rowItem) => ({
    ...rowItem,
    lines: wrapText(rowItem.value, 28).slice(0, 2),
  }));
  const observationLines = wrapText(
    comprovante.observacao || 'Nenhuma observacao registrada.',
    31,
  ).slice(0, 4);
  const rowsHeight = rows.reduce(
    (total, rowItem) => total + 14 + rowItem.lines.length * 12,
    0,
  );
  const pageHeight = Math.max(
    420,
    24 + 40 + 4 * 26 + rowsHeight + 20 + observationLines.length * 11 + 44,
  );
  const commands: string[] = [
    `q 1 1 1 rg 0 0 ${pageWidth} ${pageHeight} re f Q`,
  ];
  let y = pageHeight - 24;

  const text = (
    value: string,
    x: number,
    nextY: number,
    size: number,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) => addText(commands, value, x, nextY, size, options);

  const divider = () => {
    y -= 10;
    addLine(commands, margin, y, pageWidth - margin, y, [0.72, 0.72, 0.72]);
    y -= 16;
  };

  const row = (label: string, lines: string[]) => {
    text(label, margin, y, 7, { color: [0.42, 0.42, 0.42] });
    y -= 11;

    lines.forEach((line) => {
      text(line, margin, y, 9, { bold: true });
      y -= 12;
    });

    y -= 3;
  };

  text('CASH CORREIA', margin, y, 14, { bold: true });
  y -= 16;
  text('COMPROVANTE DE TRANSFERENCIA', margin, y, 8, {
    color: [0.25, 0.25, 0.25],
  });
  y -= 12;
  text(`Emitido ${formatDateTime(new Date().toISOString())}`, margin, y, 7, {
    color: [0.42, 0.42, 0.42],
  });

  divider();

  rows.slice(0, 4).forEach((rowItem) => row(rowItem.label, rowItem.lines));

  divider();

  rows.slice(4, 8).forEach((rowItem) => row(rowItem.label, rowItem.lines));

  divider();

  rows.slice(8, 10).forEach((rowItem) => row(rowItem.label, rowItem.lines));

  divider();

  text('Observacao', margin, y, 7, { color: [0.42, 0.42, 0.42] });
  y -= 11;
  observationLines.forEach((line) => {
    text(line, margin, y, 8, { color: [0.18, 0.18, 0.18] });
    y -= 11;
  });

  y -= 10;
  addLine(commands, margin, y, pageWidth - margin, y, [0.72, 0.72, 0.72]);
  y -= 16;
  text('Documento gerado automaticamente.', margin, y, 7, {
    color: [0.42, 0.42, 0.42],
  });

  return buildPdf({
    size: { width: pageWidth, height: pageHeight },
    commands,
  });
}
