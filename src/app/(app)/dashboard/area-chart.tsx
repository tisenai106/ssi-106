'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

import { Building2, Activity } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/_components/ui/card';

interface AreaChartProps {
  data: {
    name: string;
    total: number;
  }[];
}

// Paleta de cores modernizada com gradientes
const AREA_COLORS = [
  { color: '#3b82f6', gradient: 'from-blue-400 to-indigo-600' }, // Azul
  { color: '#10b981', gradient: 'from-emerald-400 to-teal-600' }, // Verde
  { color: '#f59e0b', gradient: 'from-amber-400 to-orange-600' }, // Amarelo
  { color: '#ef4444', gradient: 'from-red-400 to-rose-600' }, // Vermelho
  { color: '#8b5cf6', gradient: 'from-violet-400 to-purple-600' }, // Roxo
  { color: '#ec4899', gradient: 'from-pink-400 to-fuchsia-600' }, // Rosa
  { color: '#06b6d4', gradient: 'from-cyan-400 to-blue-600' }, // Ciano
  { color: '#84cc16', gradient: 'from-lime-400 to-green-600' }, // Lima
];

// Tooltip customizado modernizado
/* eslint-disable @typescript-eslint/no-explicit-any */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const colorIndex = payload[0].payload.colorIndex || 0;
    const config = AREA_COLORS[colorIndex % AREA_COLORS.length];

    return (
      <div className="rounded-xl border-0 bg-white p-4 shadow-2xl backdrop-blur-sm dark:bg-slate-900">
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-2 dark:border-slate-700">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Área
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full bg-linear-to-br ${config.gradient}`}
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {data.name}
                </span>
              </div>
              <span
                className={`bg-linear-to-br ${config.gradient} bg-clip-text text-lg font-bold text-transparent`}
              >
                {data.total}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Percentual
              </span>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {(data.percent * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Rótulo de percentagem customizado
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold drop-shadow-lg"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function AreaChart({ data }: AreaChartProps) {
  const chartData = data
    .filter((item) => item.total > 0)
    .map((item, index) => ({
      ...item,
      colorIndex: index,
    }));

  // Calcular totais
  const totalChamados = chartData.reduce((acc, curr) => acc + curr.total, 0);
  const totalAreas = chartData.length;

  if (chartData.length === 0) {
    return (
      <Card className="relative overflow-hidden border-0 bg-white shadow-xl dark:bg-slate-900">
        <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-emerald-500" />
        <CardHeader>
          <CardTitle className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-2xl font-bold text-transparent dark:from-white dark:to-slate-300">
            Chamados por Área
          </CardTitle>
          <CardDescription className="text-sm">
            Distribuição dos chamados por departamento
          </CardDescription>
        </CardHeader>
        <CardContent className="flex h-87.5 items-center justify-center">
          <div className="space-y-2 text-center">
            <Building2 className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500 dark:text-slate-400">
              Não há dados de área para exibir
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative min-h-155 overflow-hidden border-0 bg-white shadow-xl dark:bg-slate-900">
      {/* Gradient decorativo no topo */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-emerald-500" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-lg font-bold text-transparent md:text-2xl dark:from-white dark:to-slate-300">
              Chamados por Área
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Distribuição dos chamados por departamento
            </CardDescription>
          </div>

          {/* Badge com contador de áreas */}
          <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-linear-to-br from-purple-50 to-indigo-50 px-3 py-1.5 dark:border-purple-800 dark:from-purple-950 dark:to-indigo-950">
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              Áreas
            </span>
            <span className="bg-linear-to-br from-purple-600 to-indigo-600 bg-clip-text text-sm font-bold text-transparent">
              {totalAreas}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Gráfico de Pizza */}
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <defs>
                  {AREA_COLORS.map((config, index) => (
                    <linearGradient
                      key={index}
                      id={`gradient-area-${index}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={config.color}
                        stopOpacity={1}
                      />
                      <stop
                        offset="100%"
                        stopColor={config.color}
                        stopOpacity={0.8}
                      />
                    </linearGradient>
                  ))}
                </defs>

                <Tooltip content={<CustomTooltip />} />

                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  fill="#8884d8"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#gradient-area-${index % AREA_COLORS.length})`}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda Customizada Vertical */}
          <div className="w-full space-y-3 md:w-1/3">
            {chartData.map((entry, index) => {
              const config = AREA_COLORS[index % AREA_COLORS.length];
              const percentage = ((entry.total / totalChamados) * 100).toFixed(
                1,
              );

              return (
                <div
                  key={entry.name}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-3 transition-all hover:shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded-full bg-linear-to-br ${config.gradient} shadow-lg transition-transform group-hover:scale-110`}
                        style={{ boxShadow: `0 4px 14px 0 ${config.color}30` }}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {entry.name == 'BUILDING'
                            ? 'Predial'
                            : entry.name == 'ELECTRICAL'
                              ? 'Elétrica'
                              : entry.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {percentage}% do total
                        </span>
                      </div>
                    </div>
                    <span
                      className={`bg-linear-to-br ${config.gradient} bg-clip-text text-xl font-bold text-transparent`}
                    >
                      {entry.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-purple-50 p-4 dark:border-indigo-800 dark:from-indigo-950 dark:to-purple-950">
            <div className="mb-1 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold tracking-wider text-indigo-700 md:uppercase dark:text-indigo-300">
                Total Geral
              </span>
            </div>
            <div className="bg-linear-to-br from-indigo-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {totalChamados}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-linear-to-br from-purple-50 to-indigo-50 p-4 dark:border-purple-800 dark:from-purple-950 dark:to-indigo-950">
            <div className="mb-1 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold tracking-wider text-purple-700 md:uppercase dark:text-purple-300">
                Departamentos
              </span>
            </div>
            <div className="bg-linear-to-br from-purple-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent md:text-2xl">
              {totalAreas}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
