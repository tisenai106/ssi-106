import { Footer } from '../_components/footer';
import { Header } from '../_components/header';
import { AuthProvider } from './auth-provider'; // <-- 1. Importe o novo provedor

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    // 2. "Abraçe" todo o layout com o AuthProvider
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        {/* O Header (Server Component) funciona normalmente */}
        <Header />

        {/* O conteúdo da página (Client ou Server) é renderizado dentro do provedor */}
        <main className="flex-1">{children}</main>
        <Footer
          companyName="SSI - 1.06"
          supportEmail="ti.senai106@sp.senai.br"
          showSocial={true}
        />
      </div>
    </AuthProvider>
  );
}
