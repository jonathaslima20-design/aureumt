import { ArrowLeft, Cookie, Shield, BarChart3, Megaphone, Settings, Globe, RefreshCw, Mail } from 'lucide-react';

interface CookiePolicyProps {
  onBack: () => void;
}

const sections = [
  {
    icon: Cookie,
    title: '1. O que são cookies?',
    content:
      'Cookies são pequenos arquivos armazenados no dispositivo do usuário quando ele acessa um site ou plataforma. Eles ajudam a reconhecer o navegador, manter sessões ativas, lembrar preferências e melhorar a experiência de navegação.',
  },
  {
    icon: Globe,
    title: '2. Como o AuraTalk utiliza cookies?',
    content:
      'O AuraTalk pode utilizar cookies e tecnologias semelhantes para garantir o funcionamento adequado da plataforma, proteger contas de usuários, melhorar a experiência, analisar o uso do sistema e apoiar ações de comunicação, marketing e mensuração de campanhas.',
  },
  {
    icon: Settings,
    title: '3. Tipos de cookies utilizados',
    content:
      'O AuraTalk pode utilizar diferentes categorias de cookies, conforme sua finalidade. Alguns são necessários para o funcionamento da plataforma, enquanto outros dependem do consentimento do usuário.',
  },
  {
    icon: Shield,
    title: '4. Cookies essenciais',
    content:
      'São necessários para o funcionamento básico da plataforma. Eles permitem recursos como autenticação, segurança, login, manutenção da sessão, prevenção de fraudes, proteção de contas e navegação entre áreas do sistema. Esses cookies não podem ser desativados pelo painel de preferências, pois são indispensáveis para o uso adequado do AuraTalk.',
  },
  {
    icon: Settings,
    title: '5. Cookies funcionais',
    content:
      'São utilizados para lembrar preferências do usuário, como idioma, tema, configurações visuais, preferências de navegação e escolhas feitas dentro da plataforma. Esses cookies ajudam a tornar a experiência mais personalizada e conveniente.',
  },
  {
    icon: BarChart3,
    title: '6. Cookies de analytics',
    content:
      'São utilizados para entender como visitantes e usuários interagem com o site e com a plataforma. Esses cookies podem ajudar a identificar páginas mais acessadas, tempo de navegação, origem dos acessos, eventos de uso e oportunidades de melhoria na experiência do usuário.',
  },
  {
    icon: Megaphone,
    title: '7. Cookies de marketing',
    content:
      'São utilizados para mensurar campanhas, acompanhar conversões, criar públicos personalizados, realizar remarketing e melhorar a comunicação comercial do AuraTalk. Esses cookies somente devem ser ativados mediante consentimento do usuário.',
  },
  {
    icon: Globe,
    title: '8. Cookies de terceiros',
    content:
      'O AuraTalk pode utilizar serviços de terceiros que também utilizam cookies ou tecnologias semelhantes, como ferramentas de análise, plataformas de anúncios, gateways de pagamento, provedores de autenticação, serviços de infraestrutura, APIs de inteligência artificial e integrações com WhatsApp. Esses terceiros possuem suas próprias políticas de privacidade e cookies.',
  },
  {
    icon: Settings,
    title: '9. Gerenciamento de cookies',
    content:
      'O usuário pode aceitar, recusar ou personalizar o uso de cookies opcionais por meio do banner de consentimento exibido na plataforma. Também é possível configurar o navegador para bloquear ou excluir cookies. No entanto, a desativação de cookies essenciais pode comprometer o funcionamento correto da plataforma.',
  },
  {
    icon: RefreshCw,
    title: '10. Alterações nesta política',
    content:
      'Esta Política de Cookies pode ser atualizada periodicamente para refletir mudanças legais, técnicas ou operacionais. Recomendamos que o usuário revise esta página regularmente.',
  },
  {
    icon: Mail,
    title: '11. Contato',
    content:
      'Em caso de dúvidas sobre esta Política de Cookies ou sobre o tratamento de dados pessoais, o usuário pode entrar em contato com o AuraTalk pelo e-mail:',
    email: 'contato@auratalk.com.br',
  },
];

export function CookiePolicy({ onBack }: CookiePolicyProps) {
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <div className="relative z-10">
        {/* Header */}
        <header className="pt-28 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase">Voltar para o início</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <img
                src="/auratalk_logo_sem_fundo.png"
                alt="AuraTalk"
                className="h-8 w-auto object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Política de Cookies
            </h1>

            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl">
              Esta Política de Cookies explica como o AuraTalk utiliza cookies e tecnologias
              semelhantes para oferecer uma experiência mais segura, personalizada e eficiente.
            </p>

            <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-gray-600 uppercase">
              Última atualização: 17 de maio de 2026
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="px-6 pb-24">
          <div className="max-w-3xl mx-auto space-y-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <article
                  key={section.title}
                  className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#ff3b00]/10 flex items-center justify-center mt-0.5">
                      <Icon size={16} className="text-[#ff3b00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base sm:text-lg font-semibold text-white mb-3">
                        {section.title}
                      </h2>
                      <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                        {section.content}
                      </p>
                      {section.email && (
                        <a
                          href={`mailto:${section.email}`}
                          className="inline-block mt-3 text-[#ff3b00] hover:text-[#ff3b00]/80 font-mono text-sm transition-colors"
                        >
                          {section.email}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para o início
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#050505] py-12 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <span className="font-mono text-[9px] tracking-[0.2em] text-gray-700">
              &copy; 2024 AURATALK AI SYSTEMS.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
