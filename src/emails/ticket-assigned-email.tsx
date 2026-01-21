/*
 * Template de email para "Chamado Atribuído" modernizado
 * Enviado ao técnico quando ele é designado para um chamado.
 */
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

interface TicketAssignedEmailProps {
  technicianName: string;
  requesterName: string;
  ticketTitle: string;
  ticketPriority: string;
  ticketUrl: string;
  ticketId?: string;
  areaName?: string;
  location?: string;
  equipment?: string;
  assignedAt?: Date;
}

const priorityConfig: Record<
  string,
  { bg: string; text: string; border: string; label: string; gradient: string }
> = {
  URGENT: {
    bg: '#fef2f2',
    text: '#991b1b',
    border: '#fca5a5',
    label: '🔴 Urgente',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  },
  HIGH: {
    bg: '#fff7ed',
    text: '#c2410c',
    border: '#fdba74',
    label: '🟠 Alta',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  },
  MEDIUM: {
    bg: '#fef3c7',
    text: '#92400e',
    border: '#fcd34d',
    label: '🟡 Média',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  },
  LOW: {
    bg: '#f1f5f9',
    text: '#475569',
    border: '#cbd5e1',
    label: '⚪ Baixa',
    gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
  },
};

export const TicketAssignedEmail = ({
  technicianName,
  requesterName,
  ticketTitle,
  ticketPriority,
  ticketUrl,
  ticketId,
  areaName,
  location,
  equipment,
  assignedAt,
}: TicketAssignedEmailProps) => {
  const previewText = `🎯 Novo chamado atribuído: ${ticketTitle}`;
  const priority = priorityConfig[ticketPriority] || priorityConfig.MEDIUM;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header com gradiente */}
          <Section style={header}>
            <Text style={iconText}>🎯</Text>

            <Heading style={heading}>Novo Chamado Atribuído</Heading>
            <Text style={subheading}>Um chamado foi designado para você</Text>
          </Section>

          {/* Conteúdo principal */}
          <Section style={content}>
            {/* Saudação */}
            <Text style={greeting}>
              Olá <strong style={strongText}>{technicianName}</strong> 👋
            </Text>

            <Text style={descriptionText}>
              Um novo chamado foi atribuído à sua fila de atendimento e aguarda
              sua ação. Por favor, revise os detalhes e inicie o atendimento o
              mais breve possível.
            </Text>

            {/* Badge de Prioridade */}
            <Section style={prioritySection}>
              <div
                style={{
                  ...priorityBadge,
                  backgroundColor: priority.bg,
                  borderColor: priority.border,
                }}
              >
                <Text
                  style={{
                    ...priorityText,
                    color: priority.text,
                  }}
                >
                  {priority.label}
                </Text>
              </div>
            </Section>

            {/* Card do Ticket */}
            <Section style={ticketCard}>
              <Text style={ticketLabel}>Título do Chamado</Text>
              <Text style={ticketTitleStyle}>{ticketTitle}</Text>
            </Section>

            {/* Grid de Detalhes */}
            <Section style={detailsGrid}>
              {/* Solicitante */}
              <Section style={detailCard}>
                <Text style={detailIcon}>👤</Text>
                <Text style={detailLabel}>Solicitante</Text>
                <Text style={detailValue}>{requesterName}</Text>
              </Section>

              {/* ID do Chamado */}
              {ticketId && (
                <Section style={detailCard}>
                  <Text style={detailIcon}>🔖</Text>
                  <Text style={detailLabel}>ID do Chamado</Text>
                  <Text style={detailValue}>{ticketId}</Text>
                </Section>
              )}

              {/* Área */}
              {areaName && (
                <Section style={detailCard}>
                  <Text style={detailIcon}>🏢</Text>
                  <Text style={detailLabel}>Área</Text>
                  <Text style={detailValue}>{areaName}</Text>
                </Section>
              )}

              {/* Localização */}
              {location && (
                <Section style={detailCard}>
                  <Text style={detailIcon}>📍</Text>
                  <Text style={detailLabel}>Localização</Text>
                  <Text style={detailValue}>{location}</Text>
                </Section>
              )}

              {/* Equipamento */}
              {equipment && (
                <Section style={detailCard}>
                  <Text style={detailIcon}>🔧</Text>
                  <Text style={detailLabel}>Equipamento</Text>
                  <Text style={detailValue}>{equipment}</Text>
                </Section>
              )}

              {/* Data de Atribuição */}
              {assignedAt && (
                <Section style={detailCard}>
                  <Text style={detailIcon}>📅</Text>
                  <Text style={detailLabel}>Atribuído em</Text>
                  <Text style={detailValue}>
                    {assignedAt.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Section>
              )}
            </Section>

            {/* Call to Action Highlight */}
            <Section style={ctaHighlight}>
              <Text style={ctaHighlightIcon}>⚡</Text>
              <Text style={ctaHighlightTitle}>Ação Necessária</Text>
              <Text style={ctaHighlightText}>
                Este chamado está aguardando seu atendimento. Acesse agora para
                revisar todos os detalhes e iniciar o trabalho.
              </Text>
            </Section>

            {/* Botão de ação */}
            <Section style={btnContainer}>
              <Button style={button} href={ticketUrl}>
                <Text style={buttonText}>Acessar Chamado Completo →</Text>
              </Button>
            </Section>

            {/* Link alternativo */}
            <Text style={helpText}>
              Ou copie e cole este link no navegador:
              <br />
              <a href={ticketUrl} style={linkStyle}>
                {ticketUrl}
              </a>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              <strong>SSI 1.06</strong>
            </Text>
            <Text style={footerSubtext}>
              Gerenciamento Inteligente de Chamados
            </Text>
            <Text style={footerNote}>
              Este é um email automático. Por favor, não responda diretamente a
              esta mensagem.
            </Text>
          </Section>
        </Container>

        {/* Badge de segurança */}
        <Section style={securityBadge}>
          <Text style={securityText}>🔒 Email seguro e criptografado</Text>
        </Section>
      </Body>
    </Html>
  );
};

