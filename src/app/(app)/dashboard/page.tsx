import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { Prisma, Role, Status, Priority } from '@prisma/client';
import db from '@/app/_lib/prisma';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/app/_components/ui/button';
import {
  Ticket,
  FolderKanban,
  Clock,
  CheckCircle,
  RefreshCcw,
  TicketPlusIcon,
  PauseIcon,
} from 'lucide-react';
import { StatusChart } from './status-chart';
import { PriorityChart } from './priority-chart';
import { TrendChart } from './trend-chart';
import { StatCard } from '@/app/_components/stat-card';
import { AreaChart } from './area-chart';
import { RecentTicketsCard } from './recents-tickets-card';
import { PerformanceMetrics } from './performance-metrics';

// --- Função Auxiliar 1 (calcula Tempo Médio E Taxa de SLA) ---
function calculatePerformanceMetrics(
  tickets: {
    createdAt: Date;
    resolvedAt: Date | null;
    slaDeadline: Date | null;
  }[],
) {
  // Estado inicial
  const initialState = {
    avgTime: 'N/A',
    slaRate: 'N/A',
    totalResolved: 0,
    slaCompliance: 'N/A', // <-- Novo
    fastestTime: 'N/A', // <-- Novo
  };

  if (tickets.length === 0) {
    return initialState;
  }

  let totalDurationMs = 0;
  let resolvedCount = 0;
  let resolvedOnTimeCount = 0;
  let minDurationMs = Infinity; // <-- Novo: Para encontrar o mais rápido

  for (const ticket of tickets) {
    if (ticket.resolvedAt) {
      resolvedCount++;

      const durationMs =
        ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
      totalDurationMs += durationMs;

      // Atualiza o mais rápido
      if (durationMs < minDurationMs) {
        minDurationMs = durationMs;
      }

      // Verifica SLA
      if (ticket.slaDeadline && ticket.resolvedAt <= ticket.slaDeadline) {
        resolvedOnTimeCount++;
      }
    }
  }

  if (resolvedCount === 0) {
    return initialState;
  }

  // Calcular Tempo Médio
  const avgMs = totalDurationMs / resolvedCount;
  const avgDays = avgMs / (1000 * 60 * 60 * 24);
  const avgTime = `${avgDays.toFixed(1)} dias`;

  // Calcular Taxa SLA
  const rate = (resolvedOnTimeCount / resolvedCount) * 100;
  const slaRate = `${rate.toFixed(1)}%`;

  // Calcular Insight de Conformidade (SLA Compliance)
  const slaCompliance = `${resolvedOnTimeCount} / ${resolvedCount} no prazo`; // <-- Novo

  // Calcular Tempo Mais Rápido
  let fastestTime = 'N/A';
  if (minDurationMs !== Infinity) {
    const totalSeconds = minDurationMs / 1000;
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) fastestTime = `${days}d ${hours}h`;
    else if (hours > 0) fastestTime = `${hours}h ${minutes}m`;
    else fastestTime = `${Math.max(1, minutes)}m`; // Mínimo de 1 minuto
  }

  return {
    avgTime,
    slaRate,
    totalResolved: resolvedCount,
    slaCompliance,
    fastestTime,
  };
}

// --- Função Auxiliar 2 (para o Gráfico de Tendência) ---
function formatTrendData(
  tickets: { createdAt: Date; resolvedAt: Date | null }[],
) {
  const now = new Date();
  const dataMap = new Map<
    string,
    { month: string; Novos: number; Resolvidos: number }
  >();

  for (let i = 11; i >= 0; i--) {
    const date = subMonths(now, i);
    const monthKey = format(date, 'MMM/yy', { locale: ptBR });
    dataMap.set(monthKey, { month: monthKey, Novos: 0, Resolvidos: 0 });
  }

  for (const ticket of tickets) {
    const createdMonthKey = format(ticket.createdAt, 'MMM/yy', {
      locale: ptBR,
    });
    if (dataMap.has(createdMonthKey)) {
      dataMap.get(createdMonthKey)!.Novos++;
    }

    if (ticket.resolvedAt) {
      const resolvedMonthKey = format(ticket.resolvedAt, 'MMM/yy', {
        locale: ptBR,
      });
      if (dataMap.has(resolvedMonthKey)) {
        dataMap.get(resolvedMonthKey)!.Resolvidos++;
      }
    }
  }

  return Array.from(dataMap.values());
}

