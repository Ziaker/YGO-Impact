# Scripts

## Downloader de artes

`scripts/baixar_artes.py` adapta o script inicial de coleta ao contrato do GDD v0.42 e usa somente a biblioteca padrão do Python.

As imagens são obtidas de `image_url_cropped` da API do YGOPRODeck e gravadas por padrão em `assets-local/card-art/`. Por decisão explícita atual do autor, a seleção aprovada de artes e seu manifesto podem ser versionados no repositório.

### Seleção versionada

A lista usada para a sincronização automática fica em:

```text
scripts/card_art_targets.txt
```

`card_art_targets.example.txt` permanece apenas como exemplo de formato.

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

Arquivo de seleção versionado:

```bash
python scripts/baixar_artes.py --input scripts/card_art_targets.txt --dry-run
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

Filtro histórico opcional (consulta `cardsets.php` para as datas TCG atuais):

```bash
python scripts/baixar_artes.py --all-compatible --pre-2010 --dry-run
```

Remova `--dry-run` somente depois de revisar a seleção. Downloads concluídos são registrados em `assets-local/card-art/manifest.json`; arquivos já existentes são ignorados por padrão e podem ser substituídos com `--force`.

O workflow `.github/workflows/sync-card-art.yml` executa o downloader para `scripts/card_art_targets.txt` e commita as artes selecionadas e o manifesto quando houver alterações.

O downloader nunca inclui Synchro, Xyz, Pendulum ou Link no escopo atual.
