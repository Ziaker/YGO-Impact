import {
  WebGameSession,
  type AIType,
} from "./client.ts";
import {
  verifyReplay,
  type MonsterState,
  type Position,
  type ReplayFile,
} from "../core/index.ts";

const TILE_SIZE = 36;
const COLS = 31;
const ROWS = 17;

class WebGameApp {
  private session: WebGameSession;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = window.devicePixelRatio || 1;

  // Selected state
  private selectedUnitId: string | null = null;
  private selectedCardInstanceId: string | null = null;

  constructor() {
    this.session = new WebGameSession({
      seed: `impact-${Date.now()}`,
      aiType: "tactical",
      player1Name: "Jogador Humano",
      aiName: "IA Tática",
    });

    const canvasElem = document.getElementById("tactical-canvas") as HTMLCanvasElement | null;
    if (!canvasElem) throw new Error("tactical-canvas element not found");
    this.canvas = canvasElem;

    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("2D context not available");
    this.ctx = context;

    this.initCanvas();
    this.bindEvents();
    this.syncUI();
  }

  private initCanvas(): void {
    const width = COLS * TILE_SIZE;
    const height = ROWS * TILE_SIZE;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(this.dpr, this.dpr);
  }

  private bindEvents(): void {
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));

    // End participation button
    const endTurnBtn = document.getElementById("btn-end-turn");
    endTurnBtn?.addEventListener("click", () => {
      this.session.endParticipation();
      this.selectedUnitId = null;
      this.selectedCardInstanceId = null;
      this.syncUI();
    });

    // Pass priority button
    const passPriorityBtn = document.getElementById("btn-pass-priority");
    passPriorityBtn?.addEventListener("click", () => {
      const window = this.session.state.chainWindows[0];
      if (window) {
        this.session.passPriority(window.chainId);
        this.syncUI();
      }
    });

    // Toggle battle position button
    const togglePosBtn = document.getElementById("btn-toggle-position");
    togglePosBtn?.addEventListener("click", () => {
      if (this.selectedUnitId) {
        this.session.changeBattlePosition(this.selectedUnitId);
        this.syncUI();
      }
    });

    // Export Replay button
    const exportReplayBtn = document.getElementById("btn-export-replay");
    exportReplayBtn?.addEventListener("click", () => this.downloadReplay());

    // Restart match button
    const restartBtn = document.getElementById("btn-restart");
    restartBtn?.addEventListener("click", () => this.restartMatch());

    // Modal forms
    const formDecision = document.getElementById("form-decision") as HTMLFormElement | null;
    formDecision?.addEventListener("submit", (e) => {
      e.preventDefault();
      const actionsInput = document.getElementById("slider-actions") as HTMLInputElement | null;
      const reactionsInput = document.getElementById("slider-reactions") as HTMLInputElement | null;
      const actions = parseInt(actionsInput?.value ?? "5", 10);
      const reactions = parseInt(reactionsInput?.value ?? "3", 10);

      this.session.allocateHumanResources(actions, reactions);
      (document.getElementById("modal-decision") as HTMLDialogElement | null)?.close();
      this.syncUI();
    });

    // Sliders sync for decision phase (Actions + Reactions = 8)
    const sliderActions = document.getElementById("slider-actions") as HTMLInputElement | null;
    const sliderReactions = document.getElementById("slider-reactions") as HTMLInputElement | null;
    const actionsValueSpan = document.getElementById("val-actions");
    const reactionsValueSpan = document.getElementById("val-reactions");

    sliderActions?.addEventListener("input", () => {
      const actions = parseInt(sliderActions.value, 10);
      const reactions = 8 - actions;
      if (sliderReactions) sliderReactions.value = String(reactions);
      if (actionsValueSpan) actionsValueSpan.textContent = String(actions);
      if (reactionsValueSpan) reactionsValueSpan.textContent = String(reactions);
    });

    sliderReactions?.addEventListener("input", () => {
      const reactions = parseInt(sliderReactions.value, 10);
      const actions = 8 - reactions;
      if (sliderActions) sliderActions.value = String(actions);
      if (actionsValueSpan) actionsValueSpan.textContent = String(actions);
      if (reactionsValueSpan) reactionsValueSpan.textContent = String(reactions);
    });

    // Draw phase modal buttons
    const btnDraw2M = document.getElementById("btn-draw-2m");
    btnDraw2M?.addEventListener("click", () => {
      this.session.chooseHumanDrawMode("two_monsters");
      (document.getElementById("modal-draw") as HTMLDialogElement | null)?.close();
      this.syncUI();
    });

    const btnDraw1M1ST = document.getElementById("btn-draw-1m1st");
    btnDraw1M1ST?.addEventListener("click", () => {
      this.session.chooseHumanDrawMode("one_each");
      (document.getElementById("modal-draw") as HTMLDialogElement | null)?.close();
      this.syncUI();
    });

    const btnDraw2ST = document.getElementById("btn-draw-2st");
    btnDraw2ST?.addEventListener("click", () => {
      this.session.chooseHumanDrawMode("two_spell_traps");
      (document.getElementById("modal-draw") as HTMLDialogElement | null)?.close();
      this.syncUI();
    });

    // Game over download replay button
    const btnGameOverReplay = document.getElementById("btn-game-over-replay");
    btnGameOverReplay?.addEventListener("click", () => this.downloadReplay());
  }

  private restartMatch(): void {
    const aiSelect = document.getElementById("select-ai-type") as HTMLSelectElement | null;
    const aiType = (aiSelect?.value as AIType) ?? "tactical";

    this.session = new WebGameSession({
      seed: `impact-${Date.now()}`,
      aiType,
      player1Name: "Jogador Humano",
      aiName: aiType === "aggressive" ? "IA Agressiva" : aiType === "defensive" ? "IA Defensiva" : "IA Tática",
    });

    this.selectedUnitId = null;
    this.selectedCardInstanceId = null;
    this.syncUI();
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width * this.dpr);
    const scaleY = this.canvas.height / (rect.height * this.dpr);

    const clientX = (e.clientX - rect.left) * scaleX;
    const clientY = (e.clientY - rect.top) * scaleY;

    const tileX = Math.floor(clientX / TILE_SIZE);
    const tileY = Math.floor(clientY / TILE_SIZE);

    if (tileX < 0 || tileX >= COLS || tileY < 0 || tileY >= ROWS) return;
    const clickedPos: Position = { x: tileX, y: tileY };

    // 1. If a hand monster is selected -> attempt Normal Summon on legal tile
    if (this.selectedCardInstanceId) {
      const cardState = this.session.getHumanPlayerCardState();
      const card = cardState?.hand.find((c) => c.instanceId === this.selectedCardInstanceId);
      if (card && card.kind === "normal_monster") {
        // If clicking on an allied monster, toggle/set it as explicit anchor
        const alliedMonster = this.session.getHumanMonsters().find(
          (m) => m.position.x === tileX && m.position.y === tileY,
        );
        if (alliedMonster) {
          this.selectedUnitId = alliedMonster.unitId;
          this.syncUI();
          return;
        }

        const legalDestinations = this.session.getLegalSummonTiles(this.selectedUnitId);
        const isLegal = legalDestinations.some((p) => p.x === tileX && p.y === tileY);
        if (isLegal) {
          const resolvedAnchor = this.session.findAnchorForDestination(clickedPos, this.selectedUnitId);
          this.session.summonHumanMonster(card.instanceId, clickedPos, resolvedAnchor, "attack");
          this.selectedCardInstanceId = null;
          this.selectedUnitId = null;
          this.syncUI();
          return;
        }
      }

      // 2. If a hand equip spell is selected -> attempt Equip on clicked allied monster
      if (card && card.kind === "spell") {
        const targetMonster = this.session.getHumanMonsters().find(
          (m) => m.position.x === tileX && m.position.y === tileY,
        );
        if (targetMonster) {
          this.session.equipSpell(card.instanceId, targetMonster.unitId);
          this.selectedCardInstanceId = null;
          this.syncUI();
          return;
        }
      }
    }

    // 3. If an allied unit is already selected:
    if (this.selectedUnitId) {
      const selectedMonster = this.session.getHumanMonsters().find((m) => m.unitId === this.selectedUnitId);
      if (selectedMonster) {
        // A) Movement to reachable tile
        const reachableTiles = this.session.getReachableTilesForUnit(this.selectedUnitId);
        const isReachable = reachableTiles.some((p) => p.x === tileX && p.y === tileY);
        if (isReachable) {
          this.session.moveHumanMonster(this.selectedUnitId, [clickedPos]);
          this.syncUI();
          return;
        }

        // B) Attack against enemy target in range
        const attackableTargets = this.session.getAttackableTargetsForUnit(this.selectedUnitId);
        const target = attackableTargets.find((t) => t.position.x === tileX && t.position.y === tileY);
        if (target) {
          if (target.kind === "monster") {
            this.session.declareBasicAttack(this.selectedUnitId, target.targetId);
          } else {
            this.session.declareBaseAttack(this.selectedUnitId, target.targetId);
          }
          this.syncUI();
          return;
        }
      }
    }

    // 4. Select allied monster or visible enemy on clicked tile
    const clickedAllied = this.session.getHumanMonsters().find(
      (m) => m.position.x === tileX && m.position.y === tileY,
    );
    if (clickedAllied) {
      this.selectedUnitId = clickedAllied.unitId;
      this.selectedCardInstanceId = null;
      this.syncUI();
      return;
    }

    const clickedEnemy = this.session.getVisibleEnemyMonsters().find(
      (m) => m.position.x === tileX && m.position.y === tileY,
    );
    if (clickedEnemy) {
      this.selectedUnitId = clickedEnemy.unitId;
      this.selectedCardInstanceId = null;
      this.syncUI();
      return;
    }

    // 5. Deselect if clicking empty terrain
    this.selectedUnitId = null;
    this.selectedCardInstanceId = null;
    this.syncUI();
  }

  private syncUI(): void {
    this.renderBoard();
    this.renderHUD();
    this.renderHand();
    this.renderTrapSlots();
    this.renderEventLog();
    this.renderInspector();
    this.checkModals();
  }

  private renderBoard(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);

    const visibleTiles = this.session.getHumanVisibleTiles();
    const visibleSet = new Set(visibleTiles.map((p) => `${p.x},${p.y}`));

    const reachableTiles = this.selectedUnitId
      ? this.session.getReachableTilesForUnit(this.selectedUnitId)
      : [];
    const reachableSet = new Set(reachableTiles.map((p) => `${p.x},${p.y}`));

    const attackableTargets = this.selectedUnitId
      ? this.session.getAttackableTargetsForUnit(this.selectedUnitId)
      : [];
    const attackableSet = new Set(attackableTargets.map((t) => `${t.position.x},${t.position.y}`));

    const legalSummonTiles = this.selectedCardInstanceId
      ? this.session.getLegalSummonTiles(this.selectedUnitId)
      : [];
    const legalSummonSet = new Set(legalSummonTiles.map((p) => `${p.x},${p.y}`));

    const spatial = this.session.state.spatial;
    const humanMonsters = this.session.getHumanMonsters();
    const visibleEnemies = this.session.getVisibleEnemyMonsters();

    // 1. Draw Grid Tiles and Terrain
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        const key = `${x},${y}`;
        const isVisible = visibleSet.has(key);

        // Terrain color
        const terrain = this.session.getTerrain({ x, y });
        let bgColor = "#1e293b"; // plain
        if (terrain === "rough") bgColor = "#143823";
        else if (terrain === "impassable") bgColor = "#38291a";

        ctx.fillStyle = bgColor;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // Tile border
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

        // Overlays
        if (reachableSet.has(key)) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        if (legalSummonSet.has(key)) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (attackableSet.has(key)) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }

        // Fog of War shroud (if tile not visible)
        if (!isVisible) {
          ctx.fillStyle = "rgba(7, 10, 18, 0.88)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // subtle diagonal hatch
          ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
          ctx.stroke();
        }
      }
    }

    // 2. Draw Bases
    if (spatial) {
      for (const base of spatial.bases) {
        const isHuman = base.playerId === this.session.player1Id;
        const px = base.position.x * TILE_SIZE;
        const py = base.position.y * TILE_SIZE;

        ctx.fillStyle = isHuman ? "#1d4ed8" : "#b91c1c";
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.strokeStyle = isHuman ? "#60a5fa" : "#f87171";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(isHuman ? "BASE" : "IA", px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 3);
      }
    }

    // 3. Draw Monsters
    const drawMonster = (m: MonsterState, isAllied: boolean) => {
      const px = m.position.x * TILE_SIZE;
      const py = m.position.y * TILE_SIZE;
      const isSelected = m.unitId === this.selectedUnitId;

      // Base badge
      ctx.fillStyle = isAllied ? "#0284c7" : "#dc2626";
      ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      // Battle position border
      ctx.strokeStyle = m.battlePosition === "attack" ? "#fbbf24" : "#94a3b8";
      ctx.lineWidth = m.battlePosition === "attack" ? 2 : 3;
      ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

      // Selected ring
      if (isSelected) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }

      // Stats label: ATK/DEF
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${m.atk}/${m.def}`, px + TILE_SIZE / 2, py + 16);

      // Small battle pos icon
      ctx.font = "8px sans-serif";
      const icon = m.battlePosition === "attack" ? "⚔" : "🛡";
      ctx.fillText(`${icon} ${m.spd.current}`, px + TILE_SIZE / 2, py + 27);
    };

    for (const m of humanMonsters) {
      drawMonster(m, true);
    }
    for (const m of visibleEnemies) {
      drawMonster(m, false);
    }
  }

  private renderHUD(): void {
    const turn = this.session.state.turn;
    const humanPlayer = turn.players.find((p) => p.playerId === this.session.player1Id);
    const aiPlayer = turn.players.find((p) => p.playerId === this.session.aiPlayerId);

    // Turn & Phase
    const turnBadge = document.getElementById("hud-turn-number");
    if (turnBadge) turnBadge.textContent = `Turno ${turn.turnNumber}`;

    const phaseBadge = document.getElementById("hud-phase");
    if (phaseBadge) {
      const phaseNames: Record<string, string> = {
        draw: "Compra",
        support: "Suporte",
        decision: "Decisão",
        action: "Ação",
        end: "Fim",
      };
      phaseBadge.textContent = phaseNames[turn.phase] ?? turn.phase;
    }

    // Priority Token
    const priorityBadge = document.getElementById("hud-priority");
    if (priorityBadge) {
      const holder = this.session.state.priorityToken.holderPlayerId;
      const isHuman = holder === this.session.player1Id;
      priorityBadge.textContent = isHuman ? "Prioridade: Jogador" : "Prioridade: IA";
      priorityBadge.className = isHuman ? "badge badge-primary" : "badge badge-danger";
    }

    // Resources
    const actionsCount = document.getElementById("count-actions");
    if (actionsCount) {
      actionsCount.textContent = String(humanPlayer?.remaining?.actions ?? 0);
    }

    const reactionsCount = document.getElementById("count-reactions");
    if (reactionsCount) {
      reactionsCount.textContent = String(humanPlayer?.remaining?.reactions ?? 0);
    }

    // End Turn Button state
    const endTurnBtn = document.getElementById("btn-end-turn") as HTMLButtonElement | null;
    if (endTurnBtn) {
      const canEnd = turn.phase === "action" && !humanPlayer?.participationEnded;
      endTurnBtn.disabled = !canEnd;
    }

    // Pass Priority Button state
    const passPriorityBtn = document.getElementById("btn-pass-priority") as HTMLButtonElement | null;
    if (passPriorityBtn) {
      const window = this.session.state.chainWindows[0];
      const hasPriority = window && window.priorityPlayerId === this.session.player1Id;
      passPriorityBtn.style.display = hasPriority ? "inline-block" : "none";
    }
  }

  private renderHand(): void {
    const handContainer = document.getElementById("hand-cards-list");
    if (!handContainer) return;
    handContainer.innerHTML = "";

    const cardState = this.session.getHumanPlayerCardState();
    if (!cardState) return;

    for (const card of cardState.hand) {
      const def = this.session.getCardDefinition(card.definitionId);
      const isSelected = card.instanceId === this.selectedCardInstanceId;

      const cardEl = document.createElement("div");
      cardEl.className = `card-item ${card.kind} ${isSelected ? "selected" : ""}`;

      if (card.kind === "normal_monster") {
        const mDef = def as import("../core/index.ts").MonsterDefinition | null;
        cardEl.innerHTML = `
          <div class="card-header">
            <span class="card-name">${card.name}</span>
            <span class="card-level">★${mDef?.level ?? 4}</span>
          </div>
          <div class="card-body">
            <div class="card-stats">ATK ${mDef?.printedAtk ?? 0} | DEF ${mDef?.printedDef ?? 0}</div>
            <div class="card-extra">SPD ${mDef?.printedSpd ?? 2} | VIS ${mDef?.printedVis ?? 3}</div>
            ${mDef?.keywords && mDef.keywords.length > 0 ? `<div class="card-keywords">${mDef.keywords.join(", ")}</div>` : ""}
          </div>
        `;
      } else if (card.kind === "spell") {
        const sDef = def as import("../core/index.ts").SpellTrapDefinition | null;
        cardEl.innerHTML = `
          <div class="card-header">
            <span class="card-name">${card.name}</span>
            <span class="card-badge spell-badge">${sDef?.subtype ?? "normal"}</span>
          </div>
          <div class="card-body">
            <div class="card-cost">Custo: ${sDef?.actionCost ?? 1} Ação</div>
            <div class="card-desc">${sDef?.description ?? ""}</div>
          </div>
        `;
      } else if (card.kind === "trap") {
        const tDef = def as import("../core/index.ts").SpellTrapDefinition | null;
        cardEl.innerHTML = `
          <div class="card-header">
            <span class="card-name">${card.name}</span>
            <span class="card-badge trap-badge">${tDef?.subtype ?? "normal"}</span>
          </div>
          <div class="card-body">
            <div class="card-cost">Custo: 0 (Preparar)</div>
            <div class="card-desc">${tDef?.description ?? "Ativa em Reação"}</div>
          </div>
        `;
      }

      cardEl.addEventListener("click", () => {
        if (this.selectedCardInstanceId === card.instanceId) {
          this.selectedCardInstanceId = null;
        } else {
          this.selectedCardInstanceId = card.instanceId;
          // Keep selectedUnitId if it's an allied monster anchor
          const isAlliedUnit = this.session.getHumanMonsters().some((m) => m.unitId === this.selectedUnitId);
          if (!isAlliedUnit) {
            this.selectedUnitId = null;
          }
        }
        this.syncUI();
      });

      handContainer.appendChild(cardEl);
    }
  }

  private renderTrapSlots(): void {
    const slotsContainer = document.getElementById("trap-slots-list");
    if (!slotsContainer) return;
    slotsContainer.innerHTML = "";

    const trapSlotsState = this.session.state.trapSlots?.find((p) => p.playerId === this.session.player1Id);
    const selectedCard = this.selectedCardInstanceId
      ? this.session.getHumanPlayerCardState()?.hand.find((c) => c.instanceId === this.selectedCardInstanceId)
      : null;

    for (let slotIndex = 0; slotIndex < 3; slotIndex += 1) {
      const slot = trapSlotsState?.slots[slotIndex];
      const slotEl = document.createElement("div");
      slotEl.className = "trap-slot-item";

      if (slot && slot.card !== null) {
        slotEl.innerHTML = `
          <div class="slot-badge">Slot ${slotIndex + 1}</div>
          <div class="slot-occupied">🛡 Armadilha Armada</div>
          <div class="slot-card-name">${slot.card.name}</div>
        `;

        // If open chain window, show activate button
        const chainWindow = this.session.state.chainWindows[0];
        if (chainWindow && chainWindow.priorityPlayerId === this.session.player1Id) {
          const actBtn = document.createElement("button");
          actBtn.className = "btn btn-xs btn-warning";
          actBtn.textContent = "Ativar";
          actBtn.addEventListener("click", () => {
            this.session.activateTrap(slotIndex, chainWindow.chainId);
            this.syncUI();
          });
          slotEl.appendChild(actBtn);
        }
      } else {
        slotEl.innerHTML = `
          <div class="slot-badge">Slot ${slotIndex + 1}</div>
          <div class="slot-empty">Vazio</div>
        `;

        if (selectedCard && selectedCard.kind === "trap") {
          const setBtn = document.createElement("button");
          setBtn.className = "btn btn-xs btn-primary";
          setBtn.textContent = "Armar (0 Ações)";
          setBtn.addEventListener("click", () => {
            this.session.setTrap(selectedCard.instanceId, slotIndex);
            this.selectedCardInstanceId = null;
            this.syncUI();
          });
          slotEl.appendChild(setBtn);
        }
      }

      slotsContainer.appendChild(slotEl);
    }
  }

  private renderInspector(): void {
    const inspectorContent = document.getElementById("inspector-content");
    const togglePosBtn = document.getElementById("btn-toggle-position") as HTMLButtonElement | null;
    if (!inspectorContent) return;

    if (!this.selectedUnitId) {
      inspectorContent.innerHTML = `<div class="text-muted">Selecione uma unidade no tabuleiro ou uma carta na mão para inspecionar.</div>`;
      if (togglePosBtn) togglePosBtn.style.display = "none";
      return;
    }

    const unit = this.session.state.monsters.find((m) => m.unitId === this.selectedUnitId);
    if (!unit) {
      inspectorContent.innerHTML = `<div class="text-muted">Unidade não encontrada.</div>`;
      if (togglePosBtn) togglePosBtn.style.display = "none";
      return;
    }

    const isAllied = unit.ownerPlayerId === this.session.player1Id;
    const def = this.session.getCardDefinition(unit.definitionId);
    const mDef = def as import("../core/index.ts").MonsterDefinition | null;

    inspectorContent.innerHTML = `
      <div class="inspector-card">
        <h3 class="inspector-title ${isAllied ? "text-primary" : "text-danger"}">
          ${unit.name} ${isAllied ? "(Aliado)" : "(Inimigo)"}
        </h3>
        <div class="inspector-grid">
          <div><strong>Posição:</strong> (${unit.position.x}, ${unit.position.y})</div>
          <div><strong>Modo:</strong> ${unit.battlePosition === "attack" ? "Ataque ⚔" : "Defesa 🛡"}</div>
          <div><strong>ATK:</strong> ${unit.atk}</div>
          <div><strong>DEF:</strong> ${unit.def}</div>
          <div><strong>SPD:</strong> ${unit.spd.current} / ${unit.spd.maximum}</div>
          <div><strong>VIS:</strong> ${unit.vis}</div>
          <div><strong>HP:</strong> ${unit.hp.current} / ${unit.hp.maximum}</div>
          <div><strong>MP:</strong> ${unit.mp.current} / ${unit.mp.maximum}</div>
        </div>
        ${mDef?.keywords && mDef.keywords.length > 0 ? `<div class="inspector-keywords"><strong>Habilidades:</strong> ${mDef.keywords.join(", ")}</div>` : ""}
        ${mDef?.description ? `<div class="inspector-desc">${mDef.description}</div>` : ""}
      </div>
    `;

    if (togglePosBtn) {
      togglePosBtn.style.display = isAllied ? "inline-block" : "none";
      togglePosBtn.textContent = `Mudar Posição para ${unit.battlePosition === "attack" ? "Defesa 🛡" : "Ataque ⚔"}`;
    }
  }

  private renderEventLog(): void {
    const logContainer = document.getElementById("event-log-list");
    if (!logContainer) return;
    logContainer.innerHTML = "";

    for (const msg of this.session.eventLog) {
      const li = document.createElement("li");
      li.className = "log-item";
      if (msg.includes("rejeitado")) li.className += " log-rejected";
      if (msg.includes("summon")) li.className += " log-summon";
      if (msg.includes("battle") || msg.includes("ataque")) li.className += " log-battle";
      li.textContent = msg;
      logContainer.appendChild(li);
    }
  }

  private checkModals(): void {
    const state = this.session.state;

    // 1. Draw Phase Modal (Turn >= 2)
    const modalDraw = document.getElementById("modal-draw") as HTMLDialogElement | null;
    if (state.turn.phase === "draw" && state.turn.turnNumber >= 2) {
      const humanChose = state.pendingDrawModes.some((m) => m.playerId === this.session.player1Id);
      if (!humanChose && modalDraw && !modalDraw.open) {
        modalDraw.showModal();
      }
    } else if (modalDraw && modalDraw.open) {
      modalDraw.close();
    }

    // 2. Decision Phase Modal
    const modalDecision = document.getElementById("modal-decision") as HTMLDialogElement | null;
    if (state.turn.phase === "decision") {
      const humanPlayer = state.turn.players.find((p) => p.playerId === this.session.player1Id);
      if (humanPlayer && humanPlayer.allocation === null && modalDecision && !modalDecision.open) {
        modalDecision.showModal();
      }
    } else if (modalDecision && modalDecision.open) {
      modalDecision.close();
    }

    // 3. Match Finished Modal
    const modalGameOver = document.getElementById("modal-game-over") as HTMLDialogElement | null;
    if (state.match.status === "finished") {
      if (modalGameOver && !modalGameOver.open) {
        const title = document.getElementById("game-over-title");
        const reason = document.getElementById("game-over-reason");
        const winner = state.match.winnerPlayerId;
        const isHumanWinner = winner === this.session.player1Id;

        if (title) {
          title.textContent = isHumanWinner ? "Vitória!" : "Derrota!";
          title.className = isHumanWinner ? "text-success" : "text-danger";
        }
        if (reason) {
          reason.textContent = `Vencedor: ${winner ?? "Empate"} | Motivo: ${state.match.endReason ?? "finalizado"}`;
        }
        modalGameOver.showModal();
      }
    }
  }

  private downloadReplay(): void {
    const replay = this.session.exportReplay();
    const verification = verifyReplay(replay, this.session.stepHashes);

    const jsonStr = JSON.stringify(replay, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `replay_${replay.seed}_passos_${replay.endStep}_${verification.matches ? "verificado" : "divergente"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Bootstrap on DOM ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    new WebGameApp();
  });
}
