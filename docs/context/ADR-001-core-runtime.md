# ADR-001 — Runtime do núcleo autoritativo

**Status:** adotado para o primeiro protótipo técnico.

## Decisão

Usar **TypeScript** para o núcleo compartilhado, com Node.js no headless/CI e JavaScript compilado para a futura execução web.

A CI fixa Node 24 LTS e TypeScript 7.0.2. O core não depende de APIs de DOM nem de pacotes de runtime.

## Motivos

- permite o mesmo código autoritativo no headless e no navegador;
- favorece tipos fortes e módulos pequenos;
- reduz risco de duplicar regras entre versão web e testes;
- é compatível com snapshots somente leitura e comandos estruturados;
- permite testar determinismo fora da camada de apresentação.

## Restrições

- nenhuma regra de gameplay pode existir somente na UI;
- APIs específicas de Node não entram no core compartilhado sem uma abstração equivalente no browser;
- floats continuam restritos à apresentação; o scaffold rejeita números autoritativos não inteiros;
- mudanças que afetem serialização, ordem de comandos ou hashing precisam de regressões e versionamento explícito.

## Não decidido por este ADR

Framework de UI, renderer, bundler da build final, persistência, formato definitivo de replay e algoritmo definitivo de hash não são definidos aqui.
