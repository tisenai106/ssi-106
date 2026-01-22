import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

import { Area, Role, Status } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CommentSection } from './comment-section';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/_components/ui/card';

import db from '@/app/_lib/prisma';
import { Badge } from '@/app/_components/ui/badge';
import { TicketActions } from './ticket-actions';
import { AttachmentList } from './attachment-list';
import { TicketRating } from './ticket-rating';
import {
  User,
  Calendar,
  MapPin,
  Wrench,
  Package,
  Hash,
  Building2,
  UserCog,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  Mail,
  ChevronRight,
  Sparkles,
  Info,
  StarIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/app/_components/ui/button';

async function getTicketData(ticketId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return redirect('/login');
  }

  const { id: userId, role, areaId, email } = session.user;

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { name: true, email: true } },
      technician: { select: { name: true, email: true } },
      area: { select: { name: true } },
      comments: {
        include: {
          user: { select: { name: true, role: true, photoUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: {
          uploader: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) {
    return redirect('/dashboard');
  }

  const isSuperAdmin = role === Role.SUPER_ADMIN;
  const isRequester = ticket.requesterId === userId;
  const isTechnician = ticket.technicianId === userId;
  const isManager = role === Role.MANAGER && ticket.areaId === areaId;
  const isEv = email === 'everaldo.reis@sp.senai.br';

  const canView =
    isSuperAdmin || isRequester || isTechnician || isManager || isEv;

  if (!canView) {
    return redirect('/dashboard');
  }

  // Buscar todas as áreas para o TicketActions (mantém id e name)
  let areas: { id: string; name: string }[] = [];
  if (role === Role.MANAGER || role === Role.SUPER_ADMIN || isEv) {
    areas = await db.area.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  return { ticket, session, areas };
}

const STATUS_CONFIG: Record<
  Status,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    gradient: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  OPEN: {
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/40',
    borderColor: 'border-blue-200/60 dark:border-blue-800/60',
    gradient: 'from-blue-500 to-cyan-500',
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Aberto',
  },
  ASSIGNED: {
    color: 'text-indigo-700 dark:text-indigo-400',
    bgColor: 'bg-indigo-50/80 dark:bg-indigo-950/40',
    borderColor: 'border-indigo-200/60 dark:border-indigo-800/60',
    gradient: 'from-indigo-500 to-purple-500',
    icon: <UserCog className="h-4 w-4" />,
    label: 'Atribuído',
  },
  IN_PROGRESS: {
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50/80 dark:bg-amber-950/40',
    borderColor: 'border-amber-200/60 dark:border-amber-800/60',
    gradient: 'from-amber-500 to-orange-500',
    icon: <Clock className="h-4 w-4" />,
    label: 'Em Andamento',
  },
  ON_HOLD: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50/80 dark:bg-orange-950/40',
    borderColor: 'border-orange-200/60 dark:border-orange-800/60',
    gradient: 'from-orange-500 to-red-500',
    icon: <Clock className="h-4 w-4" />,
    label: 'Em Espera',
  },
  RESOLVED: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/80 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/60',
    gradient: 'from-emerald-500 to-teal-500',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Resolvido',
  },
  CLOSED: {
    color: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-50/80 dark:bg-slate-800/80',
    borderColor: 'border-slate-200/60 dark:border-slate-700/60',
    gradient: 'from-slate-500 to-slate-600',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Fechado',
  },
  CANCELLED: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50/80 dark:bg-red-950/40',
    borderColor: 'border-red-200/60 dark:border-red-800/60',
    gradient: 'from-red-500 to-rose-500',
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Cancelado',
  },
};

const PRIORITY_CONFIG: Record<
  string,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  LOW: {
    color: 'text-slate-700 dark:text-slate-400',
    bgColor: 'bg-slate-100/80 dark:bg-slate-800/80',
    borderColor: 'border-slate-300/60 dark:border-slate-700/60',
    label: 'Baixa',
  },
  MEDIUM: {
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100/80 dark:bg-amber-950/40',
    borderColor: 'border-amber-300/60 dark:border-amber-700/60',
    label: 'Média',
  },
  HIGH: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100/80 dark:bg-orange-950/40',
    borderColor: 'border-orange-300/60 dark:border-orange-700/60',
    label: 'Alta',
  },
  URGENT: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100/80 dark:bg-red-950/40',
    borderColor: 'border-red-300/60 dark:border-red-700/60',
    label: 'Urgente',
  },
};

