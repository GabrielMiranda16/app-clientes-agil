# CLAUDE.md — app-clientes-agil

> Instruções para o Claude Code. Leia este arquivo antes de qualquer tarefa neste projeto.

---

## Projeto

**Ágil Seguros — Portal de Clientes e Parceiros**

- **URL produção**: https://www.agilseguros.app
- **GitHub**: https://github.com/GabrielMiranda16/app-clientes-agil
- **Vercel**: deploy automático a cada push em `main` (~2 min)
- **Supabase**: projeto `ersrbtyrwlljhkomqfpk`

---

## Stack

- React 18 + Vite
- Tailwind CSS
- Framer Motion (AnimatePresence, motion.div)
- Supabase (banco + storage + edge functions)
- React Router v6
- shadcn/ui (Card, Button, Input, Label, Badge, Dialog, DropdownMenu, useToast)
- Lucide React (ícones)

---

## Regras obrigatórias

1. **Sempre fazer deploy após qualquer alteração** — `npm run build && git add ... && git commit && git push`
2. Verificar que o build passa (`✓ built`) antes de commitar
3. Nunca remover conteúdo do CLAUDE.md sem pedido explícito
4. Não adicionar comentários desnecessários no código

---

## Estrutura de arquivos relevantes

```
src/
  pages/
    AdminParceirosPage.jsx   ← ADM gerencia orçamentos de parceiros (inline expand)
    OrcamentoPublicoPage.jsx ← Página pública do link do orçamento (/orcamento/:slug)
    ParceiroDashboard.jsx    ← Dashboard do parceiro (solicita orçamentos)
    CEODashboard.jsx         ← Dashboard CEO (visão geral)
    AdminSelecaoPage.jsx     ← Seleção de área do ADM
  data/
    seguradoras.js           ← 17 seguradoras/operadoras com logos e diferenciais
  components/
    DashboardLayout.jsx      ← Layout padrão (header + nav + main)
```

---

## Sistema de Parceiros — fluxo completo

### Tabelas Supabase

| Tabela | Descrição |
|---|---|
| `parceiros` | Parceiros cadastrados (nome, modalidade, comissao_percentual, telefone) |
| `orcamentos` | Orçamentos solicitados pelo parceiro, gerenciados pelo ADM |
| `orcamento_documentos` | Docs enviados pelo cliente após aceitar proposta |
| `orcamento_acessos` | Rastreamento de acessos ao link público (CPF, scroll, tempo, aceite) |
| `comissoes` | Comissão registrada após CONCLUIDO |

### Campos da tabela `orcamentos`

```sql
id, created_at, parceiro_id, cliente_nome, cliente_telefone, cliente_email,
cliente_cpf, segmento, observacoes, status, slug, valor_mensalidade,
descricao_orcamento, operadora_escolhida, lista_documentos (jsonb),
docs_extras (jsonb), data_orcamento, data_documentos,
propostas (jsonb),          ← array de propostas (estrutura abaixo)
cenarios_atuais (jsonb)     ← array de cenários atuais do cliente (estrutura abaixo)
```

**SQL já executado no Supabase:**
```sql
ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS cenarios_atuais JSONB;
ALTER TABLE public.orcamentos ALTER COLUMN slug DROP NOT NULL;
```

### Estrutura JSONB das propostas

```js
// Uma proposta
{
  operadora: 'Porto Seguro',
  logo_url: 'https://...',
  planos: [
    { nome: '0-18 anos', valor: '250,00' },
    { nome: '19-23 anos', valor: '310,00' },
  ],
  abrangencia: 'Nacional',       // Nacional | Regional | Estadual | Municipal
  acomodacao: 'Apartamento',     // Apartamento | Enfermaria
  coparticipacao: {
    tem: false,
    percentual: '',              // ex: '30'
    limitada: false,
  },
  carencia: false,
  rede_url: 'https://...',
  destaque: true,                // true = melhor opção recomendada
}
```

