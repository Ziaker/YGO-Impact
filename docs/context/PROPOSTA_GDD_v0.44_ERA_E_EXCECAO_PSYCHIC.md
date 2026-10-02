# Proposta de Emenda Formal para o GDD v0.44 — Regra de Era e Exceção Canônica de Psíquico (Psychic)

**Status:** Proposta de emenda normativa submetida à aprovação do autor  
**Data:** 2026-10-01  
**Documento base auditado:** `Monster_Impact_GDD_v0.43.docx` (P81 e P371)  

---

## 1. Diagnóstico do Conflito Histórico e Documental

No GDD v0.43 atual, coexistem duas definições normativas que exigem harmonização formal:

1. **Restrição de Era Geral (GDD v0.43, P81):**
   > *"Definido: O conteúdo inicial deve vir de uma única era anterior a Synchro e Xyz."*
2. **Inclusão da Raça Psíquico entre as Prioritárias (GDD v0.43, P371):**
   > *"Definido: As RACE prioritárias do protótipo e do curto prazo são Beast, Dragon, Fairy, Fiend, Fish, Insect, Machine, Plant, Psychic, Rock, Pyro, Aqua, Spellcaster, Warrior, Zombie, Winged Beast e Thunder. Essa prioridade vale mesmo quando alguma delas não estiver representada nos decks iniciais."*

### O Conflito Fático do TCG/OCG
No Yu-Gi-Oh! oficial, a raça **Psychic (Psíquico)** só foi criada e introduzida em **2008**, com a coleção *The Duelist Genesis (TDGS)*, inaugurando exatamente a **era 5D's / Synchro**. Portanto, não existem cartas de monstros Psíquicos impressas na era anterior a Synchro (DM e GX).

Tentativas anteriores de agentes geraram distorções conceituais graves:
- Rotularam Psychic como uma "exceção a pré-2005", misturando indevidamente a regra de era do GDD com um pedido aditivo específico do autor que era exclusivo para Magias e Armadilhas (hoje retificado em DEC-004).

---

## 2. Texto Proposto para Incorporação no GDD v0.44

Propõe-se que a Seção de Conteúdo e Escopo do GDD v0.44 adote a seguinte redação consolidada:

### Redação Proposta:

> **Era do Conteúdo Inicial e Exceção Canônica de Psíquico:**
> 
> 1. **Regra Geral de Era:** O conteúdo jogável inicial do jogo (monstros, magias e armadilhas do conjunto base de 88 cartas ou fallback de 40 cartas) deve provir preferencialmente de uma única era anterior a Synchro e Xyz (eras clássica/GX).
> 2. **Proibição Estrita de Mecânicas Modernas:** Ficam proibidas no primeiro escopo quaisquer cartas ou mecânicas de Invocação Synchro, Xyz, Pendulum e Link, bem como cartas que façam referência intrínseca e mandatória a tais mecânicas.
> 3. **Exceção Estrutural de Psíquico (Psychic):** Em virtude de a raça Psíquico ter estreado oficialmente no TCG em 2008 simultaneamente à era Synchro, é concedida **exceção formal e restrita à raça Psíquico**. Cartas de monstros Psíquicos (Normais, de Efeito e Fusão compatíveis) podem ser selecionadas de edições posteriores a 2008 e de produtos oficiais complementares (como Rush Duel para prover monstros Normais sem efeito), desde que:
>    - Adotem moldura e tipos legais no protótipo (Normal, Efeito, Fusão, Ritual);
>    - Não possuam efeitos que exijam reguladores, monstros Synchro ou mecânicas excluídas;
>    - Mantenham a consistência da tabela de atributos e da identidade tática da raça definida no GDD.
> 4. **Distinção entre Regra de Era e Filtros de Expansão:** A diretriz de Magias e Armadilhas clássicas (pré-2005, DEC-004) constitui um filtro de seleção temático para suporte de feitiços/armadilhas e não se confunde com o recorte de era dos monstros nem impõe barreira temporal retrógrada a monstros da raça Psíquico.

---

## 3. Impacto no Código e na Biblioteca

- **Núcleo do Jogo (`src/core/`):** Nenhum impacto negativo. O motor de regras já opera com IDs, atributos e keywords desacoplados de ano de lançamento.
- **Biblioteca de Cartas (`assets-local/card-art/`):** Confirma a legitimidade dos monstros Psíquicos já catalogados e baixados (inclusive os Normais complementares), eliminando qualquer falso conflito de validação.
