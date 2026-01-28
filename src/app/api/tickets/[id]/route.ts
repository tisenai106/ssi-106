import { NextResponse } from 'next/server';
import { Priority, Prisma } from '@prisma/client';
import { z } from 'zod';
import { Role, Status } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// --- 1. Importações de Email ---
import TicketAssignedEmail from '@/emails/ticket-assigned-email';
import TicketStatusUpdateEmail from '@/emails/ticket-status-update-email';
import React from 'react';
import db from '@/app/_lib/prisma';
import { fromEmail, resend } from '@/app/_lib/resend';
import { addBusinessDays } from 'date-fns';
import { sendPushNotification } from '@/app/_lib/push';

// --- Schema (sem alteração) ---
const ticketUpdateSchema = z.object({
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  areaId: z.string().cuid().optional(),
  technicianId: z.string().cuid().nullable().optional(),
});

// 2. Handler PATCH
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  // 2.1. Segurança: Obter a sessão
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.name) {
    // Garantir que temos o nome do atualizador
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const statusLabels: Record<string, string> = {
    OPEN: 'Aberto',
    ASSIGNED: 'Atribuído',
    IN_PROGRESS: 'Em Andamento',
    ON_HOLD: 'Em Espera',
    RESOLVED: 'Resolvido',
    CLOSED: 'Fechado',
    CANCELLED: 'Cancelado',
  };

  // 2.2. Obter ID do Chamado
  const params = await context.params;
  const ticketId = params.id;

  // --- 2.3. Obter dados do chamado ATUAL ---
  // Precisamos dos dados do solicitante (para o email)
  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: {
        // <-- Inclui o solicitante
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json(
      { error: 'Chamado não encontrado' },
      { status: 404 },
    );
  }

  // 2.4. Autorização (RBAC)
  const { role, areaId, id: userId, name: updaterName } = session.user;
  const isSuperAdmin = role === Role.SUPER_ADMIN;
  const isManager = role === Role.MANAGER && ticket.areaId === areaId;
  const isAssignedTech =
    role === Role.TECHNICIAN && ticket.technicianId === userId;
  const canUpdate = isSuperAdmin || isManager || isAssignedTech;
  if (!canUpdate) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  try {
    // 2.5. Validar o corpo (body)
    const body = await req.json();
    const validation = ticketUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 },
      );
    }

    const {
      status,
      technicianId,
      priority,
      areaId: newAreaId,
    } = validation.data;

    if (status === Status.CLOSED) {
      return NextResponse.json(
        {
          error: 'Apenas o solicitante pode marcar um chamado como "Fechado".',
        },
        { status: 403 }, // Forbidden
      );
    }

    // --- 2. NOVA REGRA: Apenas Gestor/Admin muda Prioridade ou Área ---
    if ((priority || newAreaId) && !isSuperAdmin && !isManager) {
      return NextResponse.json(
        { error: 'Apenas Gestores podem alterar a Área ou Prioridade.' },
        { status: 403 },
      );
    }

    // 2.6. Autorização Específica (sem alteração)
    if (technicianId !== undefined && role === Role.TECHNICIAN) {
      return NextResponse.json(
        { error: 'Técnicos não podem atribuir chamados' },
        { status: 403 },
      );
    }

    // 2.7. Preparar os dados para atualização (sem alteração)
    const dataToUpdate: Prisma.TicketUpdateInput = {};
    if (status) {
      dataToUpdate.status = status;

      // --- INÍCIO DA NOVA LÓGICA ---
      // Se o status novo for RESOLVED ou CLOSED,
      // E o chamado AINDA NÃO tiver uma data de resolução (resolvedAt é null)
      if (status === Status.RESOLVED && ticket.resolvedAt === null) {
        // "Trava" a data de resolução
        dataToUpdate.resolvedAt = new Date();
      }
    }
    if (technicianId !== undefined) {
      if (technicianId === null) {
        dataToUpdate.technician = { disconnect: true };
      } else {
        dataToUpdate.technician = { connect: { id: technicianId } };
        if (ticket.status === Status.OPEN && !status) {
          dataToUpdate.status = Status.ASSIGNED;
        }
      }
    }

    if (priority) {
      dataToUpdate.priority = priority;

      // Recalcular o SLA com base na data de criação ORIGINAL
      let slaDays = 5;
      switch (priority) {
        case Priority.URGENT:
          slaDays = 1;
          break;
        case Priority.HIGH:
          slaDays = 3;
          break;
        case Priority.MEDIUM:
          slaDays = 5;
          break;
        case Priority.LOW:
          slaDays = 10;
          break;
      }
      dataToUpdate.slaDeadline = addBusinessDays(ticket.createdAt, slaDays);
    }

    if (newAreaId) {
      dataToUpdate.area = { connect: { id: newAreaId } };

      // Por segurança, se mudar de área, desatribuímos o técnico antigo
      // a menos que um novo técnico também tenha sido enviado.
      if (technicianId === undefined && ticket.technicianId) {
        dataToUpdate.technician = { disconnect: true };
        dataToUpdate.status = Status.OPEN; // Volta para OPEN na nova área
      }
    }

    // 2.8. Atualizar o chamado no banco
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: dataToUpdate,
      include: {
        requester: { select: { name: true } }, // (Já temos 'requester' do 'ticket' acima)
        technician: { select: { name: true, email: true } },
        area: { select: { name: true } },
      },
    });

    // --- 3. LÓGICA DE ENVIO DE EMAILS ---

    const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/tickets/${updatedTicket.id}`;
    const baseEmailDataAvailable =
      fromEmail && process.env.NEXT_PUBLIC_BASE_URL;

    // --- 3.1. Email para o Técnico (Atribuição) ---
    const isAssigningNewTechnician =
      technicianId !== undefined &&
      technicianId !== null &&
      ticket.technicianId !== technicianId;

    if (
      isAssigningNewTechnician &&
      updatedTicket.technician?.email &&
      updatedTicket.requester &&
      baseEmailDataAvailable
    ) {
      try {
        await resend.emails.send({
          from: fromEmail!,
          to: updatedTicket.technician.email,
          subject: `Você foi atribuído ao Chamado #${updatedTicket.ticketId}: ${updatedTicket.title}`,
          react: React.createElement(TicketAssignedEmail, {
            technicianName: updatedTicket.technician.name || 'Técnico',
            requesterName: updatedTicket.requester.name,
            ticketTitle: updatedTicket.title,
            ticketPriority: updatedTicket.priority,
            ticketUrl: ticketUrl,
            ticketId: updatedTicket.ticketId,
            areaName: updatedTicket.area.name,
            location: updatedTicket.location,
            equipment: updatedTicket.equipment,
            assignedAt: new Date(),
          }),
        });

        await sendPushNotification({
          userId: updatedTicket.id, // Precisa incluir o ID na query do manager
          title: 'Novo Chamado Atribuído para Você 🚨',
          body: `Novo chamado de ${updatedTicket.area.name}: ${updatedTicket.title}`,
          url: `/tickets/${updatedTicket.id}`,
        });
      } catch (emailError) {
        console.error('[API_TICKETS_ASSIGN_EMAIL_ERROR]', emailError);
      }
    }

    // --- 3.2. NOVO: Email para o Solicitante (Mudança de Status) ---
    const statusDidChange = updatedTicket.status !== ticket.status;

    if (
      statusDidChange && // 1. O status realmente mudou?
      ticket.requester?.email && // 2. O solicitante tem email?
      ticket.requester.id !== userId && // 3. O solicitante não é o próprio atualizador?
      baseEmailDataAvailable
    ) {
      try {
        await resend.emails.send({
          from: fromEmail!,
          to: ticket.requester.email,
          subject: `Status do seu chamado #${ticket.ticketId} atualizado para: ${statusLabels[updatedTicket.status]}`,
          react: React.createElement(TicketStatusUpdateEmail, {
            requesterName: ticket.requester.name || 'Solicitante',
            updaterName: updaterName || 'Equipe', // Nome de quem está logado
            ticketTitle: ticket.title,
            oldStatus: ticket.status, // Status antigo (do 'ticket')
            newStatus: updatedTicket.status, // Status novo (do 'updatedTicket')
            ticketUrl: ticketUrl,
            updatedAt: ticket.updatedAt,
            ticketId: ticket.ticketId,
          }),
        });

        await sendPushNotification({
          userId: ticket.id, // Precisa incluir o ID na query do manager
          title: 'Seu chamado mudou de status 🚨',
          body: `O status do chamado ${ticket.title} agora é: ${statusLabels[updatedTicket.status]}`,
          url: `/tickets/${ticket.id}`,
        });
        console.log('enviou o email');
        console.log(fromEmail!);
      } catch (emailError) {
        console.error('[API_TICKETS_STATUS_EMAIL_ERROR]', emailError);
      }
    }

    // 4. Retorna o sucesso
    return NextResponse.json(updatedTicket);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API_TICKETS_PATCH_ERROR]', error);
    // Erro comum: technicianId enviado não existe
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'O técnico selecionado não existe' },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    );
  }
}
