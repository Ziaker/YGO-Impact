# DEC-001 — Pool de cartas do primeiro protótipo

**Status:** definido pelo autor  
**Data:** 2026-09-29

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
