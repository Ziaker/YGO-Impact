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

Os 10 Normais são slots adicionais; eles não substituem os 66 slots não-Normal já usados para Efeito/Fusion/Ritual e para as reservas especiais descritas abaixo.

### Fonte suplementar para Normais

O catálogo padrão retornado por `cardinfo.php` não possui Psychic Normal Monster Nível 2–4 sem arquétipo elegível. Para cumprir a cota sem falsificar RACE, tipo ou Nível, o seletor pode consultar também o formato oficial **Rush Duel** do mesmo YGOPRODeck.

Essa fonte suplementar é restrita aos slots de Normal Monster:

- somente `Normal Monster`;
- somente Beast, Psychic, Fiend ou Spellcaster;
- somente Níveis 2–4;
- somente sem `archetype` preenchido;
- Efeito, Ritual e Fusion continuam vindo do catálogo padrão do protótipo.

O `selection.json` registra `selection_source` por carta para permitir auditoria (`standard` ou `rush-duel`).

## Exclusão de arquétipos em monstros

Para ampliar a variedade visual, **nenhum monstro do pool automático pode possuir arquétipo nomeado**.

A regra é objetiva e usa o campo `archetype` retornado pela API do YGOPRODeck:

- se `archetype` estiver preenchido, o monstro é inelegível;
- se `archetype` estiver ausente/vazio, o monstro pode ser considerado pelos demais filtros;
- não se deduz arquétipo pelo nome da carta;
- a regra vale também para cartas que já estavam no pool anterior;
- Magias e Armadilhas não são excluídas por `archetype` nesta etapa.

Isso remove automaticamente monstros de famílias nomeadas como Amazoness, Crystal Beast e outras quando a API os identifica por `archetype`.

## Ritual Monsters

Beast, Fiend e Spellcaster reservam **1 slot de Ritual Monster oficial sem arquétipo por RACE** dentro de suas cotas não-Normal.

Psychic continua sem Ritual compatível com a política do protótipo. Em vez de adulterar RACE ou tipo de carta, os **15 slots não-Normal Psychic continuam sendo 15**, mas **2 desses slots são reservados aos dois monstros Psychic compatíveis, sem arquétipo, de maior Nível disponíveis**.

Para essa seleção técnica, "alto nível" não é uma categoria de gameplay nem cria um limiar novo. O script ordena candidatos Psychic por Nível decrescente, depois nome e ID.

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
3. descarta qualquer monstro com `archetype` preenchido na API;
4. reserva exatamente 10 Normal Monsters Nível 2–4 por RACE;
5. permite Rush Duel apenas como suplemento para esses slots Normal;
6. preserva 15/15/18/18 slots não-Normal para Beast/Psychic/Fiend/Spellcaster;
7. reserva 1 Ritual sem arquétipo para Beast, Fiend e Spellcaster;
8. reserva os 2 Psychic sem arquétipo de maior Nível, com desempate por nome + ID;
9. completa os demais slots por nome e, em seguida, ID;
10. registra nome, ID, RACE, tipo de carta, tipo normalizado, Nível, `archetype`, `selection_source` e `image_url_cropped`;
11. falha explicitamente se alguma cota obrigatória não puder ser preenchida.

## Total

- **106 monstros**;
- 20 Magias;
- 10 Armadilhas;
- **136 cartas no pool automático atual**.

Esse total é uma decisão de conteúdo desta etapa e não altera por si só os limites de construção de Deck definidos no GDD.
