import {
  advanceStep,
  calculateSharedVisibility,
  createAggressiveAI,
  createBaseAttackPlan,
  createBasicAttackPlan,
  createDefaultPlayerSetup,
  createDefensiveAI,
  createGameEngine,
  createReplayFile,
  createTacticalAI,
  createTerrainLookup,
  CURATED_SPELL_TRAP_DEFINITIONS,
  deepFreeze,
  enqueueCommand,
  findNormalSummonDestinations,
  findSpellTrapDefinition,
  hasKeyword,
  isInBounds,
  orthogonalDistance,
  positionKey,
  PROTOTYPE_NORMAL_MONSTERS,
  resolveBasicMovement,
  type BasePlacement,
  type CardInstance,
  type CommandInput,
  type CoreEngine,
  type CoreEvent,
  type DrawMode,
  type HeadlessPolicy,
  type JsonValue,
  type MonsterBattlePosition,
  type MonsterDefinition,
  type MonsterState,
  type PlayerSetupInput,
  type Position,
  type ReplayFile,
  type ReplayGameSetup,
  type SimulationState,
  type SpellTrapDefinition,
  type TerrainKind,
  type TerrainTile,
} from "../core/index.ts";

export type AIType = "tactical" | "aggressive" | "defensive";

export interface WebGameSessionOptions {
  readonly seed?: string;
  readonly aiType?: AIType;
  readonly player1Name?: string;
  readonly aiName?: string;
  readonly terrainTiles?: readonly TerrainTile[];
}

export interface SelectedUnitActionState {
  readonly selectedUnitId: string | null;
  readonly reachableTiles: readonly Position[];
  readonly attackableTargets: readonly {
    readonly kind: "monster" | "base";
    readonly targetId: string;
    readonly position: Position;
  }[];
}

export interface SelectedCardActionState {
  readonly selectedCardInstanceId: string | null;
  readonly summonTiles: readonly Position[];
  readonly eligibleEquipUnitIds: readonly string[];
}

/**
 * Stateful authoritative game session bridge between the CoreEngine,
 * the Adversary AI, and the Web UI.
 */
export class WebGameSession {
  private _engine: CoreEngine;
  private readonly _seed: string;
  private readonly _player1Id: string;
  private readonly _aiPlayerId: string;
  private readonly _aiPolicy: HeadlessPolicy;
  private readonly _playerSetups: readonly [PlayerSetupInput, PlayerSetupInput];
  private readonly _bases: readonly [BasePlacement, BasePlacement];
  private readonly _recordedCommands: (CommandInput & { readonly receivedAtStep: number })[] = [];
  private readonly _stepHashes: string[] = [];
  private readonly _eventLog: string[] = [];
  private readonly _terrainTiles: readonly TerrainTile[];
  private readonly _terrainMap: ReadonlyMap<string, TerrainTile>;

  // Interaction selections
  public selectedUnitId: string | null = null;
  public selectedCardInstanceId: string | null = null;
  public selectedAnchorUnitId: string | null = null;

  constructor(options: WebGameSessionOptions = {}) {
    this._seed = options.seed ?? `match-${Date.now()}`;
    this._player1Id = options.player1Name ?? "player1";
    this._aiPlayerId = options.aiName ?? "ai_player";
    this._terrainTiles = options.terrainTiles ?? [];

    const terrainMap = new Map<string, TerrainTile>();
    for (const tile of this._terrainTiles) {
      terrainMap.set(positionKey(tile.position), tile);
    }
    this._terrainMap = terrainMap;

    const aiType = options.aiType ?? "tactical";
    switch (aiType) {
      case "aggressive":
        this._aiPolicy = createAggressiveAI("AggressiveBot");
        break;
      case "defensive":
        this._aiPolicy = createDefensiveAI("DefensiveBot");
        break;
      case "tactical":
      default:
        this._aiPolicy = createTacticalAI("TacticalBot");
        break;
    }

    this._playerSetups = [
      createDefaultPlayerSetup(this._player1Id, 5),
      createDefaultPlayerSetup(this._aiPlayerId, 5),
    ];

    this._bases = [
      { playerId: this._player1Id, position: { x: 0, y: 8 } },
      { playerId: this._aiPlayerId, position: { x: 30, y: 8 } },
    ];

    this._engine = createGameEngine(
      this._seed,
      this._playerSetups,
      this._bases,
      PROTOTYPE_NORMAL_MONSTERS,
      [],
      [],
      CURATED_SPELL_TRAP_DEFINITIONS,
    );

    this._stepHashes.push(this._engine.stateHash);
    this._log(`Partida inicializada com semente "${this._seed}".`);
    this._log(`Jogador Humano (${this._player1Id}) vs IA (${this._aiPlayerId})`);

    // Auto-process initial draw if ready
    this._drainAutomatedActions();
  }

