# VIS-003 — Movimento e alcançabilidade no mapa

## Estado do experimento

**Aprovado parcialmente por herança e evidência textual autoral: Opção A (área cheia) em grade quadrangular.**

> [!NOTE]
> Este documento registra o estado real e documental do VIS-003 no repositório. O arquivo executável / snapshot independente original do VIS-003 não foi localizado no repositório. A decisão abaixo é documentada a partir da evidência explícita registrada no protótipo sucessor VIS-004 e nas confirmações do autor.

## Pergunta original de pesquisa

Como apresentar visualmente os blocos alcançáveis de uma unidade selecionada no mapa 31 × 17, preservando legibilidade imediata tanto em 2D top-down quanto em 3D tático (orientações aprovadas em VIS-002)?

## Decisão comprovada

- **Apresentação de alcance:** A **Opção A — área cheia** (preenchimento contínuo translúcido cobrindo os blocos alcançáveis) foi a opção aprovada para indicar alcançabilidade.
- **Orientações:** A área cheia aplica-se tanto à projeção 2D top-down ortogonal quanto à visualização 3D tática.
- **Geometria da grade:** O mapa é composto por **blocos quadrangulares (quadrados)**. Não substituir os blocos por octógonos, hexágonos ou qualquer outra forma geométrica que altere a leitura ortogonal da grade.

## Origem da evidência

1. **Evidência no executável VIS-004:** O protótipo sucessor VIS-004 declara explicitamente em sua barra de status e código:
   - `statuspill`: `"área cheia · VIS-003 herdado"`
   - `footer`: `"herda A-área cheia + 2D/3D"`
   - `setOverlayStyle('A', true)` travado por padrão para gameplay, relegando alternativas B (numérica) e C (pontos mínimos) ao modo QA histórico.
2. **Instruções e correções do autor:** O autor confirmou que a decisão sobre blocos alcançáveis adotou a área cheia, sem reabrir a pergunta de apresentação básica de alcance.

## Ausência de snapshot independente

O repositório não contém atualmente um diretório `prototypes/visual-003-movement-reachability/` com um arquivo executável isolado. O repositório não finge possuir esse artefato nem inventa resultados não verificados para opções alternativas B ou C daquela fase. O comportamento aprovado de VIS-003 está materializado e preservado no protótipo executável do VIS-004.

## Limites da aprovação

A aprovação do VIS-003 cobre **estritamente a representação visual dos blocos alcançáveis como área cheia em grade quadrangular nas orientações 2D e 3D**.

A aprovação de VIS-003 **NÃO aprova por herança**:
- Apresentação visual definitiva de terreno ou custos de terreno (questão em teste no VIS-004);
- Custo numérico de Campo QA como regra canônica (permanece fixture de teste);
- Valores específicos de alcance ou fórmulas definitivas de mobilidade;
- Animações de deslocamento, timing ou interpolação bloco a bloco;
- Demais melhorias do pacote de qualidade de uso (QoL) adicionadas no VIS-004.
