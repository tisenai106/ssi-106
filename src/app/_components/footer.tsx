'use client';

import Link from 'next/link';
import {
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Shield,
  FileText,
  HelpCircle,
  Zap,
  Cog,
} from 'lucide-react';

interface FooterProps {
  companyName?: string;
  supportEmail?: string;
  showSocial?: boolean;
}

export function Footer({
  companyName = 'SSI - 1.06',
  supportEmail = 'ti.senai106@sp.senai.br',
  showSocial = true,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Funcionalidades', href: '#' },
      { label: 'Preços', href: '#' },
      { label: 'Integrações', href: '#' },
      { label: 'Atualizações', href: '#' },
    ],
    resources: [
      { label: 'Documentação', href: '#', icon: FileText },
      { label: 'Central de Ajuda', href: '#', icon: HelpCircle },
      { label: 'Status', href: '#', icon: Zap },
      { label: 'API', href: '#', icon: ExternalLink },
    ],
    company: [
      { label: 'Sobre', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Carreiras', href: '#' },
      { label: 'Contato', href: '#' },
    ],
    legal: [
      { label: 'Privacidade', href: '#', icon: Shield },
      { label: 'Termos de Uso', href: '#', icon: FileText },
      { label: 'Cookies', href: '#' },
      { label: 'Licenças', href: '#' },
    ],
  };

  const socialLinks = [
    {
      icon: Github,
      href: 'https://github.com',
      label: 'GitHub',
      gradient: 'from-slate-700 to-slate-900',
    },
    {
      icon: Linkedin,
      href: 'https://linkedin.com',
      label: 'LinkedIn',
      gradient: 'from-blue-600 to-blue-800',
    },
    {
      icon: Mail,
      href: `mailto:${supportEmail}`,
      label: 'Email',
      gradient: 'from-red-500 to-orange-600',
    },
  ];

  return (
    <footer className="relative border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Gradient decorativo */}
      <div className="absolute top-0 right-0 left-0 h-px bg-linear-to-r from-transparent via-purple-500 to-transparent opacity-50" />

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Coluna 1: Branding */}
          <div className="lg:col-span-2">
            <Link href="/" className="group inline-flex items-center gap-2">
              <div className="rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 p-2 shadow-lg transition-transform group-hover:scale-105">
                <Cog className="h-6 w-6 text-white" />
              </div>
              <span className="bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-xl font-bold text-transparent md:text-2xl dark:from-white dark:to-slate-300">
                {companyName}
              </span>
            </Link>

            <p className="mt-4 max-w-md text-xs text-slate-600 md:text-sm dark:text-slate-400">
              Sistema inteligente de gerenciamento de chamados. Simplifique seu
              suporte, aumente a produtividade e ofereça uma experiência
              excepcional aos seus clientes.
            </p>

            {/* Social Links */}
            {showSocial && (
              <div className="mt-6 flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label={social.label}
                  >
                    <div
                      className={`rounded-lg bg-linear-to-br ${social.gradient} p-2.5 shadow-md transition-all hover:scale-110 hover:shadow-lg`}
                    >
                      <social.icon className="h-4 w-4 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Colunas de Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
              Produto
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-linear-to-r from-blue-600 to-indigo-600 transition-all group-hover:w-full" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
              Recursos
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    {link.icon && <link.icon className="h-3.5 w-3.5" />}
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-linear-to-r from-blue-600 to-indigo-600 transition-all group-hover:w-full" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-900 uppercase dark:text-slate-100">
              Legal
            </h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                  >
                    {link.icon && <link.icon className="h-3.5 w-3.5" />}
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 h-px w-0 bg-linear-to-r from-blue-600 to-indigo-600 transition-all group-hover:w-full" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Section (opcional) */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Fique por dentro das novidades
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Receba atualizações e dicas sobre gestão de suporte
              </p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                type="email"
                placeholder="seu@email.com"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button className="rounded-lg bg-linear-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl">
                Inscrever
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            {/* Copyright */}
            <div className="flex flex-col items-center gap-2 text-sm text-slate-600 md:flex-row dark:text-slate-400">
              <span>
                © {currentYear} {companyName}.
              </span>
              <span>Todos os direitos reservados.</span>
            </div>

            <div className="flex flex-col gap-2 md:flex-row">
              <div className="flex flex-col items-center gap-2 text-sm text-slate-600 md:flex-row dark:text-slate-400">
                Desenvolvido por
                <Link
                  href="https://br.linkedin.com/in/lincolnsouza10"
                  className="font-semibold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lincoln Souza.
                </Link>
              </div>

              {/* Language (placeholder) */}
              <div className="flex items-center gap-3">
                <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                  🇧🇷 Português
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Todos os sistemas operacionais
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