  public get state(): SimulationState {
    return this._engine.state;
  }

  public get engine(): CoreEngine {
    return this._engine;
  }

  public get player1Id(): string {
    return this._player1Id;
  }

  public get aiPlayerId(): string {
    return this._aiPlayerId;
  }

  public get eventLog(): readonly string[] {
    return this._eventLog;
  }

  public get stepHashes(): readonly string[] {
    return this._stepHashes;
  }

  private _log(message: string): void {
    this._eventLog.unshift(`[Passo ${this._engine.state.step}] ${message}`);
    if (this._eventLog.length > 100) {
      this._eventLog.pop();
    }
  }

  /**
   * Internal step executor: enqueues command, advances engine step, and logs events.
   * Does NOT trigger automated drain loop (preventing recursion).
   */
  private _stepCommand(issuer: string, kind: string, payload: Record<string, JsonValue> = {}): readonly CoreEvent[] {
    if (this._engine.state.match.status === "finished") return [];

    const input: CommandInput = { issuer, kind, payload };
    this._recordedCommands.push(deepFreeze({ ...input, receivedAtStep: this._engine.state.step }));
    this._engine = enqueueCommand(this._engine, input);

    const stepResult = advanceStep(this._engine);
    this._engine = stepResult.engine;
    this._stepHashes.push(this._engine.stateHash);

    // Process event messages
    for (const event of stepResult.events) {
      this._formatEvent(event);
    }

    return stepResult.events;
  }

  /**
   * Enqueues an authoritative command, advances the step, and drains subsequent automated phases/AI steps.
   */
  public executeCommand(issuer: string, kind: string, payload: Record<string, JsonValue> = {}): boolean {
    if (this._engine.state.match.status === "finished") return false;

    this._stepCommand(issuer, kind, payload);
    this._drainAutomatedActions();
    return true;
  }

  private _formatEvent(event: CoreEvent): void {
    switch (event.type) {
      case "command_accepted":
        this._log(`Comando aceito: ${event.kind} por ${event.issuer}`);
        break;
      case "command_rejected":
        this._log(`Comando rejeitado (${event.kind}): ${event.reason}`);
        break;
    }
  }

