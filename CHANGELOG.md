# Changelog — App Clientes Ágil Seguros

## Histórico de Desenvolvimento

---

### [v4.0] — Multi-Proposta Builder + Página Pública Completa (2026-06-03)

---

#### SQL executado no Supabase (necessário antes de usar)

```sql
-- Coluna para múltiplos cenários atuais do cliente
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS cenarios_atuais JSONB;

-- Slug não mais obrigatório (gerado só quando ADM envia proposta)
ALTER TABLE public.orcamentos ALTER COLUMN slug DROP NOT NULL;
```

---

#### AdminParceirosPage — reescrita completa

**Commits:** `cfea517`, `ec990ec`, `60c827a`, `45cf3c1`, `2fab4aa`

##### Layout — inline expansion (sem painel lateral)
- Cards expandem **para baixo inline** usando `AnimatePresence` + `motion.div` com `height: 0 → auto`
- Painel lateral completamente removido
- `toggleExpand(o)` substitui o antigo `openDetail`/`closeDetail`
- `ChevronDown` rotaciona 180° quando expandido

##### Builder de propostas (multi-proposta)
- `renderBuilder(mode)` reutilizado para `'responder'`, `'editar'` e `'nova'`
- **Cenários atuais** (`cenarios_atuais` JSONB): múltiplos cenários com `+`, cada um com toggle `tem_plano`, select operadora, input valor
- **Propostas** (`propostas` JSONB): múltiplas com `+` (add), `X` (remove), `↑↓` (ordenar)
  - Cada proposta: select operadora (auto-carrega logo), planos `[{nome, valor}]` (múltiplos), abrangência, acomodação, coparticipação `{tem, percentual, limitada}`, carência, rede_url, destaque
- `ToggleBtn` component: Não/Sim com cores customizáveis
- Botão excluir proposta **sempre visível** (se única, reseta para proposta vazia em vez de remover)

##### Estrutura de dados nova

```js
// Proposta
{
  operadora, logo_url,
  planos: [{ nome, valor }],      // faixas etárias ou planos
  abrangencia,                    // Nacional | Regional | Estadual | Municipal
  acomodacao,                     // Apartamento | Enfermaria
  coparticipacao: { tem, percentual, limitada },
  carencia,
  rede_url,
  destaque,                       // true = melhor opção
}

// Cenário atual
{ tem_plano, operadora, valor }
```

##### Auto-refresh removido
- `setInterval` removido por completo
- Lista só atualiza após ações do ADM (enviar, avançar status, etc.)
- Preencher o formulário sem perder dados

##### Visual dos cards
- Card "Cenário atual": mesmo estilo dos cards de proposta (header cinza, border padrão, sem amber)
- Botão "+ Adicionar" dos cenários: azul igual ao das propostas

---

#### seguradoras.js — diferenciais detalhados

**Commit:** `01cce0f` (base) + sessão atual

- **10 operadoras de saúde** com `diferenciais: [{titulo, descricao}]`
- Cada diferencial tem título curto + descrição ampla (2-4 frases) com informações reais
- Operadoras com diferenciais: Porto Seguro, Bradesco Seguros, SulAmérica, Amil, Omint, Unimed, São Cristóvão Saúde, Plena Saúde, Hapvida, Alice Saúde
- Operadoras não-saúde têm `diferenciais: []`

---

#### OrcamentoPublicoPage — redesign completo para nova estrutura

**Commit:** `0d05bd1`

Seções em ordem (página do link enviado ao cliente):

1. **Header** — segmento + nome cliente + badge de opções
2. **Cenário Atual** — lê `cenarios_atuais[]`, logo da operadora + valor por item
3. **Propostas** — cards com: planos colapsáveis, chips de características, botão "Quero este plano"
4. **Comparação visual de custo** — barras CSS animadas (Framer Motion), atual em amarelo vs propostas em azul
5. **Comparação de planos** — tabela: abrangência, acomodação, coparticipação, carência, recomendação (só 2+ propostas)
6. **Tabela comparativa** — faixas lado a lado com todos os atributos (só 2+ propostas)
7. **Perfil de vidas** — tabela por operadora faixa→valor (SAUDE, quando `planos.length > 1`)
8. **Coparticipação** — só da proposta destaque: percentual + limitada/ilimitada + explicação
9. **Diferenciais** — `SEGURADORAS.find(s => s.nome === propostaDestaque.operadora).diferenciais` com título + descrição
10. **Rede credenciada** — link da proposta destaque + outras que tiverem `rede_url`
11. **Documentos necessários** — lista
12. **Botão flutuante** — fixo no rodapé, sempre visível, mostra operadora recomendada, aceita direto

