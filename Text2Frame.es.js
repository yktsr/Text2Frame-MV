function ve(v, n) {
  for (var s = 0; s < n.length; s++) {
    const a = n[s];
    if (typeof a != "string" && !Array.isArray(a)) {
      for (const c in a)
        if (c !== "default" && !(c in v)) {
          const l = Object.getOwnPropertyDescriptor(a, c);
          l && Object.defineProperty(v, c, l.get ? l : {
            enumerable: !0,
            get: () => a[c]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(v, Symbol.toStringTag, { value: "Module" }));
}
function _s(v) {
  return v && v.__esModule && Object.prototype.hasOwnProperty.call(v, "default") ? v.default : v;
}
function ae(v) {
  if (v.__esModule)
    return v;
  var n = v.default;
  if (typeof n == "function") {
    var s = function a() {
      return this instanceof a ? Reflect.construct(n, arguments, this.constructor) : n.apply(this, arguments);
    };
    s.prototype = n.prototype;
  } else
    s = {};
  return Object.defineProperty(s, "__esModule", { value: !0 }), Object.keys(v).forEach(function(a) {
    var c = Object.getOwnPropertyDescriptor(v, a);
    Object.defineProperty(s, a, c.get ? c : {
      enumerable: !0,
      get: function() {
        return v[a];
      }
    });
  }), s;
}
function ps(v) {
  throw new Error('Could not dynamically require "' + v + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var _t = { exports: {} };
const sl = {}, rl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: sl
}, Symbol.toStringTag, { value: "Module" })), re = /* @__PURE__ */ ae(rl);
var ht = { exports: {} }, je = {}, We = {};
let ws = class extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @constructor
   */
  constructor(n, s, a) {
    super(a), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name, this.code = s, this.exitCode = n, this.nestedError = void 0;
  }
}, al = class extends ws {
  /**
   * Constructs the InvalidArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   * @constructor
   */
  constructor(n) {
    super(1, "commander.invalidArgument", n), Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name;
  }
};
var ol = We.CommanderError = ws, il = We.InvalidArgumentError = al;
const cl = /* @__PURE__ */ ve({
  __proto__: null,
  CommanderError: ol,
  InvalidArgumentError: il,
  default: We
}, [We]), Ge = /* @__PURE__ */ ae(cl), { InvalidArgumentError: ul } = Ge;
let ll = class {
  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @param {string} name
   * @param {string} [description]
   */
  constructor(n, s) {
    switch (this.description = s || "", this.variadic = !1, this.parseArg = void 0, this.defaultValue = void 0, this.defaultValueDescription = void 0, this.argChoices = void 0, n[0]) {
      case "<":
        this.required = !0, this._name = n.slice(1, -1);
        break;
      case "[":
        this.required = !1, this._name = n.slice(1, -1);
        break;
      default:
        this.required = !0, this._name = n;
        break;
    }
    this._name.length > 3 && this._name.slice(-3) === "..." && (this.variadic = !0, this._name = this._name.slice(0, -3));
  }
  /**
   * Return argument name.
   *
   * @return {string}
   */
  name() {
    return this._name;
  }
  /**
   * @api private
   */
  _concatValue(n, s) {
    return s === this.defaultValue || !Array.isArray(s) ? [n] : s.concat(n);
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Argument}
   */
  default(n, s) {
    return this.defaultValue = n, this.defaultValueDescription = s, this;
  }
  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   *
   * @param {Function} [fn]
   * @return {Argument}
   */
  argParser(n) {
    return this.parseArg = n, this;
  }
  /**
   * Only allow argument value to be one of choices.
   *
   * @param {string[]} values
   * @return {Argument}
   */
  choices(n) {
    return this.argChoices = n.slice(), this.parseArg = (s, a) => {
      if (!this.argChoices.includes(s))
        throw new ul(`Allowed choices are ${this.argChoices.join(", ")}.`);
      return this.variadic ? this._concatValue(s, a) : s;
    }, this;
  }
  /**
   * Make argument required.
   */
  argRequired() {
    return this.required = !0, this;
  }
  /**
   * Make argument optional.
   */
  argOptional() {
    return this.required = !1, this;
  }
};
function ml(v) {
  const n = v.name() + (v.variadic === !0 ? "..." : "");
  return v.required ? "<" + n + ">" : "[" + n + "]";
}
var pl = je.Argument = ll, hl = je.humanReadableArgName = ml;
const dl = /* @__PURE__ */ ve({
  __proto__: null,
  Argument: pl,
  default: je,
  humanReadableArgName: hl
}, [je]), wt = /* @__PURE__ */ ae(dl);
var dt = {}, ft = {};
const { humanReadableArgName: fl } = wt;
let gl = class {
  constructor() {
    this.helpWidth = void 0, this.sortSubcommands = !1, this.sortOptions = !1, this.showGlobalOptions = !1;
  }
  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */
  visibleCommands(n) {
    const s = n.commands.filter((a) => !a._hidden);
    if (n._hasImplicitHelpCommand()) {
      const [, a, c] = n._helpCommandnameAndArgs.match(/([^ ]+) *(.*)/), l = n.createCommand(a).helpOption(!1);
      l.description(n._helpCommandDescription), c && l.arguments(c), s.push(l);
    }
    return this.sortSubcommands && s.sort((a, c) => a.name().localeCompare(c.name())), s;
  }
  /**
   * Compare options for sort.
   *
   * @param {Option} a
   * @param {Option} b
   * @returns number
   */
  compareOptions(n, s) {
    const a = (c) => c.short ? c.short.replace(/^-/, "") : c.long.replace(/^--/, "");
    return a(n).localeCompare(a(s));
  }
  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleOptions(n) {
    const s = n.options.filter((l) => !l.hidden), a = n._hasHelpOption && n._helpShortFlag && !n._findOption(n._helpShortFlag), c = n._hasHelpOption && !n._findOption(n._helpLongFlag);
    if (a || c) {
      let l;
      a ? c ? l = n.createOption(n._helpFlags, n._helpDescription) : l = n.createOption(n._helpShortFlag, n._helpDescription) : l = n.createOption(n._helpLongFlag, n._helpDescription), s.push(l);
    }
    return this.sortOptions && s.sort(this.compareOptions), s;
  }
  /**
   * Get an array of the visible global options. (Not including help.)
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */
  visibleGlobalOptions(n) {
    if (!this.showGlobalOptions)
      return [];
    const s = [];
    for (let a = n.parent; a; a = a.parent) {
      const c = a.options.filter((l) => !l.hidden);
      s.push(...c);
    }
    return this.sortOptions && s.sort(this.compareOptions), s;
  }
  /**
   * Get an array of the arguments if any have a description.
   *
   * @param {Command} cmd
   * @returns {Argument[]}
   */
  visibleArguments(n) {
    return n._argsDescription && n.registeredArguments.forEach((s) => {
      s.description = s.description || n._argsDescription[s.name()] || "";
    }), n.registeredArguments.find((s) => s.description) ? n.registeredArguments : [];
  }
  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandTerm(n) {
    const s = n.registeredArguments.map((a) => fl(a)).join(" ");
    return n._name + (n._aliases[0] ? "|" + n._aliases[0] : "") + (n.options.length ? " [options]" : "") + // simplistic check for non-help option
    (s ? " " + s : "");
  }
  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */
  optionTerm(n) {
    return n.flags;
  }
  /**
   * Get the argument term to show in the list of arguments.
   *
   * @param {Argument} argument
   * @returns {string}
   */
  argumentTerm(n) {
    return n.name();
  }
  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestSubcommandTermLength(n, s) {
    return s.visibleCommands(n).reduce((a, c) => Math.max(a, s.subcommandTerm(c).length), 0);
  }
  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestOptionTermLength(n, s) {
    return s.visibleOptions(n).reduce((a, c) => Math.max(a, s.optionTerm(c).length), 0);
  }
  /**
   * Get the longest global option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestGlobalOptionTermLength(n, s) {
    return s.visibleGlobalOptions(n).reduce((a, c) => Math.max(a, s.optionTerm(c).length), 0);
  }
  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  longestArgumentTermLength(n, s) {
    return s.visibleArguments(n).reduce((a, c) => Math.max(a, s.argumentTerm(c).length), 0);
  }
  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandUsage(n) {
    let s = n._name;
    n._aliases[0] && (s = s + "|" + n._aliases[0]);
    let a = "";
    for (let c = n.parent; c; c = c.parent)
      a = c.name() + " " + a;
    return a + s + " " + n.usage();
  }
  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */
  commandDescription(n) {
    return n.description();
  }
  /**
   * Get the subcommand summary to show in the list of subcommands.
   * (Fallback to description for backwards compatibility.)
   *
   * @param {Command} cmd
   * @returns {string}
   */
  subcommandDescription(n) {
    return n.summary() || n.description();
  }
  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */
  optionDescription(n) {
    const s = [];
    return n.argChoices && s.push(
      // use stringify to match the display of the default value
      `choices: ${n.argChoices.map((a) => JSON.stringify(a)).join(", ")}`
    ), n.defaultValue !== void 0 && (n.required || n.optional || n.isBoolean() && typeof n.defaultValue == "boolean") && s.push(`default: ${n.defaultValueDescription || JSON.stringify(n.defaultValue)}`), n.presetArg !== void 0 && n.optional && s.push(`preset: ${JSON.stringify(n.presetArg)}`), n.envVar !== void 0 && s.push(`env: ${n.envVar}`), s.length > 0 ? `${n.description} (${s.join(", ")})` : n.description;
  }
  /**
   * Get the argument description to show in the list of arguments.
   *
   * @param {Argument} argument
   * @return {string}
   */
  argumentDescription(n) {
    const s = [];
    if (n.argChoices && s.push(
      // use stringify to match the display of the default value
      `choices: ${n.argChoices.map((a) => JSON.stringify(a)).join(", ")}`
    ), n.defaultValue !== void 0 && s.push(`default: ${n.defaultValueDescription || JSON.stringify(n.defaultValue)}`), s.length > 0) {
      const a = `(${s.join(", ")})`;
      return n.description ? `${n.description} ${a}` : a;
    }
    return n.description;
  }
  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */
  formatHelp(n, s) {
    const a = s.padWidth(n, s), c = s.helpWidth || 80, l = 2, _ = 2;
    function O(M, x) {
      if (x) {
        const we = `${M.padEnd(a + _)}${x}`;
        return s.wrap(we, c - l, a + _);
      }
      return M;
    }
    function b(M) {
      return M.join(`
`).replace(/^/gm, " ".repeat(l));
    }
    let y = [`Usage: ${s.commandUsage(n)}`, ""];
    const L = s.commandDescription(n);
    L.length > 0 && (y = y.concat([s.wrap(L, c, 0), ""]));
    const N = s.visibleArguments(n).map((M) => O(s.argumentTerm(M), s.argumentDescription(M)));
    N.length > 0 && (y = y.concat(["Arguments:", b(N), ""]));
    const R = s.visibleOptions(n).map((M) => O(s.optionTerm(M), s.optionDescription(M)));
    if (R.length > 0 && (y = y.concat(["Options:", b(R), ""])), this.showGlobalOptions) {
      const M = s.visibleGlobalOptions(n).map((x) => O(s.optionTerm(x), s.optionDescription(x)));
      M.length > 0 && (y = y.concat(["Global Options:", b(M), ""]));
    }
    const J = s.visibleCommands(n).map((M) => O(s.subcommandTerm(M), s.subcommandDescription(M)));
    return J.length > 0 && (y = y.concat(["Commands:", b(J), ""])), y.join(`
`);
  }
  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */
  padWidth(n, s) {
    return Math.max(
      s.longestOptionTermLength(n, s),
      s.longestGlobalOptionTermLength(n, s),
      s.longestSubcommandTermLength(n, s),
      s.longestArgumentTermLength(n, s)
    );
  }
  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   *
   * @param {string} str
   * @param {number} width
   * @param {number} indent
   * @param {number} [minColumnWidth=40]
   * @return {string}
   *
   */
  wrap(n, s, a, c = 40) {
    const l = " \\f\\t\\v   -   　\uFEFF", _ = new RegExp(`[\\n][${l}]+`);
    if (n.match(_))
      return n;
    const O = s - a;
    if (O < c)
      return n;
    const b = n.slice(0, a), y = n.slice(a).replace(`\r
`, `
`), L = " ".repeat(a), R = "\\s​", J = new RegExp(`
|.{1,${O - 1}}([${R}]|$)|[^${R}]+?([${R}]|$)`, "g"), M = y.match(J) || [];
    return b + M.map((x, we) => x === `
` ? "" : (we > 0 ? L : "") + x.trimEnd()).join(`
`);
  }
};
var _l = ft.Help = gl;
const wl = /* @__PURE__ */ ve({
  __proto__: null,
  Help: _l,
  default: ft
}, [ft]), bs = /* @__PURE__ */ ae(wl);
var Ne = {};
const { InvalidArgumentError: bl } = Ge;
let Cl = class {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */
  constructor(n, s) {
    this.flags = n, this.description = s || "", this.required = n.includes("<"), this.optional = n.includes("["), this.variadic = /\w\.\.\.[>\]]$/.test(n), this.mandatory = !1;
    const a = Cs(n);
    this.short = a.shortFlag, this.long = a.longFlag, this.negate = !1, this.long && (this.negate = this.long.startsWith("--no-")), this.defaultValue = void 0, this.defaultValueDescription = void 0, this.presetArg = void 0, this.envVar = void 0, this.parseArg = void 0, this.hidden = !1, this.argChoices = void 0, this.conflictsWith = [], this.implied = void 0;
  }
  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {*} value
   * @param {string} [description]
   * @return {Option}
   */
  default(n, s) {
    return this.defaultValue = n, this.defaultValueDescription = s, this;
  }
  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   *
   * @param {*} arg
   * @return {Option}
   */
  preset(n) {
    return this.presetArg = n, this;
  }
  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   *
   * @param {string | string[]} names
   * @return {Option}
   */
  conflicts(n) {
    return this.conflictsWith = this.conflictsWith.concat(n), this;
  }
  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   *
   * @param {Object} impliedOptionValues
   * @return {Option}
   */
  implies(n) {
    let s = n;
    return typeof n == "string" && (s = { [n]: !0 }), this.implied = Object.assign(this.implied || {}, s), this;
  }
  /**
   * Set environment variable to check for option value.
   *
   * An environment variable is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   *
   * @param {string} name
   * @return {Option}
   */
  env(n) {
    return this.envVar = n, this;
  }
  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */
  argParser(n) {
    return this.parseArg = n, this;
  }
  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */
  makeOptionMandatory(n = !0) {
    return this.mandatory = !!n, this;
  }
  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */
  hideHelp(n = !0) {
    return this.hidden = !!n, this;
  }
  /**
   * @api private
   */
  _concatValue(n, s) {
    return s === this.defaultValue || !Array.isArray(s) ? [n] : s.concat(n);
  }
  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */
  choices(n) {
    return this.argChoices = n.slice(), this.parseArg = (s, a) => {
      if (!this.argChoices.includes(s))
        throw new bl(`Allowed choices are ${this.argChoices.join(", ")}.`);
      return this.variadic ? this._concatValue(s, a) : s;
    }, this;
  }
  /**
   * Return option name.
   *
   * @return {string}
   */
  name() {
    return this.long ? this.long.replace(/^--/, "") : this.short.replace(/^-/, "");
  }
  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   *
   * @return {string}
   * @api private
   */
  attributeName() {
    return vl(this.name().replace(/^no-/, ""));
  }
  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @api private
   */
  is(n) {
    return this.short === n || this.long === n;
  }
  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   *
   * @return {boolean}
   * @api private
   */
  isBoolean() {
    return !this.required && !this.optional && !this.negate;
  }
}, El = class {
  /**
   * @param {Option[]} options
   */
  constructor(n) {
    this.positiveOptions = /* @__PURE__ */ new Map(), this.negativeOptions = /* @__PURE__ */ new Map(), this.dualOptions = /* @__PURE__ */ new Set(), n.forEach((s) => {
      s.negate ? this.negativeOptions.set(s.attributeName(), s) : this.positiveOptions.set(s.attributeName(), s);
    }), this.negativeOptions.forEach((s, a) => {
      this.positiveOptions.has(a) && this.dualOptions.add(a);
    });
  }
  /**
   * Did the value come from the option, and not from possible matching dual option?
   *
   * @param {*} value
   * @param {Option} option
   * @returns {boolean}
   */
  valueFromOption(n, s) {
    const a = s.attributeName();
    if (!this.dualOptions.has(a))
      return !0;
    const c = this.negativeOptions.get(a).presetArg, l = c !== void 0 ? c : !1;
    return s.negate === (l === n);
  }
};
function vl(v) {
  return v.split("-").reduce((n, s) => n + s[0].toUpperCase() + s.slice(1));
}
function Cs(v) {
  let n, s;
  const a = v.split(/[ |,]+/);
  return a.length > 1 && !/^[[<]/.test(a[1]) && (n = a.shift()), s = a.shift(), !n && /^-[^-]$/.test(s) && (n = s, s = void 0), { shortFlag: n, longFlag: s };
}
var Ol = Ne.Option = Cl, yl = Ne.splitOptionFlags = Cs, Sl = Ne.DualOptions = El;
const Il = /* @__PURE__ */ ve({
  __proto__: null,
  DualOptions: Sl,
  Option: Ol,
  default: Ne,
  splitOptionFlags: yl
}, [Ne]), Es = /* @__PURE__ */ ae(Il);
var gt = {};
const vs = 3;
function Ll(v, n) {
  if (Math.abs(v.length - n.length) > vs)
    return Math.max(v.length, n.length);
  const s = [];
  for (let a = 0; a <= v.length; a++)
    s[a] = [a];
  for (let a = 0; a <= n.length; a++)
    s[0][a] = a;
  for (let a = 1; a <= n.length; a++)
    for (let c = 1; c <= v.length; c++) {
      let l = 1;
      v[c - 1] === n[a - 1] ? l = 0 : l = 1, s[c][a] = Math.min(
        s[c - 1][a] + 1,
        // deletion
        s[c][a - 1] + 1,
        // insertion
        s[c - 1][a - 1] + l
        // substitution
      ), c > 1 && a > 1 && v[c - 1] === n[a - 2] && v[c - 2] === n[a - 1] && (s[c][a] = Math.min(s[c][a], s[c - 2][a - 2] + 1));
    }
  return s[v.length][n.length];
}
function Tl(v, n) {
  if (!n || n.length === 0)
    return "";
  n = Array.from(new Set(n));
  const s = v.startsWith("--");
  s && (v = v.slice(2), n = n.map((_) => _.slice(2)));
  let a = [], c = vs;
  const l = 0.4;
  return n.forEach((_) => {
    if (_.length <= 1)
      return;
    const O = Ll(v, _), b = Math.max(v.length, _.length);
    (b - O) / b > l && (O < c ? (c = O, a = [_]) : O === c && a.push(_));
  }), a.sort((_, O) => _.localeCompare(O)), s && (a = a.map((_) => `--${_}`)), a.length > 1 ? `
(Did you mean one of ${a.join(", ")}?)` : a.length === 1 ? `
(Did you mean ${a[0]}?)` : "";
}
var Fl = gt.suggestSimilar = Tl;
const Al = /* @__PURE__ */ ve({
  __proto__: null,
  default: gt,
  suggestSimilar: Fl
}, [gt]), Nl = /* @__PURE__ */ ae(Al), Ml = re.EventEmitter, lt = re, Q = re, mt = re, P = re, { Argument: Dl, humanReadableArgName: kl } = wt, { CommanderError: pt } = Ge, { Help: Pl } = bs, { Option: hs, splitOptionFlags: $l, DualOptions: Vl } = Es, { suggestSimilar: ds } = Nl;
class bt extends Ml {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */
  constructor(n) {
    super(), this.commands = [], this.options = [], this.parent = null, this._allowUnknownOption = !1, this._allowExcessArguments = !0, this.registeredArguments = [], this._args = this.registeredArguments, this.args = [], this.rawArgs = [], this.processedArgs = [], this._scriptPath = null, this._name = n || "", this._optionValues = {}, this._optionValueSources = {}, this._storeOptionsAsProperties = !1, this._actionHandler = null, this._executableHandler = !1, this._executableFile = null, this._executableDir = null, this._defaultCommandName = null, this._exitCallback = null, this._aliases = [], this._combineFlagAndOptionalValue = !0, this._description = "", this._summary = "", this._argsDescription = void 0, this._enablePositionalOptions = !1, this._passThroughOptions = !1, this._lifeCycleHooks = {}, this._showHelpAfterError = !1, this._showSuggestionAfterError = !0, this._outputConfiguration = {
      writeOut: (s) => P.stdout.write(s),
      writeErr: (s) => P.stderr.write(s),
      getOutHelpWidth: () => P.stdout.isTTY ? P.stdout.columns : void 0,
      getErrHelpWidth: () => P.stderr.isTTY ? P.stderr.columns : void 0,
      outputError: (s, a) => a(s)
    }, this._hidden = !1, this._hasHelpOption = !0, this._helpFlags = "-h, --help", this._helpDescription = "display help for command", this._helpShortFlag = "-h", this._helpLongFlag = "--help", this._addImplicitHelpCommand = void 0, this._helpCommandName = "help", this._helpCommandnameAndArgs = "help [command]", this._helpCommandDescription = "display help for command", this._helpConfiguration = {};
  }
  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   *
   * @param {Command} sourceCommand
   * @return {Command} `this` command for chaining
   */
  copyInheritedSettings(n) {
    return this._outputConfiguration = n._outputConfiguration, this._hasHelpOption = n._hasHelpOption, this._helpFlags = n._helpFlags, this._helpDescription = n._helpDescription, this._helpShortFlag = n._helpShortFlag, this._helpLongFlag = n._helpLongFlag, this._helpCommandName = n._helpCommandName, this._helpCommandnameAndArgs = n._helpCommandnameAndArgs, this._helpCommandDescription = n._helpCommandDescription, this._helpConfiguration = n._helpConfiguration, this._exitCallback = n._exitCallback, this._storeOptionsAsProperties = n._storeOptionsAsProperties, this._combineFlagAndOptionalValue = n._combineFlagAndOptionalValue, this._allowExcessArguments = n._allowExcessArguments, this._enablePositionalOptions = n._enablePositionalOptions, this._showHelpAfterError = n._showHelpAfterError, this._showSuggestionAfterError = n._showSuggestionAfterError, this;
  }
  /**
   * @returns {Command[]}
   * @api private
   */
  _getCommandAndAncestors() {
    const n = [];
    for (let s = this; s; s = s.parent)
      n.push(s);
    return n;
  }
  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * @example
   * // Command implemented using action handler (description is supplied separately to `.command`)
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   *
   * // Command implemented using separate executable file (description is second parameter to `.command`)
   * program
   *   .command('start <service>', 'start named service')
   *   .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {Object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */
  command(n, s, a) {
    let c = s, l = a;
    typeof c == "object" && c !== null && (l = c, c = null), l = l || {};
    const [, _, O] = n.match(/([^ ]+) *(.*)/), b = this.createCommand(_);
    return c && (b.description(c), b._executableHandler = !0), l.isDefault && (this._defaultCommandName = b._name), b._hidden = !!(l.noHelp || l.hidden), b._executableFile = l.executableFile || null, O && b.arguments(O), this.commands.push(b), b.parent = this, b.copyInheritedSettings(this), c ? this : b;
  }
  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */
  createCommand(n) {
    return new bt(n);
  }
  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */
  createHelp() {
    return Object.assign(new Pl(), this.configureHelp());
  }
  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */
  configureHelp(n) {
    return n === void 0 ? this._helpConfiguration : (this._helpConfiguration = n, this);
  }
  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *     // functions to change where being written, stdout and stderr
   *     writeOut(str)
   *     writeErr(str)
   *     // matching functions to specify width for wrapping help
   *     getOutHelpWidth()
   *     getErrHelpWidth()
   *     // functions based on what is being written out
   *     outputError(str, write) // used for displaying errors, and not used for displaying help
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */
  configureOutput(n) {
    return n === void 0 ? this._outputConfiguration : (Object.assign(this._outputConfiguration, n), this);
  }
  /**
   * Display the help or a custom message after an error occurs.
   *
   * @param {boolean|string} [displayHelp]
   * @return {Command} `this` command for chaining
   */
  showHelpAfterError(n = !0) {
    return typeof n != "string" && (n = !!n), this._showHelpAfterError = n, this;
  }
  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   *
   * @param {boolean} [displaySuggestion]
   * @return {Command} `this` command for chaining
   */
  showSuggestionAfterError(n = !0) {
    return this._showSuggestionAfterError = !!n, this;
  }
  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {Object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */
  addCommand(n, s) {
    if (!n._name)
      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
    return s = s || {}, s.isDefault && (this._defaultCommandName = n._name), (s.noHelp || s.hidden) && (n._hidden = !0), this.commands.push(n), n.parent = this, this;
  }
  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   *
   * @param {string} name
   * @param {string} [description]
   * @return {Argument} new argument
   */
  createArgument(n, s) {
    return new Dl(n, s);
  }
  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   *
   * @param {string} name
   * @param {string} [description]
   * @param {Function|*} [fn] - custom argument processing function
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  argument(n, s, a, c) {
    const l = this.createArgument(n, s);
    return typeof a == "function" ? l.default(c).argParser(a) : l.default(a), this.addArgument(l), this;
  }
  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * program.arguments('<cmd> [env]');
   *
   * @param {string} names
   * @return {Command} `this` command for chaining
   */
  arguments(n) {
    return n.trim().split(/ +/).forEach((s) => {
      this.argument(s);
    }), this;
  }
  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @param {Argument} argument
   * @return {Command} `this` command for chaining
   */
  addArgument(n) {
    const s = this.registeredArguments.slice(-1)[0];
    if (s && s.variadic)
      throw new Error(`only the last argument can be variadic '${s.name()}'`);
    if (n.required && n.defaultValue !== void 0 && n.parseArg === void 0)
      throw new Error(`a default value for a required argument is never used: '${n.name()}'`);
    return this.registeredArguments.push(n), this;
  }
  /**
   * Override default decision whether to add implicit help command.
   *
   *    addHelpCommand() // force on
   *    addHelpCommand(false); // force off
   *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
   *
   * @return {Command} `this` command for chaining
   */
  addHelpCommand(n, s) {
    return n === !1 ? this._addImplicitHelpCommand = !1 : (this._addImplicitHelpCommand = !0, typeof n == "string" && (this._helpCommandName = n.split(" ")[0], this._helpCommandnameAndArgs = n), this._helpCommandDescription = s || this._helpCommandDescription), this;
  }
  /**
   * @return {boolean}
   * @api private
   */
  _hasImplicitHelpCommand() {
    return this._addImplicitHelpCommand === void 0 ? this.commands.length && !this._actionHandler && !this._findCommand("help") : this._addImplicitHelpCommand;
  }
  /**
   * Add hook for life cycle event.
   *
   * @param {string} event
   * @param {Function} listener
   * @return {Command} `this` command for chaining
   */
  hook(n, s) {
    const a = ["preSubcommand", "preAction", "postAction"];
    if (!a.includes(n))
      throw new Error(`Unexpected value for event passed to hook : '${n}'.
Expecting one of '${a.join("', '")}'`);
    return this._lifeCycleHooks[n] ? this._lifeCycleHooks[n].push(s) : this._lifeCycleHooks[n] = [s], this;
  }
  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */
  exitOverride(n) {
    return n ? this._exitCallback = n : this._exitCallback = (s) => {
      if (s.code !== "commander.executeSubCommandAsync")
        throw s;
    }, this;
  }
  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @api private
   */
  _exit(n, s, a) {
    this._exitCallback && this._exitCallback(new pt(n, s, a)), P.exit(n);
  }
  /**
   * Register callback `fn` for the command.
   *
   * @example
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *      // do work here
   *   });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */
  action(n) {
    const s = (a) => {
      const c = this.registeredArguments.length, l = a.slice(0, c);
      return this._storeOptionsAsProperties ? l[c] = this : l[c] = this.opts(), l.push(this), n.apply(this, l);
    };
    return this._actionHandler = s, this;
  }
  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */
  createOption(n, s) {
    return new hs(n, s);
  }
  /**
   * Wrap parseArgs to catch 'commander.invalidArgument'.
   *
   * @param {Option | Argument} target
   * @param {string} value
   * @param {*} previous
   * @param {string} invalidArgumentMessage
   * @api private
   */
  _callParseArg(n, s, a, c) {
    try {
      return n.parseArg(s, a);
    } catch (l) {
      if (l.code === "commander.invalidArgument") {
        const _ = `${c} ${l.message}`;
        this.error(_, { exitCode: l.exitCode, code: l.code });
      }
      throw l;
    }
  }
  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(n) {
    const s = n.name(), a = n.attributeName();
    if (n.negate) {
      const l = n.long.replace(/^--no-/, "--");
      this._findOption(l) || this.setOptionValueWithSource(a, n.defaultValue === void 0 ? !0 : n.defaultValue, "default");
    } else
      n.defaultValue !== void 0 && this.setOptionValueWithSource(a, n.defaultValue, "default");
    this.options.push(n);
    const c = (l, _, O) => {
      l == null && n.presetArg !== void 0 && (l = n.presetArg);
      const b = this.getOptionValue(a);
      l !== null && n.parseArg ? l = this._callParseArg(n, l, b, _) : l !== null && n.variadic && (l = n._concatValue(l, b)), l == null && (n.negate ? l = !1 : n.isBoolean() || n.optional ? l = !0 : l = ""), this.setOptionValueWithSource(a, l, O);
    };
    return this.on("option:" + s, (l) => {
      const _ = `error: option '${n.flags}' argument '${l}' is invalid.`;
      c(l, _, "cli");
    }), n.envVar && this.on("optionEnv:" + s, (l) => {
      const _ = `error: option '${n.flags}' value '${l}' from env '${n.envVar}' is invalid.`;
      c(l, _, "env");
    }), this;
  }
  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @api private
   */
  _optionEx(n, s, a, c, l) {
    if (typeof s == "object" && s instanceof hs)
      throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
    const _ = this.createOption(s, a);
    if (_.makeOptionMandatory(!!n.mandatory), typeof c == "function")
      _.default(l).argParser(c);
    else if (c instanceof RegExp) {
      const O = c;
      c = (b, y) => {
        const L = O.exec(b);
        return L ? L[0] : y;
      }, _.default(l).argParser(c);
    } else
      _.default(c);
    return this.addOption(_);
  }
  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {Function|*} [parseArg] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */
  option(n, s, a, c) {
    return this._optionEx({}, n, s, a, c);
  }
  /**
  * Add a required option which must have a value after parsing. This usually means
  * the option must be specified on the command line. (Otherwise the same as .option().)
  *
  * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
  *
  * @param {string} flags
  * @param {string} [description]
  * @param {Function|*} [parseArg] - custom option processing function or default value
  * @param {*} [defaultValue]
  * @return {Command} `this` command for chaining
  */
  requiredOption(n, s, a, c) {
    return this._optionEx({ mandatory: !0 }, n, s, a, c);
  }
  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * // for `.option('-f,--flag [value]'):
   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {Boolean} [combine=true] - if `true` or omitted, an optional value can be specified directly after the flag.
   */
  combineFlagAndOptionalValue(n = !0) {
    return this._combineFlagAndOptionalValue = !!n, this;
  }
  /**
   * Allow unknown options on the command line.
   *
   * @param {Boolean} [allowUnknown=true] - if `true` or omitted, no error will be thrown
   * for unknown options.
   */
  allowUnknownOption(n = !0) {
    return this._allowUnknownOption = !!n, this;
  }
  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {Boolean} [allowExcess=true] - if `true` or omitted, no error will be thrown
   * for excess arguments.
   */
  allowExcessArguments(n = !0) {
    return this._allowExcessArguments = !!n, this;
  }
  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {Boolean} [positional=true]
   */
  enablePositionalOptions(n = !0) {
    return this._enablePositionalOptions = !!n, this;
  }
  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {Boolean} [passThrough=true]
   * for unknown options.
   */
  passThroughOptions(n = !0) {
    if (this._passThroughOptions = !!n, this.parent && n && !this.parent._enablePositionalOptions)
      throw new Error("passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)");
    return this;
  }
  /**
    * Whether to store option values as properties on command object,
    * or store separately (specify false). In both cases the option values can be accessed using .opts().
    *
    * @param {boolean} [storeAsProperties=true]
    * @return {Command} `this` command for chaining
    */
  storeOptionsAsProperties(n = !0) {
    if (this.options.length)
      throw new Error("call .storeOptionsAsProperties() before adding options");
    return this._storeOptionsAsProperties = !!n, this;
  }
  /**
   * Retrieve option value.
   *
   * @param {string} key
   * @return {Object} value
   */
  getOptionValue(n) {
    return this._storeOptionsAsProperties ? this[n] : this._optionValues[n];
  }
  /**
   * Store option value.
   *
   * @param {string} key
   * @param {Object} value
   * @return {Command} `this` command for chaining
   */
  setOptionValue(n, s) {
    return this.setOptionValueWithSource(n, s, void 0);
  }
  /**
    * Store option value and where the value came from.
    *
    * @param {string} key
    * @param {Object} value
    * @param {string} source - expected values are default/config/env/cli/implied
    * @return {Command} `this` command for chaining
    */
  setOptionValueWithSource(n, s, a) {
    return this._storeOptionsAsProperties ? this[n] = s : this._optionValues[n] = s, this._optionValueSources[n] = a, this;
  }
  /**
    * Get source of option value.
    * Expected values are default | config | env | cli | implied
    *
    * @param {string} key
    * @return {string}
    */
  getOptionValueSource(n) {
    return this._optionValueSources[n];
  }
  /**
    * Get source of option value. See also .optsWithGlobals().
    * Expected values are default | config | env | cli | implied
    *
    * @param {string} key
    * @return {string}
    */
  getOptionValueSourceWithGlobals(n) {
    let s;
    return this._getCommandAndAncestors().forEach((a) => {
      a.getOptionValueSource(n) !== void 0 && (s = a.getOptionValueSource(n));
    }), s;
  }
  /**
   * Get user arguments from implied or explicit arguments.
   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
   *
   * @api private
   */
  _prepareUserArgs(n, s) {
    if (n !== void 0 && !Array.isArray(n))
      throw new Error("first parameter to parse must be array or undefined");
    s = s || {}, n === void 0 && (n = P.argv, P.versions && P.versions.electron && (s.from = "electron")), this.rawArgs = n.slice();
    let a;
    switch (s.from) {
      case void 0:
      case "node":
        this._scriptPath = n[1], a = n.slice(2);
        break;
      case "electron":
        P.defaultApp ? (this._scriptPath = n[1], a = n.slice(2)) : a = n.slice(1);
        break;
      case "user":
        a = n.slice(0);
        break;
      default:
        throw new Error(`unexpected parse option { from: '${s.from}' }`);
    }
    return !this._name && this._scriptPath && this.nameFromFilename(this._scriptPath), this._name = this._name || "program", a;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * program.parse(process.argv);
   * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {Object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */
  parse(n, s) {
    const a = this._prepareUserArgs(n, s);
    return this._parseCommand([], a), this;
  }
  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * await program.parseAsync(process.argv);
   * await program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {Object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */
  async parseAsync(n, s) {
    const a = this._prepareUserArgs(n, s);
    return await this._parseCommand([], a), this;
  }
  /**
   * Execute a sub-command executable.
   *
   * @api private
   */
  _executeSubCommand(n, s) {
    s = s.slice();
    let a = !1;
    const c = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
    function l(L, N) {
      const R = Q.resolve(L, N);
      if (mt.existsSync(R))
        return R;
      if (c.includes(Q.extname(N)))
        return;
      const J = c.find((M) => mt.existsSync(`${R}${M}`));
      if (J)
        return `${R}${J}`;
    }
    this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
    let _ = n._executableFile || `${this._name}-${n._name}`, O = this._executableDir || "";
    if (this._scriptPath) {
      let L;
      try {
        L = mt.realpathSync(this._scriptPath);
      } catch {
        L = this._scriptPath;
      }
      O = Q.resolve(Q.dirname(L), O);
    }
    if (O) {
      let L = l(O, _);
      if (!L && !n._executableFile && this._scriptPath) {
        const N = Q.basename(this._scriptPath, Q.extname(this._scriptPath));
        N !== this._name && (L = l(O, `${N}-${n._name}`));
      }
      _ = L || _;
    }
    a = c.includes(Q.extname(_));
    let b;
    P.platform !== "win32" ? a ? (s.unshift(_), s = gs(P.execArgv).concat(s), b = lt.spawn(P.argv[0], s, { stdio: "inherit" })) : b = lt.spawn(_, s, { stdio: "inherit" }) : (s.unshift(_), s = gs(P.execArgv).concat(s), b = lt.spawn(P.execPath, s, { stdio: "inherit" })), b.killed || ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"].forEach((N) => {
      P.on(N, () => {
        b.killed === !1 && b.exitCode === null && b.kill(N);
      });
    });
    const y = this._exitCallback;
    y ? b.on("close", () => {
      y(new pt(P.exitCode || 0, "commander.executeSubCommandAsync", "(close)"));
    }) : b.on("close", P.exit.bind(P)), b.on("error", (L) => {
      if (L.code === "ENOENT") {
        const N = O ? `searched for local subcommand relative to directory '${O}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory", R = `'${_}' does not exist
 - if '${n._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${N}`;
        throw new Error(R);
      } else if (L.code === "EACCES")
        throw new Error(`'${_}' not executable`);
      if (!y)
        P.exit(1);
      else {
        const N = new pt(1, "commander.executeSubCommandAsync", "(error)");
        N.nestedError = L, y(N);
      }
    }), this.runningCommand = b;
  }
  /**
   * @api private
   */
  _dispatchSubcommand(n, s, a) {
    const c = this._findCommand(n);
    c || this.help({ error: !0 });
    let l;
    return l = this._chainOrCallSubCommandHook(l, c, "preSubcommand"), l = this._chainOrCall(l, () => {
      if (c._executableHandler)
        this._executeSubCommand(c, s.concat(a));
      else
        return c._parseCommand(s, a);
    }), l;
  }
  /**
   * Invoke help directly if possible, or dispatch if necessary.
   * e.g. help foo
   *
   * @api private
   */
  _dispatchHelpCommand(n) {
    n || this.help();
    const s = this._findCommand(n);
    return s && !s._executableHandler && s.help(), this._dispatchSubcommand(n, [], [
      this._helpLongFlag || this._helpShortFlag
    ]);
  }
  /**
   * Check this.args against expected this.registeredArguments.
   *
   * @api private
   */
  _checkNumberOfArguments() {
    this.registeredArguments.forEach((n, s) => {
      n.required && this.args[s] == null && this.missingArgument(n.name());
    }), !(this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) && this.args.length > this.registeredArguments.length && this._excessArguments(this.args);
  }
  /**
   * Process this.args using this.registeredArguments and save as this.processedArgs!
   *
   * @api private
   */
  _processArguments() {
    const n = (a, c, l) => {
      let _ = c;
      if (c !== null && a.parseArg) {
        const O = `error: command-argument value '${c}' is invalid for argument '${a.name()}'.`;
        _ = this._callParseArg(a, c, l, O);
      }
      return _;
    };
    this._checkNumberOfArguments();
    const s = [];
    this.registeredArguments.forEach((a, c) => {
      let l = a.defaultValue;
      a.variadic ? c < this.args.length ? (l = this.args.slice(c), a.parseArg && (l = l.reduce((_, O) => n(a, O, _), a.defaultValue))) : l === void 0 && (l = []) : c < this.args.length && (l = this.args[c], a.parseArg && (l = n(a, l, a.defaultValue))), s[c] = l;
    }), this.processedArgs = s;
  }
  /**
   * Once we have a promise we chain, but call synchronously until then.
   *
   * @param {Promise|undefined} promise
   * @param {Function} fn
   * @return {Promise|undefined}
   * @api private
   */
  _chainOrCall(n, s) {
    return n && n.then && typeof n.then == "function" ? n.then(() => s()) : s();
  }
  /**
   *
   * @param {Promise|undefined} promise
   * @param {string} event
   * @return {Promise|undefined}
   * @api private
   */
  _chainOrCallHooks(n, s) {
    let a = n;
    const c = [];
    return this._getCommandAndAncestors().reverse().filter((l) => l._lifeCycleHooks[s] !== void 0).forEach((l) => {
      l._lifeCycleHooks[s].forEach((_) => {
        c.push({ hookedCommand: l, callback: _ });
      });
    }), s === "postAction" && c.reverse(), c.forEach((l) => {
      a = this._chainOrCall(a, () => l.callback(l.hookedCommand, this));
    }), a;
  }
  /**
   *
   * @param {Promise|undefined} promise
   * @param {Command} subCommand
   * @param {string} event
   * @return {Promise|undefined}
   * @api private
   */
  _chainOrCallSubCommandHook(n, s, a) {
    let c = n;
    return this._lifeCycleHooks[a] !== void 0 && this._lifeCycleHooks[a].forEach((l) => {
      c = this._chainOrCall(c, () => l(this, s));
    }), c;
  }
  /**
   * Process arguments in context of this command.
   * Returns action result, in case it is a promise.
   *
   * @api private
   */
  _parseCommand(n, s) {
    const a = this.parseOptions(s);
    if (this._parseOptionsEnv(), this._parseOptionsImplied(), n = n.concat(a.operands), s = a.unknown, this.args = n.concat(s), n && this._findCommand(n[0]))
      return this._dispatchSubcommand(n[0], n.slice(1), s);
    if (this._hasImplicitHelpCommand() && n[0] === this._helpCommandName)
      return this._dispatchHelpCommand(n[1]);
    if (this._defaultCommandName)
      return fs(this, s), this._dispatchSubcommand(this._defaultCommandName, n, s);
    this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName && this.help({ error: !0 }), fs(this, a.unknown), this._checkForMissingMandatoryOptions(), this._checkForConflictingOptions();
    const c = () => {
      a.unknown.length > 0 && this.unknownOption(a.unknown[0]);
    }, l = `command:${this.name()}`;
    if (this._actionHandler) {
      c(), this._processArguments();
      let _;
      return _ = this._chainOrCallHooks(_, "preAction"), _ = this._chainOrCall(_, () => this._actionHandler(this.processedArgs)), this.parent && (_ = this._chainOrCall(_, () => {
        this.parent.emit(l, n, s);
      })), _ = this._chainOrCallHooks(_, "postAction"), _;
    }
    if (this.parent && this.parent.listenerCount(l))
      c(), this._processArguments(), this.parent.emit(l, n, s);
    else if (n.length) {
      if (this._findCommand("*"))
        return this._dispatchSubcommand("*", n, s);
      this.listenerCount("command:*") ? this.emit("command:*", n, s) : this.commands.length ? this.unknownCommand() : (c(), this._processArguments());
    } else
      this.commands.length ? (c(), this.help({ error: !0 })) : (c(), this._processArguments());
  }
  /**
   * Find matching command.
   *
   * @api private
   */
  _findCommand(n) {
    if (n)
      return this.commands.find((s) => s._name === n || s._aliases.includes(n));
  }
  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @api private
   */
  _findOption(n) {
    return this.options.find((s) => s.is(n));
  }
  /**
   * Display an error message if a mandatory option does not have a value.
   * Called after checking for help flags in leaf subcommand.
   *
   * @api private
   */
  _checkForMissingMandatoryOptions() {
    this._getCommandAndAncestors().forEach((n) => {
      n.options.forEach((s) => {
        s.mandatory && n.getOptionValue(s.attributeName()) === void 0 && n.missingMandatoryOptionValue(s);
      });
    });
  }
  /**
   * Display an error message if conflicting options are used together in this.
   *
   * @api private
   */
  _checkForConflictingLocalOptions() {
    const n = this.options.filter(
      (a) => {
        const c = a.attributeName();
        return this.getOptionValue(c) === void 0 ? !1 : this.getOptionValueSource(c) !== "default";
      }
    );
    n.filter(
      (a) => a.conflictsWith.length > 0
    ).forEach((a) => {
      const c = n.find(
        (l) => a.conflictsWith.includes(l.attributeName())
      );
      c && this._conflictingOption(a, c);
    });
  }
  /**
   * Display an error message if conflicting options are used together.
   * Called after checking for help flags in leaf subcommand.
   *
   * @api private
   */
  _checkForConflictingOptions() {
    this._getCommandAndAncestors().forEach((n) => {
      n._checkForConflictingLocalOptions();
    });
  }
  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Examples:
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {String[]} argv
   * @return {{operands: String[], unknown: String[]}}
   */
  parseOptions(n) {
    const s = [], a = [];
    let c = s;
    const l = n.slice();
    function _(b) {
      return b.length > 1 && b[0] === "-";
    }
    let O = null;
    for (; l.length; ) {
      const b = l.shift();
      if (b === "--") {
        c === a && c.push(b), c.push(...l);
        break;
      }
      if (O && !_(b)) {
        this.emit(`option:${O.name()}`, b);
        continue;
      }
      if (O = null, _(b)) {
        const y = this._findOption(b);
        if (y) {
          if (y.required) {
            const L = l.shift();
            L === void 0 && this.optionMissingArgument(y), this.emit(`option:${y.name()}`, L);
          } else if (y.optional) {
            let L = null;
            l.length > 0 && !_(l[0]) && (L = l.shift()), this.emit(`option:${y.name()}`, L);
          } else
            this.emit(`option:${y.name()}`);
          O = y.variadic ? y : null;
          continue;
        }
      }
      if (b.length > 2 && b[0] === "-" && b[1] !== "-") {
        const y = this._findOption(`-${b[1]}`);
        if (y) {
          y.required || y.optional && this._combineFlagAndOptionalValue ? this.emit(`option:${y.name()}`, b.slice(2)) : (this.emit(`option:${y.name()}`), l.unshift(`-${b.slice(2)}`));
          continue;
        }
      }
      if (/^--[^=]+=/.test(b)) {
        const y = b.indexOf("="), L = this._findOption(b.slice(0, y));
        if (L && (L.required || L.optional)) {
          this.emit(`option:${L.name()}`, b.slice(y + 1));
          continue;
        }
      }
      if (_(b) && (c = a), (this._enablePositionalOptions || this._passThroughOptions) && s.length === 0 && a.length === 0) {
        if (this._findCommand(b)) {
          s.push(b), l.length > 0 && a.push(...l);
          break;
        } else if (b === this._helpCommandName && this._hasImplicitHelpCommand()) {
          s.push(b), l.length > 0 && s.push(...l);
          break;
        } else if (this._defaultCommandName) {
          a.push(b), l.length > 0 && a.push(...l);
          break;
        }
      }
      if (this._passThroughOptions) {
        c.push(b), l.length > 0 && c.push(...l);
        break;
      }
      c.push(b);
    }
    return { operands: s, unknown: a };
  }
  /**
   * Return an object containing local option values as key-value pairs.
   *
   * @return {Object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      const n = {}, s = this.options.length;
      for (let a = 0; a < s; a++) {
        const c = this.options[a].attributeName();
        n[c] = c === this._versionOptionName ? this._version : this[c];
      }
      return n;
    }
    return this._optionValues;
  }
  /**
   * Return an object containing merged local and global option values as key-value pairs.
   *
   * @return {Object}
   */
  optsWithGlobals() {
    return this._getCommandAndAncestors().reduce(
      (n, s) => Object.assign(n, s.opts()),
      {}
    );
  }
  /**
   * Display error message and exit (or call exitOverride).
   *
   * @param {string} message
   * @param {Object} [errorOptions]
   * @param {string} [errorOptions.code] - an id string representing the error
   * @param {number} [errorOptions.exitCode] - used with process.exit
   */
  error(n, s) {
    this._outputConfiguration.outputError(`${n}
`, this._outputConfiguration.writeErr), typeof this._showHelpAfterError == "string" ? this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`) : this._showHelpAfterError && (this._outputConfiguration.writeErr(`
`), this.outputHelp({ error: !0 }));
    const a = s || {}, c = a.exitCode || 1, l = a.code || "commander.error";
    this._exit(c, l, n);
  }
  /**
   * Apply any option related environment variables, if option does
   * not have a value from cli or client code.
   *
   * @api private
   */
  _parseOptionsEnv() {
    this.options.forEach((n) => {
      if (n.envVar && n.envVar in P.env) {
        const s = n.attributeName();
        (this.getOptionValue(s) === void 0 || ["default", "config", "env"].includes(this.getOptionValueSource(s))) && (n.required || n.optional ? this.emit(`optionEnv:${n.name()}`, P.env[n.envVar]) : this.emit(`optionEnv:${n.name()}`));
      }
    });
  }
  /**
   * Apply any implied option values, if option is undefined or default value.
   *
   * @api private
   */
  _parseOptionsImplied() {
    const n = new Vl(this.options), s = (a) => this.getOptionValue(a) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(a));
    this.options.filter((a) => a.implied !== void 0 && s(a.attributeName()) && n.valueFromOption(this.getOptionValue(a.attributeName()), a)).forEach((a) => {
      Object.keys(a.implied).filter((c) => !s(c)).forEach((c) => {
        this.setOptionValueWithSource(c, a.implied[c], "implied");
      });
    });
  }
  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @api private
   */
  missingArgument(n) {
    const s = `error: missing required argument '${n}'`;
    this.error(s, { code: "commander.missingArgument" });
  }
  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @api private
   */
  optionMissingArgument(n) {
    const s = `error: option '${n.flags}' argument missing`;
    this.error(s, { code: "commander.optionMissingArgument" });
  }
  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @api private
   */
  missingMandatoryOptionValue(n) {
    const s = `error: required option '${n.flags}' not specified`;
    this.error(s, { code: "commander.missingMandatoryOptionValue" });
  }
  /**
   * `Option` conflicts with another option.
   *
   * @param {Option} option
   * @param {Option} conflictingOption
   * @api private
   */
  _conflictingOption(n, s) {
    const a = (_) => {
      const O = _.attributeName(), b = this.getOptionValue(O), y = this.options.find((N) => N.negate && O === N.attributeName()), L = this.options.find((N) => !N.negate && O === N.attributeName());
      return y && (y.presetArg === void 0 && b === !1 || y.presetArg !== void 0 && b === y.presetArg) ? y : L || _;
    }, c = (_) => {
      const O = a(_), b = O.attributeName();
      return this.getOptionValueSource(b) === "env" ? `environment variable '${O.envVar}'` : `option '${O.flags}'`;
    }, l = `error: ${c(n)} cannot be used with ${c(s)}`;
    this.error(l, { code: "commander.conflictingOption" });
  }
  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @api private
   */
  unknownOption(n) {
    if (this._allowUnknownOption)
      return;
    let s = "";
    if (n.startsWith("--") && this._showSuggestionAfterError) {
      let c = [], l = this;
      do {
        const _ = l.createHelp().visibleOptions(l).filter((O) => O.long).map((O) => O.long);
        c = c.concat(_), l = l.parent;
      } while (l && !l._enablePositionalOptions);
      s = ds(n, c);
    }
    const a = `error: unknown option '${n}'${s}`;
    this.error(a, { code: "commander.unknownOption" });
  }
  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @api private
   */
  _excessArguments(n) {
    if (this._allowExcessArguments)
      return;
    const s = this.registeredArguments.length, a = s === 1 ? "" : "s", l = `error: too many arguments${this.parent ? ` for '${this.name()}'` : ""}. Expected ${s} argument${a} but got ${n.length}.`;
    this.error(l, { code: "commander.excessArguments" });
  }
  /**
   * Unknown command.
   *
   * @api private
   */
  unknownCommand() {
    const n = this.args[0];
    let s = "";
    if (this._showSuggestionAfterError) {
      const c = [];
      this.createHelp().visibleCommands(this).forEach((l) => {
        c.push(l.name()), l.alias() && c.push(l.alias());
      }), s = ds(n, c);
    }
    const a = `error: unknown command '${n}'${s}`;
    this.error(a, { code: "commander.unknownCommand" });
  }
  /**
   * Get or set the program version.
   *
   * This method auto-registers the "-V, --version" option which will print the version number.
   *
   * You can optionally supply the flags and description to override the defaults.
   *
   * @param {string} [str]
   * @param {string} [flags]
   * @param {string} [description]
   * @return {this | string | undefined} `this` command for chaining, or version string if no arguments
   */
  version(n, s, a) {
    if (n === void 0)
      return this._version;
    this._version = n, s = s || "-V, --version", a = a || "output the version number";
    const c = this.createOption(s, a);
    return this._versionOptionName = c.attributeName(), this.options.push(c), this.on("option:" + c.name(), () => {
      this._outputConfiguration.writeOut(`${n}
`), this._exit(0, "commander.version", n);
    }), this;
  }
  /**
   * Set the description.
   *
   * @param {string} [str]
   * @param {Object} [argsDescription]
   * @return {string|Command}
   */
  description(n, s) {
    return n === void 0 && s === void 0 ? this._description : (this._description = n, s && (this._argsDescription = s), this);
  }
  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @param {string} [str]
   * @return {string|Command}
   */
  summary(n) {
    return n === void 0 ? this._summary : (this._summary = n, this);
  }
  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {string|Command}
   */
  alias(n) {
    if (n === void 0)
      return this._aliases[0];
    let s = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler && (s = this.commands[this.commands.length - 1]), n === s._name)
      throw new Error("Command alias can't be the same as its name");
    return s._aliases.push(n), this;
  }
  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {string[]|Command}
   */
  aliases(n) {
    return n === void 0 ? this._aliases : (n.forEach((s) => this.alias(s)), this);
  }
  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {String|Command}
   */
  usage(n) {
    if (n === void 0) {
      if (this._usage)
        return this._usage;
      const s = this.registeredArguments.map((a) => kl(a));
      return [].concat(
        this.options.length || this._hasHelpOption ? "[options]" : [],
        this.commands.length ? "[command]" : [],
        this.registeredArguments.length ? s : []
      ).join(" ");
    }
    return this._usage = n, this;
  }
  /**
   * Get or set the name of the command.
   *
   * @param {string} [str]
   * @return {string|Command}
   */
  name(n) {
    return n === void 0 ? this._name : (this._name = n, this);
  }
  /**
   * Set the name of the command from script filename, such as process.argv[1],
   * or require.main.filename, or __filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * program.nameFromFilename(require.main.filename);
   *
   * @param {string} filename
   * @return {Command}
   */
  nameFromFilename(n) {
    return this._name = Q.basename(n, Q.extname(n)), this;
  }
  /**
   * Get or set the directory for searching for executable subcommands of this command.
   *
   * @example
   * program.executableDir(__dirname);
   * // or
   * program.executableDir('subcommands');
   *
   * @param {string} [path]
   * @return {string|null|Command}
   */
  executableDir(n) {
    return n === void 0 ? this._executableDir : (this._executableDir = n, this);
  }
  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */
  helpInformation(n) {
    const s = this.createHelp();
    return s.helpWidth === void 0 && (s.helpWidth = n && n.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth()), s.formatHelp(this, s);
  }
  /**
   * @api private
   */
  _getHelpContext(n) {
    n = n || {};
    const s = { error: !!n.error };
    let a;
    return s.error ? a = (c) => this._outputConfiguration.writeErr(c) : a = (c) => this._outputConfiguration.writeOut(c), s.write = n.write || a, s.command = this, s;
  }
  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  outputHelp(n) {
    let s;
    typeof n == "function" && (s = n, n = void 0);
    const a = this._getHelpContext(n);
    this._getCommandAndAncestors().reverse().forEach((l) => l.emit("beforeAllHelp", a)), this.emit("beforeHelp", a);
    let c = this.helpInformation(a);
    if (s && (c = s(c), typeof c != "string" && !Buffer.isBuffer(c)))
      throw new Error("outputHelp callback must return a string or a Buffer");
    a.write(c), this._helpLongFlag && this.emit(this._helpLongFlag), this.emit("afterHelp", a), this._getCommandAndAncestors().forEach((l) => l.emit("afterAllHelp", a));
  }
  /**
   * You can pass in flags and a description to override the help
   * flags and help description for your command. Pass in false to
   * disable the built-in help option.
   *
   * @param {string | boolean} [flags]
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */
  helpOption(n, s) {
    if (typeof n == "boolean")
      return this._hasHelpOption = n, this;
    this._helpFlags = n || this._helpFlags, this._helpDescription = s || this._helpDescription;
    const a = $l(this._helpFlags);
    return this._helpShortFlag = a.shortFlag, this._helpLongFlag = a.longFlag, this;
  }
  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */
  help(n) {
    this.outputHelp(n);
    let s = P.exitCode || 0;
    s === 0 && n && typeof n != "function" && n.error && (s = 1), this._exit(s, "commander.help", "(outputHelp)");
  }
  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {string | Function} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(n, s) {
    const a = ["beforeAll", "before", "after", "afterAll"];
    if (!a.includes(n))
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${a.join("', '")}'`);
    const c = `${n}Help`;
    return this.on(c, (l) => {
      let _;
      typeof s == "function" ? _ = s({ error: l.error, command: l.command }) : _ = s, _ && l.write(`${_}
`);
    }), this;
  }
}
function fs(v, n) {
  v._hasHelpOption && n.find((a) => a === v._helpLongFlag || a === v._helpShortFlag) && (v.outputHelp(), v._exit(0, "commander.helpDisplayed", "(outputHelp)"));
}
function gs(v) {
  return v.map((n) => {
    if (!n.startsWith("--inspect"))
      return n;
    let s, a = "127.0.0.1", c = "9229", l;
    return (l = n.match(/^(--inspect(-brk)?)$/)) !== null ? s = l[1] : (l = n.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null ? (s = l[1], /^\d+$/.test(l[3]) ? c = l[3] : a = l[3]) : (l = n.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null && (s = l[1], a = l[3], c = l[4]), s && c !== "0" ? `${s}=${a}:${parseInt(c) + 1}` : n;
  });
}
var Hl = dt.Command = bt;
const Rl = /* @__PURE__ */ ve({
  __proto__: null,
  Command: Hl,
  default: dt
}, [dt]), Bl = /* @__PURE__ */ ae(Rl);
(function(v, n) {
  const { Argument: s } = wt, { Command: a } = Bl, { CommanderError: c, InvalidArgumentError: l } = Ge, { Help: _ } = bs, { Option: O } = Es;
  n = v.exports = new a(), n.program = n, n.Command = a, n.Option = O, n.Argument = s, n.Help = _, n.CommanderError = c, n.InvalidArgumentError = l, n.InvalidOptionArgumentError = l;
})(ht, ht.exports);
var Os = ht.exports;
const jl = /* @__PURE__ */ _s(Os), Wl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  __moduleExports: Os,
  default: jl
}, Symbol.toStringTag, { value: "Module" })), Gl = /* @__PURE__ */ ae(Wl);
_t.exports;
(function(v) {
  if (function() {
    typeof PluginManager < "u" && PluginManager.registerCommand && (PluginManager.registerCommand("Text2Frame", "IMPORT_MESSAGE_TO_EVENT", function(a) {
      const c = a.FileFolder, l = a.FileName, _ = a.MapID, O = a.EventID, b = a.PageID, y = a.IsOverwrite;
      this.pluginCommand(
        "IMPORT_MESSAGE_TO_EVENT",
        [c, l, _, O, b, y]
      );
    }), PluginManager.registerCommand("Text2Frame", "IMPORT_MESSAGE_TO_CE", function(a) {
      const c = a.FileFolder, l = a.FileName, _ = a.CommonEventID, O = a.IsOverwrite;
      this.pluginCommand(
        "IMPORT_MESSAGE_TO_CE",
        [c, l, _, O]
      );
    }));
    var n = typeof n < "u" ? n : {};
    if (n.Text2Frame = {}, typeof PluginManager > "u")
      n.Text2Frame.WindowPosition = "Bottom", n.Text2Frame.Background = "Window", n.Text2Frame.FileFolder = "test", n.Text2Frame.FileName = "basic.txt", n.Text2Frame.CommonEventID = "1", n.Text2Frame.MapID = "1", n.Text2Frame.EventID = "1", n.Text2Frame.PageID = "1", n.Text2Frame.IsOverwrite = !0, n.Text2Frame.CommentOutChar = "%", n.Text2Frame.IsDebug = !1, n.Text2Frame.DisplayMsg = !0, n.Text2Frame.DisplayWarning = !0, n.Text2Frame.TextPath = "dummy", n.Text2Frame.MapPath = "dummy", n.Text2Frame.CommonEventPath = "dummy", globalThis.Game_Interpreter = {}, Game_Interpreter.prototype = {}, globalThis.$gameMessage = {}, $gameMessage.add = function() {
      };
    else {
      n.Text2Frame.Parameters = PluginManager.parameters("Text2Frame"), n.Text2Frame.WindowPosition = String(n.Text2Frame.Parameters["Default Window Position"]), n.Text2Frame.Background = String(n.Text2Frame.Parameters["Default Background"]), n.Text2Frame.FileFolder = String(n.Text2Frame.Parameters["Default Scenario Folder"]), n.Text2Frame.FileName = String(n.Text2Frame.Parameters["Default Scenario File"]), n.Text2Frame.CommonEventID = String(n.Text2Frame.Parameters["Default Common Event ID"]), n.Text2Frame.MapID = String(n.Text2Frame.Parameters["Default MapID"]), n.Text2Frame.EventID = String(n.Text2Frame.Parameters["Default EventID"]), n.Text2Frame.PageID = String(n.Text2Frame.Parameters["Default PageID"]), n.Text2Frame.IsOverwrite = String(n.Text2Frame.Parameters.IsOverwrite) === "true", n.Text2Frame.CommentOutChar = String(n.Text2Frame.Parameters["Comment Out Char"]), n.Text2Frame.IsDebug = String(n.Text2Frame.Parameters.IsDebug) === "true", n.Text2Frame.DisplayMsg = String(n.Text2Frame.Parameters.DisplayMsg) === "true", n.Text2Frame.DisplayWarning = String(n.Text2Frame.Parameters.DisplayWarning) === "true";
      let a = "/", c = ".";
      if (typeof ps < "u") {
        const l = re;
        a = l.sep, c = l.dirname(process.mainModule.filename);
      }
      n.Text2Frame.TextPath = `${c}${a}${n.Text2Frame.FileFolder}${a}${n.Text2Frame.FileName}`, n.Text2Frame.MapPath = `${c}${a}data${a}Map${("000" + n.Text2Frame.MapID).slice(-3)}.json`, n.Text2Frame.CommonEventPath = `${c}${a}data${a}CommonEvents.json`;
    }
    const s = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(a, c) {
      s.apply(this, arguments), this.pluginCommandText2Frame(a, c);
    }, Game_Interpreter.prototype.pluginCommandText2Frame = function(a, c) {
      const l = function(e) {
        n.Text2Frame.DisplayMsg && $gameMessage.add(e);
      }, _ = function(e) {
        n.Text2Frame.DisplayWarning && $gameMessage.add(e);
      }, O = function() {
        return {
          conditions: {
            actorId: 1,
            actorValid: !1,
            itemId: 1,
            itemValid: !1,
            selfSwitchCh: "A",
            selfSwitchValid: !1,
            switch1Id: 1,
            switch1Valid: !1,
            switch2Id: 1,
            switch2Valid: !1,
            variableId: 1,
            variableValid: !1,
            variableValue: 0
          },
          directionFix: !1,
          image: { characterIndex: 0, characterName: "", direction: 2, pattern: 0, tileId: 0 },
          list: [
            { code: 0, indent: 0, parameters: [] }
          ],
          moveFrequency: 3,
          moveRoute: {
            list: [{ code: 0, parameters: [] }],
            repeat: !0,
            skippable: !1,
            wait: !1
          },
          moveSpeed: 3,
          moveType: 0,
          priorityType: 0,
          stepAnime: !1,
          through: !1,
          trigger: 0,
          walkAnime: !0
        };
      };
      switch (n.Text2Frame.ExecMode = a.toUpperCase(), n.Text2Frame.ExecMode) {
        case "IMPORT_MESSAGE_TO_EVENT":
        case "メッセージをイベントにインポート":
          l(`import message to event. 
/ メッセージをイベントにインポートします。`), c[0] && (n.Text2Frame.FileFolder = c[0]), c[1] && (n.Text2Frame.FileName = c[1]), c[2] && (n.Text2Frame.MapID = c[2]), c[3] && (n.Text2Frame.EventID = c[3]), c[4] && (c[4].toLowerCase() === "true" || c[4].toLowerCase() === "false") ? (n.Text2Frame.IsOverwrite = c[4].toLowerCase() === "true", _("【警告】5番目の引数に上書き判定を設定することは非推奨に"), _("なりました。ページIDを設定してください。上書き判定は6番"), _("目に設定してください。(警告はオプションでOFFにできます)")) : c[4] && (n.Text2Frame.PageID = c[4]), c[5] && c[5].toLowerCase() === "true" && (n.Text2Frame.IsOverwrite = !0);
          break;
        case "IMPORT_MESSAGE_TO_CE":
        case "メッセージをコモンイベントにインポート":
          c.length === 4 && (l(`import message to common event. 
/ メッセージをコモンイベントにインポートします。`), n.Text2Frame.ExecMode = "IMPORT_MESSAGE_TO_CE", n.Text2Frame.FileFolder = c[0], n.Text2Frame.FileName = c[1], n.Text2Frame.CommonEventID = c[2], n.Text2Frame.IsOverwrite = c[3] === "true");
          break;
        case "COMMAND_LINE":
          n.Text2Frame = Object.assign(n.Text2Frame, c[0]);
          break;
        case "LIBRARY_EXPORT":
          break;
        default:
          return;
      }
      const b = {};
      b.log = function() {
        n.Text2Frame.IsDebug && console.debug.apply(console, arguments);
      }, b.error = function() {
        console.error(Array.prototype.join.call(arguments));
      };
      const y = function(e) {
        const r = re;
        try {
          return r.readFileSync(e, { encoding: "utf8" });
        } catch {
          throw new Error(`File not found. / ファイルが見つかりません。
` + e);
        }
      }, L = function(e) {
        try {
          const r = JSON.parse(y(e));
          if (typeof r == "object")
            return r;
          throw new Error(
            `Json syntax error. 
ファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください
` + e
          );
        } catch {
          throw new Error(
            `Json syntax error. 
ファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください
` + e
          );
        }
      }, N = function(e, r) {
        const i = re;
        try {
          i.writeFileSync(e, JSON.stringify(r, null, "  "), { encoding: "utf8" });
        } catch {
          throw new Error(
            `Save failed. / 保存に失敗しました。
ファイルが開いていないか確認してください。
` + e
          );
        }
      }, R = function(e) {
        return e.replace(/\r\n/g, `
`).replace(/\r/g, `
`);
      }, J = function(e, r) {
        const i = new RegExp("^ *" + r);
        return e.split(`
`).filter((p) => !p.match(i)).join(`
`);
      }, M = function(e, r = 0) {
        return isNaN(e) || e === "" ? r : Number(e);
      }, x = function(e) {
        switch (e.toUpperCase()) {
          case "WINDOW":
          case "ウインドウ":
            return 0;
          case "DIM":
          case "暗くする":
          case "暗く":
            return 1;
          case "TRANSPARENT":
          case "透明":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      }, we = function(e) {
        switch (e.toUpperCase()) {
          case "TOP":
          case "上":
            return 0;
          case "MIDDLE":
          case "中":
            return 1;
          case "BOTTOM":
          case "下":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      }, ys = function(e) {
        switch (e.toUpperCase()) {
          case "LEFT":
          case "左":
            return 0;
          case "MIDDLE":
          case "中":
            return 1;
          case "RIGHT":
          case "右":
            return 2;
          default:
            throw new Error("Syntax error. / 文法エラーです。");
        }
      }, oe = function() {
        return {
          code: 101,
          indent: 0,
          parameters: [
            "",
            0,
            x(n.Text2Frame.Background),
            we(n.Text2Frame.WindowPosition),
            ""
          ]
        };
      }, Ss = function(e) {
        return { code: 401, indent: 0, parameters: [e] };
      }, Oe = function() {
        return { code: 0, indent: 0, parameters: [] };
      }, Is = function(e) {
        const r = { code: 355, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Ls = function(e) {
        const r = { code: 655, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Ts = function(e) {
        const r = { code: 356, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Fs = function(e, r, i, p) {
        const h = {}, g = {
          code: 357,
          indent: 0,
          parameters: [
            e,
            r,
            i,
            h
          ]
        }, C = /([^[\]]+)(\[.*\])/i;
        for (let d = 0; d < p.length; d++) {
          const I = p[d].match(C);
          if (I) {
            const A = I[1] || "", D = I[2].slice(1, -1).split("][") || [];
            h[A] = D[0] || "";
          }
        }
        return g;
      }, As = function(e) {
        const r = /([^[\]]+)(\[.*\])/i, i = e.match(r);
        if (i) {
          let p = i[1] || "";
          const h = i[2].slice(1, -1).split("][") || [], g = h[0] || "";
          return h[1] && (p = h[1]), { code: 657, indent: 0, parameters: [p + " = " + g] };
        } else
          throw new Error("Syntax error. / 文法エラーです。" + e + " はプラグインコマンドMZの引数として不適切です。");
      }, Ns = function(e) {
        const r = { code: 117, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Ms = function(e) {
        const r = { code: 108, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Ds = function(e) {
        const r = { code: 408, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, ks = function(e, r) {
        const i = { code: 105, indent: 0, parameters: [2, !1] };
        if (e && (i.parameters[0] = e), r)
          switch (r.toLowerCase()) {
            case "on":
            case "オン":
            case "true":
            case "no fast forward":
            case "1": {
              i.parameters[1] = !0;
              break;
            }
            case "off":
            case "オフ":
            case "false":
            case "0": {
              i.parameters[1] = !1;
              break;
            }
          }
        return i;
      }, Ps = function(e) {
        return { code: 405, indent: 0, parameters: [e] };
      }, $s = function(e) {
        const r = { code: 230, indent: 0, parameters: [""] };
        return r.parameters[0] = e, r;
      }, Vs = function() {
        return { code: 222, indent: 0, parameters: [] };
      }, Hs = function() {
        return { code: 221, indent: 0, parameters: [] };
      }, qe = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), {
          code: 241,
          indent: 0,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }]
        };
      }, Rs = function(e, r, i) {
        return qe("", e, r, i);
      }, Bs = function(e) {
        let r = 10;
        return typeof e == "number" && (r = e), { code: 242, indent: 0, parameters: [r] };
      }, js = function() {
        return { code: 243, indent: 0, parameters: [] };
      }, Ws = function() {
        return { code: 244, indent: 0, parameters: [] };
      }, Ct = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), {
          code: 132,
          indent: 0,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }]
        };
      }, Ue = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), {
          code: 245,
          indent: 0,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }]
        };
      }, Gs = function(e, r, i) {
        return Ue("", e, r, i);
      }, qs = function(e) {
        let r = 10;
        return typeof e == "number" && (r = e), { code: 246, indent: 0, parameters: [r] };
      }, Et = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), {
          code: 250,
          indent: 0,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }]
        };
      }, Us = function() {
        return { code: 251, indent: 0, parameters: [] };
      }, xe = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), {
          code: 249,
          indent: 0,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }]
        };
      }, xs = function(e, r, i) {
        return xe("", e, r, i);
      }, zs = function(e, r, i) {
        switch (i.toLowerCase()) {
          case "on":
          case "オン":
          case "1":
          case "true":
            return { code: 121, indent: 0, parameters: [parseInt(e), parseInt(r), 0] };
          case "off":
          case "オフ":
          case "0":
          case "false":
            return { code: 121, indent: 0, parameters: [parseInt(e), parseInt(r), 1] };
        }
      }, ee = function(e, r, i, p, h = 0, g = 0, C = 0) {
        const d = [r, i];
        switch (e.toLowerCase()) {
          case "set":
            d.push(0);
            break;
          case "add":
            d.push(1);
            break;
          case "sub":
            d.push(2);
            break;
          case "mul":
            d.push(3);
            break;
          case "div":
            d.push(4);
            break;
          case "mod":
            d.push(5);
            break;
          default:
            d.push(0);
            break;
        }
        switch (p.toLowerCase()) {
          case "constant":
            d.push(0), d.push(h);
            break;
          case "variables":
            d.push(1), d.push(h);
            break;
          case "random":
            d.push(2), d.push(parseInt(h)), d.push(parseInt(g));
            break;
          case "gamedata": {
            switch (d.push(3), h = h.toLowerCase(), h) {
              case "item":
              case "アイテム":
                d.push(0), d.push(parseInt(g)), d.push(0);
                break;
              case "weapon":
              case "武器":
                d.push(1), d.push(parseInt(g)), d.push(0);
                break;
              case "armor":
              case "防具":
                d.push(2), d.push(parseInt(g)), d.push(0);
                break;
              case "actor":
              case "アクター":
              case "enemy":
              case "敵キャラ":
              case "エネミー": {
                switch (h === "actor" || h === "アクター" ? d.push(3) : d.push(4), d.push(parseInt(g)), C.toLowerCase()) {
                  case "level":
                  case "レベル": {
                    d.push(0);
                    break;
                  }
                  case "exp":
                  case "経験値": {
                    d.push(1);
                    break;
                  }
                  case "hp": {
                    d.push(2);
                    break;
                  }
                  case "mp": {
                    d.push(3);
                    break;
                  }
                  case "maxhp":
                  case "最大hp": {
                    d.push(4);
                    break;
                  }
                  case "maxmp":
                  case "最大mp": {
                    d.push(5);
                    break;
                  }
                  case "attack":
                  case "攻撃力": {
                    d.push(6);
                    break;
                  }
                  case "defense":
                  case "防御力": {
                    d.push(7);
                    break;
                  }
                  case "m.attack":
                  case "魔法攻撃力": {
                    d.push(8);
                    break;
                  }
                  case "m.defense":
                  case "魔法防御力": {
                    d.push(9);
                    break;
                  }
                  case "agility":
                  case "敏捷性": {
                    d.push(10);
                    break;
                  }
                  case "luck":
                  case "運": {
                    d.push(11);
                    break;
                  }
                  default: {
                    d.push(0);
                    break;
                  }
                }
                if (h === "enemy" || h === "敵キャラ" || h === "エネミー") {
                  let I = d.pop(), A = d.pop();
                  I = I - 2, A = A - 1, d.push(A), d.push(I);
                }
                break;
              }
              case "character":
              case "キャラクター":
                switch (d.push(5), g.toLowerCase()) {
                  case "player":
                  case "プレイヤー":
                  case "-1": {
                    d.push(-1);
                    break;
                  }
                  case "thisevent":
                  case "このイベント":
                  case "0": {
                    d.push(0);
                    break;
                  }
                  default: {
                    d.push(parseInt(g));
                    break;
                  }
                }
                switch (C.toLowerCase()) {
                  case "mapx":
                  case "マップx": {
                    d.push(0);
                    break;
                  }
                  case "mapy":
                  case "マップy": {
                    d.push(1);
                    break;
                  }
                  case "direction":
                  case "方向": {
                    d.push(2);
                    break;
                  }
                  case "screenx":
                  case "画面x": {
                    d.push(3);
                    break;
                  }
                  case "screeny":
                  case "画面y": {
                    d.push(4);
                    break;
                  }
                  default: {
                    d.push(0);
                    break;
                  }
                }
                break;
              case "party":
              case "パーティ":
                d.push(6), d.push(parseInt(g) - 1), d.push(0);
                break;
              case "other":
                switch (d.push(7), g.toLowerCase()) {
                  case "mapid":
                  case "マップid": {
                    d.push(0);
                    break;
                  }
                  case "partymembers":
                  case "パーティ人数": {
                    d.push(1);
                    break;
                  }
                  case "gold":
                  case "所持金": {
                    d.push(2);
                    break;
                  }
                  case "steps":
                  case "歩数": {
                    d.push(3);
                    break;
                  }
                  case "playtime":
                  case "プレイ時間": {
                    d.push(4);
                    break;
                  }
                  case "timer":
                  case "タイマー": {
                    d.push(5);
                    break;
                  }
                  case "savecount":
                  case "セーブ回数": {
                    d.push(6);
                    break;
                  }
                  case "battlecount":
                  case "戦闘回数": {
                    d.push(7);
                    break;
                  }
                  case "wincount":
                  case "勝利回数": {
                    d.push(8);
                    break;
                  }
                  case "escapecount":
                  case "逃走回数": {
                    d.push(9);
                    break;
                  }
                  default: {
                    d.push(parseInt(g));
                    break;
                  }
                }
                d.push(0);
                break;
              case "last":
              case "直前":
                switch (d.push(8), g.toLowerCase()) {
                  case "last used skill id":
                  case "直前に使用したスキルのid":
                  case "used skill id": {
                    d.push(0);
                    break;
                  }
                  case "last used item id":
                  case "直前に使用したアイテムのid":
                  case "used item id": {
                    d.push(1);
                    break;
                  }
                  case "last actor id to act":
                  case "直前に行動したアクターのid":
                  case "actor id to act": {
                    d.push(2);
                    break;
                  }
                  case "last enemy index to act":
                  case "直前に行動した敵キャラのインデックス":
                  case "enemy index to act": {
                    d.push(3);
                    break;
                  }
                  case "last target actor id":
                  case "直前に対象となったアクターのid":
                  case "target actor id": {
                    d.push(4);
                    break;
                  }
                  case "last target enemy index":
                  case "直前に対象となった敵キャラのインデックス":
                  case "target enemy index": {
                    d.push(5);
                    break;
                  }
                  default: {
                    d.push(0);
                    break;
                  }
                }
                d.push(0);
                break;
            }
            break;
          }
          case "script": {
            d.push(4), d.push(h);
            break;
          }
          default:
            d.push(0), d.push(h), d.push(g), d.push(C);
            break;
        }
        return { code: 122, indent: 0, parameters: d };
      }, Js = function(e, r) {
        switch (r.toLowerCase()) {
          case "on":
          case "オン":
          case "1":
          case "true":
            return { code: 123, indent: 0, parameters: [e.toUpperCase(), 0] };
          case "off":
          case "オフ":
          case "0":
          case "false":
            return { code: 123, indent: 0, parameters: [e.toUpperCase(), 1] };
          default:
            return { code: 123, indent: 0, parameters: [e.toUpperCase(), 1] };
        }
      }, vt = function(e, r) {
        switch (e.toLowerCase()) {
          case "start":
          case "始動":
          case "スタート":
            return { code: 124, indent: 0, parameters: [0, parseInt(r)] };
          case "stop":
          case "停止":
          case "ストップ":
            return { code: 124, indent: 0, parameters: [1, parseInt(r)] };
          default:
            return { code: 124, indent: 0, parameters: [1, parseInt(r)] };
        }
      }, Xs = function(e, r) {
        const i = {};
        let p = 0, h = null, g = function() {
        }, C = function() {
        };
        switch (r.toLowerCase()) {
          case "script": {
            h = /<script>([\s\S]*?)<\/script>|<sc>([\s\S]*?)<\/sc>|<スクリプト>([\s\S]*?)<\/スクリプト>/i, g = Is, C = Ls;
            break;
          }
          case "comment": {
            h = /<comment>([\s\S]*?)<\/comment>|<co>([\s\S]*?)<\/co>|<注釈>([\s\S]*?)<\/注釈>/i, g = Ms, C = Ds;
            break;
          }
          case "scrolling": {
            let I = e.match(/<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i) || e.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) || e.match(
              /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
            );
            for (; I !== null; ) {
              const A = I[0], D = Number(I[1]), k = I[2], z = I[3].replace(/^\n/, "").replace(/\n$/, "").split(`
`);
              let B = [];
              B.push(ks(D, k)), B = B.concat(z.map((X) => Ps(X))), i[`#${r.toUpperCase()}_BLOCK${p}#`] = B, e = e.replace(A, `
#${r.toUpperCase()}_BLOCK${p}#
`), p++, I = e.match(
                /<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i
              ) || e.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) || e.match(
                /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
              );
            }
            return { scenario_text: e, block_map: i };
          }
        }
        let d = e.match(h);
        for (; d !== null; ) {
          const I = d[0], A = d[1] || d[2] || d[3];
          e = e.replace(I, `
#${r.toUpperCase()}_BLOCK${p}#
`);
          const D = A.replace(/^\n/, "").replace(/\n$/, "").split(`
`), k = [];
          for (let j = 0; j < D.length; j++) {
            const z = D[j];
            j === 0 ? k.push(g(z)) : k.push(C(z));
          }
          i[`#${r.toUpperCase()}_BLOCK${p}#`] = k, d = e.match(h), p++;
        }
        return { scenario_text: e, block_map: i };
      }, Me = function() {
        return {
          origin: 0,
          // 0: UpperLeft, 1:Center
          variable: 0,
          // 0: Constant, 1: Variable
          // if variable is 0, x and y are  a constant values.
          // if variable is 1, x is a number of variables
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          // %
          opacity: 255,
          blend_mode: 0,
          // 0:Normal, 1:Additive, 2:Multiply, 3:Screen
          duration: 60,
          wait: !0,
          // for a function that move a picture
          red: 0,
          green: 0,
          blue: 0,
          gray: 0,
          // for a function that tints a picture.
          easing: 0
          // for MZ
        };
      }, De = function(e) {
        const r = {}, i = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i, p = e.match(i);
        if (p) {
          const h = p[1] || "", g = p[2].slice(1, -1).split("][") || "";
          switch (h.toLowerCase()) {
            case "position":
            case "位置": {
              const C = g[0] || "Upper Left";
              (C.toLowerCase() === "center" || C === "中央") && (r.origin = 1);
              const d = /^[0-9]+$/, I = /(?:variables|v|変数)\[([0-9]+)\]/i, A = g[1] || "0";
              if (A.match(d))
                r.variable = 0, r.x = Number(A);
              else {
                const k = A.match(I);
                k && (r.variable = 1, r.x = Number(k[1]));
              }
              const D = g[2] || "0";
              if (D.match(d))
                r.variable = 0, r.y = Number(D);
              else {
                const k = D.match(I);
                k && (r.variable = 1, r.y = Number(k[1]));
              }
              break;
            }
            case "scale":
            case "拡大率": {
              r.width = M(g[0], 100), r.height = M(g[1], 100);
              break;
            }
            case "blend":
            case "合成": {
              r.opacity = M(g[0], 255), r.blend_mode = {
                normal: 0,
                通常: 0,
                additive: 1,
                加算: 1,
                multiply: 2,
                乗算: 2,
                screen: 3,
                スクリーン: 3
              }[g[1].toLowerCase()] || 0;
              break;
            }
            case "duration":
            case "時間": {
              r.duration = M(g[0], 60), (typeof g[1] > "u" || g[1] === "") && (r.wait = !1);
              break;
            }
            case "colortone":
            case "色調":
            case "ct": {
              switch (g[0].toLowerCase() || 0) {
                case "normal":
                case "通常": {
                  r.red = 0, r.green = 0, r.blue = 0, r.gray = 0;
                  break;
                }
                case "dark":
                case "ダーク": {
                  r.red = -68, r.green = -68, r.blue = -68, r.gray = 0;
                  break;
                }
                case "sepia":
                case "セピア": {
                  r.red = 34, r.green = -34, r.blue = -68, r.gray = 170;
                  break;
                }
                case "sunset":
                case "夕暮れ": {
                  r.red = 68, r.green = -34, r.blue = -34, r.gray = 0;
                  break;
                }
                case "night":
                case "夜": {
                  r.red = -68, r.green = -68, r.blue = 0, r.gray = 68;
                  break;
                }
                default: {
                  r.red = Number(g[0]) || 0, r.green = Number(g[1]) || 0, r.blue = Number(g[2]) || 0, r.gray = Number(g[3]) || 0;
                  break;
                }
              }
              break;
            }
            case "easing":
            case "イージング": {
              const C = g[0].toLowerCase() || "inear";
              r.easing = {
                "constant speed": 0,
                一定速度: 0,
                linear: 0,
                "slow start": 1,
                ゆっくり始まる: 1,
                "ease-in": 1,
                "slow end": 2,
                ゆっくり終わる: 2,
                "ease-out": 2,
                "slow start and end": 3,
                ゆっくり始まってゆっくり終わる: 3,
                "ease-in-out": 3
              }[C];
              break;
            }
          }
        }
        return r;
      }, Ys = function(e, r, i = []) {
        const p = Me();
        return i.map((h) => Object.assign(p, De(h))), {
          code: 231,
          indent: 0,
          parameters: [
            e,
            r,
            p.origin,
            p.variable,
            p.x,
            p.y,
            p.width,
            p.height,
            p.opacity,
            p.blend_mode
          ]
        };
      }, Ks = function(e, r = []) {
        const i = Me();
        return r.map((p) => Object.assign(i, De(p))), {
          code: 232,
          indent: 0,
          parameters: [
            e,
            0,
            i.origin,
            i.variable,
            i.x,
            i.y,
            i.width,
            i.height,
            i.opacity,
            i.blend_mode,
            i.duration,
            i.wait,
            i.easing
          ]
        };
      }, Zs = function(e, r) {
        return { code: 233, indent: 0, parameters: [e, r] };
      }, Qs = function(e, r = []) {
        const i = Me();
        return r.map((p) => Object.assign(i, De(p))), {
          code: 234,
          indent: 0,
          parameters: [
            e,
            [i.red, i.green, i.blue, i.gray],
            i.duration,
            i.wait
          ]
        };
      }, er = function(e) {
        return { code: 235, indent: 0, parameters: [e] };
      }, tr = function(e, r) {
        if (e = Math.max(Number(e) || 1, 1), typeof r[0] > "u")
          return [0, e, 0];
        const i = {
          on: 0,
          オン: 0,
          true: 0,
          1: 0,
          off: 1,
          オフ: 1,
          false: 1,
          0: 1
        }[r[0].toLowerCase()];
        return e > 0 && (i === 1 || i === 0) ? [0, e, i] : [0, e, 0];
      }, nr = function(e, r) {
        e = Math.max(Number(e) || 1, 1);
        const i = {
          "==": 0,
          "＝": 0,
          ">=": 1,
          "≧": 1,
          "<=": 2,
          "≦": 2,
          ">": 3,
          "＞": 3,
          "<": 4,
          "＜": 4,
          "!=": 5,
          "≠": 5
        }[r[0]] || 0, p = /^\d+$/, h = /(?:variables|v|変数)\[([0-9]+)\]/i, g = r[1] || "0";
        if (g.match(p))
          return [1, e, 0, Number(g), i];
        if (g.match(h)) {
          const C = Math.max(Number(g.match(h)[1]), 1);
          return [1, e, 1, C, i];
        }
        return [1, e, 0, 0, 0];
      }, sr = function(e, r) {
        switch (e = e.toUpperCase(), e) {
          case "A":
          case "B":
          case "C":
          case "D":
            break;
          default:
            e = "A";
        }
        if (typeof r[0] > "u")
          return [2, e, 0];
        const i = {
          on: 0,
          オン: 0,
          true: 0,
          1: 0,
          off: 1,
          オフ: 1,
          false: 1,
          0: 1
        }[r[0].toLowerCase()];
        return i === 0 || i === 1 ? [2, e, i] : [2, e, 0];
      }, rr = function(e) {
        const r = {
          ">=": 0,
          "≧": 0,
          "<=": 1,
          "≦": 1
        }[e[0]] || 0, i = Number(e[1]) || 0, p = Number(e[2]) || 0;
        return [3, 60 * i + p, r];
      }, ar = function(e, r) {
        e = Math.max(Number(e) || 1, 1);
        const i = {
          "in the party": 0,
          パーティにいる: 0,
          name: 1,
          名前: 1,
          class: 2,
          職業: 2,
          skill: 3,
          スキル: 3,
          weapon: 4,
          武器: 4,
          armor: 5,
          防具: 5,
          state: 6,
          ステート: 6
        }[r[0].toLowerCase()] || 0;
        if (i > 0) {
          if (i === 1)
            return [4, e, 1, r[1]];
          if (Number(r[1]))
            return [4, e, i, Math.max(Number(r[1]), 1)];
        }
        return [4, e, 0];
      }, or = function(e, r) {
        e = Math.max(Number(e) || 1, 1) - 1;
        const i = (r[0] || "appeared").toLowerCase(), p = Math.max(Number(r[1]) || 1, 1);
        return i === "appeared" || i === "出現している" ? [5, e, 0] : i === "state" || i === "ステート" ? [5, e, 1, p] : [5, e, 0];
      }, ir = function(e, r) {
        let i = {
          player: -1,
          プレイヤー: -1,
          thisevent: 0,
          このイベント: 0
        }[e.toLowerCase()];
        typeof i > "u" && (i = Math.max(Number(e) || 0, -1));
        const p = {
          down: 2,
          下: 2,
          2: 2,
          left: 4,
          左: 4,
          4: 4,
          right: 6,
          右: 6,
          6: 6,
          up: 8,
          上: 8,
          8: 8
        }[(r[0] || "").toLowerCase()] || 2;
        return [6, i, p];
      }, cr = function(e) {
        return [13, {
          boat: 0,
          小型船: 0,
          ship: 1,
          大型船: 1,
          airship: 2,
          飛行船: 2
        }[(e[0] || "").toLowerCase()] || 0];
      }, ur = function(e) {
        const r = {
          ">=": 0,
          "≧": 0,
          "<=": 1,
          "≦": 1,
          "<": 2,
          "＜": 2
        }[e[0]] || 0;
        return [7, Number(e[1]) || 0, r];
      }, lr = function(e) {
        return e = Math.max(Number(e) || 1, 1), [8, e];
      }, mr = function(e, r) {
        e = Math.max(Number(e) || 1, 1);
        let i = !1;
        return r[0] && (i = !0), [9, e, i];
      }, pr = function(e, r) {
        e = Math.max(Number(e) || 1, 1);
        let i = !1;
        return r[0] && (i = !0), [10, e, i];
      }, hr = function(e) {
        const r = {
          ok: "ok",
          決定: "ok",
          cancel: "cancel",
          キャンセル: "cancel",
          shift: "shift",
          シフト: "shift",
          down: "down",
          下: "down",
          left: "left",
          左: "left",
          right: "right",
          右: "right",
          up: "up",
          上: "up",
          pageup: "pageup",
          ページアップ: "pageup",
          pagedown: "pagedown",
          ページダウン: "pagedown"
        }[(e[0] || "").toLowerCase()] || "ok", i = {
          "is being pressed": 0,
          が押されている: 0,
          pressed: 0,
          "is being triggered": 1,
          がトリガーされている: 1,
          triggered: 1,
          "is being repeated": 2,
          がリピートされている: 2,
          repeated: 2
        }[(e[1] || "").toLowerCase()] || 0;
        return [11, r, i];
      }, dr = function(e) {
        return [12, e.join(",").trim()];
      }, fr = function(e, r) {
        const i = { code: 111, indent: 0, parameters: [0, 1, 0] }, p = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])*/i;
        e = e.match(p);
        const h = e[1], g = (e[2] || "").replace(/[[\]]/g, "");
        switch (h.toLowerCase()) {
          case "script":
          case "スクリプト":
          case "sc":
            break;
          default:
            r = r.map((C) => C.trim());
            break;
        }
        switch (h.toLowerCase()) {
          case "switches":
          case "スイッチ":
          case "sw": {
            i.parameters = tr(g, r);
            break;
          }
          case "variables":
          case "変数":
          case "v": {
            i.parameters = nr(g, r);
            break;
          }
          case "selfswitches":
          case "セルフスイッチ":
          case "ssw": {
            i.parameters = sr(g, r);
            break;
          }
          case "timer":
          case "タイマー": {
            i.parameters = rr(r);
            break;
          }
          case "actors":
          case "アクター": {
            i.parameters = ar(g, r);
            break;
          }
          case "enemies":
          case "敵キャラ":
          case "エネミー": {
            i.parameters = or(g, r);
            break;
          }
          case "characters":
          case "キャラクター": {
            i.parameters = ir(g, r);
            break;
          }
          case "vehicle":
          case "乗り物": {
            i.parameters = cr(r);
            break;
          }
          case "gold":
          case "お金": {
            i.parameters = ur(r);
            break;
          }
          case "items":
          case "アイテム": {
            i.parameters = lr(g);
            break;
          }
          case "weapons":
          case "武器": {
            i.parameters = mr(g, r);
            break;
          }
          case "armors":
          case "防具": {
            i.parameters = pr(g, r);
            break;
          }
          case "button":
          case "ボタン": {
            i.parameters = hr(r);
            break;
          }
          case "script":
          case "スクリプト":
          case "sc": {
            i.parameters = dr(r);
            break;
          }
        }
        return i;
      }, gr = function() {
        return { code: 411, indent: 0, parameters: [] };
      }, ke = function() {
        return { code: 412, indent: 0, parameters: [] };
      }, _r = function() {
        return { code: 112, indent: 0, parameters: [] };
      }, Ot = function() {
        return { code: 413, indent: 0, parameters: [] };
      }, wr = function() {
        return { code: 113, indent: 0, parameters: [] };
      }, be = function() {
        return { code: 0, indent: 0, parameters: [] };
      }, br = function() {
        return { code: 115, indent: 0, parameters: [] };
      }, Cr = function(e) {
        return { code: 118, indent: 0, parameters: [e] };
      }, Er = function(e) {
        return { code: 119, indent: 0, parameters: [e] };
      }, vr = function(e, r) {
        return { code: 103, indent: 0, parameters: [e, r] };
      }, Or = function(e, r) {
        let i = 1;
        switch (r.trim().toLowerCase()) {
          case "Regular Item".toLowerCase():
          case "通常アイテム".toLowerCase(): {
            i = 1;
            break;
          }
          case "Key Item".toLowerCase():
          case "大事なもの".toLowerCase(): {
            i = 2;
            break;
          }
          case "Hidden Item A".toLowerCase():
          case "隠しアイテムA".toLowerCase(): {
            i = 3;
            break;
          }
          case "Hidden Item B".toLowerCase():
          case "隠しアイテムB".toLowerCase(): {
            i = 4;
            break;
          }
        }
        return { code: 104, indent: 0, parameters: [e, i] };
      }, yr = function(e, r, i, p) {
        return { code: 102, indent: 0, parameters: [[], p, i, r, e] };
      }, Sr = function(e, r) {
        return { code: 402, indent: 0, parameters: [e, r] };
      }, Ir = function() {
        return { code: 403, indent: 0, parameters: [6, null] };
      }, yt = function() {
        return { code: 404, indent: 0, parameters: [] };
      }, Lr = function(e, r, i) {
        return { code: 125, indent: 0, parameters: [e, r, i] };
      }, Tr = function(e, r, i, p) {
        return { code: 126, indent: 0, parameters: [e, r, i, p] };
      }, Fr = function(e, r, i, p, h) {
        return { code: 127, indent: 0, parameters: [e, r, i, p, h] };
      }, Ar = function(e, r, i, p, h) {
        return { code: 128, indent: 0, parameters: [e, r, i, p, h] };
      }, Nr = function(e, r, i) {
        return { code: 129, indent: 0, parameters: [e, r, i] };
      }, Mr = function(e, r, i, p, h, g) {
        return { code: 311, indent: 0, parameters: [e, r, i, p, h, g] };
      }, Dr = function(e, r, i, p, h) {
        return { code: 312, indent: 0, parameters: [e, r, i, p, h] };
      }, kr = function(e, r, i, p, h) {
        return { code: 326, indent: 0, parameters: [e, r, i, p, h] };
      }, Pr = function(e, r, i, p) {
        return { code: 313, indent: 0, parameters: [e, r, i, p] };
      }, $r = function(e, r) {
        return { code: 314, indent: 0, parameters: [e, r] };
      }, Vr = function(e, r, i, p, h, g) {
        return { code: 315, indent: 0, parameters: [e, r, i, p, h, g] };
      }, Hr = function(e, r, i, p, h, g) {
        return { code: 316, indent: 0, parameters: [e, r, i, p, h, g] };
      }, Rr = function(e, r, i, p, h, g) {
        return { code: 317, indent: 0, parameters: [e, r, i, p, h, g] };
      }, Br = function(e, r, i, p) {
        return { code: 318, indent: 0, parameters: [e, r, i, p] };
      }, jr = function(e, r, i) {
        return { code: 319, indent: 0, parameters: [e, r, i] };
      }, Wr = function(e, r) {
        return { code: 320, indent: 0, parameters: [e, r] };
      }, Gr = function(e, r, i) {
        return { code: 321, indent: 0, parameters: [e, r, i] };
      }, qr = function(e, r) {
        return { code: 324, indent: 0, parameters: [e, r] };
      }, Ur = function(e, r) {
        const i = r.replace("\\n", `
`);
        return { code: 325, indent: 0, parameters: [e, i] };
      }, xr = function(e, r, i, p, h, g) {
        return { code: 201, indent: 0, parameters: [e, r, i, p, h, g] };
      }, zr = function(e, r, i, p, h) {
        return { code: 202, indent: 0, parameters: [e, r, i, p, h] };
      }, Jr = function(e, r, i, p, h) {
        return { code: 203, indent: 0, parameters: [e, r, i, p, h] };
      }, Xr = function(e, r, i, p) {
        return { code: 204, indent: 0, parameters: [e, r, i, p] };
      }, Yr = function(e, r, i, p) {
        return {
          code: 205,
          indent: 0,
          parameters: [e, { list: [{ code: 0 }], repeat: r, skippable: i, wait: p }]
        };
      }, S = function(e) {
        return { code: 505, indent: 0, parameters: [e] };
      }, Kr = function() {
        return S({ code: 1, indent: null });
      }, Zr = function() {
        return S({ code: 2, indent: null });
      }, Qr = function() {
        return S({ code: 3, indent: null });
      }, ea = function() {
        return S({ code: 4, indent: null });
      }, ta = function() {
        return S({ code: 5, indent: null });
      }, na = function() {
        return S({ code: 6, indent: null });
      }, sa = function() {
        return S({ code: 7, indent: null });
      }, ra = function() {
        return S({ code: 8, indent: null });
      }, aa = function() {
        return S({ code: 9, indent: null });
      }, oa = function() {
        return S({ code: 10, indent: null });
      }, ia = function() {
        return S({ code: 11, indent: null });
      }, ca = function() {
        return S({ code: 12, indent: null });
      }, ua = function() {
        return S({ code: 13, indent: null });
      }, la = function(e, r) {
        return S({ code: 14, parameters: [e, r], indent: null });
      }, ma = function(e) {
        return S({ code: 15, parameters: [e], indent: null });
      }, pa = function() {
        return S({ code: 16, indent: null });
      }, ha = function() {
        return S({ code: 17, indent: null });
      }, da = function() {
        return S({ code: 18, indent: null });
      }, fa = function() {
        return S({ code: 19, indent: null });
      }, ga = function() {
        return S({ code: 20, indent: null });
      }, _a = function() {
        return S({ code: 21, indent: null });
      }, wa = function() {
        return S({ code: 22, indent: null });
      }, ba = function() {
        return S({ code: 23, indent: null });
      }, Ca = function() {
        return S({ code: 24, indent: null });
      }, Ea = function() {
        return S({ code: 25, indent: null });
      }, va = function() {
        return S({ code: 26, indent: null });
      }, Oa = function(e) {
        return S({ code: 27, parameters: [e], indent: null });
      }, ya = function(e) {
        return S({ code: 28, parameters: [e], indent: null });
      }, Sa = function(e) {
        return S({ code: 29, parameters: [e], indent: null });
      }, Ia = function(e) {
        return S({ code: 30, parameters: [e], indent: null });
      }, La = function() {
        return S({ code: 31, indent: null });
      }, Ta = function() {
        return S({ code: 32, indent: null });
      }, Fa = function() {
        return S({ code: 33, indent: null });
      }, Aa = function() {
        return S({ code: 34, indent: null });
      }, Na = function() {
        return S({ code: 35, indent: null });
      }, Ma = function() {
        return S({ code: 36, indent: null });
      }, Da = function() {
        return S({ code: 37, indent: null });
      }, ka = function() {
        return S({ code: 38, indent: null });
      }, Pa = function() {
        return S({ code: 39, indent: null });
      }, $a = function() {
        return S({ code: 40, indent: null });
      }, Va = function(e, r) {
        return S({ code: 41, parameters: [e, r], indent: null });
      }, Ha = function(e) {
        return S({ code: 42, parameters: [e], indent: null });
      }, Ra = function(e) {
        return S({ code: 43, parameters: [e], indent: null });
      }, St = function(e, r, i, p) {
        let h = 90, g = 100, C = 0;
        return typeof r == "number" && (h = r), typeof i == "number" && (g = i), typeof p == "number" && (C = p), S({
          code: 44,
          parameters: [{ name: e, volume: h, pitch: g, pan: C }],
          indent: null
        });
      }, Ba = function(e) {
        return S({ code: 45, parameters: [e], indent: null });
      }, ja = function() {
        return { code: 206, indent: 0, parameters: [] };
      }, Wa = function(e) {
        return { code: 211, indent: 0, parameters: [e] };
      }, Ga = function(e) {
        return { code: 216, indent: 0, parameters: [e] };
      }, qa = function() {
        return { code: 217, indent: 0, parameters: [] };
      }, Ua = function(e, r, i) {
        return { code: 212, indent: 0, parameters: [e, r, i] };
      }, xa = function(e, r, i) {
        return { code: 213, indent: 0, parameters: [e, r, i] };
      }, za = function() {
        return { code: 214, indent: 0, parameters: [] };
      }, Ja = function(e = []) {
        const r = Me();
        return e.map((i) => Object.assign(r, De(i))), { code: 223, indent: 0, parameters: [[r.red, r.green, r.blue, r.gray], r.duration, r.wait] };
      }, Xa = function(e, r, i, p, h, g) {
        return { code: 224, indent: 0, parameters: [[e, r, i, p], h, g] };
      }, Ya = function(e, r, i, p) {
        return { code: 225, indent: 0, parameters: [e, r, i, p] };
      }, Ka = function(e, r, i, p) {
        return { code: 236, indent: 0, parameters: [e, r, i, p] };
      }, Za = function(e) {
        return { code: 261, indent: 0, parameters: [e] };
      }, Qa = function(e, r) {
        return { code: 301, indent: 0, parameters: [e, r, !1, !1] };
      }, ze = function() {
        return { code: 601, indent: 0, parameters: [] };
      }, eo = function() {
        return { code: 602, indent: 0, parameters: [] };
      }, to = function() {
        return { code: 603, indent: 0, parameters: [] };
      }, It = function() {
        return { code: 604, indent: 0, parameters: [] };
      }, no = function(e, r) {
        return { code: 303, indent: 0, parameters: [e, r] };
      }, so = function(e) {
        return { code: 302, indent: 0, parameters: [0, 0, 0, 0, e] };
      }, ro = function(e, r, i, p) {
        return { code: 605, indent: 0, parameters: [e, r, i, p] };
      }, ao = function() {
        return { code: 351, indent: 0, parameters: [] };
      }, oo = function() {
        return { code: 352, indent: 0, parameters: [] };
      }, io = function() {
        return { code: 353, indent: 0, parameters: [] };
      }, co = function() {
        return { code: 354, indent: 0, parameters: [] };
      }, uo = function(e, r, i, p) {
        return { code: 133, indent: 0, parameters: [{ name: e, volume: r, pitch: i, pan: p }] };
      }, lo = function(e, r, i, p) {
        return { code: 139, indent: 0, parameters: [{ name: e, volume: r, pitch: i, pan: p }] };
      }, mo = function(e, r, i, p, h) {
        return { code: 140, indent: 0, parameters: [e, { name: r, volume: i, pitch: p, pan: h }] };
      }, po = function(e) {
        return { code: 134, indent: 0, parameters: [e] };
      }, ho = function(e) {
        return { code: 135, indent: 0, parameters: [e] };
      }, fo = function(e) {
        return { code: 136, indent: 0, parameters: [e] };
      }, go = function(e) {
        return { code: 137, indent: 0, parameters: [e] };
      }, _o = function(e, r, i) {
        return { code: 138, indent: 0, parameters: [[e, r, i, 0]] };
      }, wo = function(e, r, i, p, h, g) {
        return {
          code: 322,
          indent: 0,
          parameters: [e, r, i, p, h, g]
        };
      }, bo = function(e, r, i) {
        return { code: 323, indent: 0, parameters: [e, r, i] };
      }, Co = function(e) {
        return { code: 281, indent: 0, parameters: [e] };
      }, Eo = function(e) {
        return { code: 282, indent: 0, parameters: [e] };
      }, vo = function(e, r) {
        return { code: 283, indent: 0, parameters: [e, r] };
      }, Oo = function(e, r, i, p, h) {
        return {
          code: 284,
          indent: 0,
          parameters: [e, r, i, p, h]
        };
      }, yo = function(e, r, i, p, h) {
        return {
          code: 285,
          indent: 0,
          parameters: [e, r, i, p, h]
        };
      }, So = function(e, r, i, p, h) {
        return { code: 331, indent: 0, parameters: [e, r, i, p, h] };
      }, Io = function(e, r, i, p) {
        return { code: 332, indent: 0, parameters: [e, r, i, p] };
      }, Lo = function(e, r, i, p) {
        return { code: 342, indent: 0, parameters: [e, r, i, p] };
      }, To = function(e, r, i) {
        return { code: 333, indent: 0, parameters: [e, r, i] };
      }, Fo = function(e) {
        return { code: 334, indent: 0, parameters: [e] };
      }, Ao = function(e) {
        return { code: 335, indent: 0, parameters: [e] };
      }, No = function(e, r) {
        return { code: 336, indent: 0, parameters: [e, r] };
      }, Mo = function(e, r, i) {
        return { code: 337, indent: 0, parameters: [e, r, i] };
      }, Do = function(e, r, i, p) {
        return { code: 339, indent: 0, parameters: [e, r, i, p] };
      }, ko = function() {
        return { code: 340, indent: 0, parameters: [] };
      }, Po = function(e) {
        const C = e.reduce((d, I) => {
          const A = I.code;
          return A === 111 ? d.push(111) : A === 411 ? d.push(411) : A === 0 && d.pop(), d;
        }, []).reduce((d, I) => (d.push(Oe()), I === 111 || I === 411 ? d.push(ke()) : I === 112 && d.push(Ot()), d), []);
        return e.concat(C);
      }, $o = function(e, r, i, p) {
        const h = e.match(/<face *: *(.+?)>/i) || e.match(/<FC *: *(.+?)>/i) || e.match(/<顔 *: *(.+?)>/i), g = e.match(/<windowposition *: *(.+?)>/i) || e.match(/<WP *: *(.+?)>/i) || e.match(/<位置 *: *(.+?)>/i), C = e.match(/<background *: *(.+?)>/i) || e.match(/<BG *: *(.+?)>/i) || e.match(/<背景 *: *(.+?)>/i), d = e.match(/<name *: ?(.+?)>/i) || e.match(/<NM *: ?(.+?)>/i) || e.match(/<名前 *: ?(.+?)>/i), I = e.match(/<plugincommand *: *(.+?)>/i) || e.match(/<PC *: *(.+?)>/i) || e.match(/<プラグインコマンド *: *(.+?)>/i), A = e.match(/<plugincommandmz\s*:\s*([^\s].*)>/i) || e.match(/<PCZ\s*:\s*([^\s].*)>/i) || e.match(/<プラグインコマンドmz\s*:\s*([^\s].*)>/i), D = e.match(/<commonevent *: *(.+?)>/i) || e.match(/<CE *: *(.+?)>/i) || e.match(/<コモンイベント *: *(.+?)>/i), k = e.match(/<wait *: *(.+?)>/i) || e.match(/<ウェイト *: *(.+?)>/i), j = e.match(/<fadein>/i) || e.match(/<FI>/i) || e.match(/<フェードイン>/i), z = e.match(/<fadeout>/i) || e.match(/<FO>/i) || e.match(/<フェードアウト>/i), B = e.match(/<playbgm *: *([^ ].+)>/i) || e.match(/<BGMの演奏 *: *([^ ].+)>/), X = e.match(/<stopbgm>/i) || e.match(/<playbgm *: *none>/i) || e.match(/<playbgm *: *なし>/i) || e.match(/<BGMの停止>/), ye = e.match(/<fadeoutbgm *: *(.+?)>/i) || e.match(/<BGMのフェードアウト *: *(.+?)>/), Xe = e.match(/<savebgm>/i) || e.match(/<BGMの保存>/), Ye = e.match(/<replaybgm>/i) || e.match(/<BGMの再開>/), Se = e.match(/<changebattlebgm *: *([^ ].+)>/i) || e.match(/<戦闘曲の変更 *: *([^ ].+)>/), Ie = e.match(/<playbgs *: *([^ ].+)>/i) || e.match(/<BGSの演奏 *: *([^ ].+)>/), Ke = e.match(/<stopbgs>/i) || e.match(/<playbgs *: *none>/i) || e.match(/<playbgs *: *なし>/i) || e.match(/<BGSの停止>/), Le = e.match(/<fadeoutbgs *: *(.+?)>/i) || e.match(/<BGSのフェードアウト *: *(.+?)>/), Ce = e.match(/<playse *: *([^ ].+)>/i) || e.match(/<SEの演奏 *: *([^ ].+)>/), Ze = e.match(/<stopse>/i) || e.match(/<SEの停止>/), T = e.match(/<playme *: *([^ ].+)>/i) || e.match(/<MEの演奏 *: *([^ ].+)>/), W = e.match(/<stopme>/i) || e.match(/<playme *: *none>/i) || e.match(/<playme *: *なし>/i) || e.match(/<MEの停止>/), te = e.match(/<showpicture\s*:\s*([^\s].*)>/i) || e.match(/<ピクチャの表示\s*:\s*([^\s].+)>/i) || e.match(/<SP\s*:\s*([^\s].+)>/i), Pe = e.match(/<movepicture\s*:\s*([^\s].*)>/i) || e.match(/<ピクチャの移動\s*:\s*([^\s].*)>/i) || e.match(/<MP\s*:\s*([^\s].*)>/i), Qe = e.match(/<rotatepicture\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) || e.match(/<ピクチャの回転\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) || e.match(/<RP\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i), Tt = e.match(/<tintpicture\s*:\s*([^\s].*)>/i) || e.match(/<ピクチャの色調変更\s*:\s*([^\s].*)>/i) || e.match(/<TP\s*:\s*([^\s].*)>/i), Ft = e.match(/<erasepicture\s*:\s*(\d{1,2})\s*>/i) || e.match(/<ピクチャの消去\s*:\s*(\d{1,2})\s*>/i) || e.match(/<ep\s*:\s*(\d{1,2})\s*>/i), At = e.match(/\s*<if\s*:\s*([^\s].*)>/i) || e.match(/\s*<条件分岐\s*:\s*([^\s].*)>/i), Bo = e.match(/\s*<else>/i) || e.match(/\s*<それ以外のとき>/), jo = e.match(/\s*<end>/i) || e.match(/\s*<分岐終了>/), Wo = e.match(/\s*<loop>/i) || e.match(/\s*<ループ>/), Go = e.match(/<repeatabove>/i) || e.match(/\s*<以上繰り返し>/) || e.match(/\s*<ra>/i), qo = e.match(/<breakloop>/i) || e.match(/<ループの中断>/) || e.match(/<BL>/i), Uo = e.match(/<ExitEventProcessing>/i) || e.match(/<イベント処理の中断>/) || e.match(/<EEP>/i), Nt = e.match(/<label\s*:\s*(\S+)\s*>/i) || e.match(/<ラベル\s*:\s*(\S+)\s*>/i), Mt = e.match(/<jumptolabel\s*:\s*(\S+)\s*>/i) || e.match(/<ラベルジャンプ\s*:\s*(\S+)\s*>/) || e.match(/<jtl\s*:\s*(\S+)\s*>/i), et = e.match(/<InputNumber\s*:\s*(\d+),\s*(\d+)>/i) || e.match(/<INN\s*:\s*(\d+),\s*(\d+)>/i) || e.match(/<数値入力の処理\s*:\s*(\d+),\s*(\d+)>/i), tt = e.match(/<SelectItem\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) || e.match(/<SI\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) || e.match(/<アイテム選択の処理\s*:\s*(\d+),\s*([\s\S]+)\s*>/i), Dt = e.match(/<ShowChoices\s*:*\s*([\s\S]*)>/i) || e.match(/<SHC\s*:*\s*([\s\S]*)>/i) || e.match(/<選択肢の表示\s*:*\s*([\s\S]*)>/i), kt = e.match(/<When\s*:\s*([\s\S]+)>/i) || e.match(/<選択肢\s*:\s*([\s\S]+)>/i), xo = e.match(/<WhenCancel>/i) || e.match(/<キャンセルのとき>/i), Pt = e.match(/<ChangeGold\s*:\s*([^\s].*)>/i) || e.match(/<所持金の増減\s*:\s*([^\s].*)>/i), $t = e.match(/<ChangeItems\s*:\s*([^\s].*)>/i) || e.match(/<アイテムの増減\s*:\s*([^\s].*)>/i), Vt = e.match(/<ChangeWeapons\s*:\s*([^\s].*)>/i) || e.match(/<武器の増減\s*:\s*([^\s].*)>/i), Ht = e.match(/<ChangeArmors\s*:\s*([^\s].*)>/i) || e.match(/<防具の増減\s*:\s*([^\s].*)>/i), Rt = e.match(/<ChangePartyMember\s*:\s*([^\s].*)>/i) || e.match(/<メンバーの入れ替え\s*:\s*([^\s].*)>/i), Bt = e.match(/<ChangeHp\s*:\s*([^\s].*)>/i) || e.match(/<HPの増減\s*:\s*([^\s].*)>/i), jt = e.match(/<ChangeMp\s*:\s*([^\s].*)>/i) || e.match(/<MPの増減\s*:\s*([^\s].*)>/i), Wt = e.match(/<ChangeTp\s*:\s*([^\s].*)>/i) || e.match(/<TPの増減\s*:\s*([^\s].*)>/i), Gt = e.match(/<ChangeState\s*:\s*([^\s].*)>/i) || e.match(/<ステートの変更\s*:\s*([^\s].*)>/i), qt = e.match(/<RecoverAll\s*:\s*([^\s].*)>/i) || e.match(/<全回復\s*:\s*([^\s].*)>/i), Ut = e.match(/<ChangeExp\s*:\s*([^\s].*)>/i) || e.match(/<経験値の増減\s*:\s*([^\s].*)>/i), xt = e.match(/<ChangeLevel\s*:\s*([^\s].*)>/i) || e.match(/<レベルの増減\s*:\s*([^\s].*)>/i), zt = e.match(/<ChangeParameter\s*:\s*([^\s].*)>/i) || e.match(/<能力値の増減\s*:\s*([^\s].*)>/i), Jt = e.match(/<ChangeSkill\s*:\s*([^\s].*)>/i) || e.match(/<スキルの増減\s*:\s*([^\s].*)>/i), Xt = e.match(/<ChangeEquipment\s*:\s*([^\s].*)>/i) || e.match(/<装備の変更\s*:\s*([^\s].*)>/i), Yt = e.match(/<ChangeName\s*:\s*([^\s].*)>/i) || e.match(/<名前の変更\s*:\s*([^\s].*)>/i), Kt = e.match(/<ChangeClass\s*:\s*([^\s].*)>/i) || e.match(/<職業の変更\s*:\s*([^\s].*)>/i), Zt = e.match(/<ChangeNickname\s*:\s*([^\s].*)>/i) || e.match(/<二つ名の変更\s*:\s*([^\s].*)>/i), Qt = e.match(/<ChangeProfile\s*:\s*([^\s].*)>/i) || e.match(/<プロフィールの変更\s*:\s*([^\s].*)>/i), en = e.match(/<TransferPlayer\s*:\s*([^\s].*)>/i) || e.match(/<場所移動\s*:\s*([^\s].*)>/i), tn = e.match(/<SetVehicleLocation\s*:\s*([^\s].*)>/i) || e.match(/<乗り物の位置設定\s*:\s*([^\s].*)>/i), nn = e.match(/<SetEventLocation\s*:\s*([^\s].*)>/i) || e.match(/<イベントの位置設定\s*:\s*([^\s].*)>/i), sn = e.match(/<ScrollMap\s*:\s*([^\s].*)>/i) || e.match(/<マップのスクロール\s*:\s*([^\s].*)>/i), rn = e.match(/<SetMovementRoute\s*:\s*([^\s].*)>/i) || e.match(/<移動ルートの設定\s*:\s*([^\s].*)>/i), zo = e.match(/<MoveDown>/i) || e.match(/<下に移動>/), Jo = e.match(/<MoveLeft>/i) || e.match(/<左に移動>/), Xo = e.match(/<MoveRight>/i) || e.match(/<右に移動>/), Yo = e.match(/<MoveUp>/i) || e.match(/<上に移動>/), Ko = e.match(/<MoveLowerLeft>/i) || e.match(/<左下に移動>/), Zo = e.match(/<MoveLowerRight>/i) || e.match(/<右下に移動>/), Qo = e.match(/<MoveUpperLeft>/i) || e.match(/<左上に移動>/), ei = e.match(/<MoveUpperRight>/i) || e.match(/<右上に移動>/), ti = e.match(/<MoveAtRandom>/i) || e.match(/<ランダムに移動>/), ni = e.match(/<MoveTowardPlayer>/i) || e.match(/<プレイヤーに近づく>/), si = e.match(/<MoveAwayFromPlayer>/i) || e.match(/<プレイヤーから遠ざかる>/), ri = e.match(/<OneStepForward>/i) || e.match(/<一歩前進>/), ai = e.match(/<OneStepBackward>/i) || e.match(/<一歩後退>/), an = e.match(/<Jump\s*:\s*([^\s].*)>/i) || e.match(/<ジャンプ\s*:\s*([^\s].*)>/i), on = e.match(/<McWait\s*:\s*([^\s].*)>/i) || e.match(/<移動コマンドウェイト\s*:\s*([^\s].*)>/i), oi = e.match(/<TurnDown>/i) || e.match(/<下を向く>/), ii = e.match(/<TurnLeft>/i) || e.match(/<左を向く>/), ci = e.match(/<TurnRight>/i) || e.match(/<右を向く>/), ui = e.match(/<TurnUp>/i) || e.match(/<上を向く>/), li = e.match(/<Turn90Right>/i) || e.match(/<右に90度回転>/), mi = e.match(/<Turn90Left>/i) || e.match(/<左に90度回転>/), pi = e.match(/<Turn180>/i) || e.match(/<180度回転>/), hi = e.match(/<Turn90RightorLeft>/i) || e.match(/<右か左に90度回転>/), di = e.match(/<TurnAtRandom>/i) || e.match(/<ランダムに方向転換>/), fi = e.match(/<TurnTowardPlayer>/i) || e.match(/<プレイヤーの方を向く>/), gi = e.match(/<TurnAwayFromPlayer>/i) || e.match(/<プレイヤーの逆を向く>/), cn = e.match(/<SwitchOn\s*:\s*([^\s].*)>/i) || e.match(/<スイッチON\s*:\s*([^\s].*)>/i), un = e.match(/<SwitchOff\s*:\s*([^\s].*)>/i) || e.match(/<スイッチOFF\s*:\s*([^\s].*)>/i), ln = e.match(/<ChangeSpeed\s*:\s*([^\s].*)>/i) || e.match(/<移動速度の変更\s*:\s*([^\s].*)>/i), mn = e.match(/<ChangeFrequency\s*:\s*([^\s].*)>/i) || e.match(/<移動頻度の変更\s*:\s*([^\s].*)>/i), _i = e.match(/<WalkingAnimationOn>/i) || e.match(/<歩行アニメON>/), wi = e.match(/<WalkingAnimationOff>/i) || e.match(/<歩行アニメOFF>/), bi = e.match(/<SteppingAnimationOn>/i) || e.match(/<足踏みアニメON>/), Ci = e.match(/<SteppingAnimationOff>/i) || e.match(/<足踏みアニメOFF>/), Ei = e.match(/<DirectionFixOn>/i) || e.match(/<向き固定ON>/), vi = e.match(/<DirectionFixOff>/i) || e.match(/<向き固定OFF>/), Oi = e.match(/<ThroughOn>/i) || e.match(/<すり抜けON>/), yi = e.match(/<ThroughOff>/i) || e.match(/<すり抜けOFF>/), Si = e.match(/<TransparentOn>/i) || e.match(/<透明化ON>/), Ii = e.match(/<TransparentOff>/i) || e.match(/<透明化OFF>/), pn = e.match(/<ChangeImage\s*:\s*([^\s].*)>/i) || e.match(/<画像の変更\s*:\s*([^\s].*)>/i), hn = e.match(/<ChangeOpacity\s*:\s*([^\s].*)>/i) || e.match(/<不透明度の変更\s*:\s*([^\s].*)>/i), dn = e.match(/<ChangeBlendMode\s*:\s*([^\s].*)>/i) || e.match(/<合成方法の変更\s*:\s*([^\s].*)>/i), nt = e.match(/<McPlaySe *: *([^ ].+)>/i) || e.match(/<移動コマンドSEの演奏 *: *([^ ].+)>/), fn = e.match(/<McScript\s*:\s*([^\s].*)>/i) || e.match(/<移動コマンドスクリプト\s*:\s*([^\s].*)>/i), Li = e.match(/<GetOnOffVehicle>/i) || e.match(/<乗り物の乗降>/), gn = e.match(/<ChangeTransparency\s*:\s*([^\s].*)>/i) || e.match(/<透明状態の変更\s*:\s*([^\s].*)>/i), _n = e.match(/<ChangePlayerFollowers\s*:\s*([^\s].*)>/i) || e.match(/<隊列歩行の変更\s*:\s*([^\s].*)>/i), Ti = e.match(/<GatherFollowers>/i) || e.match(/<隊列メンバーの集合>/), wn = e.match(/<ShowAnimation\s*:\s*([^\s].*)>/i) || e.match(/<アニメーションの表示\s*:\s*([^\s].*)>/i), bn = e.match(/<ShowBalloonIcon\s*:\s*([^\s].*)>/i) || e.match(/<フキダシアイコンの表示\s*:\s*([^\s].*)>/i), Fi = e.match(/<EraseEvent>/i) || e.match(/<イベントの一時消去>/), Cn = e.match(/<TintScreen\s*:?\s*([^\s]*.*)>/i) || e.match(/<画面の色調変更\s*:?\s*([^\s]*.*)>/i), En = e.match(/<FlashScreen\s*:\s*([^\s].*)>/i) || e.match(/<画面のフラッシュ\s*:\s*([^\s].*)>/i), vn = e.match(/<ShakeScreen\s*:\s*([^\s].*)>/i) || e.match(/<画面のシェイク\s*:\s*([^\s].*)>/i), On = e.match(/<SetWeatherEffect\s*:\s*([^\s].*)>/i) || e.match(/<天候の設定\s*:\s*([^\s].*)>/i), yn = e.match(/<PlayMovie\s*:\s*([^\s].*)>/i) || e.match(/<ムービーの再生\s*:\s*([^\s].*)>/i), Sn = e.match(/<BattleProcessing\s*:\s*([^\s].*)>/i) || e.match(/<戦闘の処理\s*:\s*([^\s].*)>/i), In = e.match(/<ShopProcessing\s*:*\s*([\s\S]*)>/i) || e.match(/<ショップの処理\s*:\s*([^\s].*)>/i), Ln = e.match(/<Merchandise\s*:\s*([^\s].*)>/i) || e.match(/<商品\s*:\s*([^\s].*)>/i), Ai = e.match(/\s*<IfWin>/i) || e.match(/\s*<勝ったとき>/), Ni = e.match(/\s*<IfEscape>/i) || e.match(/\s*<逃げたとき>/), Mi = e.match(/\s*<IfLose>/i) || e.match(/\s*<負けたとき>/), Tn = e.match(/<NameInputProcessing\s*:\s*([^\s].*)>/i) || e.match(/<名前入力の処理\s*:\s*([^\s].*)>/i), Di = e.match(/<OpenMenuScreen>/i) || e.match(/<メニュー画面を開く>/), ki = e.match(/<OpenSaveScreen>/i) || e.match(/<セーブ画面を開く>/), Pi = e.match(/<GameOver>/i) || e.match(/<ゲームオーバー>/), $i = e.match(/<ReturnToTitleScreen>/i) || e.match(/<タイトル画面に戻す>/), Fn = e.match(/<ChangeVictoryMe\s*:\s*([^\s].*)>/i) || e.match(/<勝利MEの変更\s*:\s*([^\s].*)>/i), An = e.match(/<ChangeDefeatMe\s*:\s*([^\s].*)>/i) || e.match(/<敗北MEの変更\s*:\s*([^\s].*)>/i), Nn = e.match(/<ChangeVehicleBgm\s*:\s*([^\s].*)>/i) || e.match(/<乗り物BGMの変更\s*:\s*([^\s].*)>/i), Mn = e.match(/<ChangeSaveAccess\s*:\s*([^\s].*)>/i) || e.match(/<セーブ禁止の変更\s*:\s*([^\s].*)>/i), Dn = e.match(/<ChangeMenuAccess\s*:\s*([^\s].*)>/i) || e.match(/<メニュー禁止の変更\s*:\s*([^\s].*)>/i), kn = e.match(/<ChangeEncounter\s*:\s*([^\s].*)>/i) || e.match(/<エンカウント禁止の変更\s*:\s*([^\s].*)>/i), Pn = e.match(/<ChangeFormationAccess\s*:\s*([^\s].*)>/i) || e.match(/<並び変え禁止の変更\s*:\s*([^\s].*)>/i), $n = e.match(/<ChangeWindowColor\s*:\s*([^\s].*)>/i) || e.match(/<ウィンドウカラーの変更\s*:\s*([^\s].*)>/i), Vn = e.match(/<ChangeActorImages\s*:\s*([^\s].*)>/i) || e.match(/<アクターの画像変更\s*:\s*([^\s].*)>/i), Hn = e.match(/<ChangeVehicleImage\s*:\s*([^\s].*)>/i) || e.match(/<乗り物の画像変更\s*:\s*([^\s].*)>/i), Rn = e.match(/<ChangeMapNameDisplay\s*:\s*([^\s].*)>/i) || e.match(/<マップ名表示の変更\s*:\s*([^\s].*)>/i), Bn = e.match(/<ChangeTileset\s*:\s*([^\s].*)>/i) || e.match(/<タイルセットの変更\s*:\s*([^\s].*)>/i), jn = e.match(/<ChangeBattleBackGround\s*:\s*([^\s].*)>/i) || e.match(/<戦闘背景の変更\s*:\s*([^\s].*)>/i), Wn = e.match(/<ChangeParallax\s*:\s*([^\s].*)>/i) || e.match(/<遠景の変更\s*:\s*([^\s].*)>/i), Gn = e.match(/<GetLocationInfo\s*:\s*([^\s].*)>/i) || e.match(/<指定位置の情報取得\s*:\s*([^\s].*)>/i), qn = e.match(/<ChangeEnemyHp\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラのHP増減\s*:\s*([^\s].*)>/i), Un = e.match(/<ChangeEnemyMp\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラのMP増減\s*:\s*([^\s].*)>/i), xn = e.match(/<ChangeEnemyTp\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラのTP増減\s*:\s*([^\s].*)>/i), zn = e.match(/<ChangeEnemyState\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラのステート変更\s*:\s*([^\s].*)>/i), Jn = e.match(/<EnemyRecoverAll\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラの全回復\s*:\s*([^\s].*)>/i), Xn = e.match(/<EnemyAppear\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラの出現\s*:\s*([^\s].*)>/i), Yn = e.match(/<EnemyTransform\s*:\s*([^\s].*)>/i) || e.match(/<敵キャラの変身\s*:\s*([^\s].*)>/i), Kn = e.match(/<ShowBattleAnimation\s*:\s*([^\s].*)>/i) || e.match(/<戦闘アニメーションの表示\s*:\s*([^\s].*)>/i), Zn = e.match(/<ForceAction\s*:\s*([^\s].*)>/i) || e.match(/<戦闘行動の強制\s*:\s*([^\s].*)>/i), Vi = e.match(/<AbortBattle>/i) || e.match(/<バトルの中断>/), Qn = e.match(/#SCRIPT_BLOCK[0-9]+#/i), es = e.match(/#COMMENT_BLOCK[0-9]+#/i), ts = e.match(/#SCROLLING_BLOCK[0-9]+#/i);
        if (Qn) {
          const t = Qn[0];
          return p[t];
        }
        if (es) {
          const t = es[0];
          return p[t];
        }
        if (ts) {
          const t = ts[0];
          return p[t];
        }
        if (I)
          return [Ts(I[1])];
        if (A) {
          const t = A[1].split(",").map((u) => u.trim()), o = [];
          if (t.length > 2) {
            const u = t[0], m = t[1], f = t[2], w = t.slice(3), E = Fs(
              u,
              m,
              f,
              w
            );
            o.push(E), w.map((F) => o.push(As(F)));
          } else
            throw new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return o;
        }
        if (D) {
          const t = Number(D[1]);
          if (t)
            return [Ns(t)];
          throw new Error(
            "Syntax error. / 文法エラーです。" + D[1] + " is not number. / " + D[1] + "は整数ではありません"
          );
        }
        if (k) {
          const t = Number(k[1]);
          if (t)
            return [$s(t)];
          throw new Error(
            "Syntax error. / 文法エラーです。" + D[1] + " is not number. / " + D[1] + "は整数ではありません"
          );
        }
        if (j)
          return [Vs()];
        if (z)
          return [Hs()];
        if (X)
          return [Rs(90, 100, 0)];
        if (B && B[1]) {
          const t = B[1].replace(/ /g, "").split(",");
          let o = "Battle1", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [qe("", u, m, f)] : [qe(o, u, m, f)];
        }
        if (ye && ye[1]) {
          let t = 10;
          const o = ye[1].replace(/ /g, "");
          return (Number(o) || Number(o) === 0) && (t = Number(o)), [Bs(t)];
        }
        if (Xe)
          return [js()];
        if (Ye)
          return [Ws()];
        if (Se && Se[1]) {
          const t = Se[1].replace(/ /g, "").split(",");
          let o = "Battle1", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [Ct("", u, m, f)] : [Ct(o, u, m, f)];
        }
        if (Ke)
          return [Gs(90, 100, 0)];
        if (Ie && Ie[1]) {
          const t = Ie[1].replace(/ /g, "").split(",");
          let o = "City", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [Ue("", u, m, f)] : [Ue(o, u, m, f)];
        }
        if (Le && Le[1]) {
          let t = 10;
          const o = Le[1].replace(/ /g, "");
          return (Number(o) || Number(o) === 0) && (t = Number(o)), [qs(t)];
        }
        if (Ce && Ce[1]) {
          const t = Ce[1].replace(/ /g, "").split(",");
          let o = "Attack1", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [Et("", u, m, f)] : [Et(o, u, m, f)];
        }
        if (Ze)
          return [Us()];
        if (W)
          return [xs(90, 100, 0)];
        if (T && T[1]) {
          const t = T[1].replace(/ /g, "").split(",");
          let o = "Curse1", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [xe("", u, m, f)] : [xe(o, u, m, f)];
        }
        const ne = "\\w゠-ヿ぀-ゟ々-〆ム-鿏", Y = ".+", Hi = ["set", "代入", "="].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), ie = e.match(new RegExp(Hi.join("|"), "i")), Ri = ["add", "加算", "\\+"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), ce = e.match(new RegExp(Ri.join("|"), "i")), Bi = ["sub", "減算", "-"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), ue = e.match(new RegExp(Bi.join("|"), "i")), ji = ["mul", "乗算", "\\*"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), le = e.match(new RegExp(ji.join("|"), "i")), Wi = ["div", "除算", "\\/"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), me = e.match(new RegExp(Wi.join("|"), "i")), Gi = ["mod", "剰余", "\\%"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), pe = e.match(new RegExp(Gi.join("|"), "i")), qi = ["sw", "switch", "スイッチ"].map(
          (t) => `<${t} *: *(\\d+\\-?\\d*) *, *(${Y}) *>`
        ), he = e.match(new RegExp(qi.join("|"), "i")), Ui = ["ssw", "selfswitch", "セルフスイッチ"].map(
          (t) => `<${t} *: *([abcd]) *, *(${Y}) *>`
        ), de = e.match(new RegExp(Ui.join("|"), "i")), se = function(t, o, u) {
          if (t === "selfswitch") {
            const $ = o.match(/[abcd]/i), _e = u.match(/on|オン|1|true|off|オフ|0|false/i);
            if ($ && _e)
              return Js($[0], _e[0]);
          }
          const m = o.match(/\d+/i), f = o.match(/(\d+)-(\d+)/i);
          let w = 0, E = 0;
          if (f)
            w = parseInt(f[1]), E = parseInt(f[2]);
          else if (m) {
            const $ = parseInt(m[0]);
            w = $, E = $;
          } else
            throw new Error("Syntax error. / 文法エラーです。");
          if (t === "switch") {
            const $ = u.match(/on|オン|1|true|off|オフ|0|false/i);
            if ($)
              return zs(w, E, $[0]);
          }
          const F = u.match(/v\[(\d+)\]|variables\[(\d+)\]|変数\[(\d+)\]/i);
          if (F) {
            const $ = F[1] || F[2] || F[3];
            return ee(t, w, E, "variables", parseInt($));
          }
          const V = u.match(
            /r\[(\-?\d+)\]\[(\-?\d+)\]|random\[(\-?\d+)\]\[(\-?\d+)\]|乱数\[(\-?\d+)\]\[(\-?\d+)\]/i
          );
          if (V) {
            const $ = V[1] || V[3] || V[5], _e = V[2] || V[4] || V[6];
            return ee(
              t,
              w,
              E,
              "random",
              parseInt($),
              parseInt(_e)
            );
          }
          const el = ["gd", "gamedata", "ゲームデータ"].map(($) => `(${$})(${Y})`), Re = u.match(new RegExp(el.join("|"), "i"));
          if (Re) {
            const $ = Re[2] || Re[4] || Re[6], _e = $.match(new RegExp(`\\[([${ne}]+)\\]`, "i"));
            if (_e) {
              const Fe = _e[1];
              switch (Fe.toLowerCase()) {
                case "mapid":
                case "マップid":
                case "partymembers":
                case "パーティ人数":
                case "gold":
                case "所持金":
                case "steps":
                case "歩数":
                case "playtime":
                case "プレイ時間":
                case "timer":
                case "タイマー":
                case "savecount":
                case "セーブ回数":
                case "battlecount":
                case "戦闘回数":
                case "wincount":
                case "勝利回数":
                case "escapecount":
                case "逃走回数":
                  return ee(
                    t,
                    w,
                    E,
                    "gamedata",
                    "other",
                    Fe.toLowerCase(),
                    0
                  );
                case "item":
                case "アイテム":
                case "weapon":
                case "武器":
                case "armor":
                case "防具":
                case "party":
                case "パーティ": {
                  const Z = $.match(new RegExp(`\\[[${ne}]+\\]\\[([${ne}]+)\\]`, "i"));
                  if (Z) {
                    const Ae = Z[1];
                    return ee(
                      t,
                      w,
                      E,
                      "gamedata",
                      Fe.toLowerCase(),
                      parseInt(Ae)
                    );
                  }
                  break;
                }
                case "last":
                case "直前": {
                  const Z = $.match(new RegExp(`\\[[${ne}]+\\]\\[([${ne} ]+)\\]`, "i"));
                  if (Z) {
                    const Ae = Z[1];
                    return ee(
                      t,
                      w,
                      E,
                      "gamedata",
                      Fe.toLowerCase(),
                      Ae
                    );
                  }
                  break;
                }
                case "actor":
                case "アクター":
                case "enemy":
                case "敵キャラ":
                case "エネミー":
                case "character":
                case "キャラクター": {
                  const Z = $.match(
                    new RegExp(
                      `\\[[${ne}]+\\]\\[([${ne}\\-]+)\\]\\[([${ne}\\.]+)\\]`,
                      "i"
                    )
                  );
                  if (Z) {
                    const Ae = Z[1], nl = Z[2];
                    return ee(
                      t,
                      w,
                      E,
                      "gamedata",
                      Fe.toLowerCase(),
                      Ae,
                      nl
                    );
                  }
                  break;
                }
              }
            }
          }
          const Be = u.match(/sc\[(.+)\]|script\[(.+)\]|スクリプト\[(.+)\]/i);
          if (Be) {
            const $ = Be[1] || Be[2] || Be[3];
            return ee(t, w, E, "script", $);
          }
          const tl = Number(u);
          return ee(t, w, E, "constant", tl);
        };
        if (ie) {
          const t = ie[1] || ie[3] || ie[5], o = ie[2] || ie[4] || ie[6];
          return [se("set", t, o)];
        }
        if (ce) {
          const t = ce[1] || ce[3] || ce[5], o = ce[2] || ce[4] || ce[6];
          return [se("add", t, o)];
        }
        if (ue) {
          const t = ue[1] || ue[3] || ue[5], o = ue[2] || ue[4] || ue[6];
          return [se("sub", t, o)];
        }
        if (le) {
          const t = le[1] || le[3] || le[5], o = le[2] || le[4] || le[6];
          return [se("mul", t, o)];
        }
        if (me) {
          const t = me[1] || me[3] || me[5], o = me[2] || me[4] || me[6];
          return [se("div", t, o)];
        }
        if (pe) {
          const t = pe[1] || pe[3] || pe[5], o = pe[2] || pe[4] || pe[6];
          return [se("mod", t, o)];
        }
        if (he) {
          const t = he[1] || he[3] || he[5], o = he[2] || he[4] || he[6];
          return [se("switch", t, o)];
        }
        if (de) {
          const t = de[1] || de[3] || de[5], o = de[2] || de[4] || de[6];
          return [se("selfswitch", t, o)];
        }
        const xi = ["timer", "タイマー"].map((t) => `<${t} *: *(.+) *, *(\\d+), *(\\d+) *>`), fe = e.match(new RegExp(xi.join("|"), "i")), zi = ["timer", "タイマー"].map((t) => `<${t} *: *(.+) *>`), st = e.match(new RegExp(zi.join("|"), "i"));
        if (fe) {
          const t = fe[1] || fe[4], o = parseInt(fe[2] || fe[5]), u = parseInt(fe[3] || fe[6]), m = 60 * o + u;
          return [vt(t, m)];
        }
        if (st) {
          const t = st[1] || st[2];
          return [vt(t, 0)];
        }
        if (te) {
          const t = te[1].split(",").map((o) => o.trim());
          if (t.length > 1) {
            const o = Number(t[0]), u = t[1], m = t.slice(2);
            return [Ys(o, u, m)];
          } else
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (Pe) {
          const t = Pe[1].split(",").map((o) => o.trim());
          if (t.length > 0) {
            const o = Number(t[0]), u = t.slice(1);
            return [Ks(o, u)];
          } else
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (Qe) {
          const t = Number(Qe[1]), o = Number(Qe[2]);
          return [Zs(t, o)];
        }
        if (Tt) {
          const t = Tt[1].split(",").map((o) => o.trim());
          if (t.length > 0) {
            const o = Number(t[0]), u = t.slice(1);
            return [Qs(o, u)];
          } else
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (Ft) {
          const t = Number(Ft[1]);
          return [er(t)];
        }
        if (At) {
          const t = At[1].split(",");
          if (t.length > 0) {
            const o = t[0].trim(), u = t.slice(1);
            return [fr(o, u)];
          } else
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (Bo) {
          const t = [];
          return t.push(Oe()), t.push(gr()), t;
        }
        if (jo) {
          const t = i.slice(-1)[0], o = 102, u = 301;
          return t && t.code === o ? [be(), yt()] : t && t.code === u ? [be(), It()] : [Oe(), ke()];
        }
        if (Wo)
          return [_r()];
        if (Go) {
          const t = [];
          return t.push(Oe()), t.push(Ot()), t;
        }
        if (qo)
          return [wr()];
        if (Uo)
          return [br()];
        if (Nt) {
          const t = Nt[1] || "";
          return [Cr(t)];
        }
        if (Mt) {
          const t = Mt[1] || "";
          return [Er(t)];
        }
        if (et) {
          const t = Number(et[1]), o = Number(et[2]);
          return [vr(t, o)];
        }
        if (tt) {
          const t = Number(tt[1]), o = tt[2];
          return [Or(t, o)];
        }
        if (Dt) {
          const t = Dt[1].split(",").filter((E) => E).map((E) => E.trim());
          let o = 0, u = 2, m = 0, f = 1, w = !1;
          return t.forEach((E) => {
            try {
              o = x(E);
              return;
            } catch {
            }
            try {
              u = ys(E);
              return;
            } catch {
            }
            switch (E.toLowerCase()) {
              case "branch":
              case "分岐":
                f = -2;
                return;
              case "disallow":
              case "禁止":
                f = -1;
                return;
              case "none":
              case "なし":
                m = -1, w = !0;
                return;
            }
            isNaN(Number(E)) || (w ? f = Number(E) - 1 : (m = Number(E) - 1, w = !0));
          }), [yr(o, u, m, f)];
        }
        if (kt) {
          const o = kt[1];
          return [Sr(0, o)];
        }
        if (xo)
          return [Ir()];
        if (h) {
          r || (r = oe());
          const t = h[1].match(/.*\((.+?)\)/i);
          if (t)
            r.parameters[0] = h[1].replace(/\(\d\)/, ""), r.parameters[1] = parseInt(t[1]), e = e.replace(h[0], "");
          else
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (C) {
          r || (r = oe());
          try {
            r.parameters[2] = x(C[1]);
          } catch {
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
          }
          e = e.replace(C[0], "");
        }
        if (g) {
          r || (r = oe());
          try {
            r.parameters[3] = we(g[1]);
          } catch {
            throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
          }
          e = e.replace(g[0], "");
        }
        d && (r || (r = oe()), r.parameters[4] = d[1], e = e.replace(d[0], ""));
        const rt = [];
        (h || C || g || d) && r && (b.log("push: ", r.parameters), rt.push(r));
        const $e = /^\d+$/, Ee = /(?:variables|v|変数)\[([0-9]+)\]/i, ns = /(?:actors|v|アクター)\[([0-9]+)\]/i, Ji = ["increase", "+", "増やす"], Xi = ["decrease", "-", "減らす"], Yi = ["add", "+", "加える", "付加"], Ki = ["remove", "-", "外す", "解除"], Zi = ["learn", "+", "覚える"], Qi = ["forget", "-", "忘れる"], ss = ["direct", "0", "直接指定"], rs = ["withvariables", "変数で指定"], ec = ["exchange", "2", "交換"], tc = ["random", "2", "ランダム"], as = ["character", "2", "キャラクターで指定", "キャラクター"], nc = ["retain", "0", "そのまま"], sc = ["down", "2", "下"], rc = ["left", "4", "左"], ac = ["right", "6", "右"], oc = ["up", "8", "上"], ic = ["black", "0", "黒"], cc = ["white", "1", "白"], uc = ["none", "2", "なし"], lc = ["boat", "0", "小型船"], mc = ["ship", "1", "大型船"], pc = ["airship", "2", "飛行船"], hc = ["x8 slower", "1", "1/8倍速"], dc = ["x4 slower", "2", "1/4倍速"], fc = ["x2 slower", "3", "1/2倍速"], gc = ["normal", "4", "標準速"], _c = ["x2 faster", "5", "2倍速"], wc = ["x4 faster", "6", "4倍速"], bc = ["terrain tag", "0", "地形タグ"], Cc = ["event id", "1", "イベントid"], Ec = ["layer 1", "2", "レイヤー１"], vc = ["layer 2", "3", "レイヤー２"], Oc = ["layer 3", "4", "レイヤー３"], yc = ["layer 4", "5", "レイヤー４"], Sc = ["region id", "6", "リージョンid"], Ic = ["lowest", "1", "最低"], Lc = ["lower", "2", "低"], Tc = ["normal", "3", "標準"], Fc = ["higher", "4", "高"], Ac = ["highest", "5", "最高"], Nc = ["normal", "0", "通常"], Mc = ["additive", "1", "加算"], Dc = ["multiply", "2", "乗算"], kc = ["screen", "3", "スクリーン"], Pc = ["maxhp", "0", "最大hp"], $c = ["maxmp", "1", "最大mp"], Vc = ["attack", "2", "攻撃力"], Hc = ["defense", "3", "防御力"], Rc = ["m.attack", "4", "魔法力"], Bc = ["m.defense", "5", "魔法防御"], jc = ["agility", "6", "敏捷性"], Wc = ["luck", "7", "運"], Gc = ["none", "なし", "0"], os = ["player", "-1", "プレイヤー"], is = ["this event", "0", "このイベント"], qc = ["exclamation", "1", "びっくり"], Uc = ["question", "2", "はてな"], xc = ["music note", "3", "音符"], zc = ["heart", "4", "ハート"], Jc = ["anger", "5", "怒り"], Xc = ["sweat", "6", "汗"], Yc = ["flustration", "cobweb", "7", "くしゃくしゃ"], Kc = ["silence", "8", "沈黙"], Zc = ["light bulb", "9", "電球"], Qc = ["zzz", "10", "zzz"], eu = ["user-defined1", "11", "ユーザー定義1"], tu = ["user-defined2", "12", "ユーザー定義2"], nu = ["user-defined3", "13", "ユーザー定義3"], su = ["user-defined4", "14", "ユーザー定義4"], ru = ["user-defined5", "15", "ユーザー定義5"], G = ["none", "なし"], au = ["rain", "雨"], ou = ["storm", "嵐"], iu = ["snow", "雪"], cu = ["item", "0", "アイテム"], uu = ["weapon", "1", "武器"], lu = ["armor", "2", "防具"], mu = ["standard", "0", "標準"], pu = ["last target", "-1", "ラストターゲット"], hu = ["random", "0", "ランダム"], du = ["index 1", "1", "インデックス１"], fu = ["index 2", "2", "インデックス２"], gu = ["index 3", "3", "インデックス３"], _u = ["index 4", "4", "インデックス４"], wu = ["index 5", "5", "インデックス５"], bu = ["index 6", "6", "インデックス６"], Cu = ["index 7", "7", "インデックス７"], Eu = ["index 8", "8", "インデックス８"], vu = ["true", "on", "オン", "1"], Ou = ["false", "off", "オフ", "0"], yu = ["wait for completion", "完了までウェイト", "wait"], Su = ["purchase only", "購入のみ"], Iu = ["repeat", "repeat movements", "動作を繰り返す"], Lu = ["skip", "skip if cannot move", "移動できない場合は飛ばす"], Tu = ["include equipment", "装備品を含む"], Fu = ["initialize", "初期化"], Au = ["allow knockout", "戦闘不能を許可"], Nu = ["show level up", "レベルアップを表示"], Mu = ["save exp", "経験値の保存", "save level", "レベルの保存"], cs = ["loophorizontally", "横方向にループする"], us = ["loopvertically", "縦方向にループする"], Du = ["true", "on", "オン", "0"], ku = ["false", "off", "オフ", "1"], Pu = ["disable", "0", "禁止"], $u = ["enable", "1", "許可"], ls = ["entire troop", "敵グループ全体"], Vu = ["entire party", "パーティ全体"], q = (t) => {
          if (Ji.includes(t))
            return 0;
          if (Xi.includes(t))
            return 1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, at = (t) => {
          if (Yi.includes(t))
            return 0;
          if (Ki.includes(t))
            return 1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Hu = (t) => {
          if (Zi.includes(t))
            return 0;
          if (Qi.includes(t))
            return 1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, U = (t) => {
          if (t.match($e))
            return { operand: 0, operandValue: Number(t) };
          if (t.match(Ee))
            return { operand: 1, operandValue: Number(t.match(Ee)[1]) };
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, K = (t) => {
          if (t.match($e))
            return { actor: 0, actorValue: Number(t) };
          if (Vu.includes(t))
            return { actor: 0, actorValue: 0 };
          if (t.match(Ee))
            return { actor: 1, actorValue: Number(t.match(Ee)[1]) };
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Ru = (t) => {
          if (t.match($e))
            return { subject: 0, subjectValue: Number(t) - 1 };
          if (t.match(ns))
            return { subject: 1, subjectValue: Number(t.match(ns)[1]) };
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, H = (t) => {
          if (vu.includes(t))
            return !0;
          if (yu.includes(t))
            return !0;
          if (Su.includes(t))
            return !0;
          if (Iu.includes(t))
            return !0;
          if (Lu.includes(t))
            return !0;
          if (Tu.includes(t))
            return !0;
          if (Fu.includes(t))
            return !0;
          if (Au.includes(t))
            return !0;
          if (Nu.includes(t))
            return !0;
          if (Mu.includes(t))
            return !0;
          if (Ou.includes(t))
            return !1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ot = (t) => {
          if (Du.includes(t))
            return 0;
          if (ku.includes(t))
            return 1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Ve = (t) => {
          if (Pu.includes(t))
            return 0;
          if ($u.includes(t))
            return 1;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, it = (t) => {
          if (ss.includes(t))
            return 0;
          if (rs.includes(t))
            return 1;
          if (ec.includes(t) || as.includes(t))
            return 2;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Bu = (t, o, u) => {
          if (ss.includes(t))
            return { locationType: 0, locationX: parseInt(o), locationY: parseInt(u) };
          if (rs.includes(t))
            return { locationType: 1, locationX: parseInt(o), locationY: parseInt(u) };
          if (as.includes(t)) {
            if (os.includes(o))
              return { locationType: 2, locationX: -1, locationY: 0 };
            if (is.includes(o))
              return { locationType: 2, locationX: 0, locationY: 0 };
            if (isNaN(parseInt(o)))
              throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
            return { locationType: 2, locationX: parseInt(o), locationY: 0 };
          } else
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ju = (t) => {
          if (t.match($e))
            return { troop: 0, troopValue: Number(t) };
          if (t.match(Ee))
            return { troop: 1, troopValue: Number(t.match(Ee)[1]) };
          if (tc.includes(t))
            return { troop: 2, troopValue: 0 };
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ct = (t) => {
          if (nc.includes(t))
            return 0;
          if (sc.includes(t))
            return 2;
          if (rc.includes(t))
            return 4;
          if (ac.includes(t))
            return 6;
          if (oc.includes(t))
            return 8;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Wu = (t) => {
          if (ic.includes(t))
            return 0;
          if (cc.includes(t))
            return 1;
          if (uc.includes(t))
            return 2;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ut = (t) => {
          if (lc.includes(t))
            return 0;
          if (mc.includes(t))
            return 1;
          if (pc.includes(t))
            return 2;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ms = (t) => {
          if (hc.includes(t))
            return 1;
          if (dc.includes(t))
            return 2;
          if (fc.includes(t))
            return 3;
          if (gc.includes(t))
            return 4;
          if (_c.includes(t))
            return 5;
          if (wc.includes(t))
            return 6;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Gu = (t) => {
          if (Ic.includes(t))
            return 1;
          if (Lc.includes(t))
            return 2;
          if (Tc.includes(t))
            return 3;
          if (Fc.includes(t))
            return 4;
          if (Ac.includes(t))
            return 5;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, qu = (t) => {
          if (Nc.includes(t))
            return 0;
          if (Mc.includes(t))
            return 1;
          if (Dc.includes(t))
            return 2;
          if (kc.includes(t))
            return 3;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Uu = (t) => {
          if (bc.includes(t))
            return 0;
          if (Cc.includes(t))
            return 1;
          if (Ec.includes(t))
            return 2;
          if (vc.includes(t))
            return 3;
          if (Oc.includes(t))
            return 4;
          if (yc.includes(t))
            return 5;
          if (Sc.includes(t))
            return 6;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, xu = (t) => {
          if (Pc.includes(t))
            return 0;
          if ($c.includes(t))
            return 1;
          if (Vc.includes(t))
            return 2;
          if (Hc.includes(t))
            return 3;
          if (Rc.includes(t))
            return 4;
          if (Bc.includes(t))
            return 5;
          if (jc.includes(t))
            return 6;
          if (Wc.includes(t))
            return 7;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, zu = (t) => {
          if (Gc.includes(t))
            return 0;
          if (isNaN(parseInt(t)))
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return parseInt(t);
        }, Te = (t) => {
          if (os.includes(t))
            return -1;
          if (is.includes(t))
            return 0;
          if (isNaN(parseInt(t)))
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return parseInt(t);
        }, Ju = (t) => {
          if (qc.includes(t))
            return 1;
          if (Uc.includes(t))
            return 2;
          if (xc.includes(t))
            return 3;
          if (zc.includes(t))
            return 4;
          if (Jc.includes(t))
            return 5;
          if (Xc.includes(t))
            return 6;
          if (Yc.includes(t))
            return 7;
          if (Kc.includes(t))
            return 8;
          if (Zc.includes(t))
            return 9;
          if (Qc.includes(t))
            return 10;
          if (eu.includes(t))
            return 11;
          if (tu.includes(t))
            return 12;
          if (nu.includes(t))
            return 13;
          if (su.includes(t))
            return 14;
          if (ru.includes(t))
            return 15;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Xu = (t) => {
          if (G.includes(t))
            return "none";
          if (au.includes(t))
            return "rain";
          if (ou.includes(t))
            return "storm";
          if (iu.includes(t))
            return "snow";
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Yu = (t) => {
          if (cu.includes(t))
            return 0;
          if (uu.includes(t))
            return 1;
          if (lu.includes(t))
            return 2;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, Ku = (t) => {
          if (mu.includes(t))
            return { price: 0, priceValue: 0 };
          if (isNaN(parseInt(t)))
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return { price: 1, priceValue: parseInt(t) };
        }, Zu = (t) => {
          if (pu.includes(t))
            return -2;
          if (hu.includes(t))
            return -1;
          if (du.includes(t))
            return 0;
          if (fu.includes(t))
            return 1;
          if (gu.includes(t))
            return 2;
          if (_u.includes(t))
            return 3;
          if (wu.includes(t))
            return 4;
          if (bu.includes(t))
            return 5;
          if (Cu.includes(t))
            return 6;
          if (Eu.includes(t))
            return 7;
          throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }, ge = (t) => {
          if (ls.includes(t))
            return -1;
          if (isNaN(parseInt(t)))
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return parseInt(t) - 1;
        }, Qu = (t) => {
          if (ls.includes(t))
            return { enemyValue: 0, isAllChecked: !0 };
          if (isNaN(parseInt(t)))
            throw new Error("Syntax error. / 文法エラーです。:" + e.replace(/</g, "  ").replace(/>/g, "  "));
          return { enemyValue: parseInt(t) - 1, isAllChecked: !1 };
        };
        if (Pt) {
          const t = Pt[1].split(",").map((f) => f.trim().toLowerCase()), o = q(t[0].toLowerCase()), { operand: u, operandValue: m } = U(t[1].toLowerCase());
          return [Lr(o, u, m)];
        }
        if ($t) {
          const t = $t[1].split(",").map((w) => w.trim().toLowerCase()), o = parseInt(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]);
          return [Tr(o, u, m, f)];
        }
        if (Vt) {
          const t = Vt[1].split(",").map((E) => E.trim().toLowerCase()), o = parseInt(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]), w = t[3] === void 0 ? !1 : H(t[3]);
          return [Fr(o, u, m, f, w)];
        }
        if (Ht) {
          const t = Ht[1].split(",").map((E) => E.trim().toLowerCase()), o = parseInt(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]), w = t[3] === void 0 ? !1 : H(t[3]);
          return [Ar(o, u, m, f, w)];
        }
        if (Rt) {
          const t = Rt[1].split(",").map((f) => f.trim().toLowerCase()), o = parseInt(t[0]), u = at(t[1]), m = t[2] === void 0 ? !1 : H(t[2]);
          return [Nr(o, u, m)];
        }
        if (Bt) {
          const t = Bt[1].split(",").map((F) => F.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = q(t[1]), { operand: f, operandValue: w } = U(t[2]), E = t[3] === void 0 ? !1 : H(t[3]);
          return [Mr(o, u, m, f, w, E)];
        }
        if (jt) {
          const t = jt[1].split(",").map((E) => E.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = q(t[1]), { operand: f, operandValue: w } = U(t[2]);
          return [Dr(o, u, m, f, w)];
        }
        if (Wt) {
          const t = Wt[1].split(",").map((E) => E.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = q(t[1]), { operand: f, operandValue: w } = U(t[2]);
          return [kr(o, u, m, f, w)];
        }
        if (Gt) {
          const t = Gt[1].split(",").map((w) => w.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = at(t[1]), f = parseInt(t[2]);
          return [Pr(o, u, m, f)];
        }
        if (qt) {
          const t = qt[1].split(",").map((m) => m.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]);
          return [$r(o, u)];
        }
        if (Ut) {
          const t = Ut[1].split(",").map((F) => F.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = q(t[1]), { operand: f, operandValue: w } = U(t[2]), E = t[3] === void 0 ? !1 : H(t[3]);
          return [Vr(o, u, m, f, w, E)];
        }
        if (xt) {
          const t = xt[1].split(",").map((F) => F.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = q(t[1]), { operand: f, operandValue: w } = U(t[2]), E = t[3] === void 0 ? !1 : H(t[3]);
          return [Hr(o, u, m, f, w, E)];
        }
        if (zt) {
          const t = zt[1].split(",").map((F) => F.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = xu(t[1]), f = q(t[2]), { operand: w, operandValue: E } = U(t[3]);
          return [Rr(o, u, m, f, w, E)];
        }
        if (Jt) {
          const t = Jt[1].split(",").map((w) => w.trim().toLowerCase()), { actor: o, actorValue: u } = K(t[0]), m = Hu(t[1]), f = parseInt(t[2]);
          return [Br(o, u, m, f)];
        }
        if (Xt) {
          const t = Xt[1].split(",").map((f) => f.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]), m = zu(t[2]);
          return [jr(o, u, m)];
        }
        if (Yt) {
          const t = Yt[1].split(",").map((m) => m.trim().toLowerCase()), o = parseInt(t[0]), u = t[1] === void 0 ? "" : t[1];
          return [Wr(o, u)];
        }
        if (Kt) {
          const t = Kt[1].split(",").map((f) => f.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]), m = t[2] === void 0 ? !1 : H(t[2]);
          return [Gr(o, u, m)];
        }
        if (Zt) {
          const t = Zt[1].split(",").map((m) => m.trim().toLowerCase()), o = parseInt(t[0]), u = t[1] === void 0 ? "" : t[1];
          return [qr(o, u)];
        }
        if (Qt) {
          const t = Qt[1].split(",").map((E) => E.trim()), o = parseInt(t[0]), u = t[1] === void 0 ? "" : String(t[1]), m = t[2] === void 0 ? "" : String(t[2]), f = u.includes("\\n");
          let w = "";
          return f || m === "" ? w = u : w = u + `
` + m, [Ur(o, w)];
        }
        if (en) {
          const t = en[1].split(",").map((He) => He.trim().toLowerCase()), o = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/, u = t[0].match(o);
          if (!u)
            throw new Error("Syntax error. / 文法エラーです。:" + t[0]);
          const m = it(u[1]), f = parseInt(u[2]), w = parseInt(u[3]), E = parseInt(u[4]), F = ct(t[1]), V = Wu(t[2]);
          return [xr(m, f, w, E, F, V)];
        }
        if (tn) {
          const t = tn[1].split(",").map((V) => V.trim().toLowerCase()), o = ut(t[0]), u = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/, m = t[1].match(u);
          if (!m)
            throw new Error("Syntax error. / 文法エラーです。:" + t[1]);
          const f = it(m[1]), w = parseInt(m[2]), E = parseInt(m[3]), F = parseInt(m[4]);
          return [zr(o, f, w, E, F)];
        }
        if (nn) {
          const t = nn[1].split(",").map((V) => V.trim().toLowerCase()), o = Te(t[0]), u = /(.*?)\[(.*?)](\[(\d+)])?(\[(\d+)])?/, m = t[1].match(u);
          if (!m)
            throw new Error("Syntax error. / 文法エラーです。:" + t[1]);
          const f = it(m[1]);
          let w = 0, E = 0;
          f === 0 || f === 1 ? (w = parseInt(m[2]), E = parseInt(m[4])) : f === 2 && (w = Te(m[2]), E = 0);
          const F = ct(t[2]);
          return [Jr(o, f, w, E, F)];
        }
        if (sn) {
          const t = sn[1].split(",").map((w) => w.trim().toLowerCase()), o = ct(t[0]), u = parseInt(t[1]), m = ms(t[2]), f = t[3] === void 0 ? !1 : H(t[3]);
          return [Xr(o, u, m, f)];
        }
        if (rn) {
          const t = rn[1].split(",").map((w) => w.trim().toLowerCase()), o = Te(t[0]), u = t[1] === void 0 ? !1 : H(t[1]), m = t[2] === void 0 ? !1 : H(t[2]), f = t[3] === void 0 ? !1 : H(t[3]);
          return [Yr(o, u, m, f)];
        }
        if (zo)
          return [Kr()];
        if (Jo)
          return [Zr()];
        if (Xo)
          return [Qr()];
        if (Yo)
          return [ea()];
        if (Ko)
          return [ta()];
        if (Zo)
          return [na()];
        if (Qo)
          return [sa()];
        if (ei)
          return [ra()];
        if (ti)
          return [aa()];
        if (ni)
          return [oa()];
        if (si)
          return [ia()];
        if (ri)
          return [ca()];
        if (ai)
          return [ua()];
        if (an) {
          const t = an[1].split(",").map((m) => m.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]);
          return [la(o, u)];
        }
        if (on) {
          const t = on[1].split(",").map((u) => u.trim().toLowerCase()), o = parseInt(t[0]);
          return [ma(o)];
        }
        if (oi)
          return [pa()];
        if (ii)
          return [ha()];
        if (ci)
          return [da()];
        if (ui)
          return [fa()];
        if (mi)
          return [_a()];
        if (li)
          return [ga()];
        if (pi)
          return [wa()];
        if (hi)
          return [ba()];
        if (di)
          return [Ca()];
        if (fi)
          return [Ea()];
        if (gi)
          return [va()];
        if (cn) {
          const t = cn[1].split(",").map((u) => u.trim().toLowerCase()), o = parseInt(t[0]);
          return [Oa(o)];
        }
        if (un) {
          const t = un[1].split(",").map((u) => u.trim().toLowerCase()), o = parseInt(t[0]);
          return [ya(o)];
        }
        if (ln) {
          const t = ln[1].split(",").map((u) => u.trim().toLowerCase()), o = ms(t[0]);
          return [Sa(o)];
        }
        if (mn) {
          const t = mn[1].split(",").map((u) => u.trim().toLowerCase()), o = Gu(t[0]);
          return [Ia(o)];
        }
        if (_i)
          return [La()];
        if (wi)
          return [Ta()];
        if (bi)
          return [Fa()];
        if (Ci)
          return [Aa()];
        if (Ei)
          return [Na()];
        if (vi)
          return [Ma()];
        if (Oi)
          return [Da()];
        if (yi)
          return [ka()];
        if (Si)
          return [Pa()];
        if (Ii)
          return [$a()];
        if (pn) {
          const t = pn[1].split(",").map((m) => m.trim()), o = G.includes(t[0].toLowerCase()) ? "" : t[0], u = t[1] === void 0 ? 0 : parseInt(t[1]);
          return [Va(o, u)];
        }
        if (hn) {
          const t = hn[1].split(",").map((u) => u.trim().toLowerCase()), o = parseInt(t[0]);
          return [Ha(o)];
        }
        if (dn) {
          const t = dn[1].split(",").map((u) => u.trim().toLowerCase()), o = qu(t[0]);
          return [Ra(o)];
        }
        if (nt && nt[1]) {
          const t = nt[1].replace(/ /g, "").split(",");
          let o = "Attack1", u = 90, m = 100, f = 0;
          return t[0] && (o = t[0]), (Number(t[1]) || Number(t[1]) === 0) && (u = Number(t[1])), (Number(t[2]) || Number(t[2]) === 0) && (m = Number(t[2])), (Number(t[3]) || Number(t[3]) === 0) && (f = Number(t[3])), o.toUpperCase() === "NONE" || o === "なし" ? [St("", u, m, f)] : [St(o, u, m, f)];
        }
        if (fn) {
          const o = fn[1].split(",").map((u) => u.trim().toLowerCase())[0];
          return [Ba(o)];
        }
        if (Li)
          return [ja()];
        if (gn) {
          const t = gn[1].split(",").map((u) => u.trim().toLowerCase()), o = ot(t[0]);
          return [Wa(o)];
        }
        if (_n) {
          const t = _n[1].split(",").map((u) => u.trim().toLowerCase()), o = ot(t[0]);
          return [Ga(o)];
        }
        if (Ti)
          return [qa()];
        if (wn) {
          const t = wn[1].split(",").map((f) => f.trim().toLowerCase()), o = Te(t[0]), u = parseInt(t[1]), m = t[2] === void 0 ? !1 : H(t[2]);
          return [Ua(o, u, m)];
        }
        if (bn) {
          const t = bn[1].split(",").map((f) => f.trim().toLowerCase()), o = Te(t[0]), u = Ju(t[1]), m = t[2] === void 0 ? !1 : H(t[2]);
          return [xa(o, u, m)];
        }
        if (Fi)
          return [za()];
        if (Cn) {
          const t = Cn[1].split(",").map((o) => o.trim());
          if (t.length > 0)
            return [Ja(t)];
          throw console.error(e), new Error("Syntax error. / 文法エラーです。" + e.replace(/</g, "  ").replace(/>/g, "  "));
        }
        if (En) {
          const t = En[1].split(",").map((F) => F.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]), m = parseInt(t[2]), f = parseInt(t[3]), w = parseInt(t[4]), E = t[5] === void 0 ? !1 : H(t[5]);
          return [Xa(o, u, m, f, w, E)];
        }
        if (vn) {
          const t = vn[1].split(",").map((w) => w.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]), m = parseInt(t[2]), f = t[3] === void 0 ? !1 : H(t[3]);
          return [Ya(o, u, m, f)];
        }
        if (On) {
          const t = On[1].split(",").map((w) => w.trim().toLowerCase()), o = Xu(t[0]), u = parseInt(t[1]), m = parseInt(t[2]), f = t[3] === void 0 ? !1 : H(t[3]);
          return [Ka(o, u, m, f)];
        }
        if (yn) {
          const t = yn[1].split(",").map((u) => u.trim()), o = G.includes(t[0].toLowerCase()) ? "" : t[0];
          return [Za(o)];
        }
        if (Sn) {
          const t = Sn[1].split(",").map((m) => m.trim().toLowerCase()), { troop: o, troopValue: u } = ju(t[0]);
          return [Qa(o, u)];
        }
        if (Ai)
          return [ze()];
        if (Ni)
          return [eo()];
        if (Mi)
          return [to()];
        if (Tn) {
          const t = Tn[1].split(",").map((m) => m.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]);
          return [no(o, u)];
        }
        if (In) {
          const t = In[1].split(",").map((u) => u.trim().toLowerCase()), o = t[0] === "" ? !1 : H(t[0]);
          return [so(o)];
        }
        if (Ln) {
          const t = Ln[1].split(",").map((w) => w.trim().toLowerCase()), o = Yu(t[0]), u = parseInt(t[1]), { price: m, priceValue: f } = t[2] === void 0 ? { price: 0, priceValue: 0 } : Ku(t[2]);
          return [ro(o, u, m, f)];
        }
        if (Di)
          return [ao()];
        if (ki)
          return [oo()];
        if (Pi)
          return [io()];
        if ($i)
          return [co()];
        if (Fn) {
          const t = Fn[1].split(",").map((w) => w.trim()), o = G.includes(t[0].toLowerCase()) ? "" : t[0], u = t[1] === void 0 ? 90 : parseInt(t[1]), m = t[2] === void 0 ? 100 : parseInt(t[2]), f = t[3] === void 0 ? 0 : parseInt(t[3]);
          return [uo(o, u, m, f)];
        }
        if (An) {
          const t = An[1].split(",").map((w) => w.trim()), o = G.includes(t[0].toLowerCase()) ? "" : t[0], u = t[1] === void 0 ? 90 : parseInt(t[1]), m = t[2] === void 0 ? 100 : parseInt(t[2]), f = t[3] === void 0 ? 0 : parseInt(t[3]);
          return [lo(o, u, m, f)];
        }
        if (Nn) {
          const t = Nn[1].split(",").map((E) => E.trim()), o = ut(t[0].toLowerCase()), u = G.includes(t[1].toLowerCase()) ? "" : t[1], m = t[2] === void 0 ? 90 : parseInt(t[2]), f = t[3] === void 0 ? 100 : parseInt(t[3]), w = t[4] === void 0 ? 0 : parseInt(t[4]);
          return [mo(o, u, m, f, w)];
        }
        if (Mn) {
          const t = Mn[1].split(",").map((u) => u.trim().toLowerCase()), o = Ve(t[0]);
          return [po(o)];
        }
        if (Dn) {
          const t = Dn[1].split(",").map((u) => u.trim().toLowerCase()), o = Ve(t[0]);
          return [ho(o)];
        }
        if (kn) {
          const t = kn[1].split(",").map((u) => u.trim().toLowerCase()), o = Ve(t[0]);
          return [fo(o)];
        }
        if (Pn) {
          const t = Pn[1].split(",").map((u) => u.trim().toLowerCase()), o = Ve(t[0]);
          return [go(o)];
        }
        if ($n) {
          const t = $n[1].split(",").map((f) => f.trim().toLowerCase()), o = parseInt(t[0]), u = parseInt(t[1]), m = parseInt(t[2]);
          return [_o(o, u, m)];
        }
        if (Vn) {
          const t = Vn[1].split(",").map((F) => F.trim()), o = parseInt(t[0]), u = G.includes(t[1].toLowerCase()) ? "" : String(t[1]), m = parseInt(t[2]), f = G.includes(t[3].toLowerCase()) ? "" : String(t[3]), w = parseInt(t[4]), E = G.includes(t[5].toLowerCase()) ? "" : String(t[5]);
          return [wo(o, u, m, f, w, E)];
        }
        if (Hn) {
          const t = Hn[1].split(",").map((f) => f.trim()), o = ut(t[0].toLowerCase()), u = G.includes(t[1].toLowerCase()) ? "" : String(t[1]), m = t[2] === void 0 ? 0 : parseInt(t[2]);
          return [bo(o, u, m)];
        }
        if (Rn) {
          const t = Rn[1].split(",").map((u) => u.trim().toLowerCase()), o = ot(t[0]);
          return [Co(o)];
        }
        if (Bn) {
          const t = Bn[1].split(",").map((u) => u.trim().toLowerCase()), o = parseInt(t[0]);
          return [Eo(o)];
        }
        if (jn) {
          const t = jn[1].split(",").map((m) => m.trim()), o = G.includes(t[0].toLowerCase()) ? "" : String(t[0]), u = G.includes(t[1].toLowerCase()) ? "" : String(t[1]);
          return [vo(o, u)];
        }
        if (Wn) {
          const t = Wn[1].split(",").map((He) => He.trim()), o = G.includes(t[0].toLowerCase()) ? "" : String(t[0]), u = /(.*?)\[(-?\d+)]/, m = t[1] === void 0 ? void 0 : t[1].match(u), f = t[2] === void 0 ? void 0 : t[2].match(u);
          let w = !1, E = !1, F = 0, V = 0;
          return m !== void 0 && (cs.includes(m[1].toLowerCase()) ? (w = !0, F = parseInt(m[2])) : us.includes(m[1].toLowerCase()) && (E = !0, V = parseInt(m[2]))), f !== void 0 && (cs.includes(f[1].toLowerCase()) ? (w = !0, F = parseInt(f[2])) : us.includes(f[1].toLowerCase()) && (E = !0, V = parseInt(f[2]))), [Oo(o, w, E, F, V)];
        }
        if (Gn) {
          const t = Gn[1].split(",").map((V) => V.trim().toLowerCase()), o = parseInt(t[0]), u = Uu(t[1]), m = /^(.*?)\[(.*?)](\[(\d+)])?/, f = t[2].match(m);
          if (!f)
            throw new Error("Syntax error. / 文法エラーです。:" + t[2]);
          const { locationType: w, locationX: E, locationY: F } = Bu(f[1], f[2], f[4]);
          return [yo(o, u, w, E, F)];
        }
        if (qn) {
          const t = qn[1].split(",").map((E) => E.trim().toLowerCase()), o = ge(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]), w = t[3] === void 0 ? !1 : H(t[3]);
          return [So(o, u, m, f, w)];
        }
        if (Un) {
          const t = Un[1].split(",").map((w) => w.trim().toLowerCase()), o = ge(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]);
          return [Io(o, u, m, f)];
        }
        if (xn) {
          const t = xn[1].split(",").map((w) => w.trim().toLowerCase()), o = ge(t[0]), u = q(t[1]), { operand: m, operandValue: f } = U(t[2]);
          return [Lo(o, u, m, f)];
        }
        if (zn) {
          const t = zn[1].split(",").map((f) => f.trim().toLowerCase()), o = ge(t[0]), u = at(t[1]), m = parseInt(t[2]);
          return [To(o, u, m)];
        }
        if (Jn) {
          const t = Jn[1].split(",").map((u) => u.trim().toLowerCase()), o = ge(t[0]);
          return [Fo(o)];
        }
        if (Xn) {
          const t = Xn[1].split(",").map((u) => u.trim().toLowerCase()), o = ge(t[0]);
          return [Ao(o)];
        }
        if (Yn) {
          const t = Yn[1].split(",").map((m) => m.trim().toLowerCase()), o = ge(t[0]), u = parseInt(t[1]);
          return [No(o, u)];
        }
        if (Kn) {
          const t = Kn[1].split(",").map((f) => f.trim().toLowerCase()), { enemyValue: o, isAllChecked: u } = Qu(t[0]), m = parseInt(t[1]);
          return [Mo(o, m, u)];
        }
        if (Zn) {
          const t = Zn[1].split(",").map((w) => w.trim().toLowerCase()), { subject: o, subjectValue: u } = Ru(t[0]), m = parseInt(t[1]), f = Zu(t[2]);
          return [Do(o, u, m, f)];
        }
        return Vi ? [ko()] : (e.match(/\S/g) && (b.log("push: ", e), rt.push(Ss(e))), rt);
      }, Vo = function(e, r, i, p, h, g) {
        let C = [];
        const d = $o(e, i, h, g), I = 101, A = 102, D = 401, k = 402, j = 403, z = 111, B = 302, X = 605, ye = ke().code, Xe = yt().code, Ye = It().code, Se = 301, Ie = 601, Ke = 602, Le = 603, Ce = 205, Ze = 505;
        if (d.forEach((T) => {
          (T.code === ye || T.code === Xe || T.code === Ye) && h.pop();
        }), Array.isArray(d) && d.length > 0) {
          if (d.length > 1)
            return C = C.concat(d), { window_frame: null, event_command_list: C, block_stack: h };
          const T = d[0];
          if (T.code === I)
            return i = T, { window_frame: i, event_command_list: C, block_stack: h };
          if (T.code === D)
            p ? p.code === D ? r === "" && C.push(oe()) : p.code === I ? C.push(i) : C.push(oe()) : C.push(oe());
          else if (T.code === k) {
            const W = h.slice(-1)[0].index, te = h.slice(-1)[0].event;
            W !== 0 && C.push(be()), T.parameters[0] = W, h.slice(-1)[0].index += 1, te && Array.isArray(te.parameters) && te.parameters[0].push(T.parameters[1]);
          } else if (T.code === j)
            h.slice(-1)[0].index !== 0 && C.push(be()), h.slice(-1)[0].index += 1;
          else if (T.code === Ie)
            h.slice(-1)[0].winCode = !0;
          else if (T.code === Ke) {
            h.slice(-1)[0].winCode === !1 && (C.push(ze()), h.slice(-1)[0].winCode = !0);
            const W = h.slice(-1)[0].event;
            C.push(be()), W.parameters[2] = !0;
          } else if (T.code === Le) {
            h.slice(-1)[0].winCode === !1 && (C.push(ze()), h.slice(-1)[0].winCode = !0);
            const W = h.slice(-1)[0].event;
            C.push(be()), W.parameters[3] = !0;
          } else
            T.code === A ? h.push({ code: T.code, event: T, indent: h.length, index: 0 }) : T.code === z ? h.push({ code: T.code, event: T, indent: h.length, index: 0 }) : T.code === Se ? h.push({ code: T.code, event: T, indent: h.length, winCode: !1 }) : T.code === Ce && h.push({ code: T.code, event: T, indent: h.length });
          if (T.code === X && p.code === B && p.parameters[1] === 0 && (p.parameters[0] = T.parameters[0], p.parameters[1] = T.parameters[1], p.parameters[2] = T.parameters[2], p.parameters[3] = T.parameters[3], d.pop()), T.code === Ze) {
            const W = h.slice(-1)[0].event;
            if (W.code === Ce) {
              const te = T.parameters[0], Pe = W.parameters[1].list.pop();
              W.parameters[1].list.push(te), W.parameters[1].list.push(Pe);
            }
          }
          C = C.concat(d);
        }
        return { window_frame: null, event_command_list: C, block_stack: h };
      }, Ho = function(e) {
        return e.reduce((k, j) => {
          const z = JSON.parse(JSON.stringify(j.parameters));
          let B = 0;
          const X = k.slice(-1)[0];
          if (X !== void 0)
            switch (B = X.indent, X.code) {
              case 111:
              case 411:
              case 112:
              case 402:
              case 601:
              case 602:
              case 603:
              case 403: {
                B += 1;
                break;
              }
              case 0:
                B -= 1;
                break;
            }
          return k.push({ code: j.code, indent: B, parameters: z }), k;
        }, []);
      }, Lt = function(e) {
        let r = R(e);
        r = J(r, n.Text2Frame.CommentOutChar);
        let i = {};
        ["script", "comment", "scrolling"].forEach(function(I) {
          const A = Xs(r, I);
          r = A.scenario_text, i = Object.assign(i, A.block_map);
        });
        const p = r.split(`
`);
        let h = [], g = "", C = null, d = [];
        for (let I = 0; I < p.length; I++) {
          const A = p[I];
          if (A) {
            let D = C;
            D === null && (D = h.slice(-1)[0]);
            const k = Vo(A, g, C, D, d, i);
            C = k.window_frame;
            const j = k.event_command_list;
            d = k.block_stack, h = h.concat(j);
          }
          b.log(I, A), g = A;
        }
        return h = Po(h), h = Ho(h), h;
      };
      if (n.Text2Frame.export = { compile: Lt }, n.Text2Frame.ExecMode === "LIBRARY_EXPORT")
        return;
      const Ro = y(n.Text2Frame.TextPath), Je = Lt(Ro);
      switch (Je.push(Oe()), n.Text2Frame.ExecMode) {
        case "IMPORT_MESSAGE_TO_EVENT":
        case "メッセージをイベントにインポート": {
          const e = L(n.Text2Frame.MapPath);
          if (!e.events[n.Text2Frame.EventID])
            throw new Error(
              `EventID not found. / EventIDが見つかりません。
Event ID: ` + n.Text2Frame.EventID
            );
          const r = Number(n.Text2Frame.PageID) - 1;
          for (; !e.events[n.Text2Frame.EventID].pages[r]; )
            e.events[n.Text2Frame.EventID].pages.push(O());
          let i = e.events[n.Text2Frame.EventID].pages[r].list;
          n.Text2Frame.IsOverwrite && (i = []), i.pop(), i = i.concat(Je), e.events[n.Text2Frame.EventID].pages[r].list = i, N(n.Text2Frame.MapPath, e), l(
            `Success / 書き出し成功！
======> MapID: ` + n.Text2Frame.MapID + " -> EventID: " + n.Text2Frame.EventID + " -> PageID: " + n.Text2Frame.PageID
          );
          break;
        }
        case "IMPORT_MESSAGE_TO_CE":
        case "メッセージをコモンイベントにインポート": {
          const e = L(n.Text2Frame.CommonEventPath);
          if (e.length - 1 < n.Text2Frame.CommonEventID)
            throw new Error(
              "Common Event not found. / コモンイベントが見つかりません。: " + n.Text2Frame.CommonEventID
            );
          let r = e[n.Text2Frame.CommonEventID].list;
          n.Text2Frame.IsOverwrite && (r = []), r.pop(), e[n.Text2Frame.CommonEventID].list = r.concat(Je), N(n.Text2Frame.CommonEventPath, e), l(`Success / 書き出し成功！
=====> Common EventID :` + n.Text2Frame.CommonEventID);
          break;
        }
      }
      l(`
`), l(
        `Please restart RPG Maker MV(Editor) WITHOUT save. 
**セーブせずに**プロジェクトファイルを開き直してください`
      ), console.log(
        `Please restart RPG Maker MV(Editor) WITHOUT save. 
**セーブせずに**プロジェクトファイルを開き直してください`
      );
    }, Game_Interpreter.prototype.pluginCommandText2Frame("LIBRARY_EXPORT", [0]), v.exports = n.Text2Frame.export;
  }(), typeof ps < "u" && typeof require.main < "u" && require.main === v) {
    const n = Gl;
    n.version("2.2.1").usage("[options]").option("-m, --mode <map|common|compile|test>", "output mode", /^(map|common|compile|test)$/i).option("-t, --text_path <name>", "text file path").option("-o, --output_path <name>", "output file path").option("-e, --event_id <name>", "event file id").option("-p, --page_id <name>", "page id").option("-c, --common_event_id <name>", "common event id").option("-w, --overwrite <true/false>", "overwrite mode", "false").option("-v, --verbose", "debug mode", !1).parse(), n.addHelpText("after", `
===== Manual =====
    NAME
       Text2Frame - Simple compiler to convert text to event command.
    SYNOPSIS
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --page_id <page id> --overwrite <true|false>
        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
        node Text2Frame.js --mode compile
        node Text2Frame.js --verbose --mode test
    DESCRIPTION
        node Text2Frame.js --verbose --mode map --text_path <text file path> --output_path <output file path> --event_id <event id> --page_id <page id> --overwrite <true|false>
          マップへのイベント出力モードです。
          読み込むファイル、出力マップ、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/Map001.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode map --text_path test/basic.txt --output_path data/Map001.json --event_id 1 --page_id 1 --overwrite true
          例2：$ node Text2Frame.js -m map -t test/basic.txt -o data/Map001.json -e 1 -p 1 -w true

        node Text2Frame.js --verbose --mode common --text_path <text file path> --common_event_id <common event id> --overwrite <true|false>
          コモンイベントへのイベント出力モードです。
          読み込むファイル、出力コモンイベント、上書きの有無を引数で指定します。
          test/basic.txt を読み込み data/CommonEvents.json に上書きするコマンド例は以下です。

          例1：$ node Text2Frame.js --mode common --text_path test/basic.txt --output_path data/CommonEvents.json --common_event_id 1 --overwrite true
          例2：$ node Text2Frame.js -m common -t test/basic.txt -o data/CommonEvents.json -c 1 -w true

        node Text2Frame.js --mode compile
          コンパイルモードです。
          変換したいテキストファイルをパイプで与えると、対応したイベントに変換されたJSONを、標準出力に出力します。
          このモードでは、Map.json / CommonEvent.jsonの形式へフォーマットされず、イベントに変換したJSONのみが出力されるため、
          Map.json/CommonEvent.json への組み込みは各自で行う必要があります。

          例1: $ cat test/basic.txt | node Text2Frame.js --mode compile

        node Text2Frame.js --mode test
          テストモードです。test/basic.txtを読み込み、data/Map001.jsonに出力します。

`);
    const a = n.opts();
    if (["map", "common", "compile", "test"].includes(a.mode) || (n.help(), process.exit(0)), a.mode === "map") {
      const c = {
        IsDebug: a.verbose,
        TextPath: a.text_path,
        IsOverwrite: a.overwrite === "true",
        ExecMode: "IMPORT_MESSAGE_TO_EVENT",
        MapPath: a.output_path,
        EventID: a.event_id,
        PageID: a.page_id ? a.page_id : "1"
      };
      Game_Interpreter.prototype.pluginCommandText2Frame("COMMAND_LINE", [c]);
    } else if (a.mode === "common") {
      const c = {
        IsDebug: a.verbose,
        TextPath: a.text_path,
        IsOverwrite: a.overwrite === "true",
        ExecMode: "IMPORT_MESSAGE_TO_CE",
        CommonEventPath: a.output_path,
        CommonEventID: a.common_event_id
      };
      Game_Interpreter.prototype.pluginCommandText2Frame("COMMAND_LINE", [c]);
    } else if (a.mode === "compile") {
      process.stdin.setEncoding("utf8");
      let c = "";
      process.stdin.on("readable", () => {
        let l;
        for (; (l = process.stdin.read()) !== null; )
          c += l;
      }), process.stdin.on("end", () => {
        console.log(JSON.stringify(v.exports.compile(c), null, 2));
      });
    } else if (a.mode === "test") {
      const c = {
        IsDebug: a.verbose,
        MapID: "1",
        EventID: "1",
        PageID: "1",
        IsOverwrite: !0,
        TextPath: "test/basic.txt",
        MapPath: "data/Map001.json"
      };
      Game_Interpreter.prototype.pluginCommandText2Frame("COMMAND_LINE", [c]);
    }
  }
})(_t);
var ql = _t.exports;
const am = /* @__PURE__ */ _s(ql);
export {
  am as default
};
