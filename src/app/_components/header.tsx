import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { UserNav } from './user-nav';
import {
  ChartLineIcon,
  Cog,
  PlusCircleIcon,
  TicketIcon,
  UsersIcon,
} from 'lucide-react';
import { ModeToggle } from './mode-toggle'; // (Assumindo que este componente existe)
import { NavLink } from './nav-link'; // (O seu componente de link ativo)
import { PushNotificationManager } from './push-notification-manager';

export async function Header() {
  // Busca a sessão no servidor
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  const { user } = session;
  const isCommonUser = user.role === 'COMMON';
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    // 1. O <header> agora é sempre visível
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      {/*
        2. 'justify-end' (mobile) -> empurra ações para a direita
           'md:justify-between' (desktop) -> nav esquerda, ações direita
      */}
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        {/* 3. A <nav> (links) está escondida em mobile ('hidden') e visível em desktop ('md:flex') */}
        <nav className="hidden items-center gap-4 text-lg font-medium md:flex lg:gap-6">
          {/* Logo (só desktop) */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Cog className="h-6 w-6" />
            <span>SSI 1.06</span>
          </Link>

          {/* Links de Navegação (só desktop) */}
          {!isCommonUser && (
            <NavLink href="/dashboard">
              <ChartLineIcon className="h-4 w-4" />
              Dashboard
            </NavLink>
          )}

          <NavLink href="/tickets">
            <TicketIcon className="h-4 w-4" />
            Chamados
          </NavLink>

          {isSuperAdmin && (
            <NavLink href="/admin/users">
              <UsersIcon className="h-4 w-4" />
              Usuários
            </NavLink>
          )}

          <NavLink href="/tickets/new">
            <PlusCircleIcon className="h-4 w-4" />
            Novo Chamado
          </NavLink>
        </nav>

        {/* 4. Ações (ModeToggle e UserNav) - Sempre Visíveis */}
        <div className="flex w-full flex-row-reverse items-center justify-between md:w-fit md:flex-row md:gap-4">
          <div className="flex gap-2">
            <div>
              <PushNotificationManager />
            </div>
            <div>
              <ModeToggle />
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-lg font-semibold md:hidden"
          >
            <Cog className="h-6 w-6" />
            <span>SSI 1.06</span>
          </Link>
          <div>
            <UserNav
              name={user.name || ''}
              email={user.email || ''}
              role={user.role}
              imageUrl={user.photoUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