/* ============================
   ESTILOS MODERNOS
   ============================ */

const main = {
  backgroundColor: '#f1f5f9',
  padding: '40px 20px',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  width: '100%',
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '24px',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
};

/* ==== HEADER COM GRADIENTE ==== */
const header = {
  background: 'blue',
  padding: '40px 32px',
  textAlign: 'center' as const,
};

const iconText = {
  fontSize: '32px',
  margin: '0',
  lineHeight: '64px',
  display: 'inline-block',
  verticalAlign: 'middle' as const,
};

const heading = {
  fontSize: '28px',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 8px',
  textShadow: '0 2px 10px rgba(0,0,0,0.1)',
};

const subheading = {
  fontSize: '14px',
  color: 'rgba(255,255,255,0.9)',
  margin: '0',
  fontWeight: 400,
};

/* ==== CONTEÚDO ==== */
const content = {
  padding: '32px',
};

const greeting = {
  fontSize: '18px',
  lineHeight: '28px',
  color: '#475569',
  margin: '0 0 12px',
  fontWeight: 600,
};

const strongText = {
  color: '#1e293b',
  fontWeight: 700,
};

const descriptionText = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#64748b',
  margin: '0 0 24px',
};

/* ==== BADGE DE PRIORIDADE ==== */
const prioritySection = {
  marginBottom: '20px',
};

const priorityBadge = {
  display: 'inline-block',
  padding: '10px 20px',
  borderRadius: '24px',
  border: '2px solid',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const priorityText = {
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '0.3px',
  margin: '0',
};

/* ==== CARD DO TICKET ==== */
const ticketCard = {
  backgroundColor: '#f8fafc',
  border: '2px solid #e2e8f0',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
};

const ticketLabel = {
  fontSize: '11px',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px',
};

const ticketTitleStyle = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#1e293b',
  margin: '0',
  lineHeight: '28px',
};

/* ==== GRID DE DETALHES ==== */
const detailsGrid = {
  marginBottom: '24px',
};

const detailCard = {
  backgroundColor: '#ffffff',
  border: '2px solid #e2e8f0',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
  textAlign: 'center' as const,
};

const detailIcon = {
  fontSize: '24px',
  margin: '0 0 8px',
  display: 'block',
};

const detailLabel = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
  display: 'block',
};

const detailValue = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#1e293b',
  margin: '0',
  display: 'block',
};

/* ==== CTA HIGHLIGHT ==== */
const ctaHighlight = {
  backgroundColor: '#fffbeb',
  border: '2px solid #fcd34d',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const ctaHighlightIcon = {
  fontSize: '32px',
  margin: '0 0 12px',
  display: 'block',
};

const ctaHighlightTitle = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#92400e',
  margin: '0 0 8px',
};

const ctaHighlightText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#78350f',
  margin: '0',
};

/* ==== BOTÃO ==== */
const btnContainer = {
  textAlign: 'center' as const,
  marginBottom: '20px',
};

const button = {
  background: 'blue',
  color: '#ffffff',
  padding: '16px 32px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontSize: '16px',
  display: 'inline-block',
  fontWeight: 600,
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
  border: 'none',
};

const buttonText = {
  margin: '0',
  color: '#ffffff',
};

const helpText = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#94a3b8',
  margin: '0',
  textAlign: 'center' as const,
};

const linkStyle = {
  color: '#3b82f6',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

/* ==== FOOTER ==== */
const hr = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footer = {
  padding: '32px',
  textAlign: 'center' as const,
  backgroundColor: '#f8fafc',
};

const footerText = {
  fontSize: '16px',
  color: '#1e293b',
  margin: '0 0 4px',
  fontWeight: 700,
};

const footerSubtext = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0 0 16px',
};

const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '0',
  fontStyle: 'italic' as const,
};

/* ==== BADGE DE SEGURANÇA ==== */
const securityBadge = {
  textAlign: 'center' as const,
  marginTop: '20px',
};

const securityText = {
  fontSize: '12px',
  color: '#64748b',
  backgroundColor: '#f1f5f9',
  padding: '8px 16px',
  borderRadius: '20px',
  display: 'inline-block',
  margin: '0',
};

export default TicketAssignedEmail;
