import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import db from '@/app/_lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userId = session.user.id;

  // Sanitização do nome do arquivo para evitar erros de URL
  const filenameRaw = req.headers.get('X-Vercel-Blob-Filename') || 'avatar.png';
  const filename = filenameRaw
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');

  const contentType = req.headers.get('content-type') || 'image/png';

  /* eslint-disable @typescript-eslint/no-explicit-any */

  // Verificar se existe corpo na requisição
  if (!req.body) {
    return NextResponse.json(
      { error: 'Nenhum arquivo enviado' },
      { status: 400 },
    );
  }

  // Verificar token
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Servidor não configurado (Falta Token)' },
      { status: 500 },
    );
  }

  // CORREÇÃO CRÍTICA:
  // Se esta variável existir, a biblioteca tenta conectar-se localmente (0.0.0.0).
  // Removemo-la forçosamente para garantir que o upload vá para a nuvem da Vercel.
  if (process.env.VERCEL_BLOB_API_URL) {
    console.warn(
      '⚠️ AVISO: VERCEL_BLOB_API_URL detectada e removida temporariamente para forçar upload na nuvem.',
    );
    delete process.env.VERCEL_BLOB_API_URL;
  }

  try {
    // CORREÇÃO: Usamos 'req.body' (Stream) diretamente.
    const blobResult = await put(`avatars/${userId}/${filename}`, req.body, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentType,
    } as any);

    // Atualiza o utilizador
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { photoUrl: blobResult.url },
      select: { photoUrl: true },
    });

    return NextResponse.json({ photoUrl: updatedUser.photoUrl });
  } catch (error: any) {
    console.error('[API_AVATAR_POST_ERROR]', error);
    return NextResponse.json(
      { error: `Erro no upload: ${error.message}` },
      { status: 500 },
    );
  }
}