// --- Função Auxiliar 3 (para calcular Trends) ---
function calculateTrend(
  currentPeriodData: any[],
  previousPeriodData: any[],
  filterFn: (item: any) => boolean,
): { value: number; isPositive: boolean } | undefined {
  const currentCount = currentPeriodData.filter(filterFn).length;
  const previousCount = previousPeriodData.filter(filterFn).length;

  if (previousCount === 0) {
    // Se o anterior foi 0 e o atual é > 0, é 100% de aumento
    if (currentCount > 0) return { value: 100, isPositive: true };
    return undefined; // De 0 para 0, sem mudança
  }

  const percentChange = ((currentCount - previousCount) / previousCount) * 100;

  return {
    value: Math.abs(Math.round(percentChange)),
    isPositive: percentChange >= 0,
  };
}

// --- Função Auxiliar 4 (calcula trend do tempo médio de resolução) ---
function calculateAvgTimeTrend(
  currentPeriodData: any[],
  previousPeriodData: any[],
): number | undefined {
  const calculateAvgDays = (data: any[]) => {
    const resolved = data.filter((t) => t.resolvedAt);
    if (resolved.length === 0) return null;

    const totalMs = resolved.reduce((sum, t) => {
      return (
        sum +
        (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime())
      );
    }, 0);

    return totalMs / resolved.length / (1000 * 60 * 60 * 24); // em dias
  };

  const currentAvg = calculateAvgDays(currentPeriodData);
  const previousAvg = calculateAvgDays(previousPeriodData);

  if (!currentAvg || !previousAvg || previousAvg === 0) return undefined;

  const percentChange = ((currentAvg - previousAvg) / previousAvg) * 100;
  return Math.round(percentChange);
}

// --- Função Auxiliar 5 (calcula trend da taxa SLA) ---
function calculateSLATrend(
  currentPeriodData: any[],
  previousPeriodData: any[],
): number | undefined {
  const calculateSLARate = (data: any[]) => {
    const resolved = data.filter((t) => t.resolvedAt && t.slaDeadline);
    if (resolved.length === 0) return null;

    const onTime = resolved.filter(
      (t) => new Date(t.resolvedAt!) <= new Date(t.slaDeadline!),
    );

    return (onTime.length / resolved.length) * 100;
  };

  const currentRate = calculateSLARate(currentPeriodData);
  const previousRate = calculateSLARate(previousPeriodData);

  if (currentRate === null || previousRate === null || previousRate === 0) {
    if (currentRate !== null && currentRate > 0) return 100; // De 0% para >0%
    return undefined;
  }

  const percentChange = ((currentRate - previousRate) / previousRate) * 100;
  return Math.round(percentChange);
}

// --- Função Auxiliar 6 (calcula trend de avaliações) ---
function calculateSatisfactionTrend(
  currentPeriodData: any[],
  previousPeriodData: any[],
) {
  const calculateAvgRating = (data: any[]) => {
    const rated = data.filter((t) => t.satisfactionRating !== null);
    if (rated.length === 0) return null;
    const totalRating = rated.reduce(
      (sum, t) => sum + (t.satisfactionRating || 0),
      0,
    );
    return totalRating / rated.length;
  };

  const currentAvg = calculateAvgRating(currentPeriodData);
  const previousAvg = calculateAvgRating(previousPeriodData);

  const currentCount = currentPeriodData.filter(
    (t) => t.satisfactionRating !== null,
  ).length;
  const previousCount = previousPeriodData.filter(
    (t) => t.satisfactionRating !== null,
  ).length;

  let satisfactionTrend: number | undefined = undefined;
  if (currentAvg !== null && previousAvg !== null && previousAvg > 0) {
    satisfactionTrend = Math.round(
      ((currentAvg - previousAvg) / previousAvg) * 100,
    );
  } else if (currentAvg !== null && previousAvg === null) {
    satisfactionTrend = 100; // De 0 para >0
  }

  let ratingsTrend: number | undefined = undefined;
  if (previousCount > 0) {
    ratingsTrend = Math.round(
      ((currentCount - previousCount) / previousCount) * 100,
    );
  } else if (currentCount > 0) {
    ratingsTrend = 100; // De 0 para >0
  }

  return { satisfactionTrend, ratingsTrend };
}

