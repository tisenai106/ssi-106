import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Priority, Role } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import React from 'react';
import { addBusinessDays } from 'date-fns';

import db from '@/app/_lib/prisma';
import { fromEmail, resend } from '@/app/_lib/resend';
import { NewTicketEmail } from '@/emails/new-ticket-email';

import { generateTicketIdV2 } from '@/app/_lib/generate-ticket-id';
import TicketConfirmationEmail from '@/emails/ticket-confirmation-email';

/* eslint-disable */

// Schema de anexo
const attachmentSchema = z.object({
  url: z.string().url('URL do anexo inválida'),
  filename: z.string().min(1, 'Nome do arquivo do anexo inválido'),
  fileType: z.string().optional(),
  size: z.number().int().positive().optional(),
});

// Schema de criação de ticket
const ticketCreateSchema = z.object({
  title: z.string().min(5, 'Título deve ter pelo menos 5 caracteres'),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  location: z.string().min(3, 'Localização é obrigatória'),
  equipment: z.string().min(3, 'Equipamento é obrigatório'),
  model: z.string().min(3, 'Modelo é obrigatório'),
  assetTag: z.string().min(3, 'Patrimônio é obrigatório'),
  priority: z.nativeEnum(Priority),
  areaId: z.string().cuid('ID da Área inválido'),
  attachments: z.array(attachmentSchema).optional(),
});

// Configuração de SLA por prioridade (em dias úteis)
const SLA_DAYS: Record<Priority, number> = {
  [Priority.URGENT]: 1,
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 5,
  [Priority.LOW]: 10,
};

/**
 * Calcula o prazo de SLA com base na prioridade
 */
function calculateSlaDeadline(priority: Priority): Date {
  const now = new Date();
  const days = SLA_DAYS[priority];
  return addBusinessDays(now, days);
}

// Handler POST
export async function POST(req: Request) {
  try {
    // 1. Autenticação - Verificar sessão
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name || 'Usuário';

    // 2. Validar corpo da requisição
    const body = await req.json();
    const validation = ticketCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.format() },
        { status: 400 },
      );
    }

    const { areaId, attachments, priority, ...ticketData } = validation.data;

    // 3. Verificar se a área existe
    const area = await db.area.findUnique({
      where: { id: areaId },
      select: { id: true, name: true, code: true },
    });

    if (!area) {
      return NextResponse.json(
        { error: 'Área não encontrada' },
        { status: 404 },
      );
    }

    // 4. Calcular prazo de SLA
    const slaDeadline = calculateSlaDeadline(priority);

    // 5. Gerar ID personalizado do ticket
    const ticketId = await generateTicketIdV2(areaId);

    // 6. Criar ticket e anexos (transacional)
    const newTicket = await db.ticket.create({
      data: {
        ...ticketData,
        ticketId,
        priority,
        slaDeadline,
        requester: {
          connect: { id: userId },
        },
        area: {
          connect: { id: areaId },
        },
        ...(attachments &&
          attachments.length > 0 && {
            attachments: {
              createMany: {
                data: attachments.map((att) => ({
                  ...att,
                  uploaderId: userId,
                })),
              },
            },
          }),
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        area: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
      },
    });

    // 7. Enviar emails (fire-and-forget)
    const canSendEmail = fromEmail && process.env.NEXT_PUBLIC_BASE_URL;

    if (canSendEmail) {
      // Email de confirmação para o solicitante
      sendConfirmationToRequester(newTicket).catch((error) => {
        console.error('[EMAIL_ERROR] Erro ao enviar confirmação:', error);
      });

      // Email de notificação para gestores
      sendNotificationToManagers(newTicket).catch((error) => {
        console.error('[EMAIL_ERROR] Erro ao enviar notificação:', error);
      });
    } else {
      console.warn(
        '[EMAIL_WARNING] EMAIL_FROM ou NEXT_PUBLIC_BASE_URL não definidos',
      );
    }

    // 8. Retornar sucesso
    return NextResponse.json(
      {
        success: true,
        ticket: newTicket,
        message: 'Chamado criado com sucesso',
      },
      { status: 201 },
    );
    /* eslint-disable @typescript-eslint/no-explicit-any */
  } catch (error: any) {
    console.error('[API_TICKETS_POST_ERROR]', error);

    // Tratamento de erros específicos do Prisma
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Área ou usuário não encontrado' },
        { status: 404 },
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflito de dados únicos (ticketId duplicado)' },
        { status: 409 },
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Referência inválida (areaId ou userId)' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 },
    );
  }
}

