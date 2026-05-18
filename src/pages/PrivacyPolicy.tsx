import { ArrowLeft, FileText, ClipboardList, Database, CreditCard, BarChart3, Bot, BookOpen, MessageSquare, Cookie, Target, Scale, Users, Share2, Globe, Server, ShieldCheck, UserCheck, Cpu, Plane, Bell, Baby, RefreshCw, Mail, UserCog } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
}

type Section = {
  icon: typeof FileText;
  title: string;
  paragraphs: string[];
  subsections?: { title: string; paragraphs?: string[]; list?: string[]; paragraphsAfterList?: string[] }[];
  list?: string[];
  paragraphsAfterList?: string[];
  email?: string;
  link?: { text: string; href: string };
};

const sections: Section[] = [
  {
    icon: FileText,
    title: '1. Definicoes',
    paragraphs: [
      'Para fins desta Politica, considera-se:',
    ],
    list: [
      'AuraTalk: plataforma SaaS de agentes de IA para WhatsApp, incluindo site, painel, dashboard, automacoes, integracoes, APIs, agentes inteligentes e funcionalidades relacionadas.',
      'Usuario: pessoa fisica ou juridica que cria uma conta, contrata ou utiliza o AuraTalk.',
      'Cliente final: pessoa que interage com os agentes de IA criados pelo usuario, geralmente por meio do WhatsApp.',
      'Dados pessoais: informacoes relacionadas a pessoa natural identificada ou identificavel.',
      'Tratamento de dados: qualquer operacao realizada com dados pessoais, como coleta, armazenamento, uso, processamento, compartilhamento, exclusao, classificacao, analise e transmissao.',
      'Agente de IA: chatbot inteligente configurado pelo usuario para interagir automaticamente com clientes finais.',
      'Base de conhecimento: conjunto de arquivos, URLs, textos, documentos, audios e informacoes enviados pelo usuario para treinar ou contextualizar os agentes de IA.',
    ],
  },
  {
    icon: ClipboardList,
    title: '2. Quais dados podemos coletar',
    paragraphs: [
      'O AuraTalk pode coletar diferentes tipos de dados, conforme o uso da plataforma.',
    ],
    subsections: [
      {
        title: '2.1. Dados de cadastro do usuario',
        paragraphs: ['Podemos coletar:'],
        list: [
          'nome;',
          'e-mail;',
          'telefone;',
          'senha criptografada ou credenciais de autenticacao;',
          'empresa ou nome do negocio;',
          'cargo ou funcao;',
          'dados de perfil;',
          'data de criacao da conta;',
          'plano contratado;',
          'status da assinatura.',
        ],
      },
      {
        title: '2.2. Dados de pagamento e assinatura',
        paragraphs: ['Para processar pagamentos e gerenciar assinaturas, podemos tratar:'],
        list: [
          'plano escolhido;',
          'ciclo de cobranca;',
          'status do pagamento;',
          'historico de pagamentos;',
          'identificadores de transacao;',
          'metodo de pagamento utilizado;',
          'dados necessarios para emissao de comprovantes, quando aplicavel.',
        ],
        paragraphsAfterList: [
          'Os pagamentos podem ser processados por provedores terceirizados, como MercadoPago. O AuraTalk nao armazena integralmente dados sensiveis de cartao de credito, como numero completo do cartao, CVV ou dados equivalentes, quando o processamento e feito diretamente pelo provedor de pagamento.',
        ],
      },
      {
        title: '2.3. Dados de uso da plataforma',
        paragraphs: ['Podemos coletar:'],
        list: [
          'logs de acesso;',
          'endereco IP;',
          'tipo de dispositivo;',
          'navegador;',
          'sistema operacional;',
          'paginas acessadas;',
          'eventos de uso;',
          'data e hora de acessos;',
          'recursos utilizados;',
          'quantidade de agentes criados;',
          'quantidade de mensagens;',
          'consumo de tokens;',
          'status de conexoes;',
          'erros, falhas e eventos tecnicos.',
        ],
      },
      {
        title: '2.4. Dados de agentes de IA',
        paragraphs: ['Ao configurar agentes no AuraTalk, o usuario pode inserir:'],
        list: [
          'nome do agente;',
          'avatar;',
          'persona;',
          'tom de voz;',
          'idioma;',
          'instrucoes de comportamento;',
          'exemplos de mensagens;',
          'prompts;',
          'regras de atendimento;',
          'horarios de funcionamento;',
          'variaveis personalizadas;',
          'configuracoes de automacao.',
        ],
      },
      {
        title: '2.5. Dados de bases de conhecimento',
        paragraphs: ['O usuario pode enviar conteudos para treinar ou contextualizar seus agentes, incluindo:'],
        list: [
          'arquivos;',
          'documentos;',
          'textos;',
          'URLs;',
          'audios;',
          'descricoes de produtos ou servicos;',
          'politicas internas;',
          'materiais comerciais;',
          'FAQs;',
          'informacoes institucionais.',
        ],
        paragraphsAfterList: [
          'O usuario e responsavel por garantir que possui autorizacao, base legal ou direito adequado para inserir esses conteudos na plataforma.',
        ],
      },
      {
        title: '2.6. Dados de conversas e clientes finais',
        paragraphs: ['Quando o usuario conecta canais de WhatsApp e utiliza agentes de IA, a plataforma pode processar informacoes relacionadas as conversas, como:'],
        list: [
          'nome ou identificacao do contato;',
          'numero de telefone;',
          'mensagens enviadas e recebidas;',
          'audios;',
          'imagens;',
          'documentos;',
          'horarios de mensagens;',
          'labels;',
          'notas internas;',
          'historico de atendimento;',
          'memoria personalizada do cliente;',
          'interacoes com agentes de IA;',
          'status da conversa.',
        ],
        paragraphsAfterList: [
          'O usuario e responsavel por informar seus clientes finais, quando aplicavel, sobre o uso de atendimento automatizado, inteligencia artificial e tratamento de dados pessoais.',
        ],
      },
      {
        title: '2.7. Cookies e tecnologias semelhantes',
        paragraphs: [
          'O AuraTalk pode utilizar cookies e tecnologias semelhantes para funcionamento da plataforma, seguranca, autenticacao, preferencias, analytics e marketing.',
          'O uso de cookies e detalhado na Politica de Cookies.',
        ],
      },
    ],
  },
  {
    icon: Target,
    title: '3. Como utilizamos os dados',
    paragraphs: [
      'O AuraTalk pode utilizar dados pessoais para:',
    ],
    list: [
      'criar e gerenciar contas de usuarios;',
      'autenticar acessos;',
      'proteger a plataforma;',
      'permitir o funcionamento dos agentes de IA;',
      'processar mensagens e conversas;',
      'conectar contas de WhatsApp;',
      'treinar e contextualizar agentes com base nas informacoes fornecidas pelo usuario;',
      'gerar respostas automatizadas;',
      'permitir controle manual de conversas;',
      'armazenar historico de atendimento;',
      'organizar labels, notas e memorias de clientes;',
      'processar pagamentos e assinaturas;',
      'controlar limites de planos;',
      'calcular consumo de tokens;',
      'gerar metricas e analytics;',
      'melhorar a experiencia do usuario;',
      'oferecer suporte;',
      'enviar comunicacoes operacionais, administrativas e comerciais;',
      'prevenir fraudes, abusos e incidentes de seguranca;',
      'cumprir obrigacoes legais, regulatorias e contratuais;',
      'defender direitos do AuraTalk, dos usuarios ou de terceiros.',
    ],
  },
  {
    icon: Scale,
    title: '4. Bases legais para o tratamento',
    paragraphs: [
      'O tratamento de dados pessoais pelo AuraTalk podera ocorrer com base nas hipoteses previstas na legislacao aplicavel, incluindo, conforme o caso:',
    ],
    list: [
      'execucao de contrato ou procedimentos preliminares relacionados a contrato;',
      'cumprimento de obrigacao legal ou regulatoria;',
      'exercicio regular de direitos;',
      'legitimo interesse;',
      'consentimento do titular;',
      'prevencao a fraudes e seguranca do titular;',
      'protecao do credito, quando aplicavel.',
    ],
    paragraphsAfterList: [
      'Quando o tratamento depender de consentimento, o usuario podera revoga-lo, respeitadas as obrigacoes legais, contratuais e operacionais aplicaveis.',
    ],
  },
  {
    icon: Users,
    title: '5. Responsabilidades do usuario',
    paragraphs: [
      'O usuario e responsavel por:',
    ],
    list: [
      'inserir apenas dados que esteja autorizado a tratar;',
      'informar clientes finais sobre o uso de agentes de IA, quando aplicavel;',
      'obter consentimentos ou definir bases legais adequadas para tratamento dos dados;',
      'nao utilizar a plataforma para spam, fraude, golpes ou comunicacoes ilegais;',
      'manter atualizadas as informacoes de sua conta;',
      'revisar e monitorar as respostas dos agentes;',
      'garantir que suas bases de conhecimento nao violem direitos de terceiros;',
      'cumprir a LGPD, o Marco Civil da Internet, normas de protecao ao consumidor e politicas das plataformas integradas, como WhatsApp e Meta.',
    ],
  },
  {
    icon: Share2,
    title: '6. Compartilhamento de dados',
    paragraphs: [
      'O AuraTalk podera compartilhar dados pessoais apenas quando necessario para a prestacao dos servicos, cumprimento legal, seguranca ou funcionamento da plataforma.',
      'Os dados podem ser compartilhados com:',
    ],
    list: [
      'provedores de hospedagem e infraestrutura;',
      'Supabase, para autenticacao, banco de dados, storage e funcoes serverless;',
      'provedores de inteligencia artificial, como Google Gemini API;',
      'provedores de integracao com WhatsApp, como Evolution API;',
      'gateways de pagamento, como MercadoPago;',
      'ferramentas de analytics e mensuracao, quando autorizadas;',
      'ferramentas de comunicacao e suporte;',
      'autoridades publicas, quando exigido por lei ou ordem valida;',
      'parceiros tecnicos necessarios a operacao da plataforma.',
    ],
    paragraphsAfterList: [
      'O AuraTalk nao vende dados pessoais dos usuarios ou clientes finais.',
    ],
  },
  {
    icon: Globe,
    title: '7. Servicos de terceiros',
    paragraphs: [
      'O AuraTalk depende de integracoes com servicos de terceiros para oferecer determinadas funcionalidades.',
      'Esses terceiros podem possuir suas proprias politicas de privacidade, termos de uso, padroes de seguranca e regras de tratamento de dados.',
      'O usuario reconhece que alteracoes, falhas, indisponibilidades, bloqueios ou restricoes nesses servicos podem impactar o funcionamento da plataforma.',
    ],
  },
  {
    icon: Server,
    title: '8. Armazenamento e retencao dos dados',
    paragraphs: [
      'Os dados pessoais serao armazenados pelo periodo necessario para cumprir as finalidades descritas nesta Politica, prestar os servicos contratados, cumprir obrigacoes legais, resolver disputas, manter seguranca, prevenir fraudes e defender direitos.',
      'Apos o encerramento da conta, determinados dados poderao ser mantidos pelo periodo necessario ao cumprimento de obrigacoes legais, fiscais, regulatorias, contratuais, auditoria, prevencao a fraudes ou defesa de direitos.',
      'Quando nao houver necessidade de retencao, os dados poderao ser excluidos ou anonimizados, conforme criterios tecnicos e legais aplicaveis.',
    ],
  },
  {
    icon: ShieldCheck,
    title: '9. Seguranca da informacao',
    paragraphs: [
      'O AuraTalk adota medidas tecnicas e organizacionais razoaveis para proteger dados pessoais contra acessos nao autorizados, perda, alteracao, divulgacao indevida ou destruicao.',
      'Essas medidas podem incluir:',
    ],
    list: [
      'autenticacao de usuarios;',
      'controle de acesso;',
      'Row-Level Security no banco de dados;',
      'criptografia em transito;',
      'isolamento de dados entre usuarios;',
      'monitoramento de logs;',
      'restricao de permissoes;',
      'backups e controles tecnicos;',
      'boas praticas de desenvolvimento seguro.',
    ],
    paragraphsAfterList: [
      'Apesar dos esforcos de seguranca, nenhum sistema digital e totalmente imune a incidentes, ataques, falhas ou indisponibilidades.',
    ],
  },
  {
    icon: UserCheck,
    title: '10. Direitos dos titulares de dados',
    paragraphs: [
      'Nos termos da legislacao aplicavel, os titulares de dados pessoais podem solicitar:',
    ],
    list: [
      'confirmacao da existencia de tratamento;',
      'acesso aos dados;',
      'correcao de dados incompletos, inexatos ou desatualizados;',
      'anonimizacao, bloqueio ou eliminacao de dados desnecessarios, excessivos ou tratados em desconformidade;',
      'portabilidade dos dados, quando aplicavel;',
      'informacao sobre compartilhamento de dados;',
      'revogacao do consentimento;',
      'eliminacao de dados tratados com base no consentimento, observadas as hipoteses legais de retencao;',
      'oposicao ao tratamento, quando aplicavel;',
      'revisao de decisoes tomadas unicamente com base em tratamento automatizado, quando aplicavel.',
    ],
    paragraphsAfterList: [
      'As solicitacoes poderao ser feitas pelo canal de contato indicado nesta Politica.',
    ],
  },
  {
    icon: MessageSquare,
    title: '11. Dados de clientes finais',
    paragraphs: [
      'O AuraTalk pode atuar como operador de dados pessoais em relacao aos dados dos clientes finais inseridos, enviados ou processados pelo usuario na plataforma.',
      'Nesses casos, o usuario podera atuar como controlador dos dados, sendo responsavel por definir as finalidades e bases legais do tratamento.',
      'O AuraTalk tratara os dados dos clientes finais conforme as instrucoes do usuario, os limites tecnicos da plataforma, esta Politica, os Termos de Uso e a legislacao aplicavel.',
    ],
  },
  {
    icon: Cpu,
    title: '12. Uso de inteligencia artificial',
    paragraphs: [
      'O AuraTalk utiliza tecnologias de inteligencia artificial para processar informacoes fornecidas pelo usuario, interpretar mensagens, gerar respostas, estruturar conhecimento e apoiar o atendimento automatizado.',
      'As respostas geradas por IA podem ser imprecisas, incompletas ou inadequadas. O usuario deve configurar, revisar, testar e monitorar seus agentes, especialmente quando houver impacto relevante ao cliente final.',
      'O usuario nao deve inserir na plataforma dados sensiveis, informacoes confidenciais ou dados de terceiros sem autorizacao, necessidade e base legal adequada.',
    ],
  },
  {
    icon: Plane,
    title: '13. Transferencia internacional de dados',
    paragraphs: [
      'Alguns provedores de tecnologia utilizados pelo AuraTalk podem armazenar ou processar dados em servidores localizados fora do Brasil.',
      'Quando houver transferencia internacional de dados, o AuraTalk buscara adotar medidas compativeis com a legislacao aplicavel e com padroes adequados de seguranca e protecao de dados.',
    ],
  },
  {
    icon: Bell,
    title: '14. Comunicacoes',
    paragraphs: [
      'O AuraTalk podera enviar comunicacoes relacionadas a:',
    ],
    list: [
      'criacao e seguranca da conta;',
      'alteracoes de senha;',
      'pagamentos e assinaturas;',
      'avisos operacionais;',
      'atualizacoes de produto;',
      'suporte;',
      'mudancas nos Termos ou Politicas;',
      'novidades, ofertas e comunicacoes comerciais, quando permitido.',
    ],
    paragraphsAfterList: [
      'O usuario podera gerenciar preferencias de comunicacao comercial quando essa opcao estiver disponivel.',
    ],
  },
  {
    icon: Baby,
    title: '15. Criancas e adolescentes',
    paragraphs: [
      'O AuraTalk nao e destinado ao uso por criancas.',
      'O usuario nao deve utilizar a plataforma para coletar ou tratar dados pessoais de criancas ou adolescentes sem observar as exigencias legais aplicaveis, incluindo consentimento especifico de responsaveis quando necessario.',
    ],
  },
  {
    icon: RefreshCw,
    title: '16. Alteracoes nesta Politica',
    paragraphs: [
      'Esta Politica de Privacidade podera ser atualizada periodicamente para refletir mudancas legais, tecnicas, operacionais ou comerciais.',
      'Quando houver alteracoes relevantes, o AuraTalk podera comunicar os usuarios por e-mail, aviso na plataforma ou outro meio disponivel.',
      'O uso continuo da plataforma apos a atualizacao representa ciencia da nova versao da Politica.',
    ],
  },
  {
    icon: Mail,
    title: '17. Contato',
    paragraphs: [
      'Em caso de duvidas, solicitacoes ou pedidos relacionados a dados pessoais e privacidade, entre em contato pelo e-mail:',
    ],
    email: 'contato@auratalk.com.br',
  },
  {
    icon: UserCog,
    title: '18. Encarregado de dados',
    paragraphs: [
      'Caso o AuraTalk indique formalmente um Encarregado pelo Tratamento de Dados Pessoais, as informacoes de contato poderao ser disponibilizadas nesta pagina ou em canal especifico da plataforma.',
      'Ate que haja indicacao especifica, as solicitacoes relacionadas a privacidade poderao ser encaminhadas para:',
    ],
    email: 'contato@auratalk.com.br',
  },
];