  /**
   * Drives automated phase resolutions and AI actions in an iterative loop.
   */
  private _drainAutomatedActions(): void {
    let iterations = 0;
    const maxIterations = 50;

    while (this._engine.state.match.status === "active" && iterations < maxIterations) {
      iterations += 1;
      const phase = this._engine.state.turn.phase;

      // 1. DRAW PHASE
      if (phase === "draw") {
        const aiChosen = this._engine.state.pendingDrawModes.some(
          (m) => m.playerId === this._aiPlayerId,
        );
        if (!aiChosen) {
          const aiContext = {
            playerId: this._aiPlayerId,
            opponentPlayerId: this._player1Id,
            engine: this._engine,
            turn: this._engine.state.turn,
            priorityToken: this._engine.state.priorityToken,
          };
          const mode = this._aiPolicy.chooseDrawMode
            ? this._aiPolicy.chooseDrawMode(aiContext)
            : "two_monsters";
          this._stepCommand(this._aiPlayerId, "cards.choose_draw_mode", { mode });
          continue;
        }

        if (this._engine.state.lastCompletedDrawTurn === this._engine.state.turn.turnNumber) {
          this._stepCommand("system", "turn.advance_completed_phase", {});
          continue;
        }

        // Waiting for human draw selection
        break;
      }

      // 2. SUPPORT PHASE
      if (phase === "support") {
        if (this._engine.state.lastCompletedSupportTurn !== this._engine.state.turn.turnNumber) {
          this._stepCommand("system", "support.resolve_recovery", {});
          continue;
        }
        if (this._engine.state.lastCompletedSupportTurn === this._engine.state.turn.turnNumber) {
          this._stepCommand("system", "turn.advance_completed_phase", {});
          continue;
        }
        break;
      }

      // 3. DECISION PHASE
      if (phase === "decision") {
        const aiPlayer = this._engine.state.turn.players.find(
          (p) => p.playerId === this._aiPlayerId,
        );
        if (aiPlayer && aiPlayer.allocation === null) {
          const aiContext = {
            playerId: this._aiPlayerId,
            opponentPlayerId: this._player1Id,
            engine: this._engine,
            turn: this._engine.state.turn,
            priorityToken: this._engine.state.priorityToken,
          };
          const alloc = this._aiPolicy.allocateResources
            ? this._aiPolicy.allocateResources(aiContext)
            : { actions: 5, reactions: 3 };
          this._stepCommand(this._aiPlayerId, "turn.allocate_resources", {
            actions: alloc.actions,
            reactions: alloc.reactions,
          });
          continue;
        }

        // Waiting for human allocation
        break;
      }

      // 4. ACTION PHASE
      if (phase === "action") {
        // If open chain windows exist
        if (this._engine.state.chainWindows.length > 0) {
          const window = this._engine.state.chainWindows[0]!;
          if (window.stage !== "closed") {
            if (window.priorityPlayerId === this._aiPlayerId) {
              const aiContext = {
                playerId: this._aiPlayerId,
                opponentPlayerId: this._player1Id,
                engine: this._engine,
                turn: this._engine.state.turn,
                priorityToken: this._engine.state.priorityToken,
              };
              const resp = this._aiPolicy.respondToChain
                ? this._aiPolicy.respondToChain(aiContext, window)
                : {
                    issuer: this._aiPlayerId,
                    kind: "chain.pass_priority",
                    payload: { chainId: window.chainId },
                  };
              this._stepCommand(
                resp.issuer,
                resp.kind,
                (resp.payload ?? {}) as Record<string, JsonValue>,
              );
              continue;
            }
            // Waiting for human chain reaction
            break;
          } else {
            this._stepCommand("system", "chain.resolve_next", {});
            continue;
          }
        }

        // Check active players
        const activePlayers = this._engine.state.turn.players.filter(
          (p) => !p.participationEnded,
        );
        if (activePlayers.length === 0) {
          break;
        }

        const aiPlayer = activePlayers.find((p) => p.playerId === this._aiPlayerId);
        const humanPlayer = activePlayers.find((p) => p.playerId === this._player1Id);

        // If AI is not active, AI cannot act - wait for human
        if (!aiPlayer) {
          break;
        }

        // If human is still active and holds priority token, give human the first opportunity
        const holderId = this._engine.state.priorityToken.holderPlayerId;
        if (humanPlayer && holderId === this._player1Id && !aiPlayer.participationEnded && humanPlayer.remaining && humanPlayer.remaining.actions > 0) {
          // Check if human has already taken an action or has priority
          // We wait for human input
          break;
        }

        // AI takes an action or ends participation
        const aiContext = {
          playerId: this._aiPlayerId,
          opponentPlayerId: this._player1Id,
          engine: this._engine,
          turn: this._engine.state.turn,
          priorityToken: this._engine.state.priorityToken,
        };
        const action = this._aiPolicy.takeAction
          ? this._aiPolicy.takeAction(aiContext)
          : null;
        if (action !== null) {
          const events = this._stepCommand(
            action.issuer,
            action.kind,
            (action.payload ?? {}) as Record<string, JsonValue>,
          );
          if (events.some((e) => e.type === "command_rejected")) {
            this._stepCommand(this._aiPlayerId, "turn.end_participation", {});
          }
          if (humanPlayer) {
            break;
          }
          continue;
        } else {
          this._stepCommand(this._aiPlayerId, "turn.end_participation", {});
          continue;
        }
      }

      // 5. END PHASE
      if (phase === "end") {
        this._stepCommand("system", "turn.advance_completed_phase", {});
        continue;
      }

      break;
    }
  }

