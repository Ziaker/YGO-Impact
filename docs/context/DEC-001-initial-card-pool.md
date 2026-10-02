# DEC-001 — Seleção Curada Auxiliar / Candidate Pool de 136 Cartas

**Status:** definido pelo autor (esclarecida a natureza de Candidate Pool auxiliar)  
**Data:** 2026-09-29  
**Retificação de escopo:** 2026-10-01  

## Relação com o GDD v0.43 e Definição de Escopo

Esta decisão define um **Candidate Pool automatizado de 136 cartas** (seleção curada para testes, amostragem e geração de decks). Ela **não substitui** o escopo canônico do GDD v0.43 (P77-P80), que estabelece como meta inicial jogável 88 cartas (com fallback deliberado para 40 cartas, formando 2 decks de 20 cartas contra 1 IA em 1 mapa).

A distinção conceitual rigorosa adotada no projeto é:
1. **Biblioteca Física de Ativos (ssets-local/card-art/):** Todo o acervo de artes e sidecars TXT baixados (407+ cartas abrangendo todas as 17 RACE prioritárias, Magias e Armadilhas). Nunca é podada por automações.
2. **Candidate Pool / Seleção Curada (DEC-001):** Conjunto algorítmico de 136 cartas (4 raças ativas + Magias + Armadilhas) registrado em selection.json.
3. **Escopo Jogável do Primeiro Protótipo (GDD P77-P80):** Conjunto fechado de 88 cartas (ou fallback de 40 cartas) implementadas com regras ativas de gameplay.
4. **Decks de Partida:** Listas de 20 cartas para duelo.

## Decisão

As 17 RACE prioritárias do projeto continuam válidas como universo de expansão, mas **não precisam estar todas representadas no primeiro protótipo**.

O pool automático usa somente quatro RACE de monstros: Beast, Psychic, Fiend e Spellcaster.

Somente entram monstros classificados no pool como Normal, Efeito, Ritual ou Fusion. Synchro, Xyz, Pendulum e Link continuam fora do primeiro protótipo.

## Expansão de Normais

O pool preserva os slots não-Normal anteriores e adiciona uma cota específica de Normal Monsters:

| RACE | Slots não-Normal | Normal Monsters adicionais | Total da RACE |
| --- | ---: | ---: | ---: |
| Beast | 15 | 10 | 25 |
| Psychic | 15 | 10 | 25 |
| Fiend | 18 | 10 | 28 |
| Spellcaster | 18 | 10 | 28 |
| **Total** | **66** | **40** | **106** |

Cada RACE deve possuir exatamente **10 Normal Monsters** escolhidos somente entre **Níveis 2, 3 e 4**.

Os 10 Normais são slots adicionais; eles não substituem os 66 slots não-Normal usados para Efeito/Fusion/Ritual e para as reservas especiais descritas abaixo.

### Fonte suplementar para Normais

O seletor usa o catálogo padrão do YGOPRODeck e pode consultar também cartas marcadas como **Rush Duel** pelo mesmo catálogo como fonte suplementar somente para completar os slots de Normal Monster.

Essa fonte suplementar é restrita a:

- somente `Normal Monster`;
- somente Beast, Psychic, Fiend ou Spellcaster;
- somente Níveis 2–4;
- Efeito, Ritual e Fusion continuam vindo do catálogo padrão do protótipo.

O `selection.json` registra `selection_source` por carta para auditoria (`standard` ou `rush-duel`).

## Diversidade de arquétipos em monstros

O pool busca variedade visual e **não permite dois monstros com o mesmo arquétipo nomeado**.

A regra usa somente o campo `archetype` retornado pela API do YGOPRODeck:

- cartas sem `archetype` preenchido têm prioridade na seleção;
- uma carta com arquétipo nomeado pode entrar;
- depois que um arquétipo entra, nenhuma outra carta com o mesmo `archetype` pode ser selecionada;
- a regra vale para os monstros antigos e para os novos Normais;
- não se deduz arquétipo pelo nome da carta;
- Magias e Armadilhas não são limitadas por arquétipo nesta etapa.

Assim, famílias como Amazoness, Crystal Beast, Altergeist ou qualquer outra identificada pela API podem ter **no máximo um representante cada**, em vez de dominar vários slots. Quando houver opção suficiente, o seletor prefere monstros sem arquétipo nomeado.

