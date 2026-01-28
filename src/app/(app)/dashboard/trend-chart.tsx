'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/_components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendChartProps {
  data: {
    month: string;
    Novos: number;
    Resolvidos: number;
  }[];
}

// Tooltip customizado modernizado
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const novos = payload[1].value;
    const resolvidos = payload[0].value;
    const diferenca = novos - resolvidos;

    return (
      <div className="rounded-xl border-0 bg-white p-4 shadow-2xl backdrop-blur-sm dark:bg-slate-900">
        <div className="space-y-3">
          {/* Header */}
          <div className="border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {label}
            </span>
          </div>

          {/* Métricas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-linear-to-br from-blue-400 to-indigo-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Novos
                </span>
              </div>
              <span className="bg-linear-to-br from-blue-500 to-indigo-600 bg-clip-text text-lg font-bold text-transparent">
                {novos}
              </span>
            </div>

            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-linear-to-br from-emerald-400 to-teal-600" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Resolvidos
                </span>
              </div>
              <span className="bg-linear-to-br from-emerald-500 to-teal-600 bg-clip-text text-lg font-bold text-transparent">
                {resolvidos}
              </span>
            </div>
          </div>

          {/* Diferença */}
          <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Saldo
              </span>
              <div
                className={`flex items-center gap-1 ${diferenca > 0 ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {diferenca > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-sm font-bold">
                  {diferenca > 0 ? '+' : ''}
                  {diferenca}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Legend customizada modernizada
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLegend = (props: any) => {
  const { payload } = props;

  return (
    <div className="flex items-center justify-center gap-6 pt-4">
      {/* eslint-disable @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, index: number) => (
        <div
          key={`legend-${index}`}
          className="group flex cursor-pointer items-center gap-2"
        >
          <div
            className={`h-3 w-3 rounded-full transition-transform group-hover:scale-125 ${
              entry.value === 'Novos'
                ? 'bg-linear-to-br from-blue-400 to-indigo-600 shadow-lg shadow-blue-500/30'
                : 'bg-linear-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30'
            }`}
          />
          <span className="text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ data }: TrendChartProps) {
  // Calcula totais para os badges
  const totalNovos = data.reduce((acc, curr) => acc + curr.Novos, 0);
  const totalResolvidos = data.reduce((acc, curr) => acc + curr.Resolvidos, 0);
  const taxa =
    totalNovos > 0 ? ((totalResolvidos / totalNovos) * 100).toFixed(1) : '0.0';

  return (
    <Card className="relative min-h-168.75 overflow-hidden border-0 bg-white shadow-xl dark:bg-slate-900">
      {/* Gradient decorativo no topo */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-emerald-500" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent md:text-2xl dark:from-white dark:to-slate-300">
              Tendência de Chamados
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Volume de chamados abertos vs. resolvidos nos últimos 12 meses
            </CardDescription>
          </div>

          {/* Badges com métricas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 px-3 py-1.5 dark:border-emerald-800 dark:from-emerald-950 dark:to-teal-950">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Taxa de Resolução
              </span>
              <span className="bg-linear-to-br from-emerald-600 to-teal-600 bg-clip-text text-sm font-bold text-transparent">
                {taxa}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-100 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 10,
              }}
            >
              {/* Grid mais sutil */}
              <defs>
                {/* Gradientes para as áreas */}
                <linearGradient id="colorNovos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient
                  id="colorResolvidos"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                strokeOpacity={0.1}
                vertical={false}
              />

              <XAxis
                dataKey="month"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend content={<CustomLegend />} />

              {/* Área Resolvidos (atrás) */}
              <Area
                type="monotone"
                dataKey="Resolvidos"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#colorResolvidos)"
                dot={{
                  r: 4,
                  fill: '#10b981',
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                activeDot={{
                  r: 6,
                  fill: '#10b981',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />

              {/* Área Novos (frente) */}
              <Area
                type="monotone"
                dataKey="Novos"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorNovos)"
                dot={{
                  r: 4,
                  fill: '#3b82f6',
                  strokeWidth: 2,
                  stroke: '#fff',
                }}
                activeDot={{
                  r: 6,
                  fill: '#3b82f6',
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Insights visuais */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="flex flex-col justify-between rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold tracking-wider text-blue-700 md:uppercase dark:text-blue-300">
                Total Abertos
              </span>
            </div>
            <div className="bg-linear-to-br from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {totalNovos}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 p-4 dark:border-emerald-800 dark:from-emerald-950 dark:to-teal-950">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold tracking-wider text-emerald-700 md:uppercase dark:text-emerald-300">
                Total Resolvidos
              </span>
            </div>
            <div className="bg-linear-to-br from-emerald-600 to-teal-600 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {totalResolvidos}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