---

### [v3.0] — Sistema de Parceiros + Boletos (2026-05-25 / 2026-05-27)

---

#### Sessão 2026-05-25 — 19 commits

##### Sistema de Parceiros (Etapas 1–9) — implementação completa do zero
- **Etapa 1** (`30cd554`): 5 tabelas Supabase (`parceiros`, `orcamentos`, `orcamento_documentos`, `orcamento_acessos`, `comissoes`), role PARCEIRO, páginas base
- **Etapa 2** (`d00a3b4`): modal "Solicitar Orçamento" com campos dinâmicos por segmento
- **Etapas 3–9** (`d724c2a`): sistema completo — ADM responde + gera slug, página pública `/orcamento/:slug` (auth 3 dígitos CPF + tracking), upload de docs, WhatsApp via Evolution API, avanço de etapas (SOLICITACAO→ORCAMENTO→DOCUMENTOS→ASSINATURA→CONCLUIDO→COMISSAO), modal comissão + comprovante
- **Notificações** (`5f20aac`, `23da0c3`): WhatsApp ao parceiro + painel detalhe no portal

##### ADM melhorias
- Rotas ADM reorganizadas (`0bec969`): `/admin` → seleção (AdminSelecaoPage), `/admin/clientes` → lista
- Badge de solicitações pendentes + auto-refresh a cada 30s + pulse em AdminParceirosPage (`0ff9126`)
- Tabs CEO com scroll horizontal — aba Parceiros visível em telas menores (`e6fe45f`)
- Fix ícone Handshake → HeartHandshake (`647a30b`)

##### Visual — glassmorphism
- Botão Nova Apólice fora dos cards + glassmorphism (`1a607de`, `11cd9b1`)
- Tabs CEO glassmorphism — ativo bg-white/25 (`6caaefe`, `5d48317`)
- Botões glassmorphism rounded-lg (`0c60661`)
- Botão Novo Cliente glassmorphism (`0551a9b`)

##### Coparticipação
- Parser TXT posicional tipo "20" + prompt acumulativo (`824f133`)
- Scroll colaboradores max-h-[320px] em CoparticipacaoPage e CoparticipacaoClientePage (`8bd6342`, `0bec63a`)
- Card coparticipação na ApoliceDashboard exibe mês anterior (correto) (`bd8c296`)

##### IA — Importar Planos
- Botão "Importar Planos" (só ADM/CEO) em ClientDashboard (`8db4592`)
- Edge Function `parse-relatorio-matriz`: lê PDF "Relação de Segurados Ativos", extrai carteirinha/plano/CPF/vigência/prêmio, match por CPF, atualiza beneficiários

---

#### Sessão 2026-05-27 — 3 commits

##### Fix: parentesco não aparecia ao editar beneficiário importado (`28f1cf7`)
- `PARENTESCO_OPTS` do import usava valores diferentes do Select do form (`FILHO/FILHA/MAE` vs `FILHO(A)/MÃE`)
- Adicionada função `normalizeParentesco()` em `openModalToEdit` — mapeia valores antigos ao abrir modal
- `PARENTESCO_OPTS` agora usa os mesmos valores do form: `FILHO(A)`, `IRMÃO(Ã)`, `NETO(A)`, `MÃE`

##### feat: sistema de boletos para SVD (`7ddede8`)
- **`boletosService.js`**: upload, substituição, exclusão, URL assinada (1h), auto-cleanup (deleta boletos com mais de 2 meses automaticamente ao carregar)
- **Storage Supabase**: bucket `boletos` (privado)
- **Tabela `boletos`**: `id`, `apolice_id`, `mes_referencia`, `arquivo_url`, `created_at` — UNIQUE por apólice + mês

**Onde está o boleto no ADM:**
`Clientes → [cliente] → Saúde, Vida e Odonto → Acessar [apólice] → aba "Apólice" → card "Boleto de Pagamento"`
- Botão **"Enviar Boleto"** → modal com seleção do mês de referência + upload PDF
- Cada boleto tem botão **Visualizar** (preview iframe), **Editar** (substituir PDF) e **Excluir**

**Onde está no cliente (`/cliente/:empresaId`):**
- Botão no topo da página ao lado de "Minha Coparticipação"
- Sem boleto → `Boleto` (desabilitado, cinza)
- Com boleto → `Boleto Disponível` (azul/destaque, clicável)
- Abre modal com preview do PDF (iframe) + botão Baixar

**Observações técnicas:**
- Boletos disponíveis: últimos 2 meses (auto-cleanup no carregamento)
- URLs assinadas (signed URLs) — acesso privado, expiram em 1h
- `apoliceId` passado via `location.state` da navegação `/apolice/:id → /cliente/:id`
- Se cliente acessar `/cliente/:id` diretamente sem vir da apólice, o botão Boleto não aparece (sem `apoliceId` no state)