//TODO: REFATORAR ESTE CÓDIGO PARA MELHORAR DESEMPENHO DAS QUERIES
// --- CONFIGURAÇÃO DE EXCEÇÕES (Hardcode) ---
const MULTI_AREA_MANAGERS: Record<string, string[]> = {
  'everaldo.reis@sp.senai.br': [
    'cmko730c70001o4fs97u0lxtb',
    'cmko730fm0002o4fs6iap316v',
  ],
};

export default async function DashboardPage() {
  const formattedDate = format(new Date(), 'dd/MM/yyyy, HH:mm', {
    locale: ptBR,
  });

  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const { id, role, name, areaId, email } = session.user;

  let where: Prisma.TicketWhereInput = {};

  if (role === Role.COMMON) {
    where = { requesterId: id };
  } else if (role === Role.TECHNICIAN) {
    where = { technicianId: id };
  } else if (role === Role.MANAGER) {
    // --- LÓGICA DE EXCEÇÃO ---
    // Verifica se este email está na lista de "Super Gerentes"
    if (email && MULTI_AREA_MANAGERS[email]) {
      // Se estiver, mostra tickets de QUALQUER uma das áreas listadas
      where = {
        areaId: { in: MULTI_AREA_MANAGERS[email] },
      };
    } else {
      // Comportamento padrão (apenas a área do perfil)
      if (!areaId) {
        where = { id: 'impossivel' };
      } else {
        where = { areaId: areaId as string };
      }
    }
  }

  // --- QUERIES ---
  const ticketsQuery = db.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 4, // Reduzido para 4 como no seu layout
    include: { requester: { select: { name: true } }, area: true },
  });

  const statsQuery = db.ticket.groupBy({
    by: ['status'],
    _count: { _all: true },
    where: where,
  });

  const priorityStatsQuery = db.ticket.groupBy({
    by: ['priority'],
    _count: { _all: true },
    where: where,
  });

  const avgRatingQuery = db.ticket.aggregate({
    _avg: {
      satisfactionRating: true,
    },
    _count: {
      _all: true,
    },
    _max: {
      satisfactionRating: true,
    },
    where: {
      ...where,
      satisfactionRating: { not: null },
    },
  });

  const oneYearAgo = subMonths(new Date(), 12);
  const performanceDataQuery = db.ticket.findMany({
    where: {
      ...where,
      OR: [
        { createdAt: { gte: oneYearAgo } },
        { resolvedAt: { gte: oneYearAgo } },
      ],
    },
    select: {
      createdAt: true,
      resolvedAt: true,
      slaDeadline: true,
      status: true,
    },
  });

  const twoMonthsAgo = subMonths(new Date(), 2);
  const oneMonthAgo = subMonths(new Date(), 1);

  // Esta é a ÚNICA query que precisamos para "Mês Atual"
  const currentPeriodDataQuery = db.ticket.findMany({
    where: {
      ...where,
      createdAt: { gte: oneMonthAgo },
    },
    select: {
      id: true,
      createdAt: true,
      resolvedAt: true,
      slaDeadline: true,
      satisfactionRating: true,
      status: true, // Inclui status para 'calculateTrend'
    },
  });

  // Esta é a ÚNICA query que precisamos para "Mês Anterior"
  const previousPeriodDataQuery = db.ticket.findMany({
    where: {
      ...where,
      createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo },
    },
    select: {
      id: true,
      createdAt: true,
      resolvedAt: true,
      slaDeadline: true,
      satisfactionRating: true,
      status: true, // Inclui status para 'calculateTrend'
    },
  });

  let areaStatsQuery: Promise<any[]>;
  if (role === Role.SUPER_ADMIN) {
    areaStatsQuery = db.area.findMany({
      include: {
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  } else {
    areaStatsQuery = Promise.resolve([]);
  }

  // (Removemos as queries duplicadas 'currentPeriodPerformanceQuery' e 'previousPeriodPerformanceQuery')
  const [
    tickets,
    stats,
    priorityStats,
    avgRatingResult,
    performanceData,
    areaStats,
    currentPeriodData,
    previousPeriodData,
  ] = await Promise.all([
    ticketsQuery,
    statsQuery,
    priorityStatsQuery,
    avgRatingQuery,
    performanceDataQuery,
    areaStatsQuery,
    currentPeriodDataQuery,
    previousPeriodDataQuery,
  ]);

  // --- FORMATAÇÃO DOS DADOS ---
  const formattedStats = {
    [Status.OPEN]: 0,
    [Status.ASSIGNED]: 0,
    [Status.IN_PROGRESS]: 0,
    [Status.ON_HOLD]: 0,
    [Status.RESOLVED]: 0,
    [Status.CLOSED]: 0,
    [Status.CANCELLED]: 0,
  };
  let totalTickets = 0;
  for (const group of stats) {
    formattedStats[group.status] = group._count._all;
    totalTickets += group._count._all;
  }

  const formattedPriorityStats = Object.values(Priority).map((p) => ({
    name: p,
    total: 0,
  }));
  for (const group of priorityStats) {
    const item = formattedPriorityStats.find((p) => p.name === group.priority);
    if (item) item.total = group._count._all;
  }

  // --- 3. MÉTRICAS DE PERFORMANCE  ---
  const resolvedTickets = performanceData.filter((t) => t.resolvedAt);
  const { avgTime, slaRate, slaCompliance, fastestTime } =
    calculatePerformanceMetrics(resolvedTickets);

  const averageSatisfaction =
    avgRatingResult._avg.satisfactionRating?.toFixed(1) || 'N/A';
  const totalRatings = avgRatingResult._count._all;

  const trendData = formatTrendData(performanceData);

  const bestRating = avgRatingResult._max.satisfactionRating || 'N/A';

  const formattedAreaStats = areaStats.map((area) => ({
    name: area.name,
    total: area._count.tickets,
  }));

  // --- CORREÇÃO: CÁLCULO DOS TRENDS ---
  // (Agora todos usam 'currentPeriodData' e 'previousPeriodData')
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
  const avgTimeTrend = calculateAvgTimeTrend(
    currentPeriodData,
    previousPeriodData,
  );
  const slaTrend = calculateSLATrend(currentPeriodData, previousPeriodData);
  const { satisfactionTrend, ratingsTrend } = calculateSatisfactionTrend(
    currentPeriodData,
    previousPeriodData,
  );

  // --- O JSX (JÁ ESTAVA CORRETO) ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="p-4 pt-4 md:p-6 lg:p-8 lg:pt-6">
        {/* HEADER RESPONSIVO */}
        <header className="mb-4 flex flex-col justify-between space-y-4 md:flex-row">
          {/* Título e Saudação */}
          <div>
            <h1 className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-bold text-transparent md:text-3xl dark:from-white dark:to-slate-300">
              Dashboard
            </h1>
            <p className="text-sm text-slate-600 md:text-base dark:text-slate-400">
              Olá, <span className="font-semibold">{name}</span>! Bem-vindo(a)
              de volta.
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

        {/* SEÇÃO 1: CARDS DE MÉTRICAS */}
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

        {/* SEÇÃO 2: GRÁFICOS */}
        <div className="space-y-6 lg:grid lg:grid-cols-5 lg:gap-6 lg:space-y-0">
          {/* Coluna Principal - Gráficos grandes */}
          <div className="space-y-6 lg:col-span-3">
            <TrendChart data={trendData} />
            <StatusChart data={formattedStats} />
            <PerformanceMetrics
              avgTime={avgTime}
              averageSatisfaction={averageSatisfaction}
              slaRate={slaRate}
              totalRatings={totalRatings}
              totalTickets={totalTickets}
              trends={{
                avgTime: avgTimeTrend,
                satisfaction: satisfactionTrend,
                slaRate: slaTrend,
                ratings: ratingsTrend,
              }}
              insights={{
                // (Estes ainda são estáticos, podemos fazê-los no futuro)
                fastestTime: fastestTime,
                bestRating:
                  bestRating === 'N/A' ? undefined : Number(bestRating),
                slaCompliance: slaCompliance,
              }}
            />
          </div>

          {/* Coluna Lateral - Cards secundários */}
          <div className="space-y-6 lg:col-span-2">
            <RecentTicketsCard
              tickets={tickets.map((ticket) => ({
                id: ticket.id,
                ticketId: ticket.ticketId,
                title: ticket.title,
                status: ticket.status,
                createdAt: ticket.createdAt,
                priority: ticket.priority,
                requesterName: ticket.requester.name,
                department: ticket.area.name,
              }))}
            />
            <PriorityChart data={formattedPriorityStats} />
            {role === Role.SUPER_ADMIN && (
              <AreaChart data={formattedAreaStats} />
            )}
          </div>
        </div>

        {/* Espaçamento extra no final para mobile */}
        <div className="h-6 md:h-8" />
      </div>
    </div>
  );
}
