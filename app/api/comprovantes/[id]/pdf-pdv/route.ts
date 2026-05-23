import { NextRequest } from 'next/server';
import {
  createPdvComprovantePdfBuffer,
  formatPdfFilename,
  getComprovantePdfData,
} from '../_lib/comprovante-pdf';
import type { RouteParams } from '../_lib/comprovante-pdf';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const result = await getComprovantePdfData(id);

  if ('error' in result) {
    return result.error;
  }

  const pdf = createPdvComprovantePdfBuffer(result.comprovante, result.usuario);
  const shouldDownload = request.nextUrl.searchParams.get('download') === '1';

  return new Response(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${formatPdfFilename(id, 'pdv')}"`,
      'Content-Length': String(pdf.length),
      'Cache-Control': 'no-store',
    },
  });
}