## Ritual Monsters

Beast, Fiend e Spellcaster reservam **1 slot de Ritual Monster oficial por RACE** dentro de suas cotas não-Normal, respeitando a regra de unicidade de arquétipo.

Psychic continua sem Ritual compatível disponível nesta etapa. Em vez de adulterar RACE ou tipo de carta, os **15 slots não-Normal Psychic continuam sendo 15**, mas **2 desses slots são reservados aos dois monstros Psychic compatíveis de maior Nível disponíveis**, também respeitando a unicidade de arquétipo.

Para essa seleção técnica, "alto nível" não é uma categoria de gameplay nem cria um limiar novo. O script ordena candidatos Psychic por Nível decrescente, prefere ausência de arquétipo em empate e depois usa nome e ID.

## Magias

O pool contém exatamente **20 Magias**:

- 2 Field Spell;
- 2 Ritual Spell;
- 5 Equip Spell;
- 11 Magias gerais, escolhidas entre Normal, Quick-Play e Continuous.

As **Ritual Spells são genéricas no fangame nesta etapa**: qualquer uma das Ritual Spells selecionadas pode servir para qualquer Ritual Monster do protótipo.

## Armadilhas

O pool contém **10 Armadilhas**. O subtipo retornado pela API não restringe a seleção nesta etapa.

## Regra de seleção técnica

A seleção automática:

1. exige arte `image_url_cropped` disponível;
2. restringe monstros às quatro RACE ativas e aos tipos Normal/Efeito/Ritual/Fusion;
3. preserva 15/15/18/18 slots não-Normal para Beast/Psychic/Fiend/Spellcaster;
4. adiciona exatamente 10 Normal Monsters Nível 2–4 por RACE;
5. prefere candidatos sem arquétipo nomeado;
6. permite no máximo um monstro para cada valor não vazio de `archetype`;
7. permite Rush Duel somente como suplemento para os slots Normal;
8. reserva 1 Ritual para Beast, Fiend e Spellcaster;
9. reserva os 2 Psychic de maior Nível, com desempate por ausência de arquétipo, nome e ID;
10. completa os demais slots de forma determinística;
11. registra nome, ID, RACE, tipo de carta, tipo normalizado, Nível, `archetype`, `selection_source` e `image_url_cropped`;
12. falha explicitamente se alguma cota obrigatória não puder ser preenchida sem repetir arquétipo.

## Total

- **106 monstros**;
- 20 Magias;
- 10 Armadilhas;
- **136 cartas no pool automático atual**.

Esse total é uma decisão de conteúdo desta etapa e não altera por si só os limites de construção de Deck definidos no GDD.

## Estado de materialização

A política acima está definida, mas o snapshot versionado ainda contém **96 cartas**. Em 2026-09-29, a execução real da sincronização confirmou que o catálogo atual do YGOPRODeck oferece apenas dois Normal Monsters Psychic de Nível 2–4 e não retorna mais os candidatos Rush curados usados como suplemento.

O autor aprovou o **RushCard como fonte auxiliar somente para os Psychic Normais ausentes**, mantendo o YGOPRODeck como fonte principal. A consulta real ao RushCard encontrou dez Psychic Normais de Nível 2–4, mas oito deles pertencem a somente dois arquétipos nomeados (`Psychic Musician` e `Shaman Bandit`). Aplicando a regra já aprovada de no máximo um monstro por arquétipo nomeado, o máximo combinado das duas fontes é **seis Psychic Normais elegíveis**, quatro abaixo da cota.

O autor aprovou uma exceção restrita aos quatro slots restantes: `Psychic Musician` e `Shaman Bandit` podem se repetir somente entre os Psychic Normais vindos do RushCard. A seleção real passou a fechar em **136 cartas**, mantendo a regra de unicidade para todas as demais RACE, tipos e arquétipos.

O RushCard fornece imagens das cartas montadas, mas não uma ilustração limpa equivalente a `image_url_cropped`. Os oito Psychic vindos dessa fonte permanecem na seleção de conteúdo com `art_status: pending-clean-cropped-art`; a automação é proibida de salvar a carta montada como se fosse arte recortada.

Os testes automatizados validam a política e a execução real em modo de simulação confirmou as 136 cartas. A sincronização de arte só estará completa quando houver fonte legítima das oito ilustrações limpas pendentes.
