# Monster Impact — GDD v0.44 — Correções Autorais Canônicas

**Status:** canônico e vigente.  
**Precedência:** esta revisão v0.44 substitui qualquer texto conflitante do GDD v0.43 nos pontos abaixo. Tudo que não for alterado aqui permanece conforme o GDD v0.43.

## 1. Proveniência das decisões

Somente decisões explicitamente confirmadas pelo autor podem ser registradas como **Definido**.

Propostas, inferências, preenchimentos de lacuna, interpretações de agentes ou decisões que não tenham sido tomadas pelo autor não integram o GDD e devem ser removidas, não preservadas como regra.

Na presença de conflito, vale a decisão explícita mais recente do autor.

## 2. Remoção de decisão não autoral sobre autorização de Git

Ficam **removidas e sem efeito** todas as passagens do GDD v0.43 que afirmam existir autorização permanente do autor para criação de commits sem nova confirmação.

Isso inclui, especificamente:

- a passagem em `18.3 Repositório, protótipos visuais e distribuição` que declara autorização permanente para commits;
- a repetição dessa autorização no resumo final antes do Changelog;
- a entrada `0.43` do Changelog que registrava essa suposta autorização como decisão normativa.

A regra vigente é:

- commit exige autorização explícita;
- push exige autorização explícita;
- merge exige autorização explícita;
- publicação exige autorização explícita;
- abertura de Pull Request exige autorização explícita;
- criação de release exige autorização explícita;
- alteração/publicação em GitHub Pages exige autorização explícita;
- uma solicitação para implementar código não autoriza automaticamente publicar o resultado;
- uma solicitação para revisar não autoriza modificar.

## 3. Invocação por Tributo — Monstros Normais e Monstros de Efeito

A regra-base de Invocação por Tributo fica definida assim:

- Monstros Normais de Nível 1 a 4 usam Invocação Normal.
- Monstros Normais de Nível 5 ou mais usam Invocação por Tributo.
- Monstros de Efeito que usem Invocação por Tributo seguem a mesma regra-base.
- Os monstros usados como Tributo devem ser Monstros Normais.
- A soma dos Níveis dos Monstros Normais tributados deve ser igual ou superior ao Nível do monstro a ser Invocado.
- Não existe quantidade fixa universal de Tributos. A quantidade necessária resulta dos Níveis dos Monstros Normais escolhidos.
- Os próprios monstros tributados constituem o custo da Invocação; não existe custo adicional universal de Ação.
- O monstro Invocado por Tributo surge em um dos blocos anteriormente ocupados pelos monstros Tributados, escolhido pelo controlador quando houver mais de uma opção legal, observadas as demais regras espaciais já definidas.

Exemplos:

- alvo de Nível 5: Normal Lv5 é suficiente;
- alvo de Nível 5: Normal Lv3 + Normal Lv2 são suficientes;
- alvo de Nível 5: Normal Lv4 sozinho não é suficiente;
- alvo de Nível 6: Normal Lv6 é suficiente;
- alvo de Nível 6: Normal Lv4 + Normal Lv2 são suficientes;
- alvo de Nível 6: Normal Lv5 sozinho não é suficiente;
- alvo de Nível 8: Normal Lv8 é suficiente;
- alvo de Nível 8: Normal Lv4 + Normal Lv4 são suficientes.

Essa regra se aplica tanto ao cálculo de Tributo de um Monstro Normal de Nível alto quanto ao de um Monstro de Efeito que utilize Invocação por Tributo.

## 4. Escopo desta revisão

Esta revisão não redefine stats, Keywords, Magias, Armadilhas, efeitos de Monstros de Efeito, Ritual, Fusion, IA, terreno ou qualquer outro sistema não citado acima.

Nenhuma lacuna adicional deve ser preenchida por inferência.
