# Núcleo autoritativo

O núcleo autoritativo inicial do Monster Impact é escrito em **TypeScript** para ser compartilhável entre execução headless em Node.js e a futura build web. A toolchain de CI usa **Node 24 LTS** e TypeScript fixado em `7.0.2`; o núcleo não possui dependências de runtime.

Essa escolha é arquitetural, não uma regra de gameplay. Protótipos visuais continuam livres para usar tecnologia provisória.

## Contratos do GDD preservados

- simulação única e autoritativa;
- passo fixo de **20 Hz / 50 ms**;
- humanos e IA usam a mesma fila pública;
- comando recebido em um passo fica elegível no próximo passo disponível;
- desempate inicial por sequência monotônica de registro;
- estruturas retornadas pelo core são imutáveis;
- números autoritativos aceitos pelo scaffold são inteiros seguros; floats são rejeitados;
- serialização de estado ordena chaves de objetos canonicamente;
- mesmos seed, estado e comandos produzem os mesmos hashes;
- a ordem macro do passo permanece a definida pelo GDD: receber, ordenar, validar, confirmar custos, mutar, resolver gatilhos/Correntes, checar estado, atualizar timers, emitir telemetria e calcular hash.

## Implementado nesta etapa

- `constants.ts`: cadência e pipeline fixo;
- `types.ts`: tipos mínimos de estado, comando, evento e resultado de passo;
- `queue.ts`: registro monotônico e elegibilidade no próximo passo;
- `canonical.ts`: serialização canônica e hash determinístico FNV-1a 64-bit;
- `freeze.ts`: congelamento recursivo de estruturas públicas;
- `engine.ts`: criação do estado e avanço de um passo sem gameplay;
- `index.ts`: interface pública inicial do módulo.

O FNV-1a é usado **somente como hash determinístico inicial de regressão**, não como mecanismo criptográfico ou decisão eterna do formato de replay. Uma troca futura exige versionamento explícito do schema/hash.

## Deliberadamente não implementado ainda

- custos;
- movimento;
- dano/HP;
- Invocações;
- Correntes, Cross Chains e IMEDIATOS executáveis;
- RNG de gameplay;
- Fog of War;
- timers de gameplay;
- IA;
- replay/telemetria persistentes.

Esses sistemas entram somente com suas regras específicas do GDD e respectivos testes.
