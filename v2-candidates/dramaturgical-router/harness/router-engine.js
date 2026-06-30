// @ts-check
/// <reference path="./router-types.d.ts" />

/* =============================================================
   Dramaturgical router candidate engine.

   Pure state transition code for issue #41. This deliberately has no DOM
   dependency and no dependency on the live game globals.
   ============================================================= */

(function(root) {
  'use strict';

  /** @type {RouterSurfaceKind[]} */
  var SURFACE_KINDS = ['policy', 'media', 'party', 'private', 'scandal', 'cabinet', 'liability', 'endgame', 'aftermath'];
  /** @type {RouterSurfacePresentation[]} */
  var SURFACE_PRESENTATIONS = ['single-choice', 'policy-hand', 'agenda-pair', 'aftermath', 'pick-two'];
  /** @type {RouterWeight[]} */
  var WEIGHTS = [0, 1, 2, 'follow'];
  /** @type {RouterTimingPhase[]} */
  var TIMING_PHASES = ['early', 'mid', 'late', 'final', 'any'];
  /** @type {string[]} */
  var TIMING_KEYS = ['phase', 'minPolicyCompletions', 'maxPolicyCompletions', 'minBeat', 'maxBeat'];

  /**
   * @param {RouterConfig} config
   * @param {string} scenarioId
   * @param {number} [seed]
   * @returns {RouterState}
   */
  function createInitialState(config, scenarioId, seed) {
    var scenario = getScenario(config, scenarioId);
    if (!scenario) throw new Error('Unknown scenario "' + scenarioId + '"');
    return {
      beat: 0,
      scenarioId: scenarioId,
      scenarioSpent: 0,
      meters: cloneMeters(config.startingMeters),
      hiddenAxes: cloneHidden(config.startingHiddenAxes),
      tags: { scenarioStart: true },
      recentTags: {},
      recentAxes: {},
      completedSurfaceIds: {},
      playedPolicyChoiceIds: {},
      queuedTimedEffects: [],
      queuedLiabilities: [],
      forcedSurfaceId: scenario.openingSurfaceId || null,
      lastKind: null,
      needsContextShift: false,
      postPolicyStarted: false,
      postPolicySurfaceCount: 0,
      seed: seed == null ? 123456789 : normalizeSeed(seed),
      deadMeter: null,
      history: []
    };
  }

  /**
   * @param {RouterConfig} config
   * @returns {RouterValidationResult}
   */
  function validateConfig(config) {
    /** @type {string[]} */
    var errors = [];
    /** @type {string[]} */
    var warnings = [];
    var meterKeys = setFrom(config.meters.map(function(m) { return m.key; }));
    var axisKeys = setFrom(config.hiddenAxes.map(function(a) { return a.key; }));
    /** @type {Record<string, RouterSurface>} */
    var surfaces = {};
    /** @type {Record<string, RouterScenario>} */
    var scenarios = {};

    config.scenarios.forEach(function(scenario) {
      if (scenarios[scenario.id]) errors.push('Duplicate scenario id "' + scenario.id + '"');
      scenarios[scenario.id] = scenario;
      if (!Number.isInteger(scenario.budget) || scenario.budget < 1) {
        errors.push(scenario.id + ': budget must be a positive integer');
      }
      if (scenario.targetPolicyCompletions != null && (!Number.isInteger(scenario.targetPolicyCompletions) || scenario.targetPolicyCompletions < 1)) {
        errors.push(scenario.id + ': targetPolicyCompletions must be a positive integer when set');
      }
      if (scenario.postPolicySurfaceLimit != null && (!Number.isInteger(scenario.postPolicySurfaceLimit) || scenario.postPolicySurfaceLimit < 0)) {
        errors.push(scenario.id + ': postPolicySurfaceLimit must be a non-negative integer when set');
      }
    });

    config.surfaces.forEach(function(surface) {
      if (surfaces[surface.id]) errors.push('Duplicate surface id "' + surface.id + '"');
      surfaces[surface.id] = surface;
      if (SURFACE_KINDS.indexOf(surface.kind) === -1) errors.push(surface.id + ': invalid kind "' + surface.kind + '"');
      if (SURFACE_PRESENTATIONS.indexOf(surface.presentation) === -1) errors.push(surface.id + ': invalid presentation "' + surface.presentation + '"');
      if (WEIGHTS.indexOf(surface.weight) === -1) errors.push(surface.id + ': invalid weight "' + surface.weight + '"');
      if (!surface.choices.length) errors.push(surface.id + ': must have at least one choice');
      (surface.scenarioIds || []).forEach(function(sid) {
        if (!scenarios[sid]) errors.push(surface.id + ': references unknown scenario "' + sid + '"');
      });
      validatePlacement(surface, errors);
      validateTiming(surface, errors);
      validatePressure(surface, meterKeys, axisKeys, errors);
      surface.choices.forEach(function(choice) {
        validateChoice(surface, choice, surfaces, meterKeys, axisKeys, errors);
      });
    });

    config.scenarios.forEach(function(scenario) {
      var hasPolicy = false;
      if (scenario.openingSurfaceId && !surfaces[scenario.openingSurfaceId]) {
        errors.push(scenario.id + ': openingSurfaceId references unknown surface "' + scenario.openingSurfaceId + '"');
      }
      scenario.surfaceIds.forEach(function(surfaceId) {
        var surface = surfaces[surfaceId];
        if (!surface) errors.push(scenario.id + ': references unknown surface "' + surfaceId + '"');
        else if (surface.kind === 'policy') hasPolicy = true;
      });
      if (!hasPolicy) warnings.push(scenario.id + ': scenario has no policy surface');
    });

    config.surfaces.forEach(function(surface) {
      surface.choices.forEach(function(choice) {
        (choice.liabilities || []).forEach(function(liability) {
          if (!surfaces[liability.surfaceId]) errors.push(surface.id + '/' + choice.id + ': liability references unknown surface "' + liability.surfaceId + '"');
        });
        if (choice.nextSurfaceId && !surfaces[choice.nextSurfaceId]) {
          errors.push(surface.id + '/' + choice.id + ': nextSurfaceId references unknown surface "' + choice.nextSurfaceId + '"');
        }
      });
    });

    return { errors: errors, warnings: warnings };
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {RouterCandidate[]}
   */
  function listCandidates(config, state) {
    var scenario = getScenario(config, state.scenarioId);
    if (!scenario || state.deadMeter) return [];
    var surfaceIds = setFrom(scenario.surfaceIds);
    /** @type {RouterCandidate[]} */
    var candidates = [];
    config.surfaces.forEach(function(surface) {
      if (!surfaceIds[surface.id]) return;
      var candidate = scoreCandidate(config, state, surface);
      if (!candidate.blocked) candidates.push(candidate);
    });
    candidates.sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.surface.id < b.surface.id ? -1 : a.surface.id > b.surface.id ? 1 : 0;
    });
    return candidates;
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {RouterCandidate|null}
   */
  function selectNextSurface(config, state) {
    var candidates = listCandidates(config, state);
    return candidates.length ? candidates[0] : null;
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {string} surfaceId
   * @returns {RouterChoiceAvailability[]}
   */
  function listChoices(config, state, surfaceId) {
    var surface = getSurface(config, surfaceId);
    if (!surface) throw new Error('Unknown surface "' + surfaceId + '"');
    return surface.choices.map(function(choice) {
      return getChoiceAvailability(state, surface, choice);
    });
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {string} surfaceId
   * @param {string} choiceId
   * @returns {RouterResolveResult}
   */
  function resolveChoice(config, state, surfaceId, choiceId) {
    var surface = getSurface(config, surfaceId);
    if (!surface) throw new Error('Unknown surface "' + surfaceId + '"');
    var choice = getChoice(surface, choiceId);
    if (!choice) throw new Error('Unknown choice "' + choiceId + '" for surface "' + surfaceId + '"');
    var availability = getChoiceAvailability(state, surface, choice);
    if (!availability.available) {
      throw new Error('Choice "' + choiceId + '" is locked: ' + availability.reasons.join(', '));
    }

    var next = cloneState(state);
    var wasPostPolicy = next.postPolicyStarted;
    var timedVisible = tickTimedEffects(next);
    clearDueLiabilitiesForSurface(next, surface.id);
    var immediateVisible = normalizeVisible(choice.impacts);
    var hidden = normalizeHidden(choice.impacts);
    applyVisible(next, immediateVisible);
    applyHidden(next, hidden);

    var queuedTimedEffects = enqueueTimedEffects(next, surface.id, choice.overTime || []);
    var queuedLiabilities = rollLiabilities(next, surface.id, choice.liabilities || []);
    var forcedSurfaceId = rollNextSurface(next, choice);
    applyChoiceTags(next, choice);
    if (surface.kind === 'policy') next.playedPolicyChoiceIds[choice.id] = true;
    updatePostPolicyState(config, next, wasPostPolicy);

    if (!surface.repeatable) next.completedSurfaceIds[surface.id] = true;
    next.lastKind = surface.kind;
    next.needsContextShift = surface.kind === 'policy';
    next.forcedSurfaceId = forcedSurfaceId;
    next.scenarioSpent += weightCost(surface.weight);
    next.beat += 1;
    ageLiabilities(next, queuedLiabilities);
    rememberRecent(next, surface, choice, hidden);
    latchDeadMeter(next);

    next.history.push({
      beat: next.beat,
      surfaceId: surface.id,
      surfaceKind: surface.kind,
      choiceId: choice.id,
      weightApplied: weightCost(surface.weight),
      immediateVisible: immediateVisible,
      timedVisible: timedVisible,
      hidden: hidden,
      queuedTimedEffects: queuedTimedEffects,
      queuedLiabilities: queuedLiabilities,
      tags: choice.addTags || []
    });

    return {
      state: next,
      timedVisible: timedVisible,
      immediateVisible: immediateVisible,
      hidden: hidden,
      queuedTimedEffects: queuedTimedEffects,
      queuedLiabilities: queuedLiabilities
    };
  }

  /**
   * Advance the run when no active surface is eligible but queued effects still
   * need to resolve. This is deliberately not a calendar week; it is a passive
   * implementation beat that lets policy drift and liabilities keep breathing.
   *
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {RouterPassiveResult}
   */
  function advanceAftermath(config, state) {
    var next = cloneState(state);
    var timedVisible = tickTimedEffects(next);
    next.beat += 1;
    ageLiabilities(next, []);
    next.lastKind = 'aftermath';
    next.needsContextShift = false;
    next.forcedSurfaceId = null;
    next.recentTags = { aftermath: true };
    next.recentAxes = {};
    latchDeadMeter(next);
    next.history.push({
      beat: next.beat,
      surfaceId: 'passive-aftermath',
      surfaceKind: 'aftermath',
      choiceId: 'advance',
      weightApplied: 0,
      immediateVisible: [],
      timedVisible: timedVisible,
      hidden: [],
      queuedTimedEffects: [],
      queuedLiabilities: [],
      tags: []
    });
    return { state: next, timedVisible: timedVisible };
  }

  /**
   * @param {RouterState} state
   * @returns {string}
   */
  function summarizeState(state) {
    return [
      'beat=' + state.beat,
      'spent=' + state.scenarioSpent,
      'meters=' + JSON.stringify(state.meters),
      'tags=' + Object.keys(state.tags).filter(function(k) { return state.tags[k]; }).sort().join(','),
      'timed=' + state.queuedTimedEffects.map(function(e) { return e.id + ':' + e.ticksRemaining + '@' + e.startsIn; }).join(','),
      'liabilities=' + state.queuedLiabilities.map(function(l) { return l.id + ':' + l.dueIn; }).join(',')
    ].join(' | ');
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @returns {RouterCandidate}
   */
  function scoreCandidate(config, state, surface) {
    /** @type {string[]} */
    var reasons = [];
    /** @type {string[]} */
    var blockReasons = [];
    var placement = surface.placement || {};
    var remaining = remainingBudget(config, state);
    var due = dueLiabilityFor(state, surface.id);
    var postPolicyCapReached = postPolicySurfaceLimitReached(config, state);
    var postPolicyEndgameDue = postPolicyEndgameDueNow(config, state);

    timingGateReasons(config, state, surface).forEach(function(reason) { blockReasons.push(reason); });
    if (postPolicyCapReached) blockReasons.push('post-policy card limit reached');
    if (!postPolicyCapReached && postPolicyEndgameDue && surface.kind !== 'endgame') blockReasons.push('post-policy endgame due');
    if (!postPolicyCapReached && !postPolicyEndgameDue && state.forcedSurfaceId && surface.id !== state.forcedSurfaceId) blockReasons.push('another surface is forced');
    if (!postPolicyCapReached && !postPolicyEndgameDue && state.forcedSurfaceId === surface.id) reasons.push('forced follow-up');
    if (!surface.repeatable && state.completedSurfaceIds[surface.id]) blockReasons.push('already completed');
    if (placement.fromLiability && !due) blockReasons.push('not due from liability');
    if (placement.onlyWhenForced && state.forcedSurfaceId !== surface.id && !due) blockReasons.push('only eligible when forced');
    if (!placement.fromLiability && due) reasons.push('also due from liability');
    if (!postPolicyCapReached && !postPolicyEndgameDue && state.postPolicyStarted && (surface.kind === 'policy' || surface.kind === 'cabinet')) blockReasons.push('post-policy policy loop closed');
    if (state.needsContextShift && surface.kind === 'policy' && surface.weight !== 'follow') blockReasons.push('policy context shift required');
    if (state.lastKind === surface.kind && surface.weight !== 'follow') blockReasons.push('same context as previous beat');
    if (placement.afterKinds && state.lastKind && placement.afterKinds.indexOf(state.lastKind) === -1) blockReasons.push('wrong previous kind');
    if (placement.afterKinds && !state.lastKind) blockReasons.push('requires previous kind');
    (placement.requiresTags || []).forEach(function(tag) {
      if (!state.tags[tag]) blockReasons.push('missing tag "' + tag + '"');
    });
    (placement.forbidsTags || []).forEach(function(tag) {
      if (state.tags[tag]) blockReasons.push('forbidden tag "' + tag + '"');
    });
    if (placement.minScenarioSpent != null && state.scenarioSpent < placement.minScenarioSpent) blockReasons.push('too early in scenario');
    if (placement.maxScenarioSpent != null && state.scenarioSpent > placement.maxScenarioSpent) blockReasons.push('too late in scenario');
    if (weightCost(surface.weight) > remaining && !due && surface.weight !== 'follow') blockReasons.push('not enough scenario budget');
    if (!hasAvailableChoice(state, surface)) blockReasons.push('no available choices');

    var score = 0;
    if (surface.weight === 'follow') {
      score += 70;
      reasons.push('immediate follow-up');
    }
    if (due) {
      score += 90 + due.priority;
      reasons.push('liability due');
    }
    if (surface.kind !== state.lastKind) {
      score += 10;
      reasons.push('context shift');
    }
    if (surface.pressure && surface.pressure.meters && surface.pressure.meters.indexOf(lowestMeter(state)) !== -1) {
      score += 25;
      reasons.push('pressures lowest meter');
    }
    (placement.prefers || []).forEach(function(tag) {
      if (state.tags[tag] || state.recentTags[tag]) {
        score += 12;
        reasons.push('matches tag ' + tag);
      }
    });
    if (surface.kind === 'policy' && policyTurnIsReady(state, surface)) {
      var urgency = activePolicyUrgency(state);
      if (urgency > 0) {
        score += urgency;
        reasons.push('active reform urgency +' + urgency);
      }
    }
    if (surface.pressure && surface.pressure.allowsSharpGovernanceMove) {
      score += 6;
      reasons.push('sharp governance pressure');
    }
    if (surface.pressure && surface.pressure.hiddenAxes) {
      surface.pressure.hiddenAxes.forEach(function(axis) {
        if (state.recentAxes[axis]) {
          score -= 5;
          reasons.push('recently tested ' + axis);
        }
      });
    }
    if (surface.kind === 'policy' && state.scenarioSpent === 0) {
      score += 20;
      reasons.push('opens policy arc');
    }

    return {
      surface: surface,
      score: score,
      reasons: reasons,
      blocked: blockReasons.length > 0,
      blockReasons: blockReasons
    };
  }

  /**
   * @param {RouterSurface} surface
   * @param {string[]} errors
   * @returns {void}
   */
  function validatePlacement(surface, errors) {
    var placement = surface.placement || {};
    (placement.afterKinds || []).forEach(function(kind) {
      if (SURFACE_KINDS.indexOf(kind) === -1) errors.push(surface.id + ': invalid afterKinds "' + kind + '"');
    });
    if (placement.minScenarioSpent != null && placement.minScenarioSpent < 0) errors.push(surface.id + ': minScenarioSpent must be >= 0');
    if (placement.maxScenarioSpent != null && placement.maxScenarioSpent < 0) errors.push(surface.id + ': maxScenarioSpent must be >= 0');
  }

  /**
   * @param {RouterSurface} surface
   * @param {string[]} errors
   * @returns {void}
   */
  function validateTiming(surface, errors) {
    var timing = surface.timing;
    if (timing == null) return;
    if (typeof timing !== 'object' || Array.isArray(timing)) {
      errors.push(surface.id + ': timing must be an object');
      return;
    }
    Object.keys(timing).forEach(function(key) {
      if (TIMING_KEYS.indexOf(key) === -1) errors.push(surface.id + ': timing has unknown key "' + key + '"');
    });
    var phase = /** @type {any} */ (timing).phase;
    if (phase !== undefined && TIMING_PHASES.indexOf(phase) === -1) {
      errors.push(surface.id + ': timing.phase must be one of ' + TIMING_PHASES.join(', '));
    }
    validateNonNegativeIntegerGate(surface, timing, 'minPolicyCompletions', false, errors);
    validateNonNegativeIntegerGate(surface, timing, 'maxPolicyCompletions', true, errors);
    validateNonNegativeIntegerGate(surface, timing, 'minBeat', false, errors);
    validateNonNegativeIntegerGate(surface, timing, 'maxBeat', true, errors);
    validateTimingRange(surface, timing, 'minPolicyCompletions', 'maxPolicyCompletions', errors);
    validateTimingRange(surface, timing, 'minBeat', 'maxBeat', errors);
  }

  /**
   * @param {RouterSurface} surface
   * @param {RouterSurfaceTiming} timing
   * @param {string} key
   * @param {boolean} allowNull
   * @param {string[]} errors
   * @returns {void}
   */
  function validateNonNegativeIntegerGate(surface, timing, key, allowNull, errors) {
    var value = /** @type {any} */ (timing)[key];
    if (value === undefined) return;
    if (value === null) {
      if (!allowNull) errors.push(surface.id + ': timing.' + key + ' cannot be null');
      return;
    }
    if (!Number.isInteger(value) || value < 0) {
      errors.push(surface.id + ': timing.' + key + ' must be a non-negative integer');
    }
  }

  /**
   * @param {RouterSurface} surface
   * @param {RouterSurfaceTiming} timing
   * @param {string} minKey
   * @param {string} maxKey
   * @param {string[]} errors
   * @returns {void}
   */
  function validateTimingRange(surface, timing, minKey, maxKey, errors) {
    var min = /** @type {any} */ (timing)[minKey];
    var max = /** @type {any} */ (timing)[maxKey];
    if (!Number.isInteger(min) || !Number.isInteger(max)) return;
    if (max < min) errors.push(surface.id + ': timing.' + maxKey + ' must be >= timing.' + minKey);
  }

  /**
   * @param {RouterSurface} surface
   * @param {Record<string, boolean>} meterKeys
   * @param {Record<string, boolean>} axisKeys
   * @param {string[]} errors
   * @returns {void}
   */
  function validatePressure(surface, meterKeys, axisKeys, errors) {
    var pressure = surface.pressure || {};
    (pressure.meters || []).forEach(function(meter) {
      if (!meterKeys[meter]) errors.push(surface.id + ': pressure references unknown meter "' + meter + '"');
    });
    (pressure.hiddenAxes || []).forEach(function(axis) {
      if (!axisKeys[axis]) errors.push(surface.id + ': pressure references unknown hidden axis "' + axis + '"');
    });
  }

  /**
   * @param {RouterSurface} surface
   * @param {RouterChoice} choice
   * @param {Record<string, RouterSurface>} surfaces
   * @param {Record<string, boolean>} meterKeys
   * @param {Record<string, boolean>} axisKeys
   * @param {string[]} errors
   * @returns {void}
   */
  function validateChoice(surface, choice, surfaces, meterKeys, axisKeys, errors) {
    void surfaces;
    (choice.requiresTags || []).forEach(function(tag) {
      if (!tag) errors.push(surface.id + '/' + choice.id + ': requiresTags cannot contain empty values');
    });
    (choice.forbidsTags || []).forEach(function(tag) {
      if (!tag) errors.push(surface.id + '/' + choice.id + ': forbidsTags cannot contain empty values');
    });
    if (choice.lock) {
      if (choice.lock.meter && !meterKeys[choice.lock.meter]) errors.push(surface.id + '/' + choice.id + ': lock references unknown meter "' + choice.lock.meter + '"');
      if (choice.lock.threshold != null && typeof choice.lock.threshold !== 'number') errors.push(surface.id + '/' + choice.id + ': lock threshold must be a number');
    }
    if (choice.nextChance != null && (choice.nextChance < 0 || choice.nextChance > 100)) {
      errors.push(surface.id + '/' + choice.id + ': nextChance must be 0-100');
    }
    normalizeVisible(choice.impacts).forEach(function(impact) {
      if (!meterKeys[impact.meter]) errors.push(surface.id + '/' + choice.id + ': unknown meter "' + impact.meter + '"');
    });
    normalizeHidden(choice.impacts).forEach(function(impact) {
      if (!axisKeys[impact.axis]) errors.push(surface.id + '/' + choice.id + ': unknown hidden axis "' + impact.axis + '"');
    });
    (choice.overTime || []).forEach(function(effect) {
      if (!Number.isInteger(effect.startsAfterBeats) || effect.startsAfterBeats < 0) errors.push(surface.id + '/' + choice.id + '/' + effect.id + ': startsAfterBeats must be >= 0');
      if (!Number.isInteger(effect.ticks) || effect.ticks < 1) errors.push(surface.id + '/' + choice.id + '/' + effect.id + ': ticks must be positive');
      effect.eachTick.forEach(function(impact) {
        if (!meterKeys[impact.meter]) errors.push(surface.id + '/' + choice.id + '/' + effect.id + ': unknown meter "' + impact.meter + '"');
      });
    });
    (choice.liabilities || []).forEach(function(liability) {
      if (liability.chance < 0 || liability.chance > 100) errors.push(surface.id + '/' + choice.id + '/' + liability.id + ': chance must be 0-100');
      if (!Number.isInteger(liability.afterBeats.min) || !Number.isInteger(liability.afterBeats.max) || liability.afterBeats.min < 0 || liability.afterBeats.max < liability.afterBeats.min) {
        errors.push(surface.id + '/' + choice.id + '/' + liability.id + ': invalid afterBeats window');
      }
    });
  }

  /**
   * @param {RouterState} state
   * @returns {RouterMeterImpact[]}
   */
  function tickTimedEffects(state) {
    /** @type {RouterMeterImpact[]} */
    var impacts = [];
    /** @type {RouterQueuedTimedEffect[]} */
    var stillQueued = [];
    state.queuedTimedEffects.forEach(function(effect) {
      var startsIn = effect.startsIn;
      if (startsIn > 0) startsIn -= 1;
      if (startsIn === 0) {
        effect.eachTick.forEach(function(impact) { impacts.push(impact); });
        effect.ticksRemaining -= 1;
      }
      if (effect.ticksRemaining > 0) {
        stillQueued.push({
          id: effect.id,
          sourceSurfaceId: effect.sourceSurfaceId,
          startsIn: startsIn,
          ticksRemaining: effect.ticksRemaining,
          eachTick: effect.eachTick.slice(),
          note: effect.note
        });
      }
    });
    state.queuedTimedEffects = stillQueued;
    applyVisible(state, impacts);
    return impacts;
  }

  /**
   * @param {RouterState} state
   * @param {string} sourceSurfaceId
   * @param {RouterTimedEffect[]} effects
   * @returns {string[]}
   */
  function enqueueTimedEffects(state, sourceSurfaceId, effects) {
    /** @type {string[]} */
    var ids = [];
    effects.forEach(function(effect) {
      state.queuedTimedEffects.push({
        id: effect.id,
        sourceSurfaceId: sourceSurfaceId,
        startsIn: effect.startsAfterBeats,
        ticksRemaining: effect.ticks,
        eachTick: effect.eachTick.slice(),
        note: effect.note
      });
      ids.push(effect.id);
    });
    return ids;
  }

  /**
   * @param {RouterState} state
   * @param {string} sourceSurfaceId
   * @param {RouterLiability[]} liabilities
   * @returns {string[]}
   */
  function rollLiabilities(state, sourceSurfaceId, liabilities) {
    /** @type {string[]} */
    var queued = [];
    liabilities.forEach(function(liability) {
      var roll = nextRandomPercent(state);
      if (roll > liability.chance) return;
      var dueIn = randomInt(state, liability.afterBeats.min, liability.afterBeats.max);
      state.queuedLiabilities.push({
        id: liability.id,
        sourceSurfaceId: sourceSurfaceId,
        surfaceId: liability.surfaceId,
        entryNode: liability.entryNode,
        dueIn: dueIn,
        priority: liability.priority || 0,
        note: liability.note
      });
      queued.push(liability.id);
    });
    return queued;
  }

  /**
   * @param {RouterState} state
   * @param {RouterChoice} choice
   * @returns {string|null}
   */
  function rollNextSurface(state, choice) {
    if (!choice.nextSurfaceId) return null;
    if (choice.nextChance == null) return choice.nextSurfaceId;
    return nextRandomPercent(state) <= choice.nextChance ? choice.nextSurfaceId : null;
  }

  /**
   * @param {RouterState} state
   * @param {string[]} newlyQueued
   * @returns {void}
   */
  function ageLiabilities(state, newlyQueued) {
    var newSet = setFrom(newlyQueued);
    state.queuedLiabilities = state.queuedLiabilities.map(function(liability) {
      if (newSet[liability.id]) return liability;
      return {
        id: liability.id,
        sourceSurfaceId: liability.sourceSurfaceId,
        surfaceId: liability.surfaceId,
        entryNode: liability.entryNode,
        dueIn: liability.dueIn - 1,
        priority: liability.priority,
        note: liability.note
      };
    });
  }

  /**
   * @param {RouterState} state
   * @param {RouterChoice} choice
   * @returns {void}
   */
  function applyChoiceTags(state, choice) {
    (choice.addTags || []).forEach(function(tag) { state.tags[tag] = true; });
    (choice.removeTags || []).forEach(function(tag) { delete state.tags[tag]; });
    delete state.tags.scenarioStart;
  }

  /**
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @param {RouterChoice} choice
   * @param {RouterHiddenImpact[]} hidden
   * @returns {void}
   */
  function rememberRecent(state, surface, choice, hidden) {
    state.recentTags = {};
    state.recentTags[surface.kind] = true;
    (choice.addTags || []).forEach(function(tag) { state.recentTags[tag] = true; });
    state.recentAxes = {};
    hidden.forEach(function(impact) { state.recentAxes[impact.axis] = true; });
  }

  /**
   * @param {RouterState} state
   * @param {RouterMeterImpact[]} impacts
   * @returns {void}
   */
  function applyVisible(state, impacts) {
    impacts.forEach(function(impact) {
      state.meters[impact.meter] = clamp(state.meters[impact.meter] + impact.delta, 0, 100);
    });
    latchDeadMeter(state);
  }

  /**
   * @param {RouterState} state
   * @param {RouterHiddenImpact[]} impacts
   * @returns {void}
   */
  function applyHidden(state, impacts) {
    impacts.forEach(function(impact) {
      state.hiddenAxes[impact.axis] = state.hiddenAxes[impact.axis] + impact.delta;
    });
  }

  /**
   * @param {RouterState} state
   * @returns {void}
   */
  function latchDeadMeter(state) {
    if (state.deadMeter) return;
    /** @type {RouterMeterKey[]} */
    var order = ['living', 'press', 'politics', 'capital'];
    for (var i = 0; i < order.length; i++) {
      if (state.meters[order[i]] <= 0) {
        state.deadMeter = order[i];
        return;
      }
    }
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {number}
   */
  function remainingBudget(config, state) {
    var scenario = getScenario(config, state.scenarioId);
    return scenario ? Math.max(0, scenario.budget - state.scenarioSpent) : 0;
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {boolean} wasPostPolicy
   * @returns {void}
   */
  function updatePostPolicyState(config, state, wasPostPolicy) {
    var scenario = getScenario(config, state.scenarioId);
    if (!scenario || !scenario.targetPolicyCompletions) return;
    if (wasPostPolicy) state.postPolicySurfaceCount += 1;
    if (!state.postPolicyStarted && completedPolicyCount(state) >= scenario.targetPolicyCompletions) {
      state.postPolicyStarted = true;
    }
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {boolean}
   */
  function postPolicySurfaceLimitReached(config, state) {
    var scenario = getScenario(config, state.scenarioId);
    if (!scenario || !state.postPolicyStarted || scenario.postPolicySurfaceLimit == null) return false;
    return state.postPolicySurfaceCount >= scenario.postPolicySurfaceLimit;
  }

  /**
   * Reserves the final post-policy card slot for an endgame surface. If the
   * endgame surface is already complete, the run simply exhausts candidates.
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {boolean}
   */
  function postPolicyEndgameDueNow(config, state) {
    var scenario = getScenario(config, state.scenarioId);
    if (!scenario || !state.postPolicyStarted || scenario.postPolicySurfaceLimit == null) return false;
    return state.postPolicySurfaceCount >= Math.max(0, scenario.postPolicySurfaceLimit - 1);
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @returns {string[]}
   */
  function timingGateReasons(config, state, surface) {
    var timing = surface.timing;
    if (!timing) return [];
    /** @type {string[]} */
    var reasons = [];
    var policyCount = completedPolicyCount(state);
    if (timing.minPolicyCompletions != null && policyCount < timing.minPolicyCompletions) {
      reasons.push('timing requires at least ' + timing.minPolicyCompletions + ' completed policy arc(s)');
    }
    if (timing.maxPolicyCompletions != null && policyCount > timing.maxPolicyCompletions) {
      reasons.push('timing allows at most ' + timing.maxPolicyCompletions + ' completed policy arc(s)');
    }
    if (timing.minBeat != null && state.beat < timing.minBeat) {
      reasons.push('timing requires beat >= ' + timing.minBeat);
    }
    if (timing.maxBeat != null && state.beat > timing.maxBeat) {
      reasons.push('timing allows beat <= ' + timing.maxBeat);
    }
    if (timing.phase && timing.phase !== 'any' && !timingPhaseMatches(config, state, timing.phase)) {
      reasons.push('not in ' + timing.phase + ' timing phase');
    }
    return reasons;
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @param {RouterTimingPhase} phase
   * @returns {boolean}
   */
  function timingPhaseMatches(config, state, phase) {
    var scenario = getScenario(config, state.scenarioId);
    var policyCount = completedPolicyCount(state);
    var target = scenario && scenario.targetPolicyCompletions || 0;
    if (phase === 'any') return true;
    if (phase === 'early') return policyCount === 0 && !state.postPolicyStarted;
    if (phase === 'mid') {
      if (state.postPolicyStarted || finalTimingPhaseActive(config, state)) return false;
      return target ? policyCount > 0 && policyCount < Math.max(1, target - 1) : state.scenarioSpent > 0;
    }
    if (phase === 'late') {
      if (finalTimingPhaseActive(config, state)) return false;
      if (target) return policyCount >= Math.max(1, target - 1);
      return scenario ? state.scenarioSpent >= Math.ceil(scenario.budget * 2 / 3) : state.beat > 0;
    }
    if (phase === 'final') return finalTimingPhaseActive(config, state);
    return true;
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterState} state
   * @returns {boolean}
   */
  function finalTimingPhaseActive(config, state) {
    var scenario = getScenario(config, state.scenarioId);
    if (!scenario) return false;
    if (scenario.postPolicySurfaceLimit != null) return postPolicyEndgameDueNow(config, state);
    if (scenario.targetPolicyCompletions) return state.postPolicyStarted || completedPolicyCount(state) >= scenario.targetPolicyCompletions;
    return remainingBudget(config, state) <= 0;
  }

  /**
   * @param {RouterState} state
   * @returns {number}
   */
  function completedPolicyCount(state) {
    return Object.keys(state.tags).filter(function(tag) {
      return /^scenario-.*-complete$/.test(tag);
    }).length;
  }

  /**
   * Give an active reform arc a rising return-to-policy bonus after the required
   * context shift. Forced crisis follow-ups can still beat it, but loose crisis
   * browsing should not bury a live policy turn for half a run.
   * @param {RouterState} state
   * @returns {number}
   */
  function activePolicyUrgency(state) {
    var beats = beatsSinceLastPolicy(state);
    if (beats < 1) return 0;
    return Math.min(40, 8 + (beats - 1) * 14);
  }

  /**
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @returns {boolean}
   */
  function policyTurnIsReady(state, surface) {
    var placement = surface.placement || {};
    var prefers = placement.prefers || [];
    if (!prefers.length) return false;
    for (var i = 0; i < prefers.length; i++) {
      if (state.tags[prefers[i]] || state.recentTags[prefers[i]]) return true;
    }
    return false;
  }

  /**
   * @param {RouterState} state
   * @returns {number}
   */
  function beatsSinceLastPolicy(state) {
    var beats = 0;
    for (var i = state.history.length - 1; i >= 0; i--) {
      if (state.history[i].surfaceKind === 'policy') return beats;
      beats += 1;
    }
    return 0;
  }

  /**
   * @param {RouterState} state
   * @param {string} surfaceId
   * @returns {RouterQueuedLiability|null}
   */
  function dueLiabilityFor(state, surfaceId) {
    var due = state.queuedLiabilities.filter(function(liability) {
      return liability.surfaceId === surfaceId && liability.dueIn <= 0;
    }).sort(function(a, b) { return b.priority - a.priority; });
    return due.length ? due[0] : null;
  }

  /**
   * @param {RouterState} state
   * @param {string} surfaceId
   * @returns {void}
   */
  function clearDueLiabilitiesForSurface(state, surfaceId) {
    state.queuedLiabilities = state.queuedLiabilities.filter(function(liability) {
      return !(liability.surfaceId === surfaceId && liability.dueIn <= 0);
    });
  }

  /**
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @returns {boolean}
   */
  function hasAvailableChoice(state, surface) {
    for (var i = 0; i < surface.choices.length; i++) {
      if (getChoiceAvailability(state, surface, surface.choices[i]).available) return true;
    }
    return false;
  }

  /**
   * @param {RouterState} state
   * @param {RouterSurface} surface
   * @param {RouterChoice} choice
   * @returns {RouterChoiceAvailability}
   */
  function getChoiceAvailability(state, surface, choice) {
    /** @type {string[]} */
    var reasons = [];
    if (surface.kind === 'policy' && state.playedPolicyChoiceIds[choice.id]) {
      reasons.push('already enacted');
    }
    (choice.requiresTags || []).forEach(function(tag) {
      if (!state.tags[tag]) reasons.push('needs ' + tag);
    });
    (choice.forbidsTags || []).forEach(function(tag) {
      if (state.tags[tag]) reasons.push('blocked by ' + tag);
    });
    if (choice.lock && choice.lock.meter && choice.lock.threshold != null) {
      if (state.meters[choice.lock.meter] < choice.lock.threshold) {
        reasons.push(choice.lock.text || (choice.lock.meter + ' must be ' + choice.lock.threshold + '+'));
      }
    }
    return {
      choice: choice,
      available: reasons.length === 0,
      reasons: reasons
    };
  }

  /**
   * @param {RouterState} state
   * @returns {RouterMeterKey}
   */
  function lowestMeter(state) {
    /** @type {RouterMeterKey[]} */
    var keys = ['living', 'press', 'politics', 'capital'];
    var best = keys[0];
    keys.forEach(function(key) {
      if (state.meters[key] < state.meters[best]) best = key;
    });
    return best;
  }

  /**
   * @param {RouterImpactSet|undefined} impacts
   * @returns {RouterMeterImpact[]}
   */
  function normalizeVisible(impacts) {
    return impacts && impacts.visible ? impacts.visible.slice() : [];
  }

  /**
   * @param {RouterImpactSet|undefined} impacts
   * @returns {RouterHiddenImpact[]}
   */
  function normalizeHidden(impacts) {
    return impacts && impacts.hidden ? impacts.hidden.slice() : [];
  }

  /**
   * @param {RouterWeight} weight
   * @returns {number}
   */
  function weightCost(weight) {
    return typeof weight === 'number' ? weight : 0;
  }

  /**
   * @param {number} n
   * @returns {number}
   */
  function normalizeSeed(n) {
    var seed = Math.floor(Math.abs(n)) % 2147483647;
    return seed === 0 ? 1 : seed;
  }

  /**
   * @param {RouterState} state
   * @returns {number}
   */
  function nextRandom(state) {
    state.seed = (state.seed * 48271) % 2147483647;
    return state.seed / 2147483647;
  }

  /**
   * @param {RouterState} state
   * @returns {number}
   */
  function nextRandomPercent(state) {
    return Math.floor(nextRandom(state) * 100) + 1;
  }

  /**
   * @param {RouterState} state
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function randomInt(state, min, max) {
    return min + Math.floor(nextRandom(state) * (max - min + 1));
  }

  /**
   * @param {RouterConfig} config
   * @param {string} id
   * @returns {RouterSurface|null}
   */
  function getSurface(config, id) {
    for (var i = 0; i < config.surfaces.length; i++) {
      if (config.surfaces[i].id === id) return config.surfaces[i];
    }
    return null;
  }

  /**
   * @param {RouterConfig} config
   * @param {string} id
   * @returns {RouterScenario|null}
   */
  function getScenario(config, id) {
    for (var i = 0; i < config.scenarios.length; i++) {
      if (config.scenarios[i].id === id) return config.scenarios[i];
    }
    return null;
  }

  /**
   * @param {RouterSurface} surface
   * @param {string} id
   * @returns {RouterChoice|null}
   */
  function getChoice(surface, id) {
    for (var i = 0; i < surface.choices.length; i++) {
      if (surface.choices[i].id === id) return surface.choices[i];
    }
    return null;
  }

  /**
   * @param {string[]} items
   * @returns {Record<string, boolean>}
   */
  function setFrom(items) {
    /** @type {Record<string, boolean>} */
    var out = {};
    items.forEach(function(item) { out[item] = true; });
    return out;
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * @param {Record<RouterMeterKey, number>} meters
   * @returns {Record<RouterMeterKey, number>}
   */
  function cloneMeters(meters) {
    return { living: meters.living, press: meters.press, politics: meters.politics, capital: meters.capital };
  }

  /**
   * @param {Record<RouterHiddenAxisKey, number>} axes
   * @returns {Record<RouterHiddenAxisKey, number>}
   */
  function cloneHidden(axes) {
    return {
      ruthless: axes.ruthless,
      smooth: axes.smooth,
      impulsive: axes.impulsive,
      populist: axes.populist,
      machiavellian: axes.machiavellian
    };
  }

  /**
   * @param {RouterState} state
   * @returns {RouterState}
   */
  function cloneState(state) {
    return {
      beat: state.beat,
      scenarioId: state.scenarioId,
      scenarioSpent: state.scenarioSpent,
      meters: cloneMeters(state.meters),
      hiddenAxes: cloneHidden(state.hiddenAxes),
      tags: Object.assign({}, state.tags),
      recentTags: Object.assign({}, state.recentTags),
      recentAxes: Object.assign({}, state.recentAxes),
      completedSurfaceIds: Object.assign({}, state.completedSurfaceIds),
      playedPolicyChoiceIds: Object.assign({}, state.playedPolicyChoiceIds),
      queuedTimedEffects: state.queuedTimedEffects.map(function(effect) {
        return {
          id: effect.id,
          sourceSurfaceId: effect.sourceSurfaceId,
          startsIn: effect.startsIn,
          ticksRemaining: effect.ticksRemaining,
          eachTick: effect.eachTick.slice(),
          note: effect.note
        };
      }),
      queuedLiabilities: state.queuedLiabilities.map(function(liability) {
        return {
          id: liability.id,
          sourceSurfaceId: liability.sourceSurfaceId,
          surfaceId: liability.surfaceId,
          entryNode: liability.entryNode,
          dueIn: liability.dueIn,
          priority: liability.priority,
          note: liability.note
        };
      }),
      forcedSurfaceId: state.forcedSurfaceId,
      lastKind: state.lastKind,
      needsContextShift: state.needsContextShift,
      postPolicyStarted: state.postPolicyStarted,
      postPolicySurfaceCount: state.postPolicySurfaceCount,
      seed: state.seed,
      deadMeter: state.deadMeter,
      history: state.history.slice()
    };
  }

  /** @type {RouterApi} */
  var api = {
    createInitialState: createInitialState,
    validateConfig: validateConfig,
    listCandidates: listCandidates,
    selectNextSurface: selectNextSurface,
    listChoices: listChoices,
    resolveChoice: resolveChoice,
    advanceAftermath: advanceAftermath,
    summarizeState: summarizeState
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else /** @type {any} */ (root).DramaturgicalRouter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
