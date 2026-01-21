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

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  initialPassword?: string;
  loginUrl: string;
}

export const WelcomeEmail = ({
  userName,
  userEmail,
  initialPassword = 'Mudar123!',
  loginUrl,
}: WelcomeEmailProps) => {
  const previewText = `Bem-vindo ao Portal de Chamados, ${userName}!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header com gradiente */}
          <Section style={header}>
            <div style={iconContainer}>
              <div style={iconCircle}>🎉</div>
            </div>
            <Heading style={headerTitle}>Bem-vindo!</Heading>
            <Text style={headerSubtitle}>Sua conta foi criada com sucesso</Text>
          </Section>

          {/* Conteúdo principal */}
          <Section style={content}>
            <Text style={greeting}>Olá, {userName}! 👋</Text>

            <Text style={text}>
              Estamos felizes em tê-lo conosco! Sua conta no{' '}
              <strong style={brandText}>SSI 1.06</strong> foi criada e já está
              pronta para uso.
            </Text>

            <Text style={text}>Agora você tem acesso completo para:</Text>

            {/* Lista de recursos */}
            <Section style={featuresList}>
              <div style={featureItem}>
                <span style={featureIcon}>🎫</span>
                <div style={featureContent}>
                  <Text style={featureTitle}>Abrir Chamados</Text>
                  <Text style={featureDesc}>
                    TI, Manutenção e Elétrica em um só lugar
                  </Text>
                </div>
              </div>
              <div style={featureItem}>
                <span style={featureIcon}>📊</span>
                <div style={featureContent}>
                  <Text style={featureTitle}>Acompanhar Status</Text>
                  <Text style={featureDesc}>
                    Visualize o progresso em tempo real
                  </Text>
                </div>
              </div>
              <div style={featureItem}>
                <span style={featureIcon}>💬</span>
                <div style={featureContent}>
                  <Text style={featureTitle}>Comunicação Direta</Text>
                  <Text style={featureDesc}>
                    Interaja com a equipe responsável
                  </Text>
                </div>
              </div>
            </Section>

            {/* Credenciais */}
            <Section style={credentialsSection}>
              <Text style={credentialsHeading}>
                🔐 Suas Credenciais de Acesso
              </Text>
              <div style={credentialBox}>
                <div style={credentialRow}>
                  <Text style={credentialLabel}>Login:</Text>
                  <Text style={credentialValue}>{userEmail}</Text>
                </div>
                <Hr style={credentialDivider} />
                <div style={credentialRow}>
                  <Text style={credentialLabel}>Senha Provisória:</Text>
                  <Text style={credentialValue}>{initialPassword}</Text>
                </div>
              </div>
            </Section>

            {/* Botão de ação */}
            <Section style={btnContainer}>
              <Button style={button} href={loginUrl}>
                Acessar o Portal Agora
              </Button>
            </Section>

            {/* Aviso importante */}
            <Section style={warningBox}>
              <Text style={warningTitle}>⚠️ Ação Necessária</Text>
              <Text style={warningText}>
                Por segurança, <strong>altere sua senha</strong> imediatamente
                após o primeiro acesso. Vá em{' '}
                <strong>Minha Conta → Alterar Senha</strong>.
              </Text>
            </Section>

            {/* Dicas de primeiros passos */}
            <Section style={tipsBox}>
              <Text style={tipsTitle}>💡 Primeiros Passos:</Text>
              <div style={tipsList}>
                <Text style={tipItem}>
                  <strong>1.</strong> Faça login com suas credenciais
                </Text>
                <Text style={tipItem}>
                  <strong>2.</strong> Altere sua senha provisória
                </Text>
                <Text style={tipItem}>
                  <strong>3.</strong> Complete seu perfil
                </Text>
                <Text style={tipItem}>
                  <strong>4.</strong> Explore o sistema e abra seu primeiro
                  chamado
                </Text>
              </div>
            </Section>

            {/* Suporte */}
            <Section style={supportBox}>
              <Text style={supportText}>
                <strong>Precisa de ajuda?</strong> Nossa equipe está pronta para
                auxiliá-lo. Entre em contato através do próprio portal ou pelo
                email de suporte.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerHr} />
            <Text style={footerText}>
              <strong>Sistema de Solicitações Internas - SSI</strong>
            </Text>
            <Text style={footerSubtext}>
              Este é um email automático, por favor não responda.
            </Text>
            <Text style={footerSubtext}>
              © {new Date().getFullYear()} Todos os direitos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Estilos modernizados
const main = {
  backgroundColor: '#f0f4f8',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 10px 20px rgba(0, 0, 0, 0.05)',
  maxWidth: '600px',
};

const header = {
  background: 'green',
  padding: '40px 30px',
  textAlign: 'center' as const,
};

const iconContainer = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: '20px',
};

const iconCircle = {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: '50%',
  width: '80px',
  height: '80px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '40px',
  border: '3px solid rgba(255, 255, 255, 0.3)',
};

const headerTitle = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#ffffff',
  margin: '0 0 8px 0',
  textAlign: 'center' as const,
};

const headerSubtitle = {
  fontSize: '16px',
  color: 'rgba(255, 255, 255, 0.9)',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  padding: '40px 30px',
};

const greeting = {
  fontSize: '20px',
  color: '#2d3748',
  margin: '0 0 20px 0',
  fontWeight: '600',
};

const text = {
  color: '#4a5568',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const brandText = {
  color: '#667eea',
  fontWeight: '600',
};

const featuresList = {
  margin: '24px 0',
};

const featureItem = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '20px',
  padding: '16px',
  backgroundColor: '#f7fafc',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
};

const featureIcon = {
  fontSize: '28px',
  flexShrink: 0,
};

const featureContent = {
  flex: 1,
};

const featureTitle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0 0 4px 0',
};

const featureDesc = {
  fontSize: '14px',
  color: '#718096',
  margin: '0',
  lineHeight: '20px',
};

const credentialsSection = {
  margin: '32px 0',
};

const credentialsHeading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#2d3748',
  margin: '0 0 16px 0',
};

const credentialBox = {
  backgroundColor: '#f7fafc',
  border: '2px solid #667eea',
  borderRadius: '8px',
  padding: '24px',
};

const credentialRow = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '4px',
};

const credentialLabel = {
  fontSize: '13px',
  color: '#718096',
  fontWeight: '500',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const credentialValue = {
  fontSize: '16px',
  color: '#2d3748',
  fontWeight: '600',
  margin: '0',
  fontFamily: 'monospace',
};

const credentialDivider = {
  borderColor: '#e2e8f0',
  margin: '16px 0',
};

const btnContainer = {
  textAlign: 'center' as const,
  padding: '32px 0',
};

const button = {
  background: 'green',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '16px 40px',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
};

const warningBox = {
  backgroundColor: '#fef5e7',
  borderLeft: '4px solid #f39c12',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
};

const warningTitle = {
  color: '#7d6608',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 8px 0',
};

const warningText = {
  color: '#7d6608',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const tipsBox = {
  backgroundColor: '#ebf8ff',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
  border: '1px solid #bee3f8',
};

const tipsTitle = {
  color: '#2c5282',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px 0',
};

const tipsList = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
};

const tipItem = {
  color: '#2d3748',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const supportBox = {
  backgroundColor: '#f7fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0 0 0',
  textAlign: 'center' as const,
};

const supportText = {
  color: '#4a5568',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const footer = {
  padding: '0 30px 40px',
};

const footerHr = {
  borderColor: '#e2e8f0',
  margin: '0 0 24px 0',
};

const footerText = {
  color: '#2d3748',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0 0 8px 0',
};

const footerSubtext = {
  color: '#a0aec0',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '4px 0',
};

export default WelcomeEmail;
