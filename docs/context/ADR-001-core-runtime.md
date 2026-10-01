# ADR-001 — Runtime do núcleo autoritativo

**Status:** adotado para o primeiro protótipo técnico.

## Decisão

Adotar **TypeScript como linguagem principal do Monster Impact**. Ela deve ser usada no núcleo autoritativo, nas regras de gameplay, na IA competitiva e de QA, no replay, na telemetria, nos testes desses sistemas e na aplicação web.

O núcleo é compartilhado: o mesmo código autoritativo deve atender partida interativa, IA, replay, execução headless, self-play, testes e web. Esses consumidores acessam o estado somente por snapshots de leitura ou pela interface pública de comandos; nenhum deles mantém uma segunda implementação das regras.

No headless e na CI, o TypeScript é executado pelo ecossistema Node.js. Para o navegador e o GitHub Pages, ele é compilado para JavaScript em uma build estática e reproduzível.

A CI fixa Node 24 LTS e TypeScript 7.0.2. O core não depende de APIs de DOM nem de pacotes de runtime.

**Python é uma linguagem auxiliar**, adequada para scripts, download e processamento de dados, automações, ferramentas de desenvolvimento e análises quando trouxer vantagem prática. Python não constitui um segundo runtime de gameplay e não deve duplicar nem decidir regras autoritativas. Testes específicos dessas ferramentas podem permanecer em Python.

## Separação da apresentação

A escolha da linguagem principal não aprova framework de UI nem tecnologia de renderização. A camada de apresentação permanece separada do núcleo e depende dos protótipos A/B/C e da aprovação visual exigidos pelo GDD.

O renderer pode usar qualquer tecnologia compatível com a aplicação web e com os contratos públicos do núcleo. Trocar Phaser, PixiJS, Three.js ou outra alternativa futura não pode exigir reescrever regras, alterar diretamente o estado autoritativo nem mudar o resultado da simulação.

## Motivos

- permite o mesmo código autoritativo no headless e no navegador;
- favorece tipos fortes e módulos pequenos;
- reduz o risco de divergência entre partida, IA, replay, testes, self-play e versão web;
- é compatível com snapshots somente leitura e comandos estruturados;
- permite testar determinismo fora da camada de apresentação;
- facilita testes automatizados e execução headless acelerada sem pular regras;
- viabiliza uma build estática e reproduzível para o GitHub Pages usando o mesmo núcleo.

## Restrições

- nenhuma regra de gameplay pode existir somente na UI;
- IA, replay, telemetria e apresentação não alteram diretamente o estado autoritativo;
- APIs específicas de Node não entram no core compartilhado sem uma abstração equivalente no browser;
- ferramentas Python não podem se tornar uma implementação paralela da simulação;
- floats continuam restritos à apresentação; o scaffold rejeita números autoritativos não inteiros;
- mudanças que afetem serialização, ordem de comandos ou hashing precisam de regressões e versionamento explícito.

## Não decidido por este ADR

Framework de UI, renderer, bundler da build final, persistência, formato definitivo de replay e algoritmo definitivo de hash não são definidos aqui. Essas escolhas futuras devem respeitar a separação entre núcleo e apresentação, o processo de prototipagem/aprovação e os requisitos de determinismo deste ADR.
