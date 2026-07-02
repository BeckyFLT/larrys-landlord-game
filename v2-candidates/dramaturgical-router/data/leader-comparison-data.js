// @ts-check
/// <reference path="../harness/result-types.d.ts" />

(function(root) {
  "use strict";

  /** @type {ResultAxisDefinition[]} */
  var axes = [
    { key: "ruthless", left: "Weak", right: "Ruthless", short: "WR" },
    { key: "smooth", left: "Clumsy", right: "Smooth", short: "CS" },
    { key: "impulsive", left: "Cautious", right: "Impulsive", short: "CI" },
    { key: "populist", left: "Aloof", right: "Populist", short: "AP" },
    { key: "machiavellian", left: "Principled", right: "Machiavellian", short: "PM" }
  ];

  /** @type {Record<string, ResultPartyMeta>} */
  var parties = {
    all: { key: "all", name: "All", color: "#171717", order: 0 },
    labour: { key: "labour", name: "Labour", color: "#e31b23", order: 1 },
    conservative: { key: "conservative", name: "Conservative", color: "#1873c9", order: 2 },
    libdem: { key: "libdem", name: "Liberal Democrat", color: "#f6a800", order: 3 },
    snp: { key: "snp", name: "SNP", color: "#f6d538", order: 4 },
    green: { key: "green", name: "Green", color: "#2e9f47", order: 5 },
    reform: { key: "reform", name: "UKIP/Reform", color: "#20b9c8", order: 6 },
    plaid: { key: "plaid", name: "Plaid Cymru", color: "#5ab946", order: 7 }
  };

  /**
   * @param {string} id
   * @param {string} name
   * @param {string} party
   * @param {string} span
   * @param {string} role
   * @param {number} ruthless
   * @param {number} smooth
   * @param {number} impulsive
   * @param {number} populist
   * @param {number} machiavellian
   * @param {string} archetype
   * @param {string} confidence
   * @param {string} wikiUrl
   * @returns {LeaderComparisonRecord}
   */
  function leader(id, name, party, span, role, ruthless, smooth, impulsive, populist, machiavellian, archetype, confidence, wikiUrl) {
    return {
      id: id,
      name: name,
      party: party,
      partyName: parties[party] ? parties[party].name : party,
      span: span,
      role: role,
      archetype: archetype,
      confidence: confidence,
      wikiUrl: wikiUrl,
      scores: {
        ruthless: ruthless,
        smooth: smooth,
        impulsive: impulsive,
        populist: populist,
        machiavellian: machiavellian
      }
    };
  }

  /** @type {LeaderComparisonRecord[]} */
  var leaders = [
    leader("tony-blair", "Tony Blair", "labour", "1994-2007", "Labour leader and PM", 4, 5, 1, 1, 4, "Smooth machine politician", "High", "https://en.wikipedia.org/wiki/Tony_Blair"),
    leader("gordon-brown", "Gordon Brown", "labour", "2007-2010", "Labour leader and PM", 3, -2, -2, -1, 2, "Brooding institutional operator", "Medium", "https://en.wikipedia.org/wiki/Gordon_Brown"),
    leader("ed-miliband", "Ed Miliband", "labour", "2010-2015", "Labour leader", -2, -2, -1, 1, -2, "Principled soft reformer", "Medium", "https://en.wikipedia.org/wiki/Ed_Miliband"),
    leader("jeremy-corbyn", "Jeremy Corbyn", "labour", "2015-2020", "Labour leader", -4, -4, -1, 4, -5, "Movement purist", "High", "https://en.wikipedia.org/wiki/Jeremy_Corbyn"),
    leader("keir-starmer", "Keir Starmer", "labour", "2020-", "Labour leader and PM", 3, 2, -4, -3, 3, "Cautious institutional disciplinarian", "High", "https://en.wikipedia.org/wiki/Keir_Starmer"),

    leader("william-hague", "William Hague", "conservative", "1997-2001", "Conservative leader", 0, 1, -1, 1, 0, "Fluent opposition performer", "Medium", "https://en.wikipedia.org/wiki/William_Hague"),
    leader("iain-duncan-smith", "Iain Duncan Smith", "conservative", "2001-2003", "Conservative leader", -1, -3, 0, 0, -2, "Conviction leader without control", "Medium", "https://en.wikipedia.org/wiki/Iain_Duncan_Smith"),
    leader("michael-howard", "Michael Howard", "conservative", "2003-2005", "Conservative leader", 4, 1, -1, -1, 2, "Hard-edged stabiliser", "Medium", "https://en.wikipedia.org/wiki/Michael_Howard"),
    leader("david-cameron", "David Cameron", "conservative", "2005-2016", "Conservative leader and PM", 2, 4, 2, -2, 3, "Polished gambler", "High", "https://en.wikipedia.org/wiki/David_Cameron"),
    leader("theresa-may", "Theresa May", "conservative", "2016-2019", "Conservative leader and PM", 1, -3, -2, -4, 0, "Aloof duty-holder", "High", "https://en.wikipedia.org/wiki/Theresa_May"),
    leader("boris-johnson", "Boris Johnson", "conservative", "2019-2022", "Conservative leader and PM", 4, 1, 5, 5, 5, "Chaotic populist operator", "High", "https://en.wikipedia.org/wiki/Boris_Johnson"),
    leader("liz-truss", "Liz Truss", "conservative", "2022", "Conservative leader and PM", 1, -4, 5, -2, -2, "Ideological detonator", "Medium", "https://en.wikipedia.org/wiki/Liz_Truss"),
    leader("rishi-sunak", "Rishi Sunak", "conservative", "2022-2024", "Conservative leader and PM", 1, 2, -3, -3, 1, "Technocratic caretaker", "High", "https://en.wikipedia.org/wiki/Rishi_Sunak"),
    leader("kemi-badenoch", "Kemi Badenoch", "conservative", "2024-", "Conservative leader", 3, 0, 2, 2, 1, "Combative culture-war challenger", "Medium", "https://en.wikipedia.org/wiki/Kemi_Badenoch"),

    leader("paddy-ashdown", "Paddy Ashdown", "libdem", "1988-1999", "Liberal Democrat leader", 1, 3, 0, 2, -2, "Principled bridge-builder", "Medium", "https://en.wikipedia.org/wiki/Paddy_Ashdown"),
    leader("charles-kennedy", "Charles Kennedy", "libdem", "1999-2006", "Liberal Democrat leader", -2, 3, -1, 3, -2, "Warm anti-war liberal", "High", "https://en.wikipedia.org/wiki/Charles_Kennedy"),
    leader("menzies-campbell", "Menzies Campbell", "libdem", "2006-2007", "Liberal Democrat leader", -1, 1, -3, -2, -1, "Cautious elder statesman", "Medium", "https://en.wikipedia.org/wiki/Menzies_Campbell"),
    leader("nick-clegg", "Nick Clegg", "libdem", "2007-2015", "Liberal Democrat leader and Deputy PM", 1, 4, 1, -1, 3, "Polished coalition tactician", "High", "https://en.wikipedia.org/wiki/Nick_Clegg"),
    leader("tim-farron", "Tim Farron", "libdem", "2015-2017", "Liberal Democrat leader", -1, 0, 0, 2, -2, "Grassroots conscience liberal", "Medium", "https://en.wikipedia.org/wiki/Tim_Farron"),
    leader("vince-cable", "Vince Cable", "libdem", "2017-2019", "Liberal Democrat leader", -1, 2, -3, -2, -2, "Cautious liberal technocrat", "Medium", "https://en.wikipedia.org/wiki/Vince_Cable"),
    leader("jo-swinson", "Jo Swinson", "libdem", "2019", "Liberal Democrat leader", 0, -1, 3, -1, 1, "High-risk centrist campaigner", "Medium", "https://en.wikipedia.org/wiki/Jo_Swinson"),
    leader("ed-davey", "Ed Davey", "libdem", "2020-", "Liberal Democrat leader", -1, 2, 0, 4, -1, "Stunt-friendly local campaigner", "High", "https://en.wikipedia.org/wiki/Ed_Davey"),

    leader("alex-salmond", "Alex Salmond", "snp", "1990-2000, 2004-2014", "SNP leader and First Minister", 4, 4, 2, 4, 3, "National-populist strategist", "High", "https://en.wikipedia.org/wiki/Alex_Salmond"),
    leader("john-swinney", "John Swinney", "snp", "2000-2004, 2024-", "SNP leader and First Minister", -1, 2, -4, -2, -1, "Cautious institutional steward", "Medium", "https://en.wikipedia.org/wiki/John_Swinney"),
    leader("nicola-sturgeon", "Nicola Sturgeon", "snp", "2014-2023", "SNP leader and First Minister", 3, 4, -1, 2, 2, "Disciplined national communicator", "High", "https://en.wikipedia.org/wiki/Nicola_Sturgeon"),
    leader("humza-yousaf", "Humza Yousaf", "snp", "2023-2024", "SNP leader and First Minister", -1, -2, 1, 1, -1, "Fragile movement successor", "Medium", "https://en.wikipedia.org/wiki/Humza_Yousaf"),

    leader("caroline-lucas", "Caroline Lucas", "green", "2008-2012, 2016-2018", "Green leader and MP", -1, 3, -2, 2, -5, "Principled green anchor", "High", "https://en.wikipedia.org/wiki/Caroline_Lucas"),
    leader("natalie-bennett", "Natalie Bennett", "green", "2012-2016", "Green leader", -2, -4, -1, 1, -3, "Sincere but exposed campaigner", "Medium", "https://en.wikipedia.org/wiki/Natalie_Bennett"),
    leader("jonathan-bartley", "Jonathan Bartley", "green", "2016-2021", "Green co-leader", -1, 1, -1, 2, -3, "Campaigning green reformer", "Medium", "https://en.wikipedia.org/wiki/Jonathan_Bartley"),
    leader("sian-berry", "Sian Berry", "green", "2018-2021", "Green co-leader", -1, 2, -1, 3, -4, "Localist green populist", "Medium", "https://en.wikipedia.org/wiki/Si%C3%A2n_Berry"),
    leader("carla-denyer", "Carla Denyer", "green", "2021-2024", "Green co-leader", -1, 2, -1, 2, -4, "Practical green idealist", "Medium", "https://en.wikipedia.org/wiki/Carla_Denyer"),
    leader("adrian-ramsay", "Adrian Ramsay", "green", "2021-2024", "Green co-leader", -1, 2, -2, 1, -4, "Cautious green organiser", "Medium", "https://en.wikipedia.org/wiki/Adrian_Ramsay"),
    leader("zack-polanski", "Zack Polanski", "green", "2025-", "Green leader", 1, 2, 2, 5, -2, "Eco-populist insurgent", "Medium", "https://en.wikipedia.org/wiki/Zack_Polanski"),

    leader("nigel-farage", "Nigel Farage", "reform", "UKIP/Reform eras", "UKIP, Brexit Party, Reform UK leader", 3, 3, 3, 5, 4, "Anti-establishment ringmaster", "High", "https://en.wikipedia.org/wiki/Nigel_Farage"),
    leader("paul-nuttall", "Paul Nuttall", "reform", "2016-2017", "UKIP leader", 0, -3, 1, 3, 1, "Blunt successor populist", "Medium", "https://en.wikipedia.org/wiki/Paul_Nuttall"),
    leader("gerard-batten", "Gerard Batten", "reform", "2018-2019", "UKIP leader", 1, -2, 3, 4, 2, "Hard-right agitator", "Medium", "https://en.wikipedia.org/wiki/Gerard_Batten"),
    leader("richard-tice", "Richard Tice", "reform", "2021-2024", "Reform UK leader", 2, 2, 1, 3, 3, "Entrepreneurial populist manager", "Medium", "https://en.wikipedia.org/wiki/Richard_Tice"),

    leader("ieuan-wyn-jones", "Ieuan Wyn Jones", "plaid", "2000-2012", "Plaid Cymru leader", -1, 1, -2, 1, -2, "Measured nationalist negotiator", "Medium", "https://en.wikipedia.org/wiki/Ieuan_Wyn_Jones"),
    leader("leanne-wood", "Leanne Wood", "plaid", "2012-2018", "Plaid Cymru leader", -1, 1, 0, 3, -4, "Grassroots socialist nationalist", "Medium", "https://en.wikipedia.org/wiki/Leanne_Wood"),
    leader("adam-price", "Adam Price", "plaid", "2018-2023", "Plaid Cymru leader", 1, 2, 1, 2, -3, "Intellectual nationalist challenger", "Medium", "https://en.wikipedia.org/wiki/Adam_Price"),
    leader("rhun-ap-iorwerth", "Rhun ap Iorwerth", "plaid", "2023-", "Plaid Cymru leader", 0, 2, -1, 2, -2, "Smooth national broadcaster", "Medium", "https://en.wikipedia.org/wiki/Rhun_ap_Iorwerth")
  ];

  /** @type {ResultLeaderComparisonDataApi} */
  var api = {
    axes: axes,
    parties: parties,
    leaders: leaders,
    sourceNote: "All 41 records were copied from uk-leader-temperament-map.html into structured result data. The original exploratory rationale copy is intentionally omitted; the result model only needs scores, labels, and links."
  };

  root.ResultLeaderComparisonData = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : /** @type {any} */ (window));