  // --- HUMAN PLAYER ACTIONS ---

  public chooseHumanDrawMode(mode: DrawMode): boolean {
    if (this._engine.state.turn.phase !== "draw") return false;
    return this.executeCommand(this._player1Id, "cards.choose_draw_mode", { mode });
  }

  public allocateHumanResources(actions: number, reactions: number): boolean {
    if (this._engine.state.turn.phase !== "decision") return false;
    if (actions + reactions !== 8 || actions < 0 || reactions < 0) return false;
    return this.executeCommand(this._player1Id, "turn.allocate_resources", { actions, reactions });
  }

  public findAnchorForDestination(
    destination: Position,
    preferredAnchorUnitId: string | null = null,
  ): string | null {
    const spatial = this._engine.state.spatial;
    if (spatial === null) return null;
    const ownUnits = spatial.units.filter((u) => u.playerId === this._player1Id);
    if (ownUnits.length === 0) return null;

    if (preferredAnchorUnitId !== null && ownUnits.some((u) => u.unitId === preferredAnchorUnitId)) {
      const preferredTiles = this._queryAnchorDestinations(preferredAnchorUnitId);
      if (preferredTiles.some((p) => p.x === destination.x && p.y === destination.y)) {
        return preferredAnchorUnitId;
      }
    }

    for (const unit of ownUnits) {
      const unitTiles = this._queryAnchorDestinations(unit.unitId);
      if (unitTiles.some((p) => p.x === destination.x && p.y === destination.y)) {
        return unit.unitId;
      }
    }
    return null;
  }

  private _queryAnchorDestinations(anchorUnitId: string | null): readonly Position[] {
    const spatial = this._engine.state.spatial;
    if (spatial === null) return [];
    try {
      const destinations = findNormalSummonDestinations(
        spatial,
        this._player1Id,
        anchorUnitId,
        this.getHumanVisibleTiles(),
      );
      return destinations.positions;
    } catch {
      return [];
    }
  }

  public summonHumanMonster(
    cardInstanceId: string,
    destination: Position,
    anchorUnitId: string | null = null,
    battlePosition: MonsterBattlePosition = "attack",
  ): boolean {
    const spatial = this._engine.state.spatial;
    const ownUnits = spatial ? spatial.units.filter((m) => m.playerId === this._player1Id) : [];
    let effectiveAnchor = anchorUnitId;
    if (ownUnits.length > 0) {
      if (effectiveAnchor === null || !ownUnits.some((u) => u.unitId === effectiveAnchor)) {
        effectiveAnchor = this.findAnchorForDestination(destination, anchorUnitId);
      }
    } else {
      effectiveAnchor = null;
    }

    // Generate unique unitId that never collides with any existing or historic unit
    let candidateIndex = 1;
    let unitId = `${this._player1Id}:unit:${candidateIndex}`;
    const allExistingUnitIds = new Set(this._engine.state.monsters.map((m) => m.unitId));
    while (allExistingUnitIds.has(unitId)) {
      candidateIndex += 1;
      unitId = `${this._player1Id}:unit:${candidateIndex}`;
    }

    return this.executeCommand(this._player1Id, "summon.normal", {
      cardInstanceId,
      unitId,
      destination: destination as unknown as JsonValue,
      anchorUnitId: effectiveAnchor,
      battlePosition,
    });
  }

