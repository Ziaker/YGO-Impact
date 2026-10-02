# GDD canônico

A fonte canônica vigente do primeiro protótipo é composta por:

1. `docs/context/sources/Monster_Impact_GDD_v0.43.docx` — documento-base integral fornecido pelo autor;
2. `docs/context/GDD_v0.44.md` — revisão autoral canônica que substitui os pontos conflitantes da v0.43 explicitamente corrigidos pelo autor.

A precedência é: instrução atual do autor > correção autoral mais recente > `GDD_v0.44.md` nos pontos que altera > GDD v0.43 no restante.

## Revisão vigente — v0.44

`docs/context/GDD_v0.44.md` formaliza somente correções explicitamente confirmadas pelo autor:

- somente decisões confirmadas pelo autor podem ser registradas como `Definido`; propostas e inferências de agentes sem confirmação não integram o GDD;
- remoção da falsa autorização permanente para commit/push/merge/publicação/PR/release/Pages;
- Monstros Normais de Nível 1–4 usam Invocação Normal;
- Monstros Normais de Nível 5+ usam Invocação por Tributo;
- Monstros de Efeito que usem Invocação por Tributo seguem a mesma regra-base;
- os Tributos são Monstros Normais e a soma de seus Níveis deve ser igual ou superior ao Nível do monstro a ser Invocado;
- não existe quantidade fixa universal de Tributos; a quantidade decorre da soma de Níveis necessária.

Integridade da revisão v0.44 em repositório (LF):

- tamanho: **3.665 bytes**;
- SHA-256: `3f72a0520940ccaf390a466d68dd56e28636b63ac9f93a91d40791c65301982f`.

Representação equivalente em checkout Windows (CRLF):

- tamanho: **3.731 bytes**;
- SHA-256: `c36a8449c7613629f6a24bcc2508145912ddaa800c8525399ed8de8f257ffdca`.

## Documento-base preservado — v0.43

O documento-base integral permanece preservado em:

`docs/context/sources/Monster_Impact_GDD_v0.43.docx`

- nome de origem: `Monster_Impact_GDD_v0.43.docx`;
- versão interna: **0.43 — GDD do primeiro protótipo**;
- tamanho: **97.352 bytes**;
- SHA-256: `6e40f214f2a254f5a30f54d64b4c74cccc352df1785e340e9eb4736a06c17fa9`.

A v0.43 não deve ser usada para sobrepor uma correção registrada na v0.44. Passagens da v0.43 explicitamente revogadas pela v0.44 são históricas e sem efeito normativo.

A versão v0.42 permanece preservada como histórico em:

`docs/context/sources/Monster_Impact_GDD_v0.42.docx` (96.807 bytes, SHA-256: `0a18e151aa844abcc57eb1b06611eb711c977f36c58ff98b9e937aed34e4f963`).

## Prompt Mestre

O prompt mestre completo fornecido pelo autor está preservado separadamente em `docs/context/sources/PROMPT_MESTRE.txt`:

- formato canônico em repositório (Linux / CI / LF): **35.829 bytes**, SHA-256: `431f7e0a9bca844698eb676c856ba84a5d1e2ac4c83433d785a37241c050c26b`;
- formato com conversão de quebra de linha Windows (CRLF): **37.225 bytes**, SHA-256: `011fd2a1d4d4b65a96ec5c265244dfaa5b940785d851455b4ef01172fe101e67`.

As fontes versionadas são verificadas por `scripts/verify_context_sources.py`. Regras específicas devem ser conferidas na fonte de maior precedência; resumos e implementação não substituem decisão autoral.
