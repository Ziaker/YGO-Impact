# Assets versionados

Por decisão explícita atual do autor do Monster Impact, as artes oficiais selecionadas para o projeto e o manifesto gerado pelo downloader podem ser versionados neste repositório.

## Card art

As ilustrações ficam em:

```text
assets-local/card-art/
```

A coleta usa `image_url_cropped` da API do YGOPRODeck. O jogo não deve depender de hotlink durante a execução.

O arquivo `assets-local/card-art/manifest.json` é gerado por `scripts/baixar_artes.py` e registra, para cada arquivo, o ID da carta, ID da arte, nome, tipo, RACE, URL de origem, tamanho e SHA-256.

A seleção versionada usada pela sincronização automática fica em `scripts/card_art_targets.txt`. O workflow `.github/workflows/sync-card-art.yml` executa o downloader e commita somente os arquivos selecionados.

Arquivos temporários `.part` continuam ignorados pelo Git.

## Aviso

Monster Impact é pessoal, não comercial e não oficial. Yu-Gi-Oh!, seus nomes, cartas e artes pertencem aos respectivos detentores de direitos. Este repositório não possui afiliação oficial com a Konami.
