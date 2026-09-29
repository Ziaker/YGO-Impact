# Scripts

## Downloader de artes

`scripts/baixar_artes.py` adapta o script inicial de coleta ao contrato do GDD v0.42 e usa somente a biblioteca padrão do Python.

As imagens são obtidas de `image_url_cropped` da API do YGOPRODeck e gravadas por padrão em `assets-local/card-art/`, pasta ignorada pelo Git.

### Exemplos

Dry-run por nomes exatos:

```bash
python scripts/baixar_artes.py \
  --name "Dark Magician" \
  --name "Blue-Eyes White Dragon" \
  --dry-run
```

Por ID:

```bash
python scripts/baixar_artes.py --id 46986414
```

Arquivo de seleção:

```bash
python scripts/baixar_artes.py --input scripts/card_art_targets.example.txt --dry-run
```

Uma RACE prioritária inteira:

```bash
python scripts/baixar_artes.py --race Dragon --dry-run
```

Todas as cartas compatíveis, de forma explícita:

```bash
python scripts/baixar_artes.py --all-compatible --dry-run
```

Artes alternativas:

```bash
python scripts/baixar_artes.py --name "Dark Magician" --all-artworks --dry-run
```

Filtro histórico opcional:

```bash
python scripts/baixar_artes.py --all-compatible --pre-2010 --dry-run
```

Remova `--dry-run` somente depois de revisar a seleção. Downloads concluídos são registrados em `assets-local/card-art/manifest.json`; arquivos já existentes são ignorados por padrão e podem ser substituídos com `--force`.

O downloader nunca inclui Synchro, Xyz, Pendulum ou Link no escopo atual.
