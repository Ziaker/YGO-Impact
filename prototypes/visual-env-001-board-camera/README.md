# Monster Impact — VIS-ENV-001 · Câmera 3D, Palco Visual & Assinatura Elemental (Alta Ambição)

Este diretório contém a reformulação de alta ambição do protótipo **VIS-ENV-001**, integrando a nova arquitetura de câmera 3D LookAt, três cenários monumentais e a demonstração interativa da **diferenciação de cores de golpes para cada um dos 6 elementos canônicos do GDD v0.43**.

---

## 1. Pergunta Central

> *"Qual deve ser a câmera 3D e o ambiente visual padrão de Monster Impact para que o jogo fique monumental, legível e agradável de usar na grade 31 × 17, e como as cores e assinaturas visuais dos 6 elementos canônicos devem diferenciar claramente os golpes no campo?"*

---

## 2. As Três Opções de Cenário e Câmera (`index.html`)

1. **Opção A — Coliseu Sagrado das Lâminas:**
   - Câmera isocilíndrica estabilizada (Pitch 38°, FOV 30°);
   - Platô de ardósia nobre com 4 pilares colossais nos cantos e tochas místicas acesas;
   - Bases em titânio e obstáculos em basalto chanfrado.
2. **Opção B — Arena Cibernética Solid Vision:**
   - Câmera esportiva de duelo (Pitch 42°, FOV 42°);
   - Piso holográfico futurista com feixes quânticos e fluxos neon ciano/magenta;
   - Bases com geradores de campo de força e pilares de projeção laser.
3. **Opção C — Templo Arcaico Milenar:**
   - Câmera panorâmica elevada de alto comando (Pitch 52°, FOV 36°);
   - Arenito dourado maciço, canais de ouro derretido e obeliscos cerimoniais com hieróglifos ancestrais.

---

## 3. Confirmação das Cores dos Golpes por Elemento (GDD v0.43)

No canto superior direito do protótipo, há um painel dedicado permitindo acionar os golpes de cada um dos 6 elementos:
- **🔥 FOGO:** Vermelho Carmesim (`#ef4444`) e Laranja Solar (`#f97316`) — Chamas incandescentes e brasas de impacto.
- **💧 ÁGUA:** Azul Safira (`#0ea5e9`) e Ciano Profundo (`#0284c7`) — Lança torrencial e vórtices aquáticos.
- **🌍 TERRA:** Âmbar Dourado (`#d97706`) e Marrom Basalto (`#b45309`) — Projétil tectônico e fissura sísmica.
- **🌪️ VENTO:** Verde Esmeralda (`#10b981`) e Jade (`#059669`) — Lâminas de vácuo translúcidas em espiral.
- **☀️ LUZ:** Amarelo Dourado (`#eab308`) e Branco Celestial (`#ffffff`) — Feixe solar radiante e clarão prismático.
- **🌑 TREVAS:** Roxo Violeta (`#a855f7`) e Púrpura Abissal (`#7e22ce`) — Vórtice abissal com relâmpagos espectrais.

---

## 4. Controles

- **Cenários:** Teclas `1`, `2`, `3` ou botões `[A]`, `[B]`, `[C]`.
- **Golpes Elementais:** Clique nos botões de elemento ou tecle `Espaço`.
- **Presets de Câmera:** `Visão Geral`, `Base Aliada`, `Centro`, `Base Inimiga`.
- **Navegação com Mouse:**
  - *Arrastar Botão Esquerdo:* Órbita suave sem capotamento.
  - *Arrastar Botão Direito / Shift:* Pan no plano do tabuleiro.
  - *Roda:* Zoom calibrado.
- **Outros:** `M` (alcance de movimento), `V` (alternar 2D/3D), `R` (resetar câmera).
