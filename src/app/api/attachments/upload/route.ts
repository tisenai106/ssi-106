import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  // 1. Obter a sessão
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Obter o nome do arquivo do header (enviado pelo cliente)
  const filename = req.headers.get('X-Vercel-Blob-Filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'Nome do arquivo (X-Vercel-Blob-Filename) é obrigatório' },
      { status: 400 },
    );
  }

  // 3. Obter o arquivo (blob) do corpo
  const blob = await req.blob();
  if (!blob || blob.size === 0) {
    return NextResponse.json(
      { error: 'Nenhum arquivo enviado' },
      { status: 400 },
    );
  }

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    // 4. Fazer o Upload para o Vercel Blob (método 'put')
    const blobResult = await put(`tickets/${userId}/${filename}`, blob, {
      access: 'public',
    } as any);

    // 5. Retornar a URL
    // IMPORTANTE: Assim como na API anterior, NÃO salvamos no Prisma.
    // O cliente (frontend) precisa desta URL para enviar
    // no formulário de criação do chamado.
    return NextResponse.json({
      url: blobResult.url,
      filename: filename,
      fileType: blob.type,
      size: blob.size,
    });
  } catch (error) {
    console.error('[API_ATTACHMENTS_UPLOAD_ERROR]', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao fazer upload' },
      { status: 500 },
    );
  }
}
