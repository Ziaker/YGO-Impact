# DEC-001 — Pool de cartas do primeiro protótipo

**Status:** definido pelo autor  
**Data:** 2026-09-29

## Decisão

As 17 RACE prioritárias do projeto continuam válidas como universo de expansão, mas **não precisam estar todas representadas no primeiro protótipo**.

O pool automático inicial usa somente quatro RACE de monstros:

| RACE | Quantidade |
| --- | ---: |
| Beast | 15 |
| Psychic | 15 |
| Fiend | 18 |
| Spellcaster | 18 |
| **Total de monstros** | **66** |

Somente entram monstros classificados no pool como:

- Normal;
- Efeito;
- Ritual;
- Fusion.

Synchro, Xyz, Pendulum e Link continuam fora do primeiro protótipo.

## Ritual no pool inicial

A intenção de conteúdo é ter **1 Ritual Monster por RACE ativa**, sem alterar a cota total daquela RACE: o Ritual substitui um dos demais candidatos que entrariam na seleção determinística.

A seleção preserva os metadados oficiais retornados pela fonte. No catálogo oficial atual existe pelo menos um Ritual Monster compatível para Beast, Fiend e Spellcaster, portanto essas três RACE devem ter exatamente 1 Ritual selecionado.

**Psychic é uma exceção de disponibilidade:** o catálogo oficial atual não possui Ritual Monster da RACE Psychic. O projeto não reclassifica uma carta de outra RACE e não inventa metadados para preencher essa vaga. Enquanto essa limitação existir, Psychic permanece com 0 Ritual oficial no pool. Se um Ritual Monster Psychic oficial passar a existir e for retornado pela fonte, a política de seleção deve passar a escolhê-lo automaticamente.

## Magias

O pool contém exatamente **20 Magias**:

- 2 Field Spell;
- 2 Ritual Spell;
- 5 Equip Spell;
- 11 Magias gerais, escolhidas entre Normal, Quick-Play e Continuous.

As cotas Field, Ritual e Equip são exatas; a parcela geral não adiciona cópias desses três subtipos.

### Compatibilidade de Ritual Spell

Para Monster Impact, as Ritual Spells deste pool são tratadas como **genéricas para os Ritual Monsters do protótipo**. Não existe exigência de correspondência por nome entre a Ritual Spell oficial escolhida como arte/conteúdo e um Ritual Monster específico.

A seleção das 2 Ritual Spells pode, portanto, usar quaisquer cartas oficiais do subtipo Ritual Spell que satisfaçam os filtros técnicos de arte e disponibilidade. Essa decisão altera a compatibilidade de conteúdo do fangame e não importa automaticamente as restrições textuais do TCG/OCG.

## Armadilhas

O pool contém **10 Armadilhas**. O subtipo retornado pela API não restringe a seleção nesta etapa.

## Regra de seleção técnica

Como o autor não exige nomes específicos neste momento, a seleção automática:

1. exige arte `image_url_cropped` disponível;
2. filtra as categorias e cotas acima;
3. para cada RACE com Ritual oficial disponível, escolhe primeiro exatamente 1 Ritual Monster;
4. completa o restante da cota da RACE com monstros não-Ritual;
5. ordena os candidatos de cada grupo por nome e, em seguida, ID;
6. escolhe as 2 Ritual Spells sem vínculo de nome com os Ritual Monsters;
7. registra nome, ID, RACE, tipo de carta, tipo normalizado e Nível;
8. falha explicitamente se alguma cota obrigatória não puder ser preenchida.

O **Nível é metadado**, não critério de escolha. A distribuição por Nível é consequência do pool determinístico selecionado.

## Total

- 66 monstros;
- 20 Magias;
- 10 Armadilhas;
- **96 cartas no pool automático inicial**.

Esse total é uma decisão de conteúdo desta etapa e não altera por si só os limites de construção de Deck definidos no GDD.
