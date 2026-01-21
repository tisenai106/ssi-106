'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react'; // Importa o signOut do client-side
import { Role } from '@prisma/client';

// --- 1. Importar os ícones ---
import {
  User,
  LogOut,
  MoreHorizontal,
  HelpCircleIcon,
  Settings2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

// Props (sem alteração)
interface UserNavProps {
  name: string;
  email: string;
  role: Role;
  imageUrl: string | null;
}

// --- CONFIGURAÇÃO DOS MANUAIS ---
// Mapeia cada Role para o seu link específico
const MANUAL_LINKS: Record<Role, string> = {
  // Manual para usuário comum (Solicitante)
  [Role.COMMON]:
    'https://drive.google.com/file/d/1eRFhH25JCyj0uCaRM1Q0GXp2Mu7lIFCY/view?usp=drive_link',

  // Manual para Técnicos (Coloque o link correto aqui)
  [Role.TECHNICIAN]:
    'https://drive.google.com/file/d/1hw5HPnCz7FRdcqADntyWIEWBB_P9bGDP/view?usp=drive_link',

  // Manual para Gestores (Coloque o link correto aqui)
  [Role.MANAGER]:
    'https://drive.google.com/file/d/1ILBUiiqp0HIMaE5BgHwSkpPAqgRMdI05/view?usp=drive_link',

  // Manual para Super Admin (Coloque o link correto aqui)
  [Role.SUPER_ADMIN]:
    'https://drive.google.com/file/d/1ILBUiiqp0HIMaE5BgHwSkpPAqgRMdI05/view?usp=drive_link',
};

export function UserNav({ name, email, role, imageUrl }: UserNavProps) {
  // Pega as iniciais do nome para o AvatarFallback (sem alteração)
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Seleciona o link baseado na role do usuário
  // Se não houver link específico, usa o de COMMON como fallback ou string vazia
  const manualLink = MANUAL_LINKS[role] || MANUAL_LINKS[Role.COMMON];

  return (
    <DropdownMenu>
      {/* --- 2. O GATILHO (TRIGGER) --- */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-auto w-full justify-start gap-3 p-2"
        >
          {/* Avatar */}
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={imageUrl || undefined}
              alt={name}
              className="object-cover"
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Nome e Email (escondidos em ecrãs pequenos) */}
          <div className="hidden flex-1 grid-cols-1 text-left text-sm leading-tight md:grid">
            <span className="truncate font-medium">{name}</span>
            <span className="text-muted-foreground truncate text-xs">
              {email}
            </span>
          </div>

          {/* Ícone de "Mais Opções" */}
          <MoreHorizontal className="text-muted-foreground ml-auto hidden size-4 md:block" />
        </Button>
      </DropdownMenuTrigger>

      {/* --- 3. CONTEÚDO DO MENU --- */}
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        align="end"
        sideOffset={4}
      >
        {/* Etiqueta do Menu */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={imageUrl || undefined}
                alt={name}
                className="object-cover"
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Link Condicional para Admin */}
          {role === Role.SUPER_ADMIN && (
            <DropdownMenuItem asChild>
              <Link href="/admin/users" className="cursor-pointer">
                <Settings2 className="h-4 w-4" />
                <span>Gerenciar Usuários</span>
              </Link>
            </DropdownMenuItem>
          )}

          {/* Link para Configurações */}
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <User className="h-4 w-4" />
              <span>Minha Conta</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Link Dinâmico para o Manual */}
          <DropdownMenuItem asChild>
            <Link href={manualLink} className="cursor-pointer" target="_blank">
              <HelpCircleIcon className="h-4 w-4" />
              <span>Manual do Sistema</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Sair */}
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="cursor-pointer focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-800/20"
        >
          <LogOut className="h-4 w-4 focus:text-red-600 dark:focus:text-red-700" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
