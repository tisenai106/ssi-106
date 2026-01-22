import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { Prisma, Role, Status, Priority, AreaName } from '@prisma/client';
import { endOfDay, format, subMonths } from 'date-fns'; // Importar 'endOfDay'

// Componentes da Página
import { TicketFilters } from './ticket-filters';
import { DataTable } from './data-table';
import { columns, TicketComRelacoes } from './columns';

// Componentes (usando os seus caminhos)
import {
  Ticket,
  FolderKanban,
  Clock,
  CheckCircle,
  TicketPlusIcon,
  RefreshCcw,
  PauseIcon,
} from 'lucide-react';
import db from '@/app/_lib/prisma'; // (O seu caminho para o Prisma)
import { StatCard } from '@/app/_components/stat-card'; // (Ajuste este caminho se necessário)
import { Button } from '@/app/_components/ui/button';
import Link from 'next/link';
import { ptBR } from 'date-fns/locale';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Props que a página recebe (agora inclui 'technician')
interface TicketsPageProps {
  searchParams: Promise<{
    status?: Status;
    priority?: Priority;
    page?: string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
    technician?: string; // Filtro de Técnico
    area?: string;
  }>;
}

const ITEMS_PER_PAGE = 20;

//TODO: REFATORAR ESTE CÓDIGO PARA MELHORAR DESEMPENHO DAS QUERIES
// --- CONFIGURAÇÃO DE EXCEÇÕES (Hardcode) ---
const MULTI_AREA_MANAGERS: Record<string, string[]> = {
  'everaldo.reis@sp.senai.br': [
    'cmko730c70001o4fs97u0lxtb',
    'cmko730fm0002o4fs6iap316v',
  ],
};

