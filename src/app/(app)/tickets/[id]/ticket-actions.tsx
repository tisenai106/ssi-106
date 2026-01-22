'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Role, Status, Ticket, User, Priority } from '@prisma/client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
import {
  FormField,
  FormItem,
  FormControl,
  Form,
} from '@/app/_components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/_components/ui/select';
import {
  UserPlus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  Users,
  Building2,
  Flag,
} from 'lucide-react';
import { Badge } from '@/app/_components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/_components/ui/alert-dialog';
import { cn } from '@/app/_lib/utils';

type Technician = Pick<User, 'id' | 'name' | 'areaId'>;
type CurrentUser = Pick<User, 'id' | 'role' | 'areaId'>;
type AreaOption = { id: string; name: string };

interface TicketActionsProps {
  ticket: Pick<
    Ticket,
    'id' | 'status' | 'technicianId' | 'areaId' | 'priority'
  >;
  currentUser: CurrentUser;
  allAreas: AreaOption[];
}

const assignSchema = z.object({ technicianId: z.string() });
const statusSchema = z.object({ status: z.nativeEnum(Status) });
const prioritySchema = z.object({ priority: z.nativeEnum(Priority) });
const areaSchema = z.object({ areaId: z.string() });

// Configuração de cores e labels para STATUS
const STATUS_CONFIG: Record<
  Status,
  { label: string; color: string; icon: React.ElementType }
> = {
  [Status.OPEN]: {
    label: 'Aberto',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    icon: AlertCircle,
  },
  [Status.ASSIGNED]: {
    label: 'Atribuído',
    color:
      'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
    icon: UserPlus,
  },
  [Status.IN_PROGRESS]: {
    label: 'Em Andamento',
    color:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
    icon: RefreshCw,
  },
  [Status.ON_HOLD]: {
    label: 'Em Espera',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    icon: AlertCircle,
  },
  [Status.RESOLVED]: {
    label: 'Resolvido',
    color:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  [Status.CLOSED]: {
    label: 'Fechado',
    color:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
    icon: CheckCircle2,
  },
  [Status.CANCELLED]: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
    icon: AlertCircle,
  },
};

// Configuração de prioridade
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  [Priority.LOW]: {
    label: 'Baixa',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  },
  [Priority.MEDIUM]: {
    label: 'Média',
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-500',
  },
  [Priority.HIGH]: {
    label: 'Alta',
    color:
      'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-500',
  },
  [Priority.URGENT]: {
    label: 'Urgente',
    color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-500',
  },
};

// Configuração de Labels para Áreas
const AREA_LABELS: Record<string, string> = {
  TI: 'TI',
  BUILDING: 'Predial',
  ELECTRICAL: 'Elétrica',
};

