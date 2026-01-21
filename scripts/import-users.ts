import { PrismaClient, Role } from '@prisma/client';
// 2. CORREÇÃO NA IMPORTAÇÃO DO EXCELJS
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Configuração
const FILE_NAME = 'func.xlsx'; // O nome do seu arquivo na raiz
const DEFAULT_PASSWORD = 'Mudar123!'; // Senha inicial para todos

interface UserRow {
  name: string;
  email: string;
  role?: string;
  areaCode?: string;
}

async function main() {
  const filePath = path.join(process.cwd(), FILE_NAME);

  // Verificar se o arquivo existe
  if (!fs.existsSync(filePath)) {
    console.error(
      `❌ Erro: Arquivo '${FILE_NAME}' não encontrado na raiz do projeto.`,
    );
    process.exit(1);
  }

  console.log(`📖 Lendo arquivo: ${FILE_NAME}...`);

  // Ler o Excel com ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Pega a primeira aba
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    console.error('❌ Erro: O arquivo Excel parece estar vazio ou sem abas.');
    process.exit(1);
  }

  // --- Extrair dados do Excel para JSON ---
  const rows: UserRow[] = [];
  const headers: { [key: number]: string } = {};

  worksheet.eachRow((row, rowNumber) => {
    // Linha 1 = Cabeçalhos
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        // Remove espaços extras dos cabeçalhos (ex: " email " -> "email")
        // Garante que é string
        const headerText = cell.text ? cell.text.toString().trim() : '';
        headers[colNumber] = headerText;
      });
      return;
    }

    // Linhas de Dados
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        // Usa 'text' ou 'value' dependendo do conteúdo
        // Se for um objeto (como hyperlink), tenta pegar o texto, senão converte para string
        let cellValue = cell.text;
        if (!cellValue && cell.value) {
          cellValue = String(cell.value);
        }
        rowData[header] = cellValue;
      }
    });

    // Só adiciona se tiver pelo menos um dado
    if (Object.keys(rowData).length > 0) {
      rows.push(rowData as UserRow);
    }
  });

  console.log(
    `🔍 Encontrados ${rows.length} registros. Iniciando importação...`,
  );

  // Preparar hash da senha
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Buscar Áreas existentes para mapeamento (Cache)
  const areas = await prisma.area.findMany();
  const areaMap = new Map(areas.map((a) => [a.code.toUpperCase(), a.id]));

  let successCount = 0;
  let errorCount = 0;

  // Iterar e Criar
  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2; // +2 porque o Excel começa no 1 e tem cabeçalho

    try {
      // Validações básicas
      if (!row.email || !row.name) {
        console.warn(`⚠️ Linha ${rowNum}: Nome ou Email faltando. Pulando.`);
        errorCount++;
        continue;
      }

      // Normalizar Email
      const email = row.email.trim().toLowerCase();

      // Verificar se já existe
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        console.warn(
          `⚠️ Linha ${rowNum}: Usuário ${email} já existe. Pulando.`,
        );
        errorCount++;
        continue;
      }

      // Resolver Role (Padrão: COMMON)
      let role: Role = Role.COMMON;
      if (
        row.role &&
        Object.values(Role).includes(row.role.toUpperCase() as Role)
      ) {
        role = row.role.toUpperCase() as Role;
      }

      // Resolver Área
      let areaId: string | null = null;
      if (row.areaCode) {
        const code = row.areaCode.toString().toUpperCase().trim();
        if (areaMap.has(code)) {
          areaId = areaMap.get(code) || null;
        } else {
          console.warn(
            `   -> Aviso: Área código '${row.areaCode}' não encontrada. Usuário será criado sem área.`,
          );
        }
      }

      // Criar no Banco
      await prisma.user.create({
        data: {
          name: row.name,
          email: email,
          passwordHash: passwordHash,
          role: role,
          areaId: areaId,
        },
      });

      console.log(`✅ Linha ${rowNum}: ${row.name} (${role}) criado.`);
      successCount++;
    } catch (error) {
      console.error(`❌ Erro fatal na linha ${rowNum}:`, error);
      errorCount++;
    }
  }

  console.log('\n------------------------------------------------');
  console.log(`🏁 Importação finalizada.`);
  console.log(`✅ Sucesso: ${successCount}`);
  console.log(`❌ Erros/Pulos: ${errorCount}`);
  console.log(`🔑 Senha padrão definida: ${DEFAULT_PASSWORD}`);
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