  public moveHumanMonster(unitId: string, path: readonly Position[]): boolean {
    return this.executeCommand(this._player1Id, "monster.move_basic", {
      unitId,
      path: path as unknown as JsonValue,
    });
  }

  public declareBasicAttack(attackerUnitId: string, defenderUnitId: string): boolean {
    return this.executeCommand(this._player1Id, "battle.declare_basic_attack", {
      attackerUnitId,
      defenderUnitId,
    });
  }

  public declareBaseAttack(attackerUnitId: string, defenderPlayerId: string): boolean {
    return this.executeCommand(this._player1Id, "battle.declare_base_attack", {
      attackerUnitId,
      defenderPlayerId,
    });
  }

  public changeBattlePosition(unitId: string): boolean {
    return this.executeCommand(this._player1Id, "monster.change_battle_position", { unitId });
  }

  public equipSpell(cardInstanceId: string, targetUnitId: string): boolean {
    return this.executeCommand(this._player1Id, "spell.equip", {
      cardInstanceId,
      targetUnitId,
    });
  }

  public setTrap(cardInstanceId: string, slotIndex: number): boolean {
    return this.executeCommand(this._player1Id, "trap.set", {
      cardInstanceId,
      slotIndex,
    });
  }

  public activateTrap(slotIndex: number, chainId: string, targetElementId?: string): boolean {
    const payload: Record<string, JsonValue> = { slotIndex, chainId };
    if (targetElementId !== undefined) {
      payload["targetElementId"] = targetElementId;
    }
    return this.executeCommand(this._player1Id, "trap.activate", payload);
  }

  public passPriority(chainId: string): boolean {
    return this.executeCommand(this._player1Id, "chain.pass_priority", { chainId });
  }

  public endParticipation(): boolean {
    const res = this.executeCommand(this._player1Id, "turn.end_participation", {});
    this.selectedUnitId = null;
    this.selectedCardInstanceId = null;
    return res;
  }

  // --- QUERY & ACTION EVALUATION HELPERS ---

  public getHumanVisibleTiles(): readonly Position[] {
    const spatial = this._engine.state.spatial;
    if (spatial === null) return [];
    return calculateSharedVisibility(this._engine.state.monsters, spatial, this._player1Id);
  }

  public isTileVisibleToHuman(pos: Position): boolean {
    const visibleTiles = this.getHumanVisibleTiles();
    const key = positionKey(pos);
    return visibleTiles.some((t) => positionKey(t) === key);
  }

  public getHumanPlayerCardState() {
    return this._engine.state.cardSetup?.players.find((p) => p.playerId === this._player1Id);
  }

  public getCardDefinition(definitionId: string): MonsterDefinition | SpellTrapDefinition | null {
    const catalog = this._engine.state.content;
    if (!catalog) return null;
    const monster = catalog.definitions.find((d) => d.definitionId === definitionId);
    if (monster) return monster;
    const st = catalog.spellTrapDefinitions?.find((d) => d.definitionId === definitionId);
    return st ?? null;
  }

  public getHumanMonsters(): readonly MonsterState[] {
    return this._engine.state.monsters.filter((m) => m.ownerPlayerId === this._player1Id);
  }

  public getVisibleEnemyMonsters(): readonly MonsterState[] {
    const visibleKeys = new Set(this.getHumanVisibleTiles().map(positionKey));
    return this._engine.state.monsters.filter(
      (m) => m.ownerPlayerId === this._aiPlayerId && visibleKeys.has(positionKey(m.position)),
    );
  }

  public getTerrain(pos: Position): TerrainKind {
    return this._terrainMap.get(positionKey(pos))?.kind ?? "plain";
  }

  public get terrainTiles(): readonly TerrainTile[] {
    return this._terrainTiles;
  }

