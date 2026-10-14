# Arquitetura e decisões técnicas

O caminho de qualquer operação é sempre o mesmo: `React → invoke() → comando Tauri → service → repo → SQLite`. Abaixo, como o projeto está organizado, o que fica no banco e por que as principais decisões foram tomadas.

## Estrutura do projeto

```
src/                        Frontend (React)
  components/                Componentes de UI e de features (tasks, timer, calendar, layout)
  pages/                     Uma página por item da sidebar
  stores/                    Zustand — um store por domínio (tasks, timer, stopwatch, calendar, alarms, schedule, worldClock, settings, ui)
  services/                  Wrappers finos sobre `invoke()` do Tauri, um por domínio
  types/                     Tipos TypeScript espelhando os modelos Rust
  hooks/                     Hooks compartilhados (ex.: tick de UI para timers)
  utils/                     Formatação, cálculo de tempo "ao vivo", grade de calendário

src-tauri/src/               Backend (Rust)
  commands/                  Um arquivo por domínio — só faz a ponte entre Tauri e services, sem lógica
  services/                  Regras de negócio (reset diário, recorrência, timers, alarmes, agendador em background)
  db/
    repo/                    Acesso a dados (SQL), um repositório por tabela/domínio
    sql/                     Migrations numeradas, aplicadas uma vez cada, nunca editadas depois de publicadas
  models/                    Tipos Rust (serde) espelhando as tabelas e os DTOs de comando
  error.rs                   Um único tipo de erro para toda a aplicação
```

Fluxo de uma operação: `React → invoke() → Tauri command → service (regra de negócio) → repo (SQL) → SQLite`. O frontend nunca monta SQL, e os componentes React nunca acessam o banco diretamente.


## Banco de dados

Tabelas: `settings`, `tasks`, `task_completions`, `task_sessions`, `events`, `alarms`, `weekly_schedule_blocks`, `world_clocks`, `timer_sessions`, `dashboard_tabs`, mais `schema_migrations` para controle de versão do esquema.

Não há tabela `users`: por ser um app local de usuário único, `settings` é uma única linha (`id = 1`). Se um dia for necessário suporte a múltiplos perfis, essa linha se torna o perfil padrão.

O histórico de conclusão de tarefas diárias/semanais fica em `task_completions`, com uma linha por `(task_id, cycle_date)` — nunca um booleano único na tarefa — para preservar o histórico de cada dia (ex.: "Estudar Python: 28/09 ✓, 29/09 ✓, 30/09 ✗").


## Decisões técnicas importantes

