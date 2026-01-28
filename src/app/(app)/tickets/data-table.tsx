'use client';
/* eslint-disable */
import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  RowSelectionState,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Status, User } from '@prisma/client';

import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable, { type UserOptions } from 'jspdf-autotable';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/_components/ui/table';
import { Card, CardContent } from '@/app/_components/ui/card';
import { Button } from '@/app/_components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/_components/ui/select';
import { Label } from '@/app/_components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/app/_components/ui/dropdown-menu';
import {
  Trash,
  Download,
  Loader2,
  FileSpreadsheet,
  CheckSquare,
  UserPlus,
  RefreshCw,
  FileText,
  Sheet,
  FileDown,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { TicketComRelacoes } from './columns';
import { cn } from '@/app/_lib/utils';
import { useSession } from 'next-auth/react';

interface AutoTableHookData {
  pageNumber: number;
}

type Technician = Pick<User, 'id' | 'name'>;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  statuses: string[];
}

const statusLabels: Record<string, string> = {
  OPEN: 'Aberto',
  ASSIGNED: 'Atribuído',
  IN_PROGRESS: 'Em Andamento',
  ON_HOLD: 'Em Espera',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  CANCELLED: 'Cancelado',
};

export function DataTable<TData, TValue>({
  columns,
  data,
  statuses,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';
  const [sorting, setSorting] = useState<SortingState>([
    { id: sort, desc: order === 'desc' },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [statusToAction, setStatusToAction] = useState<string>('');
  const [technicianToAction, setTechnicianToAction] = useState<string>('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualSorting: true,
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === 'function' ? updater(sorting) : updater;

      setSorting(newSorting);

      const params = new URLSearchParams(searchParams.toString());
      if (newSorting.length > 0) {
        params.set('sort', newSorting[0].id);
        params.set('order', newSorting[0].desc ? 'desc' : 'asc');
      } else {
        params.set('sort', 'createdAt');
        params.set('order', 'desc');
      }
      router.push(pathname + '?' + params.toString());
    },
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    getRowId: (row) => (row as TicketComRelacoes).id,
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await fetch('/api/users?role=TECHNICIAN');
        const data = await response.json();
        if (data && !data.error) {
          setTechnicians(data);
        }
      } catch (error) {
        console.error('Falha ao buscar técnicos', error);
      }
    };
    fetchTechnicians();
  }, []);

  const numSelected = table.getSelectedRowModel().rows.length;
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIds = selectedRows.map(
    (row) => (row.original as TicketComRelacoes).id,
  );

  const handleBulkUpdate = async (action: 'status' | 'technician') => {
    setIsLoading(true);
    let body = {};

    if (action === 'status') {
      if (!statusToAction) {
        toast.error('Selecione um status para aplicar.');
        setIsLoading(false);
        return;
      }
      body = { ticketIds: selectedIds, status: statusToAction };
    } else if (action === 'technician') {
      if (!technicianToAction) {
        toast.error('Selecione um técnico para atribuir.');
        setIsLoading(false);
        return;
      }
      body = {
        ticketIds: selectedIds,
        technicianId:
          technicianToAction === 'unassign' ? null : technicianToAction,
      };
    }

    try {
      const response = await fetch('/api/tickets/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao atualizar chamados');
      }

      toast.success(result.message);
      router.refresh();
      table.resetRowSelection();
    } catch (error: any) {
      toast.error('Erro', { description: error.message });
    } finally {
      setIsLoading(false);
      setStatusToAction('');
      setTechnicianToAction('');
    }
  };

  const handleDeleteSelected = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/tickets/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketIds: selectedIds }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Falha ao excluir chamados');
      }

      toast.success(result.message);
      router.refresh();
      table.resetRowSelection();
    } catch (error: any) {
      toast.error('Erro', { description: error.message });
    } finally {
      setIsLoading(false);
      setIsDeleteAlertOpen(false);
    }
  };

  const handleExportExcelCsv = async (format: 'xlsx' | 'csv') => {
    if (numSelected === 0) {
      toast.error('Nenhum ticket selecionado para exportar.');
      return;
    }

    toast.info(`A gerar o ficheiro ${format.toUpperCase()}...`, {
      id: 'export-toast',
    });
    setIsLoading(true);

    const dataToExport = selectedRows.map((row) => {
      const ticket = row.original as TicketComRelacoes;
      return {
        'ID do Ticket':
          ticket.ticketId || `#${ticket.id.substring(ticket.id.length - 6)}`,
        Título: ticket.title,
        Departamento: ticket.area.name,
        Prioridade: ticket.priority,
        Status: ticket.status,
        'Atribuído a': ticket.technician ? ticket.technician.name : 'N/A',
        Solicitante: ticket.requester.name,
        'Criado em': new Date(ticket.createdAt),
        'Resolvido em': ticket.resolvedAt ? new Date(ticket.resolvedAt) : null,
        Avaliação: ticket.satisfactionRating || null,
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Chamados');

    worksheet.columns = Object.keys(dataToExport[0]).map((key) => ({
      header: key,
      key: key,
      width: 20,
    }));

    worksheet.getColumn('Criado em').numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.getColumn('Resolvido em').numFmt = 'dd/mm/yyyy hh:mm';
    worksheet.addRows(dataToExport);

    try {
      let buffer: ArrayBuffer;
      let fileType: string;
      let fileName: string;

      if (format === 'xlsx') {
        buffer = await workbook.xlsx.writeBuffer();
        fileType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileName = 'chamados_exportados.xlsx';
      } else {
        buffer = await workbook.csv.writeBuffer();
        fileType = 'text/csv;charset=utf-8;';
        fileName = 'chamados_exportados.csv';
      }

      const blob = new Blob([buffer], { type: fileType });
      saveAs(blob, fileName);

      toast.success('Exportação concluída!', { id: 'export-toast' });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao gerar o ficheiro.', { id: 'export-toast' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (numSelected === 0) {
      toast.error('Nenhum ticket selecionado para exportar.');
      return;
    }

    toast.info('A gerar PDF...', { id: 'export-toast' });
    setIsLoading(true);

    try {
      const head = [
        [
          'ID',
          'Título',
          'Status',
          'Prioridade',
          'Atribuído a',
          'Criado em',
          'Resolvido em',
        ],
      ];
      const body = selectedRows.map((row) => {
        const ticket = row.original as TicketComRelacoes;
        return [
          ticket.ticketId || `#${ticket.id.substring(ticket.id.length - 6)}`,
          ticket.title,
          ticket.status,
          ticket.priority,
          ticket.technician ? ticket.technician.name : 'N/A',
          new Date(ticket.createdAt).toLocaleDateString('pt-BR'),
          ticket.resolvedAt
            ? new Date(ticket.resolvedAt).toLocaleDateString('pt-BR')
            : 'N/A',
        ];
      });

      const doc = new jsPDF();

      const logoBase64 =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAH0CAYAAADL1t+KAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFAmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTExLTI2PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPjVmYWZhN2VkLTJjNzgtNDM1Ni04NjQ5LTlkYTlmNzA0YzllMTwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5TU0kgLSAxPC9yZGY6bGk+CiAgIDwvcmRmOkFsdD4KICA8L2RjOnRpdGxlPgogPC9yZGY6RGVzY3JpcHRpb24+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9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';
      doc.addImage(logoBase64, 'PNG', 14, 10, 20, 20);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Chamados', 40, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Exportação do Sistema de Chamados Internos', 40, 24);
      doc.text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        doc.internal.pageSize.getWidth() - 14,
        18,
        { align: 'right' },
      );

      autoTable(doc, {
        startY: 35,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: [255, 255, 255],
        },
        didDrawPage: (data: UserOptions | AutoTableHookData) => {
          const hookData = data as AutoTableHookData;
          const pageCount = (doc.internal as any).getNumberOfPages();
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(
            `Página ${hookData.pageNumber} de ${pageCount}`,
            14,
            doc.internal.pageSize.getHeight() - 10,
          );
          doc.text(
            `Relatório de Chamados | ${new Date().toLocaleDateString('pt-BR')}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' },
          );
        },
      });

      doc.save('chamados_exportados.pdf');
      toast.success('PDF gerado com sucesso!', { id: 'export-toast' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o PDF.', { id: 'export-toast' });
    } finally {
      setIsLoading(false);
    }
  };
  const session = useSession();

  const isCommon = session.data?.user.role;

  return (
    <Card className="border-0 bg-white p-4 shadow-xl sm:p-6 dark:bg-slate-900">
      <CardContent className="space-y-4 p-0">
        {/* TOOLBAR DE AÇÕES EM LOTE */}
        {isCommon !== 'COMMON' && (
          <div
            className={cn(
              'animate-in slide-in-from-top-2 relative overflow-hidden rounded-xl border border-dashed p-4 transition-all duration-300 sm:p-6',
              numSelected > 0
                ? 'border-blue-300 bg-linear-to-br from-blue-50 to-indigo-50 dark:border-blue-700 dark:from-blue-950/30 dark:to-indigo-950/30'
                : 'hidden',
            )}
          >
            {/* Gradient decorativo */}
            {numSelected > 0 && (
              <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-indigo-500" />
            )}

            <div className="space-y-4">
              {/* Header com contador */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <CheckSquare className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 md:text-lg dark:text-white">
                        {numSelected} selecionado{numSelected !== 1 ? 's' : ''}
                      </span>
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Aplicar ações em lote aos tickets selecionados
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Dropdown de Exportar */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        className="border-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      >
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Exportar</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel className="text-xs font-semibold">
                        Escolha o formato
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleExportExcelCsv('xlsx')}
                        className="cursor-pointer"
                      >
                        <Sheet className="mr-2 h-4 w-4 text-emerald-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">Excel</span>
                          <span className="text-muted-foreground text-xs">
                            .xlsx
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportExcelCsv('csv')}
                        className="cursor-pointer"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-blue-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">CSV</span>
                          <span className="text-muted-foreground text-xs">
                            .csv
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleExportPdf}
                        className="cursor-pointer"
                      >
                        <FileText className="mr-2 h-4 w-4 text-red-600" />
                        <div className="flex flex-col">
                          <span className="font-medium">PDF</span>
                          <span className="text-muted-foreground text-xs">
                            .pdf
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Botão de Excluir */}
                  <AlertDialog
                    open={isDeleteAlertOpen}
                    onOpenChange={setIsDeleteAlertOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                        className="border-2 border-red-300 dark:border-red-800"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                        ) : (
                          <Trash className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-950/30">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                          </div>
                          <AlertDialogTitle>
                            Tem a certeza absoluta?
                          </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2">
                          Esta ação não pode ser desfeita.{' '}
                          <strong>{numSelected} chamado(s)</strong> serão
                          permanentemente excluídos da base de dados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteSelected}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Excluindo...' : 'Sim, excluir'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Ações de Atualização */}
              <div className="grid grid-cols-1 gap-4 rounded-lg border-2 border-slate-200 bg-white p-4 lg:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
                {/* Atualizar Status */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                    Atualizar Status
                  </Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Select
                      value={statusToAction}
                      onValueChange={setStatusToAction}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full border-2 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                        <SelectValue placeholder="Selecionar status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabels[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleBulkUpdate('status')}
                      disabled={isLoading || !statusToAction}
                      className="shrink-0 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>

                {/* Atribuir Usuário */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-semibold">
                    <UserPlus className="h-3.5 w-3.5 text-purple-600" />
                    Atribuir Técnico
                  </Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Select
                      value={technicianToAction}
                      onValueChange={setTechnicianToAction}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full border-2 transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20">
                        <SelectValue placeholder="Selecionar técnico..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassign">Não atribuído</SelectItem>
                        {technicians.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleBulkUpdate('technician')}
                      disabled={isLoading || !technicianToAction}
                      className="shrink-0 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    >
                      Atribuir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto rounded-lg border-2 border-slate-200 dark:border-slate-800">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-slate-50 dark:bg-slate-900"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="font-semibold">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  // Obter os dados da linha (necessário para o ID)
                  const ticket = row.original as TicketComRelacoes;

                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        // Navega para a página de detalhes do ticket
                        router.push(`/tickets/${ticket.id}`);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        // VERIFICAR SE A CÉLULA É INTERATIVA
                        const isInteractiveCell =
                          cell.column.id === 'select' || // O Checkbox
                          cell.column.id === 'actions' || // O Menu Dropdown
                          cell.column.id === 'ticketId'; // O Link do ID

                        return (
                          <TableCell
                            key={cell.id}
                            // 'stopPropagation'
                            onClick={
                              isInteractiveCell
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <FileDown className="h-8 w-8" />
                      <p className="text-sm font-medium">
                        Nenhum resultado encontrado.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação Moderna */}
        <div className="flex flex-col gap-4 rounded-lg border-2 border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
          {/* Info e Seletor de Linhas */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="rows-per-page"
                className="text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Linhas por página:
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger
                  id="rows-per-page"
                  className="h-8 w-17.5 border-2"
                >
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 20, 30, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Mostrando{' '}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}{' '}
              a{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{' '}
              de {table.getFilteredRowModel().rows.length} resultados
            </div>
          </div>

          {/* Controles de Navegação */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Página
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-blue-500 bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                {table.getState().pagination.pageIndex + 1}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                de {table.getPageCount()}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
