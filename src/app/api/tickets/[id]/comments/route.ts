import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// --- 1. Importações de Email ---
import { NewCommentEmail } from '@/emails/new-comment-email';
import React from 'react'; // Necessário para React.createElement
import db from '@/app/_lib/prisma';
import { fromEmail, resend } from '@/app/_lib/resend';
import { sendPushNotification } from '@/app/_lib/push';

// --- Schema (sem alteração) ---
const commentCreateSchema = z.object({
  text: z.string().min(1, 'O comentário não pode estar vazio'),
  isInternal: z.boolean().default(false),
});

// 2. Handler POST (Modificado)
export async function POST(
  req: Request,
  // (Corrigido para lidar com params como Promise)
  context: { params: Promise<{ id: string }> },
) {
  // 2.1. Segurança: Obter a sessão
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const userId = session.user.id; // ID de quem está a comentar
  const params = await context.params;
  const ticketId = params.id;

  try {
    // 2.2. Validar o corpo (body)
    const body = await req.json();
    const validation = commentCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 },
      );
    }

    const { text, isInternal } = validation.data;

    // --- 2.3. MODIFICADO: Buscar o ticket (precisamos de dados para o email) ---
    const ticket = await db.ticket.findUnique({
      where: { id: ticketId },
      select: {
        areaId: true,
        title: true, // <-- Para o assunto do email
        requester: {
          // <-- Para quem vamos enviar o email
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Chamado não encontrado' },
        { status: 404 },
      );
    }

    // 2.4. Criar o comentário no banco
    const newComment = await db.comment.create({
      data: {
        text,
        isInternal,
        ticket: { connect: { id: ticketId } },
        user: { connect: { id: userId } }, // Conecta a quem comentou
        area: { connect: { id: ticket.areaId } },
      },
      // Precisamos dos dados de quem comentou
      include: {
        user: {
          select: { name: true, role: true, photoUrl: true },
        },
      },
    });

    // --- 3. NOVO: Lógica de Envio de Email (Novo Comentário) ---
    if (
      !isInternal && // Se o comentário NÃO for interno
      ticket.requester && // Se o solicitante existir
      ticket.requester.email && // Se o solicitante tiver email
      ticket.requester.id !== userId && // Se quem comentou NÃO for o próprio solicitante
      fromEmail &&
      process.env.NEXT_PUBLIC_BASE_URL
    ) {
      try {
        const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/tickets/${ticketId}`;

        await resend.emails.send({
          from: fromEmail,
          to: ticket.requester.email, // Envia para o solicitante
          subject: `Novo comentário no seu chamado: ${ticket.title}`,

          react: React.createElement(NewCommentEmail, {
            requesterName: ticket.requester.name || 'Solicitante',
            commenterName: newComment.user.name || 'Equipa',
            ticketTitle: ticket.title,
            commentText: newComment.text,
            ticketUrl: ticketUrl,
          }),
        });

        await sendPushNotification({
          userId: ticket.requester.id, // Precisa incluir o ID na query do manager
          title: 'Novo Comentário no seu chamado 🚨',
          body: `Novo comentário: ${newComment.text}`,
          url: `/tickets/${ticketUrl}`,
        });
      } catch (emailError) {
        // Loga o erro, mas não falha a requisição
        console.error('[API_COMMENTS_POST_EMAIL_ERROR]', emailError);
      }
    }

    // 4. Retorna o sucesso
    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('[API_COMMENTS_POST_ERROR]', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
