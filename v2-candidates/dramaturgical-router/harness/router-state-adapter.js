// @ts-check
/// <reference path="./result-types.d.ts" />

(function(root) {
  "use strict";

  /** @type {ResultMeterKey[]} */
  var METER_KEYS = ["living", "press", "politics", "capital"];
  /** @type {ResultHiddenAxisKey[]} */
  var HIDDEN_AXIS_KEYS = ["ruthless", "smooth", "impulsive", "populist", "machiavellian"];
  /** @type {ResultSurfaceKind[]} */
  var SURFACE_KINDS = ["policy", "media", "party", "private", "scandal", "cabinet", "liability", "endgame", "aftermath", "unknown"];

  /**
   * @param {RouterConfigLike|null|undefined} config
   * @param {RouterStateLike} state
   * @param {{ configTitle?: string; scenarioTitle?: string }} [options]
   * @returns {ResultInput}
   */
  function adaptRouterStateToResultInput(config, state, options) {
    var safeConfig = config || {};
    var scenarioId = state.scenarioId || firstScenarioId(safeConfig) || "unknown-scenario";
    return {
      schemaVersion: 1,
      configTitle: String((options && options.configTitle) || safeConfig.title || ""),
      scenarioId: scenarioId,
      scenarioTitle: String((options && options.scenarioTitle) || scenarioTitle(safeConfig, scenarioId) || ""),
      beat: nonNegativeInteger(state.beat, historyLength(state)),
      scenarioSpent: nonNegativeInteger(state.scenarioSpent, 0),
      seed: nonNegativeInteger(state.seed, 0),
      meters: pickMeters(state.meters, safeConfig.startingMeters),
      hiddenAxes: pickHiddenAxes(state.hiddenAxes, safeConfig.startingHiddenAxes),
      tags: recordOrArrayKeys(state.tags),
      playedPolicyChoiceIds: recordOrArrayKeys(state.playedPolicyChoiceIds),
      deadMeter: toDeadMeter(state.deadMeter),
      history: normaliseHistory(state.history)
    };
  }

  /**
   * @param {Record<string, number>|undefined} current
   * @param {Record<string, number>|undefined} fallback
   * @returns {Record<ResultMeterKey, number>}
   */
  function pickMeters(current, fallback) {
    return {
      living: numberAt(current, fallback, "living", 0),
      press: numberAt(current, fallback, "press", 0),
      politics: numberAt(current, fallback, "politics", 0),
      capital: numberAt(current, fallback, "capital", 0)
    };
  }

  /**
   * @param {Record<string, number>|undefined} current
   * @param {Record<string, number>|undefined} fallback
   * @returns {Record<ResultHiddenAxisKey, number>}
   */
  function pickHiddenAxes(current, fallback) {
    return {
      ruthless: numberAt(current, fallback, "ruthless", 0),
      smooth: numberAt(current, fallback, "smooth", 0),
      impulsive: numberAt(current, fallback, "impulsive", 0),
      populist: numberAt(current, fallback, "populist", 0),
      machiavellian: numberAt(current, fallback, "machiavellian", 0)
    };
  }

  /**
   * @param {RouterHistoryEntryLike[]|undefined} history
   * @returns {ResultHistoryEntry[]}
   */
  function normaliseHistory(history) {
    if (!Array.isArray(history)) return [];
    return history.map(function(entry, index) {
      var kind = String(entry.surfaceKind || "unknown");
      return {
        beat: nonNegativeInteger(entry.beat, index + 1),
        surfaceId: String(entry.surfaceId || "unknown-surface"),
        surfaceKind: SURFACE_KINDS.indexOf(/** @type {ResultSurfaceKind} */ (kind)) === -1 ? "unknown" : /** @type {ResultSurfaceKind} */ (kind),
        choiceId: String(entry.choiceId || "unknown-choice"),
        tags: Array.isArray(entry.tags) ? uniqueSorted(entry.tags) : []
      };
    });
  }

  /**
   * @param {Record<string, boolean>|string[]|undefined} value
   * @returns {string[]}
   */
  function recordOrArrayKeys(value) {
    if (Array.isArray(value)) return uniqueSorted(value);
    if (!value || typeof value !== "object") return [];
    return Object.keys(value).filter(function(key) { return !!value[key]; }).sort();
  }

  /**
   * @param {unknown} value
   * @returns {ResultMeterKey|null}
   */
  function toDeadMeter(value) {
    if (typeof value !== "string") return null;
    return METER_KEYS.indexOf(/** @type {ResultMeterKey} */ (value)) === -1 ? null : /** @type {ResultMeterKey} */ (value);
  }

  /**
   * @param {RouterConfigLike} config
   * @returns {string}
   */
  function firstScenarioId(config) {
    return config.scenarios && config.scenarios.length ? config.scenarios[0].id : "";
  }

  /**
   * @param {RouterConfigLike} config
   * @param {string} scenarioId
   * @returns {string}
   */
  function scenarioTitle(config, scenarioId) {
    var scenarios = config.scenarios || [];
    for (var i = 0; i < scenarios.length; i += 1) {
      if (scenarios[i].id === scenarioId) return scenarios[i].title || "";
    }
    return "";
  }

  /**
   * @param {RouterStateLike} state
   * @returns {number}
   */
  function historyLength(state) {
    return Array.isArray(state.history) ? state.history.length : 0;
  }

  /**
   * @param {Record<string, number>|undefined} current
   * @param {Record<string, number>|undefined} fallback
   * @param {string} key
   * @param {number} otherwise
   * @returns {number}
   */
  function numberAt(current, fallback, key, otherwise) {
    if (current && typeof current[key] === "number" && Number.isFinite(current[key])) return current[key];
    if (fallback && typeof fallback[key] === "number" && Number.isFinite(fallback[key])) return fallback[key];
    return otherwise;
  }

  /**
   * @param {unknown} value
   * @param {number} fallback
   * @returns {number}
   */
  function nonNegativeInteger(value, fallback) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  /**
   * @param {string[]} values
   * @returns {string[]}
   */
  function uniqueSorted(values) {
    var seen = Object.create(null);
    values.forEach(function(value) {
      if (typeof value === "string" && value.trim()) seen[value] = true;
    });
    return Object.keys(seen).sort();
  }

  /** @type {RouterStateResultAdapterApi} */
  var api = {
    adaptRouterStateToResultInput: adaptRouterStateToResultInput
  };

  root.RouterStateResultAdapter = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : /** @type {any} */ (window));