/**
 * Envia email de confirmação para o solicitante
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function sendConfirmationToRequester(ticket: any): Promise<void> {
  try {
    // Verificar se o solicitante tem email e nome
    if (!ticket.requester.email || !ticket.requester.name) {
      console.warn(
        `[EMAIL_WARNING] Solicitante sem email ou nome: ${ticket.requester.id}`,
      );
      return;
    }

    const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/tickets/${ticket.id}`;

    // Enviar email de confirmação
    await resend.emails.send({
      from: fromEmail!,
      to: ticket.requester.email,
      subject: `✅ Chamado Criado: ${ticket.ticketId}`,
      react: React.createElement(TicketConfirmationEmail, {
        requesterName: ticket.requester.name,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        ticketPriority: ticket.priority,
        ticketUrl,
        ticketId: ticket.ticketId,
        areaName: ticket.area.name,
        location: ticket.location,
        equipment: ticket.equipment,
        createdAt: ticket.createdAt,
      }),
    });

    console.log(
      `[EMAIL_SUCCESS] Confirmação enviada para: ${ticket.requester.email}`,
    );
  } catch (error) {
    console.error(
      `[EMAIL_ERROR] Erro ao enviar confirmação para ${ticket.requester.email}:`,
      error,
    );
    throw error;
  }
}

/**
 * Envia notificação por email para os gestores da área
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function sendNotificationToManagers(ticket: any): Promise<void> {
  try {
    // Buscar gestores da área
    const managers = await db.user.findMany({
      where: {
        role: Role.MANAGER,
        areaId: ticket.areaId,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (managers.length === 0) {
      console.warn(
        `[EMAIL_WARNING] Nenhum gestor encontrado para área: ${ticket.area.name}`,
      );
      return;
    }

    const ticketUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/tickets/${ticket.id}`;

    // Enviar email para cada gestor
    const emailPromises = managers
      .filter((manager) => manager.email && manager.name)
      .map(async (manager) => {
        try {
          await resend.emails.send({
            from: fromEmail!,
            to: manager.email!,
            subject: `🎯 Novo Chamado ${ticket.ticketId}: ${ticket.title}`,
            react: React.createElement(NewTicketEmail, {
              managerName: manager.name!,
              requesterName: ticket.requester.name || 'Solicitante',
              ticketTitle: ticket.title,
              ticketPriority: ticket.priority,
              ticketUrl,
              ticketId: ticket.ticketId,
              areaName: ticket.area.name,
              createdAt: ticket.createdAt,
            }),
          });

          console.log(
            `[EMAIL_SUCCESS] Email enviado para gestor: ${manager.email}`,
          );
        } catch (error) {
          console.error(
            `[EMAIL_ERROR] Erro ao enviar para ${manager.email}:`,
            error,
          );
          throw error; // Re-throw para ser capturado no Promise.allSettled
        }
      });

    // Aguardar todos os emails (mesmo se alguns falharem)
    const results = await Promise.allSettled(emailPromises);

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    console.log(
      `[EMAIL_SUMMARY] Gestores - Enviados: ${successCount}, Falhas: ${failureCount}`,
    );
  } catch (error) {
    console.error('[EMAIL_ERROR] Erro geral ao enviar notificações:', error);
    throw error;
  }
}
