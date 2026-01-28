'use client';

import Link from 'next/link';

import {
  Clock,
  ArrowRight,
  Inbox,
  User,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/app/_components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';

// Tipos para os tickets
interface Ticket {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  priority?: string;
  requesterName?: string;
  department?: string;
  createdAt?: Date;
}

interface RecentTicketsCardProps {
  tickets: Ticket[];
}

// Configuração de status com cores e labels
const STATUS_CONFIG: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    gradient: string;
    label: string;
    bgColor: string;
    textColor: string;
  }
> = {
  OPEN: {
    variant: 'outline',
    gradient: 'from-blue-400 to-indigo-600',
    label: 'Aberto',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  ASSIGNED: {
    variant: 'outline',
    gradient: 'from-blue-400 to-indigo-600',
    label: 'Atribuído',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    textColor: 'text-yellow-800 dark:text-yellow-300',
  },
  IN_PROGRESS: {
    variant: 'secondary',
    gradient: 'from-amber-400 to-orange-600',
    label: 'Em Andamento',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  RESOLVED: {
    variant: 'outline',
    gradient: 'from-emerald-400 to-teal-600',
    label: 'Resolvido',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  CLOSED: {
    variant: 'outline',
    gradient: 'from-indigo-400 to-purple-600',
    label: 'Fechado',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    textColor: 'text-indigo-700 dark:text-indigo-400',
  },
};

// Configuração de prioridade
const PRIORITY_CONFIG: Record<
  string,
  {
    label: string;
    bgColor: string;
    textColor: string;
  }
> = {
  LOW: {
    label: 'Baixa',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
  },
  MEDIUM: {
    label: 'Média',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950/30',
    textColor: 'text-yellow-700 dark:text-yellow-500',
  },
  HIGH: {
    label: 'Alta',
    bgColor: 'bg-orange-100 dark:bg-orange-950/30',
    textColor: 'text-orange-700 dark:text-orange-500',
  },
  URGENT: {
    label: 'Urgente',
    bgColor: 'bg-red-100 dark:bg-red-950/30',
    textColor: 'text-red-700 dark:text-red-500',
  },
};

// Componente de ticket item
const TicketItem = ({ ticket }: { ticket: Ticket; index: number }) => {
  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
  const priorityConfig = ticket.priority
    ? PRIORITY_CONFIG[ticket.priority]
    : null;

  return (
    <Link href={`/tickets/${ticket.id}`} className="group block">
      <div className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Header com ID e badges */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
              {ticket.ticketId}
            </span>
            {priorityConfig && (
              <Badge
                variant="secondary"
                className={`${priorityConfig.bgColor} ${priorityConfig.textColor} border-0 text-xs font-medium`}
              >
                {priorityConfig.label}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={`${statusConfig.bgColor} ${statusConfig.textColor} border-0 text-xs font-medium`}
            >
              {statusConfig.label}
            </Badge>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400" />
        </div>

        {/* Título */}
        <h3 className="mb-3 line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
          {ticket.title}
        </h3>

        {/* Footer com metadados */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
          {ticket.requesterName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{ticket.requesterName}</span>
            </div>
          )}
          {ticket.department && (
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>
                {ticket.department == 'TI'
                  ? 'TI'
                  : ticket.department == 'BUILDING'
                    ? 'Predial'
                    : ticket.department == 'ELECTRICAL'
                      ? 'Elétrica'
                      : 'OUTRO'}
              </span>
            </div>
          )}
          {ticket.createdAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(ticket.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

// Componente principal
export function RecentTicketsCard({ tickets }: RecentTicketsCardProps) {
  return (
    <Card className="relative min-h-168.75 overflow-hidden border-0 bg-white shadow-xl dark:bg-slate-900">
      {/* Gradient decorativo no topo */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-emerald-500" />

      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent md:text-2xl dark:from-white dark:to-slate-300">
              Chamados Recentes
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Os 4 chamados mais recentes na sua fila
            </CardDescription>
          </div>

          {/* Badge com contador */}
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 px-3 py-1.5 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Total
            </span>
            <span className="bg-linear-to-br from-blue-600 to-indigo-600 bg-clip-text text-sm font-bold text-transparent">
              {tickets.length}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Estado vazio */}
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-linear-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-800 dark:to-slate-700">
              <Inbox className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Nenhum chamado encontrado
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Os chamados recentes aparecerão aqui
            </p>
          </div>
        ) : (
          <>
            {/* Lista de tickets */}
            <div className="space-y-2">
              {tickets.map((ticket, index) => (
                <TicketItem key={ticket.id} ticket={ticket} index={index} />
              ))}
            </div>

            {/* Botão de ver todos */}
            <div className="mt-5 flex justify-center">
              <Button
                asChild
                variant="outline"
                className="group rounded-full border-2 border-slate-200 bg-white px-6 py-2 font-semibold transition-all hover:border-blue-500 hover:bg-linear-to-r hover:from-blue-50 hover:to-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-600 dark:hover:from-blue-950 dark:hover:to-indigo-950"
              >
                <Link href="/tickets" className="flex items-center gap-2">
                  <span className="bg-linear-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent transition-all group-hover:from-blue-600 group-hover:to-indigo-600 dark:from-slate-200 dark:to-white dark:group-hover:from-blue-400 dark:group-hover:to-indigo-400">
                    Ver todos os chamados
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
