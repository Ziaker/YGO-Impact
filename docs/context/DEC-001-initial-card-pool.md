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

## Magias

O pool contém exatamente **20 Magias**:

- 2 Field Spell;
- 2 Ritual Spell;
- 5 Equip Spell;
- 11 Magias gerais, escolhidas entre Normal, Quick-Play e Continuous.

As cotas Field, Ritual e Equip são exatas; a parcela geral não adiciona cópias desses três subtipos.

## Armadilhas

O pool contém **10 Armadilhas**. O subtipo retornado pela API não restringe a seleção nesta etapa.

## Regra de seleção técnica

Como o autor não exige nomes específicos neste momento, a seleção automática:

1. exige arte `image_url_cropped` disponível;
2. filtra as categorias e cotas acima;
3. ordena candidatos por nome e, em seguida, ID;
4. escolhe os primeiros candidatos até completar cada cota;
5. registra nome, ID, RACE, tipo de carta, tipo normalizado e Nível;
6. falha explicitamente se alguma cota não puder ser preenchida.

O **Nível é metadado**, não critério de escolha. A distribuição por Nível é consequência do pool determinístico selecionado.

## Total

- 66 monstros;
- 20 Magias;
- 10 Armadilhas;
- **96 cartas no pool automático inicial**.

Esse total é uma decisão de conteúdo desta etapa e não altera por si só os limites de construção de Deck definidos no GDD.
