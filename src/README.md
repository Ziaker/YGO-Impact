# Núcleo e implementação

A implementação do jogo ficará sob `src/` quando o primeiro módulo executável for iniciado.

Contrato arquitetural já definido pelo GDD:

- um único núcleo autoritativo controla regras e estado;
- simulação fixa a 20 Hz (50 ms por passo lógico);
- interface, renderização, animação, IA e telemetria não alteram diretamente o estado;
- humanos e IA enviam comandos pela mesma interface pública;
- aleatoriedade usa seed e fluxos registrados;
- lógica autoritativa usa inteiros ou ponto fixo;
- replay, headless e web devem produzir resultados e hashes equivalentes para as mesmas entradas.

Subdiretórios de implementação só devem ser criados quando houver código real para eles.
