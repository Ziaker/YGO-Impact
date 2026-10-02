# Scripts

## Verificação das fontes canônicas

```bash
python scripts/verify_context_sources.py
```

Confere tamanho e SHA-256 do GDD v0.42 e do prompt mestre preservados em `docs/context/sources/`. A CI executa essa validação para impedir remoção, truncamento ou alteração silenciosa dessas fontes.

## Launcher local do jogo

Para iniciar o cliente web tático no ambiente local com abertura automática no navegador:

```bash
# Via script Python multiplataforma
python scripts/launch_game.py

# Via npm
npm start

# No Windows (prompt ou duplo-clique no Explorer)
launch.bat
# ou no PowerShell
.\launch.ps1
```

O launcher verifica se o bundle TypeScript (`dist/web/app.js`) foi compilado (executando `npm run build` se necessário), aloca uma porta HTTP disponível (padrão `8080` ou próxima) e abre o navegador padrão automaticamente no tabuleiro jogável.

Opções disponíveis:
- `--port <número>`: fixa uma porta específica em vez de busca dinâmica;
- `--no-browser`: inicia o servidor HTTP sem abrir o navegador;
- `--build`: força recompilação do TypeScript antes de iniciar;
- `--build-only`: apenas compila os fontes e encerra sem abrir servidor.

## Downloader de artes

`scripts/baixar_artes.py` contém o downloader genérico de artes `image_url_cropped` do YGOPRODeck usando somente a biblioteca padrão do Python.

A política oficial do pool do primeiro protótipo é aplicada por `scripts/sync_prototype_pool.py`.

### Pool automático do primeiro protótipo

O modo oficial atual é:

```bash
python scripts/sync_prototype_pool.py --prototype-pool
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

`sync_prototype_pool.py` consulta o catálogo padrão e pode usar cartas marcadas como Rush Duel como **fonte suplementar somente para slots Normal Nível 2–4**. Efeito, Ritual e Fusion continuam no catálogo padrão. O `selection.json` registra `selection_source` para auditoria.

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

### Dry-run

```bash
python scripts/sync_prototype_pool.py --prototype-pool --dry-run
```

O dry-run mostra a distribuição por Nível e o plano de download sem criar arquivos.

### Coleta manual

O downloader-base continua disponível para inspeção e coleta pontual:

```bash
python scripts/baixar_artes.py --name "Dark Magician" --dry-run
python scripts/baixar_artes.py --id 46986414 --dry-run
python scripts/baixar_artes.py --input scripts/card_art_targets.txt --dry-run
python scripts/baixar_artes.py --race Beast --dry-run
python scripts/baixar_artes.py --all-compatible --dry-run
```

Nos modos manuais, monstros continuam limitados às quatro RACE ativas e aos quatro tipos de monstro suportados pelo downloader; a política ampliada de cotas, arquétipos e suplemento Rush pertence a `sync_prototype_pool.py`.

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

O workflow `.github/workflows/sync-card-art.yml` executa `scripts/sync_prototype_pool.py --prototype-pool` e versiona as artes, a seleção e o manifesto quando houver alterações.