  public getReachableTilesForUnit(unitId: string): readonly Position[] {
    const monster = this._engine.state.monsters.find((m) => m.unitId === unitId);
    const spatial = this._engine.state.spatial;
    if (monster === undefined || spatial === null || monster.spd.current <= 0) return [];

    const reachable: Position[] = [];
    const isGlider = hasKeyword(monster, "GLIDER");
    const terrainLookup = createTerrainLookup(this._terrainTiles);

    // Orthogonal neighbors
    const deltas = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const d of deltas) {
      const neighbor: Position = { x: monster.position.x + d.x, y: monster.position.y + d.y };
      if (isInBounds(neighbor)) {
        try {
          const moveRes = resolveBasicMovement(
            spatial,
            monster.unitId,
            monster.spd.current,
            [neighbor],
            { isGlider, terrainLookup },
          );
          if (moveRes.traversedPath.length > 0) {
            reachable.push(neighbor);
          }
        } catch {
          // Blocked
        }
      }
    }

    return reachable;
  }

  public getAttackableTargetsForUnit(unitId: string): readonly {
    readonly kind: "monster" | "base";
    readonly targetId: string;
    readonly position: Position;
  }[] {
    const monster = this._engine.state.monsters.find((m) => m.unitId === unitId);
    const spatial = this._engine.state.spatial;
    if (monster === undefined || spatial === null || monster.battlePosition !== "attack") return [];

    const targets: {
      readonly kind: "monster" | "base";
      readonly targetId: string;
      readonly position: Position;
    }[] = [];

    // Check enemy base
    const enemyBase = spatial.bases.find((b) => b.playerId === this._aiPlayerId);
    if (enemyBase && this.isTileVisibleToHuman(enemyBase.position)) {
      try {
        createBaseAttackPlan(monster, this._aiPlayerId, spatial, [], true);
        targets.push({ kind: "base", targetId: this._aiPlayerId, position: enemyBase.position });
      } catch {
        // Not in range
      }
    }

    // Check visible enemy monsters
    for (const enemy of this.getVisibleEnemyMonsters()) {
      try {
        createBasicAttackPlan(monster, enemy, spatial, [], true, false);
        targets.push({ kind: "monster", targetId: enemy.unitId, position: enemy.position });
      } catch {
        // Not in range
      }
    }

    return targets;
  }

  public getLegalSummonTiles(anchorUnitId: string | null = null): readonly Position[] {
    const spatial = this._engine.state.spatial;
    if (spatial === null) return [];
    const ownUnits = spatial.units.filter((u) => u.playerId === this._player1Id);
    if (ownUnits.length === 0) {
      return this._queryAnchorDestinations(null);
    }

    // If an explicit anchor is selected and valid, query it directly
    if (anchorUnitId !== null && ownUnits.some((u) => u.unitId === anchorUnitId)) {
      return this._queryAnchorDestinations(anchorUnitId);
    }

    // If no specific anchor is picked, return the union of legal destinations across ALL own units
    const allPositions: Position[] = [];
    const seen = new Set<string>();
    for (const unit of ownUnits) {
      const positions = this._queryAnchorDestinations(unit.unitId);
      for (const pos of positions) {
        const key = positionKey(pos);
        if (!seen.has(key)) {
          seen.add(key);
          allPositions.push(pos);
        }
      }
    }
    return deepFreeze(allPositions);
  }

  public exportReplay(): ReplayFile {
    const contentHash = this._engine.state.content?.contentHash;
    const gameSetup: ReplayGameSetup = {
      ...(contentHash !== undefined ? { contentHash } : {}),
      bases: this._bases,
      monsterDefinitions: PROTOTYPE_NORMAL_MONSTERS,
      ...(CURATED_SPELL_TRAP_DEFINITIONS.length > 0
        ? { spellTrapDefinitions: CURATED_SPELL_TRAP_DEFINITIONS }
        : {}),
    };

    return createReplayFile(
      this._seed,
      [this._player1Id, this._aiPlayerId],
      this._engine.state.step,
      this._recordedCommands,
      this._playerSetups,
      gameSetup,
    );
  }
}
