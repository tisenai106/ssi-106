/**
 * COMO RODAR ESTE SCRIPT:
 * npx tsx scripts/send-welcome-emails.ts
 */

import * as dotenv from 'dotenv';
// Carrega as variáveis do .env.local
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import React from 'react';

// Importação do Template
// (O tsx resolve extensões e aliases, mas mantemos relativo para compatibilidade máxima)
import { WelcomeEmail } from '../src/emails/welcome-email';

const prisma = new PrismaClient();

// Configuração
const DEFAULT_PASSWORD = 'Mudar123!';
const DELAY_BETWEEN_EMAILS = 1000; // 1 segundo de pausa entre cada email (evita bloqueios)

// Validação das Variáveis de Ambiente
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const BASE_URL = 'www.ssi-106.com.br';

if (!RESEND_API_KEY) {
  console.error(
    '❌ Erro: RESEND_API_KEY não encontrada nas variáveis de ambiente (.env.local).',
  );
  process.exit(1);
}
if (!EMAIL_FROM) {
  console.error(
    '❌ Erro: EMAIL_FROM não encontrada nas variáveis de ambiente (.env.local).',
  );
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Função de espera simples
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    '🚀 Iniciando envio de emails de boas-vindas (Modo Sequencial)...',
  );
  console.log(`📡 URL do Sistema: ${BASE_URL}`);
  console.log(`📧 Remetente: ${EMAIL_FROM}`);

  // 1. Buscar todos os utilizadores
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
    },
    // Dica: Pode descomentar abaixo para testar com apenas um utilizador específico primeiro
    // where: { email: 'seu.email@teste.com' }
  });

  console.log(`📋 Total de utilizadores encontrados: ${users.length}`);
  console.log('------------------------------------------------');

  let sentCount = 0;
  let errorCount = 0;

  // 2. Loop Sequencial (Um por um)
  // Usamos 'for...of' em vez de 'map' para garantir que o 'await' pausa a execução
  for (const [index, user] of users.entries()) {
    const current = index + 1;
    process.stdout.write(
      `[${current}/${users.length}] Enviando para ${user.email}... `,
    );

    try {
      const { data, error } = await resend.emails.send({
        from: EMAIL_FROM!,
        to: user.email,
        subject: 'Bem-vindo ao Portal de Chamados - Suas Credenciais',
        react: React.createElement(WelcomeEmail, {
          userName: user.name,
          userEmail: user.email,
          initialPassword: DEFAULT_PASSWORD,
          loginUrl: `${BASE_URL}/login`,
        }),
      });

      if (error) {
        console.log(`❌ Falha!`);
        console.error(`   Detalhe do erro:`, error);
        errorCount++;
      } else {
        console.log(`✅ Sucesso! ID: ${data?.id}`);
        sentCount++;
      }
      /* eslint-disable @typescript-eslint/no-explicit-any */
    } catch (err: any) {
      console.log(`❌ Erro Crítico!`);
      console.error(`   ${err.message}`);
      errorCount++;
    }

    // Pausa de segurança entre envios para respeitar o Rate Limit da API
    if (current < users.length) {
      await sleep(DELAY_BETWEEN_EMAILS);
    }
  }

  console.log('\n------------------------------------------------');
  console.log('🏁 Processo finalizado.');
  console.log(`✅ Enviados com sucesso: ${sentCount}`);
  console.log(`❌ Falhas: ${errorCount}`);
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