// O Server Component (A Página)
export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  // 1.1. Obter a sessão
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const { id: userId, role, areaId, email } = session.user;
  const isSuperAdmin = role === Role.SUPER_ADMIN;

  const formattedDate = format(new Date(), 'dd/MM/yyyy, HH:mm', {
    locale: ptBR,
  });

  // 1.2. Validar Parâmetros da URL (com 'await' para resolver a Promise)
  const resolvedSearchParams = await searchParams;
  const statusFilter = resolvedSearchParams.status;
  const priorityFilter = resolvedSearchParams.priority;
  const page = parseInt(resolvedSearchParams.page || '1', 10);
  const searchFilter = resolvedSearchParams.search;
  const skip = (page - 1) * ITEMS_PER_PAGE;
  const sort = resolvedSearchParams.sort || 'createdAt';
  const order = resolvedSearchParams.order || 'desc';
  const startDate = resolvedSearchParams.startDate;
  const endDate = resolvedSearchParams.endDate;
  const technicianFilter = resolvedSearchParams.technician;
  const areaFilter = resolvedSearchParams.area;

  // Verificar se é multi-area manager ANTES de construir o where
  const isMultiAreaManager = !!(email && MULTI_AREA_MANAGERS[email]);

  // 1.3. Construir a Cláusula 'where' (RBAC + Filtros)
  let where: Prisma.TicketWhereInput = {};

  // RBAC
  if (role === Role.COMMON) {
    where = { requesterId: userId };
  } else if (role === Role.TECHNICIAN) {
    where = { technicianId: userId };
  } else if (role === Role.MANAGER) {
    // --- LÓGICA DE EXCEÇÃO ---
    if (isMultiAreaManager) {
      where = { areaId: { in: MULTI_AREA_MANAGERS[email!] } };
    } else {
      if (!areaId) {
        where = { id: 'impossivel' };
      } else {
        where = { areaId: areaId as string };
      }
    }
  }

  // Filtros de Select
  if (statusFilter) {
    where.status = statusFilter;
  }
  if (priorityFilter) {
    where.priority = priorityFilter;
  }

  // Filtro de Pesquisa (OR)
  if (searchFilter) {
    where.OR = [
      { ticketId: { contains: searchFilter, mode: 'insensitive' } },
      { id: { equals: searchFilter } },
      { title: { contains: searchFilter, mode: 'insensitive' } },
      { description: { contains: searchFilter, mode: 'insensitive' } },
      { equipment: { contains: searchFilter, mode: 'insensitive' } },
      { assetTag: { contains: searchFilter, mode: 'insensitive' } },
    ];
  }

  // Filtro de Data
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (startDate) {
    createdAtFilter.gte = new Date(startDate);
  }
  if (endDate) {
    createdAtFilter.lte = endOfDay(new Date(endDate));
  }
  if (startDate || endDate) {
    where.createdAt = createdAtFilter;
  }

  // Filtro de Técnico
  if (technicianFilter) {
    if (technicianFilter === 'unassigned') {
      where.technicianId = null;
    } else {
      where.technicianId = technicianFilter;
    }
  }

  // Filtro de Área - CORRIGIDO
  if (areaFilter) {
    if (isSuperAdmin) {
      where.areaId = areaFilter;
    } else if (
      isMultiAreaManager &&
      MULTI_AREA_MANAGERS[email!].includes(areaFilter)
    ) {
      where.areaId = areaFilter;
    }
  }

  // 1.4. Construir a Cláusula 'orderBy'
  const orderBy: Prisma.TicketOrderByWithRelationInput = {};
  if (
    sort === 'id' ||
    sort === 'title' ||
    sort === 'status' ||
    sort === 'priority' ||
    sort === 'createdAt' ||
    sort === 'area'
  ) {
    orderBy[sort] = order;
  } else {
    orderBy.createdAt = 'desc'; // Fallback
  }

  // 1.5. Executar todas as queries em paralelo
  const statsQuery = db.ticket.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: where,
  });

  const totalTicketsQuery = db.ticket.count({
    where: where,
  });

  const ticketsQuery = db.ticket.findMany({
    where,
    include: {
      requester: { select: { name: true } },
      area: { select: { name: true } },
      technician: { select: { name: true, photoUrl: true } },
    },
    orderBy: orderBy,
    take: ITEMS_PER_PAGE,
    skip: skip,
  });

  // Query (Nova) para buscar a lista de técnicos (com RBAC)
  let technicianListQuery: Promise<any[]>;
  if (role === Role.SUPER_ADMIN) {
    technicianListQuery = db.user.findMany({
      where: { role: Role.TECHNICIAN },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } else if (role === Role.MANAGER) {
    technicianListQuery = db.user.findMany({
      where: {
        role: Role.TECHNICIAN,
        areaId: areaId,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } else {
    technicianListQuery = Promise.resolve([]); // Vazio para COMMON/TECHNICIAN
  }
  const twoMonthsAgo = subMonths(new Date(), 2);
  const oneMonthAgo = subMonths(new Date(), 1);

  const currentPeriodDataQuery = db.ticket.findMany({
    where: {
      ...where,
      createdAt: { gte: oneMonthAgo },
    },
    select: { status: true, createdAt: true, resolvedAt: true },
  });

  const previousPeriodDataQuery = db.ticket.findMany({
    where: {
      ...where,
      createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo },
    },
    select: { status: true, createdAt: true, resolvedAt: true },
  });

  // Determinar se pode filtrar por área
  const canFilterArea: boolean = isSuperAdmin || isMultiAreaManager;

  // Query para buscar a lista de Áreas
  let areaListQuery: Promise<{ id: string; name: AreaName }[]> =
    Promise.resolve([]);
  if (isSuperAdmin) {
    areaListQuery = db.area.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } else if (isMultiAreaManager) {
    // Busca apenas as áreas que ele gere
    areaListQuery = db.area.findMany({
      where: { id: { in: MULTI_AREA_MANAGERS[email!] } },
      select: { id: true, name: true },
    });
  }

  // Resolver todas as queries
  const [
    stats,
    totalTickets,
    tickets,
    technicianList,
    currentPeriodData,
    previousPeriodData,
    areaList,
  ] = await Promise.all([
    statsQuery,
    totalTicketsQuery,
    ticketsQuery,
    technicianListQuery,
    currentPeriodDataQuery,
    previousPeriodDataQuery,
    areaListQuery,
  ]);

  const formattedStats = {
    [Status.OPEN]: 0,
    [Status.ASSIGNED]: 0,
    [Status.IN_PROGRESS]: 0,
    [Status.ON_HOLD]: 0,
    [Status.RESOLVED]: 0,
    [Status.CLOSED]: 0,
    [Status.CANCELLED]: 0,
  };
  for (const group of stats) {
    formattedStats[group.status] = group._count._all;
  }

  // Calcular Trends dos Cards
  const totalTrend = calculateTrend(
    currentPeriodData,
    previousPeriodData,
    () => true,
  );

  const newTicketsTrend = calculateTrend(
    currentPeriodData,
    previousPeriodData,
    (t) => t.status === Status.OPEN,
  );

  const inProgressTrend = calculateTrend(
    currentPeriodData,
    previousPeriodData,
    (t) => t.status === Status.IN_PROGRESS || t.status === Status.ASSIGNED,
  );

  const resolvedTrend = calculateTrend(
    currentPeriodData,
    previousPeriodData,
    (t) => t.status === Status.RESOLVED,
  );

  const onHoldTrend = calculateTrend(
    currentPeriodData,
    previousPeriodData,
    (t) => t.status === Status.ON_HOLD,
  );

  // --- Função Auxiliar 3 (para calcular Trends) ---
  function calculateTrend(
    currentPeriodData: any[],
    previousPeriodData: any[],
    filterFn: (item: any) => boolean,
  ): { value: number; isPositive: boolean } | undefined {
    const currentCount = currentPeriodData.filter(filterFn).length;
    const previousCount = previousPeriodData.filter(filterFn).length;

    if (previousCount === 0) return undefined;

    const percentChange =
      ((currentCount - previousCount) / previousCount) * 100;

    return {
      value: Math.abs(Math.round(percentChange)),
      isPositive: percentChange >= 0,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="p-4 pt-4 md:p-6 lg:p-8 lg:pt-6">
        {/* HEADER RESPONSIVO */}
        <header className="mb-4 flex flex-col justify-between space-y-4 md:flex-row">
          {/* Título e Saudação */}

          <div>
            <h1 className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-bold text-transparent md:text-3xl dark:from-white dark:to-slate-300">
              Gerenciamento de tickets
            </h1>
            <p className="text-sm text-slate-600 md:text-base dark:text-slate-400">
              Visualize e gerencie todos os chamados.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-end">
            <Button
              asChild
              size="default"
              className="w-full bg-linear-to-r from-blue-500 to-indigo-800 text-white md:w-fit"
            >
              <Link href="/tickets/new">
                <TicketPlusIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Abrir Novo Chamado</span>
                <span className="sm:hidden">Novo Chamado</span>
              </Link>
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 sm:justify-end sm:text-sm dark:text-slate-400">
              <RefreshCcw className="h-3 w-3 animate-spin sm:h-4 sm:w-4" />
              <span className="hidden md:inline">
                Última atualização: {formattedDate}
              </span>
              <span className="md:hidden">
                {format(new Date(), 'HH:mm', { locale: ptBR })}
              </span>
            </div>
          </div>
        </header>

        {/* 2. Cards de Estatísticas */}

        <div className="mb-6 grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-5">
          <StatCard
            title="Total"
            value={totalTickets}
            icon={<Ticket className="h-4 w-4 md:h-5 md:w-5" />}
            trend={totalTrend}
          />
          <StatCard
            title="Novos"
            value={formattedStats.OPEN}
            icon={<FolderKanban className="h-4 w-4 md:h-5 md:w-5" />}
            trend={newTicketsTrend}
          />
          <StatCard
            title="Em Andamento"
            value={formattedStats.IN_PROGRESS + formattedStats.ASSIGNED}
            icon={<Clock className="h-4 w-4 md:h-5 md:w-5" />}
            trend={inProgressTrend}
          />
          <StatCard
            title="Em Espera"
            value={formattedStats.ON_HOLD}
            icon={<PauseIcon className="h-4 w-4 md:h-5 md:w-5" />}
            trend={onHoldTrend}
          />
          <StatCard
            title="Concluídos"
            value={formattedStats.RESOLVED + formattedStats.CLOSED}
            icon={<CheckCircle className="h-4 w-4 md:h-5 md:w-5" />}
            trend={resolvedTrend}
          />
        </div>

        {/* 3. Filtros (Client Component) */}
        <div>
          <TicketFilters
            statuses={Object.values(Status)}
            priorities={Object.values(Priority)}
            technicians={technicianList}
            areas={areaList as { id: string; name: AreaName }[]}
            isSuperAdmin={canFilterArea}
          />
        </div>

        {/* 4. Lista de Chamados (Data Table) */}
        <div className="mt-6">
          <DataTable
            columns={columns}
            data={tickets as TicketComRelacoes[]}
            statuses={Object.values(Status)}
          />
        </div>
      </div>
    </div>
  );
}