- **Reset diário com fuso horário**: o "dia" de uma tarefa diária/semanal não é a data do relógio do sistema — é calculada em `services/time_util.rs::cycle_date`, que compara a hora atual (convertida para o fuso configurado) com o horário de reset. Antes do horário de reset, ainda é considerado o dia anterior. Isso evita bugs de virada de dia incorreta perto de meia-noite/fusos diferentes.
- **Timers baseados em timestamp, não em `setInterval`**: toda sessão de timer/cronômetro/tarefa temporizada guarda `started_at`, `paused_at` e `elapsed_seconds` no banco. O tempo exibido é sempre recalculado como `elapsed_seconds + (agora − started_at)` quando em execução — nunca decrementado por um contador local. Isso faz o tempo sobreviver corretamente a minimização da janela, um event loop lento, ou o app sendo fechado e reaberto no meio de uma tarefa. Uma tarefa temporizada só é marcada como concluída quando esse cálculo real atinge a duração configurada (nunca "otimisticamente" quando a contagem regressiva do frontend chega a zero).
- **Agendador em background**: um loop assíncrono (`services/scheduler.rs`) roda a cada 5s dentro do próprio processo Tauri, verificando alarmes devidos, eventos próximos e timers/tarefas temporizadas em execução — para que notificações e conclusões automáticas funcionem mesmo com a janela minimizada, sem depender do frontend estar aberto ou em foco.
- **Recorrência de eventos**: eventos recorrentes (`daily`/`weekly`/`monthly`) não duplicam linhas no banco — a tabela guarda só o evento base, e `services/event_service.rs` expande as ocorrências sob demanda para um intervalo de datas pedido pelo calendário, com um limite de segurança de ocorrências para nunca gerar um loop não-limitado.
- **Guias e widgets (estilo Obsidian)**: o dashboard é organizado em guias salvas na tabela `dashboard_tabs` (migration `0010`), cada uma com seu layout em JSON (`[{i, type, x, y, w, h}]`) numa grade 12×12. A guia "Início" já vem com tudo; outras guias podem começar em branco ou de um modelo (Estudos, Planejamento, Relógio) e recebem só os widgets escolhidos. No modo "Editar guia", widgets são movidos pela barra, redimensionados pelo canto e removidos pelo × (`react-grid-layout`, posicionamento livre sem sobreposição). O backend (`services/dashboard_service.rs`) valida nome, ids únicos, limites da grade e sobreposição antes de salvar; o frontend salva com debounce e recarrega se o salvamento falhar. Os widgets leem os mesmos stores, então os dados são idênticos em todas as guias. A altura das linhas vem da altura da janela, por isso nenhuma guia tem rolagem.
- **Cores personalizáveis** (`utils/appearance.ts`): o botão de paleta na barra de guias abre combinações prontas (Grafite, Meia-noite, Floresta, Vinho, Areia, Neblina) e escolhas independentes de modo (escuro/claro), tom do fundo e cor de destaque (paleta ou qualquer cor). Todas as superfícies, bordas e textos são calculados a partir dessas poucas escolhas, e o brilho/saturação do destaque é limitado para manter o texto legível e nada "neon". A escolha é aplicada na hora e salva na linha de `settings` já existente (`theme` = modo, `accent_color` = `"tom:#hex"`), sem nova migration; um cache em `localStorage` evita piscar o visual padrão ao abrir.
- **Ícones próprios** (`components/ui/icons.tsx`): em vez de um pacote de ícones pronto, o app tem 34 ícones desenhados à mão numa grade de 24px, com traço arredondado e uma "sombra" translúcida da mesma cor por trás (duotone), então eles acompanham a cor de destaque escolhida. Não há emojis na interface. A API é a mesma de bibliotecas comuns (`<Play size={16} />`, cor via `currentColor`), e novos ícones entram nesse arquivo.
- **"Agora / Próximo" e Linha do Dia** (`utils/todayAgenda.ts`, com testes): um único motor junta tudo que tem horário hoje (blocos da programação, eventos, tarefas diárias/semanais com hora, alarmes) numa lista ordenada, marcando o que já passou, o que está acontecendo, o próximo e tarefas atrasadas. Ele alimenta o aviso ao vivo na barra de guias e o widget "Linha do Dia" (linha do tempo com marcador de agora e faixa do dia inteiro).
- **Sinais visuais de tempo** (`utils/timeHints.ts`): todos os widgets falam de tempo do mesmo jeito ("em 20 min", "há 5 min", "faltam 1h10", "1h30"): tarefas mostram atrasada/em breve e sequência de dias, a programação destaca o bloco atual com progresso e esmaece os que passaram, eventos mostram o que está rolando, alarmes mostram quando tocam, relógios mostram dia/noite e "amanhã/ontem".
- **Tarefas semanais como "faixa da semana + dia em foco"** (`components/tasks/WeeklyTasksBoard.tsx`, `weekProgress.ts` com testes): sete pílulas de dia com anel de progresso (verde quando completo, vermelho quando algo ficou para trás) e a lista do dia escolhido. Dias passados são lidos do histórico de conclusões (uma linha por tarefa por dia), hoje da conclusão atual, e dias futuros ficam como "agendada". Arrastar uma tarefa até uma pílula a remarca. Concluir dispara uma animação curta (`ff-pop`/`ff-flash` em `index.css`). Quando o widget é baixo (como no Início), entra um modo compacto automático (medido com `useElementSize`).
- **Arrastar e soltar em todo o app**: cada tela tem um único `AppDndContext` (`src/components/dnd/`). Itens arrastáveis declaram um payload tipado (`schedule-block`, `weekly-task`, `event`, `daily-task`, `world-clock`) e áreas de soltar declaram o que aceitam; o contexto é o único lugar que transforma um "soltar" em ação de store. As ações de arrastar atualizam o estado local antes da chamada ao backend (o item fica onde foi solto) e recarregam o estado real se a chamada falhar.
- **Criação e edição sem modais**: listas usam `InlineAdd` (digitar + Enter) e itens abrem editores em `Popover` (renderizado em portal, nunca cortado pelo card). A ordem manual das tarefas é salva na coluna `tasks.sort_order` (migration `0008`).
- **Programação semanal como tabela que se monta sozinha** (`WeeklyTimetable`): cada par início–fim em uso vira uma linha; horários sem nada não ocupam espaço. Blocos com o mesmo título herdam a mesma cor, e a linha do horário atual/próximo é destacada.
- **Linguagem natural** (`utils/naturalLanguage.ts`, com testes): os campos de criação entendem frases como "Academia seg qua sex 18h" ou "Prova amanhã 9h-11h", mostram uma prévia do que foi entendido e aplicam padrões inteligentes centralizados em `stores/smartActions.ts`.
- **Mesma experiência em qualquer tela** (`hooks/useUiScale.ts`): a fonte raiz (e com ela todos os tamanhos em rem) escala com a janela em relação a um tamanho de referência, limitado entre 80% e 125%; ícones seguem via `--ui-scale`. Por isso o código evita tamanhos fixos em px.
- **Um único tipo de erro (`AppError`)**: todo comando Tauri retorna `Result<T, AppError>`; o frontend só vê uma mensagem de erro em português já pronta para exibir ao usuário, nunca um erro técnico do SQLite ou do Rust.

