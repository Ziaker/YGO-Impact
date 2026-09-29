# Scripts

## Downloader de artes

`scripts/baixar_artes.py` seleciona e baixa artes `image_url_cropped` do YGOPRODeck usando somente a biblioteca padrão do Python.

### Pool automático do primeiro protótipo

O modo oficial atual é:

```bash
python scripts/baixar_artes.py --prototype-pool
```

Ele seleciona deterministicamente por **nome + ID** e exige `image_url_cropped` disponível.

Pool atual:

- 15 Beast;
- 15 Psychic;
- 18 Fiend;
- 18 Spellcaster;
- somente monstros Normal, Efeito, Ritual e Fusion;
- 20 Magias:
  - 2 Field;
  - 2 Ritual;
  - 5 Equip;
  - 11 entre Normal, Quick-Play e Continuous;
- 10 Armadilhas de qualquer subtipo.

Total: **96 cartas**, sendo **66 monstros, 20 Magias e 10 Armadilhas**.

O Nível **não influencia a escolha**. Ele é preservado como metadado e contabilizado no catálogo gerado.

A execução cria:

```text
assets-local/card-art/selection.json
assets-local/card-art/manifest.json
```

`selection.json` registra nome, ID, RACE, tipo retornado pela API, tipo normalizado do protótipo, Nível e `image_url_cropped`, além de resumos por RACE, tipo, Nível e subtipo de Magia/Armadilha.

`manifest.json` registra os arquivos efetivamente baixados, SHA-256, tamanho e os mesmos metadados relevantes.

### Dry-run

```bash
python scripts/baixar_artes.py --prototype-pool --dry-run
```

O dry-run mostra a distribuição por Nível e o plano de download sem criar arquivos.

### Coleta manual

Os modos antigos continuam disponíveis para inspeção e coleta pontual:

```bash
python scripts/baixar_artes.py --name "Dark Magician" --dry-run
python scripts/baixar_artes.py --id 46986414 --dry-run
python scripts/baixar_artes.py --input scripts/card_art_targets.txt --dry-run
python scripts/baixar_artes.py --race Beast --dry-run
python scripts/baixar_artes.py --all-compatible --dry-run
```

Nos modos manuais, monstros continuam limitados às quatro RACE ativas e aos quatro tipos de monstro do protótipo.

`--all-artworks` baixa artes alternativas. `--pre-2010` permanece como filtro opcional e não faz parte da regra padrão do pool.

### Organização

```text
assets-local/card-art/
├── Monstros/
│   ├── Beast/
│   ├── Psychic/
│   ├── Fiend/
│   └── Spellcaster/
├── Magias/
├── Armadilhas/
├── selection.json
└── manifest.json
```

O workflow `.github/workflows/sync-card-art.yml` executa `--prototype-pool` e versiona as artes, a seleção e o manifesto quando houver alterações.
