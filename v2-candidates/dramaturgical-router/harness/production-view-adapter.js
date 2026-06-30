// @ts-check
/// <reference path="./router-types.d.ts" />

/* =============================================================
   Production-facing view adapter for v2 dramaturgical router data.

   This pure adapter is the first #54 seam: it turns RouterSurface records into
   stable view models the themed game can consume without knowing the full
   balance-data shape. It deliberately does not drive game state or render DOM.
   ============================================================= */

(function(root) {
  "use strict";

  /** @type {Record<RouterSurfaceKind, RouterProductionFallbackPresentation>} */
  var FALLBACK_BY_KIND = {
    policy: { label: "Policy", accent: "#25C998", altText: "" },
    media: { label: "Media", accent: "#FF335E", altText: "" },
    party: { label: "Party", accent: "#FFC93C", altText: "" },
    private: { label: "Private", accent: "#4D7CFF", altText: "" },
    scandal: { label: "Scandal", accent: "#FF335E", altText: "" },
    cabinet: { label: "Cabinet", accent: "#FFC93C", altText: "" },
    liability: { label: "Liability", accent: "#FF335E", altText: "" },
    endgame: { label: "Endgame", accent: "#0C0C0C", altText: "" },
    aftermath: { label: "Aftermath", accent: "#4D7CFF", altText: "" }
  };

  /**
   * @param {RouterConfig} config
   * @returns {RouterProductionSurfaceView[]}
   */
  function adaptConfig(config) {
    return config.surfaces.map(function(surface) {
      return adaptSurface(config, surface);
    });
  }

  /**
   * @param {RouterConfig} config
   * @param {RouterSurface} surface
   * @returns {RouterProductionSurfaceView}
   */
  function adaptSurface(config, surface) {
    void config;
    return {
      id: surface.id,
      kind: surface.kind,
      presentation: surface.presentation,
      weight: surface.weight,
      title: surface.title,
      scene: surface.scene,
      source: surface.source,
      sourceRef: cloneOptional(surface.sourceRef),
      choices: surface.choices.map(function(choice) {
        return adaptChoice(surface, choice);
      })
    };
  }

  /**
   * @param {RouterSurface} surface
   * @param {RouterChoice} choice
   * @returns {RouterProductionChoiceView}
   */
  function adaptChoice(surface, choice) {
    var legacy = choice.legacyPresentation || {};
    var media = mediaFor(surface, legacy);
    return {
      id: choice.id,
      label: choice.label,
      cardRole: choice.cardRole,
      sponsor: choice.sponsor,
      note: choice.note,
      endNote: choice.endNote,
      visibleImpacts: cloneVisible(choice.impacts),
      lock: cloneOptional(choice.lock),
      cabinetPick: cloneOptional(legacy.cabinetPick),
      policyCard: cloneOptional(legacy.card),
      sourceCardName: legacy.sourceCardName,
      sourceMinisterRole: legacy.sourceMinisterRole,
      originalDeltas: cloneOptional(legacy.originalDeltas),
      reaction: cloneOptional(legacy.reaction),
      requiresMeter: legacy.requiresMeter,
      lockText: legacy.lockText,
      media: media,
      sourceRef: cloneOptional(choice.sourceRef)
    };
  }

  /**
   * @param {RouterSurface} surface
   * @param {RouterLegacyPresentation} legacy
   * @returns {RouterProductionChoiceMedia}
   */
  function mediaFor(surface, legacy) {
    var fallback = fallbackFor(surface);
    if (legacy.cabinetPick) {
      return {
        source: "legacy-cabinet",
        image: legacy.cabinetPick.image,
        altText: legacy.cabinetPick.altText || "",
        dotColor: legacy.cabinetPick.dotColor,
        fallback: fallback
      };
    }
    if (legacy.card) {
      return {
        source: "legacy-card",
        image: legacy.card.image,
        altText: legacy.card.altText || "",
        dot: legacy.card.dot,
        rotation: legacy.card.rotation,
        fallback: fallback
      };
    }
    return {
      source: "fallback",
      altText: fallback.altText,
      fallback: fallback
    };
  }

  /**
   * @param {RouterSurface} surface
   * @returns {RouterProductionFallbackPresentation}
   */
  function fallbackFor(surface) {
    var fallback = FALLBACK_BY_KIND[surface.kind] || FALLBACK_BY_KIND.private;
    return {
      label: fallback.label,
      accent: fallback.accent,
      altText: fallback.altText
    };
  }

  /**
   * @param {RouterImpactSet|undefined} impacts
   * @returns {RouterMeterImpact[]}
   */
  function cloneVisible(impacts) {
    return (impacts && impacts.visible || []).map(function(impact) {
      return { meter: impact.meter, delta: impact.delta };
    });
  }

  /**
   * @template T
   * @param {T|undefined} value
   * @returns {T|undefined}
   */
  function cloneOptional(value) {
    if (value == null) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  /** @type {RouterProductionViewAdapterApi} */
  var api = {
    adaptSurface: adaptSurface,
    adaptConfig: adaptConfig
  };

  var globalRoot = /** @type {any} */ (root);
  globalRoot.DramaturgicalRouterProductionViewAdapter = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
