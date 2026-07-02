// @ts-check
/// <reference path="./result-types.d.ts" />

(function(root) {
  "use strict";

  /** @type {ResultLeaderComparisonDataApi} */
  var data = root.ResultLeaderComparisonData || (typeof require === "function" ? require("../data/leader-comparison-data.js") : null);
  /** @type {ResultCodecApi|null} */
  var codec = root.ResultCodec || (typeof require === "function" ? require("./result-codec.js") : null);

  /** @type {ResultMeterKey[]} */
  var METER_KEYS = ["living", "press", "politics", "capital"];
  /** @type {ResultHiddenAxisKey[]} */
  var HIDDEN_AXIS_KEYS = ["ruthless", "smooth", "impulsive", "populist", "machiavellian"];

  var meterLabels = {
    living: "Living Standards",
    press: "Media Climate",
    politics: "Public Trust",
    capital: "Political Power"
  };

  var legacyMeterWeights = {
    living: 1.1,
    press: 0.85,
    politics: 1,
    capital: 1.2
  };

  var structuralPolicyPatterns = [
    /reform/i,
    /regulator/i,
    /public-control/i,
    /just-transition/i,
    /nationalisation/i,
    /electoral/i,
    /rights/i,
    /enforcement/i,
    /apprenticeship/i,
    /levy/i,
    /border-tax/i,
    /social-housing-build/i
  ];

  /**
   * @param {ResultInput} input
   * @param {{ leaderCount?: number; baseHref?: string }} [options]
   * @returns {CalculatedResult}
   */
  function calculateResult(input, options) {
    var normalised = codec ? codec.normaliseResultInput(input) : input;
    var leaderCount = options && options.leaderCount ? options.leaderCount : 5;
    var dominantAxes = getDominantAxes(normalised);
    var archetype = chooseArchetype(normalised, dominantAxes);
    var shareUrl = options && options.baseHref ? buildShareUrl(normalised, options.baseHref) : "";
    return {
      input: normalised,
      comparisonVector: toLeaderComparisonVector(normalised.hiddenAxes),
      dominantAxes: dominantAxes,
      archetype: archetype,
      meterInterpretations: METER_KEYS.map(function(key) { return interpretMeter(key, normalised.meters[key]); }),
      legacy: projectLegacy(normalised),
      summary: summarizeRun(normalised),
      closestLeaders: findClosestLeaders(normalised, leaderCount),
      shareUrl: shareUrl
    };
  }

  /**
   * @param {ResultInput} input
   * @param {string} [baseHref]
   * @returns {string}
   */
  function buildShareUrl(input, baseHref) {
    if (!codec) throw new Error("ResultCodec is required to build share URLs.");
    var search = codec.encodeResultSearch(input);
    var fallbackBase = "result.html";
    var currentHref = root.location && root.location.href ? root.location.href : fallbackBase;
    var href = baseHref || currentHref;
    try {
      var url = new URL(href, currentHref);
      url.search = search;
      url.hash = "";
      return url.href;
    } catch (error) {
      return href.split("?")[0].split("#")[0] + search;
    }
  }

  /**
   * @param {ResultInput} input
   * @param {number} [count]
   * @returns {LeaderComparisonMatch[]}
   */
  function findClosestLeaders(input, count) {
    var limit = count || 5;
    var vector = toLeaderComparisonVector(input.hiddenAxes);
    return data.leaders.map(function(leader) {
      /** @type {Record<ResultHiddenAxisKey, number>} */
      var axisDiffs = {
        ruthless: vector.ruthless - leader.scores.ruthless,
        smooth: vector.smooth - leader.scores.smooth,
        impulsive: vector.impulsive - leader.scores.impulsive,
        populist: vector.populist - leader.scores.populist,
        machiavellian: vector.machiavellian - leader.scores.machiavellian
      };
      var sumSquares = HIDDEN_AXIS_KEYS.reduce(function(total, key) {
        return total + axisDiffs[key] * axisDiffs[key];
      }, 0);
      return {
        leader: leader,
        distance: Math.round(Math.sqrt(sumSquares) * 1000) / 1000,
        axisDiffs: axisDiffs
      };
    }).sort(function(a, b) {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.leader.name.localeCompare(b.leader.name);
    }).slice(0, limit);
  }

  /**
   * The leader map is scored on -5..5. Router hidden axes can accumulate beyond
   * that, so nearest-leader comparison intentionally clamps the final state.
   *
   * @param {Record<ResultHiddenAxisKey, number>} axes
   * @returns {Record<ResultHiddenAxisKey, number>}
   */
  function toLeaderComparisonVector(axes) {
    return {
      ruthless: clamp(Math.round(axes.ruthless), -5, 5),
      smooth: clamp(Math.round(axes.smooth), -5, 5),
      impulsive: clamp(Math.round(axes.impulsive), -5, 5),
      populist: clamp(Math.round(axes.populist), -5, 5),
      machiavellian: clamp(Math.round(axes.machiavellian), -5, 5)
    };
  }

  /**
   * @param {ResultInput} input
   * @returns {ResultAxisInterpretation[]}
   */
  function getDominantAxes(input) {
    return HIDDEN_AXIS_KEYS.map(function(key) {
      var axis = axisByKey(key);
      var value = input.hiddenAxes[key];
      var magnitude = Math.abs(value);
      var direction = value > 0 ? "positive" : value < 0 ? "negative" : "balanced";
      var label = direction === "positive" ? axis.right : direction === "negative" ? axis.left : "Balanced";
      return {
        key: key,
        value: value,
        magnitude: magnitude,
        direction: /** @type {ResultAxisDirection} */ (direction),
        label: label,
        left: axis.left,
        right: axis.right,
        text: describeAxis(axis, value)
      };
    }).sort(function(a, b) {
      if (b.magnitude !== a.magnitude) return b.magnitude - a.magnitude;
      return HIDDEN_AXIS_KEYS.indexOf(a.key) - HIDDEN_AXIS_KEYS.indexOf(b.key);
    });
  }

  /**
   * @param {ResultInput} input
   * @param {ResultAxisInterpretation[]} dominantAxes
   * @returns {ResultArchetype}
   */
  function chooseArchetype(input, dominantAxes) {
    var h = input.hiddenAxes;
    if (input.deadMeter) {
      return {
        title: "The Collapsed Mandate",
        subtitle: meterLabels[input.deadMeter] + " hit zero before the run could settle.",
        ruleId: "dead-meter"
      };
    }
    if (h.machiavellian >= 3 && h.ruthless >= 2 && h.smooth >= 1) {
      return { title: "The Machine Politician", subtitle: "Control, discipline, and private leverage shaped the final state.", ruleId: "machine-politician" };
    }
    if (h.populist >= 3 && h.impulsive >= 2) {
      return { title: "The Rally Gambler", subtitle: "Crowd instinct and visible risk-taking did most of the work.", ruleId: "rally-gambler" };
    }
    if (h.machiavellian <= -3 && h.populist >= 2) {
      return { title: "The Movement Conscience", subtitle: "Public connection beat backroom calculation.", ruleId: "movement-conscience" };
    }
    if (h.impulsive <= -3 && h.smooth >= 1) {
      return { title: "The Institutional Manager", subtitle: "A careful run with a controlled public face.", ruleId: "institutional-manager" };
    }
    if (h.smooth <= -3 && h.impulsive >= 2) {
      return { title: "The Improvised Premiership", subtitle: "The run leaned into risk faster than it could explain itself.", ruleId: "improvised-premiership" };
    }
    if (h.ruthless <= -3 && h.machiavellian <= -2) {
      return { title: "The Reluctant Reformer", subtitle: "Principle and restraint limited the appetite for hard control.", ruleId: "reluctant-reformer" };
    }
    var first = dominantAxes[0] || getDominantAxes(input)[0];
    return {
      title: "The " + first.label + " Steward",
      subtitle: "No single rule dominated, so the strongest hidden axis names the temperament.",
      ruleId: "dominant-axis"
    };
  }

  /**
   * @param {ResultMeterKey} key
   * @param {number} value
   * @returns {ResultMeterInterpretation}
   */
  function interpretMeter(key, value) {
    /** @type {ResultMeterBand} */
    var band = value <= 20 ? "critical" : value <= 40 ? "strained" : value <= 70 ? "stable" : "strong";
    var textByBand = {
      critical: "The run ends with this pressure point close to collapse.",
      strained: "This pressure point survived, but it is carrying visible damage.",
      stable: "This pressure point is still workable at the end of the run.",
      strong: "This pressure point became a source of room for manoeuvre."
    };
    return {
      key: key,
      label: meterLabels[key],
      value: value,
      band: /** @type {ResultMeterBand} */ (band),
      text: textByBand[band]
    };
  }

  /**
   * This is intentionally transparent first-pass logic. Replace the string
   * matching with explicit policy metadata once v2 content is stable.
   *
   * @param {ResultInput} input
   * @returns {ResultLegacyProjection}
   */
  function projectLegacy(input) {
    var structuralIds = input.playedPolicyChoiceIds.filter(isStructuralPolicyId);
    var structuralLevel = clamp(structuralIds.length, 0, 3);
    var baseErosion = input.deadMeter ? 34 : [28, 19, 11, 4][structuralLevel];
    var authorityAverage = (input.meters.politics + input.meters.capital) / 2;
    var authorityDrag = Math.round((100 - authorityAverage) * 0.08);
    var totalErosion = baseErosion + authorityDrag;
    var meters = METER_KEYS.map(function(key) {
      var leftOffice = input.meters[key];
      var deadPenalty = input.deadMeter === key ? 8 : 0;
      var loss = Math.round((totalErosion + deadPenalty) * legacyMeterWeights[key]);
      var fiveYearsLater = clamp(leftOffice - loss, 0, 100);
      return {
        key: key,
        label: meterLabels[key],
        leftOffice: leftOffice,
        fiveYearsLater: fiveYearsLater,
        delta: fiveYearsLater - leftOffice
      };
    });
    return {
      structuralReformCount: structuralLevel,
      structuralReformIds: structuralIds,
      label: legacyLabel(structuralLevel),
      text: legacyText(structuralLevel),
      meters: meters
    };
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  function isStructuralPolicyId(id) {
    return structuralPolicyPatterns.some(function(pattern) {
      return pattern.test(id);
    });
  }

  /**
   * @param {number} structuralLevel
   * @returns {string}
   */
  function legacyLabel(structuralLevel) {
    if (structuralLevel <= 0) return "No structural reforms";
    if (structuralLevel === 1) return "Thin structural legacy";
    if (structuralLevel === 2) return "Partial structural legacy";
    return "Rooted structural legacy";
  }

  /**
   * @param {number} structuralLevel
   * @returns {string}
   */
  function legacyText(structuralLevel) {
    if (structuralLevel <= 0) return "Most gains evaporate once the machinery moves on.";
    if (structuralLevel === 1) return "One reform leaves a mark, but the wider record fades.";
    if (structuralLevel === 2) return "Some changes bed in; weaker gains still drain away.";
    return "Structural reforms give the record roots after office.";
  }

  /**
   * @param {ResultInput} input
   * @returns {ResultRunSummary}
   */
  function summarizeRun(input) {
    var policyIds = input.playedPolicyChoiceIds.slice().sort();
    var crisisEntries = input.history.filter(isCrisisEntry);
    var endgameEntries = input.history.filter(function(entry) {
      return entry.surfaceKind === "endgame" || entry.surfaceKind === "aftermath" || entry.surfaceId.indexOf("endgame") !== -1 || entry.surfaceId.indexOf("aftermath") !== -1;
    });
    var lastEntry = input.history.length ? input.history[input.history.length - 1] : null;
    return {
      policy: {
        title: "Policy",
        text: policyIds.length ? policyIds.length + " policy choices were recorded in the terminal state." : "No policy choices were recorded in the terminal state.",
        ids: policyIds
      },
      crisis: {
        title: "Crisis",
        text: crisisEntries.length ? crisisEntries.length + " crisis or pressure beats shaped the run." : "No crisis or pressure beats were recorded in the shared state.",
        ids: crisisEntries.map(function(entry) { return entry.surfaceId + "/" + entry.choiceId; })
      },
      endgame: {
        title: "Endgame",
        text: input.deadMeter ? "The run ended when " + meterLabels[input.deadMeter] + " hit zero." : endgameEntries.length ? "An explicit endgame or aftermath beat was recorded." : lastEntry ? "Last recorded beat: " + lastEntry.surfaceId + "/" + lastEntry.choiceId + "." : "No terminal history entry was provided.",
        ids: endgameEntries.map(function(entry) { return entry.surfaceId + "/" + entry.choiceId; })
      },
      tags: input.tags.slice().sort()
    };
  }

  /**
   * @param {ResultHistoryEntry} entry
   * @returns {boolean}
   */
  function isCrisisEntry(entry) {
    if (entry.surfaceId.indexOf("crisis-") === 0) return true;
    return entry.surfaceKind === "media" || entry.surfaceKind === "party" || entry.surfaceKind === "private" || entry.surfaceKind === "scandal" || entry.surfaceKind === "liability";
  }

  /**
   * @param {ResultAxisDefinition} axis
   * @param {number} value
   * @returns {string}
   */
  function describeAxis(axis, value) {
    if (value === 0) return axis.left + " / " + axis.right + " stayed balanced.";
    var side = value > 0 ? axis.right : axis.left;
    var strength = Math.abs(value) >= 5 ? "strongly" : Math.abs(value) >= 2 ? "noticeably" : "slightly";
    return "The run moved " + strength + " toward " + side + ".";
  }

  /**
   * @param {ResultHiddenAxisKey} key
   * @returns {ResultAxisDefinition}
   */
  function axisByKey(key) {
    for (var i = 0; i < data.axes.length; i += 1) {
      if (data.axes[i].key === key) return data.axes[i];
    }
    return data.axes[0];
  }

  /**
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /** @type {ResultModelApi} */
  var api = {
    calculateResult: calculateResult,
    buildShareUrl: buildShareUrl,
    findClosestLeaders: findClosestLeaders,
    toLeaderComparisonVector: toLeaderComparisonVector
  };

  root.ResultModel = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : /** @type {any} */ (window));