export function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
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
              Politica de Privacidade
            </h1>

            <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl">
              Esta Politica explica como o AuraTalk coleta, utiliza, armazena e protege dados pessoais no uso da plataforma.
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
                A sua privacidade e importante para o AuraTalk.
              </p>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-4">
                Esta Politica de Privacidade explica como coletamos, utilizamos, armazenamos, compartilhamos e protegemos dados pessoais quando voce acessa nosso site, cria uma conta, utiliza a plataforma AuraTalk, contrata planos, conecta canais de WhatsApp, configura agentes de IA ou interage com nossos servicos.
              </p>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-4">
                O AuraTalk e uma plataforma SaaS de agentes de inteligencia artificial para WhatsApp, voltada para atendimento, vendas, suporte e relacionamento com clientes.
              </p>
              <p className="text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                Ao utilizar o AuraTalk, voce declara que leu e compreendeu esta Politica de Privacidade.
              </p>
            </article>

            {/* Sections */}
            <div className="space-y-6">
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
                        {section.paragraphs.map((p, i) => (
                          <p key={i} className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-3 last:mb-0">
                            {p}
                          </p>
                        ))}
                        {section.list && (
                          <ul className="mt-3 space-y-2">
                            {section.list.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                                <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff3b00]/60" />
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
                        {section.subsections?.map((sub) => (
                          <div key={sub.title} className="mt-5 pl-0 sm:pl-2">
                            <h3 className="text-sm sm:text-[15px] font-medium text-white/90 mb-2">
                              {sub.title}
                            </h3>
                            {sub.paragraphs?.map((p, i) => (
                              <p key={i} className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mb-2">
                                {p}
                              </p>
                            ))}
                            {sub.list && (
                              <ul className="mt-2 space-y-1.5">
                                {sub.list.map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-gray-400 text-sm sm:text-[15px] leading-relaxed">
                                    <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#ff3b00]/40" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {sub.paragraphsAfterList?.map((p, i) => (
                              <p key={`sub-after-${i}`} className="text-gray-400 text-sm sm:text-[15px] leading-relaxed mt-3">
                                {p}
                              </p>
                            ))}
                          </div>
                        ))}
                        {section.link && (
                          <a
                            href={section.link.href}
                            className="inline-block mt-3 text-[#ff3b00] hover:text-[#ff3b00]/80 font-mono text-sm transition-colors"
                          >
                            {section.link.text}
                          </a>
                        )}
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
