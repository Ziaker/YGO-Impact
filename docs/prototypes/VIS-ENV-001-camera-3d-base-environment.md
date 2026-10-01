# VIS-ENV-001 — Revisão Fundacional da Câmera 3D, Palco Visual e Assinatura Elemental (3D WebGL Verdadeiro & 6 Geometrias Únicas)

**Status:** **EM AVALIAÇÃO PELO AUTOR (Opções A, B e C — Three.js WebGL Local, Perspectiva Isométrica e Físicas Elementais Distintas)**  
**Data do Documento:** 2026-10-01  
**Executável Visual Oficial:** [prototypes/visual-env-001-board-camera/index.html](../../prototypes/visual-env-001-board-camera/index.html)  
**Pergunta Estética Central:** *"Qual deve ser a câmera 3D e o ambiente visual padrão de Monster Impact para que o jogo fique monumental, legível e agradável de usar na grade 31 × 17, e como os 6 elementos canônicos do GDD devem se diferenciar fisicamente por formato de malha, geometria tridimensional e dinâmica física, e não apenas por cor?"*  
**Referência Canônica:** GDD v0.43 (Seção 18.3.1: *Composição do mapa e navegação*, Seção 18.3.2: *Terrenos e visualização espacial*, Seção 18.3.3: *Combate e animações*), `src/core/monster.ts` (`MONSTER_ELEMENTS`).

---

## 1. Doutrina Metodológica e Resolução dos Problemas Anteriores

Em resposta às duas diretrizes mandatárias do autor:
1. **"o 3D ainda não funciona" — Diagnóstico e Solução Definitiva:**
   - *Causa-raiz:* Anteriormente, o tabuleiro estava desenhado no plano $XY$ com $Z$ como elevação. Como o Three.js adota $(0, 1, 0)$ como vetor UP padrão do mundo, os controles orbitais (`OrbitControls`) giravam em torno do eixo $Y$ da tela, capotando o tabuleiro lateralmente como uma moeda e forçando as câmeras a olharem de cima para baixo (visão plana/topo);
   - *Solução:* Reconstrução total do espaço tridimensional com **Three.js WebGL local vendorado offline** (`three.min.js` e `OrbitControls.js` no próprio diretório do protótipo). O solo repousa estritamente no plano $XZ$ ($Y=0$) e a elevação/altura física vertical opera no eixo $Y$. O `OrbitControls` foi configurado com `maxPolarAngle = 1.52 rad` para impossibilitar que a câmera atravesse o chão, e amortecimento cinemático suave (`dampingFactor: 0.08`).
   - *Resultado Visual:* Perspectiva isométrica verdadeira inclinada (Pitch 42°), projeção de sombras volumétricas em tempo real sobre a ardósia/arenito/holograma, pedestais chanfrados com relevo táctil e miniaturas poliédricas 3D em elevação no ar.

2. **"queria que os efeitos fossem diferentes para cada elemento, não só cores" — Morfologia e Físicas Distintas:**
   - Em vez de uma malha genérica apenas com tintas trocadas, **cada elemento canônico recebeu uma geometria 3D própria, volumetria exclusiva e física de animação singular**:

| Elemento (GDD §18.3) | Morfologia Geométrica 3D | Físicas e Animação Dinâmica | Assinatura Cromática |
|---|---|---|---|
| 🔥 **FOGO** | `ConeGeometry` horizontal (4.8m) + `SphereGeometry` de plasma + `RingGeometry` térmico + 12 `OctahedronGeometry` (brasas) | Torrente cônica ondulante com wireframe incandescente e núcleo central de fogo contínuo que detona uma esfera de calor e anel térmico na base do alvo, erguendo brasas em ascensão. | Carmesim (`#ef4444`) e Laranja Solar (`#f97316`) |
| 💧 **ÁGUA** | `TubeGeometry` (spline Catmull-Rom de dupla curvatura) + `CylinderGeometry` (gêiser vertical) + 2 `RingGeometry` concêntricos | Serpente aquática em tubo fluido que salta em arco parabólico no ar pelo corredor e desaba no alvo, irrompendo um gêiser de alta pressão vertical de 6 metros com anéis de onda de choque no piso. | Azul Safira (`#0ea5e9`) e Ciano Torrencial (`#38bdf8`) |
| 🌍 **TERRA** | `BoxGeometry` (fissura no solo) + 5 `ConeGeometry` facetados (5 faces rochosas) + 6 `BoxGeometry` (blocos de impacto) | Ruptura tectônica no solo que ergue sequencialmente uma escada de 5 monólitos pontiagudos de pedra basáltica até perfurar o alvo, espalhando escombros pesados de rocha ao redor. | Âmbar Dourado (`#d97706`) e Basalto (`#92400e`) |
| 🌪️ **VENTO** | `CylinderGeometry` afunilado (funil ciclônico translúcido) + 2 `TorusGeometry` (lâminas de vácuo em foice) + `RingGeometry` | Furacão vertical em cone afunilado girando a alta velocidade angular em torno do alvo, enquanto duas foices de vácuo afiadas orbitam em eixos ortogonais perpendiculares e anel de pressão expande no solo. | Verde Esmeralda (`#10b981`) e Jade Tempestuoso (`#34d399`) |
| ☀️ **LUZ** | 2 `CylinderGeometry` verticais maciços (altura 35m) + 2 `RingGeometry` concêntricos de glifos solares | Pilar celestial colossal de 35 metros que desaba verticalmente direto do firmamento com núcleo branco incandescente e aura dourada, ativando círculos sagrados que giram em sentidos opostos no chão. | Dourado Solar (`#facc15`) e Branco Celestial Puro (`#ffffff`) |
| 🌑 **TREVAS** | `SphereGeometry` abissal (buraco negro) + `RingGeometry` inclinado (35°) de acreção + 4 `ConeGeometry` (garras do abismo) | Singularidade gravitacional (horizonte de eventos esférico ultranegro) orbitado por disco de acreção violeta inclinado girando em alta rotação, com garras de matéria escura erguendo-se do solo em convulsão. | Violeta Abissal (`#c084fc`) e Púrpura Profundo (`#3b0764`) |

