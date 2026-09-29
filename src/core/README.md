# Núcleo autoritativo — contrato inicial

Este diretório reserva o núcleo autoritativo do Monster Impact. **Nenhuma tecnologia final foi escolhida por este arquivo.** A escolha de runtime deve preservar os requisitos abaixo e ser validada contra o GDD antes de código de gameplay ser adicionado.

## Contratos já fechados pelo GDD

- uma única simulação autoritativa;
- passo fixo de **20 Hz / 50 ms**;
- interface, renderização, animação, IA e telemetria não alteram estado diretamente;
- humanos e IA enviam comandos pela mesma interface/fila pública;
- comandos recebidos entre passos entram no próximo passo disponível e recebem sequência de registro;
- validação e confirmação de custos formam operação transacional;
- regras autoritativas usam inteiros ou ponto fixo; floats ficam na apresentação;
- aleatoriedade deriva de seed e fluxos registrados;
- Correntes usam pilha explícita LIFO;
- Corrente somente abre/recebe elementos quando a ativação envolve ao menos um alvo inimigo;
- Cross Chains preservam ponto de continuação, resolvem, revalidam e retomam quando possível;
- IMEDIATO resolve atomicamente fora da pilha, seguido apenas por verificações obrigatórias de estado;
- invariantes são verificadas depois de mutações atômicas capazes de alterá-las;
- ao final do passo são emitidos eventos/telemetria e hash determinístico de estado.

## Ordem de alto nível de um passo

O GDD define a sequência:

1. receber comandos;
2. ordenar;
3. validar;
4. confirmar custos;
5. aplicar eventos/mutações;
6. resolver gatilhos e Correntes;
7. aplicar regras obrigatórias de estado;
8. atualizar timers;
9. emitir telemetria;
10. calcular hash.

A implementação futura deve decompor essa sequência em funções pequenas, puras sempre que possível, sem permitir mutação do estado por UI, IA ou renderização.

## O que ainda não deve ser inventado aqui

- formato concreto de IDs/seed além de estabilidade e registro;
- linguagem/runtime final;
- prioridades numéricas de comandos quando não explicitadas pela regra específica;
- custos, limites ou interações não definidos no GDD;
- regras oficiais de Yu-Gi-Oh! usadas para preencher lacunas.

## Próximo incremento seguro

Depois da escolha explícita do runtime do núcleo, implementar primeiro:

1. tipos imutáveis de estado e comando;
2. fila determinística;
3. `step()` de 50 ms sem gameplay complexo;
4. hashing canônico;
5. testes de reprodução do mesmo comando/seed;
6. invariantes espaciais mínimas.

Só então adicionar movimento e sistemas de gameplay, sempre acompanhados de testes.
