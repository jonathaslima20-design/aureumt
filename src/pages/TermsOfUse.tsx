import { ArrowLeft, FileText, Users, Target, ShieldCheck, CheckCircle, XCircle, MessageSquare, Cpu, Link2, CreditCard, Ban, BarChart3, Lock, Award, Server, Headphones, Bell, RefreshCw, UserX, Scale, Gavel, Mail } from 'lucide-react';

interface TermsOfUseProps {
  onBack: () => void;
}

const sections = [
  {
    icon: FileText,
    title: '1. Definicoes',
    paragraphs: [
      'Para fins destes Termos, considera-se:',
    ],
    list: [
      'AuraTalk: plataforma SaaS de agentes de IA para WhatsApp, incluindo site, painel, dashboard, integracoes, automacoes, APIs e funcionalidades relacionadas.',
      'Usuario: pessoa fisica ou juridica que cria uma conta, acessa, contrata ou utiliza a plataforma.',
      'Cliente final: pessoa que interage com os agentes de IA criados pelo usuario, geralmente por meio do WhatsApp.',
      'Agente de IA: chatbot inteligente configurado pelo usuario para interagir automaticamente com clientes finais.',
      'Base de conhecimento: conjunto de arquivos, textos, URLs, audios, documentos, informacoes e conteudos enviados pelo usuario para treinamento ou contextualizacao dos agentes.',
      'Integracoes: conexoes com servicos externos, como WhatsApp, Evolution API, Google Gemini, Supabase, MercadoPago e outros provedores necessarios ao funcionamento da plataforma.',
    ],
  },
  {
    icon: Target,
    title: '2. Objeto',
    paragraphs: [
      'O AuraTalk oferece uma plataforma para criacao e gerenciamento de agentes de IA para WhatsApp, permitindo que usuarios configurem automacoes, personalizem personas, adicionem bases de conhecimento, monitorem conversas, acompanhem metricas e utilizem recursos de atendimento automatizado.',
      'O AuraTalk nao substitui integralmente a atuacao humana em situacoes que exijam julgamento profissional, analise sensivel, decisao juridica, medica, financeira, emergencial ou atendimento especializado.',
    ],
  },
  {
    icon: Users,
    title: '3. Cadastro e conta de usuario',
    paragraphs: [
      'Para utilizar determinadas funcionalidades do AuraTalk, o usuario devera criar uma conta informando dados verdadeiros, completos e atualizados.',
      'O usuario e responsavel por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.',
      'O AuraTalk podera suspender ou encerrar contas que apresentem informacoes falsas, uso indevido, violacao destes Termos ou indicios de fraude, abuso, risco a seguranca ou descumprimento legal.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '4. Aceite dos Termos e Politica de Privacidade',
    paragraphs: [
      'Para criar uma conta no AuraTalk, o usuario devera aceitar expressamente estes Termos de Uso e a Politica de Privacidade.',
      'O aceite devera ser realizado por meio de checkbox obrigatorio no formulario de cadastro.',
      'Ao marcar o checkbox e concluir o cadastro, o usuario declara que leu, compreendeu e concorda com os documentos legais apresentados.',
      'O AuraTalk podera registrar informacoes relacionadas ao aceite, incluindo data e hora, versao dos documentos aceitos, identificador do usuario e informacoes tecnicas necessarias para fins de seguranca, auditoria e comprovacao.',
    ],
  },
  {
    icon: CheckCircle,
    title: '5. Uso permitido da plataforma',
    paragraphs: [
      'O usuario compromete-se a utilizar o AuraTalk de forma licita, etica e compativel com estes Termos, com a legislacao aplicavel e com as politicas das plataformas integradas.',
      'O usuario podera utilizar o AuraTalk para:',
    ],
    list: [
      'criar agentes de IA personalizados;',
      'automatizar atendimentos no WhatsApp;',
      'organizar bases de conhecimento;',
      'acompanhar conversas e metricas;',
      'configurar respostas, horarios, personas e fluxos de atendimento;',
      'integrar canais e ferramentas autorizadas;',
      'melhorar processos de atendimento, vendas e suporte.',
    ],
  },
  {
    icon: XCircle,
    title: '6. Uso proibido',
    paragraphs: [
      'E proibido utilizar o AuraTalk para:',
    ],
    list: [
      'praticar atividades ilegais, fraudulentas, enganosas ou abusivas;',
      'enviar spam, mensagens em massa nao autorizadas ou comunicacoes sem consentimento;',
      'violar direitos de terceiros, incluindo privacidade, propriedade intelectual, imagem e honra;',
      'coletar, tratar ou compartilhar dados pessoais sem base legal adequada;',
      'disseminar conteudo ofensivo, discriminatorio, violento, ameacador, sexualmente explicito, difamatorio ou ilicito;',
      'tentar burlar limites de planos, sistemas de seguranca, autenticacao ou mecanismos da plataforma;',
      'utilizar a plataforma para golpes, phishing, engenharia social ou praticas semelhantes;',
      'automatizar comunicacoes que violem politicas do WhatsApp, Meta ou de qualquer provedor integrado;',
      'inserir conteudos maliciosos, virus, scripts nocivos ou materiais que possam comprometer a seguranca da plataforma;',
      'vender, sublicenciar, copiar, modificar ou explorar indevidamente qualquer parte do AuraTalk sem autorizacao.',
    ],
  },
  {
    icon: MessageSquare,
    title: '7. Responsabilidade pelo conteudo e pelas mensagens',
    paragraphs: [
      'O usuario e o unico responsavel pelas informacoes inseridas na plataforma, incluindo bases de conhecimento, arquivos, textos, URLs, audios, prompts, personas, exemplos de treinamento, mensagens automaticas e respostas geradas ou enviadas por seus agentes de IA.',
      'O usuario reconhece que sistemas de inteligencia artificial podem gerar respostas incorretas, incompletas, imprecisas ou inadequadas. Por isso, recomenda-se que o usuario monitore as conversas e configure corretamente seus agentes antes de utiliza-los com clientes finais.',
      'O AuraTalk nao se responsabiliza por prejuizos decorrentes de configuracoes incorretas, uso inadequado da plataforma, informacoes falsas adicionadas pelo usuario, falta de revisao humana ou decisoes tomadas com base em respostas geradas por IA.',
    ],
  },
  {
    icon: Cpu,
    title: '8. Inteligencia artificial e limitacoes das respostas',
    paragraphs: [
      'Os agentes do AuraTalk utilizam tecnologias de inteligencia artificial generativa e podem responder com base nas configuracoes, prompts, bases de conhecimento e exemplos fornecidos pelo usuario.',
      'Embora o AuraTalk busque oferecer uma experiencia eficiente e humanizada, a plataforma nao garante que as respostas geradas pelos agentes serao sempre exatas, completas, adequadas, atualizadas ou livres de erro.',
      'O usuario deve revisar, testar e monitorar seus agentes, especialmente quando utilizados em areas sensiveis, vendas, suporte tecnico, saude, financas, juridico, contratos, cobrancas ou qualquer situacao que possa gerar impacto relevante ao cliente final.',
    ],
  },
  {
    icon: Link2,
    title: '9. Integracao com WhatsApp e servicos de terceiros',
    paragraphs: [
      'O funcionamento do AuraTalk pode depender de integracoes com servicos de terceiros, incluindo APIs, provedores de inteligencia artificial, infraestrutura, autenticacao, pagamentos e conexao com WhatsApp.',
      'O usuario reconhece que instabilidades, alteracoes, bloqueios, limitacoes, falhas ou indisponibilidades em servicos de terceiros podem impactar o funcionamento do AuraTalk.',
      'O AuraTalk nao garante disponibilidade continua de servicos externos e nao se responsabiliza por bloqueios, restricoes, banimentos, limitacoes ou penalidades aplicadas por plataformas terceiras, incluindo WhatsApp, Meta, provedores de API ou gateways de pagamento, quando decorrentes de uso inadequado, violacao de politicas ou decisoes dessas plataformas.',
    ],
  },
  {
    icon: CreditCard,
    title: '10. Planos, pagamentos e assinaturas',
    paragraphs: [
      'O AuraTalk podera oferecer planos gratuitos e pagos, com diferentes limites de uso, funcionalidades, quantidade de agentes, conexoes, mensagens, bases de conhecimento, tokens, recursos avancados e suporte.',
      'Os valores, condicoes, limites e beneficios de cada plano serao apresentados na pagina de precos, checkout ou painel do usuario.',
      'Os pagamentos poderao ser processados por plataformas terceiras, como MercadoPago, podendo incluir PIX, cartao de credito ou outros meios disponiveis.',
      'Ao contratar um plano pago, o usuario concorda com os valores, ciclos de cobranca, limites e condicoes apresentadas no momento da contratacao.',
    ],
  },
  {
    icon: Ban,
    title: '11. Cancelamento, suspensao e reembolso',
    paragraphs: [
      'O usuario podera solicitar o cancelamento de sua assinatura conforme os meios disponibilizados pela plataforma.',
      'O cancelamento impede novas cobrancas futuras, mas nao garante, por si so, o reembolso de valores ja pagos, salvo quando exigido por lei, politica comercial vigente ou regra especifica informada no momento da contratacao.',
      'O AuraTalk podera suspender ou limitar o acesso do usuario em caso de inadimplencia, uso abusivo, violacao destes Termos, risco a seguranca, suspeita de fraude ou descumprimento legal.',
    ],
  },
  {
    icon: BarChart3,
    title: '12. Limites de uso',
    paragraphs: [
      'Cada plano podera possuir limites de uso, incluindo, mas nao se limitando a:',
    ],
    list: [
      'quantidade de agentes;',
      'conexoes de WhatsApp;',
      'mensagens;',
      'tokens de IA;',
      'bases de conhecimento;',
      'armazenamento;',
      'funcionalidades avancadas;',
      'usuarios ou membros da equipe;',
      'volume de processamento.',
    ],
    paragraphsAfterList: [
      'O AuraTalk podera limitar, suspender ou cobrar valores adicionais caso o usuario exceda os limites contratados, conforme regras apresentadas na plataforma.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '13. Dados pessoais e privacidade',
    paragraphs: [
      'O tratamento de dados pessoais pelo AuraTalk sera realizado conforme a legislacao aplicavel e a Politica de Privacidade da plataforma.',
      'O usuario declara possuir autorizacao, base legal ou consentimento adequado para inserir, tratar ou compartilhar dados pessoais de clientes finais na plataforma.',
      'O usuario e responsavel por informar seus clientes finais, quando aplicavel, sobre o uso de atendimento automatizado, inteligencia artificial, tratamento de dados e armazenamento de conversas.',
    ],
  },
  {
    icon: Lock,
    title: '14. Seguranca da informacao',
    paragraphs: [
      'O AuraTalk adota medidas tecnicas e organizacionais razoaveis para proteger dados, contas, conexoes e informacoes armazenadas na plataforma.',
      'Apesar disso, nenhum sistema digital e totalmente imune a falhas, ataques, indisponibilidades ou acessos nao autorizados.',
      'O usuario deve utilizar senhas seguras, proteger suas credenciais, evitar compartilhamento indevido de acessos e comunicar imediatamente qualquer suspeita de uso nao autorizado de sua conta.',
    ],
  },
  {
    icon: Award,
    title: '15. Propriedade intelectual',
    paragraphs: [
      'O AuraTalk, incluindo marca, identidade visual, codigo, design, interface, recursos, fluxos, textos, componentes, documentacao e tecnologia, pertence aos seus respectivos titulares e e protegido por leis de propriedade intelectual.',
      'O usuario nao adquire qualquer direito de propriedade sobre a plataforma, recebendo apenas uma licenca limitada, nao exclusiva, revogavel e intransferivel para utilizar o AuraTalk conforme estes Termos.',
      'Os conteudos inseridos pelo usuario continuam pertencendo ao proprio usuario ou aos respectivos titulares, sendo concedida ao AuraTalk autorizacao para processa-los exclusivamente na medida necessaria para funcionamento da plataforma.',
    ],
  },
  {
    icon: Server,
    title: '16. Disponibilidade e manutencao',
    paragraphs: [
      'O AuraTalk podera passar por atualizacoes, manutencoes, melhorias, correcoes ou alteracoes tecnicas, que poderao causar indisponibilidade temporaria da plataforma.',
      'A plataforma podera ser modificada, aprimorada, suspensa ou descontinuada parcialmente, sempre que necessario para melhoria do servico, seguranca, adequacao tecnica, cumprimento legal ou estrategia comercial.',
    ],
  },
  {
    icon: Headphones,
    title: '17. Suporte',
    paragraphs: [
      'O AuraTalk podera oferecer canais de suporte conforme o plano contratado e as condicoes disponiveis na plataforma.',
      'O suporte pode abranger duvidas de uso, problemas tecnicos, configuracoes basicas, cobranca, acesso e funcionamento geral da plataforma.',
      'O suporte nao inclui, salvo disposicao especifica, consultoria juridica, criacao integral de estrategias comerciais, configuracao avancada de campanhas, gestao de trafego, atendimento humano aos clientes finais ou operacao personalizada do negocio do usuario.',
    ],
  },
  {
    icon: Bell,
    title: '18. Comunicacoes',
    paragraphs: [
      'O AuraTalk podera enviar comunicacoes ao usuario relacionadas a conta, seguranca, cobranca, atualizacoes, suporte, alteracoes nos Termos, novidades da plataforma e informacoes operacionais.',
      'Essas comunicacoes poderao ocorrer por e-mail, WhatsApp, notificacoes internas, painel do usuario ou outros canais informados pelo usuario.',
    ],
  },
  {
    icon: RefreshCw,
    title: '19. Alteracoes nos Termos de Uso',
    paragraphs: [
      'O AuraTalk podera atualizar estes Termos de Uso periodicamente para refletir mudancas legais, tecnicas, comerciais ou operacionais.',
      'Quando alteracoes relevantes forem realizadas, o AuraTalk podera comunicar os usuarios por meio da plataforma, e-mail ou outro canal disponivel.',
      'O uso continuo da plataforma apos a atualizacao dos Termos representa concordancia com a nova versao.',
    ],
  },
  {
    icon: UserX,
    title: '20. Encerramento da conta',
    paragraphs: [
      'O usuario podera solicitar o encerramento de sua conta conforme os canais disponibilizados pelo AuraTalk.',
      'O AuraTalk podera reter determinadas informacoes pelo periodo necessario ao cumprimento de obrigacoes legais, regulatorias, fiscais, contratuais, auditoria, seguranca, prevencao a fraudes ou defesa de direitos.',
    ],
  },
  {
    icon: Scale,
    title: '21. Limitacao de responsabilidade',
    paragraphs: [
      'Na maxima extensao permitida pela legislacao aplicavel, o AuraTalk nao sera responsavel por:',
    ],
    list: [
      'danos decorrentes de uso inadequado da plataforma;',
      'configuracoes incorretas feitas pelo usuario;',
      'respostas geradas por IA com erro, omissao ou imprecisao;',
      'perda de vendas, lucros, oportunidades ou receitas;',
      'bloqueios ou restricoes aplicadas por terceiros;',
      'falhas em servicos externos;',
      'indisponibilidade temporaria;',
      'uso indevido de dados inseridos pelo usuario;',
      'violacao de leis ou politicas por parte do usuario.',
    ],
    paragraphsAfterList: [
      'Nada nestes Termos exclui responsabilidades que nao possam ser afastadas pela legislacao aplicavel.',
    ],
  },
  {
    icon: Gavel,
    title: '22. Legislacao aplicavel e foro',
    paragraphs: [
      'Estes Termos de Uso serao regidos pelas leis da Republica Federativa do Brasil.',
      'Eventuais controversias relacionadas a estes Termos ou ao uso da plataforma deverao ser resolvidas no foro da comarca da empresa responsavel pelo AuraTalk, salvo disposicao legal obrigatoria em sentido contrario.',
    ],
  },
  {
    icon: Mail,
    title: '23. Contato',
    paragraphs: [
      'Em caso de duvidas sobre estes Termos de Uso, o usuario podera entrar em contato pelo e-mail:',
    ],
    email: 'contato@auratalk.com.br',
  },
];

type Section = {
  icon: typeof FileText;
  title: string;
  paragraphs: string[];
  list?: string[];
  paragraphsAfterList?: string[];
  email?: string;
};

export function TermsOfUse({ onBack }: TermsOfUseProps) {
  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      <div className="relative z-10">
        <header className="pt-28 pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase">Voltar para o inicio</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <img
                src="/auratalk_logo_sem_fundo.png"
                alt="AuraTalk"
                className="h-8 w-auto object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Termos de Uso
            </h1>

            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl">
              Estes Termos regulam o acesso e a utilizacao da plataforma AuraTalk, uma solucao SaaS de agentes de IA para WhatsApp.
            </p>

            <p className="mt-4 font-mono text-[10px] tracking-[0.15em] text-gray-600 uppercase">
              Ultima atualizacao: 17 de maio de 2026
            </p>
          </div>
        </header>

        <main className="px-6 pb-24">
          <div className="max-w-3xl mx-auto">
            {/* Introduction */}
            <article className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-6">
              <p className="text-gray-300 text-sm sm:text-[15px] leading-relaxed mb-4">
                Bem-vindo ao AuraTalk.
              </p>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-4">
                Estes Termos de Uso regulam o acesso e a utilizacao da plataforma AuraTalk, uma solucao SaaS de agentes de inteligencia artificial para WhatsApp, destinada a criacao, personalizacao, treinamento, publicacao e monitoramento de chatbots inteligentes para atendimento, vendas, suporte e relacionamento com clientes.
              </p>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                Ao criar uma conta, acessar, contratar ou utilizar o AuraTalk, o usuario declara que leu, compreendeu e concorda com estes Termos de Uso.
              </p>
            </article>

            {/* Sections */}
            <div className="space-y-6">
              {(sections as Section[]).map((section) => {
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
                        {section.paragraphs.map((p, i) => (
                          <p key={i} className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-3 last:mb-0">
                            {p}
                          </p>
                        ))}
                        {section.list && (
                          <ul className="mt-3 space-y-2">
                            {section.list.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                                <span className="text-[#ff3b00] mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff3b00]/60" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.paragraphsAfterList?.map((p, i) => (
                          <p key={`after-${i}`} className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mt-3">
                            {p}
                          </p>
                        ))}
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
          </div>

          {/* Bottom CTA */}
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={16} />
              Voltar para o inicio
            </button>
          </div>
        </main>

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