---

## 2. As Três Opções Monumentais de Cenário e Palco 3D

### Opção A — Coliseu Sagrado das Lâminas (High-Fantasy Arena)
- **Câmera:** Perspectiva isométrica suave (Pitch 42°, FOV 40°). Amortecimento inercial calibrado.
- **Ambiente:** Monumental platô de pedra nobre ardósia com chanfro arquitetônico espesso; 4 pilares colossais nos cantos da arena projetando sombras suaves em tempo real e tochas de fogo místico acesas.
- **Grade & Bases:** Incisões em baixo-relevo na rocha; bases de comando circulares em titânio e cianeto com obeliscos de cristal nos extremos leste e oeste; obstáculos monolíticos chanfrados em basalto polido.

### Opção B — Arena Cibernética Solid Vision (Neo-Kaiba Dome)
- **Câmera:** Câmera esportiva de duelo (Pitch 42°, FOV 40°).
- **Ambiente:** Arena futurista de alta tecnologia com piso holográfico escuro reflexivo, linhas de fluxo de energia quântica percorrendo o grid em neon magenta e ciano, pilares laser translúcidos e iluminação cibernética.
- **Grade & Bases:** Grade luminescente de alta precisão; geradores de campo de força com colunas de plasma nas bases; obstáculos facetados em polímero e cristal óptico.

### Opção C — Templo Arcaico Milenar (Millennium Archaic Temple)
- **Câmera:** Visão elevada panorâmica de alto comando (Pitch 42°, FOV 40°).
- **Ambiente:** Templo do Egito Antigo esculpido em arenito dourado maciço com canais de ouro derretido, obeliscos cerimoniais com hieróglifos ancestrais e iluminação solar zenital dramática.
- **Grade & Bases:** Incrustações em ouro escovado gravadas na pedra milenar; bases como templos de latão e ouro arquitetônico.

---

## 3. Disposição Tática no Palco 3D

Para garantir visibilidade cristalina dos efeitos:
- **Corredor Central de Duelo:** O duelo ocorre na linha central ($Z=8.5$), entre a vanguarda aliada em $(13.5, 1.1, 8.5)$ e a vanguarda inimiga em $(18.5, 1.1, 8.5)$. Esse corredor é desobstruído por obstáculos (localizados em $Z=4$ e $Z=12$), permitindo que a câmera central enquadre a trajetória completa da magia do início ao impacto frontal.
- **Flancos Estratégicos:**
  - Aliados: Guerreiro da Terra na vanguarda $(13, 8)$, Maga do Fogo no flanco norte $(10, 7)$, Harpia do Vento no flanco sul $(10, 9)$.
  - Inimigos: Guardião Espectral na vanguarda $(18, 8)$, Serpente da Água no flanco norte $(21, 7)$, Dragão da Luz no flanco sul $(21, 9)$.
- Todas as 6 miniaturas 3D repousam sobre pedestais táteis com anéis luminosos de time (azul para aliados, vermelho para inimigos) e malhas poliédricas coloridas com elevação vertical.

---

## 4. Controles Analíticos do Executável

- **Seletor de Estilo:** `[A] Coliseu Sagrado`, `[B] Arena Cibernética`, `[C] Templo Arcaico`;
- **Seletor de Efeitos Elementais:** `🔥 FOGO`, `💧 ÁGUA`, `🌍 TERRA`, `🌪️ VENTO`, `☀️ LUZ` e `🌑 TREVAS`;
- **Presets de Câmera:** `[Visão Geral 31×17]`, `[Base Aliada]`, `[Centro]`, `[Base Inimiga]`;
- **Navegação com Mouse/Touch:**
  - *Arrastar Botão Esquerdo:* Rotação orbital suave (Yaw e Pitch amortecidos com trava de solo);
  - *Arrastar Botão Direito (ou Shift + Botão Esquerdo):* Translação/Pan pelo plano $XZ$;
  - *Roda do Mouse (Wheel):* Zoom contínuo suave;
- **Ações Táticas:**
  - `[Alcance de Movimento]` (`M`): Destaque 3D do raio de locomoção tática da unidade ativa;
  - `[Disparar Golpe]` (`Espaço`): Dispara o golpe elemental ativo no corredor central;
  - `[3D / 2D]` (`V`): Alterna instantaneamente entre perspectiva 3D e câmera ortográfica 2D top-down;
  - `[Reset Câmera]` (`R`): Restaura o enquadramento isométrico padrão.
