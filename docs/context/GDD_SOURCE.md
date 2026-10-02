# GDD canônico

O GDD canônico mais recente do primeiro protótipo foi lido integralmente a partir do arquivo fornecido pelo autor:

- nome de origem: `Monster_Impact_GDD_v0.43.docx`;
- versão interna: **0.43 — GDD do primeiro protótipo**;
- tamanho: **97.352 bytes**;
- SHA-256: `6e40f214f2a254f5a30f54d64b4c74cccc352df1785e340e9eb4736a06c17fa9`.

O conteúdo desse documento é a fonte de verdade para gameplay e escopo, subordinado apenas às instruções explícitas e correções posteriores do autor conforme as regras de precedência do próprio projeto.

## Arquivos versionados

A cópia canônica mais recente está versionada em:

`docs/context/sources/Monster_Impact_GDD_v0.43.docx`

A versão imediatamente anterior (v0.42) permanece preservada como histórico em:

`docs/context/sources/Monster_Impact_GDD_v0.42.docx` (96.807 bytes, SHA-256: `0a18e151aa844abcc57eb1b06611eb711c977f36c58ff98b9e937aed34e4f963`).

Ambas devem permanecer byte a byte idênticas aos arquivos de origem. Os tamanhos e os hashes SHA-256 acima são os critérios de integridade verificados pelo script `scripts/verify_context_sources.py`. Regras específicas devem ser conferidas diretamente no documento; resumos não o substituem.

## Prompt Mestre

O prompt mestre completo fornecido pelo autor está preservado separadamente em `docs/context/sources/PROMPT_MESTRE.txt`:
- formato canônico em repositório (Linux / CI / LF): **35.829 bytes**, SHA-256: `431f7e0a9bca844698eb676c856ba84a5d1e2ac4c83433d785a37241c050c26b`;
- formato com conversão de quebra de linha Windows (CRLF): **37.225 bytes**, SHA-256: `011fd2a1d4d4b65a96ec5c265244dfaa5b940785d851455b4ef01172fe101e67`.

Ambas as representações equivalentes de quebra de linha são aceitas pelo verificador `scripts/verify_context_sources.py`, assegurando que o arquivo permaneça íntegro sem sofrer modificações textuais em nenhum ambiente de desenvolvimento ou CI.