---

### [v2.0] — Ciclo de Melhorias (Sessões anteriores + Sessão atual — 2026-04-08)

---

## Banco de Dados (SQL executado no Supabase)

```sql
-- Tabela de apólices
CREATE TABLE public.apolices (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  segmento TEXT NOT NULL CHECK (segmento IN (
    'SAUDE_VIDA_ODONTO','AUTO_FROTA','VIAGEM','RESIDENCIAL',
    'PET_SAUDE','EMPRESARIAL','CARGAS','EQUIPAMENTOS'
  )),
  numero_apolice TEXT, seguradora TEXT,
  vigencia_inicio DATE, vigencia_fim DATE,
  valor_premio NUMERIC(12,2), descricao TEXT, contrato_url TEXT,
  ativo BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.apolices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON public.apolices FOR ALL USING (true) WITH CHECK (true);

-- Flag de primeiro acesso
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
```

---

## Autenticação & Segurança

- **Primeiro acesso obrigatório**: ao criar qualquer usuário (CLIENTE, ADM, CEO), o campo `must_change_password = true` é salvo. No login, se verdadeiro, o sistema redireciona para `/force-change-password`
- **Requisitos de senha** (validados em todos os modais de senha — CEO, ADM, CLIENTE):
  - Mínimo 6 caracteres
  - 1 letra maiúscula
  - 1 letra minúscula
  - 1 número
  - 1 caractere especial
  - Requisitos exibidos **sempre visíveis** com ✓/○ em tempo real
- **Somente CEO pode criar outra conta CEO** — seletor de perfil no modal de criação mostra `ADM` e `CEO`
- **Senhas em bcrypt**: todas as senhas são hasheadas com `bcryptjs`. Login com senha plain text migra automaticamente para bcrypt no primeiro acesso

---

## Páginas Novas

### `ForceChangePassword.jsx` (`/force-change-password`)
- Exibida no primeiro login de qualquer conta nova
- Fundo degradê, logo, card com requisitos de senha em tempo real (CheckCircle2/XCircle)
- Ao salvar: atualiza senha + seta `must_change_password = false`
- Redireciona para o dashboard correto por perfil

---

## Painel ADM (`/admin`) — `AdminDashboard.jsx`

- **Cadastro de cliente Pessoa Física (CPF)**:
  - Auto-detecção CPF vs CNPJ por contagem de dígitos (11 = CPF, 14 = CNPJ)
  - Campo data de nascimento (PF)
  - CEP com busca automática ViaCEP (preenche rua, bairro, cidade, estado automaticamente)
  - Campos número e complemento
- **Botão Filial**: oculto para Pessoa Física; exibe texto "Filial" sem ícone para PJ
- **Cards de clientes**: label CPF/CNPJ automático conforme tipo
- **Criação de usuário**: `must_change_password: true` definido automaticamente

---

## Painel Segmento — Admin (`/admin/cliente/:id/segmento/:seg`) — `AdminSegmentoPage.jsx`

- **Todos os segmentos** (incluindo Saúde, Vida e Odonto) agora carregam apólices do banco ao entrar na página — resolvendo o bug de apólice "sumindo" ao voltar
- **Saúde, Vida e Odonto (SVD)**: fluxo alterado para apólice-primeiro:
  - Lista apólices cadastradas com botão **Acessar** → navega para `/apolice/:id`
  - Sem apólice: mensagem clara + botão "Registrar Apólice"
  - Beneficiários, Solicitações e Coparticipação ficam **dentro** da apólice
- **Segmentos não-SVD**: exibem lista de apólices com status de vigência, contrato PDF, editar/excluir
- **Cards de segmento** redesenhados com estilo do site: `rounded-3xl`, ícone `bg-[#003580]/10`, botão azul

---

## Painel do Cliente — Admin (`/admin/cliente/:id`) — `AdminClientePage.jsx`

- Label CPF/CNPJ com detecção automática e aplicação de máscara correta
- Seção de filiais oculta para Pessoa Física
- Cards de segmento redesenhados (estilo site)

---

## Apólice Dashboard (`/apolice/:id`) — `ApoliceDashboard.jsx`

- **Tabs para todos os perfis** (CEO, ADM, CLIENTE):
  - **Apólice**: dados completos (número, seguradora, vigência, valor, contrato PDF)
  - **Beneficiários**: lista prévia com status Ativo/Inativo + botão "Gerenciar" (admin) ou "Ver" (cliente)
  - **Solicitações**: lista prévia com badge de status + contador de pendentes
  - **Coparticipação**: acesso direto à página de coparticipação