### Estrutura JSONB dos cenários atuais

```js
// Um cenário
{
  tem_plano: true,
  operadora: 'Bradesco Seguros',
  valor: '520,00',
}
```

### Status do orçamento (funil)

```
SOLICITACAO → ORCAMENTO → DOCUMENTOS → ASSINATURA → CONCLUIDO → COMISSAO
```

---

## AdminParceirosPage — comportamento atual

- Cards na lista expandem **inline para baixo** (sem painel lateral)
- Animação: `AnimatePresence` + `motion.div` com `height: 0 → auto`
- **Auto-refresh removido** — lista só atualiza após ações (enviar, avançar status, etc.)
- Builder `renderBuilder(mode)` é reutilizado para os modos `'responder'`, `'editar'`, `'nova'`
- `ToggleBtn` component: toggle visual Não/Sim com cores customizáveis

### Fluxo por status no ADM

| Status | O que o ADM faz |
|---|---|
| SOLICITACAO | Preenche cenários atuais + propostas → envia (gera slug) |
| ORCAMENTO | Vê proposta enviada + link público; pode editar ou criar nova proposta |
| DOCUMENTOS | Vê docs enviados pelo cliente; avança para ASSINATURA |
| ASSINATURA | Aguarda assinatura; avança para CONCLUIDO |
| CONCLUIDO | Registra comissão (valor base + % parceiro) |
| COMISSAO | Faz upload do comprovante de pagamento |

---

## OrcamentoPublicoPage — seções (em ordem)

1. **Header** — segmento + nome do cliente + SUSEP
2. **Cenário Atual** — lê `cenarios_atuais[]`, mostra logo + valor por operadora
3. **Propostas** — cards com planos/faixas (colapsável), chips de abrangência/acomodação/coparticipação/carência; botão "Quero este plano"
4. **Comparação visual de custo** — barras CSS animadas (cenário atual vs propostas)
5. **Comparação de planos** — tabela: abrangência, acomodação, coparticipação, carência, recomendação
6. **Tabela comparativa** — faixas etárias lado a lado + abrangência/acomodação/coparticipação/carência por operadora
7. **Perfil de vidas** — tabela por operadora com faixa + valor (só quando `planos.length > 1`, segmentos SAUDE)
8. **Coparticipação** — detalhes da proposta destaque (percentual + limitada/ilimitada)
9. **Diferenciais** — buscados de `SEGURADORAS.find(s => s.nome === propostaDestaque.operadora).diferenciais`
10. **Rede credenciada** — link da proposta destaque + outras propostas com `rede_url`
11. **Documentos necessários** — lista
12. **Botão flutuante** — fixo no rodapé, sempre visível, aceita proposta recomendada

---

## seguradoras.js — estrutura

```js
export const SEGURADORAS = [
  {
    nome: 'Porto Seguro',
    logo: 'https://storage.googleapis.com/...',
    categorias: ['AUTO', 'RESIDENCIAL', 'SAUDE', ...],
    diferenciais: [
      { titulo: 'Título curto', descricao: 'Descrição longa com 2-4 frases...' },
      // ... 5-6 diferenciais por operadora de saúde
    ],
  },
  // ...
]
```

- **17 seguradoras/operadoras** cadastradas
- **10 operadoras de saúde** com `diferenciais` detalhados
- Operadoras não-saúde têm `diferenciais: []`

---

## Segmentos disponíveis

```
AUTO, SAUDE, RESIDENCIAL, EMPRESARIAL, ODONTOLOGICO, VIAGEM,
PET_SAUDE, PET_SEGURO, VIDA, FROTA, CARGAS, EQUIPAMENTOS,
SAUDE_VIDA_ODONTO, AUTO_FROTA
```

---

## Deploy

```bash
npm run build        # verificar se passa
git add <arquivos>
git commit -m "mensagem"
git push origin main # Vercel faz deploy automático (~2 min)
```
