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
   * @param {ResultInput} input
   * @returns {URLSearchParams}
   */
  function encodeResultParams(input) {
    var canonical = normaliseResultInput(input);
    var validation = validateResultInput(canonical);
    if (!validation.ok) {
      throw new Error("Cannot encode invalid result input: " + validation.errors.map(function(error) { return error.path + " " + error.message; }).join("; "));
    }

    var params = new URLSearchParams();
    params.set("rv", "1");
    if (canonical.configTitle) params.set("config", canonical.configTitle);
    params.set("scenario", canonical.scenarioId);
    if (canonical.scenarioTitle) params.set("scenarioTitle", canonical.scenarioTitle);
    params.set("beat", formatNumber(canonical.beat));
    params.set("spent", formatNumber(canonical.scenarioSpent));
    params.set("seed", formatNumber(canonical.seed));
    params.set("dead", canonical.deadMeter || "none");

    METER_KEYS.forEach(function(key) {
      params.set("m." + key, formatNumber(canonical.meters[key]));
    });
    HIDDEN_AXIS_KEYS.forEach(function(key) {
      params.set("h." + key, formatNumber(canonical.hiddenAxes[key]));
    });
    canonical.tags.forEach(function(tag) {
      params.append("tag", tag);
    });
    canonical.playedPolicyChoiceIds.forEach(function(choiceId) {
      params.append("policy", choiceId);
    });
    canonical.history.forEach(function(entry) {
      params.append("event", encodeHistoryEntry(entry));
    });
    return params;
  }

  /**
   * @param {ResultInput} input
   * @returns {string}
   */
  function encodeResultSearch(input) {
    return "?" + encodeResultParams(input).toString();
  }

  /**
   * @param {string|URLSearchParams} search
   * @returns {ResultDecodeOutcome}
   */
  function decodeResultParams(search) {
    var params = toSearchParams(search);
    /** @type {ResultIssue[]} */
    var errors = [];
    /** @type {ResultIssue[]} */
    var warnings = [];
    /** @type {string[]} */
    var missingKeys = [];
    var rawVersion = params.get("rv");
    var schemaVersion = rawVersion == null ? null : Number(rawVersion);
    var unsupportedVersion = rawVersion != null && rawVersion !== "1";

    if (rawVersion == null || rawVersion === "") {
      missingKeys.push("rv");
      errors.push(issue("missing-param", "rv", "Missing result schema version."));
    } else if (!/^\d+$/.test(rawVersion)) {
      errors.push(issue("malformed-param", "rv", "Result schema version must be an integer."));
    } else if (unsupportedVersion) {
      errors.push(issue("unsupported-version", "rv", "Result schema version " + rawVersion + " is not supported by this result page."));
    }

    var decoded = {
      schemaVersion: schemaVersion,
      rawVersion: rawVersion,
      paramCount: Array.from(params.keys()).length,
      missingKeys: missingKeys,
      unsupportedVersion: unsupportedVersion
    };
    if (errors.length) {
      return outcome(null, decoded, errors, warnings);
    }

    var scenarioId = requiredString(params, "scenario", errors, missingKeys);
    var beat = requiredNumber(params, "beat", errors, missingKeys, true);
    var spent = requiredNumber(params, "spent", errors, missingKeys, true);
    var seed = requiredNumber(params, "seed", errors, missingKeys, true);
    var dead = requiredString(params, "dead", errors, missingKeys);
    /** @type {Record<ResultMeterKey, number>} */
    var meters = {
      living: requiredNumber(params, "m.living", errors, missingKeys, false),
      press: requiredNumber(params, "m.press", errors, missingKeys, false),
      politics: requiredNumber(params, "m.politics", errors, missingKeys, false),
      capital: requiredNumber(params, "m.capital", errors, missingKeys, false)
    };
    /** @type {Record<ResultHiddenAxisKey, number>} */
    var hiddenAxes = {
      ruthless: requiredNumber(params, "h.ruthless", errors, missingKeys, false),
      smooth: requiredNumber(params, "h.smooth", errors, missingKeys, false),
      impulsive: requiredNumber(params, "h.impulsive", errors, missingKeys, false),
      populist: requiredNumber(params, "h.populist", errors, missingKeys, false),
      machiavellian: requiredNumber(params, "h.machiavellian", errors, missingKeys, false)
    };
    /** @type {ResultHistoryEntry[]} */
    var history = [];
    params.getAll("event").forEach(function(value, index) {
      var entry = decodeHistoryEntry(value, index, errors);
      if (entry) history.push(entry);
    });

    if (errors.length) {
      return outcome(null, decoded, errors, warnings);
    }

    /** @type {ResultInput} */
    var input = {
      schemaVersion: 1,
      configTitle: params.get("config") || "",
      scenarioId: scenarioId,
      scenarioTitle: params.get("scenarioTitle") || "",
      beat: beat,
      scenarioSpent: spent,
      seed: seed,
      meters: meters,
      hiddenAxes: hiddenAxes,
      tags: uniqueSorted(params.getAll("tag")),
      playedPolicyChoiceIds: uniqueSorted(params.getAll("policy")),
      deadMeter: dead === "none" ? null : /** @type {ResultMeterKey} */ (dead),
      history: history
    };

    var validation = validateResultInput(input);
    errors = errors.concat(validation.errors);
    warnings = warnings.concat(validation.warnings);
    return outcome(errors.length ? null : normaliseResultInput(input), decoded, errors, warnings);
  }

  /**
   * @param {unknown} input
   * @returns {ResultValidationResult}
   */
  function validateResultInput(input) {
    /** @type {ResultIssue[]} */
    var errors = [];
    /** @type {ResultIssue[]} */
    var warnings = [];
    if (!input || typeof input !== "object") {
      errors.push(issue("invalid-input", "", "Result input must be an object."));
      return validation(errors, warnings);
    }
    var value = /** @type {ResultInput} */ (input);
    if (value.schemaVersion !== 1) errors.push(issue("unsupported-version", "schemaVersion", "Result input schemaVersion must be 1."));
    if (!isNonEmptyString(value.scenarioId)) errors.push(issue("missing-field", "scenarioId", "scenarioId is required."));
    checkInteger(value.beat, "beat", 0, errors);
    checkInteger(value.scenarioSpent, "scenarioSpent", 0, errors);
    checkInteger(value.seed, "seed", 0, errors);
    METER_KEYS.forEach(function(key) {
      var number = value.meters && value.meters[key];
      checkFinite(number, "meters." + key, errors);
      if (typeof number === "number" && (number < 0 || number > 100)) {
        errors.push(issue("out-of-range", "meters." + key, "Visible meters must be between 0 and 100."));
      }
    });
    HIDDEN_AXIS_KEYS.forEach(function(key) {
      var number = value.hiddenAxes && value.hiddenAxes[key];
      checkFinite(number, "hiddenAxes." + key, errors);
      if (typeof number === "number" && Math.abs(number) > 50) {
        warnings.push(warn("wide-axis", "hiddenAxes." + key, "Hidden axis value is outside the expected comparison range."));
      }
    });
    if (value.deadMeter != null && METER_KEYS.indexOf(value.deadMeter) === -1) {
      errors.push(issue("invalid-meter", "deadMeter", "deadMeter must be one of the visible meter keys or null."));
    }
    validateStringArray(value.tags, "tags", errors);
    validateStringArray(value.playedPolicyChoiceIds, "playedPolicyChoiceIds", errors);
    if (!Array.isArray(value.history)) {
      errors.push(issue("invalid-history", "history", "history must be an array."));
    } else {
      value.history.forEach(function(entry, index) {
        checkInteger(entry.beat, "history." + index + ".beat", 0, errors);
        if (!isNonEmptyString(entry.surfaceId)) errors.push(issue("missing-field", "history." + index + ".surfaceId", "surfaceId is required."));
        if (!isNonEmptyString(entry.choiceId)) errors.push(issue("missing-field", "history." + index + ".choiceId", "choiceId is required."));
        if (SURFACE_KINDS.indexOf(entry.surfaceKind) === -1) {
          errors.push(issue("invalid-kind", "history." + index + ".surfaceKind", "surfaceKind is not recognised."));
        }
        validateStringArray(entry.tags, "history." + index + ".tags", errors);
      });
    }
    return validation(errors, warnings);
  }

  /**
   * @param {ResultInput} input
   * @returns {ResultInput}
   */
  function normaliseResultInput(input) {
    /** @type {ResultInput} */
    var normalised = {
      schemaVersion: 1,
      configTitle: String(input.configTitle || ""),
      scenarioId: String(input.scenarioId || ""),
      scenarioTitle: String(input.scenarioTitle || ""),
      beat: toFiniteNumber(input.beat, 0),
      scenarioSpent: toFiniteNumber(input.scenarioSpent, 0),
      seed: toFiniteNumber(input.seed, 0),
      meters: {
        living: toFiniteNumber(input.meters && input.meters.living, 0),
        press: toFiniteNumber(input.meters && input.meters.press, 0),
        politics: toFiniteNumber(input.meters && input.meters.politics, 0),
        capital: toFiniteNumber(input.meters && input.meters.capital, 0)
      },
      hiddenAxes: {
        ruthless: toFiniteNumber(input.hiddenAxes && input.hiddenAxes.ruthless, 0),
        smooth: toFiniteNumber(input.hiddenAxes && input.hiddenAxes.smooth, 0),
        impulsive: toFiniteNumber(input.hiddenAxes && input.hiddenAxes.impulsive, 0),
        populist: toFiniteNumber(input.hiddenAxes && input.hiddenAxes.populist, 0),
        machiavellian: toFiniteNumber(input.hiddenAxes && input.hiddenAxes.machiavellian, 0)
      },
      tags: uniqueSorted(input.tags || []),
      playedPolicyChoiceIds: uniqueSorted(input.playedPolicyChoiceIds || []),
      deadMeter: input.deadMeter || null,
      history: (input.history || []).map(function(entry) {
        return {
          beat: toFiniteNumber(entry.beat, 0),
          surfaceId: String(entry.surfaceId || ""),
          surfaceKind: SURFACE_KINDS.indexOf(entry.surfaceKind) === -1 ? "unknown" : entry.surfaceKind,
          choiceId: String(entry.choiceId || ""),
          tags: uniqueSorted(entry.tags || [])
        };
      })
    };
    return normalised;
  }

  /**
   * @param {ResultHistoryEntry} entry
   * @returns {string}
   */
  function encodeHistoryEntry(entry) {
    return [
      encodePiece(String(entry.beat)),
      encodePiece(entry.surfaceKind),
      encodePiece(entry.surfaceId),
      encodePiece(entry.choiceId),
      uniqueSorted(entry.tags || []).map(encodePiece).join(",")
    ].join("~");
  }

  /**
   * @param {string} value
   * @param {number} index
   * @param {ResultIssue[]} errors
   * @returns {ResultHistoryEntry|null}
   */
  function decodeHistoryEntry(value, index, errors) {
    var path = "event." + index;
    var parts = value.split("~");
    if (parts.length !== 5) {
      errors.push(issue("malformed-event", path, "History event must have beat, kind, surfaceId, choiceId, and tags fields."));
      return null;
    }
    var beatText = decodePiece(parts[0], path + ".beat", errors);
    var beat = Number(beatText);
    if (!Number.isFinite(beat) || !Number.isInteger(beat) || beat < 0) {
      errors.push(issue("malformed-event", path + ".beat", "History beat must be a non-negative integer."));
    }
    var kind = decodePiece(parts[1], path + ".surfaceKind", errors);
    var surfaceId = decodePiece(parts[2], path + ".surfaceId", errors);
    var choiceId = decodePiece(parts[3], path + ".choiceId", errors);
    var tags = parts[4] ? parts[4].split(",").filter(Boolean).map(function(item) {
      return decodePiece(item, path + ".tags", errors);
    }) : [];
    return {
      beat: Number.isFinite(beat) ? beat : 0,
      surfaceId: surfaceId,
      surfaceKind: SURFACE_KINDS.indexOf(/** @type {ResultSurfaceKind} */ (kind)) === -1 ? "unknown" : /** @type {ResultSurfaceKind} */ (kind),
      choiceId: choiceId,
      tags: uniqueSorted(tags)
    };
  }

  /**
   * @param {string|URLSearchParams} search
   * @returns {URLSearchParams}
   */
  function toSearchParams(search) {
    if (search instanceof URLSearchParams) return new URLSearchParams(search.toString());
    var text = String(search || "");
    return new URLSearchParams(text.charAt(0) === "?" ? text.slice(1) : text);
  }

  /**
   * @param {URLSearchParams} params
   * @param {string} key
   * @param {ResultIssue[]} errors
   * @param {string[]} missing
   * @returns {string}
   */
  function requiredString(params, key, errors, missing) {
    var value = params.get(key);
    if (value == null || value === "") {
      missing.push(key);
      errors.push(issue("missing-param", key, "Missing required query parameter."));
      return "";
    }
    return value;
  }

  /**
   * @param {URLSearchParams} params
   * @param {string} key
   * @param {ResultIssue[]} errors
   * @param {string[]} missing
   * @param {boolean} integerOnly
   * @returns {number}
   */
  function requiredNumber(params, key, errors, missing, integerOnly) {
    var value = params.get(key);
    if (value == null || value === "") {
      missing.push(key);
      errors.push(issue("missing-param", key, "Missing required numeric query parameter."));
      return 0;
    }
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      errors.push(issue("malformed-param", key, "Expected a numeric value."));
      return 0;
    }
    var number = Number(value);
    if (!Number.isFinite(number) || (integerOnly && !Number.isInteger(number))) {
      errors.push(issue("malformed-param", key, integerOnly ? "Expected an integer value." : "Expected a finite numeric value."));
      return 0;
    }
    return number;
  }

  /**
   * @param {ResultIssue[]} errors
   * @param {ResultIssue[]} warnings
   * @returns {ResultValidationResult}
   */
  function validation(errors, warnings) {
    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  /**
   * @param {ResultInput|null} input
   * @param {DecodedResultParams} decoded
   * @param {ResultIssue[]} errors
   * @param {ResultIssue[]} warnings
   * @returns {ResultDecodeOutcome}
   */
  function outcome(input, decoded, errors, warnings) {
    decoded.missingKeys = uniqueSorted(decoded.missingKeys);
    return {
      ok: errors.length === 0 && input != null,
      input: errors.length === 0 ? input : null,
      decoded: decoded,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * @param {string} code
   * @param {string} path
   * @param {string} message
   * @returns {ResultIssue}
   */
  function issue(code, path, message) {
    return { code: code, path: path, message: message, severity: "error" };
  }

  /**
   * @param {string} code
   * @param {string} path
   * @param {string} message
   * @returns {ResultIssue}
   */
  function warn(code, path, message) {
    return { code: code, path: path, message: message, severity: "warning" };
  }

  /**
   * @param {unknown} value
   * @returns {boolean}
   */
  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  /**
   * @param {unknown} value
   * @param {string} path
   * @param {number} min
   * @param {ResultIssue[]} errors
   */
  function checkInteger(value, path, min, errors) {
    checkFinite(value, path, errors);
    if (typeof value === "number" && (!Number.isInteger(value) || value < min)) {
      errors.push(issue("invalid-integer", path, "Expected an integer greater than or equal to " + min + "."));
    }
  }

  /**
   * @param {unknown} value
   * @param {string} path
   * @param {ResultIssue[]} errors
   */
  function checkFinite(value, path, errors) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(issue("invalid-number", path, "Expected a finite number."));
    }
  }

  /**
   * @param {unknown} value
   * @param {string} path
   * @param {ResultIssue[]} errors
   */
  function validateStringArray(value, path, errors) {
    if (!Array.isArray(value)) {
      errors.push(issue("invalid-array", path, "Expected an array of strings."));
      return;
    }
    value.forEach(function(item, index) {
      if (typeof item !== "string") errors.push(issue("invalid-string", path + "." + index, "Expected a string."));
    });
  }

  /**
   * @param {unknown} value
   * @param {number} fallback
   * @returns {number}
   */
  function toFiniteNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  function formatNumber(value) {
    return String(Math.round(value * 1000) / 1000);
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

  /**
   * @param {string} value
   * @returns {string}
   */
  function encodePiece(value) {
    return encodeURIComponent(value).replace(/~/g, "%7E");
  }

  /**
   * @param {string} value
   * @param {string} path
   * @param {ResultIssue[]} errors
   * @returns {string}
   */
  function decodePiece(value, path, errors) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      errors.push(issue("malformed-escape", path, "Could not decode escaped history field."));
      return "";
    }
  }

  /** @type {ResultCodecApi} */
  var api = {
    SCHEMA_VERSION: 1,
    METER_KEYS: METER_KEYS,
    HIDDEN_AXIS_KEYS: HIDDEN_AXIS_KEYS,
    SURFACE_KINDS: SURFACE_KINDS,
    encodeResultParams: encodeResultParams,
    encodeResultSearch: encodeResultSearch,
    decodeResultParams: decodeResultParams,
    validateResultInput: validateResultInput,
    normaliseResultInput: normaliseResultInput
  };

  root.ResultCodec = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : /** @type {any} */ (window));