- Dados de beneficiários e solicitações carregados por `empresa_id` da apólice
- Admin: botões navegam para páginas de gestão completa
- Cliente: botões navegam para `/cliente/:id` e `/cliente/:id/coparticipacao`

---

## Seleção de Segmento — Cliente (`/select-segmento`) — `SelectSegmento.jsx`

- **Fundo degradê** (`bg-soft-gradient`) em toda a página
- **Header transparente** integrado ao degradê (sem borda/shadow)
- **Logo 3× maior** (h-24)
- **Nome da empresa** exibido no lugar do email
- **Segmentos disponíveis**: exibe apenas segmentos que possuem apólices cadastradas
- **Novos segmentos adicionados**: CARGAS e EQUIPAMENTOS
- **Navegação SVD**: corrigida para `/select-apolice/SAUDE_VIDA_ODONTO` (igual aos outros segmentos)
- **Suporte a PF**: usa `user.empresa_id || user.empresa_matriz_id` para localizar empresa (resolve "Nenhuma empresa vinculada")
- **Menu "Minha Conta"** com:
  - Alterar Senha (modal com requisitos sempre visíveis)
  - Dados Pessoais/Empresa (modal com busca de CEP por ViaCEP)
  - Sair
- **Textos brancos** (título, subtítulo, botões)

---

## Seleção de Apólice — Cliente (`/select-apolice/:segmento`) — `SelectApolice.jsx`

- **Suporte a PF**: usa `user.empresa_id || user.empresa_matriz_id`
- Fundo degradê, header transparente, logo h-24
- Cards `rounded-3xl` com status de vigência, badge, botão Acessar

---

## Layout Global — `DashboardLayout.jsx`

- **Fundo**: `bg-soft-gradient` em toda a aplicação
- **Header**: transparent + `z-40` (sem sticky, sem shadow, integrado ao degradê)
- **Logo**: imagem correta `storage.googleapis.com/...`
- **CLIENTE**: logo leva para `/select-segmento` (corrigido de `/select-company`)
- **Trocar CNPJ**: visível apenas para CLIENTE em dashboard de cliente
- **Modal Alterar Senha**: requisitos de senha sempre visíveis, validação com `validatePasswordStrength()`
- **Data/hora** de Brasília visível no header (desktop)

---

## Gerenciamento de Usuários — CEO (`CEODashboard.jsx`)

- **Seletor de perfil** no modal de criação: ADM | CEO
- **Lista de usuários**: exibe tanto ADMs quanto CEOs (badge de perfil)
- `must_change_password: true` para todos os usuários criados
- **Password strength** visível no modal de criação de usuário

---

## Utilitários

### `src/lib/userValidator.js`
- `validatePasswordStrength(password)`: retorna array de erros por requisito
- `cleanUserData()`: inclui campo `must_change_password`

### `src/lib/masks.js`
- `applyCpfMask`, `applyCnpjMask`, `applyCepMask`

---

## Rotas (`App.jsx`)

```
/login                            → LoginPage
/force-change-password            → ForceChangePassword (todos os perfis)
/ceo                              → CEODashboard (CEO)
/admin                            → AdminDashboard (CEO, ADM)
/admin/cliente/:matrizId          → AdminClientePage (CEO, ADM)
/admin/cliente/:matrizId/segmento/:segmento → AdminSegmentoPage (CEO, ADM)
/solicitacoes                     → SolicitacoesPage (CEO, ADM)
/coparticipacao                   → CoparticipacaoPage (CEO, ADM)
/cliente/:empresaId               → ClientDashboard (CEO, ADM, CLIENTE)
/cliente/:empresaId/coparticipacao → CoparticipacaoClientePage (CEO, ADM, CLIENTE)
/select-segmento                  → SelectSegmento (CLIENTE)
/select-apolice/:segmento         → SelectApolice (CLIENTE)
/apolice/:apoliceId               → ApoliceDashboard (CEO, ADM, CLIENTE)
/select-company                   → SelectCompanyPage (ADM, CEO)
```

---

## Identidade Visual

- **Cor primária**: `#003580` (azul escuro Ágil)
- **Gradiente de fundo**: `bg-soft-gradient` → `linear-gradient(135deg, #003580 0%, #1a5599 100%)`
- **Logo**: `https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png`
- **Cards**: `bg-white border border-gray-100 rounded-3xl shadow-md`
- **Ícones de segmento**: `w-12 h-12 rounded-2xl bg-[#003580]/10`
- **Textos sobre degradê**: `text-white` / `text-white/80` / `text-white/70`