export function TicketActions({
  ticket,
  currentUser,
  allAreas,
}: TicketActionsProps) {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [isAssignLoading, setIsAssignLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isPriorityLoading, setIsPriorityLoading] = useState(false);
  const [isAreaLoading, setIsAreaLoading] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { role, areaId, id: userId } = currentUser;

  const isEv = userId === 'cmkplp6t1003do4q4pefd3xjw';
  const isSuperAdmin = role === Role.SUPER_ADMIN;
  const isManager = role === Role.MANAGER && ticket.areaId === areaId;
  const isAssignedTech =
    role === Role.TECHNICIAN && ticket.technicianId === userId;

  const canAssignTech = isSuperAdmin || isManager || isEv;
  const canUpdateStatus = isSuperAdmin || isManager || isAssignedTech || isEv;
  const canManageTicket = isSuperAdmin || isManager || isEv;

  const assignForm = useForm({
    resolver: zodResolver(assignSchema),
    defaultValues: { technicianId: ticket.technicianId || 'none' },
  });
  const statusForm = useForm({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: ticket.status },
  });
  const priorityForm = useForm({
    resolver: zodResolver(prioritySchema),
    defaultValues: { priority: ticket.priority },
  });
  const areaForm = useForm({
    resolver: zodResolver(areaSchema),
    defaultValues: { areaId: ticket.areaId },
  });

  useEffect(() => {
    if (canAssignTech) {
      async function fetchTechnicians() {
        try {
          const response = await fetch('/api/users?role=TECHNICIAN');
          if (!response.ok) throw new Error('Falha ao buscar técnicos');
          const data = await response.json();

          // Encontra os IDs das áreas BUILDING e ELECTRICAL
          const buildingArea = allAreas.find((a) => a.name === 'BUILDING');
          const electricalArea = allAreas.find((a) => a.name === 'ELECTRICAL');
          const buildingElectricalIds = [
            buildingArea?.id,
            electricalArea?.id,
          ].filter(Boolean);

          // Se o chamado for de Predial ou Elétrica, mostra técnicos de ambas as áreas
          let filteredTechnicians = data;
          if (ticket.areaId && buildingElectricalIds.includes(ticket.areaId)) {
            filteredTechnicians = data.filter(
              (tech: Technician) =>
                tech.areaId && buildingElectricalIds.includes(tech.areaId),
            );
          }

          setTechnicians(filteredTechnicians);
          // eslint-disable-next-line
        } catch (error: any) {
          toast.error('Erro ao carregar técnicos');
        }
      }
      fetchTechnicians();
    }
  }, [canAssignTech, ticket.areaId, allAreas]);

  // eslint-disable-next-line
  async function handleUpdate(values: any) {
    if (values.technicianId !== undefined) setIsAssignLoading(true);
    else if (values.status) setIsStatusLoading(true);
    else if (values.priority) setIsPriorityLoading(true);
    else if (values.areaId) setIsAreaLoading(true);

    try {
      const payload = { ...values };
      if (payload.technicianId === 'none') payload.technicianId = null;

      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao atualizar');

      let msg = 'Atualizado com sucesso!';
      if (values.technicianId !== undefined)
        msg = 'Técnico atribuído com sucesso!';
      else if (values.status)
        msg = `Status alterado para: ${STATUS_CONFIG[values.status as Status].label}`;
      else if (values.priority)
        msg = `Prioridade alterada para: ${PRIORITY_CONFIG[values.priority as Priority].label}`;
      else if (values.areaId) msg = 'Chamado transferido de área!';

      toast.success(msg);
      router.refresh();
      setIsTransferModalOpen(false);
      // eslint-disable-next-line
    } catch (error: any) {
      toast.error('Erro ao atualizar', { description: error.message });
    } finally {
      setIsAssignLoading(false);
      setIsStatusLoading(false);
      setIsPriorityLoading(false);
      setIsAreaLoading(false);
    }
  }

  if (!canUpdateStatus && !canManageTicket) return null;

  const getRoleInfo = () => {
    if (isSuperAdmin)
      return {
        label: 'Super Admin',
        color:
          'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30',
        icon: Shield,
      };
    if (isManager)
      return {
        label: 'Gestor',
        color:
          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30',
        icon: Zap,
      };
    return {
      label: 'Técnico',
      color:
        'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30',
      icon: Users,
    };
  };
  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  // Função auxiliar para obter o label da área do técnico
  const getTechnicianAreaLabel = (tech: Technician) => {
    const area = allAreas.find((a) => a.id === tech.areaId);
    return area ? AREA_LABELS[area.name] || area.name : '';
  };

  return (
    <Card className="relative h-full overflow-hidden border-0 shadow-xl dark:bg-slate-900">
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-indigo-500" />

      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 p-2 shadow-lg">
                <Zap className="h-4 w-4 text-white" />
              </div>
              Ações do Chamado
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie atribuições, status e detalhes
            </CardDescription>
          </div>
          <Badge className={`${roleInfo.color} gap-1.5 border-0 px-3 py-1`}>
            <RoleIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">{roleInfo.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1. ATRIBUIR TÉCNICO */}
        {canAssignTech && (
          <div className="space-y-4 rounded-xl border-2 border-purple-200 bg-linear-to-br from-purple-50 to-indigo-50 p-4 dark:border-purple-800 dark:from-purple-950/30 dark:to-indigo-950/30">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-linear-to-br from-purple-500 to-indigo-600 p-2 shadow-lg">
                <UserPlus className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Atribuir Técnico
                </h4>
              </div>
            </div>
            <Form {...assignForm}>
              <form
                onSubmit={assignForm.handleSubmit((v) =>
                  handleUpdate({ technicianId: v.technicianId }),
                )}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <FormField
                  control={assignForm.control}
                  name="technicianId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isAssignLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full border-purple-200 bg-white dark:border-purple-800 dark:bg-slate-900">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent
                          position="popper"
                          className="w-(--radix-select-trigger-width)"
                        >
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-slate-400" />
                              Não atribuído
                            </div>
                          </SelectItem>
                          {technicians.map((tech) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                <span>{tech.name}</span>
                                {tech.areaId && (
                                  <span className="text-xs text-slate-500">
                                    ({getTechnicianAreaLabel(tech)})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isAssignLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto"
                >
                  {isAssignLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Atribuir'
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* 2. ALTERAR STATUS */}
        <div className="space-y-4 rounded-xl border-2 border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 p-2 shadow-lg">
              <RefreshCw className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Alterar Status
              </h4>
            </div>
            <Badge
              className={`${STATUS_CONFIG[ticket.status].color} gap-1.5 border-0 px-2.5 py-1 text-xs font-semibold`}
            >
              {STATUS_CONFIG[ticket.status].label}
            </Badge>
          </div>
          <Form {...statusForm}>
            <form
              onSubmit={statusForm.handleSubmit((v) =>
                handleUpdate({ status: v.status }),
              )}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <FormField
                control={statusForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isStatusLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full border-blue-200 bg-white dark:border-blue-800 dark:bg-slate-900">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        position="popper"
                        className="w-(--radix-select-trigger-width)"
                      >
                        {Object.values(Status)
                          .filter((s) => s !== 'CLOSED')
                          .map((s) => {
                            const StatusIcon = STATUS_CONFIG[s].icon;
                            return (
                              <SelectItem key={s} value={s}>
                                <div className="flex items-center gap-2">
                                  <StatusIcon
                                    className={cn(
                                      'h-4 w-4',
                                      STATUS_CONFIG[s].color
                                        .split(' ')
                                        .find((c) => c.startsWith('text-')),
                                    )}
                                  />
                                  <span>{STATUS_CONFIG[s].label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isStatusLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                {isStatusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Atualizar'
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* 3. PRIORIDADE E ÁREA (Só Gestores/Admin) */}
        {canManageTicket && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Alterar Prioridade */}
            <div className="space-y-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Prioridade
                </h4>
              </div>
              <Form {...priorityForm}>
                <form
                  onSubmit={priorityForm.handleSubmit((v) =>
                    handleUpdate({ priority: v.priority }),
                  )}
                  className="flex flex-col gap-3"
                >
                  <FormField
                    control={priorityForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isPriorityLoading}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full border-orange-200 bg-white dark:border-orange-800 dark:bg-slate-900">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent
                            position="popper"
                            className="w-(--radix-select-trigger-width)"
                          >
                            {Object.values(Priority).map((p) => (
                              <SelectItem key={p} value={p}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-2 w-2 rounded-full ${PRIORITY_CONFIG[p].color.split(' ')[0].replace('text-', 'bg-')}`}
                                  />
                                  {PRIORITY_CONFIG[p].label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isPriorityLoading}
                    className="w-full bg-orange-500 text-white hover:bg-orange-600"
                  >
                    {isPriorityLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Transferir Área com MODAL */}
            {allAreas.length > 0 && (
              <div className="space-y-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Transferir
                  </h4>
                </div>

                <AlertDialog
                  open={isTransferModalOpen}
                  onOpenChange={setIsTransferModalOpen}
                >
                  <Form {...areaForm}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setIsTransferModalOpen(true);
                      }}
                      className="flex flex-col gap-3"
                    >
                      <FormField
                        control={areaForm.control}
                        name="areaId"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              disabled={isAreaLoading}
                            >
                              <FormControl>
                                <SelectTrigger className="w-full border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent
                                position="popper"
                                className="w-(--radix-select-trigger-width)"
                              >
                                {allAreas.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-slate-500" />
                                      {AREA_LABELS[a.name] || a.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          disabled={isAreaLoading}
                          className="w-full bg-slate-800 text-white hover:bg-slate-700"
                        >
                          {isAreaLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Transferir'
                          )}
                        </Button>
                      </AlertDialogTrigger>
                    </form>
                  </Form>

                  {/* Modal de Confirmação */}
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Confirmar Transferência
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem a certeza? Transferir o chamado para outra área
                        poderá remover o seu acesso de edição se não for gestor
                        dessa nova área.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={areaForm.handleSubmit((v) =>
                          handleUpdate({ areaId: v.areaId }),
                        )}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