// Configuração de Labels para Áreas
const AREA_LABELS: Record<string, string> = {
  TI: 'TI',
  BUILDING: 'Predial',
  ELECTRICAL: 'Elétrica',
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const data = await getTicketData(resolvedParams.id);

  if (!data || !data.ticket) {
    return null;
  }

  const { ticket, session, areas } = data;

  const isRequester = session.user.id === ticket.requesterId;

  // SÓ mostra a caixa se o utilizador for o solicitante E o status for 'RESOLVED'
  const showRatingBox =
    (isRequester && ticket.status === Status.RESOLVED) ||
    ticket.status === Status.CLOSED;

  const statusConfig = STATUS_CONFIG[ticket.status];
  const priorityConfig =
    PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;

  return (
    <div className="min-h-screen dark:bg-slate-950">
      <div className="mx-auto max-w-400 space-y-6 p-4 md:p-6 lg:p-8">
        {/* Breadcrumb e Navegação */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-fit gap-2 rounded-xl border-2 shadow-sm backdrop-blur-xl transition-all hover:border-blue-500 hover:bg-blue-50/80 hover:shadow-md dark:hover:border-blue-600 dark:hover:bg-blue-950/40"
            >
              <Link href="/tickets">
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm">
              <Link
                href="/tickets"
                className="font-medium text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                Chamados
              </Link>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {ticket.ticketId || `#${ticket.id.slice(-6)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div
            className={
              session.user.role != 'COMMON'
                ? 'h-full space-y-6 lg:col-span-8'
                : 'h-full space-y-6 lg:col-span-12'
            }
          >
            {/* Hero Card - Informações Principais */}
            <Card className="group hover:shadow-3xl relative overflow-hidden border-0 p-0 shadow-2xl backdrop-blur-xl transition-all">
              <div
                className={`absolute inset-0 bg-linear-to-r ${statusConfig.gradient} opacity-5`}
              />
              <div
                className={`absolute top-0 right-0 left-0 h-1 rounded-t-2xl bg-linear-to-r ${statusConfig.gradient}`}
              />

              <CardHeader className="relative space-y-6 p-4 sm:p-6 md:p-8">
                {/* Status e Prioridade */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge
                    className={`${statusConfig.bgColor} ${statusConfig.color} rounded-xl border-2 ${statusConfig.borderColor} px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-xl sm:px-4 sm:py-2 sm:text-sm`}
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                  </Badge>
                  <Badge
                    className={`${priorityConfig.bgColor} ${priorityConfig.color} rounded-xl border-2 ${priorityConfig.borderColor} px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-xl sm:px-4 sm:py-2 sm:text-sm`}
                  >
                    {priorityConfig.label}
                  </Badge>
                  <Badge className="ml-auto gap-1.5 rounded-xl border-0 bg-linear-to-r from-blue-500 via-indigo-500 to-indigo-600 px-3 py-1.5 font-mono text-xs font-bold text-white shadow-lg shadow-blue-500/30 backdrop-blur-xl sm:text-sm">
                    <Sparkles className="h-3 w-3 drop-shadow-sm" />
                    {ticket.ticketId || `#${ticket.id.slice(-6)}`}
                  </Badge>
                </div>

                {/* Título Principal */}
                <div className="space-y-4">
                  <h1 className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-2xl leading-tight font-black text-transparent sm:text-3xl md:text-4xl lg:text-5xl dark:from-white dark:via-slate-100 dark:to-white">
                    {ticket.title}
                  </h1>

                  {/* Metadados em Grid */}
                  <div
                    className={
                      ticket.status === Status.CLOSED
                        ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'
                        : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
                    }
                  >
                    <MetaItem
                      icon={<User className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label="Solicitante"
                      value={ticket.requester.name}
                      gradient="from-blue-500 to-cyan-500"
                    />
                    <MetaItem
                      icon={<Building2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label="Área"
                      value={AREA_LABELS[ticket.area.name]}
                      gradient="from-purple-500 to-indigo-500"
                    />
                    <MetaItem
                      icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label="Aberto em"
                      value={format(
                        new Date(ticket.createdAt),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR },
                      )}
                      gradient="from-emerald-500 to-teal-500"
                    />
                    <MetaItem
                      icon={<UserCog className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label="Técnico"
                      value={ticket.technician?.name || 'Não atribuído'}
                      gradient="from-amber-500 to-orange-500"
                    />
                    {ticket.status === Status.CLOSED && (
                      <MetaItem
                        icon={<StarIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                        label="Avaliação"
                        value={String(
                          ticket.satisfactionRating != null
                            ? ticket.satisfactionRating + ' de 5'
                            : '—',
                        )}
                        gradient="from-amber-500 to-yellow-500"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Descrição */}
            <Card className="group relative min-h-55 overflow-hidden border-0 pt-1 shadow-xl backdrop-blur-xl transition-all dark:bg-slate-900">
              <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl bg-linear-to-r from-emerald-500 to-teal-500" />
              <CardHeader className="border-b bg-linear-to-r from-emerald-50/80 to-teal-50/80 p-4 backdrop-blur-xl dark:from-emerald-950/30 dark:to-teal-950/30 [.border-b]:pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-bold sm:gap-3 sm:text-xl">
                  <div className="rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 p-2 shadow-lg backdrop-blur-xl sm:p-2.5">
                    <FileText className="h-4 w-4 text-white drop-shadow-sm sm:h-5 sm:w-5" />
                  </div>
                  Descrição do Problema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 sm:text-base dark:text-slate-300">
                  {ticket.description}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          {session.user.role != 'COMMON' ? (
            <div className="h-full lg:col-span-4">
              <TicketActions
                ticket={ticket}
                currentUser={session.user}
                allAreas={areas}
              />
            </div>
          ) : (
            <></>
          )}

          {/* Coluna Principal - 8 colunas */}
          <div className="space-y-6 lg:col-span-8">
            {/* Avaliação */}
            {showRatingBox && (
              <div className="animate-in slide-in-from-bottom-4">
                <TicketRating
                  ticketId={ticket.id}
                  currentRating={ticket.satisfactionRating || null}
                />
              </div>
            )}

            {/* Comentários */}
            <div
              className="animate-in slide-in-from-bottom-4"
              style={{ animationDelay: '100ms' }}
            >
              <CommentSection
                ticketId={ticket.id}
                initialComments={ticket.comments}
                currentUserRole={session.user.role}
              />
            </div>
          </div>

          {/* Sidebar - 4 colunas */}
          <div className="space-y-6 lg:col-span-4">
            {/* Card de Detalhes Rápidos */}

            {/* Equipamento */}
            <Card className="group relative gap-0 overflow-hidden border-0 p-0 pt-1 shadow-xl backdrop-blur-xl transition-all dark:bg-slate-900">
              <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl bg-linear-to-r from-amber-500 to-orange-500" />
              <CardHeader className="border-b bg-linear-to-r from-amber-50/80 to-orange-50/80 p-4 backdrop-blur-xl dark:from-amber-950/30 dark:to-orange-950/30 [.border-b]:pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-bold sm:gap-3 sm:text-xl">
                  <div className="rounded-xl bg-linear-to-br from-amber-500 to-orange-600 p-2 shadow-lg backdrop-blur-xl sm:p-2.5">
                    <Wrench className="h-4 w-4 text-white drop-shadow-sm sm:h-5 sm:w-5" />
                  </div>
                  Equipamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                <DetailRow
                  icon={<MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Localização"
                  value={ticket.location}
                  iconColor="text-red-600 dark:text-red-400"
                  iconBg="bg-red-100/80 dark:bg-red-950/40"
                />
                <DetailRow
                  icon={<Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Equipamento"
                  value={ticket.equipment}
                  iconColor="text-amber-600 dark:text-amber-400"
                  iconBg="bg-amber-100/80 dark:bg-amber-950/40"
                />
                <DetailRow
                  icon={<Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Modelo"
                  value={ticket.model}
                  iconColor="text-orange-600 dark:text-orange-400"
                  iconBg="bg-orange-100/80 dark:bg-orange-950/40"
                />
                <DetailRow
                  icon={<Hash className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Patrimônio"
                  value={ticket.assetTag}
                  iconColor="text-slate-600 dark:text-slate-400"
                  iconBg="bg-slate-100/80 dark:bg-slate-800/80"
                />
              </CardContent>
            </Card>

            {/* Detalhes */}
            <Card className="group relative gap-0 overflow-hidden border-0 p-0 pt-1 shadow-xl backdrop-blur-xl transition-all dark:bg-slate-900">
              <div className="absolute top-0 right-0 left-0 h-1 rounded-t-2xl bg-linear-to-r from-purple-500 to-indigo-500" />
              <CardHeader className="border-b bg-linear-to-r from-purple-50/80 to-indigo-50/80 p-4 backdrop-blur-xl dark:from-purple-950/30 dark:to-indigo-950/30 [.border-b]:pb-2">
                <CardTitle className="flex items-center gap-2 text-lg font-bold sm:gap-3 sm:text-xl">
                  <div className="rounded-xl bg-linear-to-br from-purple-500 to-indigo-600 p-2 shadow-lg backdrop-blur-xl sm:p-2.5">
                    <Info className="h-4 w-4 text-white drop-shadow-sm sm:h-5 sm:w-5" />
                  </div>
                  Detalhes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                <DetailRow
                  icon={<User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Solicitante"
                  value={ticket.requester.name}
                  iconColor="text-blue-600 dark:text-blue-400"
                  iconBg="bg-blue-100/80 dark:bg-blue-950/40"
                />
                <DetailRow
                  icon={<Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Email"
                  value={ticket.requester.email}
                  iconColor="text-slate-600 dark:text-slate-400"
                  iconBg="bg-slate-100/80 dark:bg-slate-800/80"
                />
                <DetailRow
                  icon={<Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Área"
                  value={AREA_LABELS[ticket.area.name]}
                  iconColor="text-purple-600 dark:text-purple-400"
                  iconBg="bg-purple-100/80 dark:bg-purple-950/40"
                />
                <DetailRow
                  icon={<UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  label="Técnico"
                  value={ticket.technician?.name || 'Não atribuído'}
                  iconColor="text-indigo-600 dark:text-indigo-400"
                  iconBg="bg-indigo-100/80 dark:bg-indigo-950/40"
                />
              </CardContent>
            </Card>

            {/* Anexos */}
            <div className="animate-in slide-in-from-right-4">
              <AttachmentList attachments={ticket.attachments} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200/60 bg-white/80 p-3 backdrop-blur-xl transition-all hover:border-slate-300 hover:shadow-lg sm:p-4 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div
        className={`absolute inset-0 bg-linear-to-br ${gradient} opacity-0 transition-opacity group-hover:opacity-5`}
      />
      <div className="relative space-y-2">
        <div
          className={`inline-flex rounded-xl bg-linear-to-br ${gradient} p-1.5 shadow-lg backdrop-blur-xl sm:p-2`}
        >
          <div className="text-white drop-shadow-sm">{icon}</div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {label}
          </p>
          <p
            className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100"
            title={value}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="group flex items-center justify-between gap-2 rounded-xl border-2 border-slate-200/60 bg-slate-50/80 p-2 backdrop-blur-xl transition-all hover:border-slate-300 hover:shadow-md sm:gap-3 sm:p-3 dark:border-slate-800/60 dark:bg-slate-900/60 dark:hover:border-slate-700">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div
          className={`shrink-0 rounded-xl ${iconBg} p-1.5 backdrop-blur-xl transition-transform group-hover:scale-110 sm:p-2`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <span className="truncate text-xs font-semibold text-slate-600 sm:text-sm dark:text-slate-400">
          {label}
        </span>
      </div>
      <span
        className="shrink-0 text-right text-xs font-bold text-slate-900 sm:text-sm dark:text-slate-100"
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
