// @ts-check
/// <reference path="./result-types.d.ts" />

(function(root) {
  "use strict";

  var anyRoot = /** @type {any} */ (root);
  /** @type {ResultCodecApi|undefined} */
  var codec = anyRoot.ResultCodec;
  /** @type {ResultModelApi|undefined} */
  var model = anyRoot.ResultModel;
  /** @type {ResultFixturesApi|undefined} */
  var fixtures = anyRoot.ResultFixtures;
  /** @type {ResultLeaderComparisonDataApi|undefined} */
  var comparisonData = anyRoot.ResultLeaderComparisonData;

  document.addEventListener("DOMContentLoaded", function() {
    var els = {
      stamp: mustGet("result-stamp"),
      meta: mustGet("result-meta"),
      status: mustGet("result-status"),
      subtitle: mustGet("result-subtitle"),
      errors: mustGet("result-errors"),
      content: mustGet("result-content"),
      demos: mustGet("demo-links"),
      copy: /** @type {HTMLButtonElement} */ (mustGet("copy-share"))
    };

    renderDemoLinks(els.demos);
    if (!codec || !model || !comparisonData) {
      renderMissingDependencies(els);
      return;
    }

    var decoded = codec.decodeResultParams(root.location.search);
    if (!decoded.ok || !decoded.input) {
      renderInvalid(els, decoded);
      return;
    }

    var calculated = model.calculateResult(decoded.input, { baseHref: root.location.href, leaderCount: comparisonData.leaders.length });
    renderValid(els, calculated, decoded);
  });

  /**
   * @param {{ stamp: HTMLElement, meta: HTMLElement, status: HTMLElement, subtitle: HTMLElement, errors: HTMLElement, content: HTMLElement, demos: HTMLElement, copy: HTMLButtonElement }} els
   * @returns {void}
   */
  function renderMissingDependencies(els) {
    els.stamp.textContent = "MISSING MODULE";
    els.meta.textContent = "Result file rejected";
    els.status.textContent = "Result unavailable";
    els.subtitle.textContent = "The result page could not load its required data or modules.";
    renderErrors(els.errors, [{
      code: "missing-script",
      path: "scripts",
      message: "Expected leader data at ../data/leader-comparison-data.js and result modules in ./.",
      severity: "error"
    }], []);
    els.content.hidden = true;
    els.demos.hidden = false;
    els.copy.dataset.shareUrl = "";
    els.copy.disabled = true;
  }

  /**
   * @param {{ stamp: HTMLElement, meta: HTMLElement, status: HTMLElement, subtitle: HTMLElement, errors: HTMLElement, content: HTMLElement, demos: HTMLElement, copy: HTMLButtonElement }} els
   * @param {ResultDecodeOutcome} decoded
   * @returns {void}
   */
  function renderInvalid(els, decoded) {
    els.stamp.textContent = "BAD LINK";
    els.meta.textContent = "Result file rejected";
    els.status.textContent = "Invalid result";
    els.subtitle.textContent = "The link is missing required result data.";
    renderErrors(els.errors, decoded.errors, decoded.warnings);
    els.content.hidden = true;
    els.demos.hidden = false;
    els.copy.dataset.shareUrl = "";
    els.copy.disabled = true;
  }

  /**
   * @param {{ stamp: HTMLElement, meta: HTMLElement, status: HTMLElement, subtitle: HTMLElement, errors: HTMLElement, content: HTMLElement, demos: HTMLElement, copy: HTMLButtonElement }} els
   * @param {CalculatedResult} result
   * @param {ResultDecodeOutcome} decoded
   * @returns {void}
   */
  function renderValid(els, result, decoded) {
    var collapsed = !!result.input.deadMeter;
    var topMatch = getTopPrimeMinisterMatch(result);
    els.stamp.textContent = collapsed ? "MANDATE COLLAPSED" : "TERM FILED";
    els.meta.textContent = "BEAT " + result.input.beat + " / SEED " + result.input.seed;
    els.status.textContent = topMatch ? topMatch.leader.archetype : result.archetype.title;
    els.subtitle.textContent = topMatch ? "Nearest PM match: " + topMatch.leader.name + "." : result.archetype.subtitle;
    renderErrors(els.errors, decoded.errors, decoded.warnings);
    renderResult(els.content, result);
    els.content.hidden = false;
    els.demos.hidden = true;
    els.copy.dataset.shareUrl = result.shareUrl;
    els.copy.disabled = false;
    els.copy.addEventListener("click", function() {
      copyShareUrl(els.copy);
    });
  }

  /**
   * @param {HTMLElement} container
   * @returns {void}
   */
  function renderDemoLinks(container) {
    container.textContent = "";
    if (!codec || !fixtures) return;
    fixtures.fixtures.forEach(function(fixture) {
      var link = document.createElement("a");
      link.href = codec.encodeResultSearch(fixture.input);
      link.textContent = fixture.name;
      container.appendChild(link);
    });
  }

  /**
   * @param {HTMLElement} container
   * @param {ResultIssue[]} errors
   * @param {ResultIssue[]} warnings
   * @returns {void}
   */
  function renderErrors(container, errors, warnings) {
    container.textContent = "";
    var issues = errors.concat(warnings);
    if (!issues.length) return;
    var list = document.createElement("ul");
    issues.forEach(function(issue) {
      var item = document.createElement("li");
      item.textContent = issue.severity.toUpperCase() + " " + issue.path + ": " + issue.message;
      list.appendChild(item);
    });
    container.appendChild(list);
  }

  /**
   * @param {HTMLElement} container
   * @param {CalculatedResult} result
   * @returns {void}
   */
  function renderResult(container, result) {
    container.textContent = "";
    container.appendChild(renderLeaders(result));

    var grid = document.createElement("section");
    grid.className = "result-grid";
    grid.appendChild(renderLegacy(result));
    grid.appendChild(renderAxes(result));
    grid.appendChild(renderRecord(result));
    container.appendChild(grid);
  }

  /**
   * @param {CalculatedResult} result
   * @returns {HTMLElement}
   */
  function renderLegacy(result) {
    var section = panel("Public Record", "As left office -> 5 years later...");
    section.classList.add("panel--legacy");
    var card = document.createElement("article");
    card.className = "legacy-card";

    var summary = document.createElement("div");
    summary.className = "legacy-summary";
    var title = document.createElement("strong");
    title.textContent = "Legacy";
    var copy = document.createElement("div");
    copy.appendChild(smallCaps("limited"));
    summary.appendChild(title);
    summary.appendChild(copy);
    card.appendChild(summary);

    var head = document.createElement("div");
    head.className = "legacy-scale-head";
    head.appendChild(smallCaps("As left office"));
    head.appendChild(smallCaps("5 years later..."));
    card.appendChild(head);

    var rows = document.createElement("div");
    rows.className = "legacy-rows";
    result.legacy.meters.forEach(function(meter) {
      var row = document.createElement("div");
      row.className = "legacy-row";
      row.dataset.m = meter.key;

      var rowHead = document.createElement("div");
      rowHead.className = "legacy-row-head";
      var label = document.createElement("strong");
      label.textContent = meter.label;
      var values = document.createElement("span");
      values.className = "legacy-values";
      values.textContent = Math.round(meter.leftOffice) + " -> " + Math.round(meter.fiveYearsLater);
      rowHead.appendChild(label);
      rowHead.appendChild(values);
      row.appendChild(rowHead);

      var track = document.createElement("div");
      track.className = "legacy-track";
      track.setAttribute("aria-label", meter.label + " moves from " + Math.round(meter.leftOffice) + " as left office to " + Math.round(meter.fiveYearsLater) + " five years later.");
      var marker = document.createElement("span");
      marker.className = "legacy-marker";
      marker.style.left = clamp(meter.leftOffice, 0, 100) + "%";
      var fill = document.createElement("span");
      fill.className = "legacy-fill";
      fill.style.setProperty("--legacy-from", clamp(meter.leftOffice, 0, 100) + "%");
      fill.style.setProperty("--legacy-to", clamp(meter.fiveYearsLater, 0, 100) + "%");
      track.appendChild(fill);
      track.appendChild(marker);
      row.appendChild(track);
      rows.appendChild(row);
    });
    card.appendChild(rows);
    section.appendChild(card);
    return section;
  }

  /**
   * @param {CalculatedResult} result
   * @returns {HTMLElement}
   */
  function renderAxes(result) {
    var section = panel("Private Style", "Hidden axes");
    section.classList.add("panel--axes");
    var axes = document.createElement("div");
    axes.className = "axis-list";
    result.dominantAxes.forEach(function(axis) {
      var item = document.createElement("article");
      item.className = "axis-row";
      var labels = document.createElement("div");
      labels.className = "axis-labels";
      var left = document.createElement("span");
      left.className = "axis-name axis-name--left";
      left.textContent = axis.left;
      labels.appendChild(left);
      var score = document.createElement("strong");
      score.className = "axis-score";
      score.textContent = signed(axis.value);
      labels.appendChild(score);
      var right = document.createElement("span");
      right.className = "axis-name";
      right.textContent = axis.right;
      labels.appendChild(right);
      item.appendChild(labels);
      var track = document.createElement("div");
      track.className = "axis-track";
      var fill = document.createElement("span");
      fill.className = "axis-fill axis-fill--" + (axis.value >= 0 ? "pos" : "neg");
      fill.style.width = Math.abs(clamp(axis.value, -5, 5)) * 10 + "%";
      track.appendChild(fill);
      item.appendChild(track);
      axes.appendChild(item);
    });
    section.appendChild(axes);
    return section;
  }

  /**
   * @param {CalculatedResult} result
   * @returns {HTMLElement}
   */
  function renderLeaders(result) {
    var section = panel("You governed most like...", "Nearest comparison");
    section.classList.add("panel--leaders");
    var list = document.createElement("div");
    list.className = "leader-list";
    var match = getTopPrimeMinisterMatch(result);
    if (match) {
      var card = document.createElement("article");
      card.className = "leader-card";
      card.style.setProperty("--party-color", partyColor(match.leader.party));

      var head = document.createElement("div");
      head.className = "leader-head";
      var titleWrap = document.createElement("div");
      var titleRow = document.createElement("div");
      titleRow.className = "leader-title-row";
      var name = document.createElement("h3");
      name.textContent = match.leader.name;
      var link = document.createElement("a");
      link.className = "wiki-link";
      link.href = match.leader.wikiUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Wikipedia";
      titleRow.appendChild(name);
      titleRow.appendChild(link);
      titleWrap.appendChild(titleRow);
      titleWrap.appendChild(smallCaps(match.leader.partyName + " / " + match.leader.span));
      head.appendChild(titleWrap);
      card.appendChild(head);
      list.appendChild(card);
    }
    section.appendChild(list);
    return section;
  }

  /**
   * @param {CalculatedResult} result
   * @returns {HTMLElement}
   */
  function renderRecord(result) {
    var section = panel("Term Record", "Choices on file");
    section.classList.add("panel--record");
    var stack = document.createElement("div");
    stack.className = "record-stack";
    stack.appendChild(recordBlock("Policy", result.input.playedPolicyChoiceIds));
    stack.appendChild(recordBlock("Pressure", result.summary.crisis.ids));
    stack.appendChild(recordBlock("End", result.summary.endgame.ids.length ? result.summary.endgame.ids : [result.summary.endgame.text]));
    section.appendChild(stack);
    return section;
  }

  /**
   * @param {string} title
   * @param {string} kicker
   * @returns {HTMLElement}
   */
  function panel(title, kicker) {
    var node = document.createElement("section");
    node.className = "panel";
    var head = document.createElement("div");
    head.className = "panel-head";
    var small = document.createElement("p");
    small.className = "panel-kicker";
    small.textContent = kicker;
    var h2 = document.createElement("h2");
    h2.textContent = title;
    head.appendChild(small);
    head.appendChild(h2);
    node.appendChild(head);
    return node;
  }

  /**
   * @param {string} title
   * @param {string[]} ids
   * @returns {HTMLElement}
   */
  function recordBlock(title, ids) {
    var block = document.createElement("article");
    block.className = "record-block";
    block.appendChild(smallCaps(title));
    var chips = document.createElement("div");
    chips.className = "record-chips";
    var values = ids.length ? ids.slice(0, 4) : ["none"];
    values.forEach(function(id) {
      var chip = document.createElement("span");
      chip.className = "record-chip";
      chip.textContent = formatId(id);
      chips.appendChild(chip);
    });
    if (ids.length > values.length) {
      var more = document.createElement("span");
      more.className = "record-chip record-chip--more";
      more.textContent = "+" + (ids.length - values.length);
      chips.appendChild(more);
    }
    block.appendChild(chips);
    return block;
  }

  /**
   * @param {string} text
   * @returns {HTMLElement}
   */
  function smallCaps(text) {
    var node = document.createElement("p");
    node.className = "small-caps";
    node.textContent = text;
    return node;
  }

  /**
   * @param {string} id
   * @returns {string}
   */
  function formatId(id) {
    return id
      .replace(/^policy-/, "")
      .replace(/^crisis-/, "")
      .replace(/-turn-\d+/g, "")
      .replace(/\/.*$/, "")
      .split("-")
      .filter(Boolean)
      .map(function(part) { return part.charAt(0).toUpperCase() + part.slice(1); })
      .join(" ");
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  function signed(value) {
    return (value > 0 ? "+" : "") + value;
  }

  /**
   * @param {string} party
   * @returns {string}
   */
  function partyColor(party) {
    if (!comparisonData) return "#25c998";
    var meta = comparisonData.parties[party];
    return meta ? meta.color : "#25c998";
  }

  /**
   * @param {CalculatedResult} result
   * @returns {LeaderComparisonMatch|null}
   */
  function getTopPrimeMinisterMatch(result) {
    for (var index = 0; index < result.closestLeaders.length; index += 1) {
      if (isPrimeMinisterComparison(result.closestLeaders[index])) return result.closestLeaders[index];
    }
    return null;
  }

  /**
   * @param {LeaderComparisonMatch} match
   * @returns {boolean}
   */
  function isPrimeMinisterComparison(match) {
    return /\band PM\b/.test(match.leader.role);
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

  /**
   * @param {string} id
   * @returns {HTMLElement}
   */
  function mustGet(id) {
    var node = document.getElementById(id);
    if (!node) throw new Error("Missing element #" + id);
    return node;
  }

  /**
   * @param {HTMLButtonElement} button
   * @returns {void}
   */
  function copyShareUrl(button) {
    var value = button.dataset.shareUrl || "";
    var done = function() {
      button.textContent = "COPIED";
      root.setTimeout(function() { button.textContent = "SHARE YOUR RESULT"; }, 1200);
    };
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      root.navigator.clipboard.writeText(value).then(done).catch(function() {
        fallbackCopy(value);
        done();
      });
      return;
    }
    fallbackCopy(value);
    done();
  }

  /**
   * @param {string} value
   * @returns {void}
   */
  function fallbackCopy(value) {
    var textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
})(window);
