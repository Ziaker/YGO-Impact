# Scripts

## Downloader de artes

`scripts/baixar_artes.py` contém o downloader genérico de artes `image_url_cropped` do YGOPRODeck usando somente a biblioteca padrão do Python.

A política oficial do pool do primeiro protótipo é aplicada por `scripts/sync_prototype_pool.py`. No GitHub Actions, `scripts/sync_prototype_pool_curated.py` aplica a mesma política usando uma coleta suplementar curada para os Normal Monsters Rush necessários enquanto o endpoint em massa correspondente permanece instável.

### Pool automático do primeiro protótipo

O modo oficial atual é:

```bash
python scripts/sync_prototype_pool_curated.py --prototype-pool
```

A seleção exige `image_url_cropped` disponível e usa regras determinísticas.

Pool atual de monstros:

- RACE ativas: Beast, Psychic, Fiend e Spellcaster;
- tipos permitidos: Normal, Efeito, Ritual e Fusion;
- monstros sem arquétipo têm prioridade;
- no máximo **1 monstro por arquétipo nomeado** em todo o pool;
- slots não-Normal preservados:
  - 15 Beast;
  - 15 Psychic;
  - 18 Fiend;
  - 18 Spellcaster;
- mais **10 Normal Monsters por RACE**, todos de **Nível 2 a 4**.

Isso resulta em 25 Beast, 25 Psychic, 28 Fiend e 28 Spellcaster: **106 monstros**.

`sync_prototype_pool.py` define a política e o runner curado complementa somente os slots Normal Nível 2–4 que não estão disponíveis de forma suficiente no catálogo padrão. Efeito, Ritual e Fusion continuam no catálogo padrão. O `selection.json` registra `selection_source` para auditoria.

A política de arquétipos usa apenas o campo `archetype` retornado pela API: uma carta de arquétipo pode entrar, mas uma segunda carta com o mesmo valor é rejeitada. Não se deduz arquétipo pelo nome.

Beast, Fiend e Spellcaster reservam 1 Ritual Monster dentro de seus slots não-Normal. Psychic reserva 2 slots não-Normal para os dois candidatos de maior Nível, sempre respeitando a unicidade de arquétipo.

Magias:

- 20 no total;
- 2 Field;
- 2 Ritual;
- 5 Equip;
- 11 entre Normal, Quick-Play e Continuous.

Armadilhas:

- 10 no total;
- qualquer subtipo.

Total atual: **136 cartas**, sendo **106 monstros, 20 Magias e 10 Armadilhas**.

A execução cria/atualiza:

```text
assets-local/card-art/selection.json
assets-local/card-art/manifest.json
```

`selection.json` registra nome, ID, RACE, tipo retornado pela API, tipo normalizado do protótipo, Nível, `archetype`, `selection_source` e `image_url_cropped`, além dos resumos das cotas selecionadas e dos arquétipos usados.

`manifest.json` registra os arquivos efetivamente baixados, SHA-256, tamanho e os metadados relevantes disponíveis no downloader.

## Referências de efeito

`scripts/sync_effect_texts.py` cria um arquivo `.effect.txt` para cada monstro cujo tipo normalizado seja **Efeito**. O arquivo fica na mesma pasta e usa o mesmo nome-base da arte:

```text
assets-local/card-art/Monstros/Psychic/Efeito/
├── nome-do-monstro__12345678.jpg
└── nome-do-monstro__12345678.effect.txt
```

O sidecar registra nome, ID, RACE, Nível, tipo da API e o texto `desc` da carta-fonte retornado pelo YGOPRODeck.

Esses arquivos são **referência de conteúdo**, não regra autoritativa: texto oficial da carta não cria automaticamente custo, alvo, timing, Corrente, Keyword ou qualquer interação no Monster Impact. O GDD e o conteúdo aprovado do projeto continuam prevalecendo.

Sincronização manual dos sidecars após as artes/seleção estarem atualizadas:

```bash
python scripts/sync_effect_texts.py --root assets-local/card-art
```

O workflow de artes executa essa etapa automaticamente e registra os `.effect.txt` no `manifest.json`. A poda remove sidecars órfãos quando uma carta deixa de pertencer à seleção.

### Dry-run

```bash
python scripts/sync_prototype_pool_curated.py --prototype-pool --dry-run
python scripts/sync_effect_texts.py --root assets-local/card-art --dry-run
```

O dry-run do pool mostra a distribuição por Nível e o plano de download sem criar arquivos. O dry-run de efeitos lista os sidecars planejados sem gravá-los.

### Coleta manual

O downloader-base continua disponível para inspeção e coleta pontual:

```bash
python scripts/baixar_artes.py --name "Dark Magician" --dry-run
python scripts/baixar_artes.py --id 46986414 --dry-run
python scripts/baixar_artes.py --input scripts/card_art_targets.txt --dry-run
python scripts/baixar_artes.py --race Beast --dry-run
python scripts/baixar_artes.py --all-compatible --dry-run
```

Nos modos manuais, monstros continuam limitados às quatro RACE ativas e aos quatro tipos de monstro suportados pelo downloader; a política ampliada de cotas, arquétipos e suplemento Rush pertence aos scripts de sincronização do pool.

`--all-artworks` baixa artes alternativas. `--pre-2010` permanece como filtro opcional e não faz parte da regra padrão do pool.

### Organização

```text
assets-local/card-art/
├── Monstros/
│   ├── Beast/
│   ├── Psychic/
│   ├── Fiend/
│   └── Spellcaster/
│       └── Efeito/
│           ├── nome__id.jpg
│           └── nome__id.effect.txt
├── Magias/
├── Armadilhas/
├── selection.json
└── manifest.json
```

O workflow `.github/workflows/sync-card-art.yml` executa a seleção do pool, baixa as artes, sincroniza referências de efeito, poda arquivos obsoletos e versiona artes, sidecars, seleção e manifesto quando houver alterações.
