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

## Ritual Monsters

Beast, Fiend e Spellcaster reservam **1 slot de Ritual Monster oficial por RACE** dentro de suas cotas existentes.

O catálogo oficial atual não possui Ritual Monster Psychic. Em vez de adulterar RACE ou tipo de carta, os **15 Psychic continuam sendo 15**, mas **2 desses slots são reservados aos dois monstros Psychic compatíveis de maior Nível disponíveis**.

Para essa seleção técnica, "alto nível" não é uma categoria de gameplay nem cria um limiar novo. O script ordena candidatos Psychic por:

1. Nível decrescente;
2. nome;
3. ID.

Os dois primeiros são reservados; os 13 slots Psychic restantes seguem a ordenação determinística normal por nome + ID.

## Magias

O pool contém exatamente **20 Magias**:

- 2 Field Spell;
- 2 Ritual Spell;
- 5 Equip Spell;
- 11 Magias gerais, escolhidas entre Normal, Quick-Play e Continuous.

As cotas Field, Ritual e Equip são exatas; a parcela geral não adiciona cópias desses três subtipos.

As **Ritual Spells são genéricas no fangame nesta etapa**: qualquer uma das Ritual Spells selecionadas pode servir para qualquer Ritual Monster do protótipo. Não existe vínculo obrigatório com o nome, arquétipo ou Ritual Spell da carta oficial.

## Armadilhas

O pool contém **10 Armadilhas**. O subtipo retornado pela API não restringe a seleção nesta etapa.

## Regra de seleção técnica

Como o autor não exige nomes específicos neste momento, a seleção automática:

1. exige arte `image_url_cropped` disponível;
2. filtra as categorias e cotas acima;
3. reserva 1 Ritual para Beast, Fiend e Spellcaster;
4. reserva os 2 Psychic de maior Nível, com desempate por nome + ID;
5. completa os demais slots por nome e, em seguida, ID;
6. registra nome, ID, RACE, tipo de carta, tipo normalizado e Nível;
7. falha explicitamente se alguma cota obrigatória não puder ser preenchida.

Fora da reserva especial dos dois Psychic, o **Nível é metadado, não critério geral de escolha**. A distribuição por Nível continua sendo consequência do pool determinístico selecionado.

## Total

- 66 monstros;
- 20 Magias;
- 10 Armadilhas;
- **96 cartas no pool automático inicial**.

Esse total é uma decisão de conteúdo desta etapa e não altera por si só os limites de construção de Deck definidos no GDD.
