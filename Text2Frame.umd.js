/* Text2Frame-MV dist | version: 2.3.0 | build: local */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('path'), require('fs'), require('node:events'), require('node:child_process'), require('node:path'), require('node:fs'), require('node:process')) :
	typeof define === 'function' && define.amd ? define(['path', 'fs', 'node:events', 'node:child_process', 'node:path', 'node:fs', 'node:process'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Text2Frame = factory(global.require$$0$1, global.require$$1$1, global.require$$0, global.require$$1, global.require$$2, global.require$$3, global.require$$4));
})(this, (function (require$$0$1, require$$1$1, require$$0, require$$1, require$$2, require$$3, require$$4) { 'use strict';

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function commonjsRequire(path) {
		throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
	}

	var Text2Frame$1 = {exports: {}};

	var Frame2Text = {exports: {}};

	var commander = {};

	var argument = {};

	var error = {};

	/**
	 * CommanderError class
	 */

	var hasRequiredError;

	function requireError () {
		if (hasRequiredError) return error;
		hasRequiredError = 1;
		class CommanderError extends Error {
		  /**
		   * Constructs the CommanderError class
		   * @param {number} exitCode suggested exit code which could be used with process.exit
		   * @param {string} code an id string representing the error
		   * @param {string} message human-readable description of the error
		   */
		  constructor(exitCode, code, message) {
		    super(message);
		    // properly capture stack trace in Node.js
		    Error.captureStackTrace(this, this.constructor);
		    this.name = this.constructor.name;
		    this.code = code;
		    this.exitCode = exitCode;
		    this.nestedError = undefined;
		  }
		}

		/**
		 * InvalidArgumentError class
		 */
		class InvalidArgumentError extends CommanderError {
		  /**
		   * Constructs the InvalidArgumentError class
		   * @param {string} [message] explanation of why argument is invalid
		   */
		  constructor(message) {
		    super(1, 'commander.invalidArgument', message);
		    // properly capture stack trace in Node.js
		    Error.captureStackTrace(this, this.constructor);
		    this.name = this.constructor.name;
		  }
		}

		error.CommanderError = CommanderError;
		error.InvalidArgumentError = InvalidArgumentError;
		return error;
	}

	var hasRequiredArgument;

	function requireArgument () {
		if (hasRequiredArgument) return argument;
		hasRequiredArgument = 1;
		const { InvalidArgumentError } = requireError();

		class Argument {
		  /**
		   * Initialize a new command argument with the given name and description.
		   * The default is that the argument is required, and you can explicitly
		   * indicate this with <> around the name. Put [] around the name for an optional argument.
		   *
		   * @param {string} name
		   * @param {string} [description]
		   */

		  constructor(name, description) {
		    this.description = description || '';
		    this.variadic = false;
		    this.parseArg = undefined;
		    this.defaultValue = undefined;
		    this.defaultValueDescription = undefined;
		    this.argChoices = undefined;

		    switch (name[0]) {
		      case '<': // e.g. <required>
		        this.required = true;
		        this._name = name.slice(1, -1);
		        break;
		      case '[': // e.g. [optional]
		        this.required = false;
		        this._name = name.slice(1, -1);
		        break;
		      default:
		        this.required = true;
		        this._name = name;
		        break;
		    }

		    if (this._name.length > 3 && this._name.slice(-3) === '...') {
		      this.variadic = true;
		      this._name = this._name.slice(0, -3);
		    }
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
		   * @package
		   */

		  _concatValue(value, previous) {
		    if (previous === this.defaultValue || !Array.isArray(previous)) {
		      return [value];
		    }

		    return previous.concat(value);
		  }

		  /**
		   * Set the default value, and optionally supply the description to be displayed in the help.
		   *
		   * @param {*} value
		   * @param {string} [description]
		   * @return {Argument}
		   */

		  default(value, description) {
		    this.defaultValue = value;
		    this.defaultValueDescription = description;
		    return this;
		  }

		  /**
		   * Set the custom handler for processing CLI command arguments into argument values.
		   *
		   * @param {Function} [fn]
		   * @return {Argument}
		   */

		  argParser(fn) {
		    this.parseArg = fn;
		    return this;
		  }

		  /**
		   * Only allow argument value to be one of choices.
		   *
		   * @param {string[]} values
		   * @return {Argument}
		   */

		  choices(values) {
		    this.argChoices = values.slice();
		    this.parseArg = (arg, previous) => {
		      if (!this.argChoices.includes(arg)) {
		        throw new InvalidArgumentError(
		          `Allowed choices are ${this.argChoices.join(', ')}.`,
		        );
		      }
		      if (this.variadic) {
		        return this._concatValue(arg, previous);
		      }
		      return arg;
		    };
		    return this;
		  }

		  /**
		   * Make argument required.
		   *
		   * @returns {Argument}
		   */
		  argRequired() {
		    this.required = true;
		    return this;
		  }

		  /**
		   * Make argument optional.
		   *
		   * @returns {Argument}
		   */
		  argOptional() {
		    this.required = false;
		    return this;
		  }
		}

		/**
		 * Takes an argument and returns its human readable equivalent for help usage.
		 *
		 * @param {Argument} arg
		 * @return {string}
		 * @private
		 */

		function humanReadableArgName(arg) {
		  const nameOutput = arg.name() + (arg.variadic === true ? '...' : '');

		  return arg.required ? '<' + nameOutput + '>' : '[' + nameOutput + ']';
		}

		argument.Argument = Argument;
		argument.humanReadableArgName = humanReadableArgName;
		return argument;
	}

	var command = {};

	var help = {};

	var hasRequiredHelp;

	function requireHelp () {
		if (hasRequiredHelp) return help;
		hasRequiredHelp = 1;
		const { humanReadableArgName } = requireArgument();

		/**
		 * TypeScript import types for JSDoc, used by Visual Studio Code IntelliSense and `npm run typescript-checkJS`
		 * https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html#import-types
		 * @typedef { import("./argument.js").Argument } Argument
		 * @typedef { import("./command.js").Command } Command
		 * @typedef { import("./option.js").Option } Option
		 */

		// Although this is a class, methods are static in style to allow override using subclass or just functions.
		class Help {
		  constructor() {
		    this.helpWidth = undefined;
		    this.sortSubcommands = false;
		    this.sortOptions = false;
		    this.showGlobalOptions = false;
		  }

		  /**
		   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
		   *
		   * @param {Command} cmd
		   * @returns {Command[]}
		   */

		  visibleCommands(cmd) {
		    const visibleCommands = cmd.commands.filter((cmd) => !cmd._hidden);
		    const helpCommand = cmd._getHelpCommand();
		    if (helpCommand && !helpCommand._hidden) {
		      visibleCommands.push(helpCommand);
		    }
		    if (this.sortSubcommands) {
		      visibleCommands.sort((a, b) => {
		        // @ts-ignore: because overloaded return type
		        return a.name().localeCompare(b.name());
		      });
		    }
		    return visibleCommands;
		  }

		  /**
		   * Compare options for sort.
		   *
		   * @param {Option} a
		   * @param {Option} b
		   * @returns {number}
		   */
		  compareOptions(a, b) {
		    const getSortKey = (option) => {
		      // WYSIWYG for order displayed in help. Short used for comparison if present. No special handling for negated.
		      return option.short
		        ? option.short.replace(/^-/, '')
		        : option.long.replace(/^--/, '');
		    };
		    return getSortKey(a).localeCompare(getSortKey(b));
		  }

		  /**
		   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
		   *
		   * @param {Command} cmd
		   * @returns {Option[]}
		   */

		  visibleOptions(cmd) {
		    const visibleOptions = cmd.options.filter((option) => !option.hidden);
		    // Built-in help option.
		    const helpOption = cmd._getHelpOption();
		    if (helpOption && !helpOption.hidden) {
		      // Automatically hide conflicting flags. Bit dubious but a historical behaviour that is convenient for single-command programs.
		      const removeShort = helpOption.short && cmd._findOption(helpOption.short);
		      const removeLong = helpOption.long && cmd._findOption(helpOption.long);
		      if (!removeShort && !removeLong) {
		        visibleOptions.push(helpOption); // no changes needed
		      } else if (helpOption.long && !removeLong) {
		        visibleOptions.push(
		          cmd.createOption(helpOption.long, helpOption.description),
		        );
		      } else if (helpOption.short && !removeShort) {
		        visibleOptions.push(
		          cmd.createOption(helpOption.short, helpOption.description),
		        );
		      }
		    }
		    if (this.sortOptions) {
		      visibleOptions.sort(this.compareOptions);
		    }
		    return visibleOptions;
		  }

		  /**
		   * Get an array of the visible global options. (Not including help.)
		   *
		   * @param {Command} cmd
		   * @returns {Option[]}
		   */

		  visibleGlobalOptions(cmd) {
		    if (!this.showGlobalOptions) return [];

		    const globalOptions = [];
		    for (
		      let ancestorCmd = cmd.parent;
		      ancestorCmd;
		      ancestorCmd = ancestorCmd.parent
		    ) {
		      const visibleOptions = ancestorCmd.options.filter(
		        (option) => !option.hidden,
		      );
		      globalOptions.push(...visibleOptions);
		    }
		    if (this.sortOptions) {
		      globalOptions.sort(this.compareOptions);
		    }
		    return globalOptions;
		  }

		  /**
		   * Get an array of the arguments if any have a description.
		   *
		   * @param {Command} cmd
		   * @returns {Argument[]}
		   */

		  visibleArguments(cmd) {
		    // Side effect! Apply the legacy descriptions before the arguments are displayed.
		    if (cmd._argsDescription) {
		      cmd.registeredArguments.forEach((argument) => {
		        argument.description =
		          argument.description || cmd._argsDescription[argument.name()] || '';
		      });
		    }

		    // If there are any arguments with a description then return all the arguments.
		    if (cmd.registeredArguments.find((argument) => argument.description)) {
		      return cmd.registeredArguments;
		    }
		    return [];
		  }

		  /**
		   * Get the command term to show in the list of subcommands.
		   *
		   * @param {Command} cmd
		   * @returns {string}
		   */

		  subcommandTerm(cmd) {
		    // Legacy. Ignores custom usage string, and nested commands.
		    const args = cmd.registeredArguments
		      .map((arg) => humanReadableArgName(arg))
		      .join(' ');
		    return (
		      cmd._name +
		      (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') +
		      (cmd.options.length ? ' [options]' : '') + // simplistic check for non-help option
		      (args ? ' ' + args : '')
		    );
		  }

		  /**
		   * Get the option term to show in the list of options.
		   *
		   * @param {Option} option
		   * @returns {string}
		   */

		  optionTerm(option) {
		    return option.flags;
		  }

		  /**
		   * Get the argument term to show in the list of arguments.
		   *
		   * @param {Argument} argument
		   * @returns {string}
		   */

		  argumentTerm(argument) {
		    return argument.name();
		  }

		  /**
		   * Get the longest command term length.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {number}
		   */

		  longestSubcommandTermLength(cmd, helper) {
		    return helper.visibleCommands(cmd).reduce((max, command) => {
		      return Math.max(max, helper.subcommandTerm(command).length);
		    }, 0);
		  }

		  /**
		   * Get the longest option term length.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {number}
		   */

		  longestOptionTermLength(cmd, helper) {
		    return helper.visibleOptions(cmd).reduce((max, option) => {
		      return Math.max(max, helper.optionTerm(option).length);
		    }, 0);
		  }

		  /**
		   * Get the longest global option term length.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {number}
		   */

		  longestGlobalOptionTermLength(cmd, helper) {
		    return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
		      return Math.max(max, helper.optionTerm(option).length);
		    }, 0);
		  }

		  /**
		   * Get the longest argument term length.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {number}
		   */

		  longestArgumentTermLength(cmd, helper) {
		    return helper.visibleArguments(cmd).reduce((max, argument) => {
		      return Math.max(max, helper.argumentTerm(argument).length);
		    }, 0);
		  }

		  /**
		   * Get the command usage to be displayed at the top of the built-in help.
		   *
		   * @param {Command} cmd
		   * @returns {string}
		   */

		  commandUsage(cmd) {
		    // Usage
		    let cmdName = cmd._name;
		    if (cmd._aliases[0]) {
		      cmdName = cmdName + '|' + cmd._aliases[0];
		    }
		    let ancestorCmdNames = '';
		    for (
		      let ancestorCmd = cmd.parent;
		      ancestorCmd;
		      ancestorCmd = ancestorCmd.parent
		    ) {
		      ancestorCmdNames = ancestorCmd.name() + ' ' + ancestorCmdNames;
		    }
		    return ancestorCmdNames + cmdName + ' ' + cmd.usage();
		  }

		  /**
		   * Get the description for the command.
		   *
		   * @param {Command} cmd
		   * @returns {string}
		   */

		  commandDescription(cmd) {
		    // @ts-ignore: because overloaded return type
		    return cmd.description();
		  }

		  /**
		   * Get the subcommand summary to show in the list of subcommands.
		   * (Fallback to description for backwards compatibility.)
		   *
		   * @param {Command} cmd
		   * @returns {string}
		   */

		  subcommandDescription(cmd) {
		    // @ts-ignore: because overloaded return type
		    return cmd.summary() || cmd.description();
		  }

		  /**
		   * Get the option description to show in the list of options.
		   *
		   * @param {Option} option
		   * @return {string}
		   */

		  optionDescription(option) {
		    const extraInfo = [];

		    if (option.argChoices) {
		      extraInfo.push(
		        // use stringify to match the display of the default value
		        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
		      );
		    }
		    if (option.defaultValue !== undefined) {
		      // default for boolean and negated more for programmer than end user,
		      // but show true/false for boolean option as may be for hand-rolled env or config processing.
		      const showDefault =
		        option.required ||
		        option.optional ||
		        (option.isBoolean() && typeof option.defaultValue === 'boolean');
		      if (showDefault) {
		        extraInfo.push(
		          `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`,
		        );
		      }
		    }
		    // preset for boolean and negated are more for programmer than end user
		    if (option.presetArg !== undefined && option.optional) {
		      extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
		    }
		    if (option.envVar !== undefined) {
		      extraInfo.push(`env: ${option.envVar}`);
		    }
		    if (extraInfo.length > 0) {
		      return `${option.description} (${extraInfo.join(', ')})`;
		    }

		    return option.description;
		  }

		  /**
		   * Get the argument description to show in the list of arguments.
		   *
		   * @param {Argument} argument
		   * @return {string}
		   */

		  argumentDescription(argument) {
		    const extraInfo = [];
		    if (argument.argChoices) {
		      extraInfo.push(
		        // use stringify to match the display of the default value
		        `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`,
		      );
		    }
		    if (argument.defaultValue !== undefined) {
		      extraInfo.push(
		        `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`,
		      );
		    }
		    if (extraInfo.length > 0) {
		      const extraDescripton = `(${extraInfo.join(', ')})`;
		      if (argument.description) {
		        return `${argument.description} ${extraDescripton}`;
		      }
		      return extraDescripton;
		    }
		    return argument.description;
		  }

		  /**
		   * Generate the built-in help text.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {string}
		   */

		  formatHelp(cmd, helper) {
		    const termWidth = helper.padWidth(cmd, helper);
		    const helpWidth = helper.helpWidth || 80;
		    const itemIndentWidth = 2;
		    const itemSeparatorWidth = 2; // between term and description
		    function formatItem(term, description) {
		      if (description) {
		        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
		        return helper.wrap(
		          fullText,
		          helpWidth - itemIndentWidth,
		          termWidth + itemSeparatorWidth,
		        );
		      }
		      return term;
		    }
		    function formatList(textArray) {
		      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
		    }

		    // Usage
		    let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

		    // Description
		    const commandDescription = helper.commandDescription(cmd);
		    if (commandDescription.length > 0) {
		      output = output.concat([
		        helper.wrap(commandDescription, helpWidth, 0),
		        '',
		      ]);
		    }

		    // Arguments
		    const argumentList = helper.visibleArguments(cmd).map((argument) => {
		      return formatItem(
		        helper.argumentTerm(argument),
		        helper.argumentDescription(argument),
		      );
		    });
		    if (argumentList.length > 0) {
		      output = output.concat(['Arguments:', formatList(argumentList), '']);
		    }

		    // Options
		    const optionList = helper.visibleOptions(cmd).map((option) => {
		      return formatItem(
		        helper.optionTerm(option),
		        helper.optionDescription(option),
		      );
		    });
		    if (optionList.length > 0) {
		      output = output.concat(['Options:', formatList(optionList), '']);
		    }

		    if (this.showGlobalOptions) {
		      const globalOptionList = helper
		        .visibleGlobalOptions(cmd)
		        .map((option) => {
		          return formatItem(
		            helper.optionTerm(option),
		            helper.optionDescription(option),
		          );
		        });
		      if (globalOptionList.length > 0) {
		        output = output.concat([
		          'Global Options:',
		          formatList(globalOptionList),
		          '',
		        ]);
		      }
		    }

		    // Commands
		    const commandList = helper.visibleCommands(cmd).map((cmd) => {
		      return formatItem(
		        helper.subcommandTerm(cmd),
		        helper.subcommandDescription(cmd),
		      );
		    });
		    if (commandList.length > 0) {
		      output = output.concat(['Commands:', formatList(commandList), '']);
		    }

		    return output.join('\n');
		  }

		  /**
		   * Calculate the pad width from the maximum term length.
		   *
		   * @param {Command} cmd
		   * @param {Help} helper
		   * @returns {number}
		   */

		  padWidth(cmd, helper) {
		    return Math.max(
		      helper.longestOptionTermLength(cmd, helper),
		      helper.longestGlobalOptionTermLength(cmd, helper),
		      helper.longestSubcommandTermLength(cmd, helper),
		      helper.longestArgumentTermLength(cmd, helper),
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

		  wrap(str, width, indent, minColumnWidth = 40) {
		    // Full \s characters, minus the linefeeds.
		    const indents =
		      ' \\f\\t\\v\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff';
		    // Detect manually wrapped and indented strings by searching for line break followed by spaces.
		    const manualIndent = new RegExp(`[\\n][${indents}]+`);
		    if (str.match(manualIndent)) return str;
		    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
		    const columnWidth = width - indent;
		    if (columnWidth < minColumnWidth) return str;

		    const leadingStr = str.slice(0, indent);
		    const columnText = str.slice(indent).replace('\r\n', '\n');
		    const indentString = ' '.repeat(indent);
		    const zeroWidthSpace = '\u200B';
		    const breaks = `\\s${zeroWidthSpace}`;
		    // Match line end (so empty lines don't collapse),
		    // or as much text as will fit in column, or excess text up to first break.
		    const regex = new RegExp(
		      `\n|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
		      'g',
		    );
		    const lines = columnText.match(regex) || [];
		    return (
		      leadingStr +
		      lines
		        .map((line, i) => {
		          if (line === '\n') return ''; // preserve empty lines
		          return (i > 0 ? indentString : '') + line.trimEnd();
		        })
		        .join('\n')
		    );
		  }
		}

		help.Help = Help;
		return help;
	}

	var option = {};

	var hasRequiredOption;

	function requireOption () {
		if (hasRequiredOption) return option;
		hasRequiredOption = 1;
		const { InvalidArgumentError } = requireError();

		class Option {
		  /**
		   * Initialize a new `Option` with the given `flags` and `description`.
		   *
		   * @param {string} flags
		   * @param {string} [description]
		   */

		  constructor(flags, description) {
		    this.flags = flags;
		    this.description = description || '';

		    this.required = flags.includes('<'); // A value must be supplied when the option is specified.
		    this.optional = flags.includes('['); // A value is optional when the option is specified.
		    // variadic test ignores <value,...> et al which might be used to describe custom splitting of single argument
		    this.variadic = /\w\.\.\.[>\]]$/.test(flags); // The option can take multiple values.
		    this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
		    const optionFlags = splitOptionFlags(flags);
		    this.short = optionFlags.shortFlag;
		    this.long = optionFlags.longFlag;
		    this.negate = false;
		    if (this.long) {
		      this.negate = this.long.startsWith('--no-');
		    }
		    this.defaultValue = undefined;
		    this.defaultValueDescription = undefined;
		    this.presetArg = undefined;
		    this.envVar = undefined;
		    this.parseArg = undefined;
		    this.hidden = false;
		    this.argChoices = undefined;
		    this.conflictsWith = [];
		    this.implied = undefined;
		  }

		  /**
		   * Set the default value, and optionally supply the description to be displayed in the help.
		   *
		   * @param {*} value
		   * @param {string} [description]
		   * @return {Option}
		   */

		  default(value, description) {
		    this.defaultValue = value;
		    this.defaultValueDescription = description;
		    return this;
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

		  preset(arg) {
		    this.presetArg = arg;
		    return this;
		  }

		  /**
		   * Add option name(s) that conflict with this option.
		   * An error will be displayed if conflicting options are found during parsing.
		   *
		   * @example
		   * new Option('--rgb').conflicts('cmyk');
		   * new Option('--js').conflicts(['ts', 'jsx']);
		   *
		   * @param {(string | string[])} names
		   * @return {Option}
		   */

		  conflicts(names) {
		    this.conflictsWith = this.conflictsWith.concat(names);
		    return this;
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
		   * @param {object} impliedOptionValues
		   * @return {Option}
		   */
		  implies(impliedOptionValues) {
		    let newImplied = impliedOptionValues;
		    if (typeof impliedOptionValues === 'string') {
		      // string is not documented, but easy mistake and we can do what user probably intended.
		      newImplied = { [impliedOptionValues]: true };
		    }
		    this.implied = Object.assign(this.implied || {}, newImplied);
		    return this;
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

		  env(name) {
		    this.envVar = name;
		    return this;
		  }

		  /**
		   * Set the custom handler for processing CLI option arguments into option values.
		   *
		   * @param {Function} [fn]
		   * @return {Option}
		   */

		  argParser(fn) {
		    this.parseArg = fn;
		    return this;
		  }

		  /**
		   * Whether the option is mandatory and must have a value after parsing.
		   *
		   * @param {boolean} [mandatory=true]
		   * @return {Option}
		   */

		  makeOptionMandatory(mandatory = true) {
		    this.mandatory = !!mandatory;
		    return this;
		  }

		  /**
		   * Hide option in help.
		   *
		   * @param {boolean} [hide=true]
		   * @return {Option}
		   */

		  hideHelp(hide = true) {
		    this.hidden = !!hide;
		    return this;
		  }

		  /**
		   * @package
		   */

		  _concatValue(value, previous) {
		    if (previous === this.defaultValue || !Array.isArray(previous)) {
		      return [value];
		    }

		    return previous.concat(value);
		  }

		  /**
		   * Only allow option value to be one of choices.
		   *
		   * @param {string[]} values
		   * @return {Option}
		   */

		  choices(values) {
		    this.argChoices = values.slice();
		    this.parseArg = (arg, previous) => {
		      if (!this.argChoices.includes(arg)) {
		        throw new InvalidArgumentError(
		          `Allowed choices are ${this.argChoices.join(', ')}.`,
		        );
		      }
		      if (this.variadic) {
		        return this._concatValue(arg, previous);
		      }
		      return arg;
		    };
		    return this;
		  }

		  /**
		   * Return option name.
		   *
		   * @return {string}
		   */

		  name() {
		    if (this.long) {
		      return this.long.replace(/^--/, '');
		    }
		    return this.short.replace(/^-/, '');
		  }

		  /**
		   * Return option name, in a camelcase format that can be used
		   * as a object attribute key.
		   *
		   * @return {string}
		   */

		  attributeName() {
		    return camelcase(this.name().replace(/^no-/, ''));
		  }

		  /**
		   * Check if `arg` matches the short or long flag.
		   *
		   * @param {string} arg
		   * @return {boolean}
		   * @package
		   */

		  is(arg) {
		    return this.short === arg || this.long === arg;
		  }

		  /**
		   * Return whether a boolean option.
		   *
		   * Options are one of boolean, negated, required argument, or optional argument.
		   *
		   * @return {boolean}
		   * @package
		   */

		  isBoolean() {
		    return !this.required && !this.optional && !this.negate;
		  }
		}

		/**
		 * This class is to make it easier to work with dual options, without changing the existing
		 * implementation. We support separate dual options for separate positive and negative options,
		 * like `--build` and `--no-build`, which share a single option value. This works nicely for some
		 * use cases, but is tricky for others where we want separate behaviours despite
		 * the single shared option value.
		 */
		class DualOptions {
		  /**
		   * @param {Option[]} options
		   */
		  constructor(options) {
		    this.positiveOptions = new Map();
		    this.negativeOptions = new Map();
		    this.dualOptions = new Set();
		    options.forEach((option) => {
		      if (option.negate) {
		        this.negativeOptions.set(option.attributeName(), option);
		      } else {
		        this.positiveOptions.set(option.attributeName(), option);
		      }
		    });
		    this.negativeOptions.forEach((value, key) => {
		      if (this.positiveOptions.has(key)) {
		        this.dualOptions.add(key);
		      }
		    });
		  }

		  /**
		   * Did the value come from the option, and not from possible matching dual option?
		   *
		   * @param {*} value
		   * @param {Option} option
		   * @returns {boolean}
		   */
		  valueFromOption(value, option) {
		    const optionKey = option.attributeName();
		    if (!this.dualOptions.has(optionKey)) return true;

		    // Use the value to deduce if (probably) came from the option.
		    const preset = this.negativeOptions.get(optionKey).presetArg;
		    const negativeValue = preset !== undefined ? preset : false;
		    return option.negate === (negativeValue === value);
		  }
		}

		/**
		 * Convert string from kebab-case to camelCase.
		 *
		 * @param {string} str
		 * @return {string}
		 * @private
		 */

		function camelcase(str) {
		  return str.split('-').reduce((str, word) => {
		    return str + word[0].toUpperCase() + word.slice(1);
		  });
		}

		/**
		 * Split the short and long flag out of something like '-m,--mixed <value>'
		 *
		 * @private
		 */

		function splitOptionFlags(flags) {
		  let shortFlag;
		  let longFlag;
		  // Use original very loose parsing to maintain backwards compatibility for now,
		  // which allowed for example unintended `-sw, --short-word` [sic].
		  const flagParts = flags.split(/[ |,]+/);
		  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
		    shortFlag = flagParts.shift();
		  longFlag = flagParts.shift();
		  // Add support for lone short flag without significantly changing parsing!
		  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
		    shortFlag = longFlag;
		    longFlag = undefined;
		  }
		  return { shortFlag, longFlag };
		}

		option.Option = Option;
		option.DualOptions = DualOptions;
		return option;
	}

	var suggestSimilar = {};

	var hasRequiredSuggestSimilar;

	function requireSuggestSimilar () {
		if (hasRequiredSuggestSimilar) return suggestSimilar;
		hasRequiredSuggestSimilar = 1;
		const maxDistance = 3;

		function editDistance(a, b) {
		  // https://en.wikipedia.org/wiki/Damerau–Levenshtein_distance
		  // Calculating optimal string alignment distance, no substring is edited more than once.
		  // (Simple implementation.)

		  // Quick early exit, return worst case.
		  if (Math.abs(a.length - b.length) > maxDistance)
		    return Math.max(a.length, b.length);

		  // distance between prefix substrings of a and b
		  const d = [];

		  // pure deletions turn a into empty string
		  for (let i = 0; i <= a.length; i++) {
		    d[i] = [i];
		  }
		  // pure insertions turn empty string into b
		  for (let j = 0; j <= b.length; j++) {
		    d[0][j] = j;
		  }

		  // fill matrix
		  for (let j = 1; j <= b.length; j++) {
		    for (let i = 1; i <= a.length; i++) {
		      let cost = 1;
		      if (a[i - 1] === b[j - 1]) {
		        cost = 0;
		      } else {
		        cost = 1;
		      }
		      d[i][j] = Math.min(
		        d[i - 1][j] + 1, // deletion
		        d[i][j - 1] + 1, // insertion
		        d[i - 1][j - 1] + cost, // substitution
		      );
		      // transposition
		      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
		        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
		      }
		    }
		  }

		  return d[a.length][b.length];
		}

		/**
		 * Find close matches, restricted to same number of edits.
		 *
		 * @param {string} word
		 * @param {string[]} candidates
		 * @returns {string}
		 */

		function suggestSimilar$1(word, candidates) {
		  if (!candidates || candidates.length === 0) return '';
		  // remove possible duplicates
		  candidates = Array.from(new Set(candidates));

		  const searchingOptions = word.startsWith('--');
		  if (searchingOptions) {
		    word = word.slice(2);
		    candidates = candidates.map((candidate) => candidate.slice(2));
		  }

		  let similar = [];
		  let bestDistance = maxDistance;
		  const minSimilarity = 0.4;
		  candidates.forEach((candidate) => {
		    if (candidate.length <= 1) return; // no one character guesses

		    const distance = editDistance(word, candidate);
		    const length = Math.max(word.length, candidate.length);
		    const similarity = (length - distance) / length;
		    if (similarity > minSimilarity) {
		      if (distance < bestDistance) {
		        // better edit distance, throw away previous worse matches
		        bestDistance = distance;
		        similar = [candidate];
		      } else if (distance === bestDistance) {
		        similar.push(candidate);
		      }
		    }
		  });

		  similar.sort((a, b) => a.localeCompare(b));
		  if (searchingOptions) {
		    similar = similar.map((candidate) => `--${candidate}`);
		  }

		  if (similar.length > 1) {
		    return `\n(Did you mean one of ${similar.join(', ')}?)`;
		  }
		  if (similar.length === 1) {
		    return `\n(Did you mean ${similar[0]}?)`;
		  }
		  return '';
		}

		suggestSimilar.suggestSimilar = suggestSimilar$1;
		return suggestSimilar;
	}

	var hasRequiredCommand;

	function requireCommand () {
		if (hasRequiredCommand) return command;
		hasRequiredCommand = 1;
		const EventEmitter = require$$0.EventEmitter;
		const childProcess = require$$1;
		const path = require$$2;
		const fs = require$$3;
		const process = require$$4;

		const { Argument, humanReadableArgName } = requireArgument();
		const { CommanderError } = requireError();
		const { Help } = requireHelp();
		const { Option, DualOptions } = requireOption();
		const { suggestSimilar } = requireSuggestSimilar();

		class Command extends EventEmitter {
		  /**
		   * Initialize a new `Command`.
		   *
		   * @param {string} [name]
		   */

		  constructor(name) {
		    super();
		    /** @type {Command[]} */
		    this.commands = [];
		    /** @type {Option[]} */
		    this.options = [];
		    this.parent = null;
		    this._allowUnknownOption = false;
		    this._allowExcessArguments = true;
		    /** @type {Argument[]} */
		    this.registeredArguments = [];
		    this._args = this.registeredArguments; // deprecated old name
		    /** @type {string[]} */
		    this.args = []; // cli args with options removed
		    this.rawArgs = [];
		    this.processedArgs = []; // like .args but after custom processing and collecting variadic
		    this._scriptPath = null;
		    this._name = name || '';
		    this._optionValues = {};
		    this._optionValueSources = {}; // default, env, cli etc
		    this._storeOptionsAsProperties = false;
		    this._actionHandler = null;
		    this._executableHandler = false;
		    this._executableFile = null; // custom name for executable
		    this._executableDir = null; // custom search directory for subcommands
		    this._defaultCommandName = null;
		    this._exitCallback = null;
		    this._aliases = [];
		    this._combineFlagAndOptionalValue = true;
		    this._description = '';
		    this._summary = '';
		    this._argsDescription = undefined; // legacy
		    this._enablePositionalOptions = false;
		    this._passThroughOptions = false;
		    this._lifeCycleHooks = {}; // a hash of arrays
		    /** @type {(boolean | string)} */
		    this._showHelpAfterError = false;
		    this._showSuggestionAfterError = true;

		    // see .configureOutput() for docs
		    this._outputConfiguration = {
		      writeOut: (str) => process.stdout.write(str),
		      writeErr: (str) => process.stderr.write(str),
		      getOutHelpWidth: () =>
		        process.stdout.isTTY ? process.stdout.columns : undefined,
		      getErrHelpWidth: () =>
		        process.stderr.isTTY ? process.stderr.columns : undefined,
		      outputError: (str, write) => write(str),
		    };

		    this._hidden = false;
		    /** @type {(Option | null | undefined)} */
		    this._helpOption = undefined; // Lazy created on demand. May be null if help option is disabled.
		    this._addImplicitHelpCommand = undefined; // undecided whether true or false yet, not inherited
		    /** @type {Command} */
		    this._helpCommand = undefined; // lazy initialised, inherited
		    this._helpConfiguration = {};
		  }

		  /**
		   * Copy settings that are useful to have in common across root command and subcommands.
		   *
		   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
		   *
		   * @param {Command} sourceCommand
		   * @return {Command} `this` command for chaining
		   */
		  copyInheritedSettings(sourceCommand) {
		    this._outputConfiguration = sourceCommand._outputConfiguration;
		    this._helpOption = sourceCommand._helpOption;
		    this._helpCommand = sourceCommand._helpCommand;
		    this._helpConfiguration = sourceCommand._helpConfiguration;
		    this._exitCallback = sourceCommand._exitCallback;
		    this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
		    this._combineFlagAndOptionalValue =
		      sourceCommand._combineFlagAndOptionalValue;
		    this._allowExcessArguments = sourceCommand._allowExcessArguments;
		    this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
		    this._showHelpAfterError = sourceCommand._showHelpAfterError;
		    this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;

		    return this;
		  }

		  /**
		   * @returns {Command[]}
		   * @private
		   */

		  _getCommandAndAncestors() {
		    const result = [];
		    // eslint-disable-next-line @typescript-eslint/no-this-alias
		    for (let command = this; command; command = command.parent) {
		      result.push(command);
		    }
		    return result;
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
		   * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
		   * @param {object} [execOpts] - configuration options (for executable)
		   * @return {Command} returns new command for action handler, or `this` for executable command
		   */

		  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
		    let desc = actionOptsOrExecDesc;
		    let opts = execOpts;
		    if (typeof desc === 'object' && desc !== null) {
		      opts = desc;
		      desc = null;
		    }
		    opts = opts || {};
		    const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);

		    const cmd = this.createCommand(name);
		    if (desc) {
		      cmd.description(desc);
		      cmd._executableHandler = true;
		    }
		    if (opts.isDefault) this._defaultCommandName = cmd._name;
		    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
		    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
		    if (args) cmd.arguments(args);
		    this._registerCommand(cmd);
		    cmd.parent = this;
		    cmd.copyInheritedSettings(this);

		    if (desc) return this;
		    return cmd;
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

		  createCommand(name) {
		    return new Command(name);
		  }

		  /**
		   * You can customise the help with a subclass of Help by overriding createHelp,
		   * or by overriding Help properties using configureHelp().
		   *
		   * @return {Help}
		   */

		  createHelp() {
		    return Object.assign(new Help(), this.configureHelp());
		  }

		  /**
		   * You can customise the help by overriding Help properties using configureHelp(),
		   * or with a subclass of Help by overriding createHelp().
		   *
		   * @param {object} [configuration] - configuration options
		   * @return {(Command | object)} `this` command for chaining, or stored configuration
		   */

		  configureHelp(configuration) {
		    if (configuration === undefined) return this._helpConfiguration;

		    this._helpConfiguration = configuration;
		    return this;
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
		   * @param {object} [configuration] - configuration options
		   * @return {(Command | object)} `this` command for chaining, or stored configuration
		   */

		  configureOutput(configuration) {
		    if (configuration === undefined) return this._outputConfiguration;

		    Object.assign(this._outputConfiguration, configuration);
		    return this;
		  }

		  /**
		   * Display the help or a custom message after an error occurs.
		   *
		   * @param {(boolean|string)} [displayHelp]
		   * @return {Command} `this` command for chaining
		   */
		  showHelpAfterError(displayHelp = true) {
		    if (typeof displayHelp !== 'string') displayHelp = !!displayHelp;
		    this._showHelpAfterError = displayHelp;
		    return this;
		  }

		  /**
		   * Display suggestion of similar commands for unknown commands, or options for unknown options.
		   *
		   * @param {boolean} [displaySuggestion]
		   * @return {Command} `this` command for chaining
		   */
		  showSuggestionAfterError(displaySuggestion = true) {
		    this._showSuggestionAfterError = !!displaySuggestion;
		    return this;
		  }

		  /**
		   * Add a prepared subcommand.
		   *
		   * See .command() for creating an attached subcommand which inherits settings from its parent.
		   *
		   * @param {Command} cmd - new subcommand
		   * @param {object} [opts] - configuration options
		   * @return {Command} `this` command for chaining
		   */

		  addCommand(cmd, opts) {
		    if (!cmd._name) {
		      throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
		    }

		    opts = opts || {};
		    if (opts.isDefault) this._defaultCommandName = cmd._name;
		    if (opts.noHelp || opts.hidden) cmd._hidden = true; // modifying passed command due to existing implementation

		    this._registerCommand(cmd);
		    cmd.parent = this;
		    cmd._checkForBrokenPassThrough();

		    return this;
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

		  createArgument(name, description) {
		    return new Argument(name, description);
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
		   * @param {(Function|*)} [fn] - custom argument processing function
		   * @param {*} [defaultValue]
		   * @return {Command} `this` command for chaining
		   */
		  argument(name, description, fn, defaultValue) {
		    const argument = this.createArgument(name, description);
		    if (typeof fn === 'function') {
		      argument.default(defaultValue).argParser(fn);
		    } else {
		      argument.default(fn);
		    }
		    this.addArgument(argument);
		    return this;
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

		  arguments(names) {
		    names
		      .trim()
		      .split(/ +/)
		      .forEach((detail) => {
		        this.argument(detail);
		      });
		    return this;
		  }

		  /**
		   * Define argument syntax for command, adding a prepared argument.
		   *
		   * @param {Argument} argument
		   * @return {Command} `this` command for chaining
		   */
		  addArgument(argument) {
		    const previousArgument = this.registeredArguments.slice(-1)[0];
		    if (previousArgument && previousArgument.variadic) {
		      throw new Error(
		        `only the last argument can be variadic '${previousArgument.name()}'`,
		      );
		    }
		    if (
		      argument.required &&
		      argument.defaultValue !== undefined &&
		      argument.parseArg === undefined
		    ) {
		      throw new Error(
		        `a default value for a required argument is never used: '${argument.name()}'`,
		      );
		    }
		    this.registeredArguments.push(argument);
		    return this;
		  }

		  /**
		   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
		   *
		   * @example
		   *    program.helpCommand('help [cmd]');
		   *    program.helpCommand('help [cmd]', 'show help');
		   *    program.helpCommand(false); // suppress default help command
		   *    program.helpCommand(true); // add help command even if no subcommands
		   *
		   * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
		   * @param {string} [description] - custom description
		   * @return {Command} `this` command for chaining
		   */

		  helpCommand(enableOrNameAndArgs, description) {
		    if (typeof enableOrNameAndArgs === 'boolean') {
		      this._addImplicitHelpCommand = enableOrNameAndArgs;
		      return this;
		    }

		    enableOrNameAndArgs = enableOrNameAndArgs ?? 'help [command]';
		    const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
		    const helpDescription = description ?? 'display help for command';

		    const helpCommand = this.createCommand(helpName);
		    helpCommand.helpOption(false);
		    if (helpArgs) helpCommand.arguments(helpArgs);
		    if (helpDescription) helpCommand.description(helpDescription);

		    this._addImplicitHelpCommand = true;
		    this._helpCommand = helpCommand;

		    return this;
		  }

		  /**
		   * Add prepared custom help command.
		   *
		   * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
		   * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
		   * @return {Command} `this` command for chaining
		   */
		  addHelpCommand(helpCommand, deprecatedDescription) {
		    // If not passed an object, call through to helpCommand for backwards compatibility,
		    // as addHelpCommand was originally used like helpCommand is now.
		    if (typeof helpCommand !== 'object') {
		      this.helpCommand(helpCommand, deprecatedDescription);
		      return this;
		    }

		    this._addImplicitHelpCommand = true;
		    this._helpCommand = helpCommand;
		    return this;
		  }

		  /**
		   * Lazy create help command.
		   *
		   * @return {(Command|null)}
		   * @package
		   */
		  _getHelpCommand() {
		    const hasImplicitHelpCommand =
		      this._addImplicitHelpCommand ??
		      (this.commands.length &&
		        !this._actionHandler &&
		        !this._findCommand('help'));

		    if (hasImplicitHelpCommand) {
		      if (this._helpCommand === undefined) {
		        this.helpCommand(undefined, undefined); // use default name and description
		      }
		      return this._helpCommand;
		    }
		    return null;
		  }

		  /**
		   * Add hook for life cycle event.
		   *
		   * @param {string} event
		   * @param {Function} listener
		   * @return {Command} `this` command for chaining
		   */

		  hook(event, listener) {
		    const allowedValues = ['preSubcommand', 'preAction', 'postAction'];
		    if (!allowedValues.includes(event)) {
		      throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
		    }
		    if (this._lifeCycleHooks[event]) {
		      this._lifeCycleHooks[event].push(listener);
		    } else {
		      this._lifeCycleHooks[event] = [listener];
		    }
		    return this;
		  }

		  /**
		   * Register callback to use as replacement for calling process.exit.
		   *
		   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
		   * @return {Command} `this` command for chaining
		   */

		  exitOverride(fn) {
		    if (fn) {
		      this._exitCallback = fn;
		    } else {
		      this._exitCallback = (err) => {
		        if (err.code !== 'commander.executeSubCommandAsync') {
		          throw err;
		        }
		      };
		    }
		    return this;
		  }

		  /**
		   * Call process.exit, and _exitCallback if defined.
		   *
		   * @param {number} exitCode exit code for using with process.exit
		   * @param {string} code an id string representing the error
		   * @param {string} message human-readable description of the error
		   * @return never
		   * @private
		   */

		  _exit(exitCode, code, message) {
		    if (this._exitCallback) {
		      this._exitCallback(new CommanderError(exitCode, code, message));
		      // Expecting this line is not reached.
		    }
		    process.exit(exitCode);
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

		  action(fn) {
		    const listener = (args) => {
		      // The .action callback takes an extra parameter which is the command or options.
		      const expectedArgsCount = this.registeredArguments.length;
		      const actionArgs = args.slice(0, expectedArgsCount);
		      if (this._storeOptionsAsProperties) {
		        actionArgs[expectedArgsCount] = this; // backwards compatible "options"
		      } else {
		        actionArgs[expectedArgsCount] = this.opts();
		      }
		      actionArgs.push(this);

		      return fn.apply(this, actionArgs);
		    };
		    this._actionHandler = listener;
		    return this;
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

		  createOption(flags, description) {
		    return new Option(flags, description);
		  }

		  /**
		   * Wrap parseArgs to catch 'commander.invalidArgument'.
		   *
		   * @param {(Option | Argument)} target
		   * @param {string} value
		   * @param {*} previous
		   * @param {string} invalidArgumentMessage
		   * @private
		   */

		  _callParseArg(target, value, previous, invalidArgumentMessage) {
		    try {
		      return target.parseArg(value, previous);
		    } catch (err) {
		      if (err.code === 'commander.invalidArgument') {
		        const message = `${invalidArgumentMessage} ${err.message}`;
		        this.error(message, { exitCode: err.exitCode, code: err.code });
		      }
		      throw err;
		    }
		  }

		  /**
		   * Check for option flag conflicts.
		   * Register option if no conflicts found, or throw on conflict.
		   *
		   * @param {Option} option
		   * @private
		   */

		  _registerOption(option) {
		    const matchingOption =
		      (option.short && this._findOption(option.short)) ||
		      (option.long && this._findOption(option.long));
		    if (matchingOption) {
		      const matchingFlag =
		        option.long && this._findOption(option.long)
		          ? option.long
		          : option.short;
		      throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
		    }

		    this.options.push(option);
		  }

		  /**
		   * Check for command name and alias conflicts with existing commands.
		   * Register command if no conflicts found, or throw on conflict.
		   *
		   * @param {Command} command
		   * @private
		   */

		  _registerCommand(command) {
		    const knownBy = (cmd) => {
		      return [cmd.name()].concat(cmd.aliases());
		    };

		    const alreadyUsed = knownBy(command).find((name) =>
		      this._findCommand(name),
		    );
		    if (alreadyUsed) {
		      const existingCmd = knownBy(this._findCommand(alreadyUsed)).join('|');
		      const newCmd = knownBy(command).join('|');
		      throw new Error(
		        `cannot add command '${newCmd}' as already have command '${existingCmd}'`,
		      );
		    }

		    this.commands.push(command);
		  }

		  /**
		   * Add an option.
		   *
		   * @param {Option} option
		   * @return {Command} `this` command for chaining
		   */
		  addOption(option) {
		    this._registerOption(option);

		    const oname = option.name();
		    const name = option.attributeName();

		    // store default value
		    if (option.negate) {
		      // --no-foo is special and defaults foo to true, unless a --foo option is already defined
		      const positiveLongFlag = option.long.replace(/^--no-/, '--');
		      if (!this._findOption(positiveLongFlag)) {
		        this.setOptionValueWithSource(
		          name,
		          option.defaultValue === undefined ? true : option.defaultValue,
		          'default',
		        );
		      }
		    } else if (option.defaultValue !== undefined) {
		      this.setOptionValueWithSource(name, option.defaultValue, 'default');
		    }

		    // handler for cli and env supplied values
		    const handleOptionValue = (val, invalidValueMessage, valueSource) => {
		      // val is null for optional option used without an optional-argument.
		      // val is undefined for boolean and negated option.
		      if (val == null && option.presetArg !== undefined) {
		        val = option.presetArg;
		      }

		      // custom processing
		      const oldValue = this.getOptionValue(name);
		      if (val !== null && option.parseArg) {
		        val = this._callParseArg(option, val, oldValue, invalidValueMessage);
		      } else if (val !== null && option.variadic) {
		        val = option._concatValue(val, oldValue);
		      }

		      // Fill-in appropriate missing values. Long winded but easy to follow.
		      if (val == null) {
		        if (option.negate) {
		          val = false;
		        } else if (option.isBoolean() || option.optional) {
		          val = true;
		        } else {
		          val = ''; // not normal, parseArg might have failed or be a mock function for testing
		        }
		      }
		      this.setOptionValueWithSource(name, val, valueSource);
		    };

		    this.on('option:' + oname, (val) => {
		      const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
		      handleOptionValue(val, invalidValueMessage, 'cli');
		    });

		    if (option.envVar) {
		      this.on('optionEnv:' + oname, (val) => {
		        const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
		        handleOptionValue(val, invalidValueMessage, 'env');
		      });
		    }

		    return this;
		  }

		  /**
		   * Internal implementation shared by .option() and .requiredOption()
		   *
		   * @return {Command} `this` command for chaining
		   * @private
		   */
		  _optionEx(config, flags, description, fn, defaultValue) {
		    if (typeof flags === 'object' && flags instanceof Option) {
		      throw new Error(
		        'To add an Option object use addOption() instead of option() or requiredOption()',
		      );
		    }
		    const option = this.createOption(flags, description);
		    option.makeOptionMandatory(!!config.mandatory);
		    if (typeof fn === 'function') {
		      option.default(defaultValue).argParser(fn);
		    } else if (fn instanceof RegExp) {
		      // deprecated
		      const regex = fn;
		      fn = (val, def) => {
		        const m = regex.exec(val);
		        return m ? m[0] : def;
		      };
		      option.default(defaultValue).argParser(fn);
		    } else {
		      option.default(fn);
		    }

		    return this.addOption(option);
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
		   * @param {(Function|*)} [parseArg] - custom option processing function or default value
		   * @param {*} [defaultValue]
		   * @return {Command} `this` command for chaining
		   */

		  option(flags, description, parseArg, defaultValue) {
		    return this._optionEx({}, flags, description, parseArg, defaultValue);
		  }

		  /**
		   * Add a required option which must have a value after parsing. This usually means
		   * the option must be specified on the command line. (Otherwise the same as .option().)
		   *
		   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
		   *
		   * @param {string} flags
		   * @param {string} [description]
		   * @param {(Function|*)} [parseArg] - custom option processing function or default value
		   * @param {*} [defaultValue]
		   * @return {Command} `this` command for chaining
		   */

		  requiredOption(flags, description, parseArg, defaultValue) {
		    return this._optionEx(
		      { mandatory: true },
		      flags,
		      description,
		      parseArg,
		      defaultValue,
		    );
		  }

		  /**
		   * Alter parsing of short flags with optional values.
		   *
		   * @example
		   * // for `.option('-f,--flag [value]'):
		   * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
		   * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
		   *
		   * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
		   * @return {Command} `this` command for chaining
		   */
		  combineFlagAndOptionalValue(combine = true) {
		    this._combineFlagAndOptionalValue = !!combine;
		    return this;
		  }

		  /**
		   * Allow unknown options on the command line.
		   *
		   * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
		   * @return {Command} `this` command for chaining
		   */
		  allowUnknownOption(allowUnknown = true) {
		    this._allowUnknownOption = !!allowUnknown;
		    return this;
		  }

		  /**
		   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
		   *
		   * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
		   * @return {Command} `this` command for chaining
		   */
		  allowExcessArguments(allowExcess = true) {
		    this._allowExcessArguments = !!allowExcess;
		    return this;
		  }

		  /**
		   * Enable positional options. Positional means global options are specified before subcommands which lets
		   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
		   * The default behaviour is non-positional and global options may appear anywhere on the command line.
		   *
		   * @param {boolean} [positional]
		   * @return {Command} `this` command for chaining
		   */
		  enablePositionalOptions(positional = true) {
		    this._enablePositionalOptions = !!positional;
		    return this;
		  }

		  /**
		   * Pass through options that come after command-arguments rather than treat them as command-options,
		   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
		   * positional options to have been enabled on the program (parent commands).
		   * The default behaviour is non-positional and options may appear before or after command-arguments.
		   *
		   * @param {boolean} [passThrough] for unknown options.
		   * @return {Command} `this` command for chaining
		   */
		  passThroughOptions(passThrough = true) {
		    this._passThroughOptions = !!passThrough;
		    this._checkForBrokenPassThrough();
		    return this;
		  }

		  /**
		   * @private
		   */

		  _checkForBrokenPassThrough() {
		    if (
		      this.parent &&
		      this._passThroughOptions &&
		      !this.parent._enablePositionalOptions
		    ) {
		      throw new Error(
		        `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`,
		      );
		    }
		  }

		  /**
		   * Whether to store option values as properties on command object,
		   * or store separately (specify false). In both cases the option values can be accessed using .opts().
		   *
		   * @param {boolean} [storeAsProperties=true]
		   * @return {Command} `this` command for chaining
		   */

		  storeOptionsAsProperties(storeAsProperties = true) {
		    if (this.options.length) {
		      throw new Error('call .storeOptionsAsProperties() before adding options');
		    }
		    if (Object.keys(this._optionValues).length) {
		      throw new Error(
		        'call .storeOptionsAsProperties() before setting option values',
		      );
		    }
		    this._storeOptionsAsProperties = !!storeAsProperties;
		    return this;
		  }

		  /**
		   * Retrieve option value.
		   *
		   * @param {string} key
		   * @return {object} value
		   */

		  getOptionValue(key) {
		    if (this._storeOptionsAsProperties) {
		      return this[key];
		    }
		    return this._optionValues[key];
		  }

		  /**
		   * Store option value.
		   *
		   * @param {string} key
		   * @param {object} value
		   * @return {Command} `this` command for chaining
		   */

		  setOptionValue(key, value) {
		    return this.setOptionValueWithSource(key, value, undefined);
		  }

		  /**
		   * Store option value and where the value came from.
		   *
		   * @param {string} key
		   * @param {object} value
		   * @param {string} source - expected values are default/config/env/cli/implied
		   * @return {Command} `this` command for chaining
		   */

		  setOptionValueWithSource(key, value, source) {
		    if (this._storeOptionsAsProperties) {
		      this[key] = value;
		    } else {
		      this._optionValues[key] = value;
		    }
		    this._optionValueSources[key] = source;
		    return this;
		  }

		  /**
		   * Get source of option value.
		   * Expected values are default | config | env | cli | implied
		   *
		   * @param {string} key
		   * @return {string}
		   */

		  getOptionValueSource(key) {
		    return this._optionValueSources[key];
		  }

		  /**
		   * Get source of option value. See also .optsWithGlobals().
		   * Expected values are default | config | env | cli | implied
		   *
		   * @param {string} key
		   * @return {string}
		   */

		  getOptionValueSourceWithGlobals(key) {
		    // global overwrites local, like optsWithGlobals
		    let source;
		    this._getCommandAndAncestors().forEach((cmd) => {
		      if (cmd.getOptionValueSource(key) !== undefined) {
		        source = cmd.getOptionValueSource(key);
		      }
		    });
		    return source;
		  }

		  /**
		   * Get user arguments from implied or explicit arguments.
		   * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
		   *
		   * @private
		   */

		  _prepareUserArgs(argv, parseOptions) {
		    if (argv !== undefined && !Array.isArray(argv)) {
		      throw new Error('first parameter to parse must be array or undefined');
		    }
		    parseOptions = parseOptions || {};

		    // auto-detect argument conventions if nothing supplied
		    if (argv === undefined && parseOptions.from === undefined) {
		      if (process.versions?.electron) {
		        parseOptions.from = 'electron';
		      }
		      // check node specific options for scenarios where user CLI args follow executable without scriptname
		      const execArgv = process.execArgv ?? [];
		      if (
		        execArgv.includes('-e') ||
		        execArgv.includes('--eval') ||
		        execArgv.includes('-p') ||
		        execArgv.includes('--print')
		      ) {
		        parseOptions.from = 'eval'; // internal usage, not documented
		      }
		    }

		    // default to using process.argv
		    if (argv === undefined) {
		      argv = process.argv;
		    }
		    this.rawArgs = argv.slice();

		    // extract the user args and scriptPath
		    let userArgs;
		    switch (parseOptions.from) {
		      case undefined:
		      case 'node':
		        this._scriptPath = argv[1];
		        userArgs = argv.slice(2);
		        break;
		      case 'electron':
		        // @ts-ignore: because defaultApp is an unknown property
		        if (process.defaultApp) {
		          this._scriptPath = argv[1];
		          userArgs = argv.slice(2);
		        } else {
		          userArgs = argv.slice(1);
		        }
		        break;
		      case 'user':
		        userArgs = argv.slice(0);
		        break;
		      case 'eval':
		        userArgs = argv.slice(1);
		        break;
		      default:
		        throw new Error(
		          `unexpected parse option { from: '${parseOptions.from}' }`,
		        );
		    }

		    // Find default name for program from arguments.
		    if (!this._name && this._scriptPath)
		      this.nameFromFilename(this._scriptPath);
		    this._name = this._name || 'program';

		    return userArgs;
		  }

		  /**
		   * Parse `argv`, setting options and invoking commands when defined.
		   *
		   * Use parseAsync instead of parse if any of your action handlers are async.
		   *
		   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
		   *
		   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
		   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
		   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
		   * - `'user'`: just user arguments
		   *
		   * @example
		   * program.parse(); // parse process.argv and auto-detect electron and special node flags
		   * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
		   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
		   *
		   * @param {string[]} [argv] - optional, defaults to process.argv
		   * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
		   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
		   * @return {Command} `this` command for chaining
		   */

		  parse(argv, parseOptions) {
		    const userArgs = this._prepareUserArgs(argv, parseOptions);
		    this._parseCommand([], userArgs);

		    return this;
		  }

		  /**
		   * Parse `argv`, setting options and invoking commands when defined.
		   *
		   * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
		   *
		   * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
		   * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
		   * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
		   * - `'user'`: just user arguments
		   *
		   * @example
		   * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
		   * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
		   * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
		   *
		   * @param {string[]} [argv]
		   * @param {object} [parseOptions]
		   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
		   * @return {Promise}
		   */

		  async parseAsync(argv, parseOptions) {
		    const userArgs = this._prepareUserArgs(argv, parseOptions);
		    await this._parseCommand([], userArgs);

		    return this;
		  }

		  /**
		   * Execute a sub-command executable.
		   *
		   * @private
		   */

		  _executeSubCommand(subcommand, args) {
		    args = args.slice();
		    let launchWithNode = false; // Use node for source targets so do not need to get permissions correct, and on Windows.
		    const sourceExt = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];

		    function findFile(baseDir, baseName) {
		      // Look for specified file
		      const localBin = path.resolve(baseDir, baseName);
		      if (fs.existsSync(localBin)) return localBin;

		      // Stop looking if candidate already has an expected extension.
		      if (sourceExt.includes(path.extname(baseName))) return undefined;

		      // Try all the extensions.
		      const foundExt = sourceExt.find((ext) =>
		        fs.existsSync(`${localBin}${ext}`),
		      );
		      if (foundExt) return `${localBin}${foundExt}`;

		      return undefined;
		    }

		    // Not checking for help first. Unlikely to have mandatory and executable, and can't robustly test for help flags in external command.
		    this._checkForMissingMandatoryOptions();
		    this._checkForConflictingOptions();

		    // executableFile and executableDir might be full path, or just a name
		    let executableFile =
		      subcommand._executableFile || `${this._name}-${subcommand._name}`;
		    let executableDir = this._executableDir || '';
		    if (this._scriptPath) {
		      let resolvedScriptPath; // resolve possible symlink for installed npm binary
		      try {
		        resolvedScriptPath = fs.realpathSync(this._scriptPath);
		      } catch (err) {
		        resolvedScriptPath = this._scriptPath;
		      }
		      executableDir = path.resolve(
		        path.dirname(resolvedScriptPath),
		        executableDir,
		      );
		    }

		    // Look for a local file in preference to a command in PATH.
		    if (executableDir) {
		      let localFile = findFile(executableDir, executableFile);

		      // Legacy search using prefix of script name instead of command name
		      if (!localFile && !subcommand._executableFile && this._scriptPath) {
		        const legacyName = path.basename(
		          this._scriptPath,
		          path.extname(this._scriptPath),
		        );
		        if (legacyName !== this._name) {
		          localFile = findFile(
		            executableDir,
		            `${legacyName}-${subcommand._name}`,
		          );
		        }
		      }
		      executableFile = localFile || executableFile;
		    }

		    launchWithNode = sourceExt.includes(path.extname(executableFile));

		    let proc;
		    if (process.platform !== 'win32') {
		      if (launchWithNode) {
		        args.unshift(executableFile);
		        // add executable arguments to spawn
		        args = incrementNodeInspectorPort(process.execArgv).concat(args);

		        proc = childProcess.spawn(process.argv[0], args, { stdio: 'inherit' });
		      } else {
		        proc = childProcess.spawn(executableFile, args, { stdio: 'inherit' });
		      }
		    } else {
		      args.unshift(executableFile);
		      // add executable arguments to spawn
		      args = incrementNodeInspectorPort(process.execArgv).concat(args);
		      proc = childProcess.spawn(process.execPath, args, { stdio: 'inherit' });
		    }

		    if (!proc.killed) {
		      // testing mainly to avoid leak warnings during unit tests with mocked spawn
		      const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
		      signals.forEach((signal) => {
		        process.on(signal, () => {
		          if (proc.killed === false && proc.exitCode === null) {
		            // @ts-ignore because signals not typed to known strings
		            proc.kill(signal);
		          }
		        });
		      });
		    }

		    // By default terminate process when spawned process terminates.
		    const exitCallback = this._exitCallback;
		    proc.on('close', (code) => {
		      code = code ?? 1; // code is null if spawned process terminated due to a signal
		      if (!exitCallback) {
		        process.exit(code);
		      } else {
		        exitCallback(
		          new CommanderError(
		            code,
		            'commander.executeSubCommandAsync',
		            '(close)',
		          ),
		        );
		      }
		    });
		    proc.on('error', (err) => {
		      // @ts-ignore: because err.code is an unknown property
		      if (err.code === 'ENOENT') {
		        const executableDirMessage = executableDir
		          ? `searched for local subcommand relative to directory '${executableDir}'`
		          : 'no directory for search for local subcommand, use .executableDir() to supply a custom directory';
		        const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
		        throw new Error(executableMissing);
		        // @ts-ignore: because err.code is an unknown property
		      } else if (err.code === 'EACCES') {
		        throw new Error(`'${executableFile}' not executable`);
		      }
		      if (!exitCallback) {
		        process.exit(1);
		      } else {
		        const wrappedError = new CommanderError(
		          1,
		          'commander.executeSubCommandAsync',
		          '(error)',
		        );
		        wrappedError.nestedError = err;
		        exitCallback(wrappedError);
		      }
		    });

		    // Store the reference to the child process
		    this.runningCommand = proc;
		  }

		  /**
		   * @private
		   */

		  _dispatchSubcommand(commandName, operands, unknown) {
		    const subCommand = this._findCommand(commandName);
		    if (!subCommand) this.help({ error: true });

		    let promiseChain;
		    promiseChain = this._chainOrCallSubCommandHook(
		      promiseChain,
		      subCommand,
		      'preSubcommand',
		    );
		    promiseChain = this._chainOrCall(promiseChain, () => {
		      if (subCommand._executableHandler) {
		        this._executeSubCommand(subCommand, operands.concat(unknown));
		      } else {
		        return subCommand._parseCommand(operands, unknown);
		      }
		    });
		    return promiseChain;
		  }

		  /**
		   * Invoke help directly if possible, or dispatch if necessary.
		   * e.g. help foo
		   *
		   * @private
		   */

		  _dispatchHelpCommand(subcommandName) {
		    if (!subcommandName) {
		      this.help();
		    }
		    const subCommand = this._findCommand(subcommandName);
		    if (subCommand && !subCommand._executableHandler) {
		      subCommand.help();
		    }

		    // Fallback to parsing the help flag to invoke the help.
		    return this._dispatchSubcommand(
		      subcommandName,
		      [],
		      [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? '--help'],
		    );
		  }

		  /**
		   * Check this.args against expected this.registeredArguments.
		   *
		   * @private
		   */

		  _checkNumberOfArguments() {
		    // too few
		    this.registeredArguments.forEach((arg, i) => {
		      if (arg.required && this.args[i] == null) {
		        this.missingArgument(arg.name());
		      }
		    });
		    // too many
		    if (
		      this.registeredArguments.length > 0 &&
		      this.registeredArguments[this.registeredArguments.length - 1].variadic
		    ) {
		      return;
		    }
		    if (this.args.length > this.registeredArguments.length) {
		      this._excessArguments(this.args);
		    }
		  }

		  /**
		   * Process this.args using this.registeredArguments and save as this.processedArgs!
		   *
		   * @private
		   */

		  _processArguments() {
		    const myParseArg = (argument, value, previous) => {
		      // Extra processing for nice error message on parsing failure.
		      let parsedValue = value;
		      if (value !== null && argument.parseArg) {
		        const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
		        parsedValue = this._callParseArg(
		          argument,
		          value,
		          previous,
		          invalidValueMessage,
		        );
		      }
		      return parsedValue;
		    };

		    this._checkNumberOfArguments();

		    const processedArgs = [];
		    this.registeredArguments.forEach((declaredArg, index) => {
		      let value = declaredArg.defaultValue;
		      if (declaredArg.variadic) {
		        // Collect together remaining arguments for passing together as an array.
		        if (index < this.args.length) {
		          value = this.args.slice(index);
		          if (declaredArg.parseArg) {
		            value = value.reduce((processed, v) => {
		              return myParseArg(declaredArg, v, processed);
		            }, declaredArg.defaultValue);
		          }
		        } else if (value === undefined) {
		          value = [];
		        }
		      } else if (index < this.args.length) {
		        value = this.args[index];
		        if (declaredArg.parseArg) {
		          value = myParseArg(declaredArg, value, declaredArg.defaultValue);
		        }
		      }
		      processedArgs[index] = value;
		    });
		    this.processedArgs = processedArgs;
		  }

		  /**
		   * Once we have a promise we chain, but call synchronously until then.
		   *
		   * @param {(Promise|undefined)} promise
		   * @param {Function} fn
		   * @return {(Promise|undefined)}
		   * @private
		   */

		  _chainOrCall(promise, fn) {
		    // thenable
		    if (promise && promise.then && typeof promise.then === 'function') {
		      // already have a promise, chain callback
		      return promise.then(() => fn());
		    }
		    // callback might return a promise
		    return fn();
		  }

		  /**
		   *
		   * @param {(Promise|undefined)} promise
		   * @param {string} event
		   * @return {(Promise|undefined)}
		   * @private
		   */

		  _chainOrCallHooks(promise, event) {
		    let result = promise;
		    const hooks = [];
		    this._getCommandAndAncestors()
		      .reverse()
		      .filter((cmd) => cmd._lifeCycleHooks[event] !== undefined)
		      .forEach((hookedCommand) => {
		        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
		          hooks.push({ hookedCommand, callback });
		        });
		      });
		    if (event === 'postAction') {
		      hooks.reverse();
		    }

		    hooks.forEach((hookDetail) => {
		      result = this._chainOrCall(result, () => {
		        return hookDetail.callback(hookDetail.hookedCommand, this);
		      });
		    });
		    return result;
		  }

		  /**
		   *
		   * @param {(Promise|undefined)} promise
		   * @param {Command} subCommand
		   * @param {string} event
		   * @return {(Promise|undefined)}
		   * @private
		   */

		  _chainOrCallSubCommandHook(promise, subCommand, event) {
		    let result = promise;
		    if (this._lifeCycleHooks[event] !== undefined) {
		      this._lifeCycleHooks[event].forEach((hook) => {
		        result = this._chainOrCall(result, () => {
		          return hook(this, subCommand);
		        });
		      });
		    }
		    return result;
		  }

		  /**
		   * Process arguments in context of this command.
		   * Returns action result, in case it is a promise.
		   *
		   * @private
		   */

		  _parseCommand(operands, unknown) {
		    const parsed = this.parseOptions(unknown);
		    this._parseOptionsEnv(); // after cli, so parseArg not called on both cli and env
		    this._parseOptionsImplied();
		    operands = operands.concat(parsed.operands);
		    unknown = parsed.unknown;
		    this.args = operands.concat(unknown);

		    if (operands && this._findCommand(operands[0])) {
		      return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
		    }
		    if (
		      this._getHelpCommand() &&
		      operands[0] === this._getHelpCommand().name()
		    ) {
		      return this._dispatchHelpCommand(operands[1]);
		    }
		    if (this._defaultCommandName) {
		      this._outputHelpIfRequested(unknown); // Run the help for default command from parent rather than passing to default command
		      return this._dispatchSubcommand(
		        this._defaultCommandName,
		        operands,
		        unknown,
		      );
		    }
		    if (
		      this.commands.length &&
		      this.args.length === 0 &&
		      !this._actionHandler &&
		      !this._defaultCommandName
		    ) {
		      // probably missing subcommand and no handler, user needs help (and exit)
		      this.help({ error: true });
		    }

		    this._outputHelpIfRequested(parsed.unknown);
		    this._checkForMissingMandatoryOptions();
		    this._checkForConflictingOptions();

		    // We do not always call this check to avoid masking a "better" error, like unknown command.
		    const checkForUnknownOptions = () => {
		      if (parsed.unknown.length > 0) {
		        this.unknownOption(parsed.unknown[0]);
		      }
		    };

		    const commandEvent = `command:${this.name()}`;
		    if (this._actionHandler) {
		      checkForUnknownOptions();
		      this._processArguments();

		      let promiseChain;
		      promiseChain = this._chainOrCallHooks(promiseChain, 'preAction');
		      promiseChain = this._chainOrCall(promiseChain, () =>
		        this._actionHandler(this.processedArgs),
		      );
		      if (this.parent) {
		        promiseChain = this._chainOrCall(promiseChain, () => {
		          this.parent.emit(commandEvent, operands, unknown); // legacy
		        });
		      }
		      promiseChain = this._chainOrCallHooks(promiseChain, 'postAction');
		      return promiseChain;
		    }
		    if (this.parent && this.parent.listenerCount(commandEvent)) {
		      checkForUnknownOptions();
		      this._processArguments();
		      this.parent.emit(commandEvent, operands, unknown); // legacy
		    } else if (operands.length) {
		      if (this._findCommand('*')) {
		        // legacy default command
		        return this._dispatchSubcommand('*', operands, unknown);
		      }
		      if (this.listenerCount('command:*')) {
		        // skip option check, emit event for possible misspelling suggestion
		        this.emit('command:*', operands, unknown);
		      } else if (this.commands.length) {
		        this.unknownCommand();
		      } else {
		        checkForUnknownOptions();
		        this._processArguments();
		      }
		    } else if (this.commands.length) {
		      checkForUnknownOptions();
		      // This command has subcommands and nothing hooked up at this level, so display help (and exit).
		      this.help({ error: true });
		    } else {
		      checkForUnknownOptions();
		      this._processArguments();
		      // fall through for caller to handle after calling .parse()
		    }
		  }

		  /**
		   * Find matching command.
		   *
		   * @private
		   * @return {Command | undefined}
		   */
		  _findCommand(name) {
		    if (!name) return undefined;
		    return this.commands.find(
		      (cmd) => cmd._name === name || cmd._aliases.includes(name),
		    );
		  }

		  /**
		   * Return an option matching `arg` if any.
		   *
		   * @param {string} arg
		   * @return {Option}
		   * @package
		   */

		  _findOption(arg) {
		    return this.options.find((option) => option.is(arg));
		  }

		  /**
		   * Display an error message if a mandatory option does not have a value.
		   * Called after checking for help flags in leaf subcommand.
		   *
		   * @private
		   */

		  _checkForMissingMandatoryOptions() {
		    // Walk up hierarchy so can call in subcommand after checking for displaying help.
		    this._getCommandAndAncestors().forEach((cmd) => {
		      cmd.options.forEach((anOption) => {
		        if (
		          anOption.mandatory &&
		          cmd.getOptionValue(anOption.attributeName()) === undefined
		        ) {
		          cmd.missingMandatoryOptionValue(anOption);
		        }
		      });
		    });
		  }

		  /**
		   * Display an error message if conflicting options are used together in this.
		   *
		   * @private
		   */
		  _checkForConflictingLocalOptions() {
		    const definedNonDefaultOptions = this.options.filter((option) => {
		      const optionKey = option.attributeName();
		      if (this.getOptionValue(optionKey) === undefined) {
		        return false;
		      }
		      return this.getOptionValueSource(optionKey) !== 'default';
		    });

		    const optionsWithConflicting = definedNonDefaultOptions.filter(
		      (option) => option.conflictsWith.length > 0,
		    );

		    optionsWithConflicting.forEach((option) => {
		      const conflictingAndDefined = definedNonDefaultOptions.find((defined) =>
		        option.conflictsWith.includes(defined.attributeName()),
		      );
		      if (conflictingAndDefined) {
		        this._conflictingOption(option, conflictingAndDefined);
		      }
		    });
		  }

		  /**
		   * Display an error message if conflicting options are used together.
		   * Called after checking for help flags in leaf subcommand.
		   *
		   * @private
		   */
		  _checkForConflictingOptions() {
		    // Walk up hierarchy so can call in subcommand after checking for displaying help.
		    this._getCommandAndAncestors().forEach((cmd) => {
		      cmd._checkForConflictingLocalOptions();
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
		   * @param {string[]} argv
		   * @return {{operands: string[], unknown: string[]}}
		   */

		  parseOptions(argv) {
		    const operands = []; // operands, not options or values
		    const unknown = []; // first unknown option and remaining unknown args
		    let dest = operands;
		    const args = argv.slice();

		    function maybeOption(arg) {
		      return arg.length > 1 && arg[0] === '-';
		    }

		    // parse options
		    let activeVariadicOption = null;
		    while (args.length) {
		      const arg = args.shift();

		      // literal
		      if (arg === '--') {
		        if (dest === unknown) dest.push(arg);
		        dest.push(...args);
		        break;
		      }

		      if (activeVariadicOption && !maybeOption(arg)) {
		        this.emit(`option:${activeVariadicOption.name()}`, arg);
		        continue;
		      }
		      activeVariadicOption = null;

		      if (maybeOption(arg)) {
		        const option = this._findOption(arg);
		        // recognised option, call listener to assign value with possible custom processing
		        if (option) {
		          if (option.required) {
		            const value = args.shift();
		            if (value === undefined) this.optionMissingArgument(option);
		            this.emit(`option:${option.name()}`, value);
		          } else if (option.optional) {
		            let value = null;
		            // historical behaviour is optional value is following arg unless an option
		            if (args.length > 0 && !maybeOption(args[0])) {
		              value = args.shift();
		            }
		            this.emit(`option:${option.name()}`, value);
		          } else {
		            // boolean flag
		            this.emit(`option:${option.name()}`);
		          }
		          activeVariadicOption = option.variadic ? option : null;
		          continue;
		        }
		      }

		      // Look for combo options following single dash, eat first one if known.
		      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
		        const option = this._findOption(`-${arg[1]}`);
		        if (option) {
		          if (
		            option.required ||
		            (option.optional && this._combineFlagAndOptionalValue)
		          ) {
		            // option with value following in same argument
		            this.emit(`option:${option.name()}`, arg.slice(2));
		          } else {
		            // boolean option, emit and put back remainder of arg for further processing
		            this.emit(`option:${option.name()}`);
		            args.unshift(`-${arg.slice(2)}`);
		          }
		          continue;
		        }
		      }

		      // Look for known long flag with value, like --foo=bar
		      if (/^--[^=]+=/.test(arg)) {
		        const index = arg.indexOf('=');
		        const option = this._findOption(arg.slice(0, index));
		        if (option && (option.required || option.optional)) {
		          this.emit(`option:${option.name()}`, arg.slice(index + 1));
		          continue;
		        }
		      }

		      // Not a recognised option by this command.
		      // Might be a command-argument, or subcommand option, or unknown option, or help command or option.

		      // An unknown option means further arguments also classified as unknown so can be reprocessed by subcommands.
		      if (maybeOption(arg)) {
		        dest = unknown;
		      }

		      // If using positionalOptions, stop processing our options at subcommand.
		      if (
		        (this._enablePositionalOptions || this._passThroughOptions) &&
		        operands.length === 0 &&
		        unknown.length === 0
		      ) {
		        if (this._findCommand(arg)) {
		          operands.push(arg);
		          if (args.length > 0) unknown.push(...args);
		          break;
		        } else if (
		          this._getHelpCommand() &&
		          arg === this._getHelpCommand().name()
		        ) {
		          operands.push(arg);
		          if (args.length > 0) operands.push(...args);
		          break;
		        } else if (this._defaultCommandName) {
		          unknown.push(arg);
		          if (args.length > 0) unknown.push(...args);
		          break;
		        }
		      }

		      // If using passThroughOptions, stop processing options at first command-argument.
		      if (this._passThroughOptions) {
		        dest.push(arg);
		        if (args.length > 0) dest.push(...args);
		        break;
		      }

		      // add arg
		      dest.push(arg);
		    }

		    return { operands, unknown };
		  }

		  /**
		   * Return an object containing local option values as key-value pairs.
		   *
		   * @return {object}
		   */
		  opts() {
		    if (this._storeOptionsAsProperties) {
		      // Preserve original behaviour so backwards compatible when still using properties
		      const result = {};
		      const len = this.options.length;

		      for (let i = 0; i < len; i++) {
		        const key = this.options[i].attributeName();
		        result[key] =
		          key === this._versionOptionName ? this._version : this[key];
		      }
		      return result;
		    }

		    return this._optionValues;
		  }

		  /**
		   * Return an object containing merged local and global option values as key-value pairs.
		   *
		   * @return {object}
		   */
		  optsWithGlobals() {
		    // globals overwrite locals
		    return this._getCommandAndAncestors().reduce(
		      (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
		      {},
		    );
		  }

		  /**
		   * Display error message and exit (or call exitOverride).
		   *
		   * @param {string} message
		   * @param {object} [errorOptions]
		   * @param {string} [errorOptions.code] - an id string representing the error
		   * @param {number} [errorOptions.exitCode] - used with process.exit
		   */
		  error(message, errorOptions) {
		    // output handling
		    this._outputConfiguration.outputError(
		      `${message}\n`,
		      this._outputConfiguration.writeErr,
		    );
		    if (typeof this._showHelpAfterError === 'string') {
		      this._outputConfiguration.writeErr(`${this._showHelpAfterError}\n`);
		    } else if (this._showHelpAfterError) {
		      this._outputConfiguration.writeErr('\n');
		      this.outputHelp({ error: true });
		    }

		    // exit handling
		    const config = errorOptions || {};
		    const exitCode = config.exitCode || 1;
		    const code = config.code || 'commander.error';
		    this._exit(exitCode, code, message);
		  }

		  /**
		   * Apply any option related environment variables, if option does
		   * not have a value from cli or client code.
		   *
		   * @private
		   */
		  _parseOptionsEnv() {
		    this.options.forEach((option) => {
		      if (option.envVar && option.envVar in process.env) {
		        const optionKey = option.attributeName();
		        // Priority check. Do not overwrite cli or options from unknown source (client-code).
		        if (
		          this.getOptionValue(optionKey) === undefined ||
		          ['default', 'config', 'env'].includes(
		            this.getOptionValueSource(optionKey),
		          )
		        ) {
		          if (option.required || option.optional) {
		            // option can take a value
		            // keep very simple, optional always takes value
		            this.emit(`optionEnv:${option.name()}`, process.env[option.envVar]);
		          } else {
		            // boolean
		            // keep very simple, only care that envVar defined and not the value
		            this.emit(`optionEnv:${option.name()}`);
		          }
		        }
		      }
		    });
		  }

		  /**
		   * Apply any implied option values, if option is undefined or default value.
		   *
		   * @private
		   */
		  _parseOptionsImplied() {
		    const dualHelper = new DualOptions(this.options);
		    const hasCustomOptionValue = (optionKey) => {
		      return (
		        this.getOptionValue(optionKey) !== undefined &&
		        !['default', 'implied'].includes(this.getOptionValueSource(optionKey))
		      );
		    };
		    this.options
		      .filter(
		        (option) =>
		          option.implied !== undefined &&
		          hasCustomOptionValue(option.attributeName()) &&
		          dualHelper.valueFromOption(
		            this.getOptionValue(option.attributeName()),
		            option,
		          ),
		      )
		      .forEach((option) => {
		        Object.keys(option.implied)
		          .filter((impliedKey) => !hasCustomOptionValue(impliedKey))
		          .forEach((impliedKey) => {
		            this.setOptionValueWithSource(
		              impliedKey,
		              option.implied[impliedKey],
		              'implied',
		            );
		          });
		      });
		  }

		  /**
		   * Argument `name` is missing.
		   *
		   * @param {string} name
		   * @private
		   */

		  missingArgument(name) {
		    const message = `error: missing required argument '${name}'`;
		    this.error(message, { code: 'commander.missingArgument' });
		  }

		  /**
		   * `Option` is missing an argument.
		   *
		   * @param {Option} option
		   * @private
		   */

		  optionMissingArgument(option) {
		    const message = `error: option '${option.flags}' argument missing`;
		    this.error(message, { code: 'commander.optionMissingArgument' });
		  }

		  /**
		   * `Option` does not have a value, and is a mandatory option.
		   *
		   * @param {Option} option
		   * @private
		   */

		  missingMandatoryOptionValue(option) {
		    const message = `error: required option '${option.flags}' not specified`;
		    this.error(message, { code: 'commander.missingMandatoryOptionValue' });
		  }

		  /**
		   * `Option` conflicts with another option.
		   *
		   * @param {Option} option
		   * @param {Option} conflictingOption
		   * @private
		   */
		  _conflictingOption(option, conflictingOption) {
		    // The calling code does not know whether a negated option is the source of the
		    // value, so do some work to take an educated guess.
		    const findBestOptionFromValue = (option) => {
		      const optionKey = option.attributeName();
		      const optionValue = this.getOptionValue(optionKey);
		      const negativeOption = this.options.find(
		        (target) => target.negate && optionKey === target.attributeName(),
		      );
		      const positiveOption = this.options.find(
		        (target) => !target.negate && optionKey === target.attributeName(),
		      );
		      if (
		        negativeOption &&
		        ((negativeOption.presetArg === undefined && optionValue === false) ||
		          (negativeOption.presetArg !== undefined &&
		            optionValue === negativeOption.presetArg))
		      ) {
		        return negativeOption;
		      }
		      return positiveOption || option;
		    };

		    const getErrorMessage = (option) => {
		      const bestOption = findBestOptionFromValue(option);
		      const optionKey = bestOption.attributeName();
		      const source = this.getOptionValueSource(optionKey);
		      if (source === 'env') {
		        return `environment variable '${bestOption.envVar}'`;
		      }
		      return `option '${bestOption.flags}'`;
		    };

		    const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
		    this.error(message, { code: 'commander.conflictingOption' });
		  }

		  /**
		   * Unknown option `flag`.
		   *
		   * @param {string} flag
		   * @private
		   */

		  unknownOption(flag) {
		    if (this._allowUnknownOption) return;
		    let suggestion = '';

		    if (flag.startsWith('--') && this._showSuggestionAfterError) {
		      // Looping to pick up the global options too
		      let candidateFlags = [];
		      // eslint-disable-next-line @typescript-eslint/no-this-alias
		      let command = this;
		      do {
		        const moreFlags = command
		          .createHelp()
		          .visibleOptions(command)
		          .filter((option) => option.long)
		          .map((option) => option.long);
		        candidateFlags = candidateFlags.concat(moreFlags);
		        command = command.parent;
		      } while (command && !command._enablePositionalOptions);
		      suggestion = suggestSimilar(flag, candidateFlags);
		    }

		    const message = `error: unknown option '${flag}'${suggestion}`;
		    this.error(message, { code: 'commander.unknownOption' });
		  }

		  /**
		   * Excess arguments, more than expected.
		   *
		   * @param {string[]} receivedArgs
		   * @private
		   */

		  _excessArguments(receivedArgs) {
		    if (this._allowExcessArguments) return;

		    const expected = this.registeredArguments.length;
		    const s = expected === 1 ? '' : 's';
		    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
		    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
		    this.error(message, { code: 'commander.excessArguments' });
		  }

		  /**
		   * Unknown command.
		   *
		   * @private
		   */

		  unknownCommand() {
		    const unknownName = this.args[0];
		    let suggestion = '';

		    if (this._showSuggestionAfterError) {
		      const candidateNames = [];
		      this.createHelp()
		        .visibleCommands(this)
		        .forEach((command) => {
		          candidateNames.push(command.name());
		          // just visible alias
		          if (command.alias()) candidateNames.push(command.alias());
		        });
		      suggestion = suggestSimilar(unknownName, candidateNames);
		    }

		    const message = `error: unknown command '${unknownName}'${suggestion}`;
		    this.error(message, { code: 'commander.unknownCommand' });
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
		   * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
		   */

		  version(str, flags, description) {
		    if (str === undefined) return this._version;
		    this._version = str;
		    flags = flags || '-V, --version';
		    description = description || 'output the version number';
		    const versionOption = this.createOption(flags, description);
		    this._versionOptionName = versionOption.attributeName();
		    this._registerOption(versionOption);

		    this.on('option:' + versionOption.name(), () => {
		      this._outputConfiguration.writeOut(`${str}\n`);
		      this._exit(0, 'commander.version', str);
		    });
		    return this;
		  }

		  /**
		   * Set the description.
		   *
		   * @param {string} [str]
		   * @param {object} [argsDescription]
		   * @return {(string|Command)}
		   */
		  description(str, argsDescription) {
		    if (str === undefined && argsDescription === undefined)
		      return this._description;
		    this._description = str;
		    if (argsDescription) {
		      this._argsDescription = argsDescription;
		    }
		    return this;
		  }

		  /**
		   * Set the summary. Used when listed as subcommand of parent.
		   *
		   * @param {string} [str]
		   * @return {(string|Command)}
		   */
		  summary(str) {
		    if (str === undefined) return this._summary;
		    this._summary = str;
		    return this;
		  }

		  /**
		   * Set an alias for the command.
		   *
		   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
		   *
		   * @param {string} [alias]
		   * @return {(string|Command)}
		   */

		  alias(alias) {
		    if (alias === undefined) return this._aliases[0]; // just return first, for backwards compatibility

		    /** @type {Command} */
		    // eslint-disable-next-line @typescript-eslint/no-this-alias
		    let command = this;
		    if (
		      this.commands.length !== 0 &&
		      this.commands[this.commands.length - 1]._executableHandler
		    ) {
		      // assume adding alias for last added executable subcommand, rather than this
		      command = this.commands[this.commands.length - 1];
		    }

		    if (alias === command._name)
		      throw new Error("Command alias can't be the same as its name");
		    const matchingCommand = this.parent?._findCommand(alias);
		    if (matchingCommand) {
		      // c.f. _registerCommand
		      const existingCmd = [matchingCommand.name()]
		        .concat(matchingCommand.aliases())
		        .join('|');
		      throw new Error(
		        `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`,
		      );
		    }

		    command._aliases.push(alias);
		    return this;
		  }

		  /**
		   * Set aliases for the command.
		   *
		   * Only the first alias is shown in the auto-generated help.
		   *
		   * @param {string[]} [aliases]
		   * @return {(string[]|Command)}
		   */

		  aliases(aliases) {
		    // Getter for the array of aliases is the main reason for having aliases() in addition to alias().
		    if (aliases === undefined) return this._aliases;

		    aliases.forEach((alias) => this.alias(alias));
		    return this;
		  }

		  /**
		   * Set / get the command usage `str`.
		   *
		   * @param {string} [str]
		   * @return {(string|Command)}
		   */

		  usage(str) {
		    if (str === undefined) {
		      if (this._usage) return this._usage;

		      const args = this.registeredArguments.map((arg) => {
		        return humanReadableArgName(arg);
		      });
		      return []
		        .concat(
		          this.options.length || this._helpOption !== null ? '[options]' : [],
		          this.commands.length ? '[command]' : [],
		          this.registeredArguments.length ? args : [],
		        )
		        .join(' ');
		    }

		    this._usage = str;
		    return this;
		  }

		  /**
		   * Get or set the name of the command.
		   *
		   * @param {string} [str]
		   * @return {(string|Command)}
		   */

		  name(str) {
		    if (str === undefined) return this._name;
		    this._name = str;
		    return this;
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

		  nameFromFilename(filename) {
		    this._name = path.basename(filename, path.extname(filename));

		    return this;
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
		   * @return {(string|null|Command)}
		   */

		  executableDir(path) {
		    if (path === undefined) return this._executableDir;
		    this._executableDir = path;
		    return this;
		  }

		  /**
		   * Return program help documentation.
		   *
		   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
		   * @return {string}
		   */

		  helpInformation(contextOptions) {
		    const helper = this.createHelp();
		    if (helper.helpWidth === undefined) {
		      helper.helpWidth =
		        contextOptions && contextOptions.error
		          ? this._outputConfiguration.getErrHelpWidth()
		          : this._outputConfiguration.getOutHelpWidth();
		    }
		    return helper.formatHelp(this, helper);
		  }

		  /**
		   * @private
		   */

		  _getHelpContext(contextOptions) {
		    contextOptions = contextOptions || {};
		    const context = { error: !!contextOptions.error };
		    let write;
		    if (context.error) {
		      write = (arg) => this._outputConfiguration.writeErr(arg);
		    } else {
		      write = (arg) => this._outputConfiguration.writeOut(arg);
		    }
		    context.write = contextOptions.write || write;
		    context.command = this;
		    return context;
		  }

		  /**
		   * Output help information for this command.
		   *
		   * Outputs built-in help, and custom text added using `.addHelpText()`.
		   *
		   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
		   */

		  outputHelp(contextOptions) {
		    let deprecatedCallback;
		    if (typeof contextOptions === 'function') {
		      deprecatedCallback = contextOptions;
		      contextOptions = undefined;
		    }
		    const context = this._getHelpContext(contextOptions);

		    this._getCommandAndAncestors()
		      .reverse()
		      .forEach((command) => command.emit('beforeAllHelp', context));
		    this.emit('beforeHelp', context);

		    let helpInformation = this.helpInformation(context);
		    if (deprecatedCallback) {
		      helpInformation = deprecatedCallback(helpInformation);
		      if (
		        typeof helpInformation !== 'string' &&
		        !Buffer.isBuffer(helpInformation)
		      ) {
		        throw new Error('outputHelp callback must return a string or a Buffer');
		      }
		    }
		    context.write(helpInformation);

		    if (this._getHelpOption()?.long) {
		      this.emit(this._getHelpOption().long); // deprecated
		    }
		    this.emit('afterHelp', context);
		    this._getCommandAndAncestors().forEach((command) =>
		      command.emit('afterAllHelp', context),
		    );
		  }

		  /**
		   * You can pass in flags and a description to customise the built-in help option.
		   * Pass in false to disable the built-in help option.
		   *
		   * @example
		   * program.helpOption('-?, --help' 'show help'); // customise
		   * program.helpOption(false); // disable
		   *
		   * @param {(string | boolean)} flags
		   * @param {string} [description]
		   * @return {Command} `this` command for chaining
		   */

		  helpOption(flags, description) {
		    // Support disabling built-in help option.
		    if (typeof flags === 'boolean') {
		      if (flags) {
		        this._helpOption = this._helpOption ?? undefined; // preserve existing option
		      } else {
		        this._helpOption = null; // disable
		      }
		      return this;
		    }

		    // Customise flags and description.
		    flags = flags ?? '-h, --help';
		    description = description ?? 'display help for command';
		    this._helpOption = this.createOption(flags, description);

		    return this;
		  }

		  /**
		   * Lazy create help option.
		   * Returns null if has been disabled with .helpOption(false).
		   *
		   * @returns {(Option | null)} the help option
		   * @package
		   */
		  _getHelpOption() {
		    // Lazy create help option on demand.
		    if (this._helpOption === undefined) {
		      this.helpOption(undefined, undefined);
		    }
		    return this._helpOption;
		  }

		  /**
		   * Supply your own option to use for the built-in help option.
		   * This is an alternative to using helpOption() to customise the flags and description etc.
		   *
		   * @param {Option} option
		   * @return {Command} `this` command for chaining
		   */
		  addHelpOption(option) {
		    this._helpOption = option;
		    return this;
		  }

		  /**
		   * Output help information and exit.
		   *
		   * Outputs built-in help, and custom text added using `.addHelpText()`.
		   *
		   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
		   */

		  help(contextOptions) {
		    this.outputHelp(contextOptions);
		    let exitCode = process.exitCode || 0;
		    if (
		      exitCode === 0 &&
		      contextOptions &&
		      typeof contextOptions !== 'function' &&
		      contextOptions.error
		    ) {
		      exitCode = 1;
		    }
		    // message: do not have all displayed text available so only passing placeholder.
		    this._exit(exitCode, 'commander.help', '(outputHelp)');
		  }

		  /**
		   * Add additional text to be displayed with the built-in help.
		   *
		   * Position is 'before' or 'after' to affect just this command,
		   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
		   *
		   * @param {string} position - before or after built-in help
		   * @param {(string | Function)} text - string to add, or a function returning a string
		   * @return {Command} `this` command for chaining
		   */
		  addHelpText(position, text) {
		    const allowedValues = ['beforeAll', 'before', 'after', 'afterAll'];
		    if (!allowedValues.includes(position)) {
		      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
		    }
		    const helpEvent = `${position}Help`;
		    this.on(helpEvent, (context) => {
		      let helpStr;
		      if (typeof text === 'function') {
		        helpStr = text({ error: context.error, command: context.command });
		      } else {
		        helpStr = text;
		      }
		      // Ignore falsy value when nothing to output.
		      if (helpStr) {
		        context.write(`${helpStr}\n`);
		      }
		    });
		    return this;
		  }

		  /**
		   * Output help information if help flags specified
		   *
		   * @param {Array} args - array of options to search for help flags
		   * @private
		   */

		  _outputHelpIfRequested(args) {
		    const helpOption = this._getHelpOption();
		    const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
		    if (helpRequested) {
		      this.outputHelp();
		      // (Do not have all displayed text available so only passing placeholder.)
		      this._exit(0, 'commander.helpDisplayed', '(outputHelp)');
		    }
		  }
		}

		/**
		 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
		 *
		 * @param {string[]} args - array of arguments from node.execArgv
		 * @returns {string[]}
		 * @private
		 */

		function incrementNodeInspectorPort(args) {
		  // Testing for these options:
		  //  --inspect[=[host:]port]
		  //  --inspect-brk[=[host:]port]
		  //  --inspect-port=[host:]port
		  return args.map((arg) => {
		    if (!arg.startsWith('--inspect')) {
		      return arg;
		    }
		    let debugOption;
		    let debugHost = '127.0.0.1';
		    let debugPort = '9229';
		    let match;
		    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
		      // e.g. --inspect
		      debugOption = match[1];
		    } else if (
		      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null
		    ) {
		      debugOption = match[1];
		      if (/^\d+$/.test(match[3])) {
		        // e.g. --inspect=1234
		        debugPort = match[3];
		      } else {
		        // e.g. --inspect=localhost
		        debugHost = match[3];
		      }
		    } else if (
		      (match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null
		    ) {
		      // e.g. --inspect=localhost:1234
		      debugOption = match[1];
		      debugHost = match[3];
		      debugPort = match[4];
		    }

		    if (debugOption && debugPort !== '0') {
		      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
		    }
		    return arg;
		  });
		}

		command.Command = Command;
		return command;
	}

	var hasRequiredCommander;

	function requireCommander () {
		if (hasRequiredCommander) return commander;
		hasRequiredCommander = 1;
		const { Argument } = requireArgument();
		const { Command } = requireCommand();
		const { CommanderError, InvalidArgumentError } = requireError();
		const { Help } = requireHelp();
		const { Option } = requireOption();

		commander.program = new Command();

		commander.createCommand = (name) => new Command(name);
		commander.createOption = (flags, description) => new Option(flags, description);
		commander.createArgument = (name, description) => new Argument(name, description);

		/**
		 * Expose classes
		 */

		commander.Command = Command;
		commander.Option = Option;
		commander.Argument = Argument;
		commander.Help = Help;

		commander.CommanderError = CommanderError;
		commander.InvalidArgumentError = InvalidArgumentError;
		commander.InvalidOptionArgumentError = InvalidArgumentError; // Deprecated
		return commander;
	}

	Frame2Text.exports;

	var hasRequiredFrame2Text;

	function requireFrame2Text () {
		if (hasRequiredFrame2Text) return Frame2Text.exports;
		hasRequiredFrame2Text = 1;
		(function (module) {
			//= ============================================================================
			// Frame2Text.js
			// ----------------------------------------------------------------------------
			// (C)2023-2024 Shick
			// This software is released under the MIT License.
			// http://opensource.org/licenses/mit-license.php
			// ----------------------------------------------------------------------------
			// Version
			// 1.0.1 2024/09/07:
			// ・#125 プラグインコマンドMZを変換する際、オブジェクト型を取り扱えない不具合の修正
			// 1.0.0 2024/01/20 Initial Version
			// 0.1.0 2023/09/25 新規作成
			//= ============================================================================

			/* eslint-disable spaced-comment */
			/*:
			 * @target MZ
			 * @plugindesc イベントコマンドをテキストファイル(.txtファイルなど)に出力するための開発支援プラグインです。ツクールMV・MZの両方に対応しています。
			 * @author inazumasoft:Shick
			 * @url https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Frame2Text.js
			 *
			 * @command EXPORT_EVENT_TO_MESSAGE
			 * @text イベントをエクスポート
			 * @desc テキストにイベントをエクスポートします。出力するマップ・イベント・ページIDや、出力先のファイルの情報を指定します。
			 *
			 * @arg FileFolder
			 * @text 出力先フォルダ名
			 * @desc テキストファイルを出力するフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 出力先ファイル名
			 * @desc 出力するテキストファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg MapID
			 * @text 出力するマップID
			 * @desc 出力するマップのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @arg EventID
			 * @text 出力するイベントID
			 * @desc 出力するイベントのIDを設定します。デフォルト値は2です。
			 * @type number
			 * @default 2
			 *
			 * @arg PageID
			 * @text 出力するページID
			 * @desc 出力するページのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @command EXPORT_CE_TO_MESSAGE
			 * @text コモンイベントをエクスポート
			 * @desc テキストにコモンイベントをエクスポートします。出力するコモンイベントのIDや、出力先のファイルの情報を指定します。
			 *
			 * @arg FileFolder
			 * @text 出力先フォルダ名
			 * @desc テキストファイルを出力するフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 出力先ファイル名
			 * @desc 出力するテキストファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg CommonEventID
			 * @text 出力するコモンイベントID
			 * @desc 出力するコモンイベントIDを設定します。デフォルト値は1です。
			 * @type common_event
			 * @default 1
			 *
			 * @command MERGE_EVENT_TO_MESSAGE
			 * @text イベントを取り出す(翻訳を残す)
			 * @desc ゲームのイベントをテキストへ取り込みます。既存の翻訳は残し、ゲーム側の変更だけを反映します(祖先は自動)。
			 *
			 * @arg FileFolder
			 * @text 取り込み先フォルダ名
			 * @desc テキストファイルのフォルダ名。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み先ファイル名
			 * @desc テキストファイル名。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg MapID
			 * @text マップID
			 * @type number
			 * @default 1
			 *
			 * @arg EventID
			 * @text イベントID
			 * @type number
			 * @default 2
			 *
			 * @arg PageID
			 * @text ページID
			 * @type number
			 * @default 1
			 *
			 * @arg BaseFolder
			 * @text 祖先フォルダ名(任意)
			 * @desc 3-way の共通祖先テキストのフォルダ名。空なら自動(.t2f-base)。
			 * @type string
			 * @default
			 *
			 * @arg BaseFileName
			 * @text 祖先ファイル名(任意)
			 * @type string
			 * @default
			 *
			 * @command MERGE_CE_TO_MESSAGE
			 * @text コモンイベントを取り出す(翻訳を残す)
			 * @desc ゲームのコモンイベントをテキストへ取り込みます。既存の翻訳は残し、ゲーム側の変更だけを反映します(祖先は自動)。
			 *
			 * @arg FileFolder
			 * @text 取り込み先フォルダ名
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み先ファイル名
			 * @type string
			 * @default message.txt
			 *
			 * @arg CommonEventID
			 * @text コモンイベントID
			 * @type common_event
			 * @default 1
			 *
			 * @arg BaseFolder
			 * @text 祖先フォルダ名(任意)
			 * @type string
			 * @default
			 *
			 * @arg BaseFileName
			 * @text 祖先ファイル名(任意)
			 * @type string
			 * @default
			 *

			 *
			 * @command BATCH_EXPORT_MESSAGES_TO_FOLDER
			 * @text フォルダへ一括取り出し
			 * @desc dataフォルダ内の全イベント/コモンイベントを走査し、front matter付きテキストとしてフォルダへ一括出力します。
			 *
			 * @arg DataDir
			 * @text ゲームデータディレクトリ
			 * @desc 走査対象のゲームデータディレクトリです。デフォルトはdataです。
			 * @type string
			 * @default data
			 *
			 * @arg Locale
			 * @text ロケール
			 * @desc 出力先の言語サブフォルダ名です。デフォルトはjaです。
			 * @type string
			 * @default ja
			 *
			 * @arg TextBase
			 * @text テキストベースディレクトリ
			 * @desc 出力先のテキストベースディレクトリです。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg EnglishTag
			 * @text 英語タグ有効化
			 * @desc trueのときコマンドタグを英語で出力します。デフォルト値はtrueです。
			 * @type select
			 * @option true
			 * @option false
			 * @default true
			 *
			 * @param Default Scenario Folder
			 * @text 出力フォルダ名
			 * @desc シナリオファイルを出力するフォルダ名を設定します。デフォルトはtextです。(MZでは無視されます)
			 * @default text
			 * @require 1
			 * @dir text
			 * @type string
			 *
			 * @param Default Scenario File
			 * @text 出力ファイル名
			 * @desc 出力するシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。(MZでは無視されます)
			 * @default message.txt
			 * @require 1
			 * @dir text
			 * @type string
			 *
			 * @param Default Common Event ID
			 * @text 出力するコモンイベントID
			 * @desc 出力するコモンイベントのIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type common_event
			 *
			 * @param Default MapID
			 * @text 出力するマップID
			 * @desc 出力するマップのIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type number
			 *
			 * @param Default EventID
			 * @text 出力するイベントID
			 * @desc 出力するイベントのIDを設定します。デフォルト値は2です。(MZでは無視されます)
			 * @default 2
			 * @type number
			 *
			 * @param Default PageID
			 * @text 出力するページID
			 * @desc 出力するページのIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type number
			 *
			 * @param IsDebug
			 * @text デバッグモードを利用する
			 * @desc F8のコンソールログにこのプラグインの詳細ログが出力されます。デフォルト値はfalseです。処理時間が伸びます。
			 * @default false
			 * @type boolean
			 *
			 * @param DisplayMsg
			 * @text メッセージ表示
			 * @desc 実行時に通常メッセージを表示します。OFFで警告以外のメッセージが表示されなくなります。デフォルト値はtrueです。
			 * @default true
			 * @type boolean
			 *
			 * @param DisplayWarning
			 * @text 警告文表示
			 * @desc 実行時に警告を表示します。OFFで警告が表示されなくなります。デフォルト値はtrueです。
			 * @default true
			 * @type boolean
			 *
			 * @param EnglishTag
			 * @text 英語タグ
			 * @desc ファイル出力時のタグ、パラメータの言語。デフォルト値はtrue(英語)です。
			 * @default true
			 * @type boolean
			 *
			 * @help
			 * 本プラグインはイベントコマンドをテキストファイル(.txtファイルなど)に
			 * 出力するための開発支援プラグインです。
			 *
			 * Text2Frameの逆の処理を行うプラグインであり、
			 * 既存のイベントをテキストに出力して管理したい場合や、
			 * Text2Frameで一度取り込んだイベントをイベントエディターで編集した後に
			 * 再度テキストに出力したい時に使用するプラグインです。
			 *
			 * Text2Frameについては、以下のページをご覧ください。
			 * https://github.com/yktsr/Text2Frame-MV
			 *
			 *
			 * -------------------------------------
			 * ツクールMVでの実行方法
			 * -------------------------------------
			 * 1. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
			 *
			 * 2. テキストファイルに出力したいマップID, イベントID, ページID、コモンイベン
			 *    トIDをメモしておきます。
			 *  ・マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの左
			 *    上に記載されています。
			 *  ・イベントIDはイベントをダブルクリックして出るイベントエディターの左上に記
			 *    載されています。
			 *  ・ページIDはイベントエディターのイベントの名前の下に記載されています。
			 *  ・コモンイベントIDはデータベースのコモンイベントのデータリストから確認でき
			 *    ます。
			 *
			 * 3. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
			 *  ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
			 *      (デフォルトはtextです)
			 *  ・「出力ファイル名」に出力したいテキストファイル名を入力。
			 *      (デフォルトはmessage.txtです)
			 *  ・「出力するコモンイベントID」に2.でメモしたコモンイベントIDを入力。
			 *      (デフォルトで1です)
			 *  ・「出力するマップID」に2.でメモしたマップIDを入力。
			 *      (デフォルトは1です)
			 *  ・「出力するイベントID」に2.でメモしたイベントIDを入力。
			 *      (デフォルトは2です)
			 *  ・「出力するページID」に2.でメモしたページIDを入力。
			 *      (デフォルトで1です)
			 *  ・「英語タグ」にテキストに出力される言語をtrueかfalseで入力。
			 *      (デフォルトでtrue(英語)です)
			 *       - trueの場合の名前タグの例 ："<Name: ハロルド>"
			 *       - falseの場合の名前タグの例："<名前: ハロルド>"
			 *
			 * 4. 以下のうちいずれかを記述したプラグインコマンドを作成する。
			 *  【マップのイベントを出力したい場合】
			 *    EXPORT_EVENT_TO_MESSAGE
			 *    イベントをメッセージにエクスポ－ト
			 *     上記どちらかのプラグインコマンドを記載する
			 *  【コモンイベントを出力したい場合】
			 *    EXPORT_CE_TO_MESSAGE
			 *    コモンイベントをメッセージにエクスポート
			 *     上記どちらかのプラグインコマンドを記載する

			 *
			 * 5. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
			 *    【成功した場合】
			 *      出力されたMapID、EventID、PageID、Common EventIDや
			 *      フォルダ、ファイル名のメッセージが表示されます。
			 *    【失敗した場合】
			 *      「Save failed./ 保存に失敗しました ファイルが開いていないか確認してくだ
			 *       さい」
			 *      というメッセージが表示された場合は、指定したフォルダが作成されているか
			 *      の確認と指定したファイルが開いていないかを確認してください。
			 *
			 *
			 * --------------------------------------
			 * ツクールMVでのプラグインコマンドの引数
			 * --------------------------------------
			 * ツクールMVでのプラグインコマンドに引数を設定することにより、
			 * プラグインパラメータで指定したテキストファイルやマップIDとは違うパラメータで
			 * 実行ができます。
			 *
			 * 例1:マップIDが1, イベントIDが2, ページIDが3をtext/message.txtに出力する
			 *   EXPORT_EVENT_TO_MESSAGE text message.txt 1 2 3
			 *   イベントをメッセージにエクスポ－ト text message.txt 1 2 3
			 *
			 * 例2:IDが3のコモンイベントをtext/message.txtに出力する
			 *   EXPORT_CE_TO_MESSAGE text message.txt 3
			 *   コモンイベントをメッセージにエクスポート text message.txt 3
			 *

			 *
			 * -------------------------------------
			 * ツクールMZでの実行方法
			 * -------------------------------------
			 * 1. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
			 *
			 * 2. テキストファイルに出力したいマップID, イベントID, ページID、コモンイベン
			 *    トIDをメモしておきます。
			 *    ・マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
			 *      左上に記載されています。
			 *    ・イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
			 *      記載されています。
			 *    ・ページIDはイベントエディターのイベントの名前の下に記載されています。
			 *    ・コモンイベントIDはデータベースのコモンイベントのデータリストから確認で
			 *      きます。
			 *
			 * 3. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
			 *  ・「英語タグ」にテキストに出力される言語をtrueかfalseで入力。
			 *      (デフォルトでtrue(英語)です)
			 *        - trueの場合の名前タグの例 ："<Name: リード>"
			 *        - falseの場合の名前タグの例："<名前: リード>"
			 *
			 * 4. 以下の手順でプラグインコマンドを作成する。
			 *  【マップのイベントを出力したい場合】
			 *   ・「イベントをエクスポート」を選択。
			 *   ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
			 *       (デフォルトはtextです)
			 *   ・「出力ファイル名」に出力したいテキストファイル名を入力。
			 *       (デフォルトはmessage.txtです)
			 *   ・「出力するマップID」に2.でメモしたマップIDを入力。
			 *       (デフォルトは1です)
			 *   ・「出力するイベントID」に2.でメモしたイベントIDを入力。
			 *       (デフォルトは2です)
			 *   ・「出力するページID」に2.でメモしたページIDを入力。
			 *       (デフォルトで1です)
			 *  【コモンイベントを出力したい場合】
			 *   ・「コモンイベントをエクスポート」を選択。
			 *   ・「出力フォルダ名」に1.で作成したフォルダ名を入力。
			 *       (デフォルトはtextです)
			 *   ・「出力ファイル名」に出力したいテキストファイル名を入力。
			 *       (デフォルトはmessage.txtです)
			 *   ・「出力するコモンイベントID」に2.でメモしたコモンイベントIDを入力。
			 *       (デフォルトで1です)

			 *
			 * 5. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
			 *    【成功した場合】
			 *      出力されたMapID、EventID、PageID、Common EventIDや
			 *      フォルダ、ファイル名のメッセージが表示されます。
			 *    【失敗した場合】
			 *      「Save failed./ 保存に失敗しました ファイルが開いていないか確認してくだ
			 *       さい」
			 *      というメッセージが表示された場合は、指定したフォルダが作成されているか
			 *      の確認と指定したファイルが開いていないかを確認してください。
			 *
			 * --------------------------------------
			 * 注意事項
			 * --------------------------------------
			 * プラグイン作者は、いかなる場合も破損したプロジェクトの復元には
			 * 応じられませんのでご注意ください。
			 * テキストファイルの文字コードはUTF-8にのみ対応しています。
			 *
			 * --------------------------------------
			 * Version
			 * --------------------------------------
			 * 1.0.1
			 * build: 81bc070a76bcd0246713b2872df90650ffc7ce70
			 */
			/* eslint-enable spaced-comment */

			/* global Game_Interpreter, $gameMessage, process, PluginManager, globalThis, __dirname */

			// Text2Frame の共有 API を解決する。ゲーム内(NW.js)は require('./Text2Frame.js') が
			// 解決できないため、まず Text2Frame がグローバル公開した API を使い、無ければ Node の
			// require(兄弟ファイル / __dirname 基準)にフォールバックする。
			function resolveText2Frame () {
			  try {
			    if (typeof globalThis !== 'undefined' && globalThis.$LaurusText2Frame && globalThis.$LaurusText2Frame.saveBaseText) {
			      return globalThis.$LaurusText2Frame
			    }
			  } catch (e) { /* noop */ }
			  if (typeof commonjsRequire !== 'undefined') {
			    try { return requireText2Frame() } catch (e) { /* try next */ }
			    try { return commonjsRequire(require('path').join(__dirname, 'Text2Frame.js')) } catch (e) { /* give up */ }
			  }
			  return null
			}

			(function () {

			  var Laurus = Laurus || {}; // eslint-disable-line no-var, no-use-before-define
			  Laurus.Frame2Text = {};

			  if (typeof PluginManager === 'undefined') {
			    Laurus.Frame2Text.FileFolder = 'test';
			    Laurus.Frame2Text.FileName = 'basic.txt';
			    Laurus.Frame2Text.CommonEventID = '1';
			    Laurus.Frame2Text.MapID = '1';
			    Laurus.Frame2Text.EventID = '1';
			    Laurus.Frame2Text.PageID = '1';
			    Laurus.Frame2Text.IsDebug = true;
			    Laurus.Frame2Text.DisplayMsg = true;
			    Laurus.Frame2Text.DisplayWarning = true;
			    Laurus.Frame2Text.EnglishTag = true;

			    globalThis.Game_Interpreter = {};
			    Game_Interpreter.prototype = {};
			    globalThis.$gameMessage = {};
			    $gameMessage.add = function () {};
			  } else {
			    // for default plugin command
			    Laurus.Frame2Text.Parameters = PluginManager.parameters('Frame2Text');
			    Laurus.Frame2Text.FileFolder = String(Laurus.Frame2Text.Parameters['Default Scenario Folder']);
			    Laurus.Frame2Text.FileName = String(Laurus.Frame2Text.Parameters['Default Scenario File']);
			    Laurus.Frame2Text.CommonEventID = String(Laurus.Frame2Text.Parameters['Default Common Event ID']);
			    Laurus.Frame2Text.MapID = String(Laurus.Frame2Text.Parameters['Default MapID']);
			    Laurus.Frame2Text.EventID = String(Laurus.Frame2Text.Parameters['Default EventID']);
			    Laurus.Frame2Text.PageID = String(Laurus.Frame2Text.Parameters['Default PageID']);
			    Laurus.Frame2Text.IsDebug = String(Laurus.Frame2Text.Parameters.IsDebug) === 'true';
			    Laurus.Frame2Text.DisplayMsg = String(Laurus.Frame2Text.Parameters.DisplayMsg) === 'true';
			    Laurus.Frame2Text.DisplayWarning = String(Laurus.Frame2Text.Parameters.DisplayWarning) === 'true';
			    Laurus.Frame2Text.EnglishTag = String(Laurus.Frame2Text.Parameters.EnglishTag) === 'true';
			    let PATH_SEP = '/';
			    let BASE_PATH = '.';
			    if (typeof commonjsRequire !== 'undefined') {
			      const path = require$$0$1;
			      PATH_SEP = path.sep;
			      const mainFile = process.mainModule && process.mainModule.filename;
			      BASE_PATH = mainFile ? path.dirname(mainFile) : process.cwd();
			    }
			    Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`;
			    Laurus.Frame2Text.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Frame2Text.MapID).slice(
		      -3
		    )}.json`;
			    Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			  }

			  //= ============================================================================
			  // Game_Interpreter
			  //= ============================================================================

			  // for MZ plugin command
			  if (typeof PluginManager !== 'undefined' && PluginManager.registerCommand) {
			    PluginManager.registerCommand('Frame2Text', 'EXPORT_EVENT_TO_MESSAGE', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const map_id = args.MapID;
			      const event_id = args.EventID;
			      const page_id = args.PageID;
			      this.pluginCommand('EXPORT_EVENT_TO_MESSAGE', [file_folder, file_name, map_id, event_id, page_id]);
			    });
			    PluginManager.registerCommand('Frame2Text', 'EXPORT_CE_TO_MESSAGE', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const common_event_id = args.CommonEventID;
			      this.pluginCommand('EXPORT_CE_TO_MESSAGE', [file_folder, file_name, common_event_id]);
			    });
			    PluginManager.registerCommand('Frame2Text', 'MERGE_EVENT_TO_MESSAGE', function (args) {
			      this.pluginCommand('MERGE_EVENT_TO_MESSAGE', [args.FileFolder, args.FileName, args.MapID, args.EventID, args.PageID, args.BaseFolder, args.BaseFileName]);
			    });
			    PluginManager.registerCommand('Frame2Text', 'MERGE_CE_TO_MESSAGE', function (args) {
			      this.pluginCommand('MERGE_CE_TO_MESSAGE', [args.FileFolder, args.FileName, args.CommonEventID, args.BaseFolder, args.BaseFileName]);
			    });
			    PluginManager.registerCommand('Frame2Text', 'BATCH_EXPORT_MESSAGES_TO_FOLDER', function (args) {
			      const data_dir = args.DataDir || 'data';
			      const locale = args.Locale || 'ja';
			      const text_base = args.TextBase || 'text';
			      const english_tag = String(args.EnglishTag) !== 'false';
			      this.pluginCommand('BATCH_EXPORT_MESSAGES_TO_FOLDER', [data_dir, locale, text_base, english_tag]);
			    });
			  }

			  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
			  Game_Interpreter.prototype.pluginCommand = function (command, args) {
			    _Game_Interpreter_pluginCommand.apply(this, arguments);
			    this.pluginCommandFrame2Text(command, args);
			  };

			  Game_Interpreter.prototype.pluginCommandFrame2Text = function (command, args) {
			    const addMessage = function (text) {
			      if (Laurus.Frame2Text.DisplayMsg) {
			        $gameMessage.add(text);
			      }
			    };

			    let PATH_SEP = '/';
			    let BASE_PATH = '.';
			    if (typeof commonjsRequire !== 'undefined') {
			      const path = require$$0$1;
			      PATH_SEP = path.sep;
			      // process.mainModule は環境によって undefined のことがある(VSCode 拡張ホスト等)。
			      const mainFile = process.mainModule && process.mainModule.filename;
			      BASE_PATH = mainFile ? path.dirname(mainFile) : process.cwd();
			    }

			    Laurus.Frame2Text.ExecMode = command.toUpperCase();
			    // 入力ファイル(MAPXXX.json)、出力ファイル(message.txt)の情報
			    switch (Laurus.Frame2Text.ExecMode) {
			      // for custom plugin command
			      case 'EXPORT_EVENT_TO_MESSAGE':
			      case 'イベントをメッセージにエクスポ－ト':
			        if (args[0]) Laurus.Frame2Text.FileFolder = args[0];
			        if (args[1]) Laurus.Frame2Text.FileName = args[1];
			        if (args[2]) Laurus.Frame2Text.MapID = args[2];
			        if (args[3]) Laurus.Frame2Text.EventID = args[3];
			        if (args[4]) Laurus.Frame2Text.PageID = args[4];
			        if (args[0] || args[1]) {
			          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`;
			          Laurus.Frame2Text.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${(
		            '000' + Laurus.Frame2Text.MapID
		          ).slice(-3)}.json`;
			        }
			        addMessage(
			          '======> MapID: ' +
			            Laurus.Frame2Text.MapID +
			            ' -> EventID: ' +
			            Laurus.Frame2Text.EventID +
			            ' -> PageID: ' +
			            Laurus.Frame2Text.PageID
			        );
			        break
			      case 'EXPORT_CE_TO_MESSAGE':
			      case 'コモンイベントをメッセージにエクスポート':
			        if (args.length === 3) {
			          Laurus.Frame2Text.ExecMode = 'EXPORT_CE_TO_MESSAGE';
			          Laurus.Frame2Text.FileFolder = args[0];
			          Laurus.Frame2Text.FileName = args[1];
			          Laurus.Frame2Text.CommonEventID = args[2];
			          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`;
			          Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			        }
			        addMessage('=====> Common EventID: ' + Laurus.Frame2Text.CommonEventID);
			        break
			      case 'MERGE_EVENT_TO_MESSAGE':
			        if (args[0]) Laurus.Frame2Text.FileFolder = args[0];
			        if (args[1]) Laurus.Frame2Text.FileName = args[1];
			        if (args[2]) Laurus.Frame2Text.MapID = args[2];
			        if (args[3]) Laurus.Frame2Text.EventID = args[3];
			        if (args[4]) Laurus.Frame2Text.PageID = args[4];
			        if (args[0] || args[1]) {
			          Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`;
			          Laurus.Frame2Text.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Frame2Text.MapID).slice(-3)}.json`;
			          Laurus.Frame2Text.BasePath = (args[5] && args[6]) ? `${BASE_PATH}${PATH_SEP}${args[5]}${PATH_SEP}${args[6]}` : undefined;
			        }
			        addMessage('======> (merge) MapID: ' + Laurus.Frame2Text.MapID + ' -> EventID: ' + Laurus.Frame2Text.EventID + ' -> PageID: ' + Laurus.Frame2Text.PageID);
			        break
			      case 'MERGE_CE_TO_MESSAGE':
			        Laurus.Frame2Text.FileFolder = args[0];
			        Laurus.Frame2Text.FileName = args[1];
			        Laurus.Frame2Text.CommonEventID = args[2];
			        Laurus.Frame2Text.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Frame2Text.FileFolder}${PATH_SEP}${Laurus.Frame2Text.FileName}`;
			        Laurus.Frame2Text.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			        Laurus.Frame2Text.BasePath = (args[3] && args[4]) ? `${BASE_PATH}${PATH_SEP}${args[3]}${PATH_SEP}${args[4]}` : undefined;
			        addMessage('=====> (merge) Common EventID: ' + Laurus.Frame2Text.CommonEventID);
			        break

			      case 'BATCH_EXPORT_MESSAGES_TO_FOLDER':
			        Laurus.Frame2Text.DataDir = args[0] || 'data';
			        Laurus.Frame2Text.Locale = args[1] || 'ja';
			        Laurus.Frame2Text.TextBase = args[2] || 'text';
			        Laurus.Frame2Text.EnglishTag = args[3] !== undefined ? (String(args[3]) !== 'false') : Laurus.Frame2Text.EnglishTag;
			        Laurus.Frame2Text.ExecMode = 'BATCH_EXPORT_MESSAGES_TO_FOLDER';
			        break
			      case 'COMMAND_LINE':
			        Laurus.Frame2Text = Object.assign(Laurus.Frame2Text, args[0]);
			        break
			      case 'LIBRARY_EXPORT':
			        break
			      default:
			        return
			    }

			    const logger = {};
			    logger.log = function () {
			      if (Laurus.Frame2Text.IsDebug) {
			        console.debug.apply(console, arguments);
			      }
			    };

			    logger.error = function () {
			      console.error(Array.prototype.join.call(arguments));
			    };

			    const readText = function (filepath) {
			      try {
			        const fs = require('fs');
			        return fs.readFileSync(filepath, { encoding: 'utf8' })
			      } catch (e) {
			        throw new Error('File not found. / ファイルが見つかりません。\n' + filepath)
			      }
			    };

			    const readJsonData = function (filepath) {
			      try {
			        const jsondata = JSON.parse(readText(filepath));
			        if (typeof jsondata === 'object') {
			          return jsondata
			        } else {
			          throw new Error(
			            'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
			          )
			        }
			      } catch (e) {
			        throw new Error(
			          'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
			        )
			      }
			    };

			    const writeData = function (filepath, textData) {
			      try {
			        const fs = require('fs');
			        fs.writeFileSync(filepath, textData, { encoding: 'utf8' });
			      } catch (e) {
			        throw new Error(
			          'Save failed. / 保存に失敗しました。\n' + 'ファイルが開いていないか確認してください。\n' + filepath
			        )
			      }
			    };

			    let map_events;
			    // プラグインコマンド(MZ)用の変数
			    let mzCount;
			    switch (Laurus.Frame2Text.ExecMode) {
			      // 入力ファイル(MAPXXX.json)の内容を読み込む
			      case 'EXPORT_EVENT_TO_MESSAGE':
			      case 'イベントをメッセージにエクスポ－ト': {
			        const map_data = readJsonData(Laurus.Frame2Text.MapPath);
			        if (!map_data.events[Laurus.Frame2Text.EventID]) {
			          throw new Error(
			            'EventID not found. / EventIDが見つかりません。\n' + 'Event ID: ' + Laurus.Frame2Text.EventID
			          )
			        }
			        const pageID = Number(Laurus.Frame2Text.PageID) - 1;
			        if (!map_data.events[Laurus.Frame2Text.EventID].pages[pageID]) {
			          throw new Error('PageID not found. / PageIDが見つかりません。\n' + 'Page ID: ' + Laurus.Frame2Text.PageID)
			        }
			        map_events = map_data.events[Laurus.Frame2Text.EventID].pages[pageID].list;
			        break
			      }
			      // 入力ファイル(CommonEvents.json)の内容を読み込む
			      case 'EXPORT_CE_TO_MESSAGE':
			      case 'コモンイベントをメッセージにエクスポート': {
			        const ce_data = readJsonData(Laurus.Frame2Text.CommonEventPath);
			        if (ce_data.length - 1 < Laurus.Frame2Text.CommonEventID) {
			          throw new Error(
			            'Common Event not found. / コモンイベントが見つかりません。: ' + Laurus.Frame2Text.CommonEventID
			          )
			        }

			        const ce_events = ce_data[Laurus.Frame2Text.CommonEventID].list;
			        map_events = ce_events;
			        break
			      }
			    }

			    //* ********************************* */
			    // 出力ファイル(message.txt)の内容を作成
			    //* ********************************* */
			    // 改行コード
			    const newLine = '\n';
			    // カンマ
			    const comma = ', ';
			    // インデント(半角空白)
			    // const space = ' '
			    // const baseIndent = 4
			    const EnglishTag = Laurus.Frame2Text.EnglishTag;
			    // 関数
			    const getOnOffRadioButtonValue = (checkBoxValue) => {
			      if (checkBoxValue === 0) return EnglishTag ? 'ON' : 'オン'
			      else if (checkBoxValue === 1) return EnglishTag ? 'OFF' : 'オフ'
			      else return EnglishTag ? 'ON' : 'オン'
			    };
			    const getIncreaseOrDecrease = (operationValue) => {
			      if (operationValue === 0) return EnglishTag ? 'Increase' : '増やす'
			      else if (operationValue === 1) return EnglishTag ? 'Decrease' : '減らす'
			      else return EnglishTag ? 'Increase' : '増やす'
			    };
			    const getConstantOrVariable = (operandType, operandValue) => {
			      const variablesText = EnglishTag ? 'Variables[' + operandValue + ']' : '変数[' + operandValue + ']';
			      if (operandType === 0) return Number(operandValue)
			      else if (operandType === 1) return variablesText
			      else return Number(operandValue)
			    };
			    const getEnemyOrActor = (subjectType, subjectValue) => {
			      const actorsText = EnglishTag ? 'Actors[' + subjectValue + ']' : 'アクター[' + subjectValue + ']';
			      if (subjectType === 0) return Number(subjectValue) + 1
			      else if (subjectType === 1) return actorsText
			      else return Number(subjectValue)
			    };
			    const getFixedOrVariable = (operandType, operandValue) => {
			      const variablesText = EnglishTag ? 'Variables[' + operandValue + ']' : '変数[' + operandValue + ']';
			      if (operandType === 0) return Number(operandValue)
			      else if (operandType === 1) return variablesText
			      else if (operandType === 2) return EnglishTag ? 'Random' : 'ランダム'
			      else return Number(operandValue)
			    };
			    const getCheckBoxOnOffValue = (checkBoxValue) => {
			      if (checkBoxValue === 0) return EnglishTag ? 'OFF' : 'オフ'
			      else if (checkBoxValue === 1) return EnglishTag ? 'ON' : 'オン'
			      else if (checkBoxValue === false) return EnglishTag ? 'OFF' : 'オフ'
			      else if (checkBoxValue === true) return EnglishTag ? 'ON' : 'オン'
			      else return EnglishTag ? 'OFF' : 'オフ'
			    };
			    const getCheckBoxMessage = (checkBoxValue, message1, message2) => {
			      return checkBoxValue ? (EnglishTag ? message1 : message2) : (EnglishTag ? 'OFF' : 'オフ')
			    };
			    const getCheckBoxIncludeEquipmentValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Include Equipment', '装備品を含む')
			    };
			    const getCheckBoxInitializeValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Initialize', '初期化')
			    };
			    const getCheckBoxAllowKnockoutValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Allow Knockout', '戦闘不能を許可')
			    };
			    const getCheckBoxShowLevelUpValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Show Level Up', 'レベルアップを表示')
			    };
			    const getCheckBoxSaveEXPValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Save EXP', '経験値の保存')
			    };
			    const getCheckBoxWaitforCompletionValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Wait for Completion', '完了までウェイト')
			    };
			    const getCheckBoxRepeatMovementsValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Repeat Movements', '動作を繰り返す')
			    };
			    const getCheckBoxSkipValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Skip If Cannot Move', '移動できない場合は飛ばす')
			    };
			    const getCheckBoxPurchaseOnlyValue = (checkBoxValue) => {
			      return getCheckBoxMessage(checkBoxValue, 'Purchase Only', '購入のみ')
			    };
			    const getAddOrRemove = (operationType) => {
			      if (operationType === 0) return EnglishTag ? 'Add' : '加える'
			      else if (operationType === 1) return EnglishTag ? 'Remove' : '外す'
			      else return EnglishTag ? 'Add' : '加える'
			    };
			    const getDisableEnable = (radioButton) => {
			      if (radioButton === 0) return EnglishTag ? 'Disable' : '禁止'
			      else if (radioButton === 1) return EnglishTag ? 'Enable' : '許可'
			      else return EnglishTag ? 'Disable' : '禁止'
			    };
			    const getActorParameterValue = (actorParameter) => {
			      if (actorParameter === 0) return EnglishTag ? 'MaxHP' : '最大HP'
			      else if (actorParameter === 1) return EnglishTag ? 'MaxMP' : '最大MP'
			      else if (actorParameter === 2) return EnglishTag ? 'Attack' : '攻撃力'
			      else if (actorParameter === 3) return EnglishTag ? 'Defense' : '防御力'
			      else if (actorParameter === 4) return EnglishTag ? 'M.Attack' : '魔法力'
			      else if (actorParameter === 5) return EnglishTag ? 'M.Defense' : '魔法防御'
			      else if (actorParameter === 6) return EnglishTag ? 'Agility' : '敏捷性'
			      else if (actorParameter === 7) return EnglishTag ? 'Luck' : '運'
			      else return EnglishTag ? 'MaxHP' : '最大HP'
			    };
			    const getLearnOrForgot = (operationType) => {
			      if (operationType === 0) return EnglishTag ? 'Learn' : '覚える'
			      else if (operationType === 1) return EnglishTag ? 'Forget' : '忘れる'
			      else return EnglishTag ? 'Learn' : '覚える'
			    };
			    const getDirectOrVariablesValue = (location) => {
			      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
			      else if (location === 1) return EnglishTag ? 'WithVariables' : '変数で指定'
			      else if (location === 2) return EnglishTag ? 'Exchange' : '交換'
			      else return EnglishTag ? 'Direct' : '直接指定'
			    };
			    const getDirectOrVariablesOrCharacterValue = (location) => {
			      if (location === 0) return EnglishTag ? 'Direct' : '直接指定'
			      else if (location === 1) return EnglishTag ? 'WithVariables' : '変数で指定'
			      else if (location === 2) return EnglishTag ? 'Character' : 'キャラクター'
			      else return EnglishTag ? 'Direct' : '直接指定'
			    };
			    const getItemOrWeaponOrArmorValue = (location) => {
			      if (location === 0) return EnglishTag ? 'Item' : 'アイテム'
			      else if (location === 1) return EnglishTag ? 'Weapon' : '武器'
			      else if (location === 2) return EnglishTag ? 'Armor' : '防具'
			      else return EnglishTag ? 'Item' : 'アイテム'
			    };
			    const getStandardOrSpecifyValue = (price, priceValue) => {
			      if (price === 0) return EnglishTag ? 'Standard' : '標準'
			      else if (price === 1) return priceValue
			      else return EnglishTag ? 'Standard' : '標準'
			    };
			    const getDirectionValue = (direction) => {
			      if (direction === 0) return EnglishTag ? 'Retain' : 'そのまま'
			      else if (direction === 2) return EnglishTag ? 'Down' : '下'
			      else if (direction === 4) return EnglishTag ? 'Left' : '左'
			      else if (direction === 6) return EnglishTag ? 'Right' : '右'
			      else if (direction === 8) return EnglishTag ? 'Up' : '上'
			      else return EnglishTag ? 'Retain' : 'そのまま'
			    };
			    const getFadeValue = (fade) => {
			      if (fade === 0) return EnglishTag ? 'Black' : '黒'
			      else if (fade === 1) return EnglishTag ? 'White' : '白'
			      else if (fade === 2) return EnglishTag ? 'None' : 'なし'
			      else return EnglishTag ? 'Black' : '黒'
			    };
			    const getVehicleValue = (vehicle) => {
			      if (vehicle === 0) return EnglishTag ? 'Boat' : '小型船'
			      else if (vehicle === 1) return EnglishTag ? 'Ship' : '大型船'
			      else if (vehicle === 2) return EnglishTag ? 'Airship' : '飛行船'
			      else return EnglishTag ? 'Boat' : '小型船'
			    };
			    const getEventValue = (event) => {
			      if (event === -1) return EnglishTag ? 'Player' : 'プレイヤー'
			      if (event === 0) return EnglishTag ? 'This Event' : 'このイベント'
			      else return event
			    };
			    const getEventValue2 = (event) => {
			      if (event === -1) return EnglishTag ? 'Player' : 'プレイヤー'
			      if (event === 0) return EnglishTag ? 'ThisEvent' : 'このイベント'
			      else return event
			    };
			    const getSpeedValue = (speed) => {
			      if (speed === 1) return EnglishTag ? 'x8 slower' : '1/8倍速'
			      else if (speed === 2) return EnglishTag ? 'x4 slower' : '1/4倍速'
			      else if (speed === 3) return EnglishTag ? 'x2 slower' : '1/2倍速'
			      else if (speed === 4) return EnglishTag ? 'Normal' : '標準速'
			      else if (speed === 5) return EnglishTag ? 'x2 faster' : '2倍速'
			      else if (speed === 6) return EnglishTag ? 'x4 faster' : '4倍速'
			      else return EnglishTag ? 'x8 slower' : '1/8倍速'
			    };
			    const getFrequencyValue = (frequency) => {
			      if (frequency === 1) return EnglishTag ? 'Lowest' : '最低'
			      else if (frequency === 2) return EnglishTag ? 'Lower' : '低'
			      else if (frequency === 3) return EnglishTag ? 'Normal' : '標準'
			      else if (frequency === 4) return EnglishTag ? 'Higher' : '高'
			      else if (frequency === 5) return EnglishTag ? 'Highest' : '最高'
			      else return EnglishTag ? 'Lowest' : '最低'
			    };
			    const getBalloonIconValue = (balloonIcon) => {
			      if (balloonIcon === 1) return EnglishTag ? 'Exclamation' : 'びっくり'
			      else if (balloonIcon === 2) return EnglishTag ? 'Question' : 'はてな'
			      else if (balloonIcon === 3) return EnglishTag ? 'Music note' : '音符'
			      else if (balloonIcon === 4) return EnglishTag ? 'Heart' : 'ハート'
			      else if (balloonIcon === 5) return EnglishTag ? 'Anger' : '怒り'
			      else if (balloonIcon === 6) return EnglishTag ? 'Sweat' : '汗'
			      else if (balloonIcon === 7) return EnglishTag ? 'Flustration' : 'くしゃくしゃ'
			      else if (balloonIcon === 8) return EnglishTag ? 'Silence' : '沈黙'
			      else if (balloonIcon === 9) return EnglishTag ? 'Light bulb' : '電球'
			      else if (balloonIcon === 10) return EnglishTag ? 'zzz' : 'zzz'
			      else if (balloonIcon === 11) return EnglishTag ? 'User-defined1' : 'ユーザー定義1'
			      else if (balloonIcon === 12) return EnglishTag ? 'User-defined2' : 'ユーザー定義2'
			      else if (balloonIcon === 13) return EnglishTag ? 'User-defined3' : 'ユーザー定義3'
			      else if (balloonIcon === 14) return EnglishTag ? 'User-defined4' : 'ユーザー定義4'
			      else if (balloonIcon === 15) return EnglishTag ? 'User-defined5' : 'ユーザー定義5'
			      else return EnglishTag ? 'Exclamation' : 'びっくり'
			    };
			    const getPositionValue = (position, direct, x, y) => {
			      const originUpperLeft = EnglishTag ? 'Upper Left' : '左上';
			      const originCenter = EnglishTag ? 'Center' : '中央';
			      const originString = position === 0 ? originUpperLeft : originCenter;
			      const variablesString = EnglishTag ? 'Variables' : '変数';
			      const positionString = EnglishTag ? 'Position' : '位置';
			      if (direct === 0) return `${positionString}[${originString}][${x}][${y}]`
			      else if (direct === 1) return `${positionString}[${originString}][${variablesString}[${x}]][${variablesString}[${y}]]`
			    };
			    const getScaleValue = (width, Height) => {
			      const scaleStr = EnglishTag ? 'Scale' : '拡大率';
			      return `${scaleStr}[${width}][${Height}]`
			    };
			    const getBlendModeValue = (blendMode) => {
			      if (blendMode === 0) return EnglishTag ? 'Normal' : '通常'
			      else if (blendMode === 1) return EnglishTag ? 'Additive' : '加算'
			      else if (blendMode === 2) return EnglishTag ? 'Multiply' : '乗算'
			      else if (blendMode === 3) return EnglishTag ? 'Screen' : 'スクリーン'
			      else return EnglishTag ? 'Normal' : '通常'
			    };
			    const getBlendValue = (opcity, blendMode) => {
			      const blendStr = EnglishTag ? 'Blend' : '合成';
			      const blendModeValue = getBlendModeValue(blendMode);
			      return `${blendStr}[${opcity}][${blendModeValue}]`
			    };
			    const getColorToneValue = (red, green, blue, gray) => {
			      const colorToneStr = EnglishTag ? 'ColorTone' : '色調';
			      if (red === 0 && green === 0 && blue === 0 && gray === 0) return EnglishTag ? 'ColorTone[Normal]' : '色調[通常]'
			      else if (red === -68 && green === -68 && blue === -68 && gray === 0) { return EnglishTag ? 'ColorTone[Dark]' : '色調[ダーク]' } else if (red === 34 && green === -34 && blue === -68 && gray === 170) { return EnglishTag ? 'ColorTone[Sepia]' : '色調[セピア]' } else if (red === 68 && green === -34 && blue === -34 && gray === 0) { return EnglishTag ? 'ColorTone[Sunset]' : '色調[夕暮れ]' } else if (red === -68 && green === -68 && blue === 0 && gray === 68) { return EnglishTag ? 'ColorTone[Night]' : '色調[夜]' } else return `${colorToneStr}[${red}][${green}][${blue}][${gray}]`
			    };
			    const getDurationValue = (duration, waitForCompletion) => {
			      const waitStr = EnglishTag ? 'Wait for Completion' : '完了までウェイト';
			      const durationStr = EnglishTag ? 'Duration' : '時間';
			      const wait = waitForCompletion ? waitStr : '';
			      if (duration === 60 && waitForCompletion === true) return `${durationStr}[${duration}][${wait}]`
			      else return `${durationStr}[${duration}][${wait}]`
			    };
			    const getEasingValue = (easing) => {
			      const easingStr = EnglishTag ? 'Easing' : 'イージング';
			      if (easing === 0) return EnglishTag ? `${easingStr}[Constant speed]` : `${easingStr}[一定速度]`
			      else if (easing === 1) return EnglishTag ? `${easingStr}[Slow start]` : `${easingStr}[ゆっくり始まる]`
			      else if (easing === 2) return EnglishTag ? `${easingStr}[Slow end]` : `${easingStr}[ゆっくり終わる]`
			      else if (easing === 3) return EnglishTag ? `${easingStr}[Slow start and end]` : `${easingStr}[ゆっくり始まってゆっくり終わる]`
			      else return EnglishTag ? `${easingStr}[Constant speed]` : `${easingStr}[一定速度]`
			    };
			    const getBackgroundValue = (background) => {
			      if (background === 0) return EnglishTag ? 'Window' : 'ウインドウ'
			      else if (background === 1) return EnglishTag ? 'Dim' : '暗くする'
			      else if (background === 2) return EnglishTag ? 'Transparent' : '透明'
			      else return EnglishTag ? 'Window' : 'ウインドウ'
			    };
			    const getWindowPositionValue = (windowPosition) => {
			      if (windowPosition === 0) return EnglishTag ? 'Top' : '上'
			      else if (windowPosition === 1) return EnglishTag ? 'Middle' : '中'
			      else if (windowPosition === 2) return EnglishTag ? 'Bottom' : '下'
			      else return EnglishTag ? 'Top' : '上'
			    };
			    const getChoiceWindowPositionValue = (windowPosition) => {
			      if (windowPosition === 0) return EnglishTag ? 'Left' : '左'
			      else if (windowPosition === 1) return EnglishTag ? 'Middle' : '中'
			      else if (windowPosition === 2) return EnglishTag ? 'Right' : '右'
			      else return EnglishTag ? 'Right' : '右'
			    };
			    const getDefaultChoiceValue = (defaultChoice) => {
			      if (defaultChoice === -1) return EnglishTag ? 'None' : 'なし'
			      else return defaultChoice + 1
			    };
			    const getCancelChoiceValue = (cancelChoice) => {
			      if (cancelChoice === -2) return EnglishTag ? 'Branch' : '分岐'
			      else if (cancelChoice === -1) return EnglishTag ? 'Disallow' : '禁止'
			      else return cancelChoice + 1
			    };
			    const getLocationInfoTypeValue = (infoType) => {
			      if (infoType === 0) return EnglishTag ? 'Terrain tag' : '地形タグ'
			      else if (infoType === 1) return EnglishTag ? 'Event Id' : 'イベントid'
			      else if (infoType === 2) return EnglishTag ? 'Layer 1' : 'レイヤー１'
			      else if (infoType === 3) return EnglishTag ? 'Layer 2' : 'レイヤー２'
			      else if (infoType === 4) return EnglishTag ? 'Layer 3' : 'レイヤー３'
			      else if (infoType === 5) return EnglishTag ? 'Layer 4' : 'レイヤー４'
			      else if (infoType === 6) return EnglishTag ? 'Region Id' : 'リージョンid'
			      else return EnglishTag ? 'Terrain tag' : '地形タグ'
			    };
			    const getActionTarget = (target) => {
			      if (target === -2) return EnglishTag ? 'Last Target' : 'ラストターゲット'
			      else if (target === -1) return EnglishTag ? 'Random' : 'ランダム'
			      else if (target === 0) return EnglishTag ? 'Index 1' : 'インデックス１'
			      else if (target === 1) return EnglishTag ? 'Index 2' : 'インデックス２'
			      else if (target === 2) return EnglishTag ? 'Index 3' : 'インデックス３'
			      else if (target === 3) return EnglishTag ? 'Index 4' : 'インデックス４'
			      else if (target === 4) return EnglishTag ? 'Index 5' : 'インデックス５'
			      else if (target === 5) return EnglishTag ? 'Index 6' : 'インデックス６'
			      else if (target === 6) return EnglishTag ? 'Index 7' : 'インデックス７'
			      else if (target === 7) return EnglishTag ? 'Index 8' : 'インデックス８'
			      else return EnglishTag ? 'Last Target' : 'ラストターゲット'
			    };
			    const getTimerValue = (timer) => {
			      if (timer === 0) return EnglishTag ? 'Start' : '始動'
			      else if (timer === 1) return EnglishTag ? 'Stop' : '停止'
			      else return EnglishTag ? 'Start' : '始動'
			    };
			    const getIndent = (indentValue) => {
			      const depth = typeof indentValue === 'number' && indentValue > 0 ? indentValue : 0;
			      return '    '.repeat(depth)
			    };
			    const getWeatherTypeValue = (weather) => {
			      if (weather === 'none') return EnglishTag ? 'None' : 'なし'
			      else if (weather === 'rain') return EnglishTag ? 'Rain' : '雨'
			      else if (weather === 'storm') return EnglishTag ? 'Storm' : '嵐'
			      else if (weather === 'snow') return EnglishTag ? 'Snow' : '雪'
			      else return EnglishTag ? 'None' : 'なし'
			    };
			    const getControlVariablesTag = (operation) => {
			      if (operation === 0) return EnglishTag ? '<Set: ' : '<代入: '
			      else if (operation === 1) return EnglishTag ? '<Add: ' : '<加算: '
			      else if (operation === 2) return EnglishTag ? '<Sub: ' : '<減算: '
			      else if (operation === 3) return EnglishTag ? '<Mul: ' : '<乗算: '
			      else if (operation === 4) return EnglishTag ? '<Div: ' : '<除算: '
			      else if (operation === 5) return EnglishTag ? '<Mod: ' : '<剰余: '
			      else return EnglishTag ? '<Set: ' : '<代入: '
			    };
			    const getGameData = (gameData) => {
			      if (gameData === 0) return EnglishTag ? 'Item' : 'アイテム'
			      else if (gameData === 1) return EnglishTag ? 'Weapon' : '武器'
			      else if (gameData === 2) return EnglishTag ? 'Armor' : '防具'
			      else if (gameData === 3) return EnglishTag ? 'Actor' : 'アクター'
			      else if (gameData === 4) return EnglishTag ? 'Enemy' : '敵キャラ'
			      else if (gameData === 5) return EnglishTag ? 'Character' : 'キャラクター'
			      else if (gameData === 6) return EnglishTag ? 'Party' : 'パーティ'
			      else if (gameData === 7) return EnglishTag ? 'その他' : 'その他'
			      else if (gameData === 8) return EnglishTag ? 'Last' : '直前'
			      else return EnglishTag ? 'Item' : 'アイテム'
			    };
			    const getGameDataActorParameter = (actorParameter) => {
			      if (actorParameter === 0) return EnglishTag ? 'Level' : 'レベル'
			      else if (actorParameter === 1) return EnglishTag ? 'Exp' : '経験値'
			      else if (actorParameter === 2) return EnglishTag ? 'HP' : 'HP'
			      else if (actorParameter === 3) return EnglishTag ? 'MP' : 'MP'
			      else if (actorParameter === 4) return EnglishTag ? 'MaxHp' : '最大HP'
			      else if (actorParameter === 5) return EnglishTag ? 'MaxMP' : '最大MP'
			      else if (actorParameter === 6) return EnglishTag ? 'Attack' : '攻撃力'
			      else if (actorParameter === 7) return EnglishTag ? 'Defense' : '防御力'
			      else if (actorParameter === 8) return EnglishTag ? 'M.Attack' : '魔法攻撃力'
			      else if (actorParameter === 9) return EnglishTag ? 'M.Defense' : '魔法防御力'
			      else if (actorParameter === 10) return EnglishTag ? 'Agility' : '敏捷性'
			      else if (actorParameter === 11) return EnglishTag ? 'Luck' : '運'
			      else return EnglishTag ? 'Level' : 'レベル'
			    };
			    const getGameDataEnemyParameter = (actorParameter) => {
			      if (actorParameter === 0) return EnglishTag ? 'HP' : 'HP'
			      else if (actorParameter === 1) return EnglishTag ? 'MP' : 'MP'
			      else if (actorParameter === 2) return EnglishTag ? 'MaxHp' : '最大HP'
			      else if (actorParameter === 3) return EnglishTag ? 'MaxMP' : '最大MP'
			      else if (actorParameter === 4) return EnglishTag ? 'Attack' : '攻撃力'
			      else if (actorParameter === 5) return EnglishTag ? 'Defense' : '防御力'
			      else if (actorParameter === 6) return EnglishTag ? 'M.Attack' : '魔法攻撃力'
			      else if (actorParameter === 7) return EnglishTag ? 'M.Defense' : '魔法防御力'
			      else if (actorParameter === 8) return EnglishTag ? 'Agility' : '敏捷性'
			      else if (actorParameter === 9) return EnglishTag ? 'Luck' : '運'
			      else return EnglishTag ? 'HP' : 'HP'
			    };
			    const getGameDataReference = (reference) => {
			      if (reference === 0) return EnglishTag ? 'MapX' : 'マップX'
			      else if (reference === 1) return EnglishTag ? 'MapY' : 'マップY'
			      else if (reference === 2) return EnglishTag ? 'Direction' : '方向'
			      else if (reference === 3) return EnglishTag ? 'ScreenX' : '画面X'
			      else if (reference === 4) return EnglishTag ? 'ScreenY' : '画面Y'
			      else return EnglishTag ? 'MapX' : 'マップX'
			    };
			    const getGameDataLast = (last) => {
			      if (last === 0) return EnglishTag ? 'Last Used Skill ID' : '直前に使用したスキルのID'
			      else if (last === 1) return EnglishTag ? 'Last Used Item ID' : '直前に使用したアイテムのID'
			      else if (last === 2) return EnglishTag ? 'Last Actor ID to Act' : '直前に行動したアクターのID'
			      else if (last === 3) return EnglishTag ? 'Last Enemy Index to Act' : '直前に行動した敵キャラのインデックス'
			      else if (last === 4) return EnglishTag ? 'Last Target Actor ID' : '直前に対象となったアクターのID'
			      else if (last === 5) return EnglishTag ? 'Last Target Enemy Index' : '直前に対象となった敵キャラのインデックス'
			      else return EnglishTag ? 'Last Used Skill ID' : '直前に使用したスキルのID'
			    };
			    const getGameDataOther = (other) => {
			      if (other === 0) return EnglishTag ? 'MapId' : 'マップid'
			      else if (other === 1) return EnglishTag ? 'PartyMembers' : 'パーティ人数'
			      else if (other === 2) return EnglishTag ? 'gold' : '所持金'
			      else if (other === 3) return EnglishTag ? 'steps' : '歩数'
			      else if (other === 4) return EnglishTag ? 'PlayTime' : 'プレイ時間'
			      else if (other === 5) return EnglishTag ? 'timer' : 'タイマー'
			      else if (other === 6) return EnglishTag ? 'SaveCount' : 'セーブ回数'
			      else if (other === 7) return EnglishTag ? 'BattleCount' : '戦闘回数'
			      else if (other === 8) return EnglishTag ? 'WinCount' : '勝利回数'
			      else if (other === 9) return EnglishTag ? 'EscapeCount' : '逃走回数'
			      else return EnglishTag ? 'PartyMembers' : 'パーティ人数'
			    };
			    const getEnemyTarget = (enemy) => {
			      if (enemy === -1) return EnglishTag ? 'Entire Troop' : '敵グループ全体'
			      else return Number(enemy) + 1
			    };
			    const getEnemyTarget2 = (enemy, targetAll) => {
			      if (enemy === -1 || targetAll) return EnglishTag ? 'Entire Troop' : '敵グループ全体'
			      else return Number(enemy) + 1
			    };
			    const getNone = (name) => {
			      if (name === '') return EnglishTag ? 'None' : 'なし'
			      else return name
			    };

			    // MZのプラグインパラメータをパースする補助関数
			    const parseMzArg = function (args_string) {
			      const args = [];
			      let buffer = '';
			      let braceLevel = 0;

			      for (const char of args_string) {
			        if (char === ',' && braceLevel === 0) {
			          args.push(buffer.trim());
			          buffer = '';
			        } else {
			          buffer += char;
			          if (char === '[' || char === '{') {
			            braceLevel++;
			          } else if (char === ']' || char === '}') {
			            braceLevel--;
			          }
			        }
			      }

			      if (buffer) {
			        args.push(buffer.trim());
			      }

			      return args
			    };

			    // 出力するテキスト変数
			    // Laurus.Frame2Text.EnglishTagの値を別変数に代入
			    // 整形(pretty)時にインデントを付与しないコード。
			    // 複数行の本文を持つもの(メッセージ本文/スクロール文/注釈/スクリプト)は
			    // 行頭の空白がそのまま本文として取り込まれ往復変換が壊れるため列0のままにする。
			    // 357/657(プラグインコマンドMZ)は657側で直前に出力した357タグを
			    // text.lastIndexOf('\n<') で探して引数注釈を差し込む。インデントを付けると
			    // '\n    <' となりこの探索が直前の別行を誤って掴み往復変換が壊れるため列0のままにする。
			    const RAW_CONTENT_CODES = [105, 108, 355, 357, 401, 405, 408, 655, 657];
			    // 翻訳抽出モード(translationOnly)で残す会話系イベントコード。
			    // 101/401: 文章の表示(顔・名前・位置・背景タグを含む), 102/402/403/404: 選択肢,
			    // 105/405: 文章のスクロール表示。これ以外(スイッチ・変数・移動等)は出力しない。
			    const CONVERSATION_CODES = [101, 401, 102, 402, 403, 404, 105, 405];
			    const decompile = function (map_events, EnglishTag, options) {
			      // イベントコード毎にループ
			      const pretty = !!(options && options.pretty);
			      const translationOnly = !!(options && options.translationOnly);
			      let text = '';
			      map_events.forEach(function (event) {
			        if (typeof event !== 'object') {
			          return
			        }
			        // 翻訳抽出モード: 会話系以外のイベントはスキップ(タグを削除)
			        if (translationOnly && CONVERSATION_CODES.indexOf(event.code) === -1) {
			          return
			        }
			        // インデント(整形時のみ。本文系コードは列0のまま)
			        const indent = pretty && RAW_CONTENT_CODES.indexOf(event.code) === -1 ? getIndent(event.indent) : '';
			        // 改行とインデントを追加する関数
			        const addNewLineIndent = (indent) => {
			          // 最初のタグだけ改行を入れない
			          text += text === '' ? indent : newLine + indent;
			        };
			        // メッセージウィンドウの先頭に空行を入れて会話の区切りを見やすくする
			        const addMessageBlockStart = () => {
			          if (pretty && text !== '') {
			            text += newLine + newLine + indent;
			          } else {
			            addNewLineIndent(indent);
			          }
			        };
			        /** ********************************************** */
			        // メッセージ
			        /** ********************************************** */
			        if (event.code === 101) {
			          const face = event.parameters[0];
			          const faceId = event.parameters[1];
			          const background = getBackgroundValue(event.parameters[2]);
			          const windowPosition = getWindowPositionValue(event.parameters[3]);
			          const name = event.parameters[4];

			          const faceTag = EnglishTag ? `<Face: ${face}(${faceId})>` : `<顔: ${face}(${faceId})>`;
			          const backgroundTag = EnglishTag ? `<Background: ${background}>` : `<背景: ${background}>`;
			          const windowPositionTag = EnglishTag ? `<WindowPosition: ${windowPosition}>` : `<位置: ${windowPosition}>`;
			          const nameTagStr = EnglishTag ? `<Name: ${name}>` : `<名前: ${name}>`;
			          const nameTag = name === '' || name === undefined ? '' : nameTagStr;

			          addMessageBlockStart();
			          text += faceTag + backgroundTag + windowPositionTag + nameTag;
			        }
			        if (event.code === 401) {
			          const showText = event.parameters[0];
			          addNewLineIndent(indent);
			          // 空のメッセージ行は <br> マーカーにする。素の空行は「ウィンドウ区切り」と
			          // 解釈されるため(空行+平文=新ウィンドウ)、空401をそのまま空行で出すと
			          // 往復で失われたりウィンドウが分割される。<br> は compile が空401へ戻す。
			          text += (showText === '') ? '<br>' : showText;
			        }
			        if (event.code === 102) {
			          const background = getBackgroundValue(event.parameters[4]) + comma;
			          const windowPosition = getChoiceWindowPositionValue(event.parameters[3]) + comma;
			          const defaultChoice = getDefaultChoiceValue(event.parameters[2]) + comma;
			          const cancelChoice = getCancelChoiceValue(event.parameters[1]);
			          const tag = EnglishTag ? '<ShowChoices: ' : '<選択肢の表示: ';
			          addNewLineIndent(indent);
			          text += tag + background + windowPosition + defaultChoice + cancelChoice + '>';
			        }
			        if (event.code === 402) {
			          const choice = event.parameters[1];
			          const tag = EnglishTag ? '<When: ' : '<選択肢: ';
			          addNewLineIndent(indent);
			          text += tag + choice + '>';
			        }
			        if (event.code === 403) {
			          const tag = EnglishTag ? '<WhenCancel>' : '<キャンセルのとき>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 404) {
			          const tag = EnglishTag ? '<End>' : '<分岐終了>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        // Skip(109)/その終端マーカー(409)。本体は通常コマンドとして字下げ出力される。
			        if (event.code === 109) {
			          const tag = EnglishTag ? '<Skip>' : '<スキップ>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 409) {
			          const tag = EnglishTag ? '<SkipEnd>' : '<スキップ終了>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 103) {
			          const variableId = event.parameters[0];
			          const digits = event.parameters[1];
			          const tag = EnglishTag ? '<InputNumber: ' : '<数値入力の処理: ';
			          addNewLineIndent(indent);
			          text += tag + variableId + ', ' + digits + '>';
			        }
			        if (event.code === 104) {
			          const variableId = event.parameters[0];
			          const itemTypeValue = event.parameters[1];
			          let itemType;
			          if (itemTypeValue === 1) {
			            itemType = EnglishTag ? 'Regular Item' : '通常アイテム';
			          } else if (itemTypeValue === 2) {
			            itemType = EnglishTag ? 'Key Item' : '大事なもの';
			          } else if (itemTypeValue === 3) {
			            itemType = EnglishTag ? 'Hidden Item A' : '隠しアイテムA';
			          } else if (itemTypeValue === 4) {
			            itemType = EnglishTag ? 'Hidden Item B' : '隠しアイテムB';
			          } else {
			            itemType = EnglishTag ? 'Key Item' : '大事なもの';
			          }
			          const tag = EnglishTag ? '<SelectItem: ' : '<アイテム選択の処理: ';
			          addNewLineIndent(indent);
			          text += tag + variableId + ', ' + itemType + '>';
			        }
			        if (event.code === 105) {
			          const speed = event.parameters[0] + comma;
			          const noFastForward = getCheckBoxOnOffValue(event.parameters[1]);
			          const tag = EnglishTag ? '<ShowScrollingText: ' : '<文章のスクロール表示: ';
			          const tagEnd = EnglishTag ? '</ShowScrollingText>' : '</文章のスクロール表示>';
			          addMessageBlockStart();
			          text += tag + speed + noFastForward + '>' + newLine + tagEnd;
			        }
			        if (event.code === 405) {
			          const scrollingText = event.parameters[0];
			          const tagEnd = EnglishTag ? '</ShowScrollingText>' : '</文章のスクロール表示>';
			          if (text.endsWith(tagEnd)) {
			            const tagEndDeleteText = text.slice(0, -1 * (tagEnd.length + 1));
			            const tmpText = tagEndDeleteText + newLine + scrollingText + newLine + tagEnd;
			            text = tmpText;
			          }
			        }

			        /** ********************************************** */
			        // ゲーム進行
			        /** ********************************************** */
			        if (event.code === 121) {
			          const switchId1 = event.parameters[0];
			          const switchId2 = event.parameters[1];
			          const operation = getOnOffRadioButtonValue(event.parameters[2]);
			          const tag = EnglishTag ? '<Switch: ' : '<スイッチ: ';
			          addNewLineIndent(indent);
			          if (switchId1 === switchId2) {
			            text += tag + switchId1 + comma + operation + '>';
			          } else {
			            text += tag + switchId1 + '-' + switchId2 + comma + operation + '>';
			          }
			        }
			        if (event.code === 122) {
			          const param1 = event.parameters[0];
			          const param2 = event.parameters[1];
			          const param3 = event.parameters[2];
			          const param4 = event.parameters[3];
			          const param5 = event.parameters[4];
			          const param6 = event.parameters[5];
			          const param7 = event.parameters[6];
			          const variableId1 = param1;
			          const variableId2 = param2;
			          const tag = getControlVariablesTag(param3);
			          addNewLineIndent(indent);
			          // 変数・単独/範囲
			          if (event.parameters.length === 5 && param4 !== 4) {
			            const operandValue = getFixedOrVariable(param4, param5);
			            if (variableId1 === variableId2) {
			              text += tag + variableId1 + comma + operandValue + '>';
			            } else {
			              text += tag + variableId1 + '-' + variableId2 + comma + operandValue + '>';
			            }
			          }
			          // スクリプト
			          if (event.parameters.length === 5 && param4 === 4) {
			            const scriptStr = EnglishTag ? 'Script' : 'スクリプト';
			            const script = `${scriptStr}[${param5}]`;
			            if (variableId1 === variableId2) {
			              text += tag + variableId1 + comma + script + '>';
			            } else {
			              text += tag + variableId1 + '-' + variableId2 + comma + script + '>';
			            }
			          }
			          // 変数・乱数
			          if (event.parameters.length === 6) {
			            const randomStr = EnglishTag ? 'random' : '乱数';
			            const random1 = `[${param5}]`;
			            const random2 = `[${param6}]`;
			            if (variableId1 === variableId2) {
			              text += tag + variableId1 + comma + randomStr + random1 + random2 + '>';
			            } else {
			              text += tag + variableId1 + '-' + variableId2 + comma + randomStr + random1 + random2 + '>';
			            }
			          }
			          // ゲームデータ
			          if (event.parameters.length === 7) {
			            const gameDataStr = EnglishTag ? 'GameData' : 'ゲームデータ';
			            const gameDataParam1Str = getGameData(param5);
			            const gameDataParam1 = `[${gameDataParam1Str}]`;
			            // ゲームデータ・アイテム・武器・防具
			            if (param5 === 0 || param5 === 1 || param5 === 2) {
			              const gameDataParam2 = `[${param6}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・アクター
			            if (param5 === 3) {
			              const gameDataParam2 = `[${param6}]`;
			              const gameDataParam3Str = getGameDataActorParameter(param7);
			              const gameDataParam3 = `[${gameDataParam3Str}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・敵キャラ
			            if (param5 === 4) {
			              const gameDataParam2Value = Number(param6) + 1;
			              const gameDataParam2 = `[${gameDataParam2Value}]`;
			              const gameDataParam3Str = getGameDataEnemyParameter(param7);
			              const gameDataParam3 = `[${gameDataParam3Str}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・キャラクター
			            if (param5 === 5) {
			              const gameDataParam2Value = getEventValue2(param6);
			              const gameDataParam2 = `[${gameDataParam2Value}]`;
			              const gameDataParam3Str = getGameDataReference(param7);
			              const gameDataParam3 = `[${gameDataParam3Str}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2 + gameDataParam3;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・パーティ
			            if (param5 === 6) {
			              const gameDataParam2Value = Number(param6) + 1;
			              const gameDataParam2 = `[${gameDataParam2Value}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・その他
			            if (param5 === 7) {
			              const gameDataParam1Str = getGameDataOther(param6);
			              const gameDataParam1 = `[${gameDataParam1Str}]`;
			              const gameData = gameDataStr + gameDataParam1;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			            // ゲームデータ・直前
			            if (param5 === 8) {
			              const gameDataParam2Value = getGameDataLast(param6);
			              const gameDataParam2 = `[${gameDataParam2Value}]`;
			              const gameData = gameDataStr + gameDataParam1 + gameDataParam2;
			              if (variableId1 === variableId2) {
			                text += tag + variableId1 + comma + gameData + '>';
			              } else {
			                text += tag + variableId1 + '-' + variableId2 + comma + gameData + '>';
			              }
			            }
			          }
			        }
			        if (event.code === 123) {
			          const selfSwitchValue = event.parameters[0] + comma;
			          const operationValue = event.parameters[1];
			          const operation = getOnOffRadioButtonValue(operationValue);
			          const tag = EnglishTag ? '<SelfSwitch: ' : '<セルフスイッチ: ';
			          addNewLineIndent(indent);
			          text += tag + selfSwitchValue + operation + '>';
			        }
			        if (event.code === 124) {
			          const operation = getTimerValue(event.parameters[0]);
			          const time = event.parameters[1];
			          const minutes = Math.floor(time / 60);
			          const seconds = time % 60;

			          const tag = EnglishTag ? '<Timer: ' : '<タイマー: ';
			          addNewLineIndent(indent);
			          if (event.parameters[0] === 0) {
			            // スタート
			            text += tag + operation + comma + minutes + comma + seconds + '>';
			          } else {
			            // ストップ
			            text += tag + operation + '>';
			          }
			        }

			        /** ********************************************** */
			        // フロー制御
			        /** ********************************************** */
			        if (event.code === 108) {
			          const comment = event.parameters[0];
			          // 開きタグは閉じ </comment> と大文字小文字を揃える(文法ハイライト/正準形に一致)。
			          const tag = EnglishTag ? '<comment>' : '<注釈>';
			          const tagEnd = EnglishTag ? '</comment>' : '</注釈>';
			          addNewLineIndent(indent);
			          text += tag + newLine + comment + newLine + tagEnd;
			        }
			        if (event.code === 408) {
			          const comment = event.parameters[0];
			          const tagEnd = EnglishTag ? '</comment>' : '</注釈>';
			          const tagEndLength = tagEnd.length;
			          const textSlice = text.slice(-tagEndLength);
			          if (textSlice === tagEnd) {
			            const tmpText = text.slice(0, -tagEndLength);
			            text = tmpText + comment + newLine + tagEnd;
			          }
			        }
			        if (event.code === 111) {
			          const param1 = event.parameters[0];
			          const param2 = event.parameters[1];
			          const param3 = event.parameters[2];
			          const param4 = event.parameters[3];
			          const param5 = event.parameters[4];
			          const tag = EnglishTag ? '<If: ' : '<条件分岐: ';
			          addNewLineIndent(indent);
			          // 0.スイッチ
			          if (param1 === 0) {
			            const switchId = EnglishTag ? `Switches[${param2}]` + comma : `スイッチ[${param2}]` + comma;
			            const isSwitch = getOnOffRadioButtonValue(param3);
			            text += tag + switchId + isSwitch + '>';
			          }
			          // 1.変数
			          if (param1 === 1) {
			            const variableId = EnglishTag ? `Variables[${param2}]` + comma : `変数[${param2}]` + comma;

			            // 定数or変数
			            let constant;
			            if (param3 === 0) constant = param4;
			            else if (param3 === 1) constant = EnglishTag ? `Variables[${param4}]` : `変数[${param4}]`;
			            else constant = param4;

			            // 比較演算子
			            let condition;
			            if (param5 === 0) condition = EnglishTag ? '==' : '＝';
			            else if (param5 === 1) condition = EnglishTag ? '>=' : '≧';
			            else if (param5 === 2) condition = EnglishTag ? '<=' : '≦';
			            else if (param5 === 3) condition = EnglishTag ? '>' : '＞';
			            else if (param5 === 4) condition = EnglishTag ? '<' : '＜';
			            else if (param5 === 5) condition = EnglishTag ? '!=' : '≠';
			            else condition = EnglishTag ? '==' : '＝';
			            condition += comma;
			            text += tag + variableId + condition + constant + '>';
			          }
			          // 2.セルフスイッチ
			          if (param1 === 2) {
			            const selfSwitches = EnglishTag ? `SelfSwitches[${param2}]` + comma : `セルフスイッチ[${param2}]` + comma;
			            const isSwitch = getOnOffRadioButtonValue(param3);
			            text += tag + selfSwitches + isSwitch + '>';
			          }
			          // 3.タイマー
			          if (param1 === 3) {
			            const timer = EnglishTag ? 'Timer' + comma : 'タイマー' + comma;
			            // 比較演算子
			            let condition;
			            if (param3 === 0) condition = EnglishTag ? '>=' : '≧';
			            else if (param3 === 1) condition = EnglishTag ? '<=' : '≦';
			            else condition = EnglishTag ? '>=' : '≧';
			            condition += comma;
			            // 分
			            const minutes = Math.floor(param2 / 60) + comma;
			            // 秒
			            const seconds = param2 % 60;
			            text += tag + timer + condition + minutes + seconds + '>';
			          }
			          // 4.アクター
			          if (param1 === 4) {
			            const actorId = EnglishTag ? `Actors[${param2}]` + comma : `アクター[${param2}]` + comma;
			            switch (param3) {
			              // パーティにいる
			              case 0: {
			                const inTheParty = EnglishTag ? 'in the party' : 'パーティにいる';
			                text += tag + actorId + inTheParty + '>';
			                break
			              }
			              // 名前
			              case 1: {
			                const nameStr = EnglishTag ? 'Name' + comma : '名前' + comma;
			                const nameValue = param4;
			                text += tag + actorId + nameStr + nameValue + '>';
			                break
			              }
			              // 職業
			              case 2: {
			                const classStr = EnglishTag ? 'Class' + comma : '職業' + comma;
			                const classId = param4;
			                text += tag + actorId + classStr + classId + '>';
			                break
			              }
			              // スキル
			              case 3: {
			                const skillStr = EnglishTag ? 'Skill' + comma : 'スキル' + comma;
			                const skillId = param4;
			                text += tag + actorId + skillStr + skillId + '>';
			                break
			              }
			              // 武器
			              case 4: {
			                const weaponStr = EnglishTag ? 'Weapon' + comma : '武器' + comma;
			                const weaponId = param4;
			                text += tag + actorId + weaponStr + weaponId + '>';
			                break
			              }
			              // 防具
			              case 5: {
			                const armorStr = EnglishTag ? 'Armor' + comma : '防具' + comma;
			                const armorId = param4;
			                text += tag + actorId + armorStr + armorId + '>';
			                break
			              }
			              // ステート
			              case 6: {
			                const stateStr = EnglishTag ? 'State' + comma : 'ステート' + comma;
			                const stateId = param4;
			                text += tag + actorId + stateStr + stateId + '>';
			                break
			              }
			              default: {
			                const defaultInTheParty = EnglishTag ? 'in the party' : 'パーティにいる';
			                text += tag + actorId + defaultInTheParty + '>';
			              }
			            }
			          }
			          // 5.敵キャラ
			          if (param1 === 5) {
			            const enemyNumber = Number(param2) + 1;
			            const actorId = EnglishTag ? `Enemies[${enemyNumber}]` + comma : `敵キャラ[${enemyNumber}]` + comma;
			            switch (param3) {
			              // 出現
			              case 0: {
			                const appeared = EnglishTag ? 'Appeared' : '出現している';
			                text += tag + actorId + appeared + '>';
			                break
			              }
			              // ステート
			              case 1: {
			                const stateStr = EnglishTag ? 'State' + comma : 'ステート' + comma;
			                const stateId = param4;
			                text += tag + actorId + stateStr + stateId + '>';
			                break
			              }
			              default: {
			                const breakAppeared = EnglishTag ? 'Appeared' + comma : '出現している' + comma;
			                text += tag + actorId + breakAppeared + '>';
			              }
			            }
			          }
			          // 6.キャラクター
			          if (param1 === 6) {
			            const character = getEventValue(param2);
			            const charactersStr = EnglishTag ? `Characters[${character}]` + comma : `キャラクター[${character}]` + comma;
			            const facing = getDirectionValue(param3);
			            text += tag + charactersStr + facing + '>';
			          }
			          // 13.乗り物
			          if (param1 === 13) {
			            const vehicleStr = EnglishTag ? 'Vehicle' + comma : '乗り物' + comma;
			            const vehicle = getVehicleValue(param2);
			            text += tag + vehicleStr + vehicle + '>';
			          }
			          // 7.お金
			          if (param1 === 7) {
			            const goldStr = EnglishTag ? 'Gold' + comma : 'お金' + comma;
			            // 比較演算子
			            let condition;
			            if (param3 === 0) condition = EnglishTag ? '>=' : '≧';
			            else if (param3 === 1) condition = EnglishTag ? '<=' : '≦';
			            else if (param3 === 2) condition = EnglishTag ? '<' : '＜';
			            else condition = EnglishTag ? '>=' : '≧';
			            condition += comma;
			            const gold = param2;

			            text += tag + goldStr + condition + gold + '>';
			          }
			          // 8.アイテム
			          if (param1 === 8) {
			            const itemStr = EnglishTag ? `Items[${param2}]` : `アイテム[${param2}]`;
			            text += tag + itemStr + '>';
			          }
			          // 9.武器
			          if (param1 === 9) {
			            const weaponStr = EnglishTag ? `Weapons[${param2}]` : `武器[${param2}]`;
			            let includeEquipment;
			            if (param3) includeEquipment = EnglishTag ? comma + 'Include Equipment' : comma + '装備品を含む';
			            else includeEquipment = '';
			            text += tag + weaponStr + includeEquipment + '>';
			          }
			          // 10.防具
			          if (param1 === 10) {
			            const armorStr = EnglishTag ? `Armors[${param2}]` : `防具[${param2}]`;
			            let includeEquipment;
			            if (param3) includeEquipment = EnglishTag ? comma + 'Include Equipment' : comma + '装備品を含む';
			            else includeEquipment = '';
			            text += tag + armorStr + includeEquipment + '>';
			          }
			          // 11.ボタン
			          if (param1 === 11) {
			            const buttonStr = EnglishTag ? 'Button' + comma : 'ボタン' + comma;
			            const button = ((param2) => {
			              if (param2 === 'ok') return EnglishTag ? 'OK' : '決定'
			              else if (param2 === 'cancel') return EnglishTag ? 'Cancel' : 'キャンセル'
			              else if (param2 === 'shift') return EnglishTag ? 'Shift' : 'シフト'
			              else if (param2 === 'down') return EnglishTag ? 'Down' : '下'
			              else if (param2 === 'left') return EnglishTag ? 'Left' : '左'
			              else if (param2 === 'right') return EnglishTag ? 'Right' : '右'
			              else if (param2 === 'up') return EnglishTag ? 'Up' : '上'
			              else if (param2 === 'pageup') return EnglishTag ? 'Pageup' : 'ページアップ'
			              else if (param2 === 'pagedown') return EnglishTag ? 'Pagedown' : 'ページダウン'
			              else return EnglishTag ? 'OK' : '決定'
			            })(param2);
			            if (param3) {
			              // MZ(ボタンの押し方を省略しない)
			              const buttonState = ((param3) => {
			                if (param3 === 0) return EnglishTag ? 'is being pressed' : 'が押されている'
			                else if (param3 === 1) return EnglishTag ? 'is being triggered' : 'がトリガーされている'
			                else if (param3 === 2) return EnglishTag ? 'is being repeated' : 'がリピートされている'
			                else return EnglishTag ? 'is being pressed' : 'が押されている'
			              })(param3);
			              text += tag + buttonStr + button + comma + buttonState + '>';
			            } else {
			              // MV(ボタンの押し方を省略)
			              text += tag + buttonStr + button + '>';
			            }
			          }
			          // 12.スクリプト
			          if (param1 === 12) {
			            const scriptStr = EnglishTag ? 'Script' + comma : 'スクリプト' + comma;
			            const script = param2;
			            text += tag + scriptStr + script + '>';
			          }
			        }
			        if (event.code === 411) {
			          const tag = EnglishTag ? '<Else>' : '<それ以外のとき>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 412) {
			          const tag = EnglishTag ? '<End>' : '<分岐終了>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 112) {
			          const tag = EnglishTag ? '<Loop>' : '<ループ>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 413) {
			          const tag = EnglishTag ? '<RepeatAbove>' : '<以上繰り返し>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 113) {
			          const tag = EnglishTag ? '<BreakLoop>' : '<ループの中断>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 115) {
			          const tag = EnglishTag ? '<ExitEventProcessing>' : '<イベント処理の中断>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 117) {
			          const CommonEventId = event.parameters[0];
			          const tag = EnglishTag ? '<CommonEvent: ' : '<コモンイベント: ';
			          addNewLineIndent(indent);
			          text += tag + CommonEventId + '>';
			        }
			        if (event.code === 118) {
			          const label = event.parameters[0];
			          const tag = EnglishTag ? '<Label: ' : '<ラベル: ';
			          addNewLineIndent(indent);
			          text += tag + label + '>';
			        }
			        if (event.code === 119) {
			          const label = event.parameters[0];
			          const tag = EnglishTag ? '<JumpToLabel: ' : '<ラベルジャンプ: ';
			          addNewLineIndent(indent);
			          text += tag + label + '>';
			        }

			        /** ********************************************** */
			        // パーティ
			        /** ********************************************** */
			        if (event.code === 125) {
			          const operation = getIncreaseOrDecrease(event.parameters[0]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[1], event.parameters[2]);
			          const tag = EnglishTag ? '<ChangeGold: ' : '<所持金の増減: ';
			          addNewLineIndent(indent);
			          text += tag + operation + operandValue + '>';
			        }
			        if (event.code === 126) {
			          const itemId = event.parameters[0] + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]);
			          const tag = EnglishTag ? '<ChangeItems: ' : '<アイテムの増減: ';
			          addNewLineIndent(indent);
			          text += tag + itemId + operation + operandValue + '>';
			        }
			        if (event.code === 127) {
			          const weaponId = event.parameters[0] + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma;
			          const includeEquipment = getCheckBoxIncludeEquipmentValue(event.parameters[4]);
			          const tag = EnglishTag ? '<ChangeWeapons: ' : '<武器の増減: ';
			          addNewLineIndent(indent);
			          text += tag + weaponId + operation + operandValue + includeEquipment + '>';
			        }
			        if (event.code === 128) {
			          const armorId = event.parameters[0] + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma;
			          const includeEquipment = getCheckBoxIncludeEquipmentValue(event.parameters[4]);
			          const tag = EnglishTag ? '<ChangeArmors: ' : '<防具の増減: ';
			          addNewLineIndent(indent);
			          text += tag + armorId + operation + operandValue + includeEquipment + '>';
			        }
			        if (event.code === 129) {
			          const actorId = event.parameters[0] + comma;
			          const operation = getAddOrRemove(event.parameters[1]) + comma;
			          const initialize = getCheckBoxInitializeValue(event.parameters[2]);
			          const tag = EnglishTag ? '<ChangePartyMember: ' : '<メンバーの入れ替え: ';
			          addNewLineIndent(indent);
			          text += tag + actorId + operation + initialize + '>';
			        }

			        /** ********************************************** */
			        // アクター
			        /** ********************************************** */
			        if (event.code === 311) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma;
			          const allowKnockout = getCheckBoxAllowKnockoutValue(event.parameters[5]);
			          const tag = EnglishTag ? '<ChangeHp: ' : '<HPの増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + operandValue + allowKnockout + '>';
			        }
			        if (event.code === 312) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]);
			          const tag = EnglishTag ? '<ChangeMp: ' : '<MPの増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + operandValue + '>';
			        }
			        if (event.code === 326) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]);
			          const tag = EnglishTag ? '<ChangeTp: ' : '<TPの増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + operandValue + '>';
			        }
			        if (event.code === 313) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getAddOrRemove(event.parameters[2]) + comma;
			          const stateId = event.parameters[3];
			          const tag = EnglishTag ? '<ChangeState: ' : '<ステートの変更: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + stateId + '>';
			        }
			        if (event.code === 314) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]);
			          const tag = EnglishTag ? '<RecoverAll: ' : '<全回復: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + '>';
			        }
			        if (event.code === 315) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma;
			          const showLevelUp = getCheckBoxShowLevelUpValue(event.parameters[5]);
			          const tag = EnglishTag ? '<ChangeExp: ' : '<経験値の増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + operandValue + showLevelUp + '>';
			        }
			        if (event.code === 316) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[2]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[3], event.parameters[4]) + comma;
			          const showLevelUp = getCheckBoxShowLevelUpValue(event.parameters[5]);
			          const tag = EnglishTag ? '<ChangeLevel: ' : '<レベルの増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + operandValue + showLevelUp + '>';
			        }
			        if (event.code === 317) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const parameter = getActorParameterValue(event.parameters[2]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[3]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[4], event.parameters[5]);
			          const tag = EnglishTag ? '<ChangeParameter: ' : '<能力値の増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + parameter + operation + operandValue + '>';
			        }
			        if (event.code === 318) {
			          const actorValue = getFixedOrVariable(event.parameters[0], event.parameters[1]) + comma;
			          const operation = getLearnOrForgot(event.parameters[2]) + comma;
			          const skillId = event.parameters[3];
			          const tag = EnglishTag ? '<ChangeSkill: ' : '<スキルの増減: ';
			          addNewLineIndent(indent);
			          text += tag + actorValue + operation + skillId + '>';
			        }
			        if (event.code === 319) {
			          const actorId = event.parameters[0] + comma;
			          const equipmentTypeId = event.parameters[1] + comma;
			          const equipmentItemId = event.parameters[2];
			          const tag = EnglishTag ? '<ChangeEquipment: ' : '<装備の変更: ';
			          addNewLineIndent(indent);
			          text += tag + actorId + equipmentTypeId + equipmentItemId + '>';
			        }
			        if (event.code === 320) {
			          const actorId = event.parameters[0] + comma;
			          const name = event.parameters[1];
			          const tag = EnglishTag ? '<ChangeName: ' : '<名前の変更: ';
			          addNewLineIndent(indent);
			          text += tag + actorId + name + '>';
			        }
			        if (event.code === 321) {
			          const actorId = event.parameters[0] + comma;
			          const classId = event.parameters[1] + comma;
			          const saveExp = getCheckBoxSaveEXPValue(event.parameters[2]);
			          const tag = EnglishTag ? '<ChangeClass: ' : '<職業の変更: ';
			          addNewLineIndent(indent);
			          text += tag + actorId + classId + saveExp + '>';
			        }
			        if (event.code === 324) {
			          const actorId = event.parameters[0];
			          const nickname = event.parameters[1];
			          const tag = EnglishTag ? '<ChangeNickname: ' : '<二つ名の変更: ';
			          addNewLineIndent(indent);
			          if (nickname === '') {
			            text += tag + actorId + '>';
			          } else {
			            text += tag + actorId + comma + nickname + '>';
			          }
			        }
			        if (event.code === 325) {
			          const actorId = event.parameters[0];
			          const profile = event.parameters[1];
			          const splitProfile = profile.split('\n');
			          const profile1line = splitProfile[0] === undefined ? '' : splitProfile[0];
			          const profile2line = splitProfile[1] === undefined ? '' : splitProfile[1];
			          const tag = EnglishTag ? '<ChangeProfile: ' : '<プロフィールの変更: ';
			          addNewLineIndent(indent);
			          if (profile1line === '' && profile2line === '') {
			            text += tag + actorId + '>';
			          } else if (profile2line === '') {
			            text += tag + actorId + comma + profile1line + '>';
			          } else {
			            text += tag + actorId + comma + profile1line + comma + profile2line + '>';
			          }
			        }

			        /** ********************************************** */
			        // 移動
			        /** ********************************************** */
			        if (event.code === 201) {
			          const location = getDirectOrVariablesValue(event.parameters[0]);
			          const mapId = event.parameters[1];
			          const mapX = event.parameters[2];
			          const mapY = event.parameters[3];
			          const locationStr = `${location}[${mapId}][${mapX}][${mapY}]` + comma;
			          const direction = getDirectionValue(event.parameters[4]) + comma;
			          const fade = getFadeValue(event.parameters[5]);
			          const tag = EnglishTag ? '<TransferPlayer: ' : '<場所移動: ';
			          addNewLineIndent(indent);
			          text += tag + locationStr + direction + fade + '>';
			        }
			        if (event.code === 202) {
			          const vehicle = getVehicleValue(event.parameters[0]) + comma;
			          const location = getDirectOrVariablesValue(event.parameters[1]);
			          const mapId = event.parameters[2];
			          const mapX = event.parameters[3];
			          const mapY = event.parameters[4];
			          const locationStr = `${location}[${mapId}][${mapX}][${mapY}]`;
			          const tag = EnglishTag ? '<SetVehicleLocation: ' : '<乗り物の位置設定: ';
			          addNewLineIndent(indent);
			          text += tag + vehicle + locationStr + '>';
			        }
			        if (event.code === 203) {
			          const eventValue = getEventValue(event.parameters[0]) + comma;
			          const location = getDirectOrVariablesValue(event.parameters[1]);
			          const mapY = event.parameters[3];
			          let locationStr = '';
			          if (event.parameters[1] === 2) {
			            const eventId = getEventValue(event.parameters[2]);
			            locationStr = `${location}[${eventId}]` + comma;
			          } else {
			            const mapX = event.parameters[2];
			            locationStr = `${location}[${mapX}][${mapY}]` + comma;
			          }
			          const direction = getDirectionValue(event.parameters[4]);
			          addNewLineIndent(indent);
			          const tag = EnglishTag ? '<SetEventLocation: ' : '<イベントの位置設定: ';
			          text += tag + eventValue + locationStr + direction + '>';
			        }
			        if (event.code === 204) {
			          const direction = getDirectionValue(event.parameters[0]) + comma;
			          const distance = event.parameters[1] + comma;
			          const speed = getSpeedValue(event.parameters[2]) + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3]);
			          const tag = EnglishTag ? '<ScrollMap: ' : '<マップのスクロール: ';
			          addNewLineIndent(indent);
			          text += tag + direction + distance + speed + waitForCompletion + '>';
			        }
			        // 移動ルートの設定
			        if (event.code === 205) {
			          const target = getEventValue(event.parameters[0]) + comma;
			          const repeat = getCheckBoxRepeatMovementsValue(event.parameters[1].repeat) + comma;
			          const skippable = getCheckBoxSkipValue(event.parameters[1].skippable) + comma;
			          const wait = getCheckBoxWaitforCompletionValue(event.parameters[1].wait);
			          const tag = EnglishTag ? '<SetMovementRoute: ' : '<移動ルートの設定: ';
			          addNewLineIndent(indent);
			          text += tag + target + repeat + skippable + wait + '>';
			        }
			        // 移動ルートの設定(移動コマンド)
			        if (event.code === 505) {
			          const movement = event.parameters[0];
			          // 整形時は移動コマンドを親の移動ルート設定と同じ深さに揃える(非整形時は列0)
			          const moveIndent = indent;

			          const code1tag = EnglishTag ? '<MoveDown>' : '<下に移動>';
			          const code2tag = EnglishTag ? '<MoveLeft>' : '<左に移動>';
			          const code3tag = EnglishTag ? '<MoveRight>' : '<右に移動>';
			          const code4tag = EnglishTag ? '<MoveUp>' : '<上に移動>';
			          const code5tag = EnglishTag ? '<MoveLowerLeft>' : '<左下に移動>';
			          const code6tag = EnglishTag ? '<MoveLowerRight>' : '<右下に移動>';
			          const code7tag = EnglishTag ? '<MoveUpperLeft>' : '<左上に移動>';
			          const code8tag = EnglishTag ? '<MoveUpperRight>' : '<右上に移動>';
			          const code9tag = EnglishTag ? '<MoveAtRandom>' : '<ランダムに移動>';
			          const code10tag = EnglishTag ? '<MoveTowardPlayer>' : '<プレイヤーに近づく>';
			          const code11tag = EnglishTag ? '<MoveAwayFromPlayer>' : '<プレイヤーから遠ざかる>';
			          const code12tag = EnglishTag ? '<OneStepForward>' : '<一歩前進>';
			          const code13tag = EnglishTag ? '<OneStepBackward>' : '<一歩後退>';
			          const code14tag = EnglishTag ? '<Jump: ' : '<ジャンプ: ';
			          const code15tag = EnglishTag ? '<McWait: ' : '<移動コマンドウェイト: ';
			          const code16tag = EnglishTag ? '<TurnDown>' : '<下を向く>';
			          const code17tag = EnglishTag ? '<TurnLeft>' : '<左を向く>';
			          const code18tag = EnglishTag ? '<TurnRight>' : '<右を向く>';
			          const code19tag = EnglishTag ? '<TurnUp>' : '<上を向く>';
			          const code20tag = EnglishTag ? '<Turn90Right>' : '<右に90度回転>';
			          const code21tag = EnglishTag ? '<Turn90Left>' : '<左に90度回転>';
			          const code22tag = EnglishTag ? '<Turn180>' : '<180度回転>';
			          const code23tag = EnglishTag ? '<Turn90RightorLeft>' : '<右か左に90度回転>';
			          const code24tag = EnglishTag ? '<TurnAtRandom>' : '<ランダムに方向転換>';
			          const code25tag = EnglishTag ? '<TurnTowardPlayer>' : '<プレイヤーの方を向く>';
			          const code26tag = EnglishTag ? '<TurnAwayFromPlayer>' : '<プレイヤーの逆を向く>';
			          const code27tag = EnglishTag ? '<SwitchOn: ' : '<スイッチON: ';
			          const code28tag = EnglishTag ? '<SwitchOff: ' : '<スイッチOFF: ';
			          const code29tag = EnglishTag ? '<ChangeSpeed: ' : '<移動速度の変更: ';
			          const code30tag = EnglishTag ? '<ChangeFrequency: ' : '<移動頻度の変更: ';
			          const code31tag = EnglishTag ? '<WalkingAnimationOn>' : '<歩行アニメON>';
			          const code32tag = EnglishTag ? '<WalkingAnimationOff>' : '<歩行アニメOFF>';
			          const code33tag = EnglishTag ? '<SteppingAnimationOn>' : '<足踏みアニメON>';
			          const code34tag = EnglishTag ? '<SteppingAnimationOff>' : '<足踏みアニメOFF>';
			          const code35tag = EnglishTag ? '<DirectionFixOn>' : '<向き固定ON>';
			          const code36tag = EnglishTag ? '<DirectionFixOff>' : '<向き固定OFF>';
			          const code37tag = EnglishTag ? '<ThroughOn>' : '<すり抜けON>';
			          const code38tag = EnglishTag ? '<ThroughOff>' : '<すり抜けOFF>';
			          const code39tag = EnglishTag ? '<TransparentOn>' : '<透明化ON>';
			          const code40tag = EnglishTag ? '<TransparentOff>' : '<透明化OFF>';
			          const code41tag = EnglishTag ? '<ChangeImage: ' : '<画像の変更: ';
			          const code42tag = EnglishTag ? '<ChangeOpacity: ' : '<不透明度の変更: ';
			          const code43tag = EnglishTag ? '<ChangeBlendMode: ' : '<合成方法の変更: ';
			          const code44tag = EnglishTag ? '<McPlaySe: ' : '<移動コマンドSEの演奏: ';
			          const code45tag = EnglishTag ? '<McScript: ' : '<移動コマンドスクリプト: ';

			          addNewLineIndent(moveIndent);
			          if (movement.code === 1) text += code1tag;
			          else if (movement.code === 2) text += code2tag;
			          else if (movement.code === 3) text += code3tag;
			          else if (movement.code === 4) text += code4tag;
			          else if (movement.code === 5) text += code5tag;
			          else if (movement.code === 6) text += code6tag;
			          else if (movement.code === 7) text += code7tag;
			          else if (movement.code === 8) text += code8tag;
			          else if (movement.code === 9) text += code9tag;
			          else if (movement.code === 10) text += code10tag;
			          else if (movement.code === 11) text += code11tag;
			          else if (movement.code === 12) text += code12tag;
			          else if (movement.code === 13) text += code13tag;
			          else if (movement.code === 14) {
			            const x = movement.parameters[0] + comma;
			            const y = movement.parameters[1];
			            text += code14tag + x + y + '>';
			          } else if (movement.code === 15) {
			            const wait = movement.parameters[0];
			            text += code15tag + wait + '>';
			          } else if (movement.code === 16) text += code16tag;
			          else if (movement.code === 17) text += code17tag;
			          else if (movement.code === 18) text += code18tag;
			          else if (movement.code === 19) text += code19tag;
			          else if (movement.code === 20) text += code20tag;
			          else if (movement.code === 21) text += code21tag;
			          else if (movement.code === 22) text += code22tag;
			          else if (movement.code === 23) text += code23tag;
			          else if (movement.code === 24) text += code24tag;
			          else if (movement.code === 25) text += code25tag;
			          else if (movement.code === 26) text += code26tag;
			          else if (movement.code === 27) {
			            const switchId = movement.parameters[0];
			            text += code27tag + switchId + '>';
			          } else if (movement.code === 28) {
			            const switchId = movement.parameters[0];
			            text += code28tag + switchId + '>';
			          } else if (movement.code === 29) {
			            const speed = getSpeedValue(movement.parameters[0]);
			            text += code29tag + speed + '>';
			          } else if (movement.code === 30) {
			            const frequency = getFrequencyValue(movement.parameters[0]);
			            text += code30tag + frequency + '>';
			          } else if (movement.code === 31) text += code31tag;
			          else if (movement.code === 32) text += code32tag;
			          else if (movement.code === 33) text += code33tag;
			          else if (movement.code === 34) text += code34tag;
			          else if (movement.code === 35) text += code35tag;
			          else if (movement.code === 36) text += code36tag;
			          else if (movement.code === 37) text += code37tag;
			          else if (movement.code === 38) text += code38tag;
			          else if (movement.code === 39) text += code39tag;
			          else if (movement.code === 40) text += code40tag;
			          else if (movement.code === 41) {
			            const image = getNone(movement.parameters[0]) + comma;
			            const imageId = movement.parameters[1];
			            text += code41tag + image + imageId + '>';
			          } else if (movement.code === 42) {
			            const opacity = movement.parameters[0];
			            text += code42tag + opacity + '>';
			          } else if (movement.code === 43) {
			            const blendMode = getBlendModeValue(movement.parameters[0]);
			            text += code43tag + blendMode + '>';
			          } else if (movement.code === 44) {
			            const image = getNone(movement.parameters[0].name) + comma;
			            const volume = movement.parameters[0].volume + comma;
			            const pitch = movement.parameters[0].pitch + comma;
			            const pan = movement.parameters[0].pan;
			            text += code44tag + image + volume + pitch + pan + '>';
			          } else if (movement.code === 45) {
			            const script = movement.parameters[0];
			            text += code45tag + script + '>';
			          }
			        }
			        if (event.code === 206) {
			          const tag = EnglishTag ? '<GetOnOffVehicle>' : '<乗り物の乗降>';
			          addNewLineIndent(indent);
			          text += tag;
			        }

			        /** ********************************************** */
			        // キャラクター
			        /** ********************************************** */
			        if (event.code === 211) {
			          const transparencyValue = event.parameters[0];
			          const transparency = getOnOffRadioButtonValue(transparencyValue);
			          const tag = EnglishTag ? '<ChangeTransparency: ' : '<透明状態の変更: ';
			          addNewLineIndent(indent);
			          text += tag + transparency + '>';
			        }
			        if (event.code === 216) {
			          const playerFollowersValue = event.parameters[0];
			          const playerFollowers = getOnOffRadioButtonValue(playerFollowersValue);
			          const tag = EnglishTag ? '<ChangePlayerFollowers: ' : '<隊列歩行の変更: ';
			          addNewLineIndent(indent);
			          text += tag + playerFollowers + '>';
			        }
			        if (event.code === 217) {
			          const tag = EnglishTag ? '<GatherFollowers>' : '<隊列メンバーの集合>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 212) {
			          const character = getEventValue(event.parameters[0]) + comma;
			          const animationId = event.parameters[1] + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2]);
			          const tag = EnglishTag ? '<ShowAnimation: ' : '<アニメーションの表示: ';
			          addNewLineIndent(indent);
			          text += tag + character + animationId + waitForCompletion + '>';
			        }
			        if (event.code === 213) {
			          const character = getEventValue(event.parameters[0]) + comma;
			          const balloonIcon = getBalloonIconValue(event.parameters[1]) + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2]);
			          const tag = EnglishTag ? '<ShowBalloonIcon: ' : '<フキダシアイコンの表示: ';
			          addNewLineIndent(indent);
			          text += tag + character + balloonIcon + waitForCompletion + '>';
			        }
			        if (event.code === 214) {
			          const tag = EnglishTag ? '<EraseEvent>' : '<イベントの一時消去>';
			          addNewLineIndent(indent);
			          text += tag;
			        }

			        /** ********************************************** */
			        // 画面
			        /** ********************************************** */
			        if (event.code === 221) {
			          const tag = EnglishTag ? '<Fadeout>' : '<フェードアウト>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 222) {
			          const tag = EnglishTag ? '<Fadein>' : '<フェードイン>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 230) {
			          const duration = event.parameters[0];
			          const tag = EnglishTag ? '<Wait: ' : '<ウェイト: ';
			          addNewLineIndent(indent);
			          text += tag + duration + '>';
			        }
			        if (event.code === 223) {
			          const tmpColorTone = getColorToneValue(
			            event.parameters[0][0],
			            event.parameters[0][1],
			            event.parameters[0][2],
			            event.parameters[0][3]
			          );
			          const colorTone = tmpColorTone === '' ? '' : comma + tmpColorTone;
			          const tmpDuration = getDurationValue(event.parameters[1], event.parameters[2]);
			          const duration = tmpDuration === '' ? '' : tmpDuration;
			          const tag = EnglishTag ? '<TintScreen: ' : '<画面の色調変更: ';
			          addNewLineIndent(indent);
			          text += tag + duration + colorTone + '>';
			        }
			        if (event.code === 224) {
			          const red = event.parameters[0][0] + comma;
			          const green = event.parameters[0][1] + comma;
			          const blue = event.parameters[0][2] + comma;
			          const gray = event.parameters[0][3] + comma;
			          const duration = event.parameters[1] + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[2]);
			          const tag = EnglishTag ? '<FlashScreen: ' : '<画面のフラッシュ: ';
			          addNewLineIndent(indent);
			          text += tag + red + green + blue + gray + duration + waitForCompletion + '>';
			        }
			        if (event.code === 225) {
			          const power = event.parameters[0] + comma;
			          const speed = event.parameters[1] + comma;
			          const duration = event.parameters[2] + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3]);
			          const tag = EnglishTag ? '<ShakeScreen: ' : '<画面のシェイク: ';
			          addNewLineIndent(indent);
			          text += tag + power + speed + duration + waitForCompletion + '>';
			        }
			        if (event.code === 236) {
			          const type = getWeatherTypeValue(event.parameters[0]) + comma;
			          const power = event.parameters[1] + comma;
			          const duration = event.parameters[2] + comma;
			          const waitForCompletion = getCheckBoxWaitforCompletionValue(event.parameters[3]);
			          const tag = EnglishTag ? '<SetWeatherEffect: ' : '<天候の設定: ';
			          addNewLineIndent(indent);
			          text += tag + type + power + duration + waitForCompletion + '>';
			        }

			        /** ********************************************** */
			        // ピクチャ
			        /** ********************************************** */
			        if (event.code === 231) {
			          const pictureNumber = event.parameters[0] + comma;
			          const image = event.parameters[1] + comma;
			          const position = getPositionValue(
			            event.parameters[2],
			            event.parameters[3],
			            event.parameters[4],
			            event.parameters[5]
			          ) + comma;
			          const scale = getScaleValue(event.parameters[6], event.parameters[7]) + comma;
			          const blend = getBlendValue(event.parameters[8], event.parameters[9]);
			          const tag = EnglishTag ? '<ShowPicture: ' : '<ピクチャの表示: ';
			          addNewLineIndent(indent);
			          text += tag + pictureNumber + image + position + scale + blend + '>';
			        }
			        if (event.code === 232) {
			          const pictureNumber = event.parameters[0] + comma;
			          const position = getPositionValue(
			            event.parameters[2],
			            event.parameters[3],
			            event.parameters[4],
			            event.parameters[5]
			          ) + comma;
			          const scale = getScaleValue(event.parameters[6], event.parameters[7]) + comma;
			          const blend = getBlendValue(event.parameters[8], event.parameters[9]) + comma;
			          const duration = getDurationValue(event.parameters[10], event.parameters[11]) + comma;
			          const easing = getEasingValue(event.parameters[12]);
			          const tag = EnglishTag ? '<MovePicture: ' : '<ピクチャの移動: ';
			          addNewLineIndent(indent);
			          text += tag + pictureNumber + duration + position + scale + blend + easing + '>';
			        }
			        if (event.code === 233) {
			          const pictureNumber = event.parameters[0] + comma;
			          const rotationSpeed = event.parameters[1];
			          const tag = EnglishTag ? '<RotatePicture: ' : '<ピクチャの回転: ';
			          addNewLineIndent(indent);
			          text += tag + pictureNumber + rotationSpeed + '>';
			        }
			        if (event.code === 234) {
			          const pictureNumber = event.parameters[0] + comma;
			          const colorTone = getColorToneValue(
			            event.parameters[1][0],
			            event.parameters[1][1],
			            event.parameters[1][2],
			            event.parameters[1][3]
			          );
			          const duration = getDurationValue(event.parameters[2], event.parameters[3]) + comma;
			          const tag = EnglishTag ? '<TintPicture: ' : '<ピクチャの色調変更: ';
			          addNewLineIndent(indent);
			          text += tag + pictureNumber + duration + colorTone + '>';
			        }

			        if (event.code === 235) {
			          const pictureNumber = event.parameters[0];
			          const tag = EnglishTag ? '<ErasePicture: ' : '<ピクチャの消去: ';
			          addNewLineIndent(indent);
			          text += tag + pictureNumber + '>';
			        }

			        /** ********************************************** */
			        // オーディオ・ビデオ
			        /** ********************************************** */
			        if (event.code === 241) {
			          const image = getNone(event.parameters[0].name);
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<PlayBGM: ' : '<BGMの演奏: ';
			          addNewLineIndent(indent);
			          text += tag + image + comma + volume + pitch + pan + '>';
			        }
			        if (event.code === 242) {
			          const duration = event.parameters[0];
			          const tag = EnglishTag ? '<FadeoutBGM: ' : '<BGMのフェードアウト: ';
			          addNewLineIndent(indent);
			          text += tag + duration + '>';
			        }
			        if (event.code === 243) {
			          const tag = EnglishTag ? '<SaveBGM>' : '<BGMの保存>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 244) {
			          const tag = EnglishTag ? '<ReplayBGM>' : '<BGMの再開>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 245) {
			          const image = getNone(event.parameters[0].name);
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<PlayBGS: ' : '<BGSの演奏: ';
			          addNewLineIndent(indent);
			          text += tag + image + comma + volume + pitch + pan + '>';
			        }
			        if (event.code === 249) {
			          const image = getNone(event.parameters[0].name);
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<PlayME: ' : '<MEの演奏: ';
			          addNewLineIndent(indent);
			          text += tag + image + comma + volume + pitch + pan + '>';
			        }
			        if (event.code === 250) {
			          const image = getNone(event.parameters[0].name);
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<PlaySE: ' : '<SEの演奏: ';
			          addNewLineIndent(indent);
			          text += tag + image + comma + volume + pitch + pan + '>';
			        }

			        if (event.code === 246) {
			          const duration = event.parameters[0];
			          const tag = EnglishTag ? '<FadeoutBGS: ' : '<BGSのフェードアウト: ';
			          addNewLineIndent(indent);
			          text += tag + duration + '>';
			        }
			        if (event.code === 251) {
			          const tag = EnglishTag ? '<StopSE>' : '<SEの停止>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 261) {
			          const movie = getNone(event.parameters[0]);
			          const tag = EnglishTag ? '<PlayMovie: ' : '<ムービーの再生: ';
			          addNewLineIndent(indent);
			          text += tag + movie + '>';
			        }

			        /** ********************************************** */
			        // システム設定
			        /** ********************************************** */
			        if (event.code === 132) {
			          const name = getNone(event.parameters[0].name) + comma;
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<ChangeBattleBGM: ' : '<戦闘曲の変更: ';
			          addNewLineIndent(indent);
			          text += tag + name + volume + pitch + pan + '>';
			        }
			        if (event.code === 133) {
			          const name = getNone(event.parameters[0].name) + comma;
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<ChangeVictoryMe: ' : '<勝利MEの変更: ';
			          addNewLineIndent(indent);
			          text += tag + name + volume + pitch + pan + '>';
			        }
			        if (event.code === 139) {
			          const name = getNone(event.parameters[0].name) + comma;
			          const volume = event.parameters[0].volume + comma;
			          const pitch = event.parameters[0].pitch + comma;
			          const pan = event.parameters[0].pan;
			          const tag = EnglishTag ? '<ChangeDefeatMe: ' : '<敗北MEの変更: ';
			          addNewLineIndent(indent);
			          text += tag + name + volume + pitch + pan + '>';
			        }
			        if (event.code === 140) {
			          const vehicle = getVehicleValue(event.parameters[0]) + comma;
			          const name = getNone(event.parameters[1].name) + comma;
			          const volume = event.parameters[1].volume + comma;
			          const pitch = event.parameters[1].pitch + comma;
			          const pan = event.parameters[1].pan;
			          const tag = EnglishTag ? '<ChangeVehicleBgm: ' : '<乗り物BGMの変更: ';
			          addNewLineIndent(indent);
			          text += tag + vehicle + name + volume + pitch + pan + '>';
			        }
			        if (event.code === 134) {
			          const save = getDisableEnable(event.parameters[0]);
			          const tag = EnglishTag ? '<ChangeSaveAccess: ' : '<セーブ禁止の変更: ';
			          addNewLineIndent(indent);
			          text += tag + save + '>';
			        }
			        if (event.code === 135) {
			          const menu = getDisableEnable(event.parameters[0]);
			          const tag = EnglishTag ? '<ChangeMenuAccess: ' : '<メニュー禁止の変更: ';
			          addNewLineIndent(indent);
			          text += tag + menu + '>';
			        }
			        if (event.code === 136) {
			          const encounter = getDisableEnable(event.parameters[0]);
			          const tag = EnglishTag ? '<ChangeEncounter: ' : '<エンカウント禁止の変更: ';
			          addNewLineIndent(indent);
			          text += tag + encounter + '>';
			        }
			        if (event.code === 137) {
			          const formation = getDisableEnable(event.parameters[0]);
			          const tag = EnglishTag ? '<ChangeFormationAccess: ' : '<並び変え禁止の変更: ';
			          addNewLineIndent(indent);
			          text += tag + formation + '>';
			        }
			        if (event.code === 138) {
			          const red = event.parameters[0][0] + comma;
			          const green = event.parameters[0][1] + comma;
			          const blue = event.parameters[0][2];
			          const tag = EnglishTag ? '<ChangeWindowColor: ' : '<ウィンドウカラーの変更: ';
			          addNewLineIndent(indent);
			          text += tag + red + green + blue + '>';
			        }
			        if (event.code === 322) {
			          const faceId = event.parameters[0] + comma;
			          const face = getNone(event.parameters[1]) + comma;
			          const characterId = event.parameters[2] + comma;
			          const character = getNone(event.parameters[3]) + comma;
			          const battlerId = event.parameters[4] + comma;
			          const battler = getNone(event.parameters[5]);
			          const tag = EnglishTag ? '<ChangeActorImages: ' : '<アクターの画像変更: ';
			          addNewLineIndent(indent);
			          text += tag + faceId + face + characterId + character + battlerId + battler + '>';
			        }
			        if (event.code === 323) {
			          const vehicle = getVehicleValue(event.parameters[0]) + comma;
			          const image = getNone(event.parameters[1]) + comma;
			          const imageId = event.parameters[2];
			          const tag = EnglishTag ? '<ChangeVehicleImage: ' : '<乗り物の画像変更: ';
			          addNewLineIndent(indent);
			          text += tag + vehicle + image + imageId + '>';
			        }

			        /** ********************************************** */
			        // マップ
			        /** ********************************************** */
			        if (event.code === 281) {
			          const mapNameDisplayValue = event.parameters[0];
			          const mapNameDisplay = getOnOffRadioButtonValue(mapNameDisplayValue);
			          const tag = EnglishTag ? '<ChangeMapNameDisplay: ' : '<マップ名表示の変更: ';
			          addNewLineIndent(indent);
			          text += tag + mapNameDisplay + '>';
			        }
			        if (event.code === 282) {
			          const tilesetId = event.parameters[0];
			          const tag = EnglishTag ? '<ChangeTileset: ' : '<タイルセットの変更: ';
			          addNewLineIndent(indent);
			          text += tag + tilesetId + '>';
			        }
			        if (event.code === 283) {
			          const battleBackGround1 = getNone(event.parameters[0]) + comma;
			          const battleBackGround2 = getNone(event.parameters[1]);
			          const tag = EnglishTag ? '<ChangeBattleBackGround: ' : '<戦闘背景の変更: ';
			          addNewLineIndent(indent);
			          text += tag + battleBackGround1 + battleBackGround2 + '>';
			        }
			        if (event.code === 284) {
			          const image = getNone(event.parameters[0]);
			          const loopHorizontallyStr = EnglishTag ? 'LoopHorizontally' : '横方向にループする';
			          const loopVerticallyStr = EnglishTag ? 'LoopVertically' : '縦方向にループする';
			          const loopHorizontallyScrollTmp = `${loopHorizontallyStr}[${event.parameters[3]}]`;
			          const loopVerticallyScrollTmp = `${loopVerticallyStr}[${event.parameters[4]}]`;
			          const loopHorizontalyScroll = event.parameters[1] === true ? comma + loopHorizontallyScrollTmp : '';
			          const loopVerticallyScroll = event.parameters[2] === true ? comma + loopVerticallyScrollTmp : '';
			          const tag = EnglishTag ? '<ChangeParallax: ' : '<遠景の変更: ';
			          addNewLineIndent(indent);
			          text += tag + image + loopHorizontalyScroll + loopVerticallyScroll + '>';
			        }
			        if (event.code === 285) {
			          const variableId = event.parameters[0] + comma;
			          const infoType = getLocationInfoTypeValue(event.parameters[1]) + comma;
			          const location = getDirectOrVariablesOrCharacterValue(event.parameters[2]);
			          const mapX = event.parameters[3];
			          const mapY = event.parameters[4];
			          let locationValue = '';
			          if (event.parameters[2] === 0 || event.parameters[2] === 1) {
			            locationValue = `${location}[${mapX}][${mapY}]`;
			          } else {
			            locationValue = `${location}[${mapX}]`;
			          }
			          const tag = EnglishTag ? '<GetLocationInfo: ' : '<指定位置の情報取得: ';
			          addNewLineIndent(indent);
			          text += tag + variableId + infoType + locationValue + '>';
			        }

			        /** ********************************************** */
			        // シーン制御
			        /** ********************************************** */
			        if (event.code === 301) {
			          const troop = getFixedOrVariable(event.parameters[0], event.parameters[1]);
			          const tag = EnglishTag ? '<BattleProcessing: ' : '<戦闘の処理: ';
			          addNewLineIndent(indent);
			          text += tag + troop + '>';
			        }
			        if (event.code === 601) {
			          addNewLineIndent(indent);
			          text += EnglishTag ? '<IfWin>' + newLine : '<勝ったとき>';
			        }
			        if (event.code === 602) {
			          addNewLineIndent(indent);
			          text += EnglishTag ? '<IfEscape>' + newLine : '<逃げたとき>';
			        }
			        if (event.code === 603) {
			          addNewLineIndent(indent);
			          text += EnglishTag ? '<IfLose>' + newLine : '<負けたとき>';
			        }
			        if (event.code === 604) {
			          addNewLineIndent(indent);
			          text += EnglishTag ? '<End>' + newLine : '<分岐終了>';
			        }
			        if (event.code === 302) {
			          const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma;
			          const merchandiseId = event.parameters[1] + comma;
			          const priceValue = getStandardOrSpecifyValue(event.parameters[2], event.parameters[3]);
			          const purchaseOnly = getCheckBoxPurchaseOnlyValue(event.parameters[4]);
			          const tag = EnglishTag ? '<ShopProcessing: ' : '<ショップの処理: ';
			          addNewLineIndent(indent);
			          text += tag + purchaseOnly + '>';
			          // 一つ目の商品
			          const tag2 = EnglishTag ? '<Merchandise: ' : '<商品: ';
			          addNewLineIndent(indent);
			          text += tag2 + merchandise + merchandiseId + priceValue + '>';
			        }
			        if (event.code === 605) {
			          const merchandise = getItemOrWeaponOrArmorValue(event.parameters[0]) + comma;
			          const merchandiseId = event.parameters[1] + comma;
			          const priceValue = getStandardOrSpecifyValue(event.parameters[2], event.parameters[3]);
			          // 二つ目以降の商品
			          const tag = EnglishTag ? '<Merchandise: ' : '<商品: ';
			          addNewLineIndent(indent);
			          text += tag + merchandise + merchandiseId + priceValue + '>';
			        }
			        if (event.code === 303) {
			          const actorId = event.parameters[0] + comma;
			          const maxCharacter = event.parameters[1];
			          const tag = EnglishTag ? '<NameInputProcessing: ' : '<名前入力の処理: ';
			          addNewLineIndent(indent);
			          text += tag + actorId + maxCharacter + '>';
			        }
			        if (event.code === 351) {
			          const tag = EnglishTag ? '<OpenMenuScreen>' : '<メニュー画面を開く>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 352) {
			          const tag = EnglishTag ? '<OpenSaveScreen>' : '<セーブ画面を開く>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 353) {
			          const tag = EnglishTag ? '<GameOver>' : '<ゲームオーバー>';
			          addNewLineIndent(indent);
			          text += tag;
			        }
			        if (event.code === 354) {
			          const tag = EnglishTag ? '<ReturnToTitleScreen>' : '<タイトル画面に戻す>';
			          addNewLineIndent(indent);
			          text += tag;
			        }

			        /** ********************************************** */
			        // バトル
			        /** ********************************************** */
			        if (event.code === 331) {
			          const enemy = getEnemyTarget(event.parameters[0]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]) + comma;
			          const allowKnockout = getCheckBoxAllowKnockoutValue(event.parameters[4]);
			          const tag = EnglishTag ? '<ChangeEnemyHp: ' : '<敵キャラのHP増減: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + operation + operandValue + allowKnockout + '>';
			        }
			        if (event.code === 332) {
			          const enemy = getEnemyTarget(event.parameters[0]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]);
			          const tag = EnglishTag ? '<ChangeEnemyMp: ' : '<敵キャラのMP増減: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + operation + operandValue + '>';
			        }
			        if (event.code === 342) {
			          const enemy = getEnemyTarget(event.parameters[0]) + comma;
			          const operation = getIncreaseOrDecrease(event.parameters[1]) + comma;
			          const operandValue = getConstantOrVariable(event.parameters[2], event.parameters[3]);
			          const tag = EnglishTag ? '<ChangeEnemyTp: ' : '<敵キャラのTP増減: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + operation + operandValue + '>';
			        }
			        if (event.code === 333) {
			          const enemy = getEnemyTarget(event.parameters[0]) + comma;
			          const operation = getAddOrRemove(event.parameters[1]) + comma;
			          const stateId = event.parameters[2];
			          const tag = EnglishTag ? '<ChangeEnemyState: ' : '<敵キャラのステート変更: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + operation + stateId + '>';
			        }
			        if (event.code === 334) {
			          const enemy = getEnemyTarget(event.parameters[0]);
			          const tag = EnglishTag ? '<EnemyRecoverAll: ' : '<敵キャラの全回復: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + '>';
			        }
			        if (event.code === 335) {
			          const enemy = getEnemyTarget(event.parameters[0]);
			          const tag = EnglishTag ? '<EnemyAppear: ' : '<敵キャラの出現: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + '>';
			        }
			        if (event.code === 336) {
			          const enemy = getEnemyTarget(event.parameters[0]) + comma;
			          const enemyId = event.parameters[1];
			          const tag = EnglishTag ? '<EnemyTransform: ' : '<敵キャラの変身: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + enemyId + '>';
			        }
			        if (event.code === 337) {
			          const enemy = getEnemyTarget2(event.parameters[0], event.parameters[2]) + comma;
			          const animationId = event.parameters[1];
			          const tag = EnglishTag ? '<ShowBattleAnimation: ' : '<戦闘アニメーションの表示: ';
			          addNewLineIndent(indent);
			          text += tag + enemy + animationId + '>';
			        }
			        if (event.code === 339) {
			          const subjectValue = getEnemyOrActor(event.parameters[0], event.parameters[1]) + comma;
			          const skillId = event.parameters[2] + comma;
			          const target = getActionTarget(event.parameters[3]);
			          const tag = EnglishTag ? '<ForceAction: ' : '<戦闘行動の強制: ';
			          addNewLineIndent(indent);
			          text += tag + subjectValue + skillId + target + '>';
			        }
			        if (event.code === 340) {
			          const tag = EnglishTag ? '<AbortBattle>' : '<バトルの中断>';
			          addNewLineIndent(indent);
			          text += tag;
			        }

			        /** ********************************************** */
			        // 上級
			        /** ********************************************** */
			        // スクリプトタグはindentを入れない(取り込み時におかしくなる)
			        if (event.code === 355) {
			          const scriptText = event.parameters[0] + newLine;
			          const tag = EnglishTag ? '<Script>' + newLine : '<スクリプト>' + newLine;
			          const tagEnd = EnglishTag ? '</Script>' + newLine : '</スクリプト>' + newLine;
			          addNewLineIndent(indent);
			          text += tag + scriptText + tagEnd;
			        }
			        if (event.code === 655) {
			          const scriptText = event.parameters[0] + newLine;
			          const tagEnd = EnglishTag ? '</Script>' + newLine : '</スクリプト>' + newLine;
			          if (text.endsWith(tagEnd)) {
			            const tagEndDeleteText = text.slice(0, -1 * (tagEnd.length + 1)) + newLine;
			            const tmpText = tagEndDeleteText + scriptText + tagEnd;
			            addNewLineIndent(indent);
			            text = tmpText;
			          }
			        }
			        // プラグインコマンド(MV)
			        if (event.code === 356) {
			          const pluginText = event.parameters[0];
			          const tag = EnglishTag ? '<PluginCommand: ' : '<プラグインコマンド: ';
			          addNewLineIndent(indent);
			          text += tag + pluginText + '>';
			        }
			        // プラグインコマンド(MZ)
			        if (event.code === 357) {
			          const pluginName = event.parameters[0] + comma;
			          const functionName = event.parameters[1] + comma;
			          const commandName = event.parameters[2];
			          let nameValueList = '';
			          for (const name in event.parameters[3]) {
			            const value = `[${event.parameters[3][name]}]`;
			            nameValueList += comma + `${name}${value}`;
			          }
			          nameValueList = nameValueList === undefined ? '' : nameValueList;
			          const tag = EnglishTag ? '<PluginCommandMZ: ' : '<プラグインコマンドMZ: ';
			          addNewLineIndent(indent);
			          text += tag + pluginName + functionName + commandName + nameValueList + '>';
			        }

			        // プラグインコマンド(MZ)注釈
			        if (event.code === 657) {
			          const parameters = event.parameters[0];
			          const splitParameters = parameters.split(' ');
			          const outParameters = `[${splitParameters[0]}]`;
			          const lastIndex = text.lastIndexOf('\n<');
			          const extractedText = text.substring(lastIndex + 1);
			          text = text.substring(0, lastIndex);

			          // 各引数に対して注釈を付け加える
			          mzCount++;
			          const parametersNum = 2 + mzCount;
			          // 357で出力したタグを,区切りで取得
			          const splitVal = parseMzArg(extractedText);
			          if (splitVal[parametersNum].endsWith('>')) {
			            // 最後の引数の場合は>が含まれている為、削除してから付け足す
			            splitVal[parametersNum] = splitVal[parametersNum].slice(0, -1) + outParameters + '>';
			          } else {
			            splitVal[parametersNum] = splitVal[parametersNum] + outParameters;
			          }
			          splitVal[parametersNum] = splitVal[parametersNum].replace(/\n/g, '\\n');
			          addNewLineIndent(indent);
			          text += splitVal;
			        } else {
			          // プラグインコマンドMZのイベントが終わったらカウントを0にする
			          mzCount = 0;
			        }
			      });
			      return text
			    };

			    // 書き出し主体のバージョン(リリース時に package.json と揃えて更新する)。
			    // 書き出したテキストのフロントマターに generator: text2frame-mv@<VERSION> として埋める。
			    const VERSION = '2.3.0';

			    // 書き出したテキストに載せる front matter(YAMLヘッダ)を生成する。
			    const renderFrontMatter = function (entry, kind) {
			      const lines = ['---'];
			      // 値が無いキーは書かない("mapId: undefined" のような行を出さない)。
			      const put = function (k, v) { if (v !== undefined && v !== null && String(v) !== '') lines.push(k + ': ' + String(v)); };
			      lines.push('generator: text2frame-mv@' + VERSION);
			      lines.push('kind: ' + kind);
			      if (kind === 'event') {
			        put('mapId', entry.mapId);
			        put('eventId', entry.eventId);
			        lines.push('pageId: ' + String(entry.pageId || '1'));
			      } else {
			        put('commonEventId', entry.commonEventId);
			      }
			      if (entry.locale) lines.push('locale: ' + String(entry.locale));
			      if (entry.key) lines.push('key: ' + String(entry.key));
			      lines.push('---\n\n');
			      return lines.join('\n')
			    };

			    // data ディレクトリを走査し、出力対象(イベント/コモンイベント)の routing メタだけを返す。
			    // textPath/locale は付けない(呼び出し側が textBase/locale/key.txt を組み立てる)。
			    const enumerateTargets = function (dataDir) {
			      const _fs = require$$1$1;
			      const _path = require$$0$1;
			      const targets = [];
			      _fs.readdirSync(dataDir).filter(function (f) { return /^Map\d+\.json$/.test(f) }).sort().forEach(function (fileName) {
			        const m = fileName.match(/^Map(\d+)\.json$/);
			        if (!m) return
			        const mapId = String(parseInt(m[1], 10));
			        const mapData = JSON.parse(_fs.readFileSync(_path.join(dataDir, fileName), 'utf8'));
			        if (!mapData.events || !Array.isArray(mapData.events)) return
			        mapData.events.forEach(function (event, eventIndex) {
			          if (!event || !event.pages || !Array.isArray(event.pages)) return
			          event.pages.forEach(function (page, pageIndex) {
			            const pageId = String(pageIndex + 1);
			            const key = 'map' + mapId.padStart(3, '0') + '_event' + String(eventIndex).padStart(3, '0') + '_page' + pageId;
			            targets.push({ kind: 'event', mapId, eventId: String(eventIndex), pageId, key });
			          });
			        });
			      });
			      const commonPath = _path.join(dataDir, 'CommonEvents.json');
			      if (_fs.existsSync(commonPath)) {
			        const commonData = JSON.parse(_fs.readFileSync(commonPath, 'utf8'));
			        if (Array.isArray(commonData)) {
			          commonData.forEach(function (ce, index) {
			            if (!ce) return
			            targets.push({ kind: 'common', commonEventId: String(index), key: 'common' + String(index).padStart(3, '0') });
			          });
			        }
			      }
			      return targets
			    };

			    Laurus.Frame2Text.export = { decompile, VERSION, enumerateTargets, renderFrontMatter };
			    if (Laurus.Frame2Text.ExecMode === 'LIBRARY_EXPORT') {
			      return
			    }

			    // MERGE pull(ゲーム→テキスト。翻訳を残しつつゲーム変更を取り込む)。
			    // push の 3-way を鏡写しにし、Text2Frame.applyMergePull で結果テキストを得る。
			    if (Laurus.Frame2Text.ExecMode === 'MERGE_EVENT_TO_MESSAGE' || Laurus.Frame2Text.ExecMode === 'MERGE_CE_TO_MESSAGE') {
			      const isCE = Laurus.Frame2Text.ExecMode === 'MERGE_CE_TO_MESSAGE';
			      const T2F = resolveText2Frame();
			      if (!T2F || !T2F.applyMergePull) { throw new Error('取り出し(merge)には Text2Frame プラグインが必要です。同じプロジェクトに導入してください。 / MERGE pull requires the Text2Frame plugin to be loaded.') }
			      const stripFM = function (t) {
			        const n = String(t).replace(/\r\n/g, '\n');
			        if (n.indexOf('---\n') !== 0) return t
			        const e = n.indexOf('\n---\n', 4);
			        return e < 0 ? t : n.slice(e + 5)
			      };
			      const headerFM = function (t) {
			        const n = String(t).replace(/\r\n/g, '\n');
			        if (n.indexOf('---\n') !== 0) return null
			        const e = n.indexOf('\n---\n', 4);
			        return e < 0 ? null : n.slice(0, e + 5)
			      };
			      let gameCommands;
			      if (isCE) {
			        const ce = readJsonData(Laurus.Frame2Text.CommonEventPath);
			        if (ce.length - 1 < Laurus.Frame2Text.CommonEventID) {
			          throw new Error('Common Event not found. / コモンイベントが見つかりません。: ' + Laurus.Frame2Text.CommonEventID)
			        }
			        gameCommands = ce[Laurus.Frame2Text.CommonEventID].list;
			      } else {
			        const md = readJsonData(Laurus.Frame2Text.MapPath);
			        if (!md.events[Laurus.Frame2Text.EventID]) {
			          throw new Error('EventID not found. / EventIDが見つかりません。\n' + 'Event ID: ' + Laurus.Frame2Text.EventID)
			        }
			        const pageID = Number(Laurus.Frame2Text.PageID) - 1;
			        if (!md.events[Laurus.Frame2Text.EventID].pages[pageID]) {
			          throw new Error('PageID not found. / PageIDが見つかりません。\n' + 'Page ID: ' + Laurus.Frame2Text.PageID)
			        }
			        gameCommands = md.events[Laurus.Frame2Text.EventID].pages[pageID].list;
			      }
			      const outPath = Laurus.Frame2Text.TextPath;
			      let existingText = '';
			      try { existingText = readText(outPath); } catch (e) { existingText = ''; }
			      const root = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : '.';
			      const id = T2F.deriveBaseId(outPath, {});
			      let baseBody = '';
			      if (Laurus.Frame2Text.BasePath) {
			        try { baseBody = stripFM(readText(Laurus.Frame2Text.BasePath)); } catch (e) { baseBody = ''; }
			      } else {
			        const bt = T2F.readBaseText(root, id.locale, id.key);
			        if (bt) baseBody = stripFM(bt);
			      }
			      const englishTag = String(Laurus.Frame2Text.EnglishTag) !== 'false';
			      const r = T2F.applyMergePull({ gameCommands, textBody: existingText ? stripFM(existingText) : '', baseBody, englishTag });
			      const header = (existingText && headerFM(existingText)) || ('---\ngenerator: text2frame-mv@' + VERSION + '\nkind: ' + (isCE ? 'common' : 'event') + '\n' + (isCE ? ('commonEventId: ' + Laurus.Frame2Text.CommonEventID) : ('mapId: ' + Laurus.Frame2Text.MapID + '\neventId: ' + Laurus.Frame2Text.EventID + '\npageId: ' + (Laurus.Frame2Text.PageID || '1'))) + '\n---\n');
			      const written = header + '\n' + r.text + '\n';
			      try { const _p = require('path'); require('fs').mkdirSync(_p.dirname(outPath), { recursive: true }); } catch (e) {}
			      writeData(outPath, written);
			      try { T2F.saveBaseText(root, id.locale, id.key, written); } catch (e) {}
			      if (r.conflicts) { logger.error('[merge-pull] ' + r.conflicts + ' conflict(s) kept both / 衝突を両方残しました: ' + outPath); }
			      return
			    }

			    // BATCH_EXPORT_MESSAGES_TO_FOLDER: data ディレクトリを走査し front matter 付きで一括出力する。
			    if (Laurus.Frame2Text.ExecMode === 'BATCH_EXPORT_MESSAGES_TO_FOLDER') {
			      if (typeof commonjsRequire === 'undefined') {
			        addMessage('[batch-export] Node.js environment not available');
			        return
			      }
			      const _path = require$$0$1;
			      const _fs = require$$1$1;
			      const dataDir = _path.isAbsolute(Laurus.Frame2Text.DataDir) ? Laurus.Frame2Text.DataDir : _path.resolve(BASE_PATH, Laurus.Frame2Text.DataDir);
			      const locale = Laurus.Frame2Text.Locale;
			      const textBase = Laurus.Frame2Text.TextBase;
			      const englishTag = String(Laurus.Frame2Text.EnglishTag) !== 'false';
			      let okCount = 0;
			      let errCount = 0;
			      // 取り出し直後は text==game。その内容を次回反映の 3-way 祖先として保存する。
			      let _baseSaveError = null;
			      const _baseRoot = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : BASE_PATH;

			      const outDir = _path.resolve(BASE_PATH, textBase, locale);
			      if (!_fs.existsSync(outDir)) { _fs.mkdirSync(outDir, { recursive: true }); }
			      // 既存 dir への mkdirSync は一部ランタイム(NW.js)で EEXIST を投げるため existsSync でガード。
			      const _baseDir = _path.join(_baseRoot, '.t2f-base', String(locale || 'default'));
			      try { if (!_fs.existsSync(_baseDir)) _fs.mkdirSync(_baseDir, { recursive: true }); } catch (e) { _baseSaveError = _baseSaveError || e; }

			      enumerateTargets(dataDir).forEach(function (t) {
			        try {
			          let list = [];
			          if (t.kind === 'event') {
			            const mapData = JSON.parse(_fs.readFileSync(_path.join(dataDir, 'Map' + ('000' + String(t.mapId)).slice(-3) + '.json'), 'utf8'));
			            list = mapData.events[Number(t.eventId)].pages[Number(t.pageId) - 1].list || [];
			          } else {
			            const ceData = JSON.parse(_fs.readFileSync(_path.join(dataDir, 'CommonEvents.json'), 'utf8'));
			            list = ceData[Number(t.commonEventId)].list || [];
			          }
			          const body = decompile(list, englishTag, { pretty: true });
			          const fm = renderFrontMatter(Object.assign({ locale }, t), t.kind);
			          const outPath = _path.resolve(BASE_PATH, textBase, locale, t.key + '.txt');
			          _fs.writeFileSync(outPath, fm + body + '\n', 'utf8');
			          try { _fs.writeFileSync(_path.join(_baseDir, t.key + '.txt'), fm + body + '\n', 'utf8'); } catch (e) { _baseSaveError = _baseSaveError || e; }
			          okCount++;
			        } catch (e) {
			          errCount++;
			          console.error('[batch-export] ' + t.key + ': ' + String(e));
			        }
			      });
			      if (_baseSaveError) {
			        addMessage('[batch-export] 警告: .t2f-base の祖先を保存できませんでした (' + (_baseSaveError.message || _baseSaveError) + ')。次回反映は overlay に縮退します。');
			        console.warn('[batch-export] WARNING: .t2f-base ancestor NOT saved (' + (_baseSaveError.message || _baseSaveError) + '); next import falls back to overlay.');
			      }
			      addMessage('[batch-export] Completed: ' + okCount + ' success, ' + errCount + ' errors');
			      console.log('[batch-export] Completed: ' + okCount + ' success, ' + errCount + ' errors');
			      return
			    }

			    /** ******************************* */
			    // エクスポートモード: 全体を上書き
			    /** ******************************* */
			    const isCEExport = Laurus.Frame2Text.ExecMode === 'EXPORT_CE_TO_MESSAGE' ||
			      Laurus.Frame2Text.ExecMode === 'コモンイベントをメッセージにエクスポート';
			    const exportKind = isCEExport ? 'common' : 'event';
			    // CLI は --input_path で map ファイルを直接指定するため MapID が無い。パス名から補う。
			    const exportMapId = Laurus.Frame2Text.MapID || (function () {
			      const m = String(Laurus.Frame2Text.MapPath || '').match(/Map(\d+)\.json$/i);
			      return m ? String(parseInt(m[1], 10)) : undefined
			    })();
			    const exportEntry = isCEExport
			      ? { commonEventId: Laurus.Frame2Text.CommonEventID }
			      : { mapId: exportMapId, eventId: Laurus.Frame2Text.EventID, pageId: Laurus.Frame2Text.PageID };
			    const outputText = renderFrontMatter(exportEntry, exportKind) +
			      decompile(map_events, EnglishTag, { pretty: true }) + '\n';

			    /** ********************************************** */
			    // txtファイルを出力
			    /** ********************************************** */
			    writeData(Laurus.Frame2Text.TextPath, outputText);
			    // 取り出し直後は text==game。overwrite でも次回反映の 3-way 祖先を更新する。
			    try {
			      const _T2Fx = resolveText2Frame();
			      if (_T2Fx && _T2Fx.saveBaseText && _T2Fx.deriveBaseId) {
			        const _root = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : BASE_PATH;
			        const _id = _T2Fx.deriveBaseId(Laurus.Frame2Text.TextPath, {});
			        _T2Fx.saveBaseText(_root, _id.locale, _id.key, outputText);
			      }
			    } catch (e) { /* best effort */ }

			    /** ********************************************** */
			    // 出力メッセージ
			    /** ********************************************** */
			    const actionWord = 'Exported to';
			    const actionWordJa = 'にエクスポートしました';
			    const EnglishMessage = `${actionWord} ${Laurus.Frame2Text.TextPath}`;
			    const JapaneseMessage = `${Laurus.Frame2Text.TextPath} ${actionWordJa}`;
			    addMessage(EnglishMessage + '\n' + JapaneseMessage);
			    console.log(EnglishMessage + '\n' + JapaneseMessage);
			  };

			  // export convert func.
			  Game_Interpreter.prototype.pluginCommandFrame2Text('LIBRARY_EXPORT', [0]);
			  {
			    module.exports = Laurus.Frame2Text.export;
			  }
			})();

			// developer mode
			if (typeof commonjsRequire !== 'undefined' && typeof require.main !== 'undefined' && require.main === module) {
			  const { Command } = requireCommander();
			  const fs = require$$1$1;
			  const path = require$$0$1;

			  const program = new Command();
			  program
			    .version('2.3.0')
			    .usage('[options]')
			    .option('-m, --mode <map|common|decompile|test|batch-export>', 'output mode', /^(map|common|decompile|test|batch-export)$/i)
			    .option('-i, --input_path <name>', 'input map data path')
			    .option('-o, --output_path <name>', 'output file path')
			    .option('-e, --event_id <name>', 'event file id')
			    .option('-p, --page_id <name>', 'page id', '1')
			    .option('-c, --common_event_id <name>', 'common event id')
			    .option('-d, --data-dir <dir>', 'game data directory', 'data')
			    .option('-l, --locale <locale>', 'output language subfolder (batch-export)', 'ja')
			    .option('-t, --text-base <dir>', 'text base output directory (batch-export)', 'text')
			    .option('-v, --verbose', 'debug mode', false)
			    .option('-w, --english_tag <true/false>', 'english tag', 'true')
			    .option('-s, --strategy <merge|overwrite>', 'pull strategy (default merge: keep translations; overwrite: replace)', /^(merge|overwrite)$/i, 'merge')
			    .option('-b, --base <path>', 'ancestor text path for merge (optional; auto .t2f-base when omitted)')
			    .parse();

			  const help_text = `
===== Manual =====
    NAME
       Frame2Text - Simple decompiler to convert event to text.
    SYNOPSIS
        node Frame2Text.js
        node Frame2Text.js --mode batch-export --data-dir <RPG Maker Project Dir>/data
        node Frame2Text.js --mode map --input_path <map json file path> --output_path <output file path> --event_id <event id> --page_id <page id>
        node Frame2Text.js --mode common --input_path <map json file path> --common_event_id <common event id> --output_path <output file path>
        node Frame2Text.js --mode test
    DESCRIPTION
        node Frame2Text.js --mode batch-export --data-dir ./data
          イベントの一括変換モードです。
          PRGツクールのdataディレクトリを読み込み、 text/ja に書き出すコマンド例は以下です。
          例1：$ node Frame2Text.js --mode batch-export --data-dir ./data
          例2：$ node Frame2Text.js -m batch-export -d ./data

        node Frame2Text.js --mode map --input_path <map json file path> --output_path <output file path> --event_id <event id> --page_id <page id>
          マップイベントのテキスト出力モードです。
          読み込むマップファイル、出力テキストファイル、イベントID、ページIDを指定します。
          test/expected_basic.json を読み込み、 test/tmp.txt に書き出すコマンド例は以下です。

          例1：$ node Frame2Text.js --mode map --input_path test/expected_basic.json --output_path test/tmp.txt --event_id 1 --page_id 1
          例2：$ node Frame2Text.js -m map -i test/expected_basic.json -o test/tmp.txt -e 1 -p 1

        node Frame2Text.js --mode common --input_path <map json file path> --common_event_id <common event id> --output_path <output file path>
          コモンイベントへのテキスト出力モードです。
          読み込むコモンイベントファイル、出力テキストイベント、コモンイベントIDを引数で指定します。
          data/CommonEvents.json を読み込み、 test/tmp.txt に上書きするコマンド例は以下です。

          例1：$ node Frame2Text.js --mode common --input_path data/CommonEvents.json --common_event_id 1 --output_path test/tmp.txt
          例2：$ node Frame2Text.js -m common -i data/CommonEvents.json -c 1 -o test/tmp.txt

        node Frame2Text.js --mode decompile
           デコンパイルモードです。
           変換したいイベントをパイプで与えると、対応したテキストファイルに変換し、標準出力に出力します。
           このモードでは、Map.json / CommonEvent.json 単位で変換され、イベントやページ番号は無視されます。
           例1: $ cat data/Map001.json | node Frame2Text.js --mode decompile
`;

			  program.addHelpText('after', help_text);
			  const options = program.opts();

			  if (!['map', 'common', 'decompile', 'test', 'batch-export'].includes(options.mode)) {
			    program.help();
			    process.exit(0);
			  }

			  const _pullOverwrite = String(options.strategy).toLowerCase() === 'overwrite';
			  if (options.mode === 'map') {
			    const Frame2Text = {
			      MapID: options.map_id,
			      EventID: options.event_id,
			      PageID: options.page_id,
			      TextPath: options.output_path,
			      FileName: options.output_path,
			      MapPath: options.input_path,
			      CommonEventPath: options.input_path,
			      CommonEventID: options.common_event_id,
			      EnglishTag: options.english_tag,
			      BasePath: options.base,
			      ExecMode: _pullOverwrite ? 'EXPORT_EVENT_TO_MESSAGE' : 'MERGE_EVENT_TO_MESSAGE'
			    };
			    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', [Frame2Text]);
			  } else if (options.mode === 'common') {
			    const Frame2Text = {
			      MapID: options.map_id,
			      EventID: options.event_id,
			      PageID: options.page_id,
			      TextPath: options.output_path,
			      FileName: options.output_path,
			      MapPath: options.input_path,
			      CommonEventPath: options.input_path,
			      CommonEventID: options.common_event_id,
			      EnglishTag: options.english_tag,
			      BasePath: options.base,
			      ExecMode: _pullOverwrite ? 'EXPORT_CE_TO_MESSAGE' : 'MERGE_CE_TO_MESSAGE'
			    };
			    Game_Interpreter.prototype.pluginCommandFrame2Text('COMMAND_LINE', [Frame2Text]);
			  } else if (options.mode === 'decompile') {
			    process.stdin.setEncoding('utf8');
			    let data = '';
			    process.stdin.on('readable', () => {
			      let chunk;
			      while ((chunk = process.stdin.read()) !== null) {
			        data += chunk;
			      }
			    });
			    process.stdin.on('end', () => {
			      JSON.parse(data).events.filter(event => event !== null).forEach(function (event) {
			        event.pages.forEach(function (p) {
			          console.log(module.exports.decompile(p.list));
			        });
			      });
			    });
			  } else if (options.mode === 'test') {
			    const folder_name = 'test';
			    const file_name = 'frame2text.txt';
			    const map_id = '1';
			    const event_id = '1';
			    const page_id = '1';
			    Game_Interpreter.prototype.pluginCommandFrame2Text('EXPORT_EVENT_TO_MESSAGE', [
			      folder_name,
			      file_name,
			      map_id,
			      event_id,
			      page_id
			    ]);
			  } else if (options.mode === 'batch-export') {
			    const dataDir = path.resolve(options.dataDir);
			    if (!fs.existsSync(dataDir)) {
			      throw new Error('Data directory not found: ' + dataDir)
			    }
			    const locale = options.locale;
			    const textBaseDir = options.textBase;
			    const englishTag = String(options.english_tag) === 'true';
			    // 取り出し直後は text==game。その内容を次回反映の 3-way 祖先として保存する(既存 dir は existsSync でガード)。
			    let baseSaveError = null;
			    const baseRoot = process.cwd();
			    const baseDir = path.join(baseRoot, '.t2f-base', String(locale || 'default'));
			    try { if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true }); } catch (e) { baseSaveError = baseSaveError || e; }
			    const results = [];
			    module.exports.enumerateTargets(dataDir).forEach(function (t) {
			      try {
			        let list = [];
			        if (t.kind === 'event') {
			          const mapData = JSON.parse(fs.readFileSync(path.join(dataDir, 'Map' + ('000' + String(t.mapId)).slice(-3) + '.json'), 'utf8'));
			          list = mapData.events[Number(t.eventId)].pages[Number(t.pageId) - 1].list || [];
			        } else {
			          const ceData = JSON.parse(fs.readFileSync(path.join(dataDir, 'CommonEvents.json'), 'utf8'));
			          list = ceData[Number(t.commonEventId)].list || [];
			        }
			        const body = module.exports.decompile(list, englishTag, { pretty: true });
			        const frontMatter = module.exports.renderFrontMatter(Object.assign({ locale }, t), t.kind);
			        const textPath = path.resolve(textBaseDir, locale, t.key + '.txt');
			        fs.mkdirSync(path.dirname(textPath), { recursive: true });
			        fs.writeFileSync(textPath, frontMatter + body + '\n', 'utf8');
			        try { fs.writeFileSync(path.join(baseDir, t.key + '.txt'), frontMatter + body + '\n', 'utf8'); } catch (e) { baseSaveError = baseSaveError || e; }
			        results.push({ ok: true, textPath });
			      } catch (error) {
			        results.push({ ok: false, key: t.key, error: error.message });
			      }
			    });
			    const failures = results.filter(function (r) { return !r.ok });
			    console.log(JSON.stringify({ total: results.length, failed: failures.length, results }, null, 2));
			    if (baseSaveError) {
			      console.warn('[batch-export] WARNING: .t2f-base の祖先を保存できませんでした (' + (baseSaveError.message || baseSaveError) +
			        ')。テキストは書き出せていますが、次回 --mode batch は overlay に縮退します（3-wayになりません）。/ ' +
			        'ancestor NOT saved; next import falls back to overlay.');
			    }
			    if (failures.length > 0) {
			      process.exitCode = 1;
			    }
			  }
			} 
		} (Frame2Text));
		return Frame2Text.exports;
	}

	var hasRequiredText2Frame;

	function requireText2Frame () {
		if (hasRequiredText2Frame) return Text2Frame$1.exports;
		hasRequiredText2Frame = 1;
		(function (module) {
			//= ============================================================================
			// Text2Frame.js
			// ----------------------------------------------------------------------------
			// (C)2018-2024 Yuki Katsura
			// This software is released under the MIT License.
			// http://opensource.org/licenses/mit-license.php
			// ----------------------------------------------------------------------------
			// Version
			// 2.3.0:
			// ・テキストの反映に「統合(merge)」を追加。RPGツクール上のUI編集(移動・分岐・スイッチ等)を壊さずに、テキストで行った編集をゲームへ反映できるようになりました(既定)。従来の「上書き(overwrite)」も選べます。
			// ・一括反映・一括取り出しコマンドを追加。すべてのイベント・コモンイベントを、1つのコマンドでゲームとテキストの間で同期できるようになりました。
			// ・Visual Studio Code 拡張に対応。反映・取り出し・英語化をUIから実行でき、シンタックスハイライトや保存時自動反映(Watch & Deploy)を利用できます。
			// ・不具合を修正し、安定性を向上しました。
			// 2.2.4 2024/10/06:
			// ・#126 プロジェクトを本番用にデプロイメント後、プラグインを実行しようとすると警告メッセージを表示するように改善
			// 2.2.3 2024/09/07:
			// ・#125 プラグインコマンドMZを変換する際、オブジェクト型を取り扱えない不具合の修正
			// 2.2.2 2024/02/27:
			// ・#123 ピクチャの表示・移動において基点の座標にマイナスを設定できない不具合を修正
			// 2.2.1 2024/01/08:
			// ・#117 中核の変換処理をESModule化し、compile関数を通じて外部のJavascriptプログラムから呼び出せるようにリファクタ
			//   - コマンドライン上で、パイプでテキストファイルを受け取って、標準出力へイベントに変換されたJSONを書き出すcompileモードの追加
			// ・#119 プラグインをオンにしたまま、公開モードで書き出した際に、ゲームが起動しない不具合の修正
			// ・#120 グローバル領域へ染み出していた関数・変数を隠蔽し、他Pluginとの衝突を修正
			// 2.2.0 2023/12/08:
			// ・#102 未実装の全てのタグ追加
			// ・#112 選択肢の表示において、デフォルトの選択肢をNoneまたはなしに設定してかつ、選択肢をキャンセルした時の処理に選択肢番号を整数で指定している場合に、選択肢をキャンセルした時の処理が設定されない不具合の修正
			// ・#113 ピクチャの表示やピクチャの移動において、幅・高さ・不透明度に0を設定すると誤って255に変換されてしまう不具合の修正
			// 2.1.0 2023/03/24: タグ追加
			// ・数値入力の処理タグ追加
			// ・アイテム選択の処理タグ追加
			// ・文章のスクロール表示タグ追加
			// ・選択肢の表示タグ追加
			// 2.0.1 2023/02/01: 不具合修正
			// ・#83 変数やスイッチ操作タグを使用する際、操作の対象が1つだけのときかつ
			//   操作対象が2桁以上の番号の場合、意図しない範囲指定の操作に変換される不具合の修正
			// 2.0.0 2020/12/06: ツクールMZに対応
			// ・ツクールMZ仕様のプラグインコマンドの定義
			// ・取り込み先にページ番号を設定する機能の追加
			// ・実行時のメッセージ表示ON・OFFを切り替えるプラグインオプションの追加
			// ・MZ用のネームボックス機能の追加
			// ・MZ用のピクチャ移動(イージング)の追加
			// ・MZ用の変数操作(直前の情報)の追加
			// ・MZ用の条件分岐条件(タッチ・マウス操作)の追加
			// ・MZ用プラグインコマンドタグの追加
			// ・日本語表現に誤りがあったので、正しいものを追加(エネミー->敵キャラ, スタート->始動, ストップ->停止)
			// 1.4.1 2020/08/16: 文法エラー時に行数を表示する機能を削除
			// 1.4.0 2020/08/14:
			// ・条件分岐タグ追加
			// ・ループタグ追加
			// ・ループの中断タグ追加
			// ・イベント処理の中断タグ追加
			// ・ラベルの設定タグ追加
			// ・ラベルジャンプタグ追加
			// 1.3.0 2020/08/09:
			// ・ピクチャの表示タグ追加
			// ・ピクチャの移動タグ追加
			// ・ピクチャの回転タグ追加
			// ・ピクチャの色調変更タグ追加
			// ・ピクチャの消去タグ追加
			// 1.2.0 2020/06/15:
			// ・スイッチの操作タグ追加
			// ・変数の操作タグ追加
			// ・セルフスイッチの操作タグ追加
			// ・タイマーの操作タグ追加
			// ・バグの修正
			// ・ヘルプ文のレイアウト修正
			// 1.1.2 2019/01/03 PlayME, StopMEタグ追加
			// 1.1.1 2019/01/02 StopBGM, StopBGSタグ追加
			// 1.1.0 2018/10/15 script,wait,fadein,fadeout,comment,PluginCommand,CommonEventタグ追加
			// 1.0.2 2018/09/10 translate REAMDE to eng(Partial)
			// 1.0.1 2018/09/06 bug fix オプションパラメータ重複、CRLFコード対応
			// 1.0.0 2018/09/02 Initial Version
			// 0.5.5 2018/11/18 [draft] PlaySE、StopSEタグ対応
			// 0.5.4 2018/10/28 [draft] ChangeBattleBGMタグ対応
			// 0.5.3 2018/10/28 [draft] PlayBGS, FadeoutBGSタグ対応
			// 0.5.2 2018/10/28 [draft] refactor pretext, text_frame, command_bottom
			// 0.5.1 2018/10/28 [draft] PlayBGM, FadeoutBGM, SaveBGM, ReplayBGMタグ対応
			// 0.4.2 2018/09/29 [draft] waitタグ対応、フェードイン、アウトタグ対応
			// 0.4.1 2018/09/27 [draft] commentタグ対応
			// 0.4.0 2018/09/24 [draft] scriptタグ対応、Plugin Command対応、Common Event対応
			// 0.3.3 2018/08/28 コメントアウト記号の前、行頭に任意個の空白を認めるように変更
			// 0.3.2 2018/08/28 MapIDをIntegerへ変更
			// 0.3.1 2018/08/27 CE書き出し追加
			// 0.3.0 2018/08/26 機能が増えた
			// 0.2.0 2018/08/24 機能テスト版
			// 0.1.0 2018/08/18 最小テスト版
			// ----------------------------------------------------------------------------
			// [Twitter]: https://twitter.com/kryptos_nv/
			// [GitHub] : https://github.com/yktsr/
			//= ============================================================================

			/* eslint-disable spaced-comment */
			/*:
			 * @target MZ
			 * @plugindesc テキストファイル(.txtファイルなど)から「文章の表示」イベントコマンドに簡単に変換するための、開発支援プラグインです。ツクールMV・MZの両方に対応しています。
			 * @author Yuki Katsura, えーしゅん
			 * @url https://raw.githubusercontent.com/yktsr/Text2Frame-MV/master/Text2Frame.js
			 *
			 * @command IMPORT_MESSAGE_TO_EVENT
			 * @text イベントに上書きインポート
			 * @desc テキストを正としてイベントへ反映します(strategy=overwrite相当)。既定は末尾追加、IsOverwrite=trueで全置換です。UI編集を残したい場合はMERGEを使ってください。
			 *
			 * @arg FileFolder
			 * @text 取り込み元フォルダ名
			 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み元ファイル名
			 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg MapID
			 * @text 取り込み先マップID
			 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @arg EventID
			 * @text 取り込み先イベントID
			 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。
			 * @type number
			 * @default 2
			 *
			 * @arg PageID
			 * @text 取り込み先ページID
			 * @desc 取り込み先となるページのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @arg IsOverwrite
			 * @text 【取り扱い注意】上書きする
			 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
			 * @type select
			 * @option true(!!!上書きする!!!)
			 * @value true
			 * @option false(上書きしない)
			 * @value false
			 * @default false
			 *
			 * @command IMPORT_MESSAGE_TO_CE
			 * @text コモンイベントに上書きインポート
			 * @desc テキストを正としてコモンイベントへ反映します(strategy=overwrite相当)。既定は末尾追加、IsOverwrite=trueで全置換です。UI編集を残したい場合はMERGEを使ってください。
			 *
			 * @arg FileFolder
			 * @text 取り込み元フォルダ名
			 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み元ファイル名
			 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg CommonEventID
			 * @text 取り込み先コモンイベントID
			 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。
			 * @type common_event
			 * @default 1
			 *
			 * @arg IsOverwrite
			 * @text 【取り扱い注意】上書きする
			 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
			 * @type select
			 * @option true(!!!上書きする!!!)
			 * @value true
			 * @option false(上書きしない)
			 * @value false
			 * @default false
			 *
			 * @command MERGE_MESSAGE_TO_EVENT
			 * @text イベントにマージ
			 * @desc 既存イベントを保ちつつテキストを賢く反映します。祖先(任意)があれば3wayマージ(衝突は両方残す)、無ければ会話のみ差し替え、空イベントはそのまま新規反映します。
			 *
			 * @arg FileFolder
			 * @text 取り込み元フォルダ名
			 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み元ファイル名
			 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg MapID
			 * @text 取り込み先マップID
			 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @arg EventID
			 * @text 取り込み先イベントID
			 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。
			 * @type number
			 * @default 2
			 *
			 * @arg PageID
			 * @text 取り込み先ページID
			 * @desc 取り込み先となるページのIDを設定します。デフォルト値は1です。
			 * @type number
			 * @default 1
			 *
			 * @arg BaseFolder
			 * @text 祖先フォルダ名(任意)
			 * @desc 3wayマージの共通祖先テキストのフォルダ名。空なら会話のみ差し替え(overlay)に縮退します。
			 * @type string
			 * @default
			 *
			 * @arg BaseFileName
			 * @text 祖先ファイル名(任意)
			 * @desc 共通祖先テキストのファイル名。BaseFolderと両方指定した場合のみ3wayマージになります。
			 * @type string
			 * @default
			 *
			 * @command MERGE_MESSAGE_TO_CE
			 * @text コモンイベントにマージ
			 * @desc 既存コモンイベントを保ちつつテキストを賢く反映します。祖先(任意)があれば3wayマージ(衝突は両方残す)、無ければ会話のみ差し替え、空なら新規反映します。
			 *
			 * @arg FileFolder
			 * @text 取り込み元フォルダ名
			 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg FileName
			 * @text 取り込み元ファイル名
			 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。
			 * @type string
			 * @default message.txt
			 *
			 * @arg CommonEventID
			 * @text 取り込み先コモンイベントID
			 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。
			 * @type common_event
			 * @default 1
			 *
			 * @arg BaseFolder
			 * @text 祖先フォルダ名(任意)
			 * @desc 3wayマージの共通祖先テキストのフォルダ名。空ならoverlayに縮退します。
			 * @type string
			 * @default
			 *
			 * @arg BaseFileName
			 * @text 祖先ファイル名(任意)
			 * @desc 共通祖先テキストのファイル名。BaseFolderと両方指定した場合のみ3wayマージ。
			 * @type string
			 * @default
			 *
			 * @command BATCH_IMPORT_MESSAGES_FROM_FOLDER
			 * @text フォルダから一括反映
			 * @desc 指定フォルダ内の front matter 付きテキストを再帰的に走査し、各ファイルの見出し情報に従って一括でゲームへ反映します。
			 *
			 * @arg TextFolder
			 * @text 取り込み元フォルダ名
			 * @desc 走査するテキストフォルダ名です。デフォルトはtextです。
			 * @type string
			 * @default text
			 *
			 * @arg Strategy
			 * @text 一括反映戦略
			 * @desc merge(既定・構造保持の賢い反映) / overwrite(テキストで全上書き) を選択できます。
			 * @type select
			 * @option merge
			 * @value merge
			 * @option overwrite
			 * @value overwrite
			 * @default merge
			 *

			 *
			 * @param Default Window Position
			 * @text 位置のデフォルト値
			 * @desc テキストフレームの表示位置デフォルト値を設定します。デフォルトは下です。個別に指定した場合は上書きされます。
			 * @type select
			 * @option 上
			 * @option 中
			 * @option 下
			 * @default 下
			 *
			 * @param Default Background
			 * @text 背景のデフォルト値
			 * @desc テキストフレームの背景デフォルト値を設定します。デフォルトはウインドウです。個別に指定した場合は上書きされます。
			 * @type select
			 * @option ウインドウ
			 * @option 暗くする
			 * @option 透明
			 * @default ウインドウ
			 *
			 * @param Default Scenario Folder
			 * @text 取り込み元フォルダ名
			 * @desc テキストファイルを保存しておくフォルダ名を設定します。デフォルトはtextです。(MZでは無視されます)
			 * @default text
			 * @require 1
			 * @dir text
			 * @type string
			 *
			 * @param Default Scenario File
			 * @text 取り込み元ファイル名
			 * @desc 読み込むシナリオファイルのファイル名を設定します。デフォルトはmessage.txtです。(MZでは無視されます)
			 * @default message.txt
			 * @require 1
			 * @dir text
			 * @type string
			 *
			 * @param Default Common Event ID
			 * @text 取り込み先コモンイベントID
			 * @desc 出力先のコモンイベントIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type common_event
			 *
			 * @param Default MapID
			 * @text 取り込み先マップID
			 * @desc 取り込み先となるマップのIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type number
			 *
			 * @param Default EventID
			 * @text 取り込み先イベントID
			 * @desc 取り込み先となるイベントのIDを設定します。デフォルト値は2です。(MZでは無視されます)
			 * @default 2
			 * @type number
			 *
			 * @param Default PageID
			 * @text 取り込み先ページID
			 * @desc 取り込み先となるページのIDを設定します。デフォルト値は1です。(MZでは無視されます)
			 * @default 1
			 * @type number
			 *
			 * @param IsOverwrite
			 * @text 【取り扱い注意】上書きする
			 * @desc 通常イベントの末尾に追加しますが、上書きに変更できます。trueのとき上書きです。デフォルト値はfalseです。
			 * @default false
			 * @type boolean
			 *
			 * @param Comment Out Char
			 * @text コメントアウト記号
			 * @desc 行頭に置いた場合、その行をコメントとして処理する記号を定義します。デフォルト値は「％」（半角パーセント）です。
			 * @default %
			 * @type string
			 *
			 * @param IsDebug
			 * @text デバッグモードを利用する
			 * @desc F8のコンソールログにこのプラグインの詳細ログが出力されます。デフォルト値はfalseです。処理時間が伸びます。
			 * @default false
			 * @type boolean
			 *
			 * @param DisplayMsg
			 * @text メッセージ表示
			 * @desc 実行時に通常メッセージを表示します。OFFで警告以外のメッセージが表示されなくなります。デフォルト値はtrueです。
			 * @default true
			 * @type boolean
			 *
			 * @param DisplayWarning
			 * @text 警告文表示
			 * @desc 実行時に警告を表示します。OFFで警告が表示されなくなります。デフォルト値はtrueです。
			 * @default true
			 * @type boolean
			 *
			 * @help
			 * 本プラグインはテキストファイル(.txtファイルなど)から「文章の表示」イベント
			 * コマンドに簡単に変換するための、開発支援プラグインです。キャラクター同士の
			 * 会話などをツクールMV・MZ**以外**のエディタで編集して、後でイベントコマンド
			 * として組み込みたい人をサポートします。
			 *
			 * 所定のプラグインコマンド（後述）を実行することにより、テキストファイルを読
			 * み込み、ツクールMV・MZのマップイベントまたはコモンイベントにイベントコマン
			 * ドとして取り込むことができます。
			 *
			 * テストプレイおよびイベントテスト（イベントエディタ上で右クリック→テスト）
			 * から実行することを想定しています。
			 *
			 * テキスト→ゲームの「反映」だけでなく、ゲーム→テキストの「取り出し」（逆変換
			 * プラグイン Frame2Text）にも対応し、双方向に編集できます。反映・取り出しとも
			 * 既定は「安全な統合」で、テキストの編集とツクール上のUI編集（移動・分岐・
			 * スイッチ等）の両方をできるだけ残します。コマンド操作が苦手な場合は、ボタン
			 * 操作で使える Visual Studio Code 拡張もあります（詳しくは後述）。
			 *
			 * また、追加機能としてフェードインやBGM再生等のイベントコマンドも組み込むこ
			 * とができます。追加機能の詳細はこのREADMEの下部に記載していますので、そちら
			 * をご覧ください
			 *
			 * なお、以下のヘルプ文の内容は本プラグインのWikiにも記載しています。
			 *
			 *     https://github.com/yktsr/Text2Frame-MV/wiki
			 *
			 * Wikiのほうが閲覧しやすいと思いますので、RPGツクールMV・MZ上では読みづらい
			 * と感じた場合は、こちらをご覧ください。
			 *
			 *
			 * -------------------------------------
			 * ツクールMVでの実行方法
			 * --------------------------------------
			 * 1. dataフォルダのバックアップをとっておく。(重要)
			 *
			 * 2. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
			 *
			 * 3. 作成したフォルダに読み込みたいテキストファイルを保存する。
			 *
			 * 4. 任意のマップ・位置に空のイベントをひとつ作成します。
			 *     この時マップID, イベントID, ページIDをメモしておきましょう。
			 *     マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
			 *    左上に記載されています。
			 *     イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
			 *    記載されています。
			 *     ページIDはイベントエディターのイベントの名前の下に記載されています。
			 *
			 * 5. プラグインの管理画面から本プラグインのパラメータを下記の通り編集します。
			 *  ・「取り込み元フォルダ名」に2.で作成したフォルダのフォルダ名を入力。
			 *      (デフォルトはtextです)
			 *  ・「取り込み元ファイル名」に3.で保存したファイルのファイル名を入力。
			 *      (デフォルトはmessage.txtです)
			 *  ・「取り込み先マップID」に4.でメモしたマップIDを入力。
			 *      (デフォルトは1です)
			 *  ・「取り込み先イベントID」に4.でメモしたイベントIDを入力。
			 *      (デフォルトは2です)
			 *  ・「取り込み先ページID」に4.でメモしたページIDを入力。
			 *      (デフォルトで1です)
			 *
			 * 6. 以下のうちいずれかを記述したプラグインコマンドを作成する。
			 *    IMPORT_MESSAGE_TO_EVENT
			 *    メッセージをイベントにインポート
			 *     これらは全く同じ機能なのでどちらを使ってもかまいません。
			 *
			 * 7. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
			 *     実行前に本プラグインを管理画面からONにして「プロジェクトの保存」を
			 *    実行しておきましょう。
			 *
			 * 8. **セーブせずに**プロジェクトを開き直します。
			 *      成功していれば、7.で設定したマップのイベントの中に「文章の表示」
			 *     イベントコマンドとして書きだされています。
			 *      デフォルトの場合はtextフォルダのmessage.txtの内容を
			 *     IDが1のマップの、IDが1のイベントの、IDが1のページに書き出したことに
			 *     なります。
			 *
			 * -------------------------------------
			 * ツクールMZでの実行方法
			 * --------------------------------------
			 * 1. dataフォルダのバックアップをとっておく。(重要)
			 *
			 * 2. プロジェクトの最上位フォルダ(dataやimgのあるところ)にフォルダを作成する。
			 *
			 * 3. 作成したフォルダに読み込みたいテキストファイルを保存する。
			 *
			 * 4. 任意のマップ・位置に空のイベントをひとつ作成します。
			 *     この時マップID, イベントID, ページIDをメモしておきましょう。
			 *     マップIDは画面左のマップを、右クリック→「編集」として出るウィンドウの
			 *    左上に記載されています。
			 *     イベントIDはイベントをダブルクリックして出るイベントエディターの左上に
			 *    記載されています。
			 *     ページIDはイベントエディターのイベントの名前の下に記載されています。
			 *
			 * 5. 以下の手順でプラグインコマンドを作成する。
			 *  ・ プラグイン名「Text2Frame」のコマンド「イベントにインポート」を選択
			 *  ・引数を下記のように設定する。
			 *   -「取り込み元フォルダ名」に2.で作成したフォルダのフォルダ名を入力。
			 *       (デフォルトはtextです)
			 *   -「取り込み元ファイル名」に3.で保存したファイルのファイル名を入力。
			 *       (デフォルトはmessage.txtです)
			 *   -「取り込み先マップID」に4.でメモしたマップIDを入力。
			 *       (デフォルトは1です)
			 *   -「取り込み先イベントID」に4.でメモしたイベントIDを入力。
			 *       (デフォルトは2です)
			 *   -「取り込み先ページID」に4.でメモしたページIDを入力。
			 *       (デフォルトで1です)
			 *
			 * 6. 作成したイベントコマンドをテストプレイかイベントテストで実行する。
			 *     実行前に本プラグインを管理画面からONにして「プロジェクトの保存」を
			 *    実行しておきましょう。
			 *
			 * 7. **セーブせずに**リロードする、もしくはプロジェクトを開き直す。
			 *     成功していれば、7.で設定したマップのイベントの中に「文章の表示」
			 *    イベントコマンドとして書きだされています。
			 *     デフォルトの場合はtextフォルダのmessage.txtの内容を
			 *    IDが1のマップの、IDが1のイベントの、IDが1のページに書き出したことに
			 *    なります。
			 *
			 *
			 * --------------------------------------
			 * 反映のしかた（上書き / 統合）と、ゲームからの取り出し
			 * --------------------------------------
			 * ◆ 反映（テキスト→ゲーム）
			 *  ・IMPORT_MESSAGE_TO_EVENT / IMPORT_MESSAGE_TO_CE …「上書き」。テキストの
			 *    内容をそのまま書き込みます（末尾追加、または全置換）。
			 *  ・MERGE_MESSAGE_TO_EVENT / MERGE_MESSAGE_TO_CE …「統合」（おすすめ）。
			 *    ツクール上で加えたUI編集（移動・分岐・スイッチ等）を残したまま、
			 *    テキストの会話などを反映します。共通の祖先があれば賢く3方向で統合し、
			 *    同じ場所を両方で変えたときだけ両方を残します（下記の競合表示）。
			 *  ・BATCH_IMPORT_MESSAGES_FROM_FOLDER … フォルダ内のテキストを一括で反映します（既定は統合）。
			 *
			 * ◆ 取り出し（ゲーム→テキスト）: 逆変換プラグイン Frame2Text
			 *  ゲームの内容をテキストへ書き出します。既定は「安全な統合」で、既にある翻訳
			 *  などを残しつつ、ゲーム側で増えた・変わった箇所だけを取り込みます。
			 *
			 * ◆ 共通の祖先の自動管理と、競合の解決
			 *  統合に使う「共通の祖先」は .t2f-base フォルダに自動で保存・参照されるため、
			 *  通常は指定不要です。同じ場所をテキストとゲームの両方で変更したときは、次の
			 *  目印で両方を残します（残したい方を残し、目印の3行を消すだけで解決）。
			 *
			 *    === テキストの変更 / from text ===
			 *    （テキスト側の内容）
			 *    === ゲームの変更 / from game ===
			 *    （ゲーム側の内容）
			 *    === どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ===
			 *
			 * ◆ ボタン操作で使いたい場合
			 *  Visual Studio Code 拡張「Text2Frame Language Support」を使うと、反映・取り出し・
			 *  英語化をUIから実行できます（専門用語もやさしく表示されます）。
			 *
			 *
			 * --------------------------------------
			 * テキストファイルの書き方
			 * --------------------------------------
			 * ◆ 基本となる書き方
			 *  １つのメッセージを改行で区切るという書き方をします。
			 *  例えば以下の通りです。
			 *
			 * ↓↓↓↓↓ここから例文1↓↓↓↓↓
			 * やめて！ラーの翼神竜の特殊能力で、
			 * ギルフォード・ザ・ライトニングを焼き払われたら、
			 * 闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
			 *
			 * お願い、死なないで城之内！あんたが今ここで倒れたら、
			 * 舞さんや遊戯との約束はどうなっちゃうの？
			 * ライフはまだ残ってる。
			 * ここを耐えれば、マリクに勝てるんだから！
			 *
			 * 次回、「城之内死す」。デュエルスタンバイ！
			 * ↑↑↑↑↑ここまで例文1↑↑↑↑↑
			 *
			 *  この場合は３つの「文章の表示」イベントコマンドに変換されて
			 *  取り込まれます。改行は何行いれても同様の動作になります。
			 *  以上の方法で実行した場合、
			 *  メッセージウィンドウの「背景」「ウィンドウ位置」については
			 *  プラグインパラメータの「位置のデフォルト値」「背景のデフォルト値」の
			 *  値が反映されます。
			 *
			 * ◆ タグについて
			 *  Text2Frameは文章を単純に組み込むだけでなく、タグを挿入することでより柔軟な
			 *  設定を可能としています。例えば、メッセージの顔・背景・ウィンドウの位置変更
			 *  や名前の設定(MZ限定)、メッセージ以外のイベントコマンドを挿入することが可能
			 *  です。各タグについては以降の説明をご覧ください。
			 *
			 *  タグについては以下の特徴があります。
			 *  ・タグや値の大文字小文字は区別されません。(ファイル名の指定は除く)
			 *     （例：FaceとFACEは同じ動作です）
			 *  ・タグは同じ行に複数個配置することができます。
			 *     （例：<顔: Actor1(0)><位置: 上><背景: 暗く>
			 *  ・基本は英語で指定ですが、省略形や日本語で指定可能な場合もある。
			 *
			 * ◆ 顔・背景・ウィンドウ位置・名前の設定について
			 *  それぞれのメッセージの「顔」「背景」「ウィンドウ位置」「名前」については、
			 *  メッセージの手前にタグを記述することで指定することができます。
			 *  上述の例のように指定しない場合は、パラメータで設定したものが適用されます。
			 *
			 *  例えば以下の通りです。
			 *
			 * ↓↓↓↓↓ここから例文2↓↓↓↓↓
			 * <Face: Actor1(0)><WindowPosition: Bottom><Background: Dim><Name: 真崎杏子>
			 * やめて！ラーの翼神竜の特殊能力で、
			 * ギルフォード・ザ・ライトニングを焼き払われたら、
			 * 闇のゲームでモンスターと繋がってる城之内の精神まで燃え尽きちゃう！
			 *
			 * <WindowPosition: Top><Name: 真崎杏子>
			 * お願い、死なないで城之内！あんたが今ここで倒れたら、
			 * 舞さんや遊戯との約束はどうなっちゃうの？
			 * ライフはまだ残ってる。
			 * ここを耐えれば、マリクに勝てるんだから！
			 *
			 * 次回、「城之内死す」。デュエルスタンバイ！
			 * ↑↑↑↑↑ここまで例文2↑↑↑↑↑
			 *
			 *  この例の場合では、
			 *  1つ目のメッセージ(やめて！〜)ではActor1ファイルの場所が1の顔が表示(詳細は後
			 *  述)され、位置は下、背景が暗いメッセージウィンドウになります。名前は「真崎杏
			 *  子」と表示されます。
			 *
			 *  2つ目のメッセージ(お願い、〜)は、位置が上であることと名前だけ指定されてい
			 *  ます。指定されなかった他の顔や背景はプラグインのパラメータで設定されている
			 *  ものが適用されます。ここでも名前は「真崎杏子」と表示されます。
			 *
			 *  3つめのメッセージ(次回、〜)は、何も指定されていません。
			 *  そのため、例文1と同様にプラグインのパラメータで設定されているものが適用され
			 *  ます。ここでは名前は表示されません。
			 *
			 *  タグの詳細は下記をご覧ください。
			 *
			 *  ○ 顔の指定方法
			 *   <Face: ファイル名(顔の指定番号)>
			 *   <FC: ファイル名(顔の指定番号)>
			 *   <顔: ファイル名(顔の指定番号)>
			 *
			 *   の３つのうちいずれかの記法で指定します。
			 *   ファイル名はimg/facesのフォルダ内のものを参照します。
			 *   顔の指定番号は、ファイルの中で参照する位置を指定します。
			 *   番号の法則はツクールMV・MZの仕様に準拠します。最も左上が0,右下が7です。
			 *
			 *  ○ 位置の指定方法
			 *   <WindowPosition: 表示したい位置>
			 *   <WP: 表示したい位置>
			 *   <位置: 表示したい位置>
			 *
			 *   の３つのうちいずれかの記法で指定します。
			 *   表示したい位置に記述できるのは以下の3種類です。
			 *   ・Top      # 上
			 *   ・Middle   # 中
			 *   ・Bottom   # 下
			 *   Topは「上」、Middleは「中」、Bottomは「下」となります。
			 *   それぞれ大文字小文字を区別しません。つまりTOP,top,toPなどはTopと同じです。
			 *   また、英語ではなく<WindowPosition: 上>のように日本語指定もできます。
			 *
			 *  ○ 背景の設定方法
			 *   <Background: 背景の指定>
			 *   <BG: 背景の指定>
			 *   <背景: 背景の指定>
			 *
			 *   の３つのうちいずれかの記法で指定します。
			 *   背景の指定に記述できるのは、以下の3種類です。
			 *   ・Window        # ウィンドウ
			 *   ・Dim           # 暗くする
			 *   ・Transparent   # 透明
			 *   Windowは「ウィンドウ」,Dimは「暗くする」,Transparentは「透明」となります。
			 *   それぞれ大文字小文字を区別しません。
			 *   また、英語ではなくて<Background: ウィンドウ>のように日本語指定もできます。
			 *
			 *  ○ 名前の設定方法【MZ用】
			 *  メッセージウィンドウへの名前の設定は
			 *   <Name: 設定する名前>
			 *   <NM: 設定する名前>
			 *   <名前: 設定する名前>
			 *
			 *   の３つのうちいずれかの記法で指定します。
			 *   例えば、<Name: リード>と設定することで、名前欄に「リード」と設定できます。
			 *
			 *
			 * ◆ コメントアウトについて
			 *  テキストファイルのうち、イベントコマンドとして取り込まないようにする、
			 *  いわゆるコメントアウトをするための記法もあります。
			 *  メモ書き等に利用することができます。
			 *
			 *  行頭に「%」（半角パーセント）を記述することで、実現できます。
			 *
			 *  ↓↓↓↓↓ここから例文3↓↓↓↓↓
			 *  % かわいい感じで
			 *  今日も一日がんばるぞい！
			 *  ↑↑↑↑↑ここまで例文3↑↑↑↑↑
			 *
			 *  このように記載することで、実際に取り込まれるのは
			 *  「今日も一日がんばるぞい！」のみとなります。
			 *  「かわいい感じで」はメッセージとしては取り込まれません。
			 *
			 *  なお、コメントアウト記号はプラグインパラメータから自由に変更可能です。
			 *  「%」はあくまでデフォルト値です。
			 *
			 *
			 * --------------------------------------
			 * コモンイベントへの書き出し
			 * --------------------------------------
			 * マップのイベントではなくコモンイベントに取り込むことも可能です。
			 * ◆ ツクールMVの場合
			 *  以下のプラグインコマンドのうちいずれかを使用してください。
			 *    IMPORT_MESSAGE_TO_CE
			 *    メッセージをコモンイベントにインポート
			 *  これらは全く同じ機能なのでどちらを使ってもかまいません。
			 *  取り込む先のコモンイベントのIDはプラグインパラメータの
			 *  「取り込み先コモンイベントID」で指定できます。
			 *
			 * ◆ ツクールMZの場合
			 *   プラグインコマンドからプラグイン名「Text2Frame」のコマンド
			 *  「コモンイベントにインポート」を選択してください。
			 *   フォルダ名・ファイル名・取り込み先のコモンイベントIDを引数から
			 *  入力してください。
			 *
			 *
			 * --------------------------------------
			 * ツクールMVでのプラグインコマンドの引数
			 * --------------------------------------
			 * ツクールMVでのプラグインコマンドに引数を設定することにより、プラグインパラ
			 * メータで指定したテキストファイルやマップIDとは違うパラメータで実行ができま
			 * す。
			 *
			 * 例1:text/message.txtをマップIDが1, イベントIDが2, ページIDが3で上書きせず
			 *     に取り込む。
			 *   IMPORT_MESSAGE_TO_EVENT text message.txt 1 2 3 false
			 *   メッセージをイベントにインポート text message.txt 1 2 3 false
			 *
			 * 例2:text/message.txtをIDが3のコモンイベントに上書きしてに取り込む。
			 *   IMPORT_MESSAGE_TO_CE text message.txt 3 true
			 *   メッセージをコモンイベントにインポート text message.txt 3 true
			 *
			 * 例3:フォルダ内のテキストを一括反映する（第1引数は取り込み元フォルダ名。省略すると
			 *     text。第2引数は反映のしかた。省略すると統合。全上書きは overwrite を指定）。
			 *   BATCH_IMPORT_MESSAGES_FROM_FOLDER text
			 *   BATCH_IMPORT_MESSAGES_FROM_FOLDER text overwrite
			 *
			 * ◆ 旧版のプラグインコマンドの引数(非推奨)
			 *  最新版(ツクールMZ対応後,ver2.0.0)と旧版(ツクールMZ対応前,ver1.4.1)では、
			 *  イベントへのインポートにおいて仕様が異なります。
			 *  以下の旧仕様でも実行は可能ですが、非推奨となっております。
			 *
			 *  例:text/message.txtをマップIDが1, イベントIDが2, ページIDが3で上書きせず
			 *     に取り込む(ページIDは1として)。
			 *    IMPORT_MESSAGE_TO_EVENT text message.txt 1 2 false
			 *    メッセージをイベントにインポート text message.txt 1 2 false
			 *
			 *  旧版ではページIDの指定ができず、必ず1となっていました。
			 *
			 *
			 * --------------------------------------
			 * 追加機能(その他イベントコマンドの組み込み)
			 * --------------------------------------
			 * メッセージだけでなく、指定の記法を用いることでイベントコマンドを組み込むこと
			 * もできます。
			 * 例えば、
			 *
			 * ↓↓↓↓↓ここから例文4↓↓↓↓↓
			 * <Set: 1, 2>
			 * <CommonEvent: 3>
			 * 今日も一日がんばるぞい！
			 * ↑↑↑↑↑ここまで例文4↑↑↑↑↑
			 *
			 * とすることで、「今日も一日がんばるぞい！」というメッセージの前に、
			 * 「変数の操作(変数1に定数2を代入する)」と「コモンイベント(ID3)」のイベント
			 * コマンドが組み込まれます。
			 *
			 * 現在対応しているコマンドは以下のとおりです。
			 * - メッセージ
			 *   - (1) 選択肢の表示
			 *   - (2) 数値入力の処理
			 *   - (3) アイテム選択の処理
			 *   - (4) 文章のスクロール表示
			 * - ゲーム進行
			 *   - (5) スイッチの操作
			 *   - (6) 変数の操作
			 *   - (7) セルフスイッチの操作
			 *   - (8) タイマーの操作
			 * - フロー制御
			 *   - (9) 条件分岐
			 *   - (10) ループ
			 *   - (11) ループの中断
			 *   - (12) イベント処理の中断
			 *   - (13) コモンイベント
			 *   - (14) ラベル
			 *   - (15) ラベルジャンプ
			 *   - (16) 注釈
			 * - パーティ
			 *   - (17) 所持金の増減
			 *   - (18) アイテムの増減
			 *   - (19) 武器の増減
			 *   - (20) 防具の増減
			 *   - (21) メンバーの入れ替え
			 * - アクター
			 *   - (22) HPの増減
			 *   - (23) MPの増減
			 *   - (24) TPの増減
			 *   - (25) ステートの変更
			 *   - (26) 全回復
			 *   - (27) 経験値の増減
			 *   - (28) レベルの増減
			 *   - (29) 能力値の増減
			 *   - (30) スキルの増減
			 *   - (31) 装備の変更
			 *   - (32) 名前の変更
			 *   - (33) 職業の変更
			 *   - (34) 二つ名の変更
			 *   - (35) プロフィールの変更
			 * - 移動
			 *   - (36) 場所移動
			 *   - (37) 乗り物の位置設定
			 *   - (38) イベントの位置設定
			 *   - (39) マップのスクロール
			 *   - (40) 移動ルートの設定
			 *   - (41) 乗り物の乗降
			 * - キャラクター
			 *   - (42) 透明状態の変更
			 *   - (43) 隊列歩行の変更
			 *   - (44) 隊列メンバーの集合
			 *   - (45) アニメーションの表示
			 *   - (46) フキダシアイコンの表示
			 *   - (47) イベントの一時消去
			 * - ピクチャ
			 *   - (48) ピクチャの表示
			 *   - (49) ピクチャの移動
			 *   - (50) ピクチャの回転
			 *   - (51) ピクチャの色調変更
			 *   - (52) ピクチャの消去
			 * - タイミング
			 *   - (53) ウェイト
			 * - 画面
			 *   - (54) 画面のフェードアウト
			 *   - (55) 画面のフェードイン
			 *   - (56) 画面の色調変更
			 *   - (57) 画面のフラッシュ
			 *   - (58) 画面のシェイク
			 *   - (59) 天候の設定
			 * - オーディオ・ビデオ
			 *   - (60) BGMの演奏
			 *   - (61) BGMのフェードアウト
			 *   - (62) BGMの保存
			 *   - (63) BGMの再開
			 *   - (64) BGSの演奏
			 *   - (65) BGSのフェードアウト
			 *   - (66) MEの演奏
			 *   - (67) SEの演奏
			 *   - (68) SEの停止
			 *   - (69) ムービーの再生
			 * - シーン制御
			 *   - (70) 戦闘の処理
			 *   - (71) ショップの処理
			 *   - (72) 名前入力の処理
			 *   - (73) メニュー画面を開く
			 *   - (74) セーブ画面を開く
			 *   - (75) ゲームオーバー
			 *   - (76) タイトル画面に戻す
			 * - システム設定
			 *   - (77) 戦闘BGMの変更
			 *   - (78) 勝利MEの変更
			 *   - (79) 敗北MEの変更
			 *   - (80) 乗り物BGMの変更
			 *   - (81) セーブ禁止の変更
			 *   - (82) メニュー禁止の変更
			 *   - (83) エンカウント禁止の変更
			 *   - (84) 並び変え禁止の変更
			 *   - (85) ウィンドウカラーの変更
			 *   - (86) アクターの画像変更
			 *   - (87) 乗り物の画像変更
			 * - マップ
			 *   - (88) マップ名表示の変更
			 *   - (89) タイルセットの変更
			 *   - (90) 戦闘背景の変更
			 *   - (91) 遠景の変更
			 *   - (92) 指定位置の情報取得
			 * - バトル
			 *   - (93) 敵キャラのHP増減
			 *   - (94) 敵キャラのMP増減
			 *   - (95) 敵キャラのTP増減
			 *   - (96) 敵キャラのステート変更
			 *   - (97) 敵キャラの全回復
			 *   - (98) 敵キャラの出現
			 *   - (99) 敵キャラの変身
			 *   - (100) 戦闘アニメーションの表示
			 *   - (101) 戦闘行動の強制
			 *   - (102) バトルの中断
			 * - 上級
			 *   - (103) スクリプト
			 *   - (104)-1 プラグインコマンド(ツクールMV)
			 *   - (104)-2 プラグインコマンド(ツクールMZ, 上級者向け)
			 *
			 * ○ (1) 選択肢の表示
			 * 「選択肢の表示」は以下の記法で組み込むことができます。
			 *  ---
			 *  <ShowChoices: 背景, ウィンドウ位置, デフォルト, キャンセル>
			 *  <When: 選択肢1の文>
			 *  選択肢1を選んだ時の処理
			 *  <When: 選択肢2の文>
			 *  選択肢2を選んだ時の処理
			 *  .
			 *  .
			 *  .
			 *  <When: 選択肢6の文>
			 *  選択肢6を選んだ時の処理
			 *  <WhenCancel>
			 *  選択肢をキャンセルした時の処理
			 *  <End>
			 *  ---
			 *  必須の引数はありません。
			 *  全ての引数はオプションとして設定でき、指定しない場合はデフォルト値が
			 *  設定されます。
			 *  引数を設定しない場合、"<ShowChoices>"か"<ShowChoices: >"でも記述できます。
			 *  "<When>"が上から順に選択肢1, 選択肢2と対応しています。
			 *
			 *  "ShowChoices"は"選択肢の表示"か"SHC"で代替できます。
			 *  また、"When"は"選択肢"で、"End"は"分岐終了"で、
			 *  "WhenCancel"は"キャンセルのとき"で代替できます。
			 *
			 *  引数(オプション)の指定方法を述べる前に、いくつか具体例を示します。
			 *  例1: 以下の設定で、選択肢を2つ表示する場合
			 *   - 背景: ウィンドウ
			 *   - ウィンドウ位置: 右
			 *   - デフォルト: 選択肢 ＃1
			 *   - キャンセル: 選択肢 ＃2
			 *  ---
			 * 長老に会って挨拶は済ませてきたかい？
			 * <ShowChoices: Window, Right, 1, 2>
			 * <When: はい>
			 * そうか。それならよかった。
			 * 早速長老の依頼のとおり、北に向かってくれないかい。
			 * <When: いいえ>
			 * それはいけない。
			 * 長老は君のような若者を探しているんだ。
			 * 挨拶に行って話を聞いてくれないかい。
			 * <End>
			 *  ---
			 *
			 *  また、例1の引数は全てデフォルト値なので、以下のようにも記述できます。
			 *  2行目だけ異なります。
			 *  ---
			 * 長老に会って挨拶は済ませてきたかい？
			 * <ShowChoices>
			 * <When: はい>
			 * そうか。それならよかった。
			 * 早速長老の依頼のとおり、北に向かってくれないかい。
			 * <When: いいえ>
			 * それはいけない。
			 * 長老は君のような若者を探しているんだ。
			 * 挨拶に行って話を聞いてくれないかい。
			 * <End>
			 *  ---
			 *
			 *  例2: 以下の設定で、選択肢を3つ表示する場合
			 *   - 背景: 透明
			 *   - ウィンドウ位置: 中
			 *   - デフォルト: 選択肢 ＃1
			 *   - キャンセル: 分岐
			 *  ---
			 * 他にも話したいことがあるんだ。
			 * 何が聞きたい？
			 * <ShowChoices: Transparent, Middle, 1, Branch>
			 * <When: 勇者ノーゼンの伝説>
			 * 勇者ノーゼンは〜〜（省略
			 * <When: 魔王に挑む冒険者の現状>
			 * 魔王に挑む冒険者は〜〜（省略
			 * <When: 魔王について判明している点>
			 * 魔王について判明している点は〜〜（省略
			 * <WhenCancel>
			 * ・・・え、僕の話、長すぎた？ごめんごめん。
			 * <End>
			 *  ---
			 *
			 *  それぞれの引数に設定できる項目は以下の通りです。
			 *  ツクールの選択肢に対応しています。
			 *  ・ 背景は以下のリストから指定します。
			 *    - ウィンドウ: "Window" or "ウィンドウ"
			 *    - 暗くする: "Dim" or "暗くする"
			 *    - 透明: "Transparent" or "透明"
			 *  ・ ウィンドウ位置は以下のリストから指定します。
			 *    - 左: "Left" or "左"
			 *    - 中: "Middle" or "中"
			 *    - 右: "Right" or "右"
			 *  ・ デフォルトは以下のリストから指定します。
			 *    - なし: "None" or "なし"
			 *    - 選択肢 ＃1: "1"
			 *    - 選択肢 ＃2: "2"
			 *    - ...
			 *    - 選択肢 ＃6: "6"
			 *  ・ キャンセルは以下のリストから指定します。
			 *    - 分岐: "Branch" or "分岐"
			 *    - 禁止: "Disallow" or "禁止"
			 *    - 選択肢 ＃1: "1"
			 *    - 選択肢 ＃2: "2"
			 *    - ...
			 *    - 選択肢 ＃6: "6"
			 *
			 *
			 * ○ (2) 数値入力の処理
			 *  「数値入力の処理」は以下のいずれかの記法で組み込むことができます。
			 *   <InputNumber: 変数番号, 桁数>
			 *   <INN: 変数番号, 桁数>
			 *   <数値入力の処理: 変数番号, 桁数>
			 *
			 *  例えば、以下の通りです。
			 *  ・例: 変数1に桁数2で数値入力する。
			 *   <InputNumber: 1, 2>
			 *   <INN: 1, 2>
			 *   <数値入力の処理: 1, 2>
			 *
			 *
			 * ○ (3) アイテム選択の処理
			 * 「アイテム選択の処理」は以下のいずれかの記法で組み込むことができます。
			 *   <SelectItem: 変数番号, アイテムタイプ>
			 *   <SI: 変数番号, アイテムタイプ>
			 *   <アイテム選択の処理: 変数番号, アイテムタイプ>
			 *
			 *  アイテムタイプを指定するための項目は以下の通りです。
			 *   - 通常アイテム: "Regular Item", "通常アイテム"
			 *   - 大事なもの: "Key Item", "大事なもの"
			 *   - 隠しアイテムA: "Hidden Item A", "隠しアイテムA"
			 *   - 隠しアイテムB: "Hidden Item B", "隠しアイテムB"
			 *
			 *  なお、アイテムタイプの大文字小文字は問いません。
			 *  例えば、"Regular Item"は"regular item"と指定しても、
			 *  "REGULAR ITEM"と指定しても大丈夫です。
			 *
			 *  アイテム選択の処理の具体例は、以下の通りです。
			 *  例1: 通常アイテムの一覧を表示し、
			 *       選択されたアイテムのIDを変数1に代入する。
			 *   <SelectItem: 1, Regular Item>
			 *   <SI: 1, REGULAR ITEM>
			 *   <アイテム選択の処理: 1, 通常アイテム>
			 *
			 *  例2: 隠しアイテムAの一覧を表示し、
			 *       選択されたアイテムのIDを変数20に代入する。
			 *   <SelectItem: 20, Hidden Item A>
			 *   <SI: 20, hidden item A>
			 *   <アイテム選択の処理: 20, 隠しアイテムA>
			 *
			 *
			 * ○ (4) 文章のスクロール表示
			 * 「文章のスクロール表示」は、以下のように二つのタグで挟み込み指定します。
			 *  ---
			 *  <ShowScrollingText: 速度(整数), 早送りなしフラグ("ON" or "OFF")>
			 *  スクロールさせたい文章
			 *  </ShowScrollingText>
			 *  ---
			 *  "ShowScrollingText"は"SST"か"文章のスクロール表示"でも記述できます。
			 *
			 *  速度が"2"で早送りを許可する場合(早送りなしフラグが"OFF")の
			 *  具体例は以下のとおりです。
			 *  ---
			 * <ShowScrollingText: 2, OFF>
			 * 世界は魔王によって滅ぼされた。
			 *
			 * しかし、勇者は立ち上がった。
			 * </ShowScrollingText>
			 *  ---
			 *
			 *  速度と早送りなしフラグは、省略することが可能です。
			 *  省略した場合、速度は"2"が、早送りなしフラグは"OFF"が設定されます。
			 *  また、両方を省略したときに限り":"も省略可能です。
			 *  例えば、以下のように記述できます。
			 *  ---
			 * <ShowScrollingText>
			 * 世界は魔王によって滅ぼされた。
			 *
			 * しかし、勇者は立ち上がった。
			 * </ShowScrollingText>
			 *  ---
			 * 早送りなしフラグだけを省略し(早送りを許可する)、速度を"5"に設定する場合は
			 * 以下のようになります。
			 *  ---
			 * <ShowScrollingText: 5>
			 * 世界は魔王によって滅ぼされた。
			 *
			 * しかし、勇者は立ち上がった。
			 * </ShowScrollingText>
			 *  ---
			 *
			 *  以下の対応関係で早送りなしフラグの"ON"と"OFF"は代替できます。
			 *  - "ON": "オン", "true", "1", "No Fast Forward"
			 *  - "OFF":"オフ", "false", "0"
			 *
			 *  あまりないかもしれませんが、
			 *  ---
			 *  <ShowScrollingText>世界は魔王によって滅ぼされた。</ShowScrollingText>
			 *  ---
			 *  というように1行で記述することもできます。
			 *
			 *
			 * ○ (5) スイッチの操作
			 * 「スイッチの操作」は以下の記法で組み込むことができます。
			 *   <Switch: スイッチ番号, 代入値("ON" or "OFF")>
			 *   "Switch"は"SW", "スイッチ"でも代替できます。
			 *
			 * 例えば、以下の通りです。
			 * 例1: 番号1のスイッチをONにする。
			 *   <Switch: 1, ON>
			 *   <SW: 1, ON>
			 *   <スイッチ: 1, ON>
			 * 例2: 番号1-10のスイッチをすべてOFFにする。
			 *   <Switch: 1-10, OFF>
			 *   <SW: 1-10, OFF>
			 *   <スイッチ: 1-10, OFF>
			 *
			 * スイッチ番号は単一か範囲で指定します。範囲の場合は"1-10"のようにハイフンで
			 * 始端と終端をつなげます。
			 * 代入値は基本的に"ON"か"OFF"で指定します。
			 * "ON"は"オン", "true", "1"として、
			 * "OFF"は"オフ", "false", "0"でも代替できます。
			 *
			 *
			 * ○ (6) 変数の操作
			 * 「変数の操作」は、代入・加算・減算・乗算・除算・除算・余剰をそれぞれ以下の
			 * 記法で組み込みます。
			 * ・代入
			 *  <Set: 変数番号, オペランド>
			 *  "Set"は"=" か"代入"でも代替できます。
			 *
			 * ・加算(足し算)
			 *  <Add: 変数番号, オペランド>
			 *  "Add"は"+" か"加算"でも代替できます。
			 *
			 * ・減算(引き算)
			 *  <Sub: 変数番号, オペランド>
			 *  "Sub"は"-" か"減算"でも代替できます。
			 *
			 * ・乗算(掛け算)
			 *  <Mul: 変数番号, オペランド>
			 *  "Mul"は"*" か"乗算"でも代替できます。
			 *
			 * ・除算(割り算)
			 *  <Div: 変数番号, オペランド>
			 *  "Div"は"/" か"除算"でも代替できます。
			 *
			 * ・剰余(割り算のあまり)
			 *  <Mod: 変数番号, オペランド>
			 *  "Mod"は"%" か"剰余"でも代替できます。
			 *
			 * 変数番号は単一か範囲で指定します。範囲の場合は"1-10"のようにハイフンで
			 * 始端と終端をつなげます。
			 * オペランドでは演算対象の値を定数・変数・乱数・ゲームデータ・スクリプトで
			 * 指定します。指定方法の詳細を述べる前に、以下にいくつか具体例を記します。
			 *
			 * 例1: 変数1に定数2を代入する。
			 *   <Set: 1, 2>
			 *   <=: 1, 2>
			 *   <代入: 1, 2>
			 *
			 * 例2: 1から10の変数すべてに変数2の値を加算する。
			 *   <Add: 1-10, variables[2]>
			 *   <+: 1-10, V[2]>
			 *   <加算: 1-10, 変数[2]>
			 *
			 * 例3: 変数1に50から100の乱数を減算する。
			 *   <Sub: 1, random[50][100]>
			 *   <-: 1, r[50][100]>
			 *   <減算: 1, 乱数[50][100]>
			 *
			 * 例4: 1から10の変数すべてににゲームデータのアクター2のレベルを乗算する。
			 *   <Mul: 1-10, GameData[actor][2][level]>
			 *   <*: 1-10, gd[actor][2][level]>
			 *   <乗算: 1-10, ゲームデータ[アクター][2][レベル]>
			 *
			 * 例5: 変数1にゲームデータのパーティ人数を除算する。
			 *   <Div: 1, GameData[PartyMembers]>
			 *   </: 1, gd[PartyMembers]>
			 *   <除算: 1, ゲームデータ[パーティ人数]>
			 *
			 * 例6: 変数1にスクリプト"$gameVariables.value(1)"の値との剰余を代入する。
			 *   <Mod: 1, Script[$gameVariables.value(1)]>
			 *   <%: 1, sc[$gameVariables.value(1)]>
			 *   <剰余: 1, スクリプト[$gameVariables.value(1)]>
			 *
			 * オペランドに定数を指定する場合は、
			 *   "1","2"のように数値をそのままお書きください。
			 *
			 * オペランドに変数を指定する場合は、
			 *   Variables[変数番号]
			 *  で指定します。Variablesは"V"か"変数"で代替できます。
			 *  例えば、変数2の場合は"Variables[2]"とお書きください。
			 *
			 * オペランドに乱数を指定する場合は、
			 *   Random[最小値][最大値]
			 * で指定します。Randomは"R"か"乱数"で代替できます。
			 * 例えば、最小値50, 最大値50の乱数の場合は"Random[50][100]"とお書きください。
			 *
			 * オペランドにスクリプトを指定する場合は、
			 *  Script[スクリプト本文(Javascript)]
			 * で指定します。Scriptは"SC"か"スクリプト"で代替できます。
			 * 例えば、$gameVariables.value(1)の場合は、"Script[$gameVariables.value(1)]"
			 * とお書きください。
			 *
			 * オペランドにゲームデータを指定する場合は、
			 *   GameData[引数1][引数2][引数3]
			 * で指定します。GameDataは"gd"か"ゲームデータ"で代替できます。
			 * 引数1,2,3で使用するゲームデータの値を指定します。
			 * 引数1には
			 * アイテム・武器・防具・アクター・敵キャラ・キャラクター・パーティ・その他
			 * のいずれかを指定します。どれを指定するかで引数2,3の扱いも変わるので、ケー
			 * スにわけて説明します。
			 * ・アイテム
			 *  GameData[Item][アイテムID]
			 *  例: 変数1にIDが5のアイテムの所持数を代入する。
			 *  <Set: 1, GameData[Item][5]>
			 *  引数1の"Item"は"アイテム"でも代替できます。引数3は使用しません。
			 *
			 * ・武器
			 *  GameData[Weapon][武器ID]
			 *  例: 変数1にIDが5の武器の所持数を代入する。
			 *    <Set: 1, GameData[Weapon][5]>
			 *  引数1の"Weapon"は"武器"でも代替できます。引数3は使用しません。
			 *
			 * ・防具
			 *  GameData[Armor][防具ID]
			 *  例: 変数1にIDが5の防具の所持数を代入する。
			 *    <Set: 1, GameData[Armor][5]>
			 *  引数1の"Armor"は"防具"でも代替できます。引数3は使用しません。
			 *
			 * ・アクター
			 *  GameData[Actor][アクターID][パラメータ名]
			 *  例: 変数1にIDが4のアクターのレベルを代入する。
			 *    <Set: 1, GameData[actor][4][Level]>
			 *  引数3のパラメータ名は以下のリストからご指定ください。
			 *    - レベル: "Level", "レベル"
			 *    - 経験値: "Exp", "経験値"
			 *    - HP: "HP"
			 *    - MP: "MP"
			 *    - 最大HP: "MaxHp", "最大HP"
			 *    - 最大MP: "MaxMP", "最大MP"
			 *    - 攻撃力: "Attack", "攻撃力"
			 *    - 防御力: "Defense", "防御力"
			 *    - 魔法攻撃力: "M.Attack", "魔法攻撃力"
			 *    - 魔法防御力: "M.Defense", "魔法防御力"
			 *    - 敏捷性: "Agility", "敏捷性"
			 *    - 運: "Luck", "運"
			 *
			 * ・敵キャラ
			 *  GameData[Enemy][(戦闘中の)敵キャラID][パラメータ名]
			 *  例: 変数1に戦闘中の2番目の敵キャラのHPを代入する。
			 *    <Set: 1, GameData[Enemy][2][HP]>
			 *  パラメータ名は、上述したゲームデータのアクターのパラメータ名のリストを
			 *  参照してください。ただし、レベルと経験値は設定出来ません。
			 *
			 * ・キャラクター
			 *  GameData[Character][イベントの指定][参照値]
			 *  例1: 変数1にプレイヤーのマップX座標を代入する。
			 *    <Set: 1, GameData[Character][Player][MapX]>
			 *  例2: 変数1にこのイベントの方向を代入する。
			 *    <Set: 1, GameData[Character][ThisEvent][Direction]>
			 *  例3: 変数1にID2のイベントの画面Y座標を代入する。
			 *    <Set: 1, GameData[Character][2][ScreenY]>
			 *  引数2のイベントの指定は以下のリストからご指定ください。
			 *    - プレイヤー: "Player", "プレイヤー", "-1"
			 *    - このイベント: "ThisEvent", "このイベント", "0"
			 *    - イベントID指定: "1", "2", ...
			 *  引数3の参照値は以下のリストからご指定ください。
			 *    - マップX座標: "MapX", "マップX"
			 *    - マップY座標: "MapY", "マップY"
			 *    - 方向: "Direction", "方向"
			 *    - 画面X座標: "ScreenX", "画面X"
			 *    - 画面Y座標: "ScreenY", "画面Y"
			 *
			 * ・パーティ
			 *  GameData[party][並び順]
			 *  例: パーティの先頭のアクターIDを変数1に代入する。
			 *    <Set: 1, gamedata[party][1]>
			 *  並び順は整数で指定します。
			 *  引数1の"party"は"パーティ"でも代替できます。
			 *
			 * ・ 直前
			 *  GameData[Last][項目]
			 *
			 *  例: 直前に使用したスキルのIDを変数1に代入する。
			 *   <Set: 1, gamedata[Last][Last Used Skill ID]>
			 *
			 *  項目は以下のリストからご指定ください。
			 *   - 直前に使用したスキルのID:
			 *     - "Last Used Skill ID"
			 *     - "直前に使用したスキルのID"
			 *     - "Used Skill ID"
			 *   - 直前に使用したアイテムのID:
			 *     - "Last Used Item ID"
			 *     - "直前に使用したアイテムのID"
			 *     - "Used Item ID"
			 *   - 直前に行動したアクターのID:
			 *     - "Last Actor ID to Act"
			 *     - "直前に行動したアクターのID"
			 *     - "Actor ID to Act"
			 *   - 直前に行動した敵キャラのインデックス:
			 *     - "Last Enemy Index to Act"
			 *     - "直前に行動した敵キャラのインデックス"
			 *     - "Enemy Index to Act"
			 *   - 直前に対象となったアクターのID:
			 *     - "Last Target Actor ID"
			 *     - "直前に対象となったアクターのID"
			 *     - "Target Actor ID"
			 *   - 直前に対象となった敵キャラのインデックス:
			 *     - "Last Target Enemy Index"
			 *     - "直前に対象となった敵キャラのインデックス"
			 *     - "Target Enemy Index"
			 *
			 *  引数1の"Last"は"直前"でも代替できます。
			 *
			 *
			 * ・その他
			 *  その他では、引数1のみを使用します。以下のリストから指定してください。
			 *   - パーティ人数: "PartyMembers", "パーティ人数"
			 *   - 所持金: "gold", "所持金",
			 *   - 歩数: "steps", "歩数"
			 *   - プレイ時間: "PlayTime", "プレイ時間"
			 *   - タイマー: "timer", "タイマー"
			 *   - セーブ回数: "SaveCount", "セーブ回数"
			 *   - 戦闘回数: "BattleCount", "戦闘回数"
			 *   - 勝利回数: "WinCount", "勝利回数"
			 *   - 逃走回数: "EscapeCount", "逃走回数"
			 *
			 *   例: パーティ人数を変数1に代入する。
			 *    <Set: 1, gamedata[PartyMembers]>
			 *
			 *
			 * ○ (7) セルフスイッチの操作
			 * 「セルフスイッチの操作」は以下の記法で組み込むことができます。
			 *   <SelfSwitch: セルフスイッチ記号, 代入値("ON" or "OFF")>
			 *  "SelSwitch"は"SSW", "セルフスイッチ"でも代替できます。
			 *
			 * 例1: セルフスイッチAをONにする。
			 *   <SelfSwitch: A, ON>
			 *   <SSW: A, true>
			 *   <セルフスイッチ: A, オフ>
			 * 例2: セルフスイッチBをOFFにする。
			 *   <SelfSwitch: B, OFF>
			 *   <SSW: B, false>
			 *   <セルフスイッチ: B, オフ>
			 *
			 * 代入値は基本的に"ON"か"OFF"で指定します。
			 * "ON"は"オン", "true", "1"として、
			 * "OFF"は"オフ", "false", "0"でも代替できます。
			 *
			 *
			 * ○ (8) タイマーの操作
			 * 「タイマーの操作」は以下のいずれか記法で組み込みます。
			 *    <Timer: 操作, 分, 秒>
			 *    <タイマー: 操作, 分, 秒>
			 *
			 *  操作ではスタートするかストップするかを以下の記法で指定する。
			 *  - スタート: "Start", "始動", "スタート"
			 *  - ストップ: "Stop", "停止", "ストップ"
			 * スタートの場合は分と秒を数値で指定してください。
			 * ストップでは分と秒は指定しないでください。
			 *
			 * 例1: 1分10秒のタイマーをスタートする
			 *   <Timer: Start, 1, 10>
			 *   <タイマー: 始動, 1, 10>
			 *   <タイマー: スタート, 1, 10>
			 * 例2: タイマーをストップする
			 *   <Timer: Stop>
			 *   <タイマー: 停止>
			 *   <タイマー: ストップ>
			 *
			 * ○ (9) 条件分岐
			 * 「条件分岐」は、以下の記法で組み込みます。
			 *  ---
			 *  <If: 条件の対象, 引数1, 引数2, 引数3>
			 *  条件を満たしている時の処理
			 *  <Else>
			 *  条件を満たしていない時の処理
			 *  ---
			 *  詳細を述べる前に、いくつか具体例を記します。
			 *  いずれの例も、条件が満たされているときは
			 *   「私もずっと前から好きでした。」
			 *  というメッセージを、条件を満たさないときは
			 *   「ごめんなさい。お友達でいましょう。」
			 *  とメッセージを表示します。
			 *
			 *  例1: スイッチ1がONのとき
			 *   ---
			 *   <If: Switches[1], ON>
			 *   私もずっと前から好きでした。
			 *   <Else>
			 *   ごめんなさい。お友達でいましょう。
			 *   <End>
			 *   ---
			 *
			 *  例2: 変数1が定数2と等しいとき
			 *   ---
			 *   <If: Variables[1], ==, 2>
			 *   私もずっと前から好きでした
			 *   <Else>
			 *   ごめんなさい。お友達でいましょう。
			 *   <End>
			 *   ---
			 *
			 *  例3: ID1のアクターがパーティにいるとき
			 *   ---
			 *   <If: Actors[1], in the party>
			 *   私もずっと前から好きでした。
			 *   <Else>
			 *   ごめんなさい。お友達でいましょう。
			 *   <End>
			 *   ---
			 *
			 *  条件の対象毎に引数の記法が異なり、引数2,引数3を使わないものもあります。
			 *  以降、条件の対象毎に記法を説明します。
			 *
			 * ・スイッチを条件に使うとき
			 *  スイッチを条件に使うときは、以下のように条件を書きます。
			 *  <If: Switches[スイッチID], 値("ON" or "OFF")>
			 *
			 *  "Switches"は"SW"や"スイッチ"で代替できます。
			 *  また、代入値は基本的に"ON"か"OFF"で指定しますが、
			 *  以下のような代替記号でも指定できます。
			 *   - "ON": "オン", "true", "1"
			 *   - "OFF": "オフ", "false", "0"
			 *
			 *  例えば、以下の通りです。
			 *   例1: スイッチ1が"ON"のとき
			 *    - "<If: Switches[1], ON>"
			 *    - "<If: SW[1], true>"
			 *    - "<If: スイッチ[1], オン>"
			 *   例2: スイッチ1が"OFF"のとき
			 *    - "<If: Switches[1], OFF>"
			 *    - "<If: SW[1], false>"
			 *    - "<If: スイッチ[1], オフ>"
			 *
			 * ・変数を条件に使うとき
			 *  変数を条件に使うときは、以下のように条件を書きます。
			 *  <If: Variables[変数ID], 条件式(記号), オペランド(定数 or 変数)>
			 *
			 *  "Variables"は"V"や"変数"でも代替できます。
			 *  条件式に使える記号は以下の通りです。
			 *   - 等しい: "==" , "＝"(全角のイコールです)
			 *   - 以上: ">=", "≧"
			 *   - 以下: "<=", "≦"
			 *   - 大きい: ">", "＞"
			 *   - 小さい: "<", "＜"
			 *   - 等しくない: "!=", "≠"
			 *
			 *  オペランドの指定方法は以下の通りです。
			 *   - 定数: "1", "2"など数値をそのまま記入
			 *   - 変数: "Variables[変数ID]", "V[変数ID]", "変数[変数ID]"
			 *
			 *  例えば、以下の通りです。
			 *   例1: 変数1が定数2と等しいとき
			 *    - "<If: Variables[1], ==, 2>"
			 *    - "<If: V[1], ==, 2>"
			 *    - "<If: 変数[1], ＝, 2>"
			 *   例2: 変数1が変数2の値以上のとき
			 *    - "<If: Variables[1], >=, Variables[2]>"
			 *    - "<If: V[1], >=, V[2]>"
			 *    - "<If: 変数[1], >=, 変数[2]>"
			 *
			 * ・セルフスイッチを条件に使うとき
			 *  セルフスイッチを条件に使うときは、以下のように条件を書きます。
			 *  <If: SelfSwitches[セルフスイッチ記号(A,B,C, or D)], 代入値(ON or OFF)>
			 *
			 *  "SelfSwitches"は"SSW"や"セルフスイッチ"でも代替できます。
			 *  また、代入値は基本的に"ON"か"OFF"で指定しますが、
			 *  以下のような代替記号でも指定できます。
			 *   - "ON": "オン", "true", "1"
			 *   - "OFF": "オフ", "false", "0"
			 *
			 *  例えば、以下の通りです。
			 *   例1: セルフスイッチAがONのとき
			 *    - "<If: SelfSwitches[A], ON>"
			 *    - "<If: SSW[A], true>"
			 *    - "<If: セルフスイッチ[A], オフ>"
			 *   例2: セルフスイッチBがOFFのとき
			 *    - "<If: SelfSwitches[B], OFF>"
			 *    - "<If: SSW[B], false>"
			 *    - "<If: セルフスイッチ[B], オフ>"
			 *
			 * ・タイマーを条件に使うとき
			 *  タイマーを条件に使うときは、以下のように条件を書きます。
			 *   <If: Timer, 条件式(">=" or "<="), 分, 秒>
			 *
			 *  "Timer"は"タイマー"でも代替できます。
			 *  また、条件式">="は"≧"で、"<="は"≦"で代替できます。
			 *
			 *  例えば、以下の通りです。
			 *   例1: タイマーが1分10秒以上のとき
			 *    - "<If: Timer, >=, 1, 10>"
			 *    - "<If: タイマー, ≧, 1, 10>"
			 *   例2: タイマーが1分10秒以下のとき
			 *    - "<If: Timer, <=, 1, 10>"
			 *    - "<If: タイマー, ≦, 1, 10>"
			 *
			 * ・アクターに関する情報を条件に使うとき
			 *  アクターに関する情報を条件に使うときは、以下のように書きます。
			 *   <If: Actors[アクターID], 条件1, 条件2>
			 *
			 *  "Actors"は"アクター"でも代替できます。
			 *  条件1で対象を指定します。
			 *   - パーティにいる
			 *   - 名前
			 *   - 職業
			 *   - スキル
			 *   - 武器
			 *   - 防具
			 *   - ステート
			 *  を指定できます。
			 *  条件2は条件1で指定した対象によって使い方が異なります。
			 *  以下に、条件1での対象毎に説明します。
			 *
			 *  * アクターがパーティにいるかどうか
			 *   アクターがパーティにいるかどうかを判定するときは以下のように指定します。
			 *    <If: Actors[アクターID], in the party>
			 *
			 *    "in the party"は"パーティにいる"という文字列でも代替できます。
			 *    条件2は使用しません。
			 *
			 *    例えば、ID1のアクターがパーティにいるかどうかを条件に使うときは以下の
			 *   ように書きます。
			 *    - "<If: Actors[1], in the party>"
			 *    - "<If: アクター[1], パーティにいる>"
			 *
			 *  * アクターの名前
			 *   アクターの名前を条件式に使うときは以下のように指定します。
			 *    <If: Actors[アクターID], Name, 名前(自由記述)>
			 *
			 *    "Name"は"名前"でも代替できます。
			 *
			 *    例えば、ID1のアクターの名前が"ハロルド"かどうかは以下のように書きます。
			 *    - "<If: Actors[アクターID], Name, ハロルド>"
			 *    - "<If: アクター[アクターID], 名前, ハロルド>"
			 *
			 *  * 職業、スキル、武器、防具、ステート
			 *   職業、スキル、武器、防具、ステートは以下のように指定します。
			 *    <If: Actors[アクターID], テーブル名, テーブルID(1,2,...などの整数)>
			 *
			 *   テーブル名では、アクターに紐付いた情報のテーブル名を指定します。
			 *   指定方法は以下のとおりです。
			 *    - 職業: "Class", "職業"
			 *    - スキル: "Skill", "スキル"
			 *    - 武器: "Weapon", "武器"
			 *    - 防具: "Armor", "防具"
			 *    - ステート: "State", "ステート"
			 *
			 *   例えば、以下の通りです。
			 *    例1: ID1のアクターの職業が、ID2の職業のとき
			 *     - "<If: Actors[1], Class, 2>"
			 *     - "<If: アクター[1], 職業, 2>"
			 *    例2: ID1のアクターがID2のスキルを習得しているとき
			 *     - "<If: Actors[1], Skill, 2>"
			 *     - "<If: アクター[1], スキル, 2>"
			 *    例3: ID1のアクターがID2の武器を装備しているとき
			 *     - "<If: Actors[1], Weapon, 2>"
			 *     - "<If: アクター[1], 武器, 2>"
			 *    例4: ID1のアクターがID2の防具を装備しているとき
			 *     - "<If: Actors[1], Armor, 2>"
			 *     - "<If: アクター[1], 防具, 2>"
			 *    例5: ID1のアクターがID2のステートを付与されているとき
			 *     - "<If: Actors[1], State, 2>"
			 *     - "<If: アクター[1], ステート, 2>"
			 *
			 *  * 敵キャラに関する情報を条件に使うとき
			 *   敵キャラに関する情報を条件に使うときは、以下のように書きます。
			 *    <If: Enemies[戦闘中の敵キャラの番号], 条件1, 条件2>
			 *
			 *   "Enemies"は"敵キャラ", "エネミー"でも代替できます。
			 *
			 *   条件1は以下いずれかで設定します。
			 *   - 出現している: "Appeared" or "出現している"
			 *   - ステート: "State" or "ステート"
			 *
			 *  また、ステートを指定した場合は、条件2でステートのIDを指定します。
			 *
			 *  例えば以下の通りです。
			 *   例1: 1体目の敵キャラが出現しているとき
			 *    - "<If: Enemies[1], Appeared>"
			 *    - "<If: 敵キャラ[1], 出現している>"
			 *    - "<If: エネミー[1], 出現している>"
			 *   例2: 1体目の敵キャラがID2のステートにかかっているとき
			 *    - "<If: Enemies[1], State, 2>"
			 *    - "<If: 敵キャラ[1], ステート, 2>"
			 *    - "<If: エネミー[1], ステート, 2>"
			 *
			 *  * キャラクターの向きを条件に使うとき
			 *  キャラクターの向きを条件に使うときは、以下のように書きます。
			 *   <If: Characters[イベントの指定], 向き(下, 左, 右, 上)>
			 *
			 *  "Characters"は"キャラクター"でも代替できます。
			 *
			 *  引数のイベントの指定は以下のリストからご指定ください。
			 *   - プレイヤー: "Player", "プレイヤー", "-1"
			 *   - このイベント: "ThisEvent", "このイベント", "0"
			 *   - イベントID指定: "1", "2", ...
			 *
			 *  向きは以下のリストからご指定ください。
			 *  - 下: "Down", "下", "2"
			 *  - 左: "Left", "左", "4"
			 *  - 右: "Right", "右", "6"
			 *  - 上: "Up", "上", "8"
			 *
			 *  例えば、以下の通りです。
			 *   例1: プレイヤーが下向きの時
			 *    - "<If: Characters[Player], Down>"
			 *    - "<If: キャラクター[プレイヤー], 下>"
			 *    - "<If: Characters[-1], 2>"
			 *   例2: このイベントが左向きのとき
			 *    - "<If: Characters[ThisEvent], Left>"
			 *    - "<If: キャラクター[このイベント], 左>"
			 *    - "<If: Characters[0], 4>"
			 *   例3: ID1のイベントが右向きのとき
			 *    - "<If: Characters[1], Right>"
			 *    - "<If: キャラクター[1], 右>"
			 *    - "<If: Characters[1], 6>"
			 *
			 *  * 乗り物を条件に使うとき
			 *   乗り物に乗っていることを条件に使うときは、以下のように書きます。
			 *    <If: Vehicle, 乗り物の種類(小型船、大型船、飛行船)>
			 *
			 *  "Vehicle"は"乗り物"でも代替できます。
			 *
			 *  乗り物の種類は以下のリストからご指定ください。
			 *   - 小型船: "Boat", "小型船"
			 *   - 大型船: "Ship", "大型船"
			 *   - 飛行船: "Airship", "飛行船"
			 *
			 *  例えば以下の通りです。
			 *   例1: 小型船に乗っている時
			 *    - "<If: Vehicle, Boat>"
			 *    - "<If: 乗り物, 小型船>"
			 *   例2: 大型船に乗っている時
			 *    - "<If: Vehicle, Ship>"
			 *    - "<If: 乗り物, 大型船>"
			 *   例3: 飛行船に乗っている時
			 *    - "<If: Vehicle, Airsip>"
			 *    - "<If: 乗り物, 飛行船>"
			 *
			 *  * お金を条件に使うとき
			 *   お金を条件に使うときは、いかのようにかきます
			 *    <If: Gold, 条件式(≧, ≦, <), 数値(定数)
			 *
			 *   "Gold"は"お金"でも代替出来ます。
			 *
			 *   条件式に使える記号は以下の通りです。
			 *    - 以上: ">=", "≧"
			 *    - 以下: "<=", "≦"
			 *    - 小さい: "<", "＜"
			 *
			 *   例えば以下の通りです。
			 *    例1: お金を500以上所持しているとき
			 *     - "<If: Gold, >=, 500>"
			 *     - "<If: お金, ≧, 500>"
			 *    例2: 500以下しかお金を所持していないとき
			 *     - "<If: Gold, <=, 500>"
			 *     - "<If: お金, ≦, 500>"
			 *    例2: 500未満しかお金を所持していないとき
			 *     - "<If: Gold, <, 500>"
			 *     - "<If: お金, ＜, 500>"
			 *
			 *  * アイテムを条件に使うとき
			 *   アイテムを条件に使うときは以下のように書きます。
			 *    <If: Items[ID]>
			 *
			 *   "Items"は"アイテム"でも代替できます。
			 *
			 *   例えば、以下の通りです。
			 *    例1: IDが1のアイテムを所持しているとき
			 *     - "<If: Items[1]>"
			 *     - "<If: アイテム[1]>"
			 *
			 *  * 武器を条件に使うとき
			 *   武器を条件に使うときは以下のように書きます。
			 *    <If: Weapons[ID], 装備品を含むか>
			 *
			 *   "Weapons"は"武器"でも代替できます。
			 *   装備品を含む場合は、2つ目の引数の部分に"Include Equipment"もしくは
			 *   "装備品を含む"と記載してください。含まない場合は、省略してください。
			 *
			 *   例えば、以下の通りです。
			 *    例1: IDが1の武器を所持しているとき(装備品は含まない)
			 *     - "<If: Weapons[1]>"
			 *     - "<If: 武器[1]>"
			 *    例2: IDが1の武器を所持しているとき(装備品は含む)
			 *     - "<If: Weapons[1], Include Equipment>"
			 *     - "<If: 武器[1], 装備品を含む>"
			 *
			 *  * 防具を条件に使うとき
			 *   防具を条件に使うときは以下のように書きます。
			 *    <If: Armors[ID], 装備品を含むか>
			 *
			 *   "Armors"は"防具"でも代替できます。
			 *   装備品を含む場合は、2つ目の引数の部分に"Include Equipment"もしくは
			 *   "装備品を含む"と記載してください。含まない場合は、省略してください。
			 *
			 *   例えば、以下の通りです。
			 *    例1: IDが1の防具を所持しているとき(装備品は含まない)
			 *     - "<If: Armors[1]>"
			 *     - "<If: 防具[1]>"
			 *    例2: IDが1の防具を所持しているとき(装備品は含む)
			 *     - "<If: Armors[1], Include Equipment>"
			 *     - "<If: 防具[1], 装備品を含む>"
			 *
			 *  * ボタンを条件に使うとき
			 *   ボタンを条件に使うときは以下のように書きます。
			 *    <If: Button, ボタンの種類, 押され方(省略可能)>
			 *
			 *   "Button"は"ボタン"でも代替できます。
			 *   以下のリストからボタンの種類を指定してください。
			 *    - 決定: "OK", "決定"
			 *    - キャンセル: "Cancel", "キャンセル"
			 *    - シフト: "Shift", "シフト"
			 *    - 下: "Down", "下"
			 *    - 左: "Left", "左"
			 *    - 右: "Right", "右"
			 *    - 上: "Up", "上"
			 *    - ページアップ: "Pageup", "ページアップ"
			 *    - ページダウン: "Pagedown", "ページダウン"
			 *
			 *   押され方は以下のリストから指定してください。
			 *    - が押されている:
			 *       "is being pressed", "が押されている", "pressed"
			 *    - がトリガーされている:
			 *       "is being triggered", "がトリガーされている", "triggered"
			 *    - がリピートされている:
			 *       "is being repeated", "がリピートされている", "repeated"
			 *
			 *    押され方は省略が可能です。その場合は"is being pressed"が設定されます。
			 *
			 *    例えば以下の通りです。
			 *     例1: 決定ボタンが押されているとき
			 *      - "<If: Button, OK, is being pressed>"
			 *      - "<If: ボタン, 決定, が押されている>"
			 *      - "<If: Button, OK>"
			 *      - "<If: Button, OK, pressed>"
			 *     例2: シフトボタンがトリガーされているとき
			 *      - "<If: Button, Shift, is being triggered>"
			 *      - "<If: ボタン, シフト, がトリガーされている>"
			 *      - "<If: Button, Shift, triggered>"
			 *     例3: 下ボタンがリピートされているとき
			 *      - "<If: Button, Down,  is being repeated>"
			 *      - "<If: ボタン, 下, がリピートされている>"
			 *      - "<If: Button, Down, repeated>"
			 *
			 *  * スクリプトを条件に使う時
			 *   スクリプトを条件に使うときは以下のように書きます。
			 *    <If: Script, スクリプト本文(Javascript)>
			 *
			 *   "Script"は"スクリプト"か"SC"でも代替できます。
			 *   例えば、"$gameParty._gold < $gameVariables.value(1)"を
			 *   条件にするときは以下のように書けます。
			 *    - "<If: Script, $gameParty._gold == $gameVariables.value(1)>"
			 *    - "<If: スクリプト, $gameParty._gold == $gameVariables.value(1)>"
			 *    - "<If: SC, $gameParty._gold == $gameVariables.value(1)>"
			 *
			 * ・その他の条件分岐の特徴
			 *  別記法として、以下の対応関係で日本語表記もできます。
			 *    - If: "条件分岐"
			 *    - Else: "それ以外のとき"
			 *    - End: "分岐修了"
			 *  <Else>とその処理は省略することができます。
			 *
			 *  入れ子にすることができます。例えば以下のようにすることもできます。
			 *  ---
			 *  <If: Switch[1], ON>
			 *    <If: Switch[2], ON>
			 *    1つ目と2つ目の条件が満たされているときの処理
			 *    <End>
			 *  <Else>
			 *  1つ目の条件が満たされていないときの処理
			 *  <End>
			 *  ---
			 *
			 *  条件分岐の中は「変数の操作」や「コモンイベント」など、その他の
			 *  イベントコマンドも組み込むことができます。
			 *  ---
			 *  <If: Switch[1], ON>
			 *    <Set: 1, 2>
			 *    <CommonEvent: 3>
			 *    私もずっと前から好きでした。
			 *  <Else>
			 *    <Set: 3, 4>
			 *    <CommonEvent: 4>
			 *    ごめんなさい。お友達でいましょう。
			 *  <End>
			 *  ---
			 *
			 *  "<End>"を書かなかった場合は、以降のメッセージやタグが全てIfもしくはElseの処
			 *  理として組み込まれます。
			 *  タグ(If, Else, END)の直後は可能な限り改行してください。改行せずに次のイベン
			 *  トやメッセージを入力した場合の動作は保証されていません。
			 *
			 *
			 *
			 * ○ (10) ループ
			 * 「ループ」は以下の記法で組み込みます
			 *  ---
			 *  <Loop>
			 *  ループしたい処理
			 *  <RepeatAbove>
			 *  ---
			 *
			 *  "Loop"は"ループ"、"RepeatAbove"は"以上繰り返し"や"RA"で代替できます。
			 *
			 *  ループしたい処理は、メッセージの表示や他のタグを自由に組み込めます。
			 *
			 *  以下の具体例は、"今日も一日がんばるぞい！"というメッセージが
			 *  無限ループします。
			 *  ---
			 *  <Loop>
			 *  今日も一日がんばるぞい！
			 *  <RepeatAbove>
			 *  ---
			 *
			 *  以下の例では、他のタグと組み合わせることで、
			 *  "今日も一日がんばるぞい！"を
			 *  5回表示させる処理になります。
			 *  """
			 *  <Set: 1, 0>
			 *  <Loop>
			 *  <If: Variables[1], ==, 5>
			 *    <BreakLoop>
			 *  <End>
			 *  今日も一日がんばるぞい！
			 *  <Add: 1, 1>
			 *  <RepeatAbove>
			 *  """
			 *  "Set"と"Add"は「変数の操作」を、"If"と"End"は「条件分岐」を、
			 *  "BreakLoop"はループの
			 *  中断の説明をご覧ください。
			 *
			 *
			 * ○ (11) ループの中断
			 *  「ループの中断」は以下のいずれかの記法で組み込みます。
			 *   <BreakLoop>
			 *   <ループの中断>
			 *   <BL>
			 *
			 * ○ (12) イベント処理の中断
			 * 「イベント処理の中断」は以下のいずれかの記法で組み込みます。
			 *   <ExitEventProcessing>
			 *   <イベント処理の中断>
			 *   <EEP>
			 *
			 * ○ (13) コモンイベント
			 * 「コモンイベント」は以下のいずれかの記法で組み込みます。
			 *    <CommonEvent: コモンイベントID>
			 *    <CE: コモンイベントID>
			 *    <コモンイベント: コモンイベントID>
			 *
			 *  例えば以下のように記述すると、ID2のコモンイベントが組み込まれます。
			 *    <CommonEvent: 2>
			 *    <CE: 2>
			 *    <コモンイベント: 2>
			 *
			 * ○ (14) ラベル
			 * 「ラベル」は以下のいずれかの記法で指定します。
			 *   <Label: ラベル名>
			 *   <ラベル: ラベル名>
			 *
			 *  例えば以下のように記述すると"Start"というラベルが組み込まれます。
			 *   <Label: Start>
			 *   <ラベル: Start>
			 *
			 * ○ (15) ラベルジャンプ
			 * 「ラベルジャンプ」は以下のいずれかの記法で指定します。
			 *   <JumpToLabel: ジャンプ先のラベル名>
			 *   <ラベルジャンプ: ジャンプ先のラベル名>
			 *   <JTL: ジャンプ先のラベル名>
			 *
			 *  例えば以下のように記述すると"Start"と名付けられたラベルへのラベルジャンプが
			 *  組み込まれます。
			 *   <JumpToLabel: Start>"
			 *   <ラベルジャンプ: Start>
			 *   <JumpToLabel: Start>"
			 *
			 * ○ (16) 注釈
			 *  注釈のイベントコマンドは、以下のように<comment>と</comment>で挟み込む
			 *  記法で指定します。
			 *  <comment>
			 *   注釈の内容
			 *  </comment>
			 *
			 *  例えば以下のとおりです。
			 *  <comment>
			 *  この辺からいい感じのBGMを再生する。
			 *  選曲しないと・・・。
			 *  </comment>
			 *
			 *  別記法として<CO>か、<注釈>としても記述できます。
			 * また、
			 * <comment>この辺からいい感じのBGMを再生する。</comment>
			 * というように1行で記述することもできます。
			 *
			 *
			 * ○ (17) 所持金の増減
			 * 「所持金の増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeGold: 操作, オペランド>
			 *   <所持金の増減: 操作, オペランド>
			 *
			 * 操作リスト
			 *  - 増やす: "Increase", "+", "増やす"
			 *  - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 *  - 定数: "1以上の整数"
			 *  - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: 所持金を1増やす
			 *   <ChangeGold: Increase, 1>
			 *   <ChangeGold: +, 1>
			 *   <所持金の増減: 増やす, 1>
			 *
			 * 例2: 所持金を変数5の値分減らす
			 *   <ChangeGold: Decrease, Variables[5]>
			 *   <ChangeGold: -, V[5]>
			 *   <所持金の増減: 減らす, 変数[5]>
			 *
			 *
			 * ○ (18) アイテムの増減
			 * 「アイテムの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeItems: アイテムID, 操作, オペランド>
			 *   <アイテムの増減: アイテムID, 操作, オペランド>
			 *
			 * 操作リスト
			 *  - 増やす: "Increase", "+", "増やす"
			 *  - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 *  - 定数: "1以上の整数"
			 *  - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: IDが3のアイテムを4つ増やす
			 *   <ChangeItems: 3, Increase, 4>
			 *   <ChangeItems: 3, +, 4>
			 *   <アイテムの増減: 3, 増やす, 4>
			 *
			 * 例2: IDが3のアイテムを変数2の値だけ減らす
			 *   <ChangeItems: 3, Decrease, Variables[2]>
			 *   <ChangeItems: 3, -, Variables[2]>
			 *   <アイテムの増減: 3, 減らす, 変数[2]>
			 *
			 *
			 * ○ (19) 武器の増減
			 * 「武器の増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeWeapons: 武器ID, 操作, オペランド, 装備品を含む>
			 *   <武器の増減: 武器ID, 操作, オペランド, 装備品を含む>
			 *
			 * 操作リスト
			 *  - 増やす: "Increase", "+", "増やす"
			 *  - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 *  - 定数: "1以上の整数"
			 *  - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 装備品を含むリスト（ツクールMV/MZでは、減らす時のみのオプション）
			 *  - チェックオン: "Include Equipment", "装備品を含む", "true", "1", "オン",
			 *                  "ON"
			 *  - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: ID1の武器を2つ増やす
			 *   <ChangeWeapons: 1, Increase, 2>
			 *   <武器の増減: 1, +, 2>
			 *   <武器の増減: 1, 増やす, 2>
			 *
			 * 例2: ID2の武器を3つ減らす。装備品を含む
			 *   <ChangeWeapons: 2, Decrease, 3, Include Equipment>
			 *   <ChangeWeapons: 2, -, 3, true>
			 *   <武器の増減: 2, 減らす, 3, 装備品を含む>
			 *
			 * 例3: ID3の武器を変数4の値だけ減らす。 装備品を含まない
			 *   <ChangeWeapons: 3, Decrease, Variables[4]>
			 *   <ChangeWeapons: 3, -, V[4], false>
			 *   <武器の増減: 3, 減らす, 変数[4], オフ>
			 *
			 *
			 * ○ (20) 防具の増減
			 * 「防具の増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeArmors: 防具ID, 操作, オペランド, 装備品を含む>
			 *   <防具の増減: 防具ID, 操作, オペランド, 装備品を含む>
			 *
			 * 操作リスト
			 *  - 増やす: "Increase", "+", "増やす"
			 *  - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 *  - 定数: "1以上の整数"
			 *  - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 装備品を含むリスト （ツクールMV/MZでは、減らす時のみのオプション）
			 *  - チェックオン: "Include Equipment", "装備品を含む", "true", "1", "オン",
			 *                  "ON"
			 *  - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: ID1の防具を2つ増やす
			 *   <ChangeArmors: 1, Increase, 2>
			 *   <防具の増減: 1, +, 2>
			 *   <防具の増減: 1, 増やす, 2>
			 *
			 * 例2: ID2の防具を3つ減らす。 装備品を含む
			 *   <ChangeArmors: 2, Decrease, 3, Include Equipment>
			 *   <ChangeArmors: 2, -, 3, true>
			 *   <防具の増減: 2, 減らす, 3, 装備品を含む>
			 *
			 * 例3: ID3の防具を変数4の値だけ減らす。 装備品を含まない
			 *   <ChangeArmors: 3, Decrease, Variables[4]>
			 *   <ChangeArmors: 3, -, V[4], false>
			 *   <防具の増減: 3, 減らす, 変数[4], オフ>
			 *
			 *
			 * ○ (21) メンバーの入れ替え
			 * 「メンバーの入れ替え」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangePartyMember: アクターID, 操作, 初期化>
			 *   <メンバーの入れ替え: アクターID, 操作, 初期化>
			 *
			 * 操作リスト
			 * - 加える: "Add", "+", "加える"
			 * - 外す: "Remove", "-", "外す"
			 *
			 * 初期化リスト
			 * - チェックオン: "Initialize", "初期化", "true", "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: ID6のアクターをパーティに加える。 初期化
			 *   <ChangePartyMember: 6, Add, Initialize>
			 *   <ChangePartyMember: 6, +, true>
			 *   <メンバーの入れ替え: 6, 加える, 初期化>
			 *
			 * 例2: ID2のアクターをパーティから外す。
			 *   <ChangePartyMember: 2, Remove>
			 *   <ChangePartyMember: 2, ->
			 *   <メンバーの入れ替え: 2, 外す>
			 *
			 *
			 * ○ (22) HPの増減
			 * 「HPの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeHp: アクター, 操作, オペランド, 戦闘不能を許可>
			 *   <HPの増減: アクター, 操作, オペランド, 戦闘不能を許可>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 戦闘不能を許可リスト
			 * - チェックオン: "Allow Knockout", "戦闘不能を許可", "true", "1", "オン",
			 *                 "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: ID4のアクターのHPを2増やす
			 *   <ChangeHp: 4, Increase, 2>
			 *   <ChangeHp: 4, +, 2>
			 *   <HPの増減: 4, 増やす, 2>
			 *
			 * 例2: IDが変数5の値のアクターのHPを変数2の値だけ減らす。 戦闘不能を許可
			 *   <ChangeHp: Variables[5], Decrease, Variables[2], Allow Knockout>
			 *   <ChangeHp: Variables[5], -, V[2], true>
			 *   <HPの増減: 変数[5], 減らす, 変数[2], 戦闘不能を許可>
			 *
			 *
			 * ○ (23) MPの増減
			 * 「MPの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeMp: アクター, 操作, オペランド>
			 *   <MPの増減: アクター, 操作, オペランド>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: ID4のアクターのMPを2増やす
			 *   <ChangeMp: 4, Increase, 2>
			 *   <ChangeMp: 4, +, 2>
			 *   <MPの増減: 4, 増やす, 2>
			 *
			 * 例2: IDが変数5の値のアクターのMPを変数2の値だけ減らす
			 *   <ChangeMp: Variables[5], Decrease, Variables[2]>
			 *   <ChangeMp: V[5], -, V[2]>
			 *   <MPの増減: 変数[5], 減らす, 変数[2]>
			 *
			 * ○ (24) TPの増減
			 * 「TPの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeTp: アクター, 操作, オペランド>
			 *   <TPの増減: アクター, 操作, オペランド>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: IDが4のアクターのTPを2増やす
			 *   <ChangeTp: 4, Increase, 2>
			 *   <ChangeTp: 4, +, 2>
			 *   <TPの増減: 4, 増やす, 2>
			 *
			 * 例2: IDが変数5の値のアクターのTPを変数2の値だけ減らす
			 *   <ChangeTp: Variables[5], Decrease, Variables[2]>
			 *   <ChangeTp: V[5], -, V[2]>
			 *   <TPの増減: 変数[5], 減らす, 変数[2]>
			 *
			 *
			 * ○ (25) ステートの変更
			 * 「ステートの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeState: アクター, 操作, ステートID>
			 *   <ステートの変更: アクター, 操作, ステートID>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 付加: "Add", "+", "付加"
			 * - 解除: "Remove", "-", "解除"
			 *
			 * 例1: IDが1のアクターにIDが4のステートを付加する
			 *   <ChangeState: 1, Add, 4>
			 *   <ChangeState: 1, +, 4>
			 *   <ステートの変更: 1, 付加, 4>
			 *
			 * 例2: IDが変数3のアクターのIDが2のステートを解除する
			 *   <ChangeState: Variables[3], remove, 2>
			 *   <ChangeState: V[3], Remove, 2>
			 *   <ステートの変更: 変数[3], 解除, 2>
			 *
			 *
			 * ○ (26) 全回復
			 * 「全回復」は以下のいずれかの記法で組み込むことができます。
			 *   <RecoverAll: アクター>
			 *   <全回復: アクター>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: IDが1のアクターを全回復
			 *   <RecoverAll: 1>
			 *   <全回復: 1>
			 *
			 * 例2: パーティ全体を全回復
			 *   <RecoverAll: Entire Party>
			 *   <RecoverAll: 0>
			 *   <全回復: パーティ全体>
			 *
			 *
			 * ○ (27) 経験値の増減
			 * 「経験値の増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeExp: アクター, 操作, オペランド, レベルアップを表示>
			 *   <経験値の増減: アクター, 操作, オペランド, レベルアップを表示>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "V[変数ID]", "変数[変数ID]"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * レベルアップを表示リスト
			 * - チェックオン: "Show Level Up", "レベルアップを表示", "true", "1", "オン",
			 *                 "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: IDが3のアクターの経験値を1増やす。 レベルアップを表示
			 *   <ChangeExp: 3, Increase, 1, Show Level Up>
			 *   <ChangeExp: 3, +, 1, true>
			 *   <経験値の増減: 3, 増やす, 1, レベルアップを表示>
			 *
			 * 例2: IDが変数1のアクターの経験値を変数3の値だけ減らす
			 *   <ChangeExp: Variables[1], Decrease, Variables[3]>
			 *   <ChangeExp: V[1], -, V[3]>
			 *   <経験値の増減: 変数[1], 減らす, 変数[3]>
			 *
			 *
			 * ○ (28) レベルの増減
			 * 「レベルの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeLevel: アクター, 操作, オペランド, レベルアップを表示>
			 *   <レベルの増減: アクター, 操作, オペランド, レベルアップを表示>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * レベルアップを表示リスト
			 * - チェックオン: "Show Level Up", "レベルアップを表示", "true", "1", "オン",
			 *                 "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF"
			 *
			 * 例1: IDが3のアクターのレベルを1増やす。 レベルアップを表示
			 *   <ChangeLevel: 3, Increase, 1, Show Level Up>
			 *   <ChangeLevel: 3, +, 1, true>
			 *   <レベルの増減: 3, 増やす, 1, レベルアップを表示>
			 *
			 * 例2: IDが変数1のアクターのレベルを変数3の値だけ減らす
			 *   <ChangeLevel: Variables[1], Decrease, Variables[3]>
			 *   <ChangeLevel: V[1], -, V[3]>
			 *   <レベルの増減: 変数[1], 減らす, 変数[3]>
			 *
			 *
			 * ○ (29) 能力値の増減
			 * 「能力値の増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeParameter: アクター, 能力値, 操作, オペランド>
			 *   <能力値の増減: アクター, 能力値, 操作, オペランド>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 能力値リスト
			 * - 最大HP: "MaxHP", "0", "最大HP"
			 * - 最大MP: "MaxMP", "1", "最大MP"
			 * - 攻撃力: "Attack", "2", "攻撃力"
			 * - 防御力: "Defense", "3", "防御力"
			 * - 魔法力: "M.Attack", "4", "魔法力"
			 * - 魔法防御: "M.Defense", "5", "魔法防御"
			 * - 敏捷性: "Agility", "6", "敏捷性"
			 * - 運: "Luck", "7", "運"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: IDが5のアクターの最大HPを10増やす
			 *   <ChangeParameter: 5, MaxHp, Increase, 10>
			 *   <ChangeParameter: 5, 0, +, 10>
			 *   <能力値の増減: 5, 最大HP, 増やす, 10>
			 *
			 * 例2: IDが変数2のアクターの魔法力を変数4の値だけ減らす
			 *   <ChangeParameter: Variables[2], M.Attack, Decrease, Variables[4]>
			 *   <ChangeParameter: Variables[2], 4, -, Variables[4]>
			 *   <能力値の増減: 変数[2], 魔法力, 減らす, 変数[4]>
			 *
			 *
			 * ○ (30) スキルの増減
			 * 「スキルの増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeSkill: アクター, 操作, スキルID>
			 *   <スキルの増減: アクター, 操作, スキルID>
			 *
			 * アクターリスト
			 * - パーティ全体: "Entire Party", "パーティ全体", "0"
			 * - アクターIDを指定: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 操作リスト
			 * - 覚える: "Learn", "+", "覚える"
			 * - 忘れる: "Forget", "-", "忘れる"
			 *
			 * 例1: IDが1のアクターがIDが2のスキルを覚える
			 *   <ChangeSkill: 1, Learn, 2>
			 *   <スキルの増減: 1, 覚える, 2>
			 *
			 * 例2: IDが変数4のアクターがIDが1のスキルを忘れる
			 *   <ChangeSkill: Variables[4], Forget, 1>
			 *   <スキルの増減: 変数[4], 忘れる, 1>
			 *
			 *
			 * ○ (31) 装備の変更
			 * 「装備の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEquipment: アクターID, 装備タイプID, 装備品ID>
			 *   <装備の変更: アクターID, 装備タイプID, 装備品ID>
			 *
			 *   装備品IDの補足：武器IDもしくは防具ID
			 *   装備品を外したい場合は、"None", "なし", "0"のいずれかを設定してください。
			 *
			 * 例: IDが1のアクターに、IDが2の装備タイプの、IDが6の装備品を装備
			 *   <ChangeEquipment: 1, 2, 6>
			 *   <装備の変更: 1, 2, 6>
			 *
			 *
			 * ○ (32) 名前の変更
			 * 「名前の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeName: アクターID, 名前>
			 *   <名前の変更: アクターID, 名前>
			 *
			 * 例: IDが1のアクターの名前を「ハロルド」に変更
			 *   <ChangeName: 1, ハロルド>
			 *   <名前の変更: 1, ハロルド>
			 *
			 *
			 * ○ (33) 職業の変更
			 * 「職業の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeClass: アクターID, 職業ID, レベル/経験値の保存>
			 *   <職業の変更: アクターID, 職業ID, レベル/経験値の保存>
			 *
			 * 経験値の保存リスト
			 * - チェックオン: "Save EXP", "経験値の保存", "Save Level", "レベルの保存",
			 *                 "true", "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: IDが3のアクターの職業をIDが2の職業に変更。 レベル/経験値の保存をしない
			 *   <ChangeClass: 3, 2>
			 *   <職業の変更: 3, 2, オフ>
			 *
			 * 例2: IDが3のアクターの職業をIDが2の職業に変更。 レベル/経験値の保存をする
			 *   <ChangeClass: 3, 2, Save EXP>
			 *   <職業の変更: 3, 2, 経験値の保存>
			 *
			 *
			 * ○ (34) 二つ名の変更
			 * 「二つ名の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeNickname: アクターID, 二つ名>
			 *   <二つ名の変更: アクターID, 二つ名>
			 *
			 *   二つ名は省略可能で、省略した場合は空欄で組み込まれます。
			 *
			 * 例: IDが3のアクターの二つ名を「三人目のアクター」に変更
			 *   <ChangeNickname: 3, 三人目のアクター>
			 *   <二つ名の変更: 3, 三人目のアクター>
			 *
			 *
			 * ○ (35) プロフィールの変更
			 * 「プロフィールの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeProfile: アクターID, 1行目, 2行目>
			 *   <プロフィールの変更: アクターID, 1行目, 2行目>
			 *
			 *   1行目と2行目はどちらも省略可能です。
			 *   両方省略した場合は空欄で組み込まれます。
			 *   1行目内に"\n"を記述することでプロフィールの改行も可能です。
			 *
			 * 例: IDが3のアクターのプロフィールを変更
			 *     プロフィール1行目：アクター3
			 *     プロフィール2行目：初期キャラクター
			 *   <ChangeProfile: 3, アクター3, 初期キャラクター>
			 *   <プロフィールの変更: 3, アクター3, 初期キャラクター>
			 *
			 *
			 * ○ (36) 場所移動
			 * 「場所移動」は以下のいずれかの記法で組み込むことができます。
			 *   <TransferPlayer: 位置, 向き, フェード>
			 *   <場所移動: 位置, 向き, フェード>
			 *
			 * "位置"は、以下の記法で組み込みます。
			 * - 直接指定: 以下のいずれか
			 *   - "Direct[マップID][X座標][Y座標]"
			 *   - "直接指定[マップID][X座標][Y座標]"
			 * - 変数で指定: 以下のいずれか
			 *   - "WithVariables[マップID用の変数ID][X座標用の変数ID][Y座標用の変数ID]"
			 *   - "変数で指定[マップID用の変数ID][X座標用の変数ID][Y座標用の変数ID]"
			 *
			 * 向きリスト
			 * - そのまま: "Retain", "0", "そのまま"
			 * - 下: "Down", "2", "下"
			 * - 左: "Left", "4", "左"
			 * - 右: "Right", "6", "右"
			 * - 上: "Up", "8", "上"
			 *
			 * フェードリスト
			 * - 黒: "Black", "0", "黒"
			 * - 白: "White", "1", "白"
			 * - なし: "None", "2", "なし"
			 *
			 * 例1: IDが1のマップのX座標10,Y座標20に移動。 向き：そのまま フェード：黒
			 *   <TransferPlayer: Direct[1][10][20], Retain, Black>
			 *   <場所移動: 直接指定[1][10][20], 1, 10, 20, そのまま, 黒>
			 *
			 * 例2: IDが変数1のマップの、X座標が変数2, Y座標が変数3に移動。
			 *      向き:下 フェード：白
			 *   <TransferPlayer: WithVariables[1][2][3], Down, White>
			 *   <場所移動: 変数の指定[1][2][3], 下, 白>
			 *
			 *
			 * ○ (37) 乗り物の位置設定
			 * 「乗り物の位置設定」は以下のいずれかの記法で組み込むことができます。
			 *   <SetVehicleLocation: 乗り物, 位置>
			 *   <乗り物の位置設定: 乗り物, 位置>
			 *
			 * 乗り物リスト
			 * - 小型船: "Boat", "0", "小型船"
			 * - 大型船: "Ship", "1", "大型船"
			 * - 飛行船: "Airship", "2", "飛行船"
			 *
			 * "位置"は、以下の記法で組み込みます。
			 * - 直接指定: 以下のいずれか
			 *   - "Direct[マップID][X座標][Y座標]"
			 *   - "直接指定[マップID][X座標][Y座標]"
			 * - 変数で指定: 以下のいずれか
			 *   - "WithVariables[マップID用の変数ID][X座標用の変数ID][Y座標用の変数ID]"
			 *   - "変数で指定[マップID用の変数ID][X座標用の変数ID][Y座標用の変数ID]"
			 *
			 * 例1: IDが1のマップのX座標10,Y座標20に小型船を配置
			 *   <SetVehicleLocation: Boat, Direct[1][10][20]>
			 *   <乗り物の位置設定: 小型船, 直接指定[1][10][20]>
			 *
			 * 例2: IDが変数1のマップの、X座標が変数2, Y座標が変数3に大型船を配置
			 *   <SetVehicleLocation: Ship, WithVariables[1][2][3]>
			 *   <乗り物の位置設定: 大型船, WithVariables[1][2][3]>
			 *
			 *
			 * ○ (38) イベントの位置設定
			 * 「イベントの位置設定」は以下のいずれかの記法で組み込むことができます。
			 *   <SetEventLocation: イベント, 位置, 向き>
			 *   <イベントの位置設定: イベント, 位置, 向き>
			 *
			 * イベント
			 * - このイベント: "This Event", "0", "このイベント"
			 * - イベントIDで指定: "1以上の整数"
			 *
			 * "位置"は、以下の記法で組み込みます。
			 * - 直接指定: 以下のいずれか
			 *   - "Direct[マップID][X座標][Y座標]"
			 *   - "直接指定[マップID][X座標][Y座標]"
			 * - 変数で指定: 以下のいずれか
			 *   - "WithVariables[X座標用の変数ID][Y座標用の変数ID]"
			 *   - "変数で指定[X座標用の変数ID][Y座標用の変数ID]"
			 * - 他のイベントと交換: 以下のいずれか。イベントは上述したイベントの指定方法と
			 *                       同じ引数を使えます。
			 *   - "Exchange[イベント]"
			 *   - "交換[イベント]"
			 *
			 * 向きリスト
			 * - そのまま: "Retain", "0", "そのまま"
			 * - 下: "Down", "2", "下"
			 * - 左: "Left", "4", "左"
			 * - 右: "Right", "6", "右"
			 * - 上: "Up", "8", "上"
			 *
			 * 例1: このイベントをX座標10,Y座標20に設定。 向き：そのまま
			 *   <SetEventLocation: This Event, Direct[10][20], Retain>
			 *   <イベントの位置設定: このイベント, 直接指定[10][20], そのまま>
			 *
			 * 例2: IDが12のイベントを、X座標が変数2の値,Y座標が変数3の値に設定。 向き：上
			 *   <SetEventLocation: 12, WithVariables[2][3], Up>
			 *   <イベントの位置設定: 12, 変数で指定[2][3], 上>
			 *
			 * 例3: IDが12のイベントをこのイベントと交換。 向き：上
			 *   <SetEventLocation: 12, Exchange[This Event], Up>
			 *   <イベントの位置設定: 12, 交換[このイベント], 上>
			 *
			 *
			 * ○ (39) マップのスクロール
			 * 「マップのスクロール」は以下のいずれかの記法で組み込むことができます。
			 *   <ScrollMap: 方向, 距離, 速度, 完了までウェイト>
			 *   <マップのスクロール: 方向, 距離, 速度, 完了までウェイト>
			 *
			 * 向きリスト
			 * - 下: "down", "2", "下"
			 * - 左: "left", "4", "左"
			 * - 右: "right", "6", "右"
			 * - 上: "up", "8", "上"
			 *
			 * 距離リスト
			 * - "1以上の整数"
			 *
			 * 速度
			 * - 1/8倍速: "x8 slower", "1", "1/8倍速"
			 * - 1/4倍速: "x4 slower", "2", "1/4倍速"
			 * - 1/2倍速: "x2 slower", "3", "1/2倍速"
			 * - 標準速: "normal", "4", "標準速"
			 * - 2倍速: "x2 faster", "5", "2倍速"
			 * - 4倍速: "x4 faster", "6", "4倍速"
			 *
			 * 完了までウェイトリスト（省略可能）
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                  "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * "完了までウェイト"は省略可能です。その場合は、チェックオフとなります。
			 * また、"完了までウェイト"をオンにするのはツクールMZの機能です。
			 *
			 * 例1: 下方向の距離100、標準速でマップをスクロール。 完了までウェイトしない
			 *   <ScrollMap: down, 100, normal>
			 *   <マップのスクロール: 下, 100, 標準速>
			 *   <ScrollMap: down, 100, normal, false>
			 *   <マップのスクロール: 下, 100, 標準速, オフ>
			 *
			 * 例2: 右方向の距離50、1/2倍速でマップをスクロール。 完了までウェイト
			 *   <ScrollMap: right, 50, x2 slower, Wait for Completion>
			 *   <ScrollMap: right, 50, x2 slower, Wait>
			 *   <ScrollMap: right, 50, x2 slower, ON>
			 *   <マップのスクロール: 右, 50, 1/2倍速, true>
			 *   <ScrollMap: right, 50, x2slower, オン>
			 *   <マップのスクロール: 右, 50, 1/2倍速, オン>
			 *
			 *
			 * ○ (40) 移動ルートの設定
			 * 「移動ルートの設定」は以下の記法で組み込めます。
			 *  ---
			 *  <SetMovementRoute: 対象, リピート, スキップ, 完了までウェイト>
			 *  <移動コマンド>
			 *  <移動コマンド>
			 *  ・・・
			 *  ---
			 *
			 *  "<移動コマンド>とはキャラクター（イベント）の移動方法を指示するタグです。
			 *  移動コマンドの一覧は、後述しています。
			 *  移動コマンドの羅列の終了を示すタグは必要ありません。
			 *  なお"SetMovementRoute"は"移動ルートの設定"で代替できます。
			 *
			 * 対象リスト
			 *  - プレイヤー: "player", "-1", "プレイヤー"
			 *  - このイベント: "This Event", "0", "このイベント"
			 *  - イベントIDで指定: "1以上の整数"
			 *
			 * リピートリスト
			 * - チェックオン: "Repeat", "Repeat Movements", "動作を繰り返す","true", "1",
			 *                 "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * スキップリスト
			 * - チェックオン: "Skip", "Skip If Cannot Move", "移動できない場合は飛ばす",
			 *                 "true", "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 移動コマンドの記法について示す前に、具体例を示します。
			 *
			 * 例: 移動ルートの設定。対象をプレイヤーとし、リピートしない、スキップしない
			 *     完了までウェイトする
			 *  1. x10,y20にジャンプ
			 *  2. 60フレームウェイト
			 *  3. スイッチID1をスイッチON
			 *  4. 移動速度を「標準速」に変更
			 *  5. Actor1.pngの三つ目のIDに画像を変更
			 *  6. 不透明度を255に変更
			 *  7. 合成方法を通常に変更
			 *  8. SEを「Attack1.ogg」の音量90,ピッチ100%,位相0に変更
			 *  9. スクリプトにconsole.log("今日も一日がんばるぞい！")を設定
			 *
			 * 【英語のタグ】
			 *   ---
			 *   <SetMovementRoute: player, false, false, true>
			 *   <Jump: 10, 20>
			 *   <McWait: 60>
			 *   <SwitchOn: 1>
			 *   <ChangeSpeed: normal>
			 *   <ChangeImage: Actor1, 2>
			 *   <ChangeOpacity: 255>
			 *   <ChangeBlendMode: normal>
			 *   <McPlaySe: Attack1, 90, 100, 0>
			 *   <McScript: console.log("今日も一日がんばるぞい！");>
			 *   ---
			 *
			 * 【日本語のタグ】
			 *   ---
			 *   <移動ルートの設定: プレイヤー, オフ, オフ, オン>
			 *   <ジャンプ: 10, 20>
			 *   <移動コマンドウェイト: 60>
			 *   <スイッチON: 1>
			 *   <移動速度の変更: 標準速>
			 *   <画像の変更: Actor1, 2>
			 *   <不透明度の変更: 255>
			 *   <合成方法の変更: 通常>
			 *   <移動コマンドSEの演奏: Attack1, 90, 100, 0>
			 *   <移動コマンドスクリプト: console.log("今日も一日がんばるぞい！");>
			 *   ---
			 *
			 * 以下に、移動コマンドの詳細について示します。
			 *
			 * ・引数無しの移動コマンド
			 * 引数なしの移動コマンドの一覧を示します。
			 *  ---
			 *  <MoveDown>                 <下に移動>
			 *  <MoveLeft>                 <左に移動>
			 *  <MoveRight>                <右に移動>
			 *  <MoveUp>                   <上に移動>
			 *  <MoveLowerLeft>            <左下に移動>
			 *  <MoveLowerRight>           <右下に移動>
			 *  <MoveUpperLeft>            <左上に移動>
			 *  <MoveUpperRight>           <右上に移動>
			 *  <MoveAtRandom>             <ランダムに移動>
			 *  <MoveTowardPlayer>         <プレイヤーに近づく>
			 *  <MoveAwayFromPlayer>       <プレイヤーから遠ざかる>
			 *  <OneStepForward>           <一歩前進>
			 *  <OneStepBackward>          <一歩後退>
			 *  <TurnDown>                 <下を向く>
			 *  <TurnLeft>                 <左を向く>
			 *  <TurnRight>                <右を向く>
			 *  <TurnUp>                   <上を向く>
			 *  <Turn90Right>              <右に90度回転>
			 *  <Turn90Left>               <左に90度回転>
			 *  <Turn180>                  <180度回転>
			 *  <Turn90RightorLeft>        <右か左に90度回転>
			 *  <TurnAtRandom>             <ランダムに方向転換>
			 *  <TurnTowardPlayer>         <プレイヤーの方を向く>
			 *  <TurnAwayFromPlayer>       <プレイヤーの逆を向く>
			 *  <WalkingAnimationOn>       <歩行アニメON>
			 *  <WalkingAnimationOff>      <歩行アニメOFF>
			 *  <SteppingAnimationOn>      <足踏みアニメON>
			 *  <SteppingAnimationOff>     <足踏みアニメOFF>
			 *  <DirectionFixOn>           <向き固定ON>
			 *  <DirectionFixOff>          <向き固定OFF>
			 *  <ThroughOn>                <すり抜けON>
			 *  <ThroughOff>               <すり抜けOFF>
			 *  <TransparentOn>            <透明化ON>
			 *  <TransparentOff>           <透明化OFF>
			 *  ---
			 *
			 * ・引数ありの移動コマンド
			 *  * ジャンプ
			 *  「ジャンプ」は以下のいずれかの記法で組み込みます。
			 *   <Jump: x, y>
			 *   <ジャンプ: x, y>
			 *   "x", "y"は整数値を指定してださい
			 *
			 *  * ウェイト
			 *   移動コマンドの「ウェイト」は以下のいずれかの記法で組み込みます。
			 *   <McWait: ウェイト>
			 *   <移動コマンドウェイト: ウェイト>
			 *
			 *   ウェイトは1以上の整数値で指定してください。
			 *
			 *  * スイッチON/OFF
			 *  「スイッチオンON」は以下のいずれかの記法で組み込みます。
			 *   <SwitchOn: スイッチID>
			 *   <スイッチON: スイッチID>
			 *
			 *  「スイッチOFF」は以下のいずれかの記法で組み込みます。
			 *   <SwitchOff: スイッチID>
			 *   <スイッチOFF: スイッチID>
			 *
			 *   "スイッチID"では、対象とするスイッチのIDを整数値で指定してください。
			 *
			 *
			 *  * 移動速度の変更
			 *  「移動速度の変更」は以下のいずれかの記法で組み込みます。
			 *   <ChangeSpeed: 移動速度>
			 *   <移動速度の変更: 移動速度>
			 *
			 *    移動速度リスト
			 *    - 1/8倍速: "x8 Slower", "1", "1/8倍速"
			 *    - 1/4倍速: "x4 Slower", "2", "1/4倍速"
			 *    - 1/2倍速: "x2 Slower", "3", "1/2倍速"
			 *    - 標準速: "Normal", "4", "標準速"
			 *    - 2倍速: "x2 Faster", "5", "2倍速"
			 *    - 4倍速: "x4 Faster", "6", "4倍速"
			 *
			 *  * 移動頻度の変更
			 *  「移動頻度の変更」は以下のいずれかの記法で組み込みます。
			 *   <ChangeFrequency: 移動頻度>
			 *   <移動頻度の変更: 移動頻度>
			 *
			 *    移動頻度リスト
			 *    - 最低: "Lowest", "1", "最低"
			 *    - 低: "Lower", "2", "低"
			 *    - 標準: "Normal", "3", "標準"
			 *    - 高: "Higher", "4", "高"
			 *    - 最高: "Highest", "5", "最高"
			 *
			 *  * 画像の変更
			 *  「画像の変更」は以下のいずれかの記法で組み込みます。
			 *   <ChangeImage: 画像, 画像ID>
			 *   <画像の変更: 画像, 画像ID>
			 *
			 *   "画像"は、変更したい画像の拡張子(.png)を除いたファイル名を指定してくだい。
			 *   "画像ID"は、画像ファイル内のどの位置を指定するかを設定します。
			 *   RPGツクールの仕様では、縦軸を２分割、横軸を４分割した合計８つのエリアに
			 *   画像を分割して考えます。
			 *   その分割したエリア毎に、以下のように数字が割り振られます。
			 *   "画像ID"は省略可能です。省略した場合は、"0"になります。
			 *    |0|1|2|3|
			 *    |4|5|6|7|
			 *
			 *   画像を「なし」に設定したい場合は、"None"か"なし"に設定してください。
			 *
			 *  * 不透明度の変更
			 *  「不透明度の変更」は以下のいずれかの記法で組み込みます。
			 *   <ChangeOpacity: 不透明度>
			 *   <不透明度の変更: 不透明度>
			 *
			 *   "不透明度"には、"0"以上"255"以下の整数値を入力してください。
			 *
			 *  * 合成方法の変更
			 *  「合成方法の変更」は以下のいずれかの記法で組み込みます
			 *   <ChangeBlendMode: 合成方法>
			 *   <合成方法の変更: 合成方法>
			 *
			 *   合成方法リスト
			 *    - 通常: "Normal", "0", "通常"
			 *    - 加算: "Additive", "1", "加算"
			 *    - 乗算: "Multiply", "2", "乗算"
			 *    - スクリーン: "Screen", "3", "スクリーン"
			 *
			 *  * SEの演奏
			 *   移動コマンドの「SEの演奏」は以下のいずれかの記法で組み込みます。
			 *   <McPlaySe: ファイル名, 音量, ピッチ, 位相>
			 *   <移動コマンドSEの演奏: ファイル名, 音量, ピッチ, 位相>
			 *
			 *   必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *   指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *   ファイル名を「なし」にしたいときは"None"か"なし"と記述してください。
			 *
			 *  * スクリプト
			 *   移動コマンドの「スクリプト」は以下のいずれかの記法で組み込みます。
			 *   <McScript: スクリプト>
			 *   <移動コマンドスクリプト: スクリプト>
			 *
			 *
			 * ○ (41) 乗り物の乗降
			 * 「乗り物の乗降」は以下のいずれかの記法で組み込むことができます。
			 *   <GetOnOffVehicle>
			 *   <乗り物の乗降>
			 *
			 * ○ (42) 透明状態の変更
			 * 「透明状態の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeTransparency: 透明状態>
			 *   <透明状態の変更: 透明状態>
			 *
			 * 透明状態リスト
			 * - ラジオボタンオン: "ON", "true", "オン", "0",
			 * - ラジオボタンオフ: "OFF", "false", "オフ", "1"
			 *
			 * 例: 透明状態をオンに変更
			 *   <ChangeTransparency: ON>
			 *   <透明状態の変更: オン>
			 *
			 *
			 * ○ (43) 隊列歩行の変更
			 * 「隊列メンバーの集合」は以下のいずれかの記法で組み込むことができます。
			 *   <GatherFollowers>
			 *   <隊列メンバーの集合>
			 *
			 * ○ (44) 隊列メンバーの集合
			 * 「隊列メンバーの集合」は以下のいずれかの記法で組み込むことができます。
			 *   <GatherFollowers>
			 *   <隊列メンバーの集合>
			 *
			 * ○ (45) アニメーションの表示
			 * 「アニメーションの表示」は以下のいずれかの記法で組み込むことができます。
			 *   <ShowAnimation: キャラクター, アニメーションID, 完了までウェイト>
			 *   <アニメーションの表示: キャラクター, アニメーションID, 完了までウェイト>
			 *
			 * キャラクターリスト
			 * - プレイヤー: "Player", "-1", "プレイヤー"
			 * - このイベント: "This Event", "0", "このイベント"
			 * - イベントIDで指定: "1以上の整数"
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * "完了までウェイト"は省略可能です。その場合は、チェックオフとなります。
			 *
			 *
			 * 例1: プレイヤーを対象にID2のアニメーションを表示。 完了までウェイト
			 *   <ShowAnimation: player, 2, Wait for Completion>
			 *   <アニメーションの表示: プレイヤー, 2, 完了までウェイト>
			 *
			 * 例2: IDが3のイベントを対象にIDが4のアニメーションを表示。
			 *      完了までウェイトしない
			 *   <ShowAnimation: 3, 4>
			 *   <アニメーションの表示: 3, 4, オフ>
			 *
			 *
			 * ○ (46) フキダシアイコンの表示
			 * 「フキダシアイコンの表示」は以下のいずれかの記法で組み込むことができます。
			 *   <ShowBalloonIcon: キャラクター, フキダシアイコン, 完了までウェイト>
			 *   <フキダシアイコンの表示: キャラクター, フキダシアイコン, 完了までウェイト>
			 *
			 * キャラクターリスト
			 * - プレイヤー: "Player", "-1", "プレイヤー"
			 * - このイベント: "This Event", "0", "このイベント"
			 * - イベントID: "1以上の整数"
			 *
			 * フキダシアイコンリスト
			 * - びっくり: "Exclamation", "1", "びっくり"
			 * - はてな: "Question", "2", "はてな"
			 * - 音符: "Music Note", "3", "音符"
			 * - ハート: "Heart", "4", "ハート"
			 * - 怒り: "Anger", "5", "怒り"
			 * - 汗: "Sweat", "6", "汗"
			 * - くしゃくしゃ: "Flustration", "Cobweb", "7", "くしゃくしゃ"
			 * - 沈黙: "Silence", "8", "沈黙"
			 * - 電球: "Light Bulb", "9", "電球"
			 * - zzz: "zzz", "10"
			 * - ユーザー定義1: "user-defined1", "11", "ユーザー定義1"
			 * - ユーザー定義2: "user-defined2", "12", "ユーザー定義2"
			 * - ユーザー定義3: "user-defined3", "13", "ユーザー定義3"
			 * - ユーザー定義4: "user-defined4", "14", "ユーザー定義4"
			 * - ユーザー定義5: "user-defined5", "15", "ユーザー定義5"
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * "完了までウェイト"は省略可能です。その場合は、チェックオフとなります。
			 *
			 * 例1: プレイヤーを対象にびっくりアイコンを表示。 完了までウェイトしない
			 *   <ShowBalloonIcon: Player, Exclamation, false>
			 *   <フキダシアイコンの表示:, プレイヤー, びっくり, オフ>
			 *   <showballoonicon: -1, 1, 0>
			 *
			 * 例2: IDが2のイベントを対象にハートアイコンを表示。 完了までウェイトする
			 *   <ShowBalloonIcon: 22, Heart, Wait for Completion>
			 *   <フキダシアイコンの表示: 22, ハート, 完了までウェイト>
			 *   <ShowBalloonIcon: 22, 4, Wait>
			 *
			 *
			 * ○ (47) イベントの一時消去
			 * 「イベントの一時消去」は以下のいずれかの記法で組み込むことができます。
			 *   <EraseEvent>
			 *   <イベントの一時消去>
			 *
			 * ○ (48) ピクチャの表示
			 *  ピクチャの表示は、以下の記法で指定します。
			 *  <ShowPicture: ピクチャ番号,ファイル名,オプション1,オプション2,オプション3>
			 *
			 *  必須の引数はピクチャ番号(整数)とファイル名だけです。
			 *  位置・拡大率・合成はオプションとして指定でき、指定しない場合はデフォルト値
			 *  が設定されます。
			 *  "ShowPicture"は"ピクチャの表示"か"SP"で代替できます。
			 *
			 *  オプションの指定方法を述べる前に、いくつか具体例を記します。
			 *
			 *  例1: 以下のデフォルト設定でピクチャを表示する。
			 *    - ピクチャ番号: 1
			 *    - 画像ファイル名: Castle.png
			 *    - 位置: 原点は左上でX座標0, Y座標0(デフォルト設定)
			 *    - 拡大率: 幅50%, 高さ55%
			 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
			 *   <ShowPicture: 1, Castle, Scale[50][55],>
			 *   <ピクチャの表示: 1, Castle, 拡大率[50][55]>
			 *   <SP: 1, Castle, Scale[50][55]>
			 *
			 *  例2:  以下の設定(拡大率だけ指定)でピクチャを表示
			 *    - ピクチャ番号: 2
			 *    - 画像ファイル名: Castle.png
			 *    - 位置: 原点は中央でX座標は変数2,Y座標は変数3
			 *    - 拡大率: 幅100%, 高さ100%(デフォルト設定)
			 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
			 *   <ShowPicture: 2, Castle,  Position[Center][Variables[2]][Variables[3]]>
			 *   <ピクチャの表示: 2, Castle, 位置[中央][変数[2][変数[3]]>
			 *   <SP: 2, Castle, Position[Center][V[2]][V[3]]>
			 *
			 *  例3: 以下の設定でピクチャを表示
			 *    - ピクチャ番号: 3
			 *    - 画像ファイル名: Castle.png
			 *    - 位置: 原点は中央で、X座標は10,Y座標は20
			 *    - 拡大率:幅100%, 高さ100%(デフォルト設定)
			 *    - 合成: 不透明度は235, 合成方法はスクリーン
			 *   <ShowPicture: 3, Castle, Position[Upper Left][10][20], Blend[235][Screen]>
			 *   <ピクチャの表示: 3, Castle, 位置[左上][100][200], 合成[235][スクリーン]>
			 *   <SP: 3, Castle, Position[Upper Left][10][20], Blend[235][Screen]>
			 *
			 *  オプションは順不同です。ピクチャ番号とファイル名は引数の位置は固定ですが、
			 *  オプション1,2,3はどのような順番で指定しても大丈夫です。
			 *
			 *  ・位置
			 *   ピクチャの位置は、以下の記法で指定します。
			 *   Position[原点("Upper Left"か "Center")][X座標][Y座標]
			 *
			 *   "Position"は"位置"でも代替できます。
			 *   X,Y座標は定数か変数で指定できます。
			 *   定数は整数値をそのまま入力し、変数の場合は"Variables[変数ID]"というよう
			 *   に指定します。
			 *   "Variables"は"変数"か"V"でも代替できます。
			 *
			 *   例えば以下の通りです。
			 *    - 例1: 原点は左上, X座標は100, Y座標は200,
			 *      - "Position[Upper Left][100][200]"
			 *      - "位置[左上][100][200]"
			 *    - 例2: X座標は変数2の値, 変数3の値
			 *      - "Position[Center][Variables[2]][Variables[3]]"
			 *      - "位置[中央][変数[2]][変数[3]]"
			 *      - "Position[Center][V[2]][V[3]]"
			 *   位置を指定しなかった場合のデフォルト値は"Position[Upper Left][0][0]"
			 *   となります。
			 *
			 *  ・拡大率
			 *    ピクチャの拡大率は、以下の記法で指定します。
			 *    Scale[幅(％)][高さ(％)]
			 *
			 *   "Scale"は"拡大率"でも代替できます。
			 *
			 *   例えば幅90%, 高さ95%は以下のように指定します。
			 *   - "Scale[90][95]"
			 *   - "拡大率[90][95]"
			 *   拡大率を指定しなかった場合のデフォルト値は"Scale[100][100]"
			 *   となります。
			 *
			 *  ・合成
			 *   ピクチャの合成は、以下の記法で指定します。
			 *   Blend[不透明度(0~255の整数)][合成方法(通常,加算,乗算,or スクリーン)]
			 *   "Blend"は"合成"で代替できます。
			 *
			 *   不透明度は以下のリストから指定します。
			 *   - 通常: "Normal", "通常"
			 *   - 加算: "Additive", "加算"
			 *   - 乗算: "Multiply", "乗算"
			 *   - スクリーン: "Screen", "スクリーン"
			 *
			 *   例えば不透明度が200で、加算を指定する場合は以下のように指定します。
			 *   - "Blend[200][Additive]"
			 *   - "合成[200][加算]"
			 *   合成を指定しなかった場合のデフォルト値は"Blend[255][Normal]"
			 *   となります。
			 *
			 *
			 * ○ (49) ピクチャの移動
			 *  ピクチャの合成は、以下の記法で指定します。
			 *  <MovePicture:ピクチャ番号,オプション1,オプション2,オプション3,オプション4>
			 *
			 *  必須の引数はピクチャ番号だけです。
			 *  移動にかける時間と、位置・拡大率・合成はオプションとして指定でき、
			 *  指定しない場合はデフォルト値が設定されます。
			 *
			 *  "MovePictures"は"ピクチャの移動"か"MP"で代替できます。
			 *
			 *  オプションの指定方法を述べる前に、いくつか具体例を記します。
			 *  例1: 以下のデフォルト設定でピクチャを移動する。
			 *    - ピクチャ番号: 1
			 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
			 *    - 位置: 原点は中央で、X座標は変数2,Y座標は変数3
			 *    - 拡大率: 幅100%, 高さ100%(デフォルト設定)
			 *    - 合成: 不透明度は255, 合成方法は通常(デフォルト設定)
			 *   <MovePicture: 1, Position[Center][Variables[2]][Variables[3]]>
			 *   <ピクチャの移動: 1, 位置[中央][変数[2]][変数[3]]>
			 *   <MP: 1, Position[Center][V[2]][V[3]]>
			 *
			 *   例2: 以下の設定でピクチャを移動
			 *    - ピクチャ番号: 2
			 *    - 時間: 45フレーム, 完了までウェイトしない
			 *    - 位置: 原点は左上でX座標0, Y座標0(デフォルト設定)
			 *    - 拡大率:幅90%, 高さ95%
			 *    - 合成: 不透明度は235, 合成方法はスクリーン
			 *   <MovePicture: 2, Duration[45][], Blend[235][Screen], Scale[90][95]>
			 *   <ピクチャの移動: 2, 時間[45], 合成[235][スクリーン], 拡大率[90][95]>
			 *   <MP: 2, Duration[45], Blend[235][Screen], Scale[90][95]>
			 *
			 *  オプションは順不同です。ピクチャ番号の引数の位置は固定ですが、
			 *  オプション1,2,3,4はどのような順番で指定しても大丈夫です。
			 *  また、
			 *   - 位置
			 *   - 拡大率
			 *   - 合成
			 *  については、「ピクチャの表示」イベントタグのオプションの記法と
			 *  同一なので、そちらをご覧ください。
			 *
			 *  ・時間
			 *    ピクチャの移動時間は、以下の記法で指定します。
			 *    Duration[フレーム数][ウェイトするか否か("Wait for Completion" or 省略)]
			 *
			 *    "Duration"は"時間"で、"Wait for Completion"は"完了までウェイト"か
			 *    "Wait"で代替できます。
			 *
			 *    例えば、以下の通りです。
			 *    例1: 45フレームで完了するまでウェイトする
			 *      - "Duration[45][Wait for Completion]"
			 *      - "時間[45][完了までウェイト]"
			 *      - "時間[45][Wait]"
			 *    例2: 60フレームで完了するまでウェイトしない
			 *      - "Duration[60]"
			 *      - "時間[60]"
			 *      - "Duration[60][]"
			 *
			 *    時間を指定しなかった場合のデフォルト値は
			 *    "Duration[60][Wait for Completion]"となります。
			 *
			 *  ・イージング
			 *    イージングは以下の記法で指定します。
			 *    Easing[モード]
			 *      モードは以下の4つを選択できます。
			 *       - "Constant speed"
			 *       - "Slow start"
			 *       - "Slow end"
			 *       - "Slow start and end"
			 *
			 *   "Easing"は"イージング"でも代替できます。
			 *   モードは以下の対応関係で代替できます。
			 *     - "Constant speed": "一定速度", "Linear"
			 *     - "Slow start": "ゆっくり始まる", "Ease-in"
			 *     - "Slow end": "ゆっくり終わる", "Ease-out"
			 *     - "Slow start and end": "ゆっくり始まってゆっくり終わる", "Ease-in-out"
			 *
			 *    例えば、以下の通りです。
			 *    例1: 一定速度
			 *     - "Easing[Constant speed]"
			 *     - "イージング[一定速度]"
			 *     - "Easing[Linear]"
			 *    例2: ゆっくり始まってゆっくり終わる
			 *     - "Easing[Slow start and end]"
			 *     - "イージング[ゆっくり始まってゆっくり終わる]"
			 *     - "Easing[Ease-in-out]"
			 *
			 *    イージングを指定しなかった場合のデフォルト値は
			 *    "Easing[Constant speed]"となります。
			 *
			 *
			 * ○ (50) ピクチャの回転
			 *  ピクチャの回転は以下の記法で指定します。
			 *  <RotatePicture: ピクチャ番号(整数), 回転速度(-90~90の整数)>
			 *
			 *  "RotatePicture"は"ピクチャの回転"か"RP"でも代替できます。
			 *
			 *  例えば、速度が-30で番号1のピクチャを回転するのは、以下の通りとなります。
			 *   <RotatePicture: 1, -30>
			 *   <ピクチャの回転: 1, -30>
			 *   <RP: 1, -30>
			 *
			 * ○ (51) ピクチャの色調変更
			 *  ピクチャの色調変更は以下の記法で指定します。
			 *  <TintPicture: ピクチャ番号(整数), オプション1, オプション2>
			 *
			 *  必須の引数はピクチャ番号だけです。
			 *  色調変更にかける時間と色調はオプションとして指定でき、
			 *  指定しない場合はデフォルト値が設定されます。
			 *
			 *  "TintPicture"は"ピクチャの色調変更"か"TP"で代替できます。
			 *
			 *  オプションの指定方法を述べる前にいくつか具体例を記します。
			 *  例1: 以下のデフォルト設定でピクチャの色調を変更する。
			 *    - ピクチャ番号: 1
			 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
			 *    - 色調: 赤0, 緑0, 青0, グレイ0(デフォルト設定)
			 *   <TintPicture: 1>
			 *   <ピクチャの色調変更: 1>
			 *   <TP: 1>
			 *
			 *  例2: 以下の設定でピクチャの色調を変更する。
			 *    - ピクチャ番号: 2
			 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
			 *    - 色調: 赤0, 緑255, 青255, グレイ0
			 *   <TintPicture: 2, ColorTone[0][255][255][0]>
			 *   <ピクチャの色調変更: 2, 色調[0][255][255][0]>
			 *   <TP: 2, CT[0][255][255][0]>
			 *
			 *  例3: 以下の設定でピクチャの色調を変更する。
			 *    - ピクチャ番号: 3
			 *    - 時間: 30フレーム, 完了までウェイト
			 *    - 色調: ダーク(赤-68, 緑-68, 青-68, グレイ0)
			 *   <TintPicture: 3, Duration[30][Wait for Completion], ColorTone[Dark]>
			 *   <ピクチャの色調変更: 3, 時間[30][完了までウェイト], 色調[ダーク]>
			 *   <TP: 3, Duration[30][Wait], CT[Dark]>
			 *
			 *  オプションは順不同です。ピクチャ番号は固定ですが、オプション1,2は
			 *  どのような順番で指定しても大丈夫です。
			 *
			 *  また、時間については、「ピクチャの移動」イベントタグのオプションの記法と
			 *  同一なので、そちらをご覧ください。
			 *  ここでは、色調の指定方法について記します。
			 *
			 * ・色調の指定方法
			 *   ピクチャの色調は、以下の記法で指定します。
			 *   ColorTone[赤の強さ][緑の強さ][青の強さ][グレイの強さ]>
			 *
			 *   "ColorTone"は"色調"か"CT"で代替できます。
			 *
			 *   例えば、以下のように設定できます。
			 *     - "ColorTone[-68][68][100][0]"
			 *     - "色調[-68][68][100][0]"
			 *     - "CT[-68][68][100][0]"
			 *
			 *   [赤の強さ]の部分に指定の文字列を入力することで、RPGツクールMV・MZの機能と
			 *   同様に「通常」, 「ダーク」, 「セピア」, 「夕暮れ」,「夜」で設定することが
			 *   できます。以下のように色調が対応しています。
			 *     - "通常" or "Normal": "ColorTone[0][0][0][0]"
			 *     - "ダーク" or "Dark": "ColorTone[-68][-68][-68][0]"
			 *     - "セピア" or "Sepia": "ColorTone[34][-34][-68][170]"
			 *     - "夕暮れ" or "Sunset": "ColorTone[68][-34][-34][0]"
			 *     - "夜" or "Night": "ColorTone[-68][-68][0][68]"
			 *
			 *   例えば、番号4のピクチャを1秒でセピアに変更する場合は以下のように書けます。
			 *   1秒(60フレーム)はデフォルト設定です。
			 *     <TintPicture: 4, ColorTone[Sepia]>
			 *     <ピクチャの色調変更: 4, ColorTone[セピア]>
			 *     <TP: 4, CT[Sepia]>
			 *
			 *
			 * ○ (52) ピクチャの消去
			 *  ピクチャの消去は以下の記法で指定します。
			 *  <ErasePicture: ピクチャ番号(整数)>
			 *
			 *  "ErasePicture"は"ピクチャの消去"か"EP"でも代替できます。
			 *
			 *  例えば、以下のように書くと番号1のピクチャを削除できます。
			 *   <ErasePicture: 1>
			 *   <ピクチャの消去: 1>
			 *   <EP: 1>
			 *
			 * ○ (53) ウェイト
			 *  ウェイトのイベントコマンドは、以下のいずれかの記法でしていします。
			 *  <wait: フレーム数(1/60秒)>
			 *  <ウェイト: フレーム数(1/60秒)>
			 *
			 *  例えば以下のように記述すると60フレーム(1秒)のウェイトが組み込まれます。
			 *  <wait: 60>
			 *
			 * ○ (54) 画面のフェードアウト
			 *  フェードアウトは以下のいずれかの記法で組み込めます。
			 *  <fadeout>
			 *  <FO>
			 *  <フェードアウト>
			 *
			 * ○ (55) 画面のフェードイン
			 *  フェードインは以下のいずれかの記法で組み込めます。
			 *  <fadein>
			 *  <FI>
			 *  <フェードイン>
			 *
			 *
			 * ○ (56) 画面の色調変更
			 *  ピクチャの色調変更は以下の記法で指定します。
			 *   <TintScreen: オプション1, オプション2>
			 *
			 *  色調変更にかける時間と色調はオプションとして指定でき、
			 *  指定しない場合はデフォルト値が設定されます。
			 *
			 *  "TintScreen"は"画面の色調変更"で代替できます。
			 *
			 *  オプションの指定方法を述べる前にいくつか具体例を記します。
			 *  例1: 以下のデフォルト設定でピクチャの色調を変更する。
			 *    - 色調: 赤0, 緑0, 青0, グレイ0(デフォルト設定)
			 *    - 時間: 60フレーム, 完了までウェイト(デフォルト設定)
			 *   <TintScreen>
			 *   <画面の色調変更>
			 *
			 *  例2: 以下の設定で画面の色調を変更する。
			 *    - 色調: カラーはダーク
			 *    - 時間: 30フレーム、完了までウェイト
			 *   <TintScreen: ColorTone[Dark], Duration[30][Wait for Completion]>
			 *   <画面の色調変更: 色調[Dark], 時間[30][完了までウェイト]>
			 *
			 *  例3: 以下の設定で画面の色調を変更する。
			 *    - 色調: は赤12, 緑34, 青56, グレイ0
			 *    - 時間: が45フレーム、完了までウェイトしない
			 *   <TintScreen: ColorTone[12][34][56][0], Duration[45]>
			 *   <画面の色調変更: 色調[12][34][56][0], 時間[45]>
			 *
			 *  オプションは順不同です。
			 *  オプション1,2はどのような順番で指定しても大丈夫です。
			 *
			 *  ・色調の指定方法
			 *    画面の色調は、以下の記法で指定します。
			 *    ColorTone[赤の強さ][緑の強さ][青の強さ][グレイの強さ]>
			 *
			 *    "ColorTone"は"色調"か"CT"で代替できます。
			 *
			 *    例えば、以下のように設定できます。
			 *     - "ColorTone[-68][68][100][0]"
			 *     - "色調[-68][68][100][0]"
			 *     - "CT[-68][68][100][0]"
			 *
			 *    [赤の強さ]の部分に指定の文字列を入力することで、RPGツクールMV/MZの機能と
			 *    同様に「通常」, 「ダーク」, 「セピア」, 「夕暮れ」,「夜」で設定することが
			 *    できます。以下のように色調が対応しています。
			 *      - "通常" or "Normal": "ColorTone[0][0][0][0]"
			 *      - "ダーク" or "Dark": "ColorTone[-68][-68][-68][0]"
			 *      - "セピア" or "Sepia": "ColorTone[34][-34][-68][170]"
			 *      - "夕暮れ" or "Sunset": "ColorTone[68][-34][-34][0]"
			 *      - "夜" or "Night": "ColorTone[-68][-68][0][68]"
			 *
			 *    例えば、画面を1秒でセピアに変更する場合は以下のように書けます。
			 *    1秒(60フレーム)はデフォルト設定です。
			 *    - "<TintScreen: ColorTone[Sepia]>"
			 *    - "<画面の色調変更: 4, ColorTone[セピア]>"
			 *
			 *  ・時間の指定方法
			 *    画面の色調変更の時間は、以下の記法で指定します。
			 *    Duration[フレーム数][ウェイトするか否か("Wait for Completion" or 省略)]
			 *
			 *    "Duration"は"時間"で、"Wait for Completion"は"完了までウェイト"か
			 *    "Wait"で代替できます。
			 *
			 *     例えば、以下の通りです。
			 *     例1: 45フレームで完了するまでウェイトする
			 *       - "Duration[45][Wait for Completion]"
			 *       - "時間[45][完了までウェイト]"
			 *       - "時間[45][Wait]"
			 *     例2: 60フレームで完了するまでウェイトしない
			 *       - "Duration[60]"
			 *       - "時間[60]"
			 *       - "Duration[60][]"
			 *
			 *     時間を指定しなかった場合のデフォルト値は
			 *     "Duration[60][Wait for Completion]"となります。
			 *
			 *
			 * ○ (57) 画面のフラッシュ
			 * 「画面のフラッシュ」は以下のいずれかの記法で組み込むことができます。
			 *   <FlashScreen: 赤, 緑, 青, 強さ, 時間, 完了までウェイト>
			 *   <画面のフラッシュ: 赤, 緑, 青, 強さ, 時間, 完了までウェイト>
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例: 画面を以下の設定でフラッシュさせる
			 *   赤: 50, 緑: 100, 青: 150,
			 *   強さ: 170, 時間: 60フレーム,
			 *   完了までウェイトさせる
			 *  <FlashScreen: 50, 100, 150, 170, 60, Wait for Completion>
			 *  <画面のフラッシュ: 50, 100, 150, 170, 60, 完了までウェイト>
			 *
			 *
			 * ○ (58) 画面のシェイク
			 * 「画面のシェイク」は以下のいずれかの記法で組み込むことができます。
			 *   <ShakeScreen: 強さ, 速さ, 時間, 完了までウェイト>
			 *   <画面のシェイク: 強さ, 速さ, 時間, 完了までウェイト>
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例: 強さ5、速さ8で60フレームかけて画面をシェイクする。 完了までウェイト
			 *   <ShakeScreen: 5, 8, 60, Wait for Completion>
			 *   <画面のシェイク: 5, 8, 60, 完了までウェイト>
			 *
			 *
			 * ○ (59) 天候の設定
			 * 「天候の設定」は以下のいずれかの記法で組み込むことができます。
			 *   <SetWeatherEffect: 種類, 強さ, 時間, 完了までウェイト>
			 *   <天候の設定: 種類, 強さ, 時間, 完了までウェイト>
			 *
			 * 種類リスト
			 *  - なし: "None", "なし"
			 *  - 雨: "Rain", "雨"
			 *  - 嵐: "Storm", "嵐"
			 *  - 雪: "Snow", "雪"
			 *
			 * 完了までウェイトリスト
			 * - チェックオン: "Wait for Completion", "完了までウェイト", "Wait", "true",
			 *                 "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF"
			 *
			 * 例: 天候は雨、強さ5、60フレームかけて天候を変更する。完了までウェイト
			 *   <SetWeatherEffect: Rain, 5, 60, Wait for Completion>
			 *   <天候の設定: 雨, 5, 60, 完了までウェイト>
			 *
			 *
			 * ○ (60) BGMの演奏
			 *  BGMの演奏は、以下のいずれかの記法で指定します。
			 *  <PlayBGM: ファイル名, 音量, ピッチ, 位相>
			 *  <BGMの演奏: ファイル名, 音量, ピッチ, 位相>
			 *
			 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *  例1: Castle1をデフォルト設定で演奏
			 *   <PlayBGM: Castle1>
			 *  例2: Castle2を音量50, ピッチ80, 位相30で演奏
			 *   <PlayBGM: Castle2, 50, 80, 30>
			 *
			 *  BGMを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
			 *  <PlayBGM: None>
			 *  <PlayBGM: なし>
			 *  <StopBGM>
			 *
			 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGMは
			 *  ご利用できないことにご注意ください。
			 *
			 *
			 * ○ (61) BGMのフェードアウト
			 *  BGMのフェードアウトは以下のいずれかの記法で組み込みます。
			 *  <FadeoutBGM: 時間(秒)>
			 *  <BGMのフェードアウト: 時間(秒)>
			 *
			 *  例えば、以下のように記述すると3秒でBGMがフェードアウトします。
			 *  <FadeoutBGM: 3>
			 *  <BGMのフェードアウト: 3>
			 *
			 * ○ (62) BGMの保存
			 *  BGMの保存は以下のいずれかの記法で組み込みます。
			 *  <SaveBGM>
			 *  <BGMの保存>
			 *
			 * ○ (63) BGMの再開
			 *  BGMの再開は以下のいずれかの記法で組み込みます。
			 *  <ReplayBGM>
			 *  <BGMの再開>
			 *
			 * ○ (64) BGSの演奏
			 *  BGSの演奏は、以下のいずれかの記法で指定します。
			 *  <PlayBGS: ファイル名, 音量, ピッチ, 位相>
			 *  <BGSの演奏: ファイル名, 音量, ピッチ, 位相>
			 *
			 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *  例1: Cityをデフォルト設定で演奏
			 *   <PlayBGS: City>
			 *  例2: Darknessを音量50, ピッチ80, 位相30で演奏
			 *   <PlayBGS: Darkness, 50, 80, 30>
			 *
			 *  BGSを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
			 *  <PlayBGS: None>
			 *  <PlayBGS: なし>
			 *  <StopBGS>
			 *
			 *  本プラグインを使用する場合は、「None」「なし」というファイル名のBGSは
			 *  ご利用できないことにご注意ください。
			 *
			 *
			 * ○ (65) BGSのフェードアウト
			 *  BGSのフェードアウトは以下のいずれかの記法で組み込みます。
			 *  <FadeoutBGS: 時間(秒)>
			 *  <BGSのフェードアウト: 時間(秒)>
			 *
			 *  例えば、以下のように記述すると3秒でBGSがフェードアウトします。
			 *  <FadeoutBGS: 3>
			 *  <BGSのフェードアウト: 3>
			 *
			 * ○ (66) MEの演奏
			 *  MEの演奏は、以下のいずれかの記法で指定します。
			 *  <PlayME: ファイル名, 音量, ピッチ, 位相>
			 *  <MEの演奏: ファイル名, 音量, ピッチ, 位相>
			 *
			 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *  例1: Innをデフォルト設定で演奏
			 *   <PlayME: Inn>
			 *  例2: Mysteryを音量50, ピッチ80, 位相30で演奏
			 *   <PlayME: Mystery, 50, 80, 30>
			 *
			 *  MEを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
			 *  <PlayME: None>
			 *  <PlayME: なし>
			 *  <StopME>
			 *
			 *  本プラグインを使用する場合は、「None」「なし」というファイル名のMEは
			 *  ご利用できないことにご注意ください。
			 *
			 *
			 * ○ (67) SEの演奏
			 *  SEの演奏は、以下のいずれかの記法で指定します。
			 *  <PlaySE: ファイル名, 音量, ピッチ, 位相>
			 *  <SEの演奏: ファイル名, 音量, ピッチ, 位相>
			 *
			 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *  例1: Attack1をデフォルト設定で演奏
			 *   <PlaySE: Attack1>
			 *  例2: Attack2を音量50, ピッチ80, 位相30で演奏
			 *   <PlaySE: Attack2, 50, 80, 30>
			 *
			 *  SEを「なし」に設定したい場合は以下のいずれかの記法で指定してください。
			 *  <PlaySE: None>
			 *  <PlaySE: なし>
			 *
			 *  本プラグインを使用する場合は、「None」「なし」というファイル名のSEは
			 *  ご利用できないことにご注意ください。
			 *
			 *
			 * ○ (68) SEの停止
			 *  SEの停止は以下のいずれかの記法で指定します。
			 *  <StopSE>
			 *  <SEの停止>
			 *
			 * ○ (69) ムービーの再生
			 * 「ムービーの再生」は以下のいずれかの記法で組み込むことができます。
			 *   <PlayMovie: ファイル名>
			 *   <ムービーの再生: ファイル名>
			 *
			 *  ファイル名を「なし」に設定したい場合はファイル名に"None"か"なし"と設定して
			 * ください。
			 *
			 * 例: SampleMovie.webmを再生する場合
			 *   <PlayMovie: SampleMovie>
			 *   <ムービーの再生: SampleMovie>
			 *
			 *
			 * ○ (70) 戦闘の処理
			 * 「戦闘の処理」は以下の記法で組み込むことができます。
			 *  ---
			 *  <BattleProcessing: 敵グループ>
			 *  <IfWin>
			 *  勝利した時の処理
			 *  <IfEscape>
			 *  逃走したときの処理
			 *  <IfLose>
			 *  敗北したときの処理
			 *  <End>
			 *  ---
			 *
			 *  "BattleProcessing"は"戦闘の処理"でも代替できます。
			 *  また、"IfWin"は"勝ったとき"、"IfEscape"は"逃げたとき"、
			 *  "IfLose"は"負けたとき"、"End"は"分岐終了"で代替できます。
			 *
			 *  敵グループは、以下の３種類の指定方法があります。
			 *  - 直接指定: "敵グループID"
			 *  - 変数の指定: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *  - ランダムエンカウント: "Random", "ランダム"
			 *
			 *  "<IfWin>"タグ、"<IfEscape>"タグ、"<IfLose>"タグは省略可能です。
			 *  また、これら3つをすべて省略したときに限り、"<End>"タグも省略可能です。
			 *
			 *  以下に具体例を示します。
			 *
			 * 例1: 敵グループID1とエンカウント。 逃走不可, 敗北不可
			 *   <BattleProcessing: 1>
			 *   <戦闘の処理: 1>
			 *
			 * 例2: 変数ID5の敵グループとエンカウント。 逃走可, 敗北可
			 *  ---
			 *  <BattleProcessing: Variables[5]>
			 *  <IfWin>
			 *  勝った！
			 *  <IfEscape>
			 *  逃げた！
			 *  <IfLose>
			 *  負けた！
			 *  <End>
			 *  ---
			 *  または
			 *  ---
			 *  <戦闘の処理: 変数[5]>
			 *  <勝ったとき>
			 *  勝った！
			 *  <逃げたとき>
			 *  逃げた！
			 *  <負けたとき>
			 *  負けた！
			 *  <分岐終了>
			 *  ---
			 *
			 * 例3: ランダムな敵グループとエンカウント。 敗北可
			 *  ---
			 *  <BattleProcessing: Random>
			 *  <IfWin>
			 *  勝った！
			 *  <IfLose>
			 *  負けた！
			 *  <End>
			 *  ---
			 *  または
			 *  ---
			 *  <戦闘の処理: ランダム>
			 *  <勝ったとき>
			 *  勝った！
			 *  <負けたとき>
			 *  負けた！
			 *  <分岐終了>
			 *  ---
			 *
			 *
			 * ○ (71) ショップの処理
			 * 「ショップの処理」は以下のいずれかの記法で組み込むことができます。
			 *  ---
			 *  <ShopProcessing: 購入のみ>
			 *  <Merchandise: 商品タイプ, 商品ID, 価格>
			 *  ・・・以下任意の数の商品を示すタグ
			 *  ---
			 *  "ShopProcessing"は、"ショップの処理"で、"Merchandise"は、"商品"で代替でき
			 *   ます。
			 *  "Merchandise"タグは、販売するアイテム・装備品を示すタグであり、任意の数を続
			 *   けて指定できます。なしということも可能です。
			 *
			 * 購入のみリスト
			 * - チェックオン: "Purchase Only","true", "1", "オン", "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *  購入のみ引数は省略が可能です。省略した場合はチェックオフとして扱われます。
			 *
			 * 商品タイプリスト
			 * - アイテム: "item", "0", "アイテム"
			 * - 武器: "weapon", "1", "武器"
			 * - 防具: "armor", "2", "防具"
			 *
			 * 価格リスト
			 * - 標準: "standard", "標準"
			 * - 指定: 整数値をそのまま指定
			 *
			 * 価格リストは、省略が可能です。省略した場合は、標準として扱われます。
			 *
			 *
			 * 例1: アイテムID1を標準価格に設定。購入のみではない
			 *  ---
			 *  <ShopProcessing>
			 *  <Merchandise: Item, 1, standard>
			 *  ---
			 *  または
			 *  ---
			 *  <ショップの処理: オフ>
			 *  <商品: アイテム, 1, 標準>
			 *  ---
			 *
			 * 例2: 複数の商品を設定。購入のみ
			 *      武器ID4 価格500
			 *      防具ID6 価格1200
			 *  ---
			 *  <ShopProcessing: Purchase Only>
			 *  <Merchandise: weapon, 4, 500>
			 *  <Merchandise: armor, 6, 1200>
			 *  ---
			 *  または
			 *  ---
			 *  <ショップの処理: 購入のみ>
			 *  <商品: 武器, 4, 500>
			 *  <商品: 防具, 6, 1200>
			 *  ---
			 *
			 *
			 * ○ (72) 名前入力の処理
			 * 「名前入力の処理」は以下のいずれかの記法で組み込むことができます。
			 *   <NameInputProcessing: アクター, 最大文字数>
			 *   <名前入力の処理: アクター, 最大文字数>
			 *
			 * 例: IDが1のアクターの名前入力を最大文字数8で行う
			 *   <NameInputProcessing: 1, 8>
			 *   <名前入力の処理: 1, 8>
			 *
			 *
			 * ○ (73) メニュー画面を開く
			 * 「メニュー画面を開く」は以下のいずれかの記法で組み込むことができます。
			 *   <OpenMenuScreen>
			 *   <メニュー画面を開く>
			 *
			 * ○ (74) セーブ画面を開く
			 * 「セーブ画面を開く」は以下のいずれかの記法で組み込むことができます。
			 *   <OpenSaveScreen>
			 *   <セーブ画面を開く>
			 *
			 * ○ (75) ゲームオーバー
			 * 「ゲームオーバー」は以下のいずれかの記法で組み込むことができます。
			 *   <GameOver>
			 *   <ゲームオーバー>
			 *
			 *
			 * ○ (76) タイトル画面に戻す
			 * 「タイトル画面に戻す」は以下のいずれかの記法で組み込むことができます。
			 *   <ReturnToTitleScreen>
			 *   <タイトル画面に戻す>
			 *
			 * ○ (77) 戦闘BGMの変更
			 *  戦闘BGMの変更は、以下のいずれかの記法で指定します。
			 *  <ChangeBattleBGM: ファイル名, 音量, ピッチ, 位相>
			 *  <戦闘曲の変更: ファイル名, 音量, ピッチ, 位相>
			 *
			 *  必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 *  指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 *  例1: Battle1をデフォルト設定で演奏
			 *   <ChangeBattleBGM: Battle1>
			 *  例2: Battle2を音量50, ピッチ80, 位相30で演奏
			 *   <ChangeBattleBGM: Battle2, 50, 80, 30>
			 *
			 *  「なし」に設定したい場合は以下のいずれかの方法で指定してください。
			 *  <ChangeBattleBGM: None>
			 *  <ChangeBattleBGM: なし>
			 *
			 *
			 * ○ (78) 勝利MEの変更
			 * 「勝利MEの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeVictoryMe: ファイル名, 音量, ピッチ, 位相>
			 *   <勝利MEの変更: ファイル名, 音量, ピッチ, 位相>
			 *
			 * 必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 * 指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 * 例: 勝利MEをファイル名「Victory1.ogg」,音量90,ピッチ100,位相0に変更
			 *   <ChangeVictoryMe: Victory1, 90, 100, 0>
			 *   <勝利MEの変更: Victory1, 90, 100, 0>
			 *   <ChangeVictoryMe: Victory1>
			 *
			 * 「なし」に設定したい場合は以下のいずれかの方法で指定してください。
			 *   <ChangeVictoryMe: None>
			 *   <勝利MEの変更: なし>
			 *
			 *
			 * ○ (79) 敗北MEの変更
			 * 「敗北MEの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeDefeatMe: ファイル名, 音量, ピッチ, 位相>
			 *   <敗北MEの変更: ファイル名, 音量, ピッチ, 位相>
			 *
			 * 必須の引数はファイル名のみです。音量・ピッチ・位相は任意で指定します。
			 * 指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 * 例: 敗北MEをファイル名「Defeat1.ogg」,音量90,ピッチ100,位相0に変更
			 *   <ChangeDefeatMe: Defeat1, 90, 100, 0>
			 *   <敗北MEの変更: Defeat1, 90, 100, 0>
			 *
			 * 「なし」に設定したい場合は以下のいずれかの方法で指定してください。
			 *   <ChangeDefeatMe: None>
			 *   <敗北MEの変更: なし>
			 *
			 *
			 * ○ (80) 乗り物BGMの変更
			 * 乗り物BGMの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeVehicleBgm: 乗り物, ファイル名, 音量, ピッチ, 位相>
			 *   <乗り物BGMの変更: 乗り物, ファイル名, 音量, ピッチ, 位相>
			 *
			 * 必須の引数は乗り物とファイル名のみです。
			 * 音量・ピッチ・位相は任意で指定します。
			 * 指定しない場合は音量は90, ピッチは100, 位相は0として組み込まれます。
			 *
			 * 乗り物リスト
			 * - 小型船: "Boat", "0", "小型船"
			 * - 大型船: "Ship", "1", "大型船"
			 * - 飛行船: "Airship", "2", "飛行船"
			 *
			 * 例: 小型船のBGMをファイル名「Ship1.ogg」,音量90,ピッチ100,位相0に変更
			 *   <ChangeVehicleBgm: boat, Ship1, 90, 100, 0>
			 *   <乗り物BGMの変更: 小型船, Ship1, 90, 100, 0>
			 *
			 * 「なし」に設定したい場合はファイル名に"None"か"なし"と指定してください。
			 *
			 *
			 * ○ (81) セーブ禁止の変更
			 * 「セーブ禁止の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeSaveAccess: セーブ>
			 *   <セーブ禁止の変更: セーブ>
			 *
			 * セーブリスト
			 * - 禁止: "Disable", "0", "禁止"
			 * - 許可: "Enable", "1", "許可"
			 *
			 * 例: セーブ禁止に変更
			 *   <ChangeSaveAccess: Disable>
			 *   <セーブ禁止の変更: 禁止>
			 *
			 *
			 * ○ (82) メニュー禁止の変更
			 * エンカウント禁止の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeMenuAccess: セーブ>
			 *   <メニュー禁止の変更: セーブ>
			 *
			 * セーブリスト
			 * - 禁止: "Disable", "0", "禁止"
			 * - 許可: "Enable", "1", "許可"
			 *
			 * 例: メニュー禁止に変更
			 *   <ChangeMenuAccess: Disable>
			 *   <メニュー禁止の変更: 禁止>
			 *
			 *
			 * ○ (83) エンカウント禁止の変更
			 * 「エンカウント禁止の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEncounter: セーブ>
			 *   <エンカウント禁止の変更: セーブ>
			 *
			 * セーブリスト
			 * - 禁止: "Disable", "0", "禁止"
			 * - 許可: "Enable", "1", "許可"
			 *
			 * 例: エンカウント禁止に変更
			 *   <ChangeEncounter: Disable>
			 *   <エンカウント禁止の変更: 禁止>
			 *
			 *
			 * ○ (84) 並び変え禁止の変更
			 * 「並び変え禁止の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeFormationAccess: セーブ>
			 *   <並び変え禁止の変更: セーブ>
			 *
			 * セーブリスト
			 * - 禁止: "Disable", "0", "禁止"
			 * - 許可: "Enable", "1", "許可"
			 *
			 * 例: 並び変え禁止に変更
			 *   <ChangeFormationAccess: Disable>
			 *   <並び変え禁止の変更: 禁止>
			 *
			 *
			 * ○ (85) ウィンドウカラーの変更
			 * 「ウィンドウカラーの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeWindowColor: 赤, 緑, 青>
			 *   <ウィンドウカラーの変更: 赤, 緑, 青>
			 *
			 * 例: ウィンドウカラーを赤-255,緑100,青150に変更
			 *   <ChangeWindowColor: -255, 100, 150>
			 *   <ウィンドウカラーの変更: -255, 100, 150>
			 *
			 *
			 * ○ (86) アクターの画像変更
			 * 「アクターの画像変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeActorImages: 引数1, 引数2, 引数3, 引数4, 引数5, 引数6>
			 *   <アクターの画像変更: 引数1, 引数2, 引数3, 引数4, 引数5, 引数6>
			 *
			 * 引数はそれぞれ以下のように対応しています。
			 * - 引数1: アクターID
			 * - 引数2: 顔のファイル名
			 * - 引数3: 顔のID
			 * - 引数4: 歩行キャラのファイル名
			 * - 引数5: 歩行キャラのID
			 * - 引数6: 戦闘キャラのファイル名
			 *
			 * 例: IDが1のアクターの画像を以下に変更
			 *   - Actor1.png」の2番目の顔
			 *   - Actor2.png」の4番目の歩行キャラ
			 *   - Actor1_1.png」の戦闘キャラ
			 *   <ChangeActorImages: 1, Actor1, 2, Actor2, 4, Actor1_1>
			 *   <アクターの画像変更: 1, Actor1, 2, Actor2, 4, Actor1_1>
			 *
			 * 各ファイル名で「なし」に設定したい場合は、当該引数を"None"か"なし"と記述して
			 * ください。
			 * 「なし」に設定した場合、画像のID引数(引数3, 引数5)は無視されます。
			 * 迷う場合は"0"を入力してください。
			 *
			 *
			 * ○ (87) 乗り物の画像変更
			 * 「乗り物の画像変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeVehicleImage: 乗り物, 乗り物のファイル名, 乗り物のID>
			 *   <乗り物の画像変更: 乗り物, 乗り物のファイル名, 乗り物のID>
			 *
			 * 乗り物リスト
			 * - 小型船: "Boat", "0", "小型船"
			 * - 大型船: "Ship", "1", "大型船"
			 * - 飛行船: "Airship", "2", "飛行船"
			 *
			 * 例: 小型船の画像を「Vehicle.png」の5番目に変更
			 *   <ChangeVehicleImage: boat, Vehicle, 5>
			 *   <乗り物の画像変更: 小型船, Vehicle, 5>
			 *
			 * 「なし」に設定したい場合は、乗り物のファイル名をを"None"か"なし"と記述してく
			 * ださい。
			 * 乗り物のIDは省略可能です。省略した場合"0"が代入されます。
			 *
			 *
			 * ○ (88) マップ名表示の変更
			 * 「マップ名表示の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeMapNameDisplay: マップ名表示>
			 *   <マップ名表示の変更: マップ名表示>
			 *
			 * マップ名表示リスト
			 * - ラジオボタンオン: "true", "0", "オン", "ON"
			 * - ラジオボタンオフ: "false", "1", "オフ", "OFF"
			 *
			 * 例: マップ名表示をONに変更
			 *   <ChangeMapNameDisplay: ON>
			 *   <マップ名表示の変更: オン>
			 *
			 *
			 * ○ (89) タイルセットの変更
			 * 「タイルセットの変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeTileset: タイルセットID>
			 *   <タイルセットの変更: タイルセットID>
			 *
			 * 例: IDが1のタイルセットに変更
			 *   <ChangeTileset: 1>
			 *   <タイルセットの変更: 1>
			 *
			 *
			 * ○ (90) 戦闘背景の変更
			 * 「戦闘背景の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeBattleBackGround: 戦闘背景1, 戦闘背景2>
			 *   <戦闘背景の変更: 戦闘背景1, 戦闘背景2>
			 *
			 * 例: 戦闘背景1(下半分)を「Desert.png」,戦闘背景2(上半分)を「Cliff.png」に
			 *     戦闘背景を変更する
			 *   <ChangeBattleBackGround: Desert, Cliff>
			 *   <戦闘背景の変更: Desert, Cliff>
			 *
			 * それぞれの戦闘背景を「なし」に設定したい場合は、"None"か"なし"と記述してくだ
			 * さい。
			 *
			 *
			 * ○ (91) 遠景の変更
			 * 「遠景の変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeParallax: 遠景画像ファイル名, オプション1, オプション2>
			 *   <遠景の変更: 遠景画像ファイル名, オプション1, オプション2>
			 *
			 * オプション1とオプション2は遠景をループさせたい時に任意で設定する引数であり、
			 * 省略が可能です。
			 * 両方を省略した場合、横方向と盾方向のどちらもループしません。
			 *
			 * 横方向にループさせたい場合は、以下のいずれかの記法でオプション1もしくは
			 * オプション2に記述してください。
			 *   LoopHorizontally[スクロール速度]"
			 *   横方向にループする[スクロール速度]"
			 *
			 * スクロール速度は、"-32"~"32"の整数を入力してください。
			 *
			 * 盾方向にループさせたい場合は、以下のいずれかの記法でオプション1もしくは
			 * オプション2に記述してください。
			 *   LoopVertically[スクロール速度]"
			 *   縦方向にループする[スクロール速度]"
			 *
			 * スクロール速度は、"-32"~"32"の整数を入力してください。
			 *
			 * 例1: 遠景背景を「BlueSky.png」に変更する。ループはしない
			 *   <ChangeParallax: BlueSky>
			 *   <遠景の変更: BlueSky>
			 *
			 * 例2: 遠景背景を「BlueSky.png」に変更する。
			 *      横方向にスクロール速度10 縦方向にスクロール速度-25
			 *   <ChangeParallax: BlueSky, LoopHorizontally[10], LoopVertically[-25]>
			 *   <遠景の変更: BlueSky, 横方向にループする[10], 縦方向にループする[-25]>
			 *
			 * 遠景画像ファイル名を「なし」に設定したい場合は、"None"か"なし"と記述してくだ
			 * さい。
			 *
			 *
			 * ○ (92) 指定位置の情報取得
			 * 「指定位置の情報取得」は以下のいずれかの記法で組み込むことができます。
			 *   <GetLocationInfo: 変数ID, 情報タイプ, 位置>
			 *   <指定位置の情報取得: 変数ID, 情報タイプ, 位置>
			 *
			 * 情報タイプリスト
			 * - 地形タグ: "Terrain Tag", "地形タグ", "0"
			 * - イベントID: "Event ID", "イベントID", "1"
			 * - レイヤー１: "Layer 1", "レイヤー１", "2"
			 * - レイヤー２: "Layer 2", "レイヤー２", "3"
			 * - レイヤー３: "Layer 3", "レイヤー３", "4"
			 * - レイヤー４: "Layer 4", "レイヤー４", "5"
			 * - リージョンID: "Region ID", "リージョンID", "6"
			 *
			 * "位置"は、以下の記法で組み込みます。
			 * - 直接指定: 以下のいずれか
			 *   - "Direct[X座標][Y座標]"
			 *   - "直接指定[X座標][Y座標]"
			 * - 変数で指定: 以下のいずれか
			 *   - "WithVariables[X座標を指定する変数のID][Y座標を指定する変数のID]"
			 *   - "変数で指定[X座標を指定する変数のID][Y座標を指定する変数のID]"
			 * - キャラクターで指定: 以下のいずれか
			 *   - "Character[イベントID]"
			 *   - "キャラクター[イベントID]"
			 *
			 * キャラクターで指定する場合のイベントIDリスト
			 * - プレイヤー: "Player", "プレイヤー", "-1"
			 * - このイベント: "This Event", "このイベント", "0"
			 * - イベントIDで指定: "1以上の整数"
			 *
			 * なお、キャラクターで指定するのはツクールMZのみの機能です。
			 *
			 * 例1: 変数1に、現在のマップのX座標10,Y座標20の地形タグの値を保存する
			 *   <GetLocationInfo: 1, Terrain Tag, Direct[10][20]>
			 *   <指定位置の情報取得: 1, 地形タグ, 直接指定[10][20]>
			 *
			 * 例2: 変数2に、現在のマップのX座標を変数4で、Y座標を5で指定しレイヤー1のタイ
			 *      ルIDを保存する。
			 *   <GetLocationInfo: 2, Layer 1, WithVariables[4][5]>
			 *   <指定位置の情報取得: 2, レイヤー１, 変数で指定[4][5]>
			 *
			 * 例3: 変数3に、このイベントのリージョンIDの値を保存する
			 *   <GetLocationInfo: 3, Region ID, Character[This Event]>
			 *   <指定位置の情報取得: 3, リージョンID, キャラクター[このイベント]>
			 *
			 *
			 * ○ (93) 敵キャラのHP増減
			 * 「敵キャラのHP増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEnemyHp: 敵キャラ, 操作, オペランド, 戦闘不能を許可>
			 *   <敵キャラのHP増減: 敵キャラ, 操作, オペランド, 戦闘不能を許可>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1"～"8"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 戦闘不能を許可リスト
			 * - チェックオン: "Allow Knockout", "戦闘不能を許可", "true", "1", "オン",
			 *                 "ON"
			 * - チェックオフ: "false", "0", "オフ", "OFF", 省略
			 *
			 * 例1: #1の敵のHPを10増やす
			 *   <ChangeEnemyHp: 1, Increase, 10>
			 *   <敵キャラのHP増減: 1, 増やす, 10>
			 *   <ChangeEnemyHp: 1, +, 10>
			 *
			 * 例2: 敵グループ全体のHPを変数20の値分減らす。戦闘不能を許可
			 *   <ChangeEnemyHp: Entire Troop, Decrease, Variables[20], Allow Knockout>
			 *   <敵キャラのHP増減: 敵グループ全体, 減らす, 変数[20], 戦闘不能を許可>
			 *   <ChangeEnemyHp: Entire Troop, -, V[20], true>
			 *
			 *
			 * ○ (94) 敵キャラのMP増減
			 * 「敵キャラのMP増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEnemyMp: 敵キャラ, 操作, オペランド>
			 *   <敵キャラのMP増減: 敵キャラ, 操作, オペランド>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1"～"8"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: #1の敵のMPを10増やす
			 *   <ChangeEnemyMp: 1, Increase, 10>
			 *   <敵キャラのMP増減: 1, 増やす, 10>
			 *   <ChangeEnemyMp: 1, +, 10>
			 *
			 * 例2: 敵グループ全体のMPを20減らす
			 *   <ChangeEnemyMp: Entire Troop, Decrease, Variables[20]>
			 *   <敵キャラのMP増減: 敵グループ全体, 減らす, 変数[20]>
			 *   <ChangeEnemyMp: Entire Troop, -, V[20]>
			 *
			 *
			 * ○ (95) 敵キャラのTP増減
			 * 「敵キャラのTP増減」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEnemyTp: 敵キャラ, 操作, オペランド>
			 *   <敵キャラのTP増減: 敵キャラ, 操作, オペランド>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1"～"8"
			 *
			 * 操作リスト
			 * - 増やす: "Increase", "+", "増やす"
			 * - 減らす: "Decrease", "-", "減らす"
			 *
			 * オペランドリスト
			 * - 定数: "1以上の整数"
			 * - 変数: "Variables[変数ID]", "変数[変数ID]", "V[変数ID]"
			 *
			 * 例1: #1の敵のTPを10増やす
			 *   <ChangeEnemyTp: 1, Increase, 10>
			 *   <敵キャラのTP増減: 1, 増やす, 10>
			 *   <ChangeEnemyTp: 1, +, 10>
			 *
			 * 例2: 敵グループ全体のTPを20減らす
			 *   <ChangeEnemyTp: Entire Troop, Decrease, Variables[20]>
			 *   <敵キャラのTP増減: 敵グループ全体, 減らす, 変数[20]>
			 *   <ChangeEnemyTp: Entire Troop, -, V[20]>
			 *
			 *
			 * ○ (96) 敵キャラのステート変更
			 * 「敵キャラのステート変更」は以下のいずれかの記法で組み込むことができます。
			 *   <ChangeEnemyState: 敵キャラ, 操作, ステートID>
			 *   <敵キャラのステート変更: 敵キャラ, 操作, ステートID>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1"～"8"
			 *
			 * 操作リスト
			 * - 付加: "Add", "+", "付加"
			 * - 解除: "Remove", "-", "解除"
			 *
			 * 例1: #1の敵にIDが4のステートを付加する
			 *   <ChangeEnemyState: 1, Add, 4>
			 *   <敵キャラのステート変更: 1, 付加, 4>
			 *   <ChangeEnemyState: 1, +, 4>
			 *
			 *
			 * 例2: 敵グループ全体のIDが4のステートを解除する
			 *   <ChangeEnemyState: Entire Troop, Remove, 6>
			 *   <敵キャラのステート変更: 敵グループ全体, 解除, 6>
			 *   <ChangeEnemyState: Entire Troop, -, 6>
			 *
			 *
			 * ○ (97) 敵キャラの全回復
			 * 「敵キャラの全回復」は以下のいずれかの記法で組み込むことができます。
			 *   <EnemyRecoverAll: 敵キャラ>
			 *   <敵キャラの全回復: 敵キャラ>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1"～"8"
			 *
			 * 例1: #1の敵キャラを全回復
			 *   <EnemyRecoverAll: 1>
			 *   <敵キャラの全回復: 1>
			 *
			 * 例2: すべての敵キャラを全回復
			 *   <EnemyRecoverAll: Entire Troop>
			 *   <敵キャラの全回復: 敵グループ全体>
			 *
			 *
			 * ○ (98) 敵キャラの出現
			 * 「敵キャラの全回復」は以下のいずれかの記法で組み込むことができます。
			 *   <EnemyAppear: 敵キャラ>
			 *   <敵キャラの出現: 敵キャラ>
			 *
			 * 敵キャラリスト
			 * - #1～#8: "1"～"8"
			 *
			 * 例: #1の敵を出現
			 *   <EnemyAppear: 1>
			 *   <敵キャラの出現: 1>
			 *
			 *
			 * ○ (99) 敵キャラの変身
			 * 「敵キャラの変身」は以下のいずれかの記法で組み込むことができます。
			 *   <EnemyTransform: 敵キャラ, エネミーID>
			 *   <敵キャラの変身: 敵キャラ, エネミーID>
			 *
			 * 敵キャラリスト
			 * - #1～#8: "1"～"8"
			 *
			 * 例: #1の敵をIDが2のエネミーに変身
			 *   <EnemyTransform: 1, 2>
			 *   <敵キャラの変身: 1, 2>
			 *
			 *
			 * ○ (100) 戦闘アニメーションの表示
			 * 「戦闘アニメーションの表示」は以下のいずれかの記法で組み込むことができます。
			 *   <ShowBattleAnimation: 敵キャラ, アニメーションID>
			 *   <戦闘アニメーションの表示: 敵キャラ, アニメーションID>
			 *
			 * 敵キャラリスト
			 * - 敵グループ全体: "Entire Troop", "敵グループ全体"
			 * - #1～#8: "1", "2", ～"8"
			 *
			 * 例1: #1の敵にIDが2のアニメーションを表示
			 *   <ShowBattleAnimation: 1, 2>
			 *   <戦闘アニメーションの表示: 1, 2>
			 *
			 * 例2: 敵グループ全体にIDが2のアニメーションを表示
			 *   <ShowBattleAnimation: Entire Troop, 2>
			 *   <戦闘アニメーションの表示: 敵グループ全体, 2>
			 *
			 *
			 * ○ (101) 戦闘行動の強制
			 *  「戦闘行動の強制」は以下のいずれかの記法で組み込むことができます。
			 *   <ForceAction: 行動主体, スキルID, 対象>
			 *   <戦闘行動の強制: 行動主体, スキルID, 対象>
			 *
			 * 行動主体リスト
			 * - 敵#1～#8: "1"～"8"
			 * - アクター: "Actors[アクターID]", "アクター[アクターID]"
			 *
			 * 対象リスト
			 *  - ラストターゲット: "Last Target", "-1", "ラストターゲット"
			 *  - ランダム: "Random", "0", "ランダム"
			 *  - インデックス1: "Index 1", "1", "インデックス１"
			 *  - インデックス2: "Index 2", "2", "インデックス２"
			 *  - インデックス3: "Index 3", "3", "インデックス３"
			 *  - インデックス4: "Index 4", "4", "インデックス４"
			 *  - インデックス5: "Index 5", "5", "インデックス５"
			 *  - インデックス6: "Index 6", "6", "インデックス６"
			 *  - インデックス7: "Index 7", "7", "インデックス７"
			 *  - インデックス8: "Index 8", "8", "インデックス８"
			 *
			 * 例1: #1の敵にIDが2のスキルを、インデックス3を対象に強制する
			 *   <ForceAction: 1, 2, Index 3>
			 *   <戦闘行動の強制: 1, 2, インデックス３>
			 *
			 * 例2: IDが4のアクターにIDが7のスキルをラストターゲットを対象に強制する
			 *   <ForceAction: Actors[4], 7, Last Target>
			 *   <戦闘行動の強制: アクター[4], 7, ラストターゲット>
			 *
			 * 例3: IDが10のアクターにIDが20のスキルをランダムなターゲットを対象に強制する
			 *   <ForceAction: Actors[10], 20, Random>
			 *   <戦闘行動の強制: アクター[10], 20, ランダム>
			 *
			 *
			 * ○ (102) バトルの中断
			 *  「バトルの中断」は以下のいずれかの記法で組み込むことができます。
			 *   <AbortBattle>
			 *   <バトルの中断>
			 *
			 * ○ (103) スクリプト
			 *  スクリプトのイベントコマンドは、以下のように<script>と</script>で挟み込む
			 *  記法で指定します。
			 *  <script>
			 *   処理させたいスクリプト
			 *  </script>
			 *
			 *  例えば以下のとおりです。
			 *  <script>
			 *  for(let i = 0; i < 10; i++) {
			 *      console.log("今日も一日がんばるぞい！");
			 *  }
			 *  </script>
			 *
			 *  このようにテキストファイル中に記載することで、
			 *   for(let i = 0; i < 10; i++) {
			 *       console.log("今日も一日がんばるぞい！");
			 *   }
			 *  という内容のスクリプトのイベントコマンドが組み込まれます。
			 *  ツクールMV・MZのエディタ上からは12行を超えるスクリプトは記述出来ませんが、
			 *  本プラグインの機能では13行以上のスクリプトも組み込めます。
			 *  ただし、ツクールMV・MZ上から一度開いて保存してしまうと、13行目以降はロス
			 *  トしてしまいます。
			 *  別記法として<SC>か、<スクリプト>としても記述できます。
			 *  また、
			 *  <script>console.log("今日も一日がんばるぞい！");</script>
			 *  というように1行で記述することもできます。
			 *
			 *
			 * ○ (104)-1 プラグインコマンド(ツクールMV)
			 *  プラグインコマンドのイベントコマンドは、以下のいずれかの記法で指定します。
			 *  <plugincommand: プラグインコマンドの内容>
			 *  <PC: プラグインコマンドの内容>
			 *  <プラグインコマンド: プラグインコマンドの内容>
			 *
			 *  例えば以下のように記述すると、ItemBook openと入ったプラグインコマンドが
			 *  組み込まれます。
			 *  <plugincommand: ItemBook open>
			 *  <PC: ItemBook open>
			 *  <プラグインコマンド: ItemBook open>
			 *
			 *
			 * ○ (104)-2 プラグインコマンド(ツクールMZ, 上級者向け)
			 *  プラグインコマンドのイベントコマンドは、以下の記法で指定します。
			 *  <PluginCommandMZ: プラグイン名, 関数名, コマンド, 引数[値][注釈],...>
			 *
			 *  プラグイン名はプラグインファイルの名前です。○○.jsの○○を記入して
			 *  ください。Text2Frame.jsの場合は"Text2Frame"となります。
			 *
			 *  内部関数名はプラグイン内で設定されている関数名を指定してください。
			 *  ただし、対応しているプラグイン本体であるJavascriptファイルかdataフォ
			 *  ルダ内のJSONファイルから直接確認する必要がある可能性が高いです。
			 *  そのため、このタグはある程度プラグインを開発する能力がある方向けと
			 *  なります。
			 *
			 *  コマンドはプラグインコマンド設定ウィンドウで、呼び出すコマンドの
			 *  名前を記述してください。
			 *
			 *  プラグインコマンドのパラメータは、コマンド名以降にカンマ区切りで
			 *  "引数の名前[値]"として記述してください。数に制限はありません。
			 *  例えば、引数の名前が"FileFolder", 値が"text"の場合は
			 *  "FileFolder[text]"と記述してください。
			 *  引数の名前は、「プラグインコマンド」ウィンドウの、指定したい引数の
			 *  「パラメータ」ウィンドウから確認できます。薄い灰色文字で書かれた
			 *  括弧書きされている文字が引数の名前です。
			 *  注釈は、ツクールMZ上での表示を正式なものにするために使います。
			 *  指定しない場合は、自動で補完します。実行上の違いはありませんが、
			 *  ツクールMZ上から設定した場合の表記とは異なります。
			 *
			 *  "PluginCommandMZ"は"PCZ","プラグインコマンドMZ"でも代替できます。
			 *
			 *  例えば、TextPictureプラグインで"ほげ"という文字列を画像にする
			 *  プラグインコマンドは以下のように設定します。
			 *  <PCZ: TextPicture, set, テキストピクチャの設定, text[ほげ]>
			 *
			 *  ・引数設定に関する詳細
			 *  引数の値として、基本的には以下の5つを入力することが可能です。
			 *  - 数値:
			 *    例えば `-1`, `0`, `1`, `1.1`, `2`,...
			 *  - 文字列:
			 *    例えば `今日も一日がんばるぞい！`
			 *  - ブーリアン:
			 *    例えば `true` or `false`
			 *          (他のタグにあるようなONやOFFのような代替記法はありません)
			 *  - 配列:
			 *    例えば`[1, 2, 3]` や`["a", "b", "c", "d"]`
			 *  - オブジェクト:
			 *    例えば `{"a": 1, "b": "hoge"}`
			 *
			 *  このうち、配列とオブジェクトのみ、JSONの記法に乗っ取って記入します。
			 *  例えば、以下の通りです。
			 *  - 例1: 引数array_argの値に文字列の配列を設定 :
			 *    `array_arg[["今日も", "一日", "がんばるぞい！"]]`
			 *  - 例2: 引数struct_arg の値に `{"a": 1, "b": "hoge"}`:
			 *    `struct_arg[{"a": 1, "b": "hoge"}]`
			 *
			 *
			 * --------------------------------------
			 * 動作確認テキスト
			 * --------------------------------------
			 * https://github.com/yktsr/Text2Frame-MV/wiki/動作確認テキスト
			 * に全機能を使ったテキストを記載しています。
			 * 動作確認用にお使いください。
			 *
			 *
			 * --------------------------------------
			 * 逆変換プラグイン Frame2Text
			 * --------------------------------------
			 * RPGツクールMV/MZのイベントコマンドを、Text2Frameの記法に則ったテキストに
			 * エクスポートするプラグインである、Frame2Textも公開しています。
			 * 取り出し（ゲーム→テキスト）は既定で「安全な統合」のため、既にある翻訳を
			 * 残したまま、ゲーム側の変更だけを取り込めます（反映と対になる双方向の流れ）。
			 * ダウンロードは以下のURLからお願いします。
			 * https://x.gd/KPbTj
			 *   (ヘルプドキュメントの表示の都合上、短縮URLを使っています)
			 *
			 * また、詳細な使い方は以下のFrame2Textの紹介ページかプラグイン本体の
			 * ヘルプドキュメントを参照してください。
			 * https://github.com/yktsr/Text2Frame-MV/wiki/逆変換プラグインFrame2Text
			 *
			 *
			 * --------------------------------------
			 * 注意事項
			 * --------------------------------------
			 * 当プラグインの機能を使用する前にプロジェクト以下の「data」フォルダの
			 * バックアップを「必ず」取得してください。
			 * プラグイン作者は、いかなる場合も破損したプロジェクトの復元には応じられませ
			 * んのでご注意ください。
			 * テキストファイルの文字コードはUTF-8にのみ対応しています。
			 *
			 * --------------------------------------
			 * コントリビューター
			 * --------------------------------------
			 * 当プラグインの実装には、以下の方に多大な貢献をいただきました。
			 * 追加機能としてすべてのイベントコマンドをタグで記述できるようになったのは、
			 * この方の貢献が非常に大きいです。感謝いたします。
			 *
			 *  inazumasoft:Shick 様
			 *  https://ci-en.net/creator/12715
			 *
			 * --------------------------------------
			 * 連絡先
			 * --------------------------------------
			 * このプラグインに関し、バグ・疑問・追加要望を発見した場合は、
			 * 以下の連絡先まで連絡してください。
			 * [Twitter]: https://twitter.com/Asyun3i9t/
			 * [GitHub] : https://github.com/yktsr/
			 *
			 * --------------------------------------
			 * Version
			 * --------------------------------------
			 * 2.3.0
			 * build: ba571817ab4daf5e0aa98cf82f15efc6efeec6c0
			 */
			/* eslint-enable spaced-comment */

			/* global Game_Interpreter, $gameMessage, process, PluginManager, Utils */

			(function () {

			  // for MZ plugin command
			  if (typeof PluginManager !== 'undefined' && PluginManager.registerCommand) {
			    PluginManager.registerCommand('Text2Frame', 'IMPORT_MESSAGE_TO_EVENT', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const map_id = args.MapID;
			      const event_id = args.EventID;
			      const page_id = args.PageID;
			      const is_overwrite = args.IsOverwrite;
			      this.pluginCommand('IMPORT_MESSAGE_TO_EVENT',
			        [file_folder, file_name, map_id, event_id, page_id, is_overwrite]);
			    });
			    PluginManager.registerCommand('Text2Frame', 'IMPORT_MESSAGE_TO_CE', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const common_event_id = args.CommonEventID;
			      const is_overwrite = args.IsOverwrite;
			      this.pluginCommand('IMPORT_MESSAGE_TO_CE',
			        [file_folder, file_name, common_event_id, is_overwrite]);
			    });
			    PluginManager.registerCommand('Text2Frame', 'MERGE_MESSAGE_TO_EVENT', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const map_id = args.MapID;
			      const event_id = args.EventID;
			      const page_id = args.PageID;
			      const base_folder = args.BaseFolder;
			      const base_file_name = args.BaseFileName;
			      this.pluginCommand('MERGE_MESSAGE_TO_EVENT',
			        [file_folder, file_name, map_id, event_id, page_id, base_folder, base_file_name]);
			    });
			    PluginManager.registerCommand('Text2Frame', 'MERGE_MESSAGE_TO_CE', function (args) {
			      const file_folder = args.FileFolder;
			      const file_name = args.FileName;
			      const common_event_id = args.CommonEventID;
			      const base_folder = args.BaseFolder;
			      const base_file_name = args.BaseFileName;
			      this.pluginCommand('MERGE_MESSAGE_TO_CE',
			        [file_folder, file_name, common_event_id, base_folder, base_file_name]);
			    });
			    PluginManager.registerCommand('Text2Frame', 'BATCH_IMPORT_MESSAGES_FROM_FOLDER', function (args) {
			      const text_folder = args.TextFolder;
			      const strategy = args.Strategy;
			      this.pluginCommand('BATCH_IMPORT_MESSAGES_FROM_FOLDER', [text_folder, strategy]);
			    });
			  }

			  var Laurus = typeof Laurus !== 'undefined' ? Laurus : {}; // eslint-disable-line no-var, no-use-before-define
			  Laurus.Text2Frame = {};

			  if (typeof PluginManager === 'undefined') {
			    // for test, command line
			    Laurus.Text2Frame.WindowPosition = 'Bottom';
			    Laurus.Text2Frame.Background = 'Window';
			    Laurus.Text2Frame.FileFolder = 'test';
			    Laurus.Text2Frame.FileName = 'basic.txt';
			    Laurus.Text2Frame.CommonEventID = '1';
			    Laurus.Text2Frame.MapID = '1';
			    Laurus.Text2Frame.EventID = '1';
			    Laurus.Text2Frame.PageID = '1';
			    Laurus.Text2Frame.IsOverwrite = true;
			    Laurus.Text2Frame.CommentOutChar = '%';
			    Laurus.Text2Frame.IsDebug = false;
			    Laurus.Text2Frame.DisplayMsg = true;
			    Laurus.Text2Frame.DisplayWarning = true;
			    Laurus.Text2Frame.BatchStrategy = 'diff';
			    Laurus.Text2Frame.TextPath = 'dummy';
			    Laurus.Text2Frame.MapPath = 'dummy';
			    Laurus.Text2Frame.CommonEventPath = 'dummy';

			    globalThis.Game_Interpreter = {};
			    Game_Interpreter.prototype = {};
			    globalThis.$gameMessage = {};
			    $gameMessage.add = function () {};
			  } else {
			    // for default plugin command
			    Laurus.Text2Frame.Parameters = PluginManager.parameters('Text2Frame');
			    Laurus.Text2Frame.WindowPosition = String(Laurus.Text2Frame.Parameters['Default Window Position']);
			    Laurus.Text2Frame.Background = String(Laurus.Text2Frame.Parameters['Default Background']);
			    Laurus.Text2Frame.FileFolder = String(Laurus.Text2Frame.Parameters['Default Scenario Folder']);
			    Laurus.Text2Frame.FileName = String(Laurus.Text2Frame.Parameters['Default Scenario File']);
			    Laurus.Text2Frame.CommonEventID = String(Laurus.Text2Frame.Parameters['Default Common Event ID']);
			    Laurus.Text2Frame.MapID = String(Laurus.Text2Frame.Parameters['Default MapID']);
			    Laurus.Text2Frame.EventID = String(Laurus.Text2Frame.Parameters['Default EventID']);
			    Laurus.Text2Frame.PageID = String(Laurus.Text2Frame.Parameters['Default PageID']);
			    Laurus.Text2Frame.IsOverwrite = (String(Laurus.Text2Frame.Parameters.IsOverwrite) === 'true');
			    Laurus.Text2Frame.CommentOutChar = String(Laurus.Text2Frame.Parameters['Comment Out Char']);
			    Laurus.Text2Frame.IsDebug = (String(Laurus.Text2Frame.Parameters.IsDebug) === 'true');
			    Laurus.Text2Frame.DisplayMsg = (String(Laurus.Text2Frame.Parameters.DisplayMsg) === 'true');
			    Laurus.Text2Frame.DisplayWarning = (String(Laurus.Text2Frame.Parameters.DisplayWarning) === 'true');
			    Laurus.Text2Frame.BatchStrategy = 'diff';
			    let PATH_SEP = '/';
			    let BASE_PATH = '.';
			    if (typeof commonjsRequire !== 'undefined') {
			      const path = require$$0$1;
			      PATH_SEP = path.sep;
			      BASE_PATH = path.dirname(process.mainModule.filename);
			    }
			    Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
			    Laurus.Text2Frame.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
			    Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			  }

			  const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
			  Game_Interpreter.prototype.pluginCommand = function (command, args) {
			    _Game_Interpreter_pluginCommand.apply(this, arguments);
			    const isDevelopment = Utils.isOptionValid('test');
			    if (isDevelopment) {
			      this.pluginCommandText2Frame(command, args);
			    } else {
			      $gameMessage.add('Text2Frameは開発専用プラグインであり、デプロイメント後は');
			      $gameMessage.add('動作しません。このメッセージが繰り返し表示される場合は、');
			      $gameMessage.add('このプラグインをOFFにしてデプロイメントしてください。');
			    }
			  };

			  Game_Interpreter.prototype.pluginCommandText2Frame = function (command, args) {
			    const addMessage = function (text) {
			      if (Laurus.Text2Frame.DisplayMsg) {
			        $gameMessage.add(text);
			      }
			    };

			    const addWarning = function (warning) {
			      // 翻訳/監視ツール用: _warnings が配列のときだけ警告を収集する(ゲーム内/テスト経路は不変)。
			      if (Array.isArray(Laurus.Text2Frame._warnings)) {
			        Laurus.Text2Frame._warnings.push(warning);
			      }
			      if (Laurus.Text2Frame.DisplayWarning) {
			        $gameMessage.add(warning);
			      }
			    };

			    const getDirParams = function () {
			      let PATH_SEP = '/';
			      let BASE_PATH = '.';

			      if (typeof commonjsRequire !== 'undefined') {
			        const path = require$$0$1;
			        PATH_SEP = path.sep;
			        // process.mainModule は環境によって undefined のことがある(VSCode 拡張ホスト等)。
			        // その場合は cwd にフォールバックする。絶対パス指定時は BASE_PATH を使わない。
			        const mainFile = process.mainModule && process.mainModule.filename;
			        BASE_PATH = mainFile ? path.dirname(mainFile) : process.cwd();
			      }

			      return { PATH_SEP, BASE_PATH }
			    };

			    const getDefaultPage = function () {
			      return {
			        conditions: {
			          actorId: 1,
			          actorValid: false,
			          itemId: 1,
			          itemValid: false,
			          selfSwitchCh: 'A',
			          selfSwitchValid: false,
			          switch1Id: 1,
			          switch1Valid: false,
			          switch2Id: 1,
			          switch2Valid: false,
			          variableId: 1,
			          variableValid: false,
			          variableValue: 0
			        },
			        directionFix: false,
			        image: { characterIndex: 0, characterName: '', direction: 2, pattern: 0, tileId: 0 },
			        list: [
			          { code: 0, indent: 0, parameters: [] }
			        ],
			        moveFrequency: 3,
			        moveRoute: {
			          list: [{ code: 0, parameters: [] }],
			          repeat: true,
			          skippable: false,
			          wait: false
			        },
			        moveSpeed: 3,
			        moveType: 0,
			        priorityType: 0,
			        stepAnime: false,
			        through: false,
			        trigger: 0,
			        walkAnime: true
			      }
			    };

			    // MERGE(反映): 祖先(BASE)を解決し 3-way / overlay / overwrite を自動選択して
			    // マージ後のコマンド列を返す。event / CE で共通。祖先の保存キー(baseRoot/baseId)も返す。
			    const resolveMergeCommands = function (existing_events, event_command_list, textPath, explicitBasePath) {
			      // 祖先(BASE): 明示 BasePath 優先。無ければ .t2f-base/<locale>/<key> を自動参照。
			      let base_cmds = null;
			      let baseRoot = null;
			      let baseId = null;
			      try {
			        // 祖先は「ユーザーのプロジェクト(cwd)」直下の .t2f-base に置く(ツール本体の場所ではない)。
			        baseRoot = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : getDirParams().BASE_PATH;
			        const meta = parseFrontMatter(readText(textPath)).meta;
			        baseId = deriveBaseId(textPath, meta);
			      } catch (e) { baseRoot = null; }
			      if (explicitBasePath) {
			        try { base_cmds = compile(parseFrontMatter(readText(explicitBasePath)).body); } catch (e) { base_cmds = null; }
			      } else if (baseRoot && baseId) {
			        const bt = readBaseText(baseRoot, baseId.locale, baseId.key);
			        if (bt) { try { base_cmds = compile(parseFrontMatter(bt).body); } catch (e) { base_cmds = null; } }
			      }
			      let merge_result;
			      const hasContent = existing_events.some(function (c) { return c && c.code !== 0 });

			      if (base_cmds && hasContent) {
			        merge_result = applyThreeWayMerge(base_cmds, existing_events, event_command_list);
			        if (merge_result.conflicts) addWarning('3-way merge: ' + merge_result.conflicts + ' conflict(s) kept both / 衝突を両方残しました');
			      } else if (hasContent) {
			        merge_result = applyOverlay(existing_events, event_command_list);
			      } else {
			        const overwriteCmds = event_command_list.slice();
			        while (overwriteCmds.length && overwriteCmds[overwriteCmds.length - 1] && overwriteCmds[overwriteCmds.length - 1].code === 0) overwriteCmds.pop();
			        merge_result = { commands: overwriteCmds, warnings: [] };
			      }
			      for (let wi = 0; wi < merge_result.warnings.length; wi++) addWarning(merge_result.warnings[wi]);
			      return { commands: merge_result.commands, baseRoot, baseId }
			    };

			    // マージ反映後、反映したテキストを次回の祖先として保存する(明示 BasePath 使用時も最新化)。
			    const saveMergeBase = function (baseRoot, baseId, textPath) {
			      if (baseRoot && baseId) { try { saveBaseText(baseRoot, baseId.locale, baseId.key, readText(textPath)); } catch (e) {} }
			    };

			    // overwrite 反映の直後も text==game なので、同じく祖先を更新する。
			    // 読み込み済みのテキスト/メタを受け取り、ファイルを読み直さない。
			    const saveBaseAfterOverwrite = function (textPath, text, meta) {
			      try {
			        const root = (typeof process !== 'undefined' && process.cwd) ? process.cwd() : getDirParams().BASE_PATH;
			        const id = deriveBaseId(textPath, meta);
			        if (root && id) saveBaseText(root, id.locale, id.key, text);
			      } catch (e) { /* best effort */ }
			    };

			    Laurus.Text2Frame.ExecMode = command.toUpperCase();

			    switch (Laurus.Text2Frame.ExecMode) {
			      // for custom plugin command
			      case 'IMPORT_MESSAGE_TO_EVENT' :
			      case 'メッセージをイベントにインポート' :
			        addMessage('import message to event. \n/ メッセージをイベントにインポートします。');
			        if (args[0]) Laurus.Text2Frame.FileFolder = args[0];
			        if (args[1]) Laurus.Text2Frame.FileName = args[1];
			        if (args[2]) Laurus.Text2Frame.MapID = args[2];
			        if (args[3]) Laurus.Text2Frame.EventID = args[3];
			        if (args[4] && (args[4].toLowerCase() === 'true' || args[4].toLowerCase() === 'false')) {
			          Laurus.Text2Frame.IsOverwrite = args[4].toLowerCase() === 'true';
			          addWarning('【警告】5番目の引数に上書き判定を設定することは非推奨に');
			          addWarning('なりました。ページIDを設定してください。上書き判定は6番');
			          addWarning('目に設定してください。(警告はオプションでOFFにできます)');
			        } else if (args[4]) {
			          Laurus.Text2Frame.PageID = args[4];
			        }
			        if (args[5] && args[5].toLowerCase() === 'true') Laurus.Text2Frame.IsOverwrite = true;
			        if (args[0] || args[1]) {
			          const { PATH_SEP, BASE_PATH } = getDirParams();
			          Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
			          Laurus.Text2Frame.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
			        }
			        break
			      case 'IMPORT_MESSAGE_TO_CE' :
			      case 'メッセージをコモンイベントにインポート' :
			        if (args.length === 4) {
			          addMessage('import message to common event. \n/ メッセージをコモンイベントにインポートします。');
			          Laurus.Text2Frame.ExecMode = 'IMPORT_MESSAGE_TO_CE';
			          Laurus.Text2Frame.FileFolder = args[0];
			          Laurus.Text2Frame.FileName = args[1];
			          Laurus.Text2Frame.CommonEventID = args[2];
			          Laurus.Text2Frame.IsOverwrite = (args[3] === 'true');
			          const { PATH_SEP, BASE_PATH } = getDirParams();
			          Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
			          Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			        }
			        break
			      case 'MERGE_MESSAGE_TO_EVENT' :
			        addMessage('merge message to event. \n/ マージでイベントに反映します。');
			        if (args[0]) Laurus.Text2Frame.FileFolder = args[0];
			        if (args[1]) Laurus.Text2Frame.FileName = args[1];
			        if (args[2]) Laurus.Text2Frame.MapID = args[2];
			        if (args[3]) Laurus.Text2Frame.EventID = args[3];
			        if (args[4]) Laurus.Text2Frame.PageID = args[4];
			        if (args[0] || args[1]) {
			          const { PATH_SEP, BASE_PATH } = getDirParams();
			          Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
			          Laurus.Text2Frame.MapPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}Map${('000' + Laurus.Text2Frame.MapID).slice(-3)}.json`;
			          Laurus.Text2Frame.BasePath = (args[5] && args[6]) ? `${BASE_PATH}${PATH_SEP}${args[5]}${PATH_SEP}${args[6]}` : undefined;
			        }
			        break
			      case 'MERGE_MESSAGE_TO_CE' :
			        addMessage('merge message to common event. \n/ マージでコモンイベントに反映します。');
			        Laurus.Text2Frame.FileFolder = args[0];
			        Laurus.Text2Frame.FileName = args[1];
			        Laurus.Text2Frame.CommonEventID = args[2];
			        {
			          const { PATH_SEP, BASE_PATH } = getDirParams();
			          Laurus.Text2Frame.TextPath = `${BASE_PATH}${PATH_SEP}${Laurus.Text2Frame.FileFolder}${PATH_SEP}${Laurus.Text2Frame.FileName}`;
			          Laurus.Text2Frame.CommonEventPath = `${BASE_PATH}${PATH_SEP}data${PATH_SEP}CommonEvents.json`;
			          Laurus.Text2Frame.BasePath = (args[3] && args[4]) ? `${BASE_PATH}${PATH_SEP}${args[3]}${PATH_SEP}${args[4]}` : undefined;
			        }
			        break

			      case 'BATCH_IMPORT_MESSAGES_FROM_FOLDER' :
			      case '一括反映' :
			        addMessage('batch import from folder. \n/ フォルダから一括反映します。');
			        Laurus.Text2Frame.ImportFolder = args[0] || 'text';
			        Laurus.Text2Frame.BatchStrategy = String(args[1] || 'merge').toLowerCase();
			        Laurus.Text2Frame.ExecMode = 'BATCH_IMPORT_MESSAGES_FROM_FOLDER';
			        break
			      case 'COMMAND_LINE' :
			        Laurus.Text2Frame = Object.assign(Laurus.Text2Frame, args[0]);
			        break
			      case 'LIBRARY_EXPORT' :
			        break
			      default:
			        return
			    }

			    const logger = {};
			    logger.log = function () {
			      if (Laurus.Text2Frame.IsDebug) {
			        console.debug.apply(console, arguments);
			      }
			    };

			    logger.error = function () {
			      console.error(Array.prototype.join.call(arguments));
			    };

			    const readText = function (filepath) {
			      const fs = require$$1$1;
			      try {
			        return fs.readFileSync(filepath, { encoding: 'utf8' })
			      } catch (e) {
			        throw new Error('File not found. / ファイルが見つかりません。\n' + filepath)
			      }
			    };

			    const readJsonData = function (filepath) {
			      try {
			        const jsondata = JSON.parse(readText(filepath));
			        if (typeof jsondata === 'object') {
			          return jsondata
			        } else {
			          throw new Error(
			            'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
			          )
			        }
			      } catch (e) {
			        throw new Error(
			          'Json syntax error. \nファイルが壊れています。RPG Makerでプロジェクトをセーブし直してください\n' + filepath
			        )
			      }
			    };

			    const writeData = function (filepath, jsonData) {
			      const fs = require$$1$1;
			      try {
			        fs.writeFileSync(filepath, JSON.stringify(jsonData, null, '  '), { encoding: 'utf8' });
			      } catch (e) {
			        throw new Error(
			          'Save failed. / 保存に失敗しました。\n' + 'ファイルが開いていないか確認してください。\n' + filepath
			        )
			      }
			    };

			    /* 改行コードを統一する関数 */
			    const uniformNewLineCode = function (text) {
			      return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
			    };

			    const parseFrontMatter = function (text) {
			      const normalized = uniformNewLineCode(text);
			      if (normalized.indexOf('---\n') !== 0) {
			        return { meta: {}, body: text }
			      }
			      const endIndex = normalized.indexOf('\n---\n', 4);
			      if (endIndex < 0) {
			        return { meta: {}, body: text }
			      }

			      const header = normalized.slice(4, endIndex);
			      const body = normalized.slice(endIndex + 5);
			      const meta = {};
			      header.split('\n').forEach(function (line) {
			        const m = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
			        if (!m) {
			          return
			        }
			        const key = m[1];
			        const raw = m[2].trim();
			        const unquoted = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
			        meta[key] = unquoted;
			      });
			      return { meta, body }
			    };

			    /* コメントアウト行を削除する関数 */
			    const eraseCommentOutLines = function (scenario_text, commentOutChar) {
			      // 一度改行毎にsplitして、要素毎にチェックして最後にひとつのテキストに結合する。
			      const re = new RegExp('^ *' + commentOutChar);
			      return scenario_text
			        .split('\n')
			        .filter((x) => !x.match(re))
			        .join('\n')
			    };

			    const getValidNumberOrDefault = function (value, defaultValue = 0) {
			      return isNaN(value) || value === '' ? defaultValue : Number(value)
			    };

			    /*************************************************************************************************************/
			    const getBackground = function (background) {
			      switch (background.toUpperCase()) {
			        case 'WINDOW':
			        case 'ウインドウ':
			          return 0
			        case 'DIM':
			        case '暗くする':
			        case '暗く':
			          return 1
			        case 'TRANSPARENT':
			        case '透明':
			          return 2
			        default:
			          throw new Error('Syntax error. / 文法エラーです。')
			      }
			    };

			    const getWindowPosition = function (windowPosition) {
			      switch (windowPosition.toUpperCase()) {
			        case 'TOP':
			        case '上':
			          return 0
			        case 'MIDDLE':
			        case '中':
			          return 1
			        case 'BOTTOM':
			        case '下':
			          return 2
			        default:
			          throw new Error('Syntax error. / 文法エラーです。')
			      }
			    };

			    const getChoiceWindowPosition = function (windowPosition) {
			      switch (windowPosition.toUpperCase()) {
			        case 'LEFT':
			        case '左':
			          return 0
			        case 'MIDDLE':
			        case '中':
			          return 1
			        case 'RIGHT':
			        case '右':
			          return 2
			        default:
			          throw new Error('Syntax error. / 文法エラーです。')
			      }
			    };

			    const getPretextEvent = function () {
			      return {
			        code: 101,
			        indent: 0,
			        parameters: [
			          '',
			          0,
			          getBackground(Laurus.Text2Frame.Background),
			          getWindowPosition(Laurus.Text2Frame.WindowPosition),
			          ''
			        ]
			      }
			    };

			    const getTextFrameEvent = function (text) {
			      return { code: 401, indent: 0, parameters: [text] }
			    };

			    const getCommandBottomEvent = function () {
			      return { code: 0, indent: 0, parameters: [] }
			    };

			    const getScriptHeadEvent = function (text) {
			      const script_head = { code: 355, indent: 0, parameters: [''] };
			      script_head.parameters[0] = text;
			      return script_head
			    };
			    const getScriptBodyEvent = function (text) {
			      const script_body = { code: 655, indent: 0, parameters: [''] };
			      script_body.parameters[0] = text;
			      return script_body
			    };

			    const getPluginCommandEvent = function (text) {
			      const plugin_command = { code: 356, indent: 0, parameters: [''] };
			      plugin_command.parameters[0] = text;
			      return plugin_command
			    };

			    // JSONオブジェクトのvalueをすべてString変換する補助関数
			    const replacer = function (key, value) {
			      if (typeof value === 'object' && value !== null) {
			        return value
			      }
			      return String(value)
			    };

			    // MZのプラグインパラメータをパースする補助関数
			    const parseMzArg = function (args_string) {
			      const args = [];
			      let buffer = '';
			      let braceLevel = 0;

			      for (const char of args_string) {
			        if (char === ',' && braceLevel === 0) {
			          args.push(buffer.trim());
			          buffer = '';
			        } else {
			          buffer += char;
			          if (char === '[' || char === '{') {
			            braceLevel++;
			          } else if (char === ']' || char === '}') {
			            braceLevel--;
			          }
			        }
			      }

			      if (buffer) {
			        args.push(buffer.trim());
			      }

			      return args
			    };

			    // NestされたJSONを処理する補助関数
			    const parseNestedJSON = function (jsonString) {
			      let jsonObject;
			      try {
			        jsonObject = JSON.parse(jsonString);
			      } catch (error) {
			        return jsonString
			      }

			      for (const key in jsonObject) {
			        if (typeof jsonObject[key] === 'string') {
			          try {
			            jsonObject[key] = parseNestedJSON(jsonObject[key]);
			          } catch (error) {
			            continue
			          }
			        }
			      }

			      return jsonObject
			    };

			    const stringifyNestedJSON = function (jsonObject) {
			      for (const key in jsonObject) {
			        if (typeof jsonObject[key] === 'object' && jsonObject[key] !== null) {
			          jsonObject[key] = stringifyNestedJSON(jsonObject[key]);
			        }
			      }

			      return JSON.stringify(jsonObject, replacer)
			    };

			    const getPluginCommandEventMZ = function (
			      plugin_name, plugin_command, disp_plugin_command, args) {
			      const plugin_args = {};
			      const plugin_command_mz = {
			        code: 357,
			        indent: 0,
			        parameters: [
			          plugin_name, plugin_command, disp_plugin_command, plugin_args
			        ]
			      };
			      const arg_regexp = /([^[\]]+)(\[.*\])/i;
			      for (let i = 0; i < args.length; i++) {
			        const matched = args[i].match(arg_regexp);
			        if (matched) {
			          const arg_name = matched[1] || '';
			          const values = matched[2].slice(1, -1).split('][') || [];

			          if (['struct_arg', 'bool_array_arg', 'number_array_arg'].includes(arg_name)) {
			            const json_obj = parseNestedJSON(values[0]);
			            plugin_args[arg_name] = stringifyNestedJSON(json_obj);
			          } else {
			            plugin_args[arg_name] = values[0] || '';
			            plugin_args[arg_name] = plugin_args[arg_name].replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
			          }
			        }
			      }
			      return plugin_command_mz
			    };

			    const getPluginCommandMzParamsComment = function (plugin_command_mz_arg) {
			      const arg_regexp = /([^[\]]+)(\[.*\])/i;
			      const matched = plugin_command_mz_arg.match(arg_regexp);
			      if (matched) {
			        let arg_name = matched[1] || '';
			        const values = matched[2].slice(1, -1).split('][') || [];
			        let value = values[0] || '';

			        if (['struct_arg', 'bool_array_arg', 'number_array_arg'].includes(arg_name)) {
			          const json_obj = parseNestedJSON(values[0]);
			          value = stringifyNestedJSON(json_obj);
			        } else {
			          value = value.replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\\\\/g, ' ');
			        }

			        if (values[1]) {
			          arg_name = values[1];
			        }

			        return { code: 657, indent: 0, parameters: [arg_name + ' = ' + value] }
			      } else {
			        throw new Error('Syntax error. / 文法エラーです。' +
			                        plugin_command_mz_arg +
			                        ' はプラグインコマンドMZの引数として不適切です。')
			      }
			    };
			    const getCommonEventEvent = function (num) {
			      const common_event = { code: 117, indent: 0, parameters: [''] };
			      common_event.parameters[0] = num;
			      return common_event
			    };

			    const getCommentOutHeadEvent = function (text) {
			      const comment_out = { code: 108, indent: 0, parameters: [''] };
			      comment_out.parameters[0] = text;
			      return comment_out
			    };
			    const getCommentOutBodyEvent = function (text) {
			      const comment_out = { code: 408, indent: 0, parameters: [''] };
			      comment_out.parameters[0] = text;
			      return comment_out
			    };

			    const getScrollingTextHeadEvent = function (scrolling_speed, enable_auto_scroll) {
			      const scrolling_text = { code: 105, indent: 0, parameters: [2, false] };
			      if (scrolling_speed) {
			        scrolling_text.parameters[0] = scrolling_speed;
			      }
			      if (enable_auto_scroll) {
			        switch (enable_auto_scroll.toLowerCase()) {
			          case 'on':
			          case 'オン':
			          case 'true':
			          case 'no fast forward':
			          case '1': {
			            scrolling_text.parameters[1] = true;
			            break
			          }
			          case 'off':
			          case 'オフ':
			          case 'false':
			          case '0': {
			            scrolling_text.parameters[1] = false;
			            break
			          }
			        }
			      }
			      return scrolling_text
			    };
			    const getScrollingTextBodyEvent = function (text) {
			      return { code: 405, indent: 0, parameters: [text] }
			    };

			    const getWaitEvent = function (num) {
			      const wait = { code: 230, indent: 0, parameters: [''] };
			      wait.parameters[0] = num;
			      return wait
			    };

			    const getFadeinEvent = function () {
			      return { code: 222, indent: 0, parameters: [] }
			    };
			    const getFadeoutEvent = function () {
			      return { code: 221, indent: 0, parameters: [] }
			    };

			    const getPlayBgmEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      return {
			        code: 241,
			        indent: 0,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
			      }
			    };

			    const getStopBgmEvent = function (volume, pitch, pan) {
			      return getPlayBgmEvent('', volume, pitch, pan)
			    };

			    const getFadeoutBgmEvent = function (duration) {
			      let param_duration = 10;
			      if (typeof (duration) === 'number') {
			        param_duration = duration;
			      }
			      return { code: 242, indent: 0, parameters: [param_duration] }
			    };

			    const getSaveBgmEvent = function () {
			      return { code: 243, indent: 0, parameters: [] }
			    };

			    const getReplayBgmEvent = function () {
			      return { code: 244, indent: 0, parameters: [] }
			    };

			    const getChangeBattleBgmEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      return {
			        code: 132,
			        indent: 0,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
			      }
			    };

			    const getPlayBgsEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      return {
			        code: 245,
			        indent: 0,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
			      }
			    };

			    const getStopBgsEvent = function (volume, pitch, pan) {
			      return getPlayBgsEvent('', volume, pitch, pan)
			    };

			    const getFadeoutBgsEvent = function (duration) {
			      let param_duration = 10;
			      if (typeof (duration) === 'number') {
			        param_duration = duration;
			      }
			      return { code: 246, indent: 0, parameters: [param_duration] }
			    };

			    const getPlaySeEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      return {
			        code: 250,
			        indent: 0,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
			      }
			    };
			    const getStopSeEvent = function () {
			      return { code: 251, indent: 0, parameters: [] }
			    };

			    const getPlayMeEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      return {
			        code: 249,
			        indent: 0,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }]
			      }
			    };

			    const getStopMeEvent = function (volume, pitch, pan) {
			      return getPlayMeEvent('', volume, pitch, pan)
			    };

			    const getControlSwitch = function (start_pointer, end_pointer, value) {
			      switch (value.toLowerCase()) {
			        case 'on':
			        case 'オン':
			        case '1':
			        case 'true': {
			          return { code: 121, indent: 0, parameters: [parseInt(start_pointer), parseInt(end_pointer), 0] }
			        }
			        case 'off':
			        case 'オフ':
			        case '0':
			        case 'false': {
			          return { code: 121, indent: 0, parameters: [parseInt(start_pointer), parseInt(end_pointer), 1] }
			        }
			      }
			    };

			    const getControlValiable = function (
			      operation,
			      start_pointer,
			      end_pointer,
			      operand,
			      operand_arg1 = 0,
			      operand_arg2 = 0,
			      operand_arg3 = 0
			    ) {
			      const parameters = [start_pointer, end_pointer];
			      switch (operation.toLowerCase()) {
			        case 'set':
			          parameters.push(0);
			          break
			        case 'add':
			          parameters.push(1);
			          break
			        case 'sub':
			          parameters.push(2);
			          break
			        case 'mul':
			          parameters.push(3);
			          break
			        case 'div':
			          parameters.push(4);
			          break
			        case 'mod':
			          parameters.push(5);
			          break
			        default:
			          parameters.push(0);
			          break
			      }
			      switch (operand.toLowerCase()) {
			        case 'constant':
			          parameters.push(0);
			          parameters.push(operand_arg1);
			          break
			        case 'variables':
			          parameters.push(1);
			          parameters.push(operand_arg1);
			          break
			        case 'random':
			          // operator, start_pointer, end_pointer, 'random', random_range1, random_range2
			          parameters.push(2);
			          parameters.push(parseInt(operand_arg1));
			          parameters.push(parseInt(operand_arg2));
			          break
			        case 'gamedata': {
			          // operator, start_pointer, end_pointer, 'gamedata', 'item', arg1, arg2, arg3
			          parameters.push(3);
			          operand_arg1 = operand_arg1.toLowerCase();
			          switch (operand_arg1) {
			            case 'item':
			            case 'アイテム':
			              parameters.push(0);
			              parameters.push(parseInt(operand_arg2));
			              parameters.push(0);
			              break
			            case 'weapon':
			            case '武器':
			              parameters.push(1);
			              parameters.push(parseInt(operand_arg2));
			              parameters.push(0);
			              break
			            case 'armor':
			            case '防具':
			              parameters.push(2);
			              parameters.push(parseInt(operand_arg2));
			              parameters.push(0);
			              break
			            case 'actor':
			            case 'アクター':
			            case 'enemy':
			            case '敵キャラ':
			            case 'エネミー':{
			              if (operand_arg1 === 'actor' || operand_arg1 === 'アクター') {
			                parameters.push(3);
			              } else {
			                parameters.push(4);
			              }
			              parameters.push(parseInt(operand_arg2));
			              switch (operand_arg3.toLowerCase()) {
			                case 'level':
			                case 'レベル': {
			                  parameters.push(0);
			                  break
			                }
			                case 'exp':
			                case '経験値': {
			                  parameters.push(1);
			                  break
			                }
			                case 'hp': {
			                  parameters.push(2);
			                  break
			                }
			                case 'mp': {
			                  parameters.push(3);
			                  break
			                }
			                case 'maxhp':
			                case '最大hp': {
			                  parameters.push(4);
			                  break
			                }
			                case 'maxmp':
			                case '最大mp': {
			                  parameters.push(5);
			                  break
			                }
			                case 'attack':
			                case '攻撃力': {
			                  parameters.push(6);
			                  break
			                }
			                case 'defense':
			                case '防御力': {
			                  parameters.push(7);
			                  break
			                }
			                case 'm.attack':
			                case '魔法攻撃力': {
			                  parameters.push(8);
			                  break
			                }
			                case 'm.defense':
			                case '魔法防御力': {
			                  parameters.push(9);
			                  break
			                }
			                case 'agility':
			                case '敏捷性': {
			                  parameters.push(10);
			                  break
			                }
			                case 'luck':
			                case '運': {
			                  parameters.push(11);
			                  break
			                }
			                default: {
			                  parameters.push(0);
			                  break
			                }
			              }
			              if (operand_arg1 === 'enemy' || operand_arg1 === '敵キャラ' || operand_arg1 === 'エネミー') {
			                let value = parameters.pop();
			                let key = parameters.pop();
			                value = value - 2;
			                key = key - 1;
			                parameters.push(key);
			                parameters.push(value);
			              }
			              break
			            }
			            case 'character':
			            case 'キャラクター':
			              parameters.push(5);
			              switch (operand_arg2.toLowerCase()) {
			                case 'player':
			                case 'プレイヤー':
			                case '-1': {
			                  parameters.push(-1);
			                  break
			                }
			                case 'thisevent':
			                case 'このイベント':
			                case '0': {
			                  parameters.push(0);
			                  break
			                }
			                default: {
			                  parameters.push(parseInt(operand_arg2));
			                  break
			                }
			              }
			              switch (operand_arg3.toLowerCase()) {
			                case 'mapx':
			                case 'マップx': {
			                  parameters.push(0);
			                  break
			                }
			                case 'mapy':
			                case 'マップy': {
			                  parameters.push(1);
			                  break
			                }
			                case 'direction':
			                case '方向': {
			                  parameters.push(2);
			                  break
			                }
			                case 'screenx':
			                case '画面x': {
			                  parameters.push(3);
			                  break
			                }
			                case 'screeny':
			                case '画面y': {
			                  parameters.push(4);
			                  break
			                }
			                default: {
			                  parameters.push(0);
			                  break
			                }
			              }
			              break
			            case 'party':
			            case 'パーティ':
			              parameters.push(6);
			              parameters.push(parseInt(operand_arg2) - 1);
			              parameters.push(0);
			              break
			            case 'other':
			              parameters.push(7);
			              switch (operand_arg2.toLowerCase()) {
			                case 'mapid':
			                case 'マップid': {
			                  parameters.push(0);
			                  break
			                }
			                case 'partymembers':
			                case 'パーティ人数': {
			                  parameters.push(1);
			                  break
			                }
			                case 'gold':
			                case '所持金': {
			                  parameters.push(2);
			                  break
			                }
			                case 'steps':
			                case '歩数': {
			                  parameters.push(3);
			                  break
			                }
			                case 'playtime':
			                case 'プレイ時間': {
			                  parameters.push(4);
			                  break
			                }
			                case 'timer':
			                case 'タイマー': {
			                  parameters.push(5);
			                  break
			                }
			                case 'savecount':
			                case 'セーブ回数': {
			                  parameters.push(6);
			                  break
			                }
			                case 'battlecount':
			                case '戦闘回数': {
			                  parameters.push(7);
			                  break
			                }
			                case 'wincount':
			                case '勝利回数': {
			                  parameters.push(8);
			                  break
			                }
			                case 'escapecount':
			                case '逃走回数': {
			                  parameters.push(9);
			                  break
			                }
			                default: {
			                  parameters.push(parseInt(operand_arg2));
			                  break
			                }
			              }
			              parameters.push(0);
			              break
			            case 'last':
			            case '直前':
			              parameters.push(8);
			              switch (operand_arg2.toLowerCase()) {
			                case 'last used skill id':
			                case '直前に使用したスキルのid':
			                case 'used skill id': {
			                  parameters.push(0);
			                  break
			                }
			                case 'last used item id':
			                case '直前に使用したアイテムのid':
			                case 'used item id': {
			                  parameters.push(1);
			                  break
			                }
			                case 'last actor id to act':
			                case '直前に行動したアクターのid':
			                case 'actor id to act': {
			                  parameters.push(2);
			                  break
			                }
			                case 'last enemy index to act':
			                case '直前に行動した敵キャラのインデックス':
			                case 'enemy index to act': {
			                  parameters.push(3);
			                  break
			                }
			                case 'last target actor id':
			                case '直前に対象となったアクターのid':
			                case 'target actor id': {
			                  parameters.push(4);
			                  break
			                }
			                case 'last target enemy index':
			                case '直前に対象となった敵キャラのインデックス':
			                case 'target enemy index': {
			                  parameters.push(5);
			                  break
			                }
			                default: {
			                  parameters.push(0);
			                  break
			                }
			              }
			              parameters.push(0);
			              break
			          }
			          break
			        }
			        case 'script': {
			          parameters.push(4);
			          parameters.push(operand_arg1);
			          break
			        }
			        default:
			          parameters.push(0);
			          parameters.push(operand_arg1);
			          parameters.push(operand_arg2);
			          parameters.push(operand_arg3);
			          break
			      }
			      return { code: 122, indent: 0, parameters }
			    };

			    const getControlSelfSwitch = function (target, value) {
			      switch (value.toLowerCase()) {
			        case 'on':
			        case 'オン':
			        case '1':
			        case 'true': {
			          return { code: 123, indent: 0, parameters: [target.toUpperCase(), 0] }
			        }
			        case 'off':
			        case 'オフ':
			        case '0':
			        case 'false': {
			          return { code: 123, indent: 0, parameters: [target.toUpperCase(), 1] }
			        }
			        default:
			          return { code: 123, indent: 0, parameters: [target.toUpperCase(), 1] }
			      }
			    };

			    const getControlTimer = function (operation, sec) {
			      switch (operation.toLowerCase()) {
			        case 'start':
			        case '始動':
			        case 'スタート': {
			          return { code: 124, indent: 0, parameters: [0, parseInt(sec)] }
			        }
			        case 'stop':
			        case '停止':
			        case 'ストップ': {
			          return { code: 124, indent: 0, parameters: [1, parseInt(sec)] }
			        }
			        default:
			          return { code: 124, indent: 0, parameters: [1, parseInt(sec)] }
			      }
			    };
			    /*************************************************************************************************************/
			    const getBlockStatement = function (scenario_text, statement) {
			      const block_map = {};
			      let block_count = 0;
			      let re = null;
			      let event_head_func = function () {};
			      let event_body_func = function () {};

			      switch (statement.toLowerCase()) {
			        case 'script': {
			          re = /<script>([\s\S]*?)<\/script>|<sc>([\s\S]*?)<\/sc>|<スクリプト>([\s\S]*?)<\/スクリプト>/i;
			          event_head_func = getScriptHeadEvent;
			          event_body_func = getScriptBodyEvent;
			          break
			        }
			        case 'comment': {
			          re = /<comment>([\s\S]*?)<\/comment>|<co>([\s\S]*?)<\/co>|<注釈>([\s\S]*?)<\/注釈>/i;
			          event_head_func = getCommentOutHeadEvent;
			          event_body_func = getCommentOutBodyEvent;
			          break
			        }
			        case 'scrolling': {
			          let block =
			            scenario_text.match(/<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i) ||
			            scenario_text.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) ||
			            scenario_text.match(
			              /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
			            );
			          while (block !== null) {
			            const match_block = block[0];
			            const scrolling_speed = Number(block[1]);
			            const enable_auto_scroll = block[2];
			            const scrolling_text = block[3];
			            const match_text_list = scrolling_text.replace(/^\n/, '').replace(/\n$/, '').split('\n');
			            let event_list = [];

			            event_list.push(getScrollingTextHeadEvent(scrolling_speed, enable_auto_scroll));
			            event_list = event_list.concat(match_text_list.map(t => getScrollingTextBodyEvent(t)));
			            block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;

			            scenario_text = scenario_text.replace(match_block, `\n#${statement.toUpperCase()}_BLOCK${block_count}#\n`);
			            block_count++;

			            block =
			              scenario_text.match(
			                /<ShowScrollingText\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/ShowScrollingText>/i
			              ) ||
			              scenario_text.match(/<sst\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/sst>/i) ||
			              scenario_text.match(
			                /<文章のスクロール表示\s*:*\s*(\d*)\s*,*\s*([\s\S]*?)>([\s\S]*?)<\/文章のスクロール表示>/i
			              );
			          }
			          return { scenario_text, block_map }
			        }
			      }

			      let block = scenario_text.match(re);
			      while (block !== null) {
			        const match_block = block[0];
			        const match_text = block[1] || block[2] || block[3];
			        scenario_text = scenario_text.replace(match_block, `\n#${statement.toUpperCase()}_BLOCK${block_count}#\n`);
			        const match_text_list = match_text.replace(/^\n/, '').replace(/\n$/, '').split('\n');
			        const event_list = [];
			        for (let i = 0; i < match_text_list.length; i++) {
			          const text = match_text_list[i];
			          if (i === 0) {
			            event_list.push(event_head_func(text));
			          } else {
			            event_list.push(event_body_func(text));
			          }
			        }
			        block_map[`#${statement.toUpperCase()}_BLOCK${block_count}#`] = event_list;
			        block = scenario_text.match(re);
			        block_count++;
			      }
			      return { scenario_text, block_map }
			    };

			    const getDefaultPictureOptions = function () {
			      return {
			        origin: 0, // 0: UpperLeft, 1:Center
			        variable: 0, // 0: Constant, 1: Variable
			        // if variable is 0, x and y are  a constant values.
			        // if variable is 1, x is a number of variables
			        x: 0,
			        y: 0,
			        width: 100,
			        height: 100, // %
			        opacity: 255,
			        blend_mode: 0, // 0:Normal, 1:Additive, 2:Multiply, 3:Screen
			        duration: 60,
			        wait: true, // for a function that move a picture
			        red: 0,
			        green: 0,
			        blue: 0,
			        gray: 0, // for a function that tints a picture.
			        easing: 0 // for MZ
			      }
			    };

			    const getPictureOptions = function (option_str) {
			      const out = {};
			      const option_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])/i;
			      const option = option_str.match(option_regexp);
			      if (option) {
			        const key = option[1] || '';
			        const values = option[2].slice(1, -1).split('][') || '';
			        switch (key.toLowerCase()) {
			          case 'position':
			          case '位置': {
			            const origin = values[0] || 'Upper Left';
			            if (origin.toLowerCase() === 'center' || origin === '中央') {
			              out.origin = 1;
			            }
			            const constant_regexp = /^-?[0-9]+$/;
			            const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
			            const x = values[1] || '0';
			            if (x.match(constant_regexp)) {
			              out.variable = 0;
			              out.x = Number(x);
			            } else {
			              const v = x.match(variable_regexp);
			              if (v) {
			                out.variable = 1;
			                out.x = Number(v[1]);
			              }
			            }
			            const y = values[2] || '0';
			            if (y.match(constant_regexp)) {
			              out.variable = 0;
			              out.y = Number(y);
			            } else {
			              const v = y.match(variable_regexp);
			              if (v) {
			                out.variable = 1;
			                out.y = Number(v[1]);
			              }
			            }
			            break
			          }
			          case 'scale':
			          case '拡大率': {
			            out.width = getValidNumberOrDefault(values[0], 100);
			            out.height = getValidNumberOrDefault(values[1], 100);
			            break
			          }
			          case 'blend':
			          case '合成': {
			            out.opacity = getValidNumberOrDefault(values[0], 255);
			            out.blend_mode =
			              {
			                normal: 0,
			                通常: 0,
			                additive: 1,
			                加算: 1,
			                multiply: 2,
			                乗算: 2,
			                screen: 3,
			                スクリーン: 3
			              }[values[1].toLowerCase()] || 0;
			            break
			          }
			          case 'duration':
			          case '時間': {
			            out.duration = getValidNumberOrDefault(values[0], 60);
			            if (typeof (values[1]) === 'undefined' || values[1] === '') {
			              out.wait = false;
			            }
			            break
			          }
			          case 'colortone':
			          case '色調':
			          case 'ct': {
			            const firstValue = values[0].toLowerCase() || 0;
			            switch (firstValue) {
			              case 'normal':
			              case '通常': {
			                out.red = 0;
			                out.green = 0;
			                out.blue = 0;
			                out.gray = 0;
			                break
			              }
			              case 'dark':
			              case 'ダーク': {
			                out.red = -68;
			                out.green = -68;
			                out.blue = -68;
			                out.gray = 0;
			                break
			              }
			              case 'sepia':
			              case 'セピア': {
			                out.red = 34;
			                out.green = -34;
			                out.blue = -68;
			                out.gray = 170;
			                break
			              }
			              case 'sunset':
			              case '夕暮れ': {
			                out.red = 68;
			                out.green = -34;
			                out.blue = -34;
			                out.gray = 0;
			                break
			              }
			              case 'night':
			              case '夜': {
			                out.red = -68;
			                out.green = -68;
			                out.blue = 0;
			                out.gray = 68;
			                break
			              }
			              default: {
			                out.red = Number(values[0]) || 0;
			                out.green = Number(values[1]) || 0;
			                out.blue = Number(values[2]) || 0;
			                out.gray = Number(values[3]) || 0;
			                break
			              }
			            }
			            break
			          }
			          case 'easing':
			          case 'イージング': {
			            const easingMode = values[0].toLowerCase() || 'inear';
			            out.easing = {
			              'constant speed': 0,
			              一定速度: 0,
			              linear: 0,
			              'slow start': 1,
			              ゆっくり始まる: 1,
			              'ease-in': 1,
			              'slow end': 2,
			              ゆっくり終わる: 2,
			              'ease-out': 2,
			              'slow start and end': 3,
			              ゆっくり始まってゆっくり終わる: 3,
			              'ease-in-out': 3
			            }[easingMode];
			            break
			          }
			        }
			      }
			      return out
			    };

			    const getShowPicture = function (pic_no, name, options = []) {
			      const ps = getDefaultPictureOptions();
			      options.map(x => Object.assign(ps, getPictureOptions(x)));
			      return {
			        code: 231,
			        indent: 0,
			        parameters: [pic_no, name,
			          ps.origin, ps.variable,
			          ps.x, ps.y, ps.width, ps.height,
			          ps.opacity, ps.blend_mode]
			      }
			    };

			    const getMovePicture = function (pic_no, options = []) {
			      const ps = getDefaultPictureOptions();
			      options.map((x) => Object.assign(ps, getPictureOptions(x)));
			      return {
			        code: 232,
			        indent: 0,
			        parameters: [
			          pic_no,
			          0,
			          ps.origin,
			          ps.variable,
			          ps.x,
			          ps.y,
			          ps.width,
			          ps.height,
			          ps.opacity,
			          ps.blend_mode,
			          ps.duration,
			          ps.wait,
			          ps.easing
			        ]
			      }
			    };

			    const getRotatePicture = function (pic_no, speed) {
			      return { code: 233, indent: 0, parameters: [pic_no, speed] }
			    };

			    const getTintPicture = function (pic_no, options = []) {
			      const ps = getDefaultPictureOptions();
			      options.map(x => Object.assign(ps, getPictureOptions(x)));
			      return {
			        code: 234,
			        indent: 0,
			        parameters: [pic_no,
			          [ps.red, ps.green, ps.blue, ps.gray],
			          ps.duration, ps.wait]
			      }
			    };

			    const getErasePicture = function (pic_no) {
			      return { code: 235, indent: 0, parameters: [pic_no] }
			    };

			    const getIfSwitchParameters = function (switchId, params) {
			      switchId = Math.max(Number(switchId) || 1, 1);
			      if (typeof (params[0]) === 'undefined') {
			        return [0, switchId, 0]
			      }
			      const value = ({
			        on: 0,
			        オン: 0,
			        true: 0,
			        1: 0,
			        off: 1,
			        オフ: 1,
			        false: 1,
			        0: 1
			      })[params[0].toLowerCase()];
			      if (switchId > 0 && (value === 1 || value === 0)) {
			        return [0, switchId, value]
			      }
			      return [0, switchId, 0]
			    };

			    const getIfVariableParameters = function (variableId, params) {
			      variableId = Math.max(Number(variableId) || 1, 1);
			      const operator = {
			        '==': 0,
			        '＝': 0,
			        '>=': 1,
			        '≧': 1,
			        '<=': 2,
			        '≦': 2,
			        '>': 3,
			        '＞': 3,
			        '<': 4,
			        '＜': 4,
			        '!=': 5,
			        '≠': 5
			      }[params[0]] || 0;
			      const constant_regexp = /^\d+$/;
			      const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
			      const operand = params[1] || '0';
			      if (operand.match(constant_regexp)) {
			        return [1, variableId, 0, Number(operand), operator]
			      } else if (operand.match(variable_regexp)) {
			        const value = Math.max(Number(operand.match(variable_regexp)[1]), 1);
			        return [1, variableId, 1, value, operator]
			      }
			      return [1, variableId, 0, 0, 0]
			    };

			    const getIfSelfSwitchParameters = function (selfSwitchId, params) {
			      selfSwitchId = selfSwitchId.toUpperCase();
			      switch (selfSwitchId) {
			        case 'A':
			        case 'B':
			        case 'C':
			        case 'D':
			          break
			        default:
			          selfSwitchId = 'A';
			      }
			      if (typeof (params[0]) === 'undefined') {
			        return [2, selfSwitchId, 0]
			      }
			      const value = ({
			        on: 0,
			        オン: 0,
			        true: 0,
			        1: 0,
			        off: 1,
			        オフ: 1,
			        false: 1,
			        0: 1
			      })[params[0].toLowerCase()];
			      if (value === 0 || value === 1) {
			        return [2, selfSwitchId, value]
			      }
			      return [2, selfSwitchId, 0]
			    };

			    const getIfTimerParameters = function (params) {
			      const condition = {
			        '>=': 0,
			        '≧': 0,
			        '<=': 1,
			        '≦': 1
			      }[params[0]] || 0;
			      const minute = Number(params[1]) || 0;
			      const second = Number(params[2]) || 0;
			      return [3, 60 * minute + second, condition]
			    };

			    const getIfActorParameters = function (actorId, params) {
			      actorId = Math.max(Number(actorId) || 1, 1);
			      const actor_mode = {
			        'in the party': 0,
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
			      }[params[0].toLowerCase()] || 0;
			      if (actor_mode > 0) {
			        if (actor_mode === 1) {
			          return [4, actorId, 1, params[1]]
			        } else if (Number(params[1])) {
			          return [4, actorId, actor_mode, Math.max(Number(params[1]), 1)]
			        }
			      }
			      return [4, actorId, 0]
			    };

			    const getIfEnemyParameters = function (enemyId, params) {
			      enemyId = Math.max(Number(enemyId) || 1, 1) - 1;
			      const condition = (params[0] || 'appeared').toLowerCase();
			      const state_id = Math.max(Number(params[1]) || 1, 1);
			      if (condition === 'appeared' || condition === '出現している') {
			        return [5, enemyId, 0]
			      } else if (condition === 'state' || condition === 'ステート') {
			        return [5, enemyId, 1, state_id]
			      } else {
			        return [5, enemyId, 0]
			      }
			    };

			    const getIfCharacterParameters = function (character, params) {
			      let characterId = {
			        player: -1,
			        プレイヤー: -1,
			        thisevent: 0,
			        このイベント: 0
			      }[character.toLowerCase()];
			      if (typeof (characterId) === 'undefined') {
			        characterId = Math.max(Number(character) || 0, -1);
			      }
			      const direction = {
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
			      }[(params[0] || '').toLowerCase()] || 2;
			      return [6, characterId, direction]
			    };

			    const getIfVehicleParameters = function (params) {
			      const vehicle = {
			        boat: 0,
			        小型船: 0,
			        ship: 1,
			        大型船: 1,
			        airship: 2,
			        飛行船: 2
			      }[(params[0] || '').toLowerCase()] || 0;
			      return [13, vehicle]
			    };

			    const getIfGoldParameters = function (params) {
			      const condition = {
			        '>=': 0,
			        '≧': 0,
			        '<=': 1,
			        '≦': 1,
			        '<': 2,
			        '＜': 2
			      }[params[0]] || 0;
			      const gold = Number(params[1]) || 0;
			      return [7, gold, condition]
			    };

			    const getIfItemParameters = function (itemId) {
			      itemId = Math.max(Number(itemId) || 1, 1);
			      return [8, itemId]
			    };

			    const getIfWeaponParameters = function (weaponId, params) {
			      weaponId = Math.max(Number(weaponId) || 1, 1);
			      let include_equipment = false;
			      if (params[0]) include_equipment = true;
			      return [9, weaponId, include_equipment]
			    };

			    const getIfArmorParameters = function (armorId, params) {
			      armorId = Math.max(Number(armorId) || 1, 1);
			      let include_equipment = false;
			      if (params[0]) include_equipment = true;
			      return [10, armorId, include_equipment]
			    };

			    const getIfButtonParameters = function (params) {
			      const button = {
			        ok: 'ok',
			        決定: 'ok',
			        cancel: 'cancel',
			        キャンセル: 'cancel',
			        shift: 'shift',
			        シフト: 'shift',
			        down: 'down',
			        下: 'down',
			        left: 'left',
			        左: 'left',
			        right: 'right',
			        右: 'right',
			        up: 'up',
			        上: 'up',
			        pageup: 'pageup',
			        ページアップ: 'pageup',
			        pagedown: 'pagedown',
			        ページダウン: 'pagedown'
			      }[(params[0] || '').toLowerCase()] || 'ok';
			      const how = {
			        'is being pressed': 0,
			        が押されている: 0,
			        pressed: 0,
			        'is being triggered': 1,
			        がトリガーされている: 1,
			        triggered: 1,
			        'is being repeated': 2,
			        がリピートされている: 2,
			        repeated: 2
			      }[(params[1] || '').toLowerCase()] || 0;
			      return [11, button, how]
			    };

			    const getIfScriptParameters = function (params) {
			      return [12, params.join(',').trim()]
			    };

			    const getConditionalBranch = function (target, params) {
			      const out = { code: 111, indent: 0, parameters: [0, 1, 0] }; // default
			      const target_regexp = /([^[\]]+)(\[[\s\-a-zA-Z0-9\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf[\]]+\])*/i;
			      target = target.match(target_regexp);
			      const mode = target[1];
			      const mode_value = (target[2] || '').replace(/[[\]]/g, '');
			      switch (mode.toLowerCase()) {
			        case 'script':
			        case 'スクリプト':
			        case 'sc':
			          break
			        default:
			          params = params.map((s) => s.trim());
			          break
			      }
			      switch (mode.toLowerCase()) {
			        case 'switches':
			        case 'スイッチ':
			        case 'sw': {
			          out.parameters = getIfSwitchParameters(mode_value, params);
			          break
			        }
			        case 'variables':
			        case '変数':
			        case 'v': {
			          out.parameters = getIfVariableParameters(mode_value, params);
			          break
			        }
			        case 'selfswitches':
			        case 'セルフスイッチ':
			        case 'ssw': {
			          out.parameters = getIfSelfSwitchParameters(mode_value, params);
			          break
			        }
			        case 'timer':
			        case 'タイマー': {
			          out.parameters = getIfTimerParameters(params);
			          break
			        }
			        case 'actors':
			        case 'アクター': {
			          out.parameters = getIfActorParameters(mode_value, params);
			          break
			        }
			        case 'enemies':
			        case '敵キャラ':
			        case 'エネミー': {
			          out.parameters = getIfEnemyParameters(mode_value, params);
			          break
			        }
			        case 'characters':
			        case 'キャラクター': {
			          out.parameters = getIfCharacterParameters(mode_value, params);
			          break
			        }
			        case 'vehicle':
			        case '乗り物': {
			          out.parameters = getIfVehicleParameters(params);
			          break
			        }
			        case 'gold':
			        case 'お金': {
			          out.parameters = getIfGoldParameters(params);
			          break
			        }
			        case 'items':
			        case 'アイテム': {
			          out.parameters = getIfItemParameters(mode_value);
			          break
			        }
			        case 'weapons':
			        case '武器': {
			          out.parameters = getIfWeaponParameters(mode_value, params);
			          break
			        }
			        case 'armors':
			        case '防具': {
			          out.parameters = getIfArmorParameters(mode_value, params);
			          break
			        }
			        case 'button':
			        case 'ボタン': {
			          out.parameters = getIfButtonParameters(params);
			          break
			        }
			        case 'script':
			        case 'スクリプト':
			        case 'sc': {
			          out.parameters = getIfScriptParameters(params);
			          break
			        }
			      }
			      return out
			    };

			    const getElse = function () {
			      return { code: 411, indent: 0, parameters: [] }
			    };

			    const getEnd = function () {
			      return { code: 412, indent: 0, parameters: [] }
			    };

			    const getLoop = function () {
			      return { code: 112, indent: 0, parameters: [] }
			    };

			    const getRepeatAbove = function () {
			      return { code: 413, indent: 0, parameters: [] }
			    };

			    const getBreakLoop = function () {
			      return { code: 113, indent: 0, parameters: [] }
			    };

			    // Skip(109): 分岐をスキップするコアコマンド。本体は保存されるが実行されない。
			    // 409 はハンドラの無い終端マーカー。108/408・102/404 と同型のブロック構造で往復する。
			    const getSkip = function () {
			      return { code: 109, indent: 0, parameters: [] }
			    };

			    const getSkipEnd = function () {
			      return { code: 409, indent: 0, parameters: [] }
			    };

			    const getBlockEnd = function () {
			      return { code: 0, indent: 0, parameters: [] }
			    };

			    const getExitEventProcessing = function () {
			      return { code: 115, indent: 0, parameters: [] }
			    };

			    const getLabel = function (name) {
			      return { code: 118, indent: 0, parameters: [name] }
			    };

			    const getJumpToLabel = function (name) {
			      return { code: 119, indent: 0, parameters: [name] }
			    };

			    const getInputNumber = function (val_num, num_of_digits) {
			      return { code: 103, indent: 0, parameters: [val_num, num_of_digits] }
			    };

			    const getSelectItem = function (val_num, item_type) {
			      let item_type_num = 1;
			      switch (item_type.trim().toLowerCase()) {
			        case 'Regular Item'.toLowerCase():
			        case '通常アイテム'.toLowerCase(): {
			          item_type_num = 1;
			          break
			        }
			        case 'Key Item'.toLowerCase():
			        case '大事なもの'.toLowerCase(): {
			          item_type_num = 2;
			          break
			        }
			        case 'Hidden Item A'.toLowerCase():
			        case '隠しアイテムA'.toLowerCase(): {
			          item_type_num = 3;
			          break
			        }
			        case 'Hidden Item B'.toLowerCase():
			        case '隠しアイテムB'.toLowerCase(): {
			          item_type_num = 4;
			          break
			        }
			      }
			      return { code: 104, indent: 0, parameters: [val_num, item_type_num] }
			    };

			    const getShowChoices = function (window_type, window_position, default_choice, default_cancel) {
			      return { code: 102, indent: 0, parameters: [[], default_cancel, default_choice, window_position, window_type] }
			    };

			    const getShowChoiceWhen = function (index, text) {
			      return { code: 402, indent: 0, parameters: [index, text] }
			    };

			    const getShowChoiceWhenCancel = function () {
			      return { code: 403, indent: 0, parameters: [6, null] }
			    };

			    const getShowChoiceEnd = function () {
			      return { code: 404, indent: 0, parameters: [] }
			    };

			    // イベントコマンド追加
			    const getChangeGold = function (operation, operand, variable) {
			      return { code: 125, indent: 0, parameters: [operation, operand, variable] }
			    };

			    const getChangeItems = function (itemId, operation, operand, variable) {
			      return { code: 126, indent: 0, parameters: [itemId, operation, operand, variable] }
			    };

			    const getChangeWeapons = function (weaponId, operation, operand, variableId, includeEquipment) {
			      return { code: 127, indent: 0, parameters: [weaponId, operation, operand, variableId, includeEquipment] }
			    };

			    const getChangeArmors = function (armorId, operation, operand, variableId, includeEquipment) {
			      return { code: 128, indent: 0, parameters: [armorId, operation, operand, variableId, includeEquipment] }
			    };

			    const getChangePartyMember = function (actorId, operation, initialize) {
			      return { code: 129, indent: 0, parameters: [actorId, operation, initialize] }
			    };

			    const getChangeHp = function (actor, actorValue, operation, operand, operandValue, allowDeath) {
			      return { code: 311, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, allowDeath] }
			    };

			    const getChangeMp = function (actor, actorValue, operation, operand, operandValue) {
			      return { code: 312, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue] }
			    };

			    const getChangeTp = function (actor, actorValue, operation, operand, operandValue) {
			      return { code: 326, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue] }
			    };

			    const getChangeState = function (actor, actorValue, operation, stateId) {
			      return { code: 313, indent: 0, parameters: [actor, actorValue, operation, stateId] }
			    };

			    const getRecoverAll = function (actor, actorValue) {
			      return { code: 314, indent: 0, parameters: [actor, actorValue] }
			    };

			    const getChangeExp = function (actor, actorValue, operation, operand, operandValue, showLevelUp) {
			      return { code: 315, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, showLevelUp] }
			    };

			    const getChangeLevel = function (actor, actorValue, operation, operand, operandValue, showLevelUp) {
			      return { code: 316, indent: 0, parameters: [actor, actorValue, operation, operand, operandValue, showLevelUp] }
			    };

			    const getChangeParameter = function (actor, actorValue, parameter, operation, operand, operandValue) {
			      return { code: 317, indent: 0, parameters: [actor, actorValue, parameter, operation, operand, operandValue] }
			    };

			    const getChangeSkill = function (actor, actorValue, operation, skillId) {
			      return { code: 318, indent: 0, parameters: [actor, actorValue, operation, skillId] }
			    };

			    const getChangeEquipment = function (actorId, equipmentType, equipmentItem) {
			      return { code: 319, indent: 0, parameters: [actorId, equipmentType, equipmentItem] }
			    };

			    const getChangeName = function (actorId, name) {
			      return { code: 320, indent: 0, parameters: [actorId, name] }
			    };

			    const getChangeClass = function (actorId, classId, saveExp) {
			      return { code: 321, indent: 0, parameters: [actorId, classId, saveExp] }
			    };

			    const getChangeNickname = function (actorId, nickname) {
			      return { code: 324, indent: 0, parameters: [actorId, nickname] }
			    };

			    const getChangeProfile = function (actorId, profile) {
			      const replaceProfile = profile.replace('\\n', '\n');
			      return { code: 325, indent: 0, parameters: [actorId, replaceProfile] }
			    };

			    const getTransferPlayer = function (location, mapId, mapX, mapY, direction, fade) {
			      return { code: 201, indent: 0, parameters: [location, mapId, mapX, mapY, direction, fade] }
			    };

			    const getSetVehicleLocation = function (vehicle, location, mapId, mapX, mapY) {
			      return { code: 202, indent: 0, parameters: [vehicle, location, mapId, mapX, mapY] }
			    };

			    const getSetEventLocation = function (event, location, mapX, mapY, direction) {
			      return { code: 203, indent: 0, parameters: [event, location, mapX, mapY, direction] }
			    };

			    const getScrollMap = function (direction, distance, speed, waitForCompletion) {
			      return { code: 204, indent: 0, parameters: [direction, distance, speed, waitForCompletion] }
			    };

			    const getMovementRoute = function (target, repeat, skippable, wait) {
			      return {
			        code: 205,
			        indent: 0,
			        parameters: [target, { list: [{ code: 0 }], repeat, skippable, wait }]
			      }
			    };

			    const getMovementRoute505 = function (parameters) {
			      return { code: 505, indent: 0, parameters: [parameters] }
			    };

			    const getMoveDown = function () {
			      const parameters = { code: 1, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveLeft = function () {
			      const parameters = { code: 2, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveRight = function () {
			      const parameters = { code: 3, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveUp = function () {
			      const parameters = { code: 4, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveLowerLeft = function () {
			      const parameters = { code: 5, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveLowerRight = function () {
			      const parameters = { code: 6, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveUpperLeft = function () {
			      const parameters = { code: 7, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveUpperRight = function () {
			      const parameters = { code: 8, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveAtRandom = function () {
			      const parameters = { code: 9, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveTowardPlayer = function () {
			      const parameters = { code: 10, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveAwayFromPlayer = function () {
			      const parameters = { code: 11, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getOneStepForward = function () {
			      const parameters = { code: 12, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getOneStepBackward = function () {
			      const parameters = { code: 13, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getJump = function (x, y) {
			      const parameters = { code: 14, parameters: [x, y], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMoveWait = function (wait) {
			      const parameters = { code: 15, parameters: [wait], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnDown = function () {
			      const parameters = { code: 16, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnLeft = function () {
			      const parameters = { code: 17, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnRight = function () {
			      const parameters = { code: 18, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnUp = function () {
			      const parameters = { code: 19, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurn90Right = function () {
			      const parameters = { code: 20, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurn90Left = function () {
			      const parameters = { code: 21, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurn180 = function () {
			      const parameters = { code: 22, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurn90RightorLeft = function () {
			      const parameters = { code: 23, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnAtRandom = function () {
			      const parameters = { code: 24, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnTowardPlayer = function () {
			      const parameters = { code: 25, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTurnAwayFromPlayer = function () {
			      const parameters = { code: 26, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getSwitchOn = function (switchId) {
			      const parameters = { code: 27, parameters: [switchId], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getSwitchOff = function (switchId) {
			      const parameters = { code: 28, parameters: [switchId], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getChangeSpeed = function (speed) {
			      const parameters = { code: 29, parameters: [speed], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getChangeFrequency = function (frequency) {
			      const parameters = { code: 30, parameters: [frequency], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getWalkingAnimationOn = function () {
			      const parameters = { code: 31, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getWalkingAnimationOff = function () {
			      const parameters = { code: 32, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getSteppingAnimationOn = function () {
			      const parameters = { code: 33, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getSteppingAnimationOff = function () {
			      const parameters = { code: 34, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getDirectionFixOn = function () {
			      const parameters = { code: 35, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getDirectionFixOff = function () {
			      const parameters = { code: 36, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getThroughOn = function () {
			      const parameters = { code: 37, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getThroughOff = function () {
			      const parameters = { code: 38, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTransparentOn = function () {
			      const parameters = { code: 39, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getTransparentOff = function () {
			      const parameters = { code: 40, indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getChangeImage = function (image, imageId) {
			      const parameters = { code: 41, parameters: [image, imageId], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getChangeOpacity = function (opacity) {
			      const parameters = { code: 42, parameters: [opacity], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getChangeBlendMode = function (blendMode) {
			      const parameters = { code: 43, parameters: [blendMode], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getMcPlaySeEvent = function (name, volume, pitch, pan) {
			      let param_volume = 90;
			      let param_pitch = 100;
			      let param_pan = 0;

			      if (typeof (volume) === 'number') {
			        param_volume = volume;
			      }

			      if (typeof (pitch) === 'number') {
			        param_pitch = pitch;
			      }

			      if (typeof (pan) === 'number') {
			        param_pan = pan;
			      }

			      const parameters = {
			        code: 44,
			        parameters: [{ name, volume: param_volume, pitch: param_pitch, pan: param_pan }],
			        indent: null
			      };

			      return getMovementRoute505(parameters)
			    };

			    const getMoveScript = function (script) {
			      const parameters = { code: 45, parameters: [script], indent: null };
			      return getMovementRoute505(parameters)
			    };

			    const getOnOffVehicle = function () {
			      return { code: 206, indent: 0, parameters: [] }
			    };

			    const getChangeTransparency = function (transparency) {
			      return { code: 211, indent: 0, parameters: [transparency] }
			    };

			    const getChangePlayerFollowers = function (playerFollowers) {
			      return { code: 216, indent: 0, parameters: [playerFollowers] }
			    };

			    const getGatherFollowers = function () {
			      return { code: 217, indent: 0, parameters: [] }
			    };

			    const getShowAnimation = function (character, animationId, waitForCompletion) {
			      return { code: 212, indent: 0, parameters: [character, animationId, waitForCompletion] }
			    };

			    const getShowBalloonIcon = function (character, balloonIcon, waitForCompletion) {
			      return { code: 213, indent: 0, parameters: [character, balloonIcon, waitForCompletion] }
			    };

			    const getEraseEvent = function () {
			      return { code: 214, indent: 0, parameters: [] }
			    };

			    const getTintScreen = function (options = []) {
			      const ps = getDefaultPictureOptions();
			      options.map((x) => Object.assign(ps, getPictureOptions(x)));
			      return { code: 223, indent: 0, parameters: [[ps.red, ps.green, ps.blue, ps.gray], ps.duration, ps.wait] }
			    };

			    const getFlashScreen = function (red, green, blue, intensity, frames, waitForCompletion) {
			      return { code: 224, indent: 0, parameters: [[red, green, blue, intensity], frames, waitForCompletion] }
			    };

			    const getShakeScreen = function (power, speed, frames, waitForCompletion) {
			      return { code: 225, indent: 0, parameters: [power, speed, frames, waitForCompletion] }
			    };

			    const getSetWeatherEffect = function (type, power, frames, waitForCompletion) {
			      return { code: 236, indent: 0, parameters: [type, power, frames, waitForCompletion] }
			    };

			    const getPlayMovie = function (fileName) {
			      return { code: 261, indent: 0, parameters: [fileName] }
			    };

			    const getBattleProcessing = function (troop, troopValue) {
			      return { code: 301, indent: 0, parameters: [troop, troopValue, false, false] }
			    };

			    const getIfWin = function () {
			      return { code: 601, indent: 0, parameters: [] }
			    };

			    const getIfEscape = function () {
			      return { code: 602, indent: 0, parameters: [] }
			    };

			    const getIfLose = function () {
			      return { code: 603, indent: 0, parameters: [] }
			    };

			    const getIfEnd = function () {
			      return { code: 604, indent: 0, parameters: [] }
			    };

			    const getNameInputProcessing = function (actorId, maxCharacter) {
			      return { code: 303, indent: 0, parameters: [actorId, maxCharacter] }
			    };

			    const getShopProcessing = function (purchaseOnly) {
			      return { code: 302, indent: 0, parameters: [0, 0, 0, 0, purchaseOnly] }
			    };

			    const getMerchandise = function (merchandiseType, merchandiseId, price, priceValue) {
			      return { code: 605, indent: 0, parameters: [merchandiseType, merchandiseId, price, priceValue] }
			    };

			    const getOpenMenuScreen = function () {
			      return { code: 351, indent: 0, parameters: [] }
			    };

			    const getOpenSaveScreen = function () {
			      return { code: 352, indent: 0, parameters: [] }
			    };

			    const getGameOver = function () {
			      return { code: 353, indent: 0, parameters: [] }
			    };

			    const getReturnToTitleScreen = function () {
			      return { code: 354, indent: 0, parameters: [] }
			    };

			    const getChangeVictoryMe = function (name, volume, pitch, pan) {
			      return { code: 133, indent: 0, parameters: [{ name, volume, pitch, pan }] }
			    };

			    const getChangeDefeatMe = function (name, volume, pitch, pan) {
			      return { code: 139, indent: 0, parameters: [{ name, volume, pitch, pan }] }
			    };

			    const getChangeVehicleBgm = function (vehicle, name, volume, pitch, pan) {
			      return { code: 140, indent: 0, parameters: [vehicle, { name, volume, pitch, pan }] }
			    };

			    const getChangeSaveAccess = function (save) {
			      return { code: 134, indent: 0, parameters: [save] }
			    };

			    const getChangeMenuAccess = function (menu) {
			      return { code: 135, indent: 0, parameters: [menu] }
			    };

			    const getChangeEncounter = function (encounter) {
			      return { code: 136, indent: 0, parameters: [encounter] }
			    };

			    const getChangeFormationAccess = function (formation) {
			      return { code: 137, indent: 0, parameters: [formation] }
			    };

			    const getChangeWindowColor = function (red, green, blue) {
			      return { code: 138, indent: 0, parameters: [[red, green, blue, 0]] }
			    };

			    const getChangeActorImages = function (actorId, faceName, faceId, characterName, characterId, battlerName) {
			      return {
			        code: 322,
			        indent: 0,
			        parameters: [actorId, faceName, faceId, characterName, characterId, battlerName]
			      }
			    };

			    const getChangeVehicleImage = function (vehicle, vehicleName, vehicleId) {
			      return { code: 323, indent: 0, parameters: [vehicle, vehicleName, vehicleId] }
			    };

			    const getChangeMapNameDisplay = function (mapNameDisplay) {
			      return { code: 281, indent: 0, parameters: [mapNameDisplay] }
			    };

			    const getChangeTileset = function (tilesetId) {
			      return { code: 282, indent: 0, parameters: [tilesetId] }
			    };

			    const getChangeBattleBackGround = function (battleBackGround1, battleBackGround2) {
			      return { code: 283, indent: 0, parameters: [battleBackGround1, battleBackGround2] }
			    };

			    const getChangeParallax = function (
			      image,
			      loopHorizontally,
			      loopVertically,
			      loopHorizontallyScroll,
			      loopVerticallyScroll
			    ) {
			      return {
			        code: 284,
			        indent: 0,
			        parameters: [image, loopHorizontally, loopVertically, loopHorizontallyScroll, loopVerticallyScroll]
			      }
			    };

			    const getGetLocationInfo = function (variableId, infoType, locationType, locationX, locationY) {
			      return {
			        code: 285,
			        indent: 0,
			        parameters: [variableId, infoType, locationType, locationX, locationY]
			      }
			    };

			    const getChangeEnemyHp = function (enemy, operation, operand, operandValue, allowDeath) {
			      return { code: 331, indent: 0, parameters: [enemy, operation, operand, operandValue, allowDeath] }
			    };

			    const getChangeEnemyMp = function (enemy, operation, operand, operandValue) {
			      return { code: 332, indent: 0, parameters: [enemy, operation, operand, operandValue] }
			    };

			    const getChangeEnemyTp = function (enemy, operation, operand, operandValue) {
			      return { code: 342, indent: 0, parameters: [enemy, operation, operand, operandValue] }
			    };

			    const getChangeEnemyState = function (enemy, operation, stateId) {
			      return { code: 333, indent: 0, parameters: [enemy, operation, stateId] }
			    };

			    const getEnemyRecoverAll = function (enemy) {
			      return { code: 334, indent: 0, parameters: [enemy] }
			    };

			    const getEnemyAppear = function (enemy) {
			      return { code: 335, indent: 0, parameters: [enemy] }
			    };

			    const getEnemyTransform = function (enemy, transformToEnemyId) {
			      return { code: 336, indent: 0, parameters: [enemy, transformToEnemyId] }
			    };

			    const getShowBattleAnimation = function (enemyValue, animationId, isAllChecked) {
			      return { code: 337, indent: 0, parameters: [enemyValue, animationId, isAllChecked] }
			    };

			    const getForceAction = function (subject, subjectValue, skillId, target) {
			      return { code: 339, indent: 0, parameters: [subject, subjectValue, skillId, target] }
			    };

			    const getAbortBattle = function () {
			      return { code: 340, indent: 0, parameters: [] }
			    };

			    const completeLackedBottomEvent = function (events) {
			      const BOTTOM_CODE = 0;
			      const IF_CODE = 111;
			      const ELSE_CODE = 411;
			      const LOOP_CODE = 112;

			      const stack = events.reduce((s, e) => {
			        const code = e.code;
			        if (code === IF_CODE) s.push(IF_CODE);
			        else if (code === ELSE_CODE) s.push(ELSE_CODE);
			        else if (code === BOTTOM_CODE) s.pop();
			        return s
			      }, []);

			      const bottom = stack.reduce((b, code) => {
			        b.push(getCommandBottomEvent());
			        if (code === IF_CODE) b.push(getEnd());
			        else if (code === ELSE_CODE) b.push(getEnd());
			        else if (code === LOOP_CODE) b.push(getRepeatAbove());
			        return b
			      }, []);

			      return events.concat(bottom)
			    };

			    const _getEvents = function (text, frame_param, block_stack, block_map) {
			      const face = text.match(/<face *: *(.+?)>/i) || text.match(/<FC *: *(.+?)>/i) || text.match(/<顔 *: *(.+?)>/i);
			      const window_position =
			        text.match(/<windowposition *: *(.+?)>/i) || text.match(/<WP *: *(.+?)>/i) || text.match(/<位置 *: *(.+?)>/i);
			      const background =
			        text.match(/<background *: *(.+?)>/i) || text.match(/<BG *: *(.+?)>/i) || text.match(/<背景 *: *(.+?)>/i);
			      const namebox = text.match(/<name *: ?(.+?)>/i) || text.match(/<NM *: ?(.+?)>/i) || text.match(/<名前 *: ?(.+?)>/i);
			      const plugin_command =
			        text.match(/<plugincommand *: *(.+?)>/i) ||
			        text.match(/<PC *: *(.+?)>/i) ||
			        text.match(/<プラグインコマンド *: *(.+?)>/i);
			      const plugin_command_mz =
			        text.match(/<plugincommandmz\s*:\s*([^\s].*)>/i) ||
			        text.match(/<PCZ\s*:\s*([^\s].*)>/i) ||
			        text.match(/<プラグインコマンドmz\s*:\s*([^\s].*)>/i);
			      const common_event =
			        text.match(/<commonevent *: *(.+?)>/i) ||
			        text.match(/<CE *: *(.+?)>/i) ||
			        text.match(/<コモンイベント *: *(.+?)>/i);
			      const wait = text.match(/<wait *: *(.+?)>/i) || text.match(/<ウェイト *: *(.+?)>/i);
			      const fadein = text.match(/<fadein>/i) || text.match(/<FI>/i) || text.match(/<フェードイン>/i);
			      const fadeout = text.match(/<fadeout>/i) || text.match(/<FO>/i) || text.match(/<フェードアウト>/i);
			      const play_bgm = text.match(/<playbgm *: *([^ ].+)>/i) || text.match(/<BGMの演奏 *: *([^ ].+)>/);
			      const stop_bgm =
			        text.match(/<stopbgm>/i) ||
			        text.match(/<playbgm *: *none>/i) ||
			        text.match(/<playbgm *: *なし>/i) ||
			        text.match(/<BGMの停止>/);
			      const fadeout_bgm = text.match(/<fadeoutbgm *: *(.+?)>/i) || text.match(/<BGMのフェードアウト *: *(.+?)>/);
			      const save_bgm = text.match(/<savebgm>/i) || text.match(/<BGMの保存>/);
			      const replay_bgm = text.match(/<replaybgm>/i) || text.match(/<BGMの再開>/);
			      const change_battle_bgm =
			        text.match(/<changebattlebgm *: *([^ ].+)>/i) || text.match(/<戦闘曲の変更 *: *([^ ].+)>/);
			      const play_bgs = text.match(/<playbgs *: *([^ ].+)>/i) || text.match(/<BGSの演奏 *: *([^ ].+)>/);
			      const stop_bgs =
			        text.match(/<stopbgs>/i) ||
			        text.match(/<playbgs *: *none>/i) ||
			        text.match(/<playbgs *: *なし>/i) ||
			        text.match(/<BGSの停止>/);
			      const fadeout_bgs = text.match(/<fadeoutbgs *: *(.+?)>/i) || text.match(/<BGSのフェードアウト *: *(.+?)>/);
			      const play_se = text.match(/<playse *: *([^ ].+)>/i) || text.match(/<SEの演奏 *: *([^ ].+)>/);
			      const stop_se = text.match(/<stopse>/i) || text.match(/<SEの停止>/);
			      const play_me = text.match(/<playme *: *([^ ].+)>/i) || text.match(/<MEの演奏 *: *([^ ].+)>/);
			      const stop_me =
			        text.match(/<stopme>/i) ||
			        text.match(/<playme *: *none>/i) ||
			        text.match(/<playme *: *なし>/i) ||
			        text.match(/<MEの停止>/);
			      const show_picture =
			        text.match(/<showpicture\s*:\s*([^\s].*)>/i) ||
			        text.match(/<ピクチャの表示\s*:\s*([^\s].+)>/i) ||
			        text.match(/<SP\s*:\s*([^\s].+)>/i);
			      const move_picture =
			        text.match(/<movepicture\s*:\s*([^\s].*)>/i) ||
			        text.match(/<ピクチャの移動\s*:\s*([^\s].*)>/i) ||
			        text.match(/<MP\s*:\s*([^\s].*)>/i);
			      const rotate_picture =
			        text.match(/<rotatepicture\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) ||
			        text.match(/<ピクチャの回転\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i) ||
			        text.match(/<RP\s*:\s*(\d{1,2})\s*,\s*(-?\d{1,2})\s*>/i);
			      const tint_picture =
			        text.match(/<tintpicture\s*:\s*([^\s].*)>/i) ||
			        text.match(/<ピクチャの色調変更\s*:\s*([^\s].*)>/i) ||
			        text.match(/<TP\s*:\s*([^\s].*)>/i);
			      const erase_picture =
			        text.match(/<erasepicture\s*:\s*(\d{1,2})\s*>/i) ||
			        text.match(/<ピクチャの消去\s*:\s*(\d{1,2})\s*>/i) ||
			        text.match(/<ep\s*:\s*(\d{1,2})\s*>/i);
			      const conditional_branch_if =
			        text.match(/\s*<if\s*:\s*([^\s].*)>/i) || text.match(/\s*<条件分岐\s*:\s*([^\s].*)>/i);
			      const conditional_branch_else = text.match(/\s*<else>/i) || text.match(/\s*<それ以外のとき>/);
			      const conditional_branch_end = text.match(/\s*<end>/i) || text.match(/\s*<分岐終了>/);
			      const loop = text.match(/\s*<loop>/i) || text.match(/\s*<ループ>/);
			      const repeat_above = text.match(/<repeatabove>/i) || text.match(/\s*<以上繰り返し>/) || text.match(/\s*<ra>/i);
			      const break_loop = text.match(/<breakloop>/i) || text.match(/<ループの中断>/) || text.match(/<BL>/i);
			      const skip_branch_end = text.match(/<skipend>/i) || text.match(/<スキップ終了>/);
			      const skip_branch = text.match(/\s*<skip>/i) || text.match(/\s*<スキップ>/);
			      const exit_event_processing =
			        text.match(/<ExitEventProcessing>/i) || text.match(/<イベント処理の中断>/) || text.match(/<EEP>/i);
			      const label = text.match(/<label\s*:\s*(\S+)\s*>/i) || text.match(/<ラベル\s*:\s*(\S+)\s*>/i);
			      const jump_to_label =
			        text.match(/<jumptolabel\s*:\s*(\S+)\s*>/i) ||
			        text.match(/<ラベルジャンプ\s*:\s*(\S+)\s*>/) ||
			        text.match(/<jtl\s*:\s*(\S+)\s*>/i);
			      const input_number =
			        text.match(/<InputNumber\s*:\s*(\d+),\s*(\d+)>/i) ||
			        text.match(/<INN\s*:\s*(\d+),\s*(\d+)>/i) ||
			        text.match(/<数値入力の処理\s*:\s*(\d+),\s*(\d+)>/i);
			      const select_item =
			        text.match(/<SelectItem\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) ||
			        text.match(/<SI\s*:\s*(\d+),\s*([\s\S]+)\s*>/i) ||
			        text.match(/<アイテム選択の処理\s*:\s*(\d+),\s*([\s\S]+)\s*>/i);
			      const show_choices =
			        text.match(/<ShowChoices\s*:*\s*([\s\S]*)>/i) ||
			        text.match(/<SHC\s*:*\s*([\s\S]*)>/i) ||
			        text.match(/<選択肢の表示\s*:*\s*([\s\S]*)>/i);
			      const show_choice_when = text.match(/<When\s*:\s*([\s\S]+)>/i) || text.match(/<選択肢\s*:\s*([\s\S]+)>/i);
			      const show_choice_when_cancel = text.match(/<WhenCancel>/i) || text.match(/<キャンセルのとき>/i);
			      // イベントコマンド追加
			      const change_gold = text.match(/<ChangeGold\s*:\s*([^\s].*)>/i) || text.match(/<所持金の増減\s*:\s*([^\s].*)>/i);
			      const change_items =
			        text.match(/<ChangeItems\s*:\s*([^\s].*)>/i) || text.match(/<アイテムの増減\s*:\s*([^\s].*)>/i);
			      const change_weapons =
			        text.match(/<ChangeWeapons\s*:\s*([^\s].*)>/i) || text.match(/<武器の増減\s*:\s*([^\s].*)>/i);
			      const change_armors = text.match(/<ChangeArmors\s*:\s*([^\s].*)>/i) || text.match(/<防具の増減\s*:\s*([^\s].*)>/i);
			      const change_party_member =
			        text.match(/<ChangePartyMember\s*:\s*([^\s].*)>/i) || text.match(/<メンバーの入れ替え\s*:\s*([^\s].*)>/i);
			      const change_hp = text.match(/<ChangeHp\s*:\s*([^\s].*)>/i) || text.match(/<HPの増減\s*:\s*([^\s].*)>/i);
			      const change_mp = text.match(/<ChangeMp\s*:\s*([^\s].*)>/i) || text.match(/<MPの増減\s*:\s*([^\s].*)>/i);
			      const change_tp = text.match(/<ChangeTp\s*:\s*([^\s].*)>/i) || text.match(/<TPの増減\s*:\s*([^\s].*)>/i);
			      const change_state =
			        text.match(/<ChangeState\s*:\s*([^\s].*)>/i) || text.match(/<ステートの変更\s*:\s*([^\s].*)>/i);
			      const recover_all = text.match(/<RecoverAll\s*:\s*([^\s].*)>/i) || text.match(/<全回復\s*:\s*([^\s].*)>/i);
			      const change_exp = text.match(/<ChangeExp\s*:\s*([^\s].*)>/i) || text.match(/<経験値の増減\s*:\s*([^\s].*)>/i);
			      const change_level = text.match(/<ChangeLevel\s*:\s*([^\s].*)>/i) || text.match(/<レベルの増減\s*:\s*([^\s].*)>/i);
			      const change_parameter =
			        text.match(/<ChangeParameter\s*:\s*([^\s].*)>/i) || text.match(/<能力値の増減\s*:\s*([^\s].*)>/i);
			      const change_skill = text.match(/<ChangeSkill\s*:\s*([^\s].*)>/i) || text.match(/<スキルの増減\s*:\s*([^\s].*)>/i);
			      const change_equipment =
			        text.match(/<ChangeEquipment\s*:\s*([^\s].*)>/i) || text.match(/<装備の変更\s*:\s*([^\s].*)>/i);
			      const change_name = text.match(/<ChangeName\s*:\s*([^\s].*)>/i) || text.match(/<名前の変更\s*:\s*([^\s].*)>/i);
			      const change_class = text.match(/<ChangeClass\s*:\s*([^\s].*)>/i) || text.match(/<職業の変更\s*:\s*([^\s].*)>/i);
			      const change_nickname =
			        text.match(/<ChangeNickname\s*:\s*([^\s].*)>/i) || text.match(/<二つ名の変更\s*:\s*([^\s].*)>/i);
			      const change_profile =
			        text.match(/<ChangeProfile\s*:\s*([^\s].*)>/i) || text.match(/<プロフィールの変更\s*:\s*([^\s].*)>/i);
			      const transfer_player =
			        text.match(/<TransferPlayer\s*:\s*([^\s].*)>/i) || text.match(/<場所移動\s*:\s*([^\s].*)>/i);
			      const set_vehicle_location =
			        text.match(/<SetVehicleLocation\s*:\s*([^\s].*)>/i) || text.match(/<乗り物の位置設定\s*:\s*([^\s].*)>/i);
			      const set_event_location =
			        text.match(/<SetEventLocation\s*:\s*([^\s].*)>/i) || text.match(/<イベントの位置設定\s*:\s*([^\s].*)>/i);
			      const scroll_map =
			        text.match(/<ScrollMap\s*:\s*([^\s].*)>/i) || text.match(/<マップのスクロール\s*:\s*([^\s].*)>/i);
			      const set_movement_route =
			        text.match(/<SetMovementRoute\s*:\s*([^\s].*)>/i) || text.match(/<移動ルートの設定\s*:\s*([^\s].*)>/i);
			      const move_down = text.match(/<MoveDown>/i) || text.match(/<下に移動>/);
			      const move_left = text.match(/<MoveLeft>/i) || text.match(/<左に移動>/);
			      const move_right = text.match(/<MoveRight>/i) || text.match(/<右に移動>/);
			      const move_up = text.match(/<MoveUp>/i) || text.match(/<上に移動>/);
			      const move_lower_left = text.match(/<MoveLowerLeft>/i) || text.match(/<左下に移動>/);
			      const move_lower_right = text.match(/<MoveLowerRight>/i) || text.match(/<右下に移動>/);
			      const move_upper_left = text.match(/<MoveUpperLeft>/i) || text.match(/<左上に移動>/);
			      const move_upper_right = text.match(/<MoveUpperRight>/i) || text.match(/<右上に移動>/);
			      const move_at_random = text.match(/<MoveAtRandom>/i) || text.match(/<ランダムに移動>/);
			      const move_toward_player = text.match(/<MoveTowardPlayer>/i) || text.match(/<プレイヤーに近づく>/);
			      const move_away_from_player = text.match(/<MoveAwayFromPlayer>/i) || text.match(/<プレイヤーから遠ざかる>/);
			      const one_step_forward = text.match(/<OneStepForward>/i) || text.match(/<一歩前進>/);
			      const one_step_backward = text.match(/<OneStepBackward>/i) || text.match(/<一歩後退>/);
			      const jump = text.match(/<Jump\s*:\s*([^\s].*)>/i) || text.match(/<ジャンプ\s*:\s*([^\s].*)>/i);
			      const mc_wait = text.match(/<McWait\s*:\s*([^\s].*)>/i) || text.match(/<移動コマンドウェイト\s*:\s*([^\s].*)>/i);
			      const turn_down = text.match(/<TurnDown>/i) || text.match(/<下を向く>/);
			      const turn_left = text.match(/<TurnLeft>/i) || text.match(/<左を向く>/);
			      const turn_right = text.match(/<TurnRight>/i) || text.match(/<右を向く>/);
			      const turn_up = text.match(/<TurnUp>/i) || text.match(/<上を向く>/);
			      const turn_90_right = text.match(/<Turn90Right>/i) || text.match(/<右に90度回転>/);
			      const turn_90_left = text.match(/<Turn90Left>/i) || text.match(/<左に90度回転>/);
			      const turn_180 = text.match(/<Turn180>/i) || text.match(/<180度回転>/);
			      const turn_90_right_or_left = text.match(/<Turn90RightorLeft>/i) || text.match(/<右か左に90度回転>/);
			      const turn_at_random = text.match(/<TurnAtRandom>/i) || text.match(/<ランダムに方向転換>/);
			      const turn_toward_Player = text.match(/<TurnTowardPlayer>/i) || text.match(/<プレイヤーの方を向く>/);
			      const turn_away_from_player = text.match(/<TurnAwayFromPlayer>/i) || text.match(/<プレイヤーの逆を向く>/);
			      const switch_on = text.match(/<SwitchOn\s*:\s*([^\s].*)>/i) || text.match(/<スイッチON\s*:\s*([^\s].*)>/i);
			      const switch_off = text.match(/<SwitchOff\s*:\s*([^\s].*)>/i) || text.match(/<スイッチOFF\s*:\s*([^\s].*)>/i);
			      const change_speed =
			        text.match(/<ChangeSpeed\s*:\s*([^\s].*)>/i) || text.match(/<移動速度の変更\s*:\s*([^\s].*)>/i);
			      const change_frequency =
			        text.match(/<ChangeFrequency\s*:\s*([^\s].*)>/i) || text.match(/<移動頻度の変更\s*:\s*([^\s].*)>/i);
			      const walking_animation_on = text.match(/<WalkingAnimationOn>/i) || text.match(/<歩行アニメON>/);
			      const walking_animation_off = text.match(/<WalkingAnimationOff>/i) || text.match(/<歩行アニメOFF>/);
			      const stepping_animation_on = text.match(/<SteppingAnimationOn>/i) || text.match(/<足踏みアニメON>/);
			      const stepping_animation_off = text.match(/<SteppingAnimationOff>/i) || text.match(/<足踏みアニメOFF>/);
			      const direction_fix_on = text.match(/<DirectionFixOn>/i) || text.match(/<向き固定ON>/);
			      const direction_fix_off = text.match(/<DirectionFixOff>/i) || text.match(/<向き固定OFF>/);
			      const through_On = text.match(/<ThroughOn>/i) || text.match(/<すり抜けON>/);
			      const through_Off = text.match(/<ThroughOff>/i) || text.match(/<すり抜けOFF>/);
			      const transparent_on = text.match(/<TransparentOn>/i) || text.match(/<透明化ON>/);
			      const transparent_off = text.match(/<TransparentOff>/i) || text.match(/<透明化OFF>/);
			      const change_image = text.match(/<ChangeImage\s*:\s*([^\s].*)>/i) || text.match(/<画像の変更\s*:\s*([^\s].*)>/i);
			      const change_opacity =
			        text.match(/<ChangeOpacity\s*:\s*([^\s].*)>/i) || text.match(/<不透明度の変更\s*:\s*([^\s].*)>/i);
			      const change_blend_mode =
			        text.match(/<ChangeBlendMode\s*:\s*([^\s].*)>/i) || text.match(/<合成方法の変更\s*:\s*([^\s].*)>/i);
			      const mc_play_se = text.match(/<McPlaySe *: *([^ ].+)>/i) || text.match(/<移動コマンドSEの演奏 *: *([^ ].+)>/);
			      const mc_script = text.match(/<McScript\s*:\s*([^\s].*)>/i) || text.match(/<移動コマンドスクリプト\s*:\s*([^\s].*)>/i);
			      const get_on_off_vehicle = text.match(/<GetOnOffVehicle>/i) || text.match(/<乗り物の乗降>/);
			      const change_transparency =
			        text.match(/<ChangeTransparency\s*:\s*([^\s].*)>/i) || text.match(/<透明状態の変更\s*:\s*([^\s].*)>/i);
			      const change_player_followers =
			        text.match(/<ChangePlayerFollowers\s*:\s*([^\s].*)>/i) || text.match(/<隊列歩行の変更\s*:\s*([^\s].*)>/i);
			      const gather_followers = text.match(/<GatherFollowers>/i) || text.match(/<隊列メンバーの集合>/);
			      const show_animation =
			        text.match(/<ShowAnimation\s*:\s*([^\s].*)>/i) || text.match(/<アニメーションの表示\s*:\s*([^\s].*)>/i);
			      const show_balloon_icon =
			        text.match(/<ShowBalloonIcon\s*:\s*([^\s].*)>/i) || text.match(/<フキダシアイコンの表示\s*:\s*([^\s].*)>/i);
			      const erase_event = text.match(/<EraseEvent>/i) || text.match(/<イベントの一時消去>/);
			      const tint_screen = text.match(/<TintScreen\s*:?\s*([^\s]*.*)>/i) || text.match(/<画面の色調変更\s*:?\s*([^\s]*.*)>/i);
			      const flash_screen =
			        text.match(/<FlashScreen\s*:\s*([^\s].*)>/i) || text.match(/<画面のフラッシュ\s*:\s*([^\s].*)>/i);
			      const shake_screen =
			        text.match(/<ShakeScreen\s*:\s*([^\s].*)>/i) || text.match(/<画面のシェイク\s*:\s*([^\s].*)>/i);
			      const set_weather_effect =
			        text.match(/<SetWeatherEffect\s*:\s*([^\s].*)>/i) || text.match(/<天候の設定\s*:\s*([^\s].*)>/i);
			      const play_movie = text.match(/<PlayMovie\s*:\s*([^\s].*)>/i) || text.match(/<ムービーの再生\s*:\s*([^\s].*)>/i);
			      const battle_processing =
			        text.match(/<BattleProcessing\s*:\s*([^\s].*)>/i) || text.match(/<戦闘の処理\s*:\s*([^\s].*)>/i);
			      const shop_processing =
			        text.match(/<ShopProcessing\s*:*\s*([\s\S]*)>/i) || text.match(/<ショップの処理\s*:\s*([^\s].*)>/i);
			      const merchandise =
			        text.match(/<Merchandise\s*:\s*([^\s].*)>/i) ||
			        text.match(/<商品\s*:\s*([^\s].*)>/i);
			      const if_win = text.match(/\s*<IfWin>/i) || text.match(/\s*<勝ったとき>/);
			      const if_escape = text.match(/\s*<IfEscape>/i) || text.match(/\s*<逃げたとき>/);
			      const if_lose = text.match(/\s*<IfLose>/i) || text.match(/\s*<負けたとき>/);
			      const name_input_processing =
			        text.match(/<NameInputProcessing\s*:\s*([^\s].*)>/i) || text.match(/<名前入力の処理\s*:\s*([^\s].*)>/i);
			      const open_menu_screen = text.match(/<OpenMenuScreen>/i) || text.match(/<メニュー画面を開く>/);
			      const open_save_screen = text.match(/<OpenSaveScreen>/i) || text.match(/<セーブ画面を開く>/);
			      const game_over = text.match(/<GameOver>/i) || text.match(/<ゲームオーバー>/);
			      const return_to_title_screen = text.match(/<ReturnToTitleScreen>/i) || text.match(/<タイトル画面に戻す>/);
			      const change_victory_me =
			        text.match(/<ChangeVictoryMe\s*:\s*([^\s].*)>/i) || text.match(/<勝利MEの変更\s*:\s*([^\s].*)>/i);
			      const change_defeat_me =
			        text.match(/<ChangeDefeatMe\s*:\s*([^\s].*)>/i) || text.match(/<敗北MEの変更\s*:\s*([^\s].*)>/i);
			      const change_vehicle_bgm =
			        text.match(/<ChangeVehicleBgm\s*:\s*([^\s].*)>/i) || text.match(/<乗り物BGMの変更\s*:\s*([^\s].*)>/i);
			      const change_save_access =
			        text.match(/<ChangeSaveAccess\s*:\s*([^\s].*)>/i) || text.match(/<セーブ禁止の変更\s*:\s*([^\s].*)>/i);
			      const change_menu_access =
			        text.match(/<ChangeMenuAccess\s*:\s*([^\s].*)>/i) || text.match(/<メニュー禁止の変更\s*:\s*([^\s].*)>/i);
			      const change_encounter =
			        text.match(/<ChangeEncounter\s*:\s*([^\s].*)>/i) || text.match(/<エンカウント禁止の変更\s*:\s*([^\s].*)>/i);
			      const change_formation_access =
			        text.match(/<ChangeFormationAccess\s*:\s*([^\s].*)>/i) || text.match(/<並び変え禁止の変更\s*:\s*([^\s].*)>/i);
			      const change_window_color =
			        text.match(/<ChangeWindowColor\s*:\s*([^\s].*)>/i) || text.match(/<ウィンドウカラーの変更\s*:\s*([^\s].*)>/i);
			      const change_actor_images =
			        text.match(/<ChangeActorImages\s*:\s*([^\s].*)>/i) || text.match(/<アクターの画像変更\s*:\s*([^\s].*)>/i);
			      const change_vehicle_image =
			        text.match(/<ChangeVehicleImage\s*:\s*([^\s].*)>/i) || text.match(/<乗り物の画像変更\s*:\s*([^\s].*)>/i);
			      const change_map_name_display =
			        text.match(/<ChangeMapNameDisplay\s*:\s*([^\s].*)>/i) || text.match(/<マップ名表示の変更\s*:\s*([^\s].*)>/i);
			      const change_tileset =
			        text.match(/<ChangeTileset\s*:\s*([^\s].*)>/i) || text.match(/<タイルセットの変更\s*:\s*([^\s].*)>/i);
			      const change_battle_background =
			        text.match(/<ChangeBattleBackGround\s*:\s*([^\s].*)>/i) || text.match(/<戦闘背景の変更\s*:\s*([^\s].*)>/i);
			      const change_parallax =
			        text.match(/<ChangeParallax\s*:\s*([^\s].*)>/i) || text.match(/<遠景の変更\s*:\s*([^\s].*)>/i);
			      const get_location_info =
			        text.match(/<GetLocationInfo\s*:\s*([^\s].*)>/i) || text.match(/<指定位置の情報取得\s*:\s*([^\s].*)>/i);
			      const change_enemy_hp =
			        text.match(/<ChangeEnemyHp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのHP増減\s*:\s*([^\s].*)>/i);
			      const change_enemy_mp =
			        text.match(/<ChangeEnemyMp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのMP増減\s*:\s*([^\s].*)>/i);
			      const change_enemy_tp =
			        text.match(/<ChangeEnemyTp\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのTP増減\s*:\s*([^\s].*)>/i);
			      const change_enemy_state =
			        text.match(/<ChangeEnemyState\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラのステート変更\s*:\s*([^\s].*)>/i);
			      const enemy_recover_all =
			        text.match(/<EnemyRecoverAll\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの全回復\s*:\s*([^\s].*)>/i);
			      const enemy_appear =
			        text.match(/<EnemyAppear\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの出現\s*:\s*([^\s].*)>/i);
			      const enemy_transform =
			        text.match(/<EnemyTransform\s*:\s*([^\s].*)>/i) || text.match(/<敵キャラの変身\s*:\s*([^\s].*)>/i);
			      const show_battle_animation =
			        text.match(/<ShowBattleAnimation\s*:\s*([^\s].*)>/i) ||
			        text.match(/<戦闘アニメーションの表示\s*:\s*([^\s].*)>/i);
			      const force_action =
			        text.match(/<ForceAction\s*:\s*([^\s].*)>/i) || text.match(/<戦闘行動の強制\s*:\s*([^\s].*)>/i);
			      const abort_battle = text.match(/<AbortBattle>/i) || text.match(/<バトルの中断>/);

			      const script_block = text.match(/#SCRIPT_BLOCK[0-9]+#/i);
			      const comment_block = text.match(/#COMMENT_BLOCK[0-9]+#/i);
			      const scrolling_block = text.match(/#SCROLLING_BLOCK[0-9]+#/i);

			      // Script Block
			      if (script_block) {
			        const block_tag = script_block[0];
			        return block_map[block_tag]
			      }

			      // Comment Block
			      if (comment_block) {
			        const block_tag = comment_block[0];
			        return block_map[block_tag]
			      }

			      // Scrolling Block
			      if (scrolling_block) {
			        const block_tag = scrolling_block[0];
			        return block_map[block_tag]
			      }

			      // Plugin Command
			      if (plugin_command) {
			        return [getPluginCommandEvent(plugin_command[1])]
			      }

			      // Plugin Command MZ
			      if (plugin_command_mz) {
			        const params = parseMzArg(plugin_command_mz[1]);
			        const event_command_list = [];
			        if (params.length > 2) {
			          const arg_plugin_name = params[0];
			          const arg_plugin_command = params[1];
			          const arg_disp_plugin_command = params[2];
			          const pcz_args = params.slice(3);
			          const pcemz = getPluginCommandEventMZ(
			            arg_plugin_name,
			            arg_plugin_command,
			            arg_disp_plugin_command,
			            pcz_args
			          );
			          event_command_list.push(pcemz);
			          pcz_args.map(arg => event_command_list.push(getPluginCommandMzParamsComment(arg)));
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。' +
			                          text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			        return event_command_list
			      }

			      // Common Event
			      if (common_event) {
			        const event_num = Number(common_event[1]);
			        if (event_num) {
			          return [getCommonEventEvent(event_num)]
			        } else {
			          throw new Error(
			            'Syntax error. / 文法エラーです。' +
			              common_event[1] +
			              ' is not number. / ' +
			              common_event[1] +
			              'は整数ではありません'
			          )
			        }
			      }

			      // Wait
			      if (wait) {
			        const wait_num = Number(wait[1]);
			        if (wait_num) {
			          return [getWaitEvent(wait_num)]
			        } else {
			          throw new Error(
			            'Syntax error. / 文法エラーです。' +
			              common_event[1] +
			              ' is not number. / ' +
			              common_event[1] +
			              'は整数ではありません'
			          )
			        }
			      }

			      // Fadein
			      if (fadein) {
			        return [getFadeinEvent()]
			      }

			      // Fadeout
			      if (fadeout) {
			        return [getFadeoutEvent()]
			      }

			      // Stop BGM
			      if (stop_bgm) {
			        return [getStopBgmEvent(90, 100, 0)]
			      }

			      // Play BGM
			      if (play_bgm) {
			        if (play_bgm[1]) {
			          const params = play_bgm[1].replace(/ /g, '').split(',');
			          let name = 'Battle1';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getPlayBgmEvent('', volume, pitch, pan)]
			          } else {
			            return [getPlayBgmEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      // Fadeout BGM
			      if (fadeout_bgm) {
			        if (fadeout_bgm[1]) {
			          let duration = 10;
			          const d = fadeout_bgm[1].replace(/ /g, '');
			          if (Number(d) || Number(d) === 0) {
			            duration = Number(d);
			          }
			          return [getFadeoutBgmEvent(duration)]
			        }
			      }

			      // Save BGM
			      if (save_bgm) {
			        return [getSaveBgmEvent()]
			      }

			      // Replay BGM
			      if (replay_bgm) {
			        return [getReplayBgmEvent()]
			      }

			      // Change Battle BGM
			      if (change_battle_bgm) {
			        if (change_battle_bgm[1]) {
			          const params = change_battle_bgm[1].replace(/ /g, '').split(',');
			          let name = 'Battle1';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getChangeBattleBgmEvent('', volume, pitch, pan)]
			          } else {
			            return [getChangeBattleBgmEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      // Stop BGS
			      if (stop_bgs) {
			        return [getStopBgsEvent(90, 100, 0)]
			      }

			      // Play BGS
			      if (play_bgs) {
			        if (play_bgs[1]) {
			          const params = play_bgs[1].replace(/ /g, '').split(',');
			          let name = 'City';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getPlayBgsEvent('', volume, pitch, pan)]
			          } else {
			            return [getPlayBgsEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      // Fadeout BGS
			      if (fadeout_bgs) {
			        if (fadeout_bgs[1]) {
			          let duration = 10;
			          const d = fadeout_bgs[1].replace(/ /g, '');
			          if (Number(d) || Number(d) === 0) {
			            duration = Number(d);
			          }
			          return [getFadeoutBgsEvent(duration)]
			        }
			      }

			      // Play SE
			      if (play_se) {
			        if (play_se[1]) {
			          const params = play_se[1].replace(/ /g, '').split(',');
			          let name = 'Attack1';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getPlaySeEvent('', volume, pitch, pan)]
			          } else {
			            return [getPlaySeEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      // Stop SE
			      if (stop_se) {
			        return [getStopSeEvent()]
			      }

			      // Stop ME
			      if (stop_me) {
			        return [getStopMeEvent(90, 100, 0)]
			      }

			      // Play ME
			      if (play_me) {
			        if (play_me[1]) {
			          const params = play_me[1].replace(/ /g, '').split(',');
			          let name = 'Curse1';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getPlayMeEvent('', volume, pitch, pan)]
			          } else {
			            return [getPlayMeEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      /* eslint-disable no-useless-escape */
			      const num_char_regex = '\\w\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf';
			      // const control_variable_arg_regex = `[${num_char_regex}\\[\\]\\.\\-]+`;
			      const control_variable_arg_regex = '.+';
			      const set_operation_list = ['set', '代入', '='];
			      const set_reg_list = set_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const set = text.match(new RegExp(set_reg_list.join('|'), 'i'));

			      const add_operation_list = ['add', '加算', '\\+'];
			      const add_reg_list = add_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const add = text.match(new RegExp(add_reg_list.join('|'), 'i'));

			      const sub_operation_list = ['sub', '減算', '-'];
			      const sub_reg_list = sub_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const sub = text.match(new RegExp(sub_reg_list.join('|'), 'i'));

			      const mul_operation_list = ['mul', '乗算', '\\*'];
			      const mul_reg_list = mul_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const mul = text.match(new RegExp(mul_reg_list.join('|'), 'i'));

			      const div_operation_list = ['div', '除算', '\\/'];
			      const div_reg_list = div_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const div = text.match(new RegExp(div_reg_list.join('|'), 'i'));

			      const mod_operation_list = ['mod', '剰余', '\\%'];
			      const mod_reg_list = mod_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const mod = text.match(new RegExp(mod_reg_list.join('|'), 'i'));

			      const switch_operation_list = ['sw', 'switch', 'スイッチ'];
			      const switch_reg_list = switch_operation_list.map(
			        (x) => `<${x} *: *(\\d+\\-?\\d*) *, *(${control_variable_arg_regex}) *>`
			      );
			      const switch_tag = text.match(new RegExp(switch_reg_list.join('|'), 'i'));

			      const self_switch_operation_list = ['ssw', 'selfswitch', 'セルフスイッチ'];
			      const self_switch_reg_list = self_switch_operation_list.map(
			        (x) => `<${x} *: *([abcd]) *, *(${control_variable_arg_regex}) *>`
			      );
			      const self_switch_tag = text.match(new RegExp(self_switch_reg_list.join('|'), 'i'));
			      /* eslint-enable */

			      const getControlTag = function (operator, operand1, operand2) {
			        if (operator === 'selfswitch') {
			          const selfswitch_target = operand1.match(/[abcd]/i);
			          const selfswitch_value = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
			          if (selfswitch_target && selfswitch_value) {
			            return getControlSelfSwitch(selfswitch_target[0], selfswitch_value[0])
			          }
			        }

			        const operand1_num = operand1.match(/\d+/i);
			        const operand1_range = operand1.match(/(\d+)-(\d+)/i);
			        let start_pointer = 0;
			        let end_pointer = 0;
			        if (operand1_range) {
			          start_pointer = parseInt(operand1_range[1]);
			          end_pointer = parseInt(operand1_range[2]);
			        } else if (operand1_num) {
			          const num = parseInt(operand1_num[0]);
			          start_pointer = num;
			          end_pointer = num;
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。')
			        }

			        if (operator === 'switch') {
			          const switch_tag = operand2.match(/on|オン|1|true|off|オフ|0|false/i);
			          if (switch_tag) {
			            return getControlSwitch(start_pointer, end_pointer, switch_tag[0])
			          }
			        }

			        const variables = operand2.match(/v\[(\d+)\]|variables\[(\d+)\]|変数\[(\d+)\]/i);
			        if (variables) {
			          const num = variables[1] || variables[2] || variables[3];
			          return getControlValiable(operator, start_pointer, end_pointer, 'variables', parseInt(num))
			        }
			        /* eslint-disable no-useless-escape */
			        const random = operand2.match(
			          /r\[(\-?\d+)\]\[(\-?\d+)\]|random\[(\-?\d+)\]\[(\-?\d+)\]|乱数\[(\-?\d+)\]\[(\-?\d+)\]/i
			        );
			        /* eslint-enable no-useless-escape */
			        if (random) {
			          const random_range1 = random[1] || random[3] || random[5];
			          const random_range2 = random[2] || random[4] || random[6];
			          return getControlValiable(
			            operator,
			            start_pointer,
			            end_pointer,
			            'random',
			            parseInt(random_range1),
			            parseInt(random_range2)
			          )
			        }
			        const gamedata_operation_list = ['gd', 'gamedata', 'ゲームデータ'];
			        const gamedata_reg_list = gamedata_operation_list.map((x) => `(${x})(${control_variable_arg_regex})`);
			        const gamedata = operand2.match(new RegExp(gamedata_reg_list.join('|'), 'i'));
			        if (gamedata) {
			          const func = gamedata[2] || gamedata[4] || gamedata[6];
			          const gamedata_key_match = func.match(new RegExp(`\\[([${num_char_regex}]+)\\]`, 'i'));
			          if (gamedata_key_match) {
			            const gamedata_key = gamedata_key_match[1];
			            switch (gamedata_key.toLowerCase()) {
			              case 'mapid':
			              case 'マップid':
			              case 'partymembers':
			              case 'パーティ人数':
			              case 'gold':
			              case '所持金':
			              case 'steps':
			              case '歩数':
			              case 'playtime':
			              case 'プレイ時間':
			              case 'timer':
			              case 'タイマー':
			              case 'savecount':
			              case 'セーブ回数':
			              case 'battlecount':
			              case '戦闘回数':
			              case 'wincount':
			              case '勝利回数':
			              case 'escapecount':
			              case '逃走回数': {
			                return getControlValiable(
			                  operator,
			                  start_pointer,
			                  end_pointer,
			                  'gamedata',
			                  'other',
			                  gamedata_key.toLowerCase(),
			                  0
			                )
			              }

			              case 'item':
			              case 'アイテム':
			              case 'weapon':
			              case '武器':
			              case 'armor':
			              case '防具':
			              case 'party':
			              case 'パーティ': {
			                const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex}]+)\\]`, 'i'));
			                if (args) {
			                  const arg1 = args[1];
			                  return getControlValiable(
			                    operator,
			                    start_pointer,
			                    end_pointer,
			                    'gamedata',
			                    gamedata_key.toLowerCase(),
			                    parseInt(arg1)
			                  )
			                }
			                break
			              }
			              case 'last':
			              case '直前': {
			                const args = func.match(new RegExp(`\\[[${num_char_regex}]+\\]\\[([${num_char_regex} ]+)\\]`, 'i'));
			                if (args) {
			                  const arg1 = args[1];
			                  return getControlValiable(
			                    operator,
			                    start_pointer,
			                    end_pointer,
			                    'gamedata',
			                    gamedata_key.toLowerCase(),
			                    arg1
			                  )
			                }
			                break
			              }
			              case 'actor':
			              case 'アクター':
			              case 'enemy':
			              case '敵キャラ':
			              case 'エネミー':
			              case 'character':
			              case 'キャラクター': {
			                const args = func.match(
			                  new RegExp(
			                    `\\[[${num_char_regex}]+\\]\\[([${num_char_regex}\\-]+)\\]\\[([${num_char_regex}\\.]+)\\]`,
			                    'i'
			                  )
			                );
			                if (args) {
			                  const arg1 = args[1];
			                  const arg2 = args[2];
			                  return getControlValiable(
			                    operator,
			                    start_pointer,
			                    end_pointer,
			                    'gamedata',
			                    gamedata_key.toLowerCase(),
			                    arg1,
			                    arg2
			                  )
			                }
			                break
			              }
			            }
			          }
			        }
			        const script = operand2.match(/sc\[(.+)\]|script\[(.+)\]|スクリプト\[(.+)\]/i);
			        if (script) {
			          const script_body = script[1] || script[2] || script[3];
			          return getControlValiable(operator, start_pointer, end_pointer, 'script', script_body)
			        }
			        const value_num = Number(operand2);
			        return getControlValiable(operator, start_pointer, end_pointer, 'constant', value_num)
			      };

			      // set
			      if (set) {
			        const operand1 = set[1] || set[3] || set[5];
			        const operand2 = set[2] || set[4] || set[6];
			        return [getControlTag('set', operand1, operand2)]
			      }

			      // add
			      if (add) {
			        const operand1 = add[1] || add[3] || add[5];
			        const operand2 = add[2] || add[4] || add[6];
			        return [getControlTag('add', operand1, operand2)]
			      }

			      // sub
			      if (sub) {
			        const operand1 = sub[1] || sub[3] || sub[5];
			        const operand2 = sub[2] || sub[4] || sub[6];
			        return [getControlTag('sub', operand1, operand2)]
			      }

			      // mul
			      if (mul) {
			        const operand1 = mul[1] || mul[3] || mul[5];
			        const operand2 = mul[2] || mul[4] || mul[6];
			        return [getControlTag('mul', operand1, operand2)]
			      }

			      // div
			      if (div) {
			        const operand1 = div[1] || div[3] || div[5];
			        const operand2 = div[2] || div[4] || div[6];
			        return [getControlTag('div', operand1, operand2)]
			      }

			      // mod
			      if (mod) {
			        const operand1 = mod[1] || mod[3] || mod[5];
			        const operand2 = mod[2] || mod[4] || mod[6];
			        return [getControlTag('mod', operand1, operand2)]
			      }

			      // switch
			      if (switch_tag) {
			        const operand1 = switch_tag[1] || switch_tag[3] || switch_tag[5];
			        const operand2 = switch_tag[2] || switch_tag[4] || switch_tag[6];
			        return [getControlTag('switch', operand1, operand2)]
			      }

			      // self switch
			      if (self_switch_tag) {
			        const operand1 = self_switch_tag[1] || self_switch_tag[3] || self_switch_tag[5];
			        const operand2 = self_switch_tag[2] || self_switch_tag[4] || self_switch_tag[6];
			        return [getControlTag('selfswitch', operand1, operand2)]
			      }

			      /// timer control
			      const timer_start_reg_list = ['timer', 'タイマー'].map((x) => `<${x} *: *(.+) *, *(\\d+), *(\\d+) *>`);
			      const timer_start = text.match(new RegExp(timer_start_reg_list.join('|'), 'i'));
			      const timer_stop_reg_list = ['timer', 'タイマー'].map((x) => `<${x} *: *(.+) *>`);
			      const timer_stop = text.match(new RegExp(timer_stop_reg_list.join('|'), 'i'));

			      if (timer_start) {
			        const operand1 = timer_start[1] || timer_start[4];
			        const min = parseInt(timer_start[2] || timer_start[5]);
			        const sec = parseInt(timer_start[3] || timer_start[6]);
			        const setting_sec = 60 * min + sec;
			        return [getControlTimer(operand1, setting_sec)]
			      }
			      if (timer_stop) {
			        const operand1 = timer_stop[1] || timer_stop[2];
			        return [getControlTimer(operand1, 0)]
			      }

			      // Show Picture
			      if (show_picture) {
			        const params = show_picture[1].split(',').map((s) => s.trim());
			        if (params.length > 1) {
			          const pic_no = Number(params[0]);
			          const name = params[1];
			          const options = params.slice(2);
			          return [getShowPicture(pic_no, name, options)]
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // Move Picture
			      if (move_picture) {
			        const params = move_picture[1].split(',').map((s) => s.trim());
			        if (params.length > 0) {
			          const pic_no = Number(params[0]);
			          const options = params.slice(1);
			          return [getMovePicture(pic_no, options)]
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // Rotate Picture
			      if (rotate_picture) {
			        const pic_no = Number(rotate_picture[1]);
			        const speed = Number(rotate_picture[2]);
			        return [getRotatePicture(pic_no, speed)]
			      }

			      // Tint Picture
			      if (tint_picture) {
			        const params = tint_picture[1].split(',').map((s) => s.trim());
			        if (params.length > 0) {
			          const pic_no = Number(params[0]);
			          const options = params.slice(1);
			          return [getTintPicture(pic_no, options)]
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // Erase Picture
			      if (erase_picture) {
			        const pic_no = Number(erase_picture[1]);
			        return [getErasePicture(pic_no)]
			      }

			      // Conditional Branch (If)
			      if (conditional_branch_if) {
			        const args = conditional_branch_if[1].split(',');
			        if (args.length > 0) {
			          const target = args[0].trim();
			          const params = args.slice(1);
			          return [getConditionalBranch(target, params)]
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // Conditional Branch (Else)
			      if (conditional_branch_else) {
			        const event_command_list = [];
			        event_command_list.push(getCommandBottomEvent());
			        event_command_list.push(getElse());
			        return event_command_list
			      }

			      // Conditional Branch (End)
			      if (conditional_branch_end) {
			        const CHOICE_CODE = 102;
			        const BATTLE_PROCESSING_CODE = 301;
			        const MOVEMENT_ROUTE_CODE = 205;
			        // 末尾が移動ルート(205)なら、その分岐は既に終わっている。閉じ判定の前に
			        // 取り除く(<When>分岐の末尾が<SetMovementRoute>のとき、選択肢が隠れて
			        // <End> が選択肢終了(404)ではなく分岐終了(412)と誤判定されるのを防ぐ)。
			        // block_stack は呼び出し元と共有参照なので、ここでの pop で後続の閉じ処理も整合する。
			        while (block_stack.length > 0 && block_stack[block_stack.length - 1].code === MOVEMENT_ROUTE_CODE) {
			          block_stack.pop();
			        }
			        const current_block = block_stack.slice(-1)[0];

			        if (Boolean(current_block) && current_block.code === CHOICE_CODE) {
			          return [getBlockEnd(), getShowChoiceEnd()]
			        } else if (Boolean(current_block) && (current_block.code === BATTLE_PROCESSING_CODE)) {
			          return [getBlockEnd(), getIfEnd()]
			        } else {
			          return [getCommandBottomEvent(), getEnd()]
			        }
			      }

			      // Loop
			      if (loop) {
			        return [getLoop()]
			      }

			      // Repeat Above
			      if (repeat_above) {
			        const event_command_list = [];
			        event_command_list.push(getCommandBottomEvent());
			        event_command_list.push(getRepeatAbove());
			        return event_command_list
			      }

			      // Break Loop
			      if (break_loop) {
			        return [getBreakLoop()]
			      }

			      // Skip End (409): スキップされた分岐の直後に置かれる終端マーカー。
			      // 分岐本体を {code:0} で閉じてから 409 を出す(<End> と同型)。skip より先に判定。
			      if (skip_branch_end) {
			        return [getBlockEnd(), getSkipEnd()]
			      }

			      // Skip (109): 分岐開始。本体(indent+1)は autoIndent が 109 を開始タグ扱いで字下げする。
			      if (skip_branch) {
			        return [getSkip()]
			      }

			      // Exit Event Processing
			      if (exit_event_processing) {
			        return [getExitEventProcessing()]
			      }

			      // Label
			      if (label) {
			        const label_name = label[1] || '';
			        return [getLabel(label_name)]
			      }

			      // Jump to Label
			      if (jump_to_label) {
			        const label_name = jump_to_label[1] || '';
			        return [getJumpToLabel(label_name)]
			      }

			      // Input Number
			      if (input_number) {
			        const val_num = Number(input_number[1]);
			        const num_of_digits = Number(input_number[2]);
			        return [getInputNumber(val_num, num_of_digits)]
			      }

			      // Select Item
			      if (select_item) {
			        const val_num = Number(select_item[1]);
			        const item_type = select_item[2];
			        return [getSelectItem(val_num, item_type)]
			      }

			      // Show Choices
			      if (show_choices) {
			        const params = show_choices[1]
			          .split(',')
			          .filter((s) => s)
			          .map((s) => s.trim());
			        let window_type = 0;
			        let window_position = 2;
			        let default_choice = 0;
			        let default_cancel = 1;
			        let exist_default_choice = false;

			        params.forEach((p) => {
			          /* eslint-disable no-empty */
			          try {
			            window_type = getBackground(p);
			            return
			          } catch (e) {}
			          try {
			            window_position = getChoiceWindowPosition(p);
			            return
			          } catch (e) {}
			          /* eslint-enable no-empty */
			          switch (p.toLowerCase()) {
			            case 'branch':
			            case '分岐':
			              default_cancel = -2;
			              return
			            case 'disallow':
			            case '禁止':
			              default_cancel = -1;
			              return
			            case 'none':
			            case 'なし':
			              default_choice = -1;
			              exist_default_choice = true;
			              return
			          }
			          if (!isNaN(Number(p))) {
			            if (exist_default_choice) {
			              default_cancel = Number(p) - 1;
			            } else {
			              default_choice = Number(p) - 1;
			              exist_default_choice = true;
			            }
			          }
			        });

			        return [getShowChoices(window_type, window_position, default_choice, default_cancel)]
			      }

			      // Show Choice When
			      if (show_choice_when) {
			        const index = 0;
			        const text = show_choice_when[1];
			        return [getShowChoiceWhen(index, text)]
			      }

			      // Show Choice When Cancel
			      if (show_choice_when_cancel) {
			        return [getShowChoiceWhenCancel()]
			      }

			      // Face
			      if (face) {
			        if (!frame_param) {
			          frame_param = getPretextEvent();
			        }
			        const face_number = face[1].match(/.*\((.+?)\)/i);

			        if (face_number) {
			          frame_param.parameters[0] = face[1].replace(/\(\d\)/, '');
			          frame_param.parameters[1] = parseInt(face_number[1]);
			          text = text.replace(face[0], '');
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // window backgound
			      if (background) {
			        if (!frame_param) {
			          frame_param = getPretextEvent();
			        }
			        try {
			          frame_param.parameters[2] = getBackground(background[1]);
			        } catch (e) {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			        text = text.replace(background[0], '');
			      }

			      // window position
			      if (window_position) {
			        if (!frame_param) {
			          frame_param = getPretextEvent();
			        }
			        try {
			          frame_param.parameters[3] = getWindowPosition(window_position[1]);
			        } catch (e) {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			        text = text.replace(window_position[0], '');
			      }

			      // name box
			      if (namebox) {
			        if (!frame_param) {
			          frame_param = getPretextEvent();
			        }
			        frame_param.parameters[4] = namebox[1];
			        text = text.replace(namebox[0], '');
			      }

			      const event_command_list = [];

			      if (face || background || window_position || namebox) {
			        if (frame_param) {
			          logger.log('push: ', frame_param.parameters);
			          event_command_list.push(frame_param);
			        }
			      }

			      // イベントコマンド追加
			      // 正規表現変数(オペランド等に使用)
			      const constant_regexp = /^\d+$/;
			      const variable_regexp = /(?:variables|v|変数)\[([0-9]+)\]/i;
			      const actor_regexp = /(?:actors|v|アクター)\[([0-9]+)\]/i;
			      // オペレーション(操作)リスト
			      const operationIncreaseList = ['increase', '+', '増やす'];
			      const operationDecreaseList = ['decrease', '-', '減らす'];
			      const operationAddList = ['add', '+', '加える', '付加'];
			      const operationRemoveList = ['remove', '-', '外す', '解除'];
			      const operationLearnList = ['learn', '+', '覚える'];
			      const operationForgetList = ['forget', '-', '忘れる'];
			      // 場所/Location
			      const locationDirectList = ['direct', '0', '直接指定'];
			      const locationEventVariablesList = ['withvariables', '変数で指定'];
			      const locationExchangeList = ['exchange', '2', '交換'];
			      const troopRandomEncountList = ['random', '2', 'ランダム'];
			      const locationDesignationList = ['character', '2', 'キャラクターで指定', 'キャラクター'];
			      const directionRetainList = ['retain', '0', 'そのまま'];
			      const directionDownList = ['down', '2', '下'];
			      const directionLeftList = ['left', '4', '左'];
			      const directionRightList = ['right', '6', '右'];
			      const directionUpList = ['up', '8', '上'];
			      const fadeBlackList = ['black', '0', '黒'];
			      const fadeWhiteList = ['white', '1', '白'];
			      const fadeNoneList = ['none', '2', 'なし'];
			      const vehicleBoatList = ['boat', '0', '小型船'];
			      const vehicleShipList = ['ship', '1', '大型船'];
			      const vehicleAirshipList = ['airship', '2', '飛行船'];
			      const speedX8SlowerList = ['x8 slower', '1', '1/8倍速'];
			      const speedX4SlowerList = ['x4 slower', '2', '1/4倍速'];
			      const speedX2SlowerList = ['x2 slower', '3', '1/2倍速'];
			      const speedNormalList = ['normal', '4', '標準速'];
			      const speedX2FasterList = ['x2 faster', '5', '2倍速'];
			      const speedX4FasterList = ['x4 faster', '6', '4倍速'];
			      const infoTypeTerrainTagList = ['terrain tag', '0', '地形タグ'];
			      const infoTypeEventIdList = ['event id', '1', 'イベントid'];
			      const infoTypeLayer1List = ['layer 1', '2', 'レイヤー１'];
			      const infoTypeLayer2List = ['layer 2', '3', 'レイヤー２'];
			      const infoTypeLayer3List = ['layer 3', '4', 'レイヤー３'];
			      const infoTypeLayer4List = ['layer 4', '5', 'レイヤー４'];
			      const infoTypeRegionIdList = ['region id', '6', 'リージョンid'];
			      const frequencyLowestList = ['lowest', '1', '最低'];
			      const frequencyLowerList = ['lower', '2', '低'];
			      const frequencynormalList = ['normal', '3', '標準'];
			      const frequencyHigherList = ['higher', '4', '高'];
			      const frequencyHighestList = ['highest', '5', '最高'];
			      const blendModeNormalList = ['normal', '0', '通常'];
			      const blendModeAdditiveList = ['additive', '1', '加算'];
			      const blendModeMultiplyList = ['multiply', '2', '乗算'];
			      const blendModeScreenList = ['screen', '3', 'スクリーン'];
			      // 能力値
			      const actorMaxHpList = ['maxhp', '0', '最大hp'];
			      const actorMaxMpList = ['maxmp', '1', '最大mp'];
			      const actorAttackList = ['attack', '2', '攻撃力'];
			      const actorDefenseList = ['defense', '3', '防御力'];
			      const actorMAttackList = ['m.attack', '4', '魔法力'];
			      const actorMDefenseList = ['m.defense', '5', '魔法防御'];
			      const actorAgilityList = ['agility', '6', '敏捷性'];
			      const actorLuckList = ['luck', '7', '運'];
			      // 装備
			      const equipmentItemList = ['none', 'なし', '0'];

			      // キャラクター
			      const characterPlayerList = ['player', '-1', 'プレイヤー'];
			      const characterThisEventList = ['this event', '0', 'このイベント'];
			      const balloonIconExclamationList = ['exclamation', '1', 'びっくり'];
			      const balloonIconQuestionList = ['question', '2', 'はてな'];
			      const balloonIconMusicNoteList = ['music note', '3', '音符'];
			      const balloonIconHeartList = ['heart', '4', 'ハート'];
			      const balloonIconAngerList = ['anger', '5', '怒り'];
			      const balloonIconSweatList = ['sweat', '6', '汗'];
			      const balloonIconFlustrationList = ['flustration', 'cobweb', '7', 'くしゃくしゃ'];
			      const balloonIconSilenceList = ['silence', '8', '沈黙'];
			      const balloonIconLightBulbList = ['light bulb', '9', '電球'];
			      const balloonIconZzzList = ['zzz', '10', 'zzz'];
			      const balloonIconUserDefined1List = ['user-defined1', '11', 'ユーザー定義1'];
			      const balloonIconUserDefined2List = ['user-defined2', '12', 'ユーザー定義2'];
			      const balloonIconUserDefined3List = ['user-defined3', '13', 'ユーザー定義3'];
			      const balloonIconUserDefined4List = ['user-defined4', '14', 'ユーザー定義4'];
			      const balloonIconUserDefined5List = ['user-defined5', '15', 'ユーザー定義5'];

			      // 天気
			      const weatherNoneList = ['none', 'なし'];
			      const weatherRainList = ['rain', '雨'];
			      const weatherStormList = ['storm', '嵐'];
			      const weatherSnowList = ['snow', '雪'];

			      // ショップ
			      const merchandiseItemList = ['item', '0', 'アイテム'];
			      const merchandiseWeaponList = ['weapon', '1', '武器'];
			      const merchandiseArmorList = ['armor', '2', '防具'];
			      const priceStandardList = ['standard', '0', '標準'];

			      // バトル
			      const actionTargetLastTargetList = ['last target', '-1', 'ラストターゲット'];
			      const actionTargetRandomList = ['random', '0', 'ランダム'];
			      const actionTargetIndex1List = ['index 1', '1', 'インデックス１'];
			      const actionTargetIndex2List = ['index 2', '2', 'インデックス２'];
			      const actionTargetIndex3List = ['index 3', '3', 'インデックス３'];
			      const actionTargetIndex4List = ['index 4', '4', 'インデックス４'];
			      const actionTargetIndex5List = ['index 5', '5', 'インデックス５'];
			      const actionTargetIndex6List = ['index 6', '6', 'インデックス６'];
			      const actionTargetIndex7List = ['index 7', '7', 'インデックス７'];
			      const actionTargetIndex8List = ['index 8', '8', 'インデックス８'];

			      // チェックボックス ラジオボタン
			      const checkBoxOnList = ['true', 'on', 'オン', '1'];
			      const checkBoxOffList = ['false', 'off', 'オフ', '0'];
			      const checkBoxWaitList = ['wait for completion', '完了までウェイト', 'wait'];
			      const checkBoxPurchaseOnlyList = ['purchase only', '購入のみ'];
			      const checkBoxRepeatList = ['repeat', 'repeat movements', '動作を繰り返す'];
			      const checkBoxSkipList = ['skip', 'skip if cannot move', '移動できない場合は飛ばす'];
			      const checkBoxEquipmentList = ['include equipment', '装備品を含む'];
			      const checkBoxInitializeList = ['initialize', '初期化'];
			      const checkBoxKnockoutList = ['allow knockout', '戦闘不能を許可'];
			      const checkBoxLevelUpList = ['show level up', 'レベルアップを表示'];
			      const checkBoxSaveExpList = ['save exp', '経験値の保存', 'save level', 'レベルの保存'];
			      const checkBoxLoopHorizontallyList = ['loophorizontally', '横方向にループする'];
			      const checkBoxLoopVerticallyList = ['loopvertically', '縦方向にループする'];
			      const radioButtonOnList = ['true', 'on', 'オン', '0'];
			      const radioButtonOffList = ['false', 'off', 'オフ', '1'];
			      const radioButtonDisableList = ['disable', '0', '禁止'];
			      const radioButtonEnableList = ['enable', '1', '許可'];

			      // 敵キャラ
			      const enemyTargetList = ['entire troop', '敵グループ全体'];

			      // アクター
			      const actorTargetList = ['entire party', 'パーティ全体'];

			      // 関数
			      const getIncreaseOrDecrease = (operationType) => {
			        if (operationIncreaseList.includes(operationType)) {
			          return 0
			        } else if (operationDecreaseList.includes(operationType)) {
			          return 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getAddOrRemove = (operationType) => {
			        if (operationAddList.includes(operationType)) {
			          return 0
			        } else if (operationRemoveList.includes(operationType)) {
			          return 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getLearnOrForget = (operationType) => {
			        if (operationLearnList.includes(operationType)) {
			          return 0
			        } else if (operationForgetList.includes(operationType)) {
			          return 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };

			      const getConstantOrVariable = (operandValue) => {
			        if (operandValue.match(constant_regexp)) {
			          return { operand: 0, operandValue: Number(operandValue) }
			        } else if (operandValue.match(variable_regexp)) {
			          return { operand: 1, operandValue: Number(operandValue.match(variable_regexp)[1]) }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getFixedOrVariable = (operandValue) => {
			        if (operandValue.match(constant_regexp)) {
			          return { actor: 0, actorValue: Number(operandValue) }
			        } else if (actorTargetList.includes(operandValue)) {
			          return { actor: 0, actorValue: 0 }
			        } else if (operandValue.match(variable_regexp)) {
			          return { actor: 1, actorValue: Number(operandValue.match(variable_regexp)[1]) }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getEnemyOrActor = (subject) => {
			        if (subject.match(constant_regexp)) {
			          return { subject: 0, subjectValue: Number(subject) - 1 }
			        } else if (subject.match(actor_regexp)) {
			          return { subject: 1, subjectValue: Number(subject.match(actor_regexp)[1]) }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getCheckBoxValue = (checkBoxValue) => {
			        if (checkBoxOnList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxWaitList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxPurchaseOnlyList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxRepeatList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxSkipList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxEquipmentList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxInitializeList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxKnockoutList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxLevelUpList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxSaveExpList.includes(checkBoxValue)) {
			          return true
			        } else if (checkBoxOffList.includes(checkBoxValue)) {
			          return false
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getOnOffRadioButtonValue = (checkBoxValue) => {
			        if (radioButtonOnList.includes(checkBoxValue)) {
			          return 0
			        } else if (radioButtonOffList.includes(checkBoxValue)) {
			          return 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getDisableEnableRadioButtonValue = (radioButtonValue) => {
			        if (radioButtonDisableList.includes(radioButtonValue)) {
			          return 0
			        } else if (radioButtonEnableList.includes(radioButtonValue)) {
			          return 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getLocationValue = (location) => {
			        if (locationDirectList.includes(location)) {
			          return 0
			        } else if (locationEventVariablesList.includes(location)) {
			          return 1
			        } else if (locationExchangeList.includes(location) || locationDesignationList.includes(location)) {
			          return 2
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getLocationEvent = (matches1, matches2, matches4) => {
			        if (locationDirectList.includes(matches1)) {
			          return { locationType: 0, locationX: parseInt(matches2), locationY: parseInt(matches4) }
			        } else if (locationEventVariablesList.includes(matches1)) {
			          return { locationType: 1, locationX: parseInt(matches2), locationY: parseInt(matches4) }
			        } else if (locationDesignationList.includes(matches1)) {
			          if (characterPlayerList.includes(matches2)) {
			            return { locationType: 2, locationX: -1, locationY: 0 }
			          } else if (characterThisEventList.includes(matches2)) {
			            return { locationType: 2, locationX: 0, locationY: 0 }
			          } else if (!isNaN(parseInt(matches2))) {
			            return { locationType: 2, locationX: parseInt(matches2), locationY: 0 }
			          } else {
			            throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			          }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getTroopValue = (troop) => {
			        if (troop.match(constant_regexp)) {
			          return { troop: 0, troopValue: Number(troop) }
			        } else if (troop.match(variable_regexp)) {
			          return { troop: 1, troopValue: Number(troop.match(variable_regexp)[1]) }
			        } else if (troopRandomEncountList.includes(troop)) {
			          return { troop: 2, troopValue: 0 }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getDirectionValue = (direction) => {
			        if (directionRetainList.includes(direction)) {
			          return 0
			        } else if (directionDownList.includes(direction)) {
			          return 2
			        } else if (directionLeftList.includes(direction)) {
			          return 4
			        } else if (directionRightList.includes(direction)) {
			          return 6
			        } else if (directionUpList.includes(direction)) {
			          return 8
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getFadeValue = (fade) => {
			        if (fadeBlackList.includes(fade)) {
			          return 0
			        } else if (fadeWhiteList.includes(fade)) {
			          return 1
			        } else if (fadeNoneList.includes(fade)) {
			          return 2
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getVehicleValue = (vehicle) => {
			        if (vehicleBoatList.includes(vehicle)) {
			          return 0
			        } else if (vehicleShipList.includes(vehicle)) {
			          return 1
			        } else if (vehicleAirshipList.includes(vehicle)) {
			          return 2
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getSpeedValue = (speed) => {
			        if (speedX8SlowerList.includes(speed)) {
			          return 1
			        } else if (speedX4SlowerList.includes(speed)) {
			          return 2
			        } else if (speedX2SlowerList.includes(speed)) {
			          return 3
			        } else if (speedNormalList.includes(speed)) {
			          return 4
			        } else if (speedX2FasterList.includes(speed)) {
			          return 5
			        } else if (speedX4FasterList.includes(speed)) {
			          return 6
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getFrequencyValue = (frequency) => {
			        if (frequencyLowestList.includes(frequency)) {
			          return 1
			        } else if (frequencyLowerList.includes(frequency)) {
			          return 2
			        } else if (frequencynormalList.includes(frequency)) {
			          return 3
			        } else if (frequencyHigherList.includes(frequency)) {
			          return 4
			        } else if (frequencyHighestList.includes(frequency)) {
			          return 5
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getBlendModeValue = (blendMode) => {
			        if (blendModeNormalList.includes(blendMode)) {
			          return 0
			        } else if (blendModeAdditiveList.includes(blendMode)) {
			          return 1
			        } else if (blendModeMultiplyList.includes(blendMode)) {
			          return 2
			        } else if (blendModeScreenList.includes(blendMode)) {
			          return 3
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getLocationInfoTypeValue = (infoType) => {
			        if (infoTypeTerrainTagList.includes(infoType)) {
			          return 0
			        } else if (infoTypeEventIdList.includes(infoType)) {
			          return 1
			        } else if (infoTypeLayer1List.includes(infoType)) {
			          return 2
			        } else if (infoTypeLayer2List.includes(infoType)) {
			          return 3
			        } else if (infoTypeLayer3List.includes(infoType)) {
			          return 4
			        } else if (infoTypeLayer4List.includes(infoType)) {
			          return 5
			        } else if (infoTypeRegionIdList.includes(infoType)) {
			          return 6
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getActorParameterValue = (actorParameter) => {
			        if (actorMaxHpList.includes(actorParameter)) {
			          return 0
			        } else if (actorMaxMpList.includes(actorParameter)) {
			          return 1
			        } else if (actorAttackList.includes(actorParameter)) {
			          return 2
			        } else if (actorDefenseList.includes(actorParameter)) {
			          return 3
			        } else if (actorMAttackList.includes(actorParameter)) {
			          return 4
			        } else if (actorMDefenseList.includes(actorParameter)) {
			          return 5
			        } else if (actorAgilityList.includes(actorParameter)) {
			          return 6
			        } else if (actorLuckList.includes(actorParameter)) {
			          return 7
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getChangeEquipmentItemValue = (equipmentItem) => {
			        if (equipmentItemList.includes(equipmentItem)) {
			          return 0
			        } else if (!isNaN(parseInt(equipmentItem))) {
			          return parseInt(equipmentItem)
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getCharacterValue = (character) => {
			        if (characterPlayerList.includes(character)) {
			          return -1
			        } else if (characterThisEventList.includes(character)) {
			          return 0
			        } else if (!isNaN(parseInt(character))) {
			          return parseInt(character)
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getBalloonIconValue = (balloonIcon) => {
			        if (balloonIconExclamationList.includes(balloonIcon)) {
			          return 1
			        } else if (balloonIconQuestionList.includes(balloonIcon)) {
			          return 2
			        } else if (balloonIconMusicNoteList.includes(balloonIcon)) {
			          return 3
			        } else if (balloonIconHeartList.includes(balloonIcon)) {
			          return 4
			        } else if (balloonIconAngerList.includes(balloonIcon)) {
			          return 5
			        } else if (balloonIconSweatList.includes(balloonIcon)) {
			          return 6
			        } else if (balloonIconFlustrationList.includes(balloonIcon)) {
			          return 7
			        } else if (balloonIconSilenceList.includes(balloonIcon)) {
			          return 8
			        } else if (balloonIconLightBulbList.includes(balloonIcon)) {
			          return 9
			        } else if (balloonIconZzzList.includes(balloonIcon)) {
			          return 10
			        } else if (balloonIconUserDefined1List.includes(balloonIcon)) {
			          return 11
			        } else if (balloonIconUserDefined2List.includes(balloonIcon)) {
			          return 12
			        } else if (balloonIconUserDefined3List.includes(balloonIcon)) {
			          return 13
			        } else if (balloonIconUserDefined4List.includes(balloonIcon)) {
			          return 14
			        } else if (balloonIconUserDefined5List.includes(balloonIcon)) {
			          return 15
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getWeatherTypeValue = (weather) => {
			        if (weatherNoneList.includes(weather)) {
			          return 'none'
			        } else if (weatherRainList.includes(weather)) {
			          return 'rain'
			        } else if (weatherStormList.includes(weather)) {
			          return 'storm'
			        } else if (weatherSnowList.includes(weather)) {
			          return 'snow'
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getMerchandiseType = (merchandise) => {
			        if (merchandiseItemList.includes(merchandise)) {
			          return 0
			        } else if (merchandiseWeaponList.includes(merchandise)) {
			          return 1
			        } else if (merchandiseArmorList.includes(merchandise)) {
			          return 2
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getPriceValue = (price) => {
			        if (priceStandardList.includes(price)) {
			          return { price: 0, priceValue: 0 }
			        } else if (!isNaN(parseInt(price))) {
			          return { price: 1, priceValue: parseInt(price) }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getActionTarget = (target) => {
			        if (actionTargetLastTargetList.includes(target)) {
			          return -2
			        } else if (actionTargetRandomList.includes(target)) {
			          return -1
			        } else if (actionTargetIndex1List.includes(target)) {
			          return 0
			        } else if (actionTargetIndex2List.includes(target)) {
			          return 1
			        } else if (actionTargetIndex3List.includes(target)) {
			          return 2
			        } else if (actionTargetIndex4List.includes(target)) {
			          return 3
			        } else if (actionTargetIndex5List.includes(target)) {
			          return 4
			        } else if (actionTargetIndex6List.includes(target)) {
			          return 5
			        } else if (actionTargetIndex7List.includes(target)) {
			          return 6
			        } else if (actionTargetIndex8List.includes(target)) {
			          return 7
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getEnemyTargetValue = (enemy) => {
			        if (enemyTargetList.includes(enemy)) {
			          return -1
			        } else if (!isNaN(parseInt(enemy))) {
			          return parseInt(enemy) - 1
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };
			      const getTargetEnemyMultipleValues = (enemy) => {
			        if (enemyTargetList.includes(enemy)) {
			          return { enemyValue: 0, isAllChecked: true }
			        } else if (!isNaN(parseInt(enemy))) {
			          return { enemyValue: parseInt(enemy) - 1, isAllChecked: false }
			        } else {
			          throw new Error('Syntax error. / 文法エラーです。:' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      };

			      // change gold
			      if (change_gold) {
			        const params = change_gold[1].split(',').map((s) => s.trim().toLowerCase());
			        const operation = getIncreaseOrDecrease(params[0].toLowerCase());
			        const { operand, operandValue } = getConstantOrVariable(params[1].toLowerCase());

			        return [getChangeGold(operation, operand, operandValue)]
			      }

			      // change items
			      if (change_items) {
			        const params = change_items[1].split(',').map((s) => s.trim().toLowerCase());
			        const itemId = parseInt(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);

			        return [getChangeItems(itemId, operation, operand, operandValue)]
			      }

			      // change weapons
			      if (change_weapons) {
			        const params = change_weapons[1].split(',').map((s) => s.trim().toLowerCase());
			        const weaponId = parseInt(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const includeEquipmentFlg = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeWeapons(weaponId, operation, operand, operandValue, includeEquipmentFlg)]
			      }

			      // change armors
			      if (change_armors) {
			        const params = change_armors[1].split(',').map((s) => s.trim().toLowerCase());
			        const armorId = parseInt(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const includeEquipmentFlg = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeArmors(armorId, operation, operand, operandValue, includeEquipmentFlg)]
			      }

			      // change party member
			      if (change_party_member) {
			        const params = change_party_member[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const operation = getAddOrRemove(params[1]);
			        const includeEquipmentFlg = params[2] === undefined ? false : getCheckBoxValue(params[2]);

			        return [getChangePartyMember(actorId, operation, includeEquipmentFlg)]
			      }

			      // change hp
			      if (change_hp) {
			        const params = change_hp[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const allowDeathFlg = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeHp(actor, actorValue, operation, operand, operandValue, allowDeathFlg)]
			      }

			      // change mp
			      if (change_mp) {
			        const params = change_mp[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);

			        return [getChangeMp(actor, actorValue, operation, operand, operandValue)]
			      }

			      // change tp
			      if (change_tp) {
			        const params = change_tp[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);

			        return [getChangeTp(actor, actorValue, operation, operand, operandValue)]
			      }

			      // change state
			      if (change_state) {
			        const params = change_state[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getAddOrRemove(params[1]);
			        const stateId = parseInt(params[2]);

			        return [getChangeState(actor, actorValue, operation, stateId)]
			      }

			      // recover all
			      if (recover_all) {
			        const params = recover_all[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);

			        return [getRecoverAll(actor, actorValue)]
			      }

			      // change exp
			      if (change_exp) {
			        const params = change_exp[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const showLevelUpFlg = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeExp(actor, actorValue, operation, operand, operandValue, showLevelUpFlg)]
			      }

			      // change level
			      if (change_level) {
			        const params = change_level[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const showLevelUpFlg = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeLevel(actor, actorValue, operation, operand, operandValue, showLevelUpFlg)]
			      }

			      // change parameter
			      if (change_parameter) {
			        const params = change_parameter[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const parameter = getActorParameterValue(params[1]);
			        const operation = getIncreaseOrDecrease(params[2]);
			        const { operand, operandValue } = getConstantOrVariable(params[3]);

			        return [getChangeParameter(actor, actorValue, parameter, operation, operand, operandValue)]
			      }

			      // change skill
			      if (change_skill) {
			        const params = change_skill[1].split(',').map((s) => s.trim().toLowerCase());
			        const { actor, actorValue } = getFixedOrVariable(params[0]);
			        const operation = getLearnOrForget(params[1]);
			        const skillId = parseInt(params[2]);

			        return [getChangeSkill(actor, actorValue, operation, skillId)]
			      }

			      // change equipment
			      if (change_equipment) {
			        const params = change_equipment[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const equipmentType = parseInt(params[1]);
			        const equipmentItem = getChangeEquipmentItemValue(params[2]);

			        return [getChangeEquipment(actorId, equipmentType, equipmentItem)]
			      }

			      // change name
			      if (change_name) {
			        const params = change_name[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const name = params[1] === undefined ? '' : params[1];

			        return [getChangeName(actorId, name)]
			      }

			      // change class
			      if (change_class) {
			        const params = change_class[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const classId = parseInt(params[1]);
			        const saveExpFlg = params[2] === undefined ? false : getCheckBoxValue(params[2]);

			        return [getChangeClass(actorId, classId, saveExpFlg)]
			      }

			      // change name
			      if (change_nickname) {
			        const params = change_nickname[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const nickname = params[1] === undefined ? '' : params[1];

			        return [getChangeNickname(actorId, nickname)]
			      }

			      // change profile
			      if (change_profile) {
			        const params = change_profile[1].split(',').map((s) => s.trim());
			        const actorId = parseInt(params[0]);
			        const firstLine = params[1] === undefined ? '' : String(params[1]);
			        const secondLine = params[2] === undefined ? '' : String(params[2]);
			        const isNewlineCharacter = firstLine.includes('\\n');
			        let profile = '';

			        // 1行目に改行コードがある、または２行目が省略されている場合は1行目のみを出力
			        if (isNewlineCharacter || secondLine === '') {
			          profile = firstLine;
			        } else {
			          profile = firstLine + '\n' + secondLine;
			        }

			        return [getChangeProfile(actorId, profile)]
			      }

			      // transfer player
			      if (transfer_player) {
			        const params = transfer_player[1].split(',').map((s) => s.trim().toLowerCase());
			        // 位置(params[0])を正規表現で取得
			        const regex = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/;
			        const matches = params[0].match(regex);
			        // 取得チェック
			        if (!matches) throw new Error('Syntax error. / 文法エラーです。:' + params[0])
			        const location = getLocationValue(matches[1]);
			        const mapId = parseInt(matches[2]);
			        const mapX = parseInt(matches[3]);
			        const mapY = parseInt(matches[4]);
			        const direction = getDirectionValue(params[1]);
			        const fade = getFadeValue(params[2]);

			        return [getTransferPlayer(location, mapId, mapX, mapY, direction, fade)]
			      }

			      // set vehicle location
			      if (set_vehicle_location) {
			        const params = set_vehicle_location[1].split(',').map((s) => s.trim().toLowerCase());
			        const vehicle = getVehicleValue(params[0]);
			        // 位置(params[0])を正規表現で取得
			        const regex = /(.*?)\[(\d+)]\[(\d+)]\[(\d+)]/;
			        const matches = params[1].match(regex);
			        // 取得チェック
			        if (!matches) throw new Error('Syntax error. / 文法エラーです。:' + params[1])
			        const location = getLocationValue(matches[1]);
			        const mapId = parseInt(matches[2]);
			        const mapX = parseInt(matches[3]);
			        const mapY = parseInt(matches[4]);

			        return [getSetVehicleLocation(vehicle, location, mapId, mapX, mapY)]
			      }

			      // set event location
			      if (set_event_location) {
			        const params = set_event_location[1].split(',').map((s) => s.trim().toLowerCase());
			        const event = getCharacterValue(params[0]);
			        // 位置(params[1])を正規表現で取得
			        const regex = /(.*?)\[(.*?)](\[(\d+)])?(\[(\d+)])?/;
			        const matches = params[1].match(regex);
			        // 取得チェック
			        if (!matches) throw new Error('Syntax error. / 文法エラーです。:' + params[1])

			        const location = getLocationValue(matches[1]);
			        let mapX = 0;
			        let mapY = 0;
			        if (location === 0 || location === 1) {
			          mapX = parseInt(matches[2]);
			          mapY = parseInt(matches[4]);
			        } else if (location === 2) {
			          mapX = getCharacterValue(matches[2]);
			          mapY = 0;
			        }
			        const direction = getDirectionValue(params[2]);

			        return [getSetEventLocation(event, location, mapX, mapY, direction)]
			      }

			      // scroll map
			      if (scroll_map) {
			        const params = scroll_map[1].split(',').map((s) => s.trim().toLowerCase());
			        const direction = getDirectionValue(params[0]);
			        const distance = parseInt(params[1]);
			        const speed = getSpeedValue(params[2]);
			        const waitForCompletion = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getScrollMap(direction, distance, speed, waitForCompletion)]
			      }

			      // set movement route
			      if (set_movement_route) {
			        const params = set_movement_route[1].split(',').map((s) => s.trim().toLowerCase());
			        const target = getCharacterValue(params[0]);
			        const repeat = params[1] === undefined ? false : getCheckBoxValue(params[1]);
			        const skippable = params[2] === undefined ? false : getCheckBoxValue(params[2]);
			        const wait = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getMovementRoute(target, repeat, skippable, wait)]
			      }

			      // move down
			      if (move_down) {
			        return [getMoveDown()]
			      }

			      // move left
			      if (move_left) {
			        return [getMoveLeft()]
			      }

			      // move right
			      if (move_right) {
			        return [getMoveRight()]
			      }

			      // move up
			      if (move_up) {
			        return [getMoveUp()]
			      }

			      // move lower left
			      if (move_lower_left) {
			        return [getMoveLowerLeft()]
			      }

			      // move lower right
			      if (move_lower_right) {
			        return [getMoveLowerRight()]
			      }

			      // move upper left
			      if (move_upper_left) {
			        return [getMoveUpperLeft()]
			      }

			      // move upper right
			      if (move_upper_right) {
			        return [getMoveUpperRight()]
			      }

			      // move at random
			      if (move_at_random) {
			        return [getMoveAtRandom()]
			      }

			      // move toward player
			      if (move_toward_player) {
			        return [getMoveTowardPlayer()]
			      }

			      // move away from player
			      if (move_away_from_player) {
			        return [getMoveAwayFromPlayer()]
			      }

			      // one step forwarde
			      if (one_step_forward) {
			        return [getOneStepForward()]
			      }

			      // one step backward
			      if (one_step_backward) {
			        return [getOneStepBackward()]
			      }

			      // jump
			      if (jump) {
			        const params = jump[1].split(',').map((s) => s.trim().toLowerCase());
			        const x = parseInt(params[0]);
			        const y = parseInt(params[1]);

			        return [getJump(x, y)]
			      }

			      // mc wait
			      if (mc_wait) {
			        const params = mc_wait[1].split(',').map((s) => s.trim().toLowerCase());
			        const wait = parseInt(params[0]);

			        return [getMoveWait(wait)]
			      }

			      // turn down
			      if (turn_down) {
			        return [getTurnDown()]
			      }

			      // turn left
			      if (turn_left) {
			        return [getTurnLeft()]
			      }

			      // turn right
			      if (turn_right) {
			        return [getTurnRight()]
			      }

			      // turn up
			      if (turn_up) {
			        return [getTurnUp()]
			      }

			      // turn 90 left
			      if (turn_90_left) {
			        return [getTurn90Left()]
			      }

			      // turn 90 right
			      if (turn_90_right) {
			        return [getTurn90Right()]
			      }

			      // turn 180
			      if (turn_180) {
			        return [getTurn180()]
			      }

			      // turn 90 right or left
			      if (turn_90_right_or_left) {
			        return [getTurn90RightorLeft()]
			      }

			      // turn at random
			      if (turn_at_random) {
			        return [getTurnAtRandom()]
			      }

			      // turn toward Player
			      if (turn_toward_Player) {
			        return [getTurnTowardPlayer()]
			      }

			      // turn away from player
			      if (turn_away_from_player) {
			        return [getTurnAwayFromPlayer()]
			      }

			      // switch on
			      if (switch_on) {
			        const params = switch_on[1].split(',').map((s) => s.trim().toLowerCase());
			        const switchId = parseInt(params[0]);

			        return [getSwitchOn(switchId)]
			      }

			      // switch off
			      if (switch_off) {
			        const params = switch_off[1].split(',').map((s) => s.trim().toLowerCase());
			        const switchId = parseInt(params[0]);

			        return [getSwitchOff(switchId)]
			      }

			      // change speed
			      if (change_speed) {
			        const params = change_speed[1].split(',').map((s) => s.trim().toLowerCase());
			        const speed = getSpeedValue(params[0]);

			        return [getChangeSpeed(speed)]
			      }

			      // change frequency
			      if (change_frequency) {
			        const params = change_frequency[1].split(',').map((s) => s.trim().toLowerCase());
			        const frequency = getFrequencyValue(params[0]);

			        return [getChangeFrequency(frequency)]
			      }

			      // walking animation on
			      if (walking_animation_on) {
			        return [getWalkingAnimationOn()]
			      }

			      // walking animation off
			      if (walking_animation_off) {
			        return [getWalkingAnimationOff()]
			      }

			      // stepping_animation_on
			      if (stepping_animation_on) {
			        return [getSteppingAnimationOn()]
			      }

			      // stepping_animation_off
			      if (stepping_animation_off) {
			        return [getSteppingAnimationOff()]
			      }

			      // direction fix on
			      if (direction_fix_on) {
			        return [getDirectionFixOn()]
			      }

			      // direction fix off
			      if (direction_fix_off) {
			        return [getDirectionFixOff()]
			      }

			      // through On
			      if (through_On) {
			        return [getThroughOn()]
			      }

			      // through Off
			      if (through_Off) {
			        return [getThroughOff()]
			      }

			      // transparent on
			      if (transparent_on) {
			        return [getTransparentOn()]
			      }

			      // transparent off
			      if (transparent_off) {
			        return [getTransparentOff()]
			      }

			      // change image
			      if (change_image) {
			        const params = change_image[1].split(',').map((s) => s.trim());
			        const image = weatherNoneList.includes(params[0].toLowerCase()) ? '' : params[0];
			        const imageId = params[1] === undefined ? 0 : parseInt(params[1]);

			        return [getChangeImage(image, imageId)]
			      }

			      // change opacity
			      if (change_opacity) {
			        const params = change_opacity[1].split(',').map((s) => s.trim().toLowerCase());
			        const opacity = parseInt(params[0]);

			        return [getChangeOpacity(opacity)]
			      }

			      // change blend mode
			      if (change_blend_mode) {
			        const params = change_blend_mode[1].split(',').map((s) => s.trim().toLowerCase());
			        const blendMode = getBlendModeValue(params[0]);

			        return [getChangeBlendMode(blendMode)]
			      }

			      // mc play se
			      if (mc_play_se) {
			        if (mc_play_se[1]) {
			          const params = mc_play_se[1].replace(/ /g, '').split(',');
			          let name = 'Attack1';
			          let volume = 90;
			          let pitch = 100;
			          let pan = 0;
			          if (params[0]) {
			            name = params[0];
			          }
			          if (Number(params[1]) || Number(params[1]) === 0) {
			            volume = Number(params[1]);
			          }
			          if (Number(params[2]) || Number(params[2]) === 0) {
			            pitch = Number(params[2]);
			          }
			          if (Number(params[3]) || Number(params[3]) === 0) {
			            pan = Number(params[3]);
			          }
			          if (name.toUpperCase() === 'NONE' || name === 'なし') {
			            return [getMcPlaySeEvent('', volume, pitch, pan)]
			          } else {
			            return [getMcPlaySeEvent(name, volume, pitch, pan)]
			          }
			        }
			      }

			      // mc script
			      if (mc_script) {
			        // スクリプト本文は verbatim(カンマ分割や小文字化をしない。JS式に , や
			        // 大文字が含まれるため、従来の split(',')+toLowerCase は内容を破壊していた)。
			        const script = mc_script[1].trim();

			        return [getMoveScript(script)]
			      }

			      // get on off vehicle
			      if (get_on_off_vehicle) {
			        return [getOnOffVehicle()]
			      }

			      // change transparency
			      if (change_transparency) {
			        const params = change_transparency[1].split(',').map((s) => s.trim().toLowerCase());
			        const transparency = getOnOffRadioButtonValue(params[0]);

			        return [getChangeTransparency(transparency)]
			      }

			      // change player followers
			      if (change_player_followers) {
			        const params = change_player_followers[1].split(',').map((s) => s.trim().toLowerCase());
			        const playerFollowers = getOnOffRadioButtonValue(params[0]);

			        return [getChangePlayerFollowers(playerFollowers)]
			      }

			      // gather Followers
			      if (gather_followers) {
			        return [getGatherFollowers()]
			      }

			      // show animation
			      if (show_animation) {
			        const params = show_animation[1].split(',').map((s) => s.trim().toLowerCase());
			        const character = getCharacterValue(params[0]);
			        const animationId = parseInt(params[1]);
			        const waitForCompletion = params[2] === undefined ? false : getCheckBoxValue(params[2]);

			        return [getShowAnimation(character, animationId, waitForCompletion)]
			      }

			      // show balloon icon
			      if (show_balloon_icon) {
			        const params = show_balloon_icon[1].split(',').map((s) => s.trim().toLowerCase());
			        const character = getCharacterValue(params[0]);
			        const balloonIcon = getBalloonIconValue(params[1]);
			        const waitForCompletion = params[2] === undefined ? false : getCheckBoxValue(params[2]);

			        return [getShowBalloonIcon(character, balloonIcon, waitForCompletion)]
			      }

			      // erase event
			      if (erase_event) {
			        return [getEraseEvent()]
			      }

			      // tint screen
			      if (tint_screen) {
			        const params = tint_screen[1].split(',').map((s) => s.trim());
			        if (params.length > 0) {
			          const options = params;
			          return [getTintScreen(options)]
			        } else {
			          console.error(text);
			          throw new Error('Syntax error. / 文法エラーです。' + text.replace(/</g, '  ').replace(/>/g, '  '))
			        }
			      }

			      // flash screen
			      if (flash_screen) {
			        const params = flash_screen[1].split(',').map((s) => s.trim().toLowerCase());
			        const red = parseInt(params[0]);
			        const green = parseInt(params[1]);
			        const blue = parseInt(params[2]);
			        const intensity = parseInt(params[3]);
			        const frames = parseInt(params[4]);
			        const waitForCompletion = params[5] === undefined ? false : getCheckBoxValue(params[5]);

			        return [getFlashScreen(red, green, blue, intensity, frames, waitForCompletion)]
			      }

			      // shake screen
			      if (shake_screen) {
			        const params = shake_screen[1].split(',').map((s) => s.trim().toLowerCase());
			        const power = parseInt(params[0]);
			        const speed = parseInt(params[1]);
			        const frames = parseInt(params[2]);
			        const waitForCompletion = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getShakeScreen(power, speed, frames, waitForCompletion)]
			      }

			      // set weather effect
			      if (set_weather_effect) {
			        const params = set_weather_effect[1].split(',').map((s) => s.trim().toLowerCase());
			        const type = getWeatherTypeValue(params[0]);
			        const power = parseInt(params[1]);
			        const frames = parseInt(params[2]);
			        const waitForCompletion = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getSetWeatherEffect(type, power, frames, waitForCompletion)]
			      }

			      // play movie
			      if (play_movie) {
			        const params = play_movie[1].split(',').map((s) => s.trim());
			        const fileName = weatherNoneList.includes(params[0].toLowerCase()) ? '' : params[0];

			        return [getPlayMovie(fileName)]
			      }

			      // battle processing
			      if (battle_processing) {
			        const params = battle_processing[1].split(',').map((s) => s.trim().toLowerCase());
			        const { troop, troopValue } = getTroopValue(params[0]);

			        return [getBattleProcessing(troop, troopValue)]
			      }

			      // if win
			      if (if_win) {
			        return [getIfWin()]
			      }

			      // if escape
			      if (if_escape) {
			        return [getIfEscape()]
			      }

			      // if lose
			      if (if_lose) {
			        return [getIfLose()]
			      }

			      // name input processing
			      if (name_input_processing) {
			        const params = name_input_processing[1].split(',').map((s) => s.trim().toLowerCase());
			        const actorId = parseInt(params[0]);
			        const maxCharacter = parseInt(params[1]);

			        return [getNameInputProcessing(actorId, maxCharacter)]
			      }

			      // shop processing
			      if (shop_processing) {
			        const params = shop_processing[1].split(',').map((s) => s.trim().toLowerCase());
			        const purchaseOnly = params[0] === '' ? false : getCheckBoxValue(params[0]);

			        return [getShopProcessing(purchaseOnly)]
			      }

			      // merchandise
			      if (merchandise) {
			        const params = merchandise[1].split(',').map((s) => s.trim().toLowerCase());
			        const merchandiseType = getMerchandiseType(params[0]);
			        const merchandiseId = parseInt(params[1]);
			        const { price, priceValue } = params[2] === undefined ? { price: 0, priceValue: 0 } : getPriceValue(params[2]);

			        return [getMerchandise(merchandiseType, merchandiseId, price, priceValue)]
			      }

			      // open menu screen
			      if (open_menu_screen) {
			        return [getOpenMenuScreen()]
			      }

			      // open save screen
			      if (open_save_screen) {
			        return [getOpenSaveScreen()]
			      }

			      // game over
			      if (game_over) {
			        return [getGameOver()]
			      }

			      // return to title screen
			      if (return_to_title_screen) {
			        return [getReturnToTitleScreen()]
			      }

			      // change victory me
			      if (change_victory_me) {
			        const params = change_victory_me[1].split(',').map((s) => s.trim());
			        const name = weatherNoneList.includes(params[0].toLowerCase()) ? '' : params[0];
			        const volume = params[1] === undefined ? 90 : parseInt(params[1]);
			        const pitch = params[2] === undefined ? 100 : parseInt(params[2]);
			        const pan = params[3] === undefined ? 0 : parseInt(params[3]);

			        return [getChangeVictoryMe(name, volume, pitch, pan)]
			      }

			      // change defeat me
			      if (change_defeat_me) {
			        const params = change_defeat_me[1].split(',').map((s) => s.trim());
			        const name = weatherNoneList.includes(params[0].toLowerCase()) ? '' : params[0];
			        const volume = params[1] === undefined ? 90 : parseInt(params[1]);
			        const pitch = params[2] === undefined ? 100 : parseInt(params[2]);
			        const pan = params[3] === undefined ? 0 : parseInt(params[3]);

			        return [getChangeDefeatMe(name, volume, pitch, pan)]
			      }

			      // change vehicle bgm
			      if (change_vehicle_bgm) {
			        const params = change_vehicle_bgm[1].split(',').map((s) => s.trim());
			        const vehicle = getVehicleValue(params[0].toLowerCase());
			        const name = weatherNoneList.includes(params[1].toLowerCase()) ? '' : params[1];
			        const volume = params[2] === undefined ? 90 : parseInt(params[2]);
			        const pitch = params[3] === undefined ? 100 : parseInt(params[3]);
			        const pan = params[4] === undefined ? 0 : parseInt(params[4]);

			        return [getChangeVehicleBgm(vehicle, name, volume, pitch, pan)]
			      }

			      // change save access
			      if (change_save_access) {
			        const params = change_save_access[1].split(',').map((s) => s.trim().toLowerCase());
			        const save = getDisableEnableRadioButtonValue(params[0]);

			        return [getChangeSaveAccess(save)]
			      }

			      // change menu access
			      if (change_menu_access) {
			        const params = change_menu_access[1].split(',').map((s) => s.trim().toLowerCase());
			        const menu = getDisableEnableRadioButtonValue(params[0]);

			        return [getChangeMenuAccess(menu)]
			      }

			      // change encounter
			      if (change_encounter) {
			        const params = change_encounter[1].split(',').map((s) => s.trim().toLowerCase());
			        const encounter = getDisableEnableRadioButtonValue(params[0]);

			        return [getChangeEncounter(encounter)]
			      }

			      // change formation access
			      if (change_formation_access) {
			        const params = change_formation_access[1].split(',').map((s) => s.trim().toLowerCase());
			        const formation = getDisableEnableRadioButtonValue(params[0]);

			        return [getChangeFormationAccess(formation)]
			      }

			      // change window color
			      if (change_window_color) {
			        const params = change_window_color[1].split(',').map((s) => s.trim().toLowerCase());
			        const red = parseInt(params[0]);
			        const green = parseInt(params[1]);
			        const blue = parseInt(params[2]);

			        return [getChangeWindowColor(red, green, blue)]
			      }

			      // change actor images
			      if (change_actor_images) {
			        const params = change_actor_images[1].split(',').map((s) => s.trim());
			        const actorId = parseInt(params[0]);
			        const faceName = weatherNoneList.includes(params[1].toLowerCase()) ? '' : String(params[1]);
			        const faceId = parseInt(params[2]);
			        const characterName = weatherNoneList.includes(params[3].toLowerCase()) ? '' : String(params[3]);
			        const characterId = parseInt(params[4]);
			        const battlerName = weatherNoneList.includes(params[5].toLowerCase()) ? '' : String(params[5]);

			        return [getChangeActorImages(actorId, faceName, faceId, characterName, characterId, battlerName)]
			      }

			      // change vehicle image
			      if (change_vehicle_image) {
			        const params = change_vehicle_image[1].split(',').map((s) => s.trim());
			        const vehicle = getVehicleValue(params[0].toLowerCase());
			        const vehicleName = weatherNoneList.includes(params[1].toLowerCase()) ? '' : String(params[1]);
			        const vehicleId = params[2] === undefined ? 0 : parseInt(params[2]);

			        return [getChangeVehicleImage(vehicle, vehicleName, vehicleId)]
			      }

			      // change map name display
			      if (change_map_name_display) {
			        const params = change_map_name_display[1].split(',').map((s) => s.trim().toLowerCase());
			        const mapNameDisplay = getOnOffRadioButtonValue(params[0]);

			        return [getChangeMapNameDisplay(mapNameDisplay)]
			      }

			      // change tileset
			      if (change_tileset) {
			        const params = change_tileset[1].split(',').map((s) => s.trim().toLowerCase());
			        const tilesetId = parseInt(params[0]);

			        return [getChangeTileset(tilesetId)]
			      }

			      // change battle background
			      if (change_battle_background) {
			        const params = change_battle_background[1].split(',').map((s) => s.trim());
			        const battleBackGround1 = weatherNoneList.includes(params[0].toLowerCase()) ? '' : String(params[0]);
			        const battleBackGround2 = weatherNoneList.includes(params[1].toLowerCase()) ? '' : String(params[1]);

			        return [getChangeBattleBackGround(battleBackGround1, battleBackGround2)]
			      }

			      // change parallax
			      if (change_parallax) {
			        const params = change_parallax[1].split(',').map((s) => s.trim());
			        const image = weatherNoneList.includes(params[0].toLowerCase()) ? '' : String(params[0]);
			        // オプション1(params[1])とオプション2(params[2])を正規表現で取得
			        const regex = /(.*?)\[(-?\d+)]/;
			        const matches1 = params[1] === undefined ? undefined : params[1].match(regex);
			        const matches2 = params[2] === undefined ? undefined : params[2].match(regex);

			        let loopHorizontally = false;
			        let loopVertically = false;
			        let loopHorizontallyScroll = 0;
			        let loopVerticallyScroll = 0;

			        // オプション1の引数を反映
			        if (matches1 !== undefined) {
			          if (checkBoxLoopHorizontallyList.includes(matches1[1].toLowerCase())) {
			            loopHorizontally = true;
			            loopHorizontallyScroll = parseInt(matches1[2]);
			          } else if (checkBoxLoopVerticallyList.includes(matches1[1].toLowerCase())) {
			            loopVertically = true;
			            loopVerticallyScroll = parseInt(matches1[2]);
			          }
			        }

			        // オプション2の引数を反映
			        if (matches2 !== undefined) {
			          if (checkBoxLoopHorizontallyList.includes(matches2[1].toLowerCase())) {
			            loopHorizontally = true;
			            loopHorizontallyScroll = parseInt(matches2[2]);
			          } else if (checkBoxLoopVerticallyList.includes(matches2[1].toLowerCase())) {
			            loopVertically = true;
			            loopVerticallyScroll = parseInt(matches2[2]);
			          }
			        }

			        return [getChangeParallax(image, loopHorizontally, loopVertically, loopHorizontallyScroll, loopVerticallyScroll)]
			      }

			      // get_location_info
			      if (get_location_info) {
			        const params = get_location_info[1].split(',').map((s) => s.trim().toLowerCase());
			        const variableId = parseInt(params[0]);
			        const infoType = getLocationInfoTypeValue(params[1]);

			        // 位置(params[2])を正規表現で取得
			        const regex = /^(.*?)\[(.*?)](\[(\d+)])?/;
			        const matches = params[2].match(regex);
			        // 取得チェック
			        if (!matches) throw new Error('Syntax error. / 文法エラーです。:' + params[2])
			        const { locationType, locationX, locationY } = getLocationEvent(matches[1], matches[2], matches[4]);

			        return [getGetLocationInfo(variableId, infoType, locationType, locationX, locationY)]
			      }

			      // change enemy hp
			      if (change_enemy_hp) {
			        const params = change_enemy_hp[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);
			        const allowDeath = params[3] === undefined ? false : getCheckBoxValue(params[3]);

			        return [getChangeEnemyHp(enemy, operation, operand, operandValue, allowDeath)]
			      }

			      // change enemy mp
			      if (change_enemy_mp) {
			        const params = change_enemy_mp[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);

			        return [getChangeEnemyMp(enemy, operation, operand, operandValue)]
			      }

			      // change enemy tp
			      if (change_enemy_tp) {
			        const params = change_enemy_tp[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);
			        const operation = getIncreaseOrDecrease(params[1]);
			        const { operand, operandValue } = getConstantOrVariable(params[2]);

			        return [getChangeEnemyTp(enemy, operation, operand, operandValue)]
			      }

			      // change enemy state
			      if (change_enemy_state) {
			        const params = change_enemy_state[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);
			        const operation = getAddOrRemove(params[1]);
			        const stateId = parseInt(params[2]);

			        return [getChangeEnemyState(enemy, operation, stateId)]
			      }

			      // enemy recover all
			      if (enemy_recover_all) {
			        const params = enemy_recover_all[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);

			        return [getEnemyRecoverAll(enemy)]
			      }

			      // enemy appear
			      if (enemy_appear) {
			        const params = enemy_appear[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);

			        return [getEnemyAppear(enemy)]
			      }

			      // enemy transform
			      if (enemy_transform) {
			        const params = enemy_transform[1].split(',').map((s) => s.trim().toLowerCase());
			        const enemy = getEnemyTargetValue(params[0]);
			        const transformToEnemyId = parseInt(params[1]);

			        return [getEnemyTransform(enemy, transformToEnemyId)]
			      }

			      // show battle animation
			      if (show_battle_animation) {
			        const params = show_battle_animation[1].split(',').map((s) => s.trim().toLowerCase());
			        const { enemyValue, isAllChecked } = getTargetEnemyMultipleValues(params[0]);
			        const animationId = parseInt(params[1]);

			        return [getShowBattleAnimation(enemyValue, animationId, isAllChecked)]
			      }

			      // force action
			      if (force_action) {
			        const params = force_action[1].split(',').map((s) => s.trim().toLowerCase());
			        const { subject, subjectValue } = getEnemyOrActor(params[0]);
			        const skillId = parseInt(params[1]);
			        const target = getActionTarget(params[2]);

			        return [getForceAction(subject, subjectValue, skillId, target)]
			      }

			      // abort battle
			      if (abort_battle) {
			        return [getAbortBattle()]
			      }

			      // 空のメッセージ行マーカー。decompile が空401を <br> として出力する。
			      // 通常のテキスト行(401)と同じ経路に乗せ、空文字の401として復元する。
			      if (text.match(/^\s*<br>\s*$/i)) {
			        return [getTextFrameEvent('')]
			      }

			      // ASCII の半角スペース/タブ「のみ」の行はインデント/区切りとして無視するが、
			      // 全角スペース(U+3000)等「見える空白」を含む行は本文として保持する
			      // (従来の \S 判定は U+3000 を空白扱いして本文を脱落させていた)。
			      if (/[^ \t]/.test(text)) {
			        logger.log('push: ', text);
			        event_command_list.push(getTextFrameEvent(text));
			      }
			      return event_command_list
			    };

			    const getEvents = function (text, previous_text, window_frame, previous_frame, block_stack, block_map) {
			      let event_command_list = [];
			      const events = _getEvents(text, window_frame, block_stack, block_map);
			      const PRE_CODE = 101;
			      const CHOICE_CODE = 102;
			      const TEXT_CODE = 401;
			      const WHEN_CODE = 402;
			      const WHEN_CANCEL_CODE = 403;
			      const IF_CODE = 111;
			      const SHOP_PROCESSING_CODE = 302;
			      const MERCHANDISE_CODE = 605;
			      const IF_END_CODE = getEnd().code;
			      const CHOICE_END_CODE = getShowChoiceEnd().code;
			      const IF_IFEND_CODE = getIfEnd().code;
			      const BATTLE_PROCESSING_CODE = 301;
			      const IF_WIN_CODE = 601;
			      const IF_ESCAPE_CODE = 602;
			      const IF_LOSE_CODE = 603;
			      const MOVEMENT_ROUTE_CODE = 205;
			      const MOVEMENT_COMMANDS_CODE = 505;

			      // --- ブロックノード(選択肢/分岐/戦闘/移動ルート)の小さな型付きモデル ---
			      // block_stack の各要素は { code, event, indent, ...(index|winCode) }。種別(code)で
			      // 入れ子を判別する。requireTopBlock は「親を書き換える」構文(When/WhenCancel/戦闘分岐)
			      // の不変条件検証に使う。ループ/BreakLoop 等の「単に出力するだけ」の構文は、テキスト
			      // コンパイラが意図的に寛容なため強制しない(タグ単体での変換も許す)。
			      const topBlock = () => block_stack[block_stack.length - 1];
			      const requireTopBlock = (codes, tag) => {
			        const top = topBlock();
			        if (!top || codes.indexOf(top.code) === -1) {
			          throw new Error('Syntax error. / 文法エラーです。\n' + tag + ' に対応する開始タグがありません。')
			        }
			        return top
			      };
			      const pushBlock = (event, extra) => {
			        block_stack.push(Object.assign({ code: event.code, event, indent: block_stack.length }, extra || {}));
			      };

			      // イベントコマンド追加
			      events.forEach((current_frame) => {
			        if (
			          current_frame.code === IF_END_CODE ||
			          current_frame.code === CHOICE_END_CODE ||
			          current_frame.code === IF_IFEND_CODE
			        ) {
			          block_stack.pop();
			        }
			      });

			      if (Array.isArray(events) && events.length > 0) {
			        if (events.length > 1) {
			          // 一行に複数書かれている
			          event_command_list = event_command_list.concat(events);
			          return { window_frame: null, event_command_list, block_stack }
			        }
			        const current_frame = events[0];

			        // 移動ルート(205)は明示的な終了タグが無く、後続の505のみを取り込む。
			        // 505以外のフレームが来たらスタックに残った205を閉じる(でないと後続の
			        // <When>等がスタック最上位を205と誤認して落ちる)。
			        const top_block = block_stack.slice(-1)[0];
			        if (
			          top_block &&
			          top_block.code === MOVEMENT_ROUTE_CODE &&
			          current_frame.code !== MOVEMENT_COMMANDS_CODE
			        ) {
			          block_stack.pop();
			        }

			        if (current_frame.code === PRE_CODE) {
			          // 401になるまで遅延する
			          window_frame = current_frame;
			          return { window_frame, event_command_list, block_stack }
			        }

			        if (current_frame.code === TEXT_CODE) {
			          if (previous_frame) {
			            if (previous_frame.code === TEXT_CODE) {
			              // 空行でwindow frameを初期化
			              if (previous_text === '') {
			                event_command_list.push(getPretextEvent());
			              }
			            } else if (previous_frame.code === PRE_CODE) {
			              // stackに積んだframeを挿入する
			              event_command_list.push(window_frame);
			            } else {
			              // window frameを初期化
			              event_command_list.push(getPretextEvent());
			            }
			          } else {
			            event_command_list.push(getPretextEvent());
			          }
			        } else if (current_frame.code === WHEN_CODE) {
			          // <When> は選択肢(102)の中にのみ置ける。
			          const choice = requireTopBlock([CHOICE_CODE], '<When>');
			          if (choice.index !== 0) {
			            event_command_list.push(getBlockEnd());
			          }
			          current_frame.parameters[0] = choice.index;
			          choice.index += 1;
			          // 選択肢文字列を ShowChoices の parameters[0](配列)へ追加。
			          if (Array.isArray(choice.event.parameters[0])) {
			            choice.event.parameters[0].push(current_frame.parameters[1]);
			          }
			        } else if (current_frame.code === WHEN_CANCEL_CODE) {
			          // <WhenCancel> も選択肢(102)の中にのみ置ける。
			          const choice = requireTopBlock([CHOICE_CODE], '<WhenCancel>');
			          if (choice.index !== 0) {
			            event_command_list.push(getBlockEnd());
			          }
			          choice.index += 1;
			        } else if (current_frame.code === IF_WIN_CODE) {
			          // 戦闘処理(301)の勝利分岐。
			          requireTopBlock([BATTLE_PROCESSING_CODE], '戦闘の勝利分岐').winCode = true;
			        } else if (current_frame.code === IF_ESCAPE_CODE) {
			          // 戦闘処理(301)の逃走分岐。WIN が未出現なら補う。
			          const battle = requireTopBlock([BATTLE_PROCESSING_CODE], '戦闘の逃走分岐');
			          if (battle.winCode === false) {
			            event_command_list.push(getIfWin());
			            battle.winCode = true;
			          }
			          event_command_list.push(getBlockEnd());
			          battle.event.parameters[2] = true;
			        } else if (current_frame.code === IF_LOSE_CODE) {
			          // 戦闘処理(301)の敗北分岐。WIN が未出現なら補う。
			          const battle = requireTopBlock([BATTLE_PROCESSING_CODE], '戦闘の敗北分岐');
			          if (battle.winCode === false) {
			            event_command_list.push(getIfWin());
			            battle.winCode = true;
			          }
			          event_command_list.push(getBlockEnd());
			          battle.event.parameters[3] = true;
			        } else if (current_frame.code === CHOICE_CODE) {
			          pushBlock(current_frame, { index: 0 });
			        } else if (current_frame.code === IF_CODE) {
			          pushBlock(current_frame, { index: 0 });
			        } else if (current_frame.code === BATTLE_PROCESSING_CODE) {
			          pushBlock(current_frame, { winCode: false });
			        } else if (current_frame.code === MOVEMENT_ROUTE_CODE) {
			          pushBlock(current_frame);
			        }

			        // ショップの処理
			        if (current_frame.code === MERCHANDISE_CODE) {
			          // 最初のCODE605の商品のみCODE302に反映し、CODE605を削除 ※商品ID0で判断する
			          // (2件目以降の605は previous_frame が605になるため何もしない。先頭フレーム等で
			          //  previous_frame が無い場合に落ちないようガードする。)
			          if (previous_frame && previous_frame.code === SHOP_PROCESSING_CODE && previous_frame.parameters[1] === 0) {
			            // 商品タイプ,商品ID,価格タイプ,価格を反映
			            previous_frame.parameters[0] = current_frame.parameters[0];
			            previous_frame.parameters[1] = current_frame.parameters[1];
			            previous_frame.parameters[2] = current_frame.parameters[2];
			            previous_frame.parameters[3] = current_frame.parameters[3];
			            events.pop();
			          }
			        }

			        // 移動ルートの設定: 505 は移動ルート(205)の内側のときだけ親へ取り込む。
			        // (寛容: 205 が無い場合は何もしない。スタックが空でも落ちないようガードする。)
			        if (current_frame.code === MOVEMENT_COMMANDS_CODE) {
			          const top = topBlock();
			          if (top && top.code === MOVEMENT_ROUTE_CODE) {
			            const current_movement_route = top.event;
			            // 205 => parameters => list配下に移動コマンドのparametersを追加
			            // (イベントエディターの表示用の値に使用されている模様)
			            // list配下のcode0を一旦削除し、移動コマンドのparametersを追加した後に再度追加
			            const movement_command_parameters = current_frame.parameters[0];
			            const movement_command_end = current_movement_route.parameters[1].list.pop();
			            current_movement_route.parameters[1].list.push(movement_command_parameters);
			            current_movement_route.parameters[1].list.push(movement_command_end);
			          }
			        }

			        event_command_list = event_command_list.concat(events);
			      }
			      return { window_frame: null, event_command_list, block_stack }
			    };

			    const autoIndent = function (events) {
			      const BOTTOM_CODE = 0;
			      const IF_CODE = 111;
			      const ELSE_CODE = 411;
			      const LOOP_CODE = 112;
			      const WHEN_CODE = 402;
			      const WHEN_CANCEL_CODE = 403;
			      const SKIP_CODE = 109;
			      // イベントコマンド追加
			      const IF_WIN_CODE = 601;
			      const IF_ESCAPE_CODE = 602;
			      const IF_LOSE_CODE = 603;

			      const out_events = events.reduce((o, e) => {
			        const parameters = JSON.parse(JSON.stringify(e.parameters));
			        let now_indent = 0;

			        const last = o.slice(-1)[0];
			        if (last !== undefined) {
			          now_indent = last.indent;
			          switch (last.code) {
			            case IF_CODE:
			            case ELSE_CODE:
			            case LOOP_CODE:
			            case WHEN_CODE:
			            case SKIP_CODE:
			            case IF_WIN_CODE:
			            case IF_ESCAPE_CODE:
			            case IF_LOSE_CODE:
			            case WHEN_CANCEL_CODE: {
			              now_indent += 1;
			              break
			            }
			            case BOTTOM_CODE:
			              now_indent -= 1;
			              break
			          }
			        }
			        o.push({ code: e.code, indent: now_indent, parameters });
			        return o
			      }, []);

			      return out_events
			    };

			    const compile = function (text) {
			      let scenario_text = uniformNewLineCode(text);
			      scenario_text = eraseCommentOutLines(scenario_text, Laurus.Text2Frame.CommentOutChar);
			      let block_map = {};

			      ['script', 'comment', 'scrolling'].forEach(function (block_name) {
			        const t = getBlockStatement(scenario_text, block_name);
			        scenario_text = t.scenario_text;
			        block_map = Object.assign(block_map, t.block_map);
			      });

			      const text_lines = scenario_text.split('\n');
			      let event_command_list = [];
			      let previous_text = '';
			      let window_frame = null;
			      let block_stack = [];
			      for (let i = 0; i < text_lines.length; i++) {
			        const text = text_lines[i];

			        if (text) {
			          let previous_frame = window_frame;
			          if (previous_frame === null) {
			            previous_frame = event_command_list.slice(-1)[0];
			          }
			          let return_obj;
			          try {
			            return_obj = getEvents(text, previous_text, window_frame, previous_frame, block_stack, block_map);
			          } catch (e) {
			            // 文法エラーに行情報を付与(エディタ拡張が該当行に下線を引くため)。
			            if (e && e.t2fLine === undefined) {
			              e.t2fLine = i;
			              e.t2fLineText = text;
			              e.message = e.message + '\n(line ' + (i + 1) + ': ' + text + ')';
			            }
			            throw e
			          }
			          window_frame = return_obj.window_frame;
			          const new_event_command_list = return_obj.event_command_list;
			          block_stack = return_obj.block_stack;
			          event_command_list = event_command_list.concat(new_event_command_list);
			        }
			        logger.log(i, text);
			        previous_text = text;
			      }

			      event_command_list = completeLackedBottomEvent(event_command_list);
			      event_command_list = autoIndent(event_command_list);
			      return event_command_list
			    };

			    /* LCS (最長共通部分列) テーブルを計算する */
			    const lcsTable = function (a, b) {
			      const m = a.length;
			      const n = b.length;
			      const table = [];
			      for (let i = 0; i <= m; i++) {
			        const row = [];
			        for (let j = 0; j <= n; j++) {
			          row.push(0);
			        }
			        table.push(row);
			      }
			      for (let i = 1; i <= m; i++) {
			        for (let j = 1; j <= n; j++) {
			          if (JSON.stringify(a[i - 1]) === JSON.stringify(b[j - 1])) {
			            table[i][j] = table[i - 1][j - 1] + 1;
			          } else {
			            table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
			          }
			        }
			      }
			      return table
			    };

			    /* LCS テーブルから差分リストをビルドする */
			    const buildDiffFromTable = function (table, a, b) {
			      const diff = [];
			      let i = a.length;
			      let j = b.length;
			      while (i > 0 || j > 0) {
			        if (i === 0) {
			          diff.unshift({ type: 'added', block: b[j - 1] });
			          j--;
			        } else if (j === 0) {
			          diff.unshift({ type: 'removed', block: a[i - 1] });
			          i--;
			        } else if (JSON.stringify(a[i - 1]) === JSON.stringify(b[j - 1])) {
			          diff.unshift({ type: 'equal', block: a[i - 1] });
			          i--;
			          j--;
			        } else if (table[i - 1][j] >= table[i][j - 1]) {
			          diff.unshift({ type: 'removed', block: a[i - 1] });
			          i--;
			        } else {
			          diff.unshift({ type: 'added', block: b[j - 1] });
			          j--;
			        }
			      }
			      return diff
			    };

			    // 反映方式は merge(既定・構造保持の賢い反映) / overwrite(全上書き) の2つ。未指定は merge。未知は null。
			    const resolveStrategy = function (name) {
			      const s = String(name == null ? 'merge' : name).toLowerCase();
			      if (s === 'merge') return { strategy: 'merge' }
			      if (s === 'overwrite') return { strategy: 'overwrite' }
			      return null
			    };

			    /* 翻訳オーバーレイ: existing(JSON)を「構造の正」とし、new(テキスト)側の会話文字列だけを
			     * 対応スロットへ差し替える。移動/分岐/スイッチ等の非会話コマンドは一切変更しない。
			     * スロット種別の並びを LCS で対応付け、対応が取れた分だけ差し替え、余りは警告する。
			     * 戻り値: { commands: 適用後(終端コードなし), warnings }。 */
			    const applyOverlay = function (existing_commands, new_commands) {
			      const stripBottom = function (cmds) {
			        const copy = cmds.slice();
			        while (copy.length > 0 && copy[copy.length - 1] && copy[copy.length - 1].code === 0) {
			          copy.pop();
			        }
			        return copy
			      };
			      const PREVIEW = 60;
			      const preview = function (s) { const t = String(s); return t.length > PREVIEW ? t.slice(0, PREVIEW) + '...' : t };
			      const result = JSON.parse(JSON.stringify(stripBottom(existing_commands)));

			      // 会話系スロットを出現順に抽出。101 の名前(param[4])は MZ(5引数)のときだけ対象。
			      const slotsOf = function (cmds) {
			        const slots = [];
			        for (let i = 0; i < cmds.length; i++) {
			          const c = cmds[i];
			          if (!c || !Array.isArray(c.parameters)) continue
			          if (c.code === 401) slots.push({ kind: 'text', i, param: 0 });
			          else if (c.code === 405) slots.push({ kind: 'scroll', i, param: 0 });
			          else if (c.code === 402) slots.push({ kind: 'choice', i, param: 1 });
			          else if (c.code === 101 && c.parameters.length >= 5) slots.push({ kind: 'name', i, param: 4 });
			        }
			        return slots
			      };
			      const exSlots = slotsOf(result);
			      const newSlots = slotsOf(new_commands);

			      // スロット種別列を LCS で対応付け(lcsTable/buildDiffFromTable を再利用)。
			      const a = exSlots.map(function (s) { return s.kind });
			      const b = newSlots.map(function (s) { return s.kind });
			      const diff = buildDiffFromTable(lcsTable(a, b), a, b);

			      const warnings = [];
			      let ei = 0;
			      let ni = 0;
			      for (let di = 0; di < diff.length; di++) {
			        const t = diff[di].type;
			        if (t === 'equal') {
			          const es = exSlots[ei];
			          const ns = newSlots[ni];
			          result[es.i].parameters[es.param] = new_commands[ns.i].parameters[ns.param];
			          ei++;
			          ni++;
			        } else if (t === 'removed') {
			          const es = exSlots[ei];
			          warnings.push('Untranslated slot kept / 未対応で原文維持: ' + es.kind + ' "' + preview(result[es.i].parameters[es.param]) + '"');
			          ei++;
			        } else {
			          const ns = newSlots[ni];
			          warnings.push('Extra text ignored / テキスト側の余剰を無視: ' + ns.kind + ' "' + preview(new_commands[ns.i].parameters[ns.param]) + '"');
			          ni++;
			        }
			      }

			      // 選択肢(102)の表示配列 parameters[0] を、差し替え後の 402 ラベルから同一 indent 単位で再構築。
			      for (let i = 0; i < result.length; i++) {
			        if (result[i].code !== 102) continue
			        const depth = result[i].indent;
			        const labels = [];
			        for (let j = i + 1; j < result.length; j++) {
			          const cj = result[j];
			          if (cj.indent === depth && cj.code === 404) break
			          if (cj.indent === depth && cj.code === 402 && Array.isArray(cj.parameters)) labels.push(cj.parameters[1]);
			        }
			        if (labels.length > 0 && Array.isArray(result[i].parameters)) result[i].parameters[0] = labels;
			      }

			      return { commands: result, warnings }
			    };

			    /* コマンド列を「釣り合った単位」に分割する。制御構造(選択肢/条件分岐/ループ/戦闘/Skip)は
			     * 開始〜終了をまとめて1単位にし、3-way マージで入れ子を壊さないようにする。
			     * 葉(文章101+401、注釈108+408、スクロール105+405、スクリプト355+655、移動205+505)も1単位。 */
			    const BALANCED_OPENERS = { 102: 404, 111: 412, 112: 413, 301: 604, 109: 409 };
			    const BALANCED_CLOSERS = { 404: true, 412: true, 413: true, 604: true, 409: true };
			    const LEAF_CONTINUATIONS = { 101: [401], 108: [408], 105: [405], 355: [655], 205: [505] };
			    const groupIntoBalancedUnits = function (commands) {
			      const units = [];
			      let i = 0;
			      while (i < commands.length) {
			        const c = commands[i];
			        if (c && BALANCED_OPENERS[c.code] !== undefined) {
			          let depth = 0;
			          let j = i;
			          for (; j < commands.length; j++) {
			            const cc = commands[j];
			            if (cc && BALANCED_OPENERS[cc.code] !== undefined) depth++;
			            else if (cc && BALANCED_CLOSERS[cc.code]) depth--;
			            if (depth === 0) break
			          }
			          units.push(commands.slice(i, j + 1));
			          i = j + 1;
			        } else {
			          const conts = (c && LEAF_CONTINUATIONS[c.code]) || [];
			          let j = i;
			          while (j + 1 < commands.length && conts.indexOf(commands[j + 1].code) !== -1) j++;
			          units.push(commands.slice(i, j + 1));
			          i = j + 1;
			        }
			      }
			      return units
			    };

			    /* 3-way マージ(diff3 方式・両方残す)。base=共通祖先, ours=現JSON, theirs=テキスト。
			     * 釣り合った単位で base↔ours / base↔theirs を LCS 対応し、両方が同じ箇所を別々に変えた領域は
			     * 「衝突」として両方を残し 108 コメントで囲む(非破壊・常に valid)。
			     * 戻り値: { commands: 適用後(終端コードなし), conflicts: 件数, warnings }。 */
			    const applyThreeWayMerge = function (base_commands, ours_commands, theirs_commands) {
			      const stripBottom = function (cmds) {
			        const copy = cmds.slice();
			        while (copy.length > 0 && copy[copy.length - 1] && copy[copy.length - 1].code === 0) copy.pop();
			        return copy
			      };
			      const key = function (unit) { return JSON.stringify(unit) };
			      const B = groupIntoBalancedUnits(stripBottom(base_commands));
			      const O = groupIntoBalancedUnits(stripBottom(ours_commands));
			      const T = groupIntoBalancedUnits(stripBottom(theirs_commands));
			      const Bk = B.map(key);
			      const Ok = O.map(key);
			      const Tk = T.map(key);

			      const lcsPairs = function (a, b) {
			        const m = a.length;
			        const n = b.length;
			        const dp = [];
			        for (let x = 0; x <= m; x++) { const row = []; for (let y = 0; y <= n; y++) row.push(0); dp.push(row); }
			        for (let x = 1; x <= m; x++) {
			          for (let y = 1; y <= n; y++) dp[x][y] = a[x - 1] === b[y - 1] ? dp[x - 1][y - 1] + 1 : Math.max(dp[x - 1][y], dp[x][y - 1]);
			        }
			        const pairs = [];
			        let x = m;
			        let y = n;
			        while (x > 0 && y > 0) {
			          if (a[x - 1] === b[y - 1]) {
			            pairs.unshift([x - 1, y - 1]);
			            x--;
			            y--;
			          } else if (dp[x - 1][y] >= dp[x][y - 1]) {
			            x--;
			          } else {
			            y--;
			          }
			        }
			        return pairs
			      };
			      // side が base の [baseLo,baseHi) を side の [sideLo,sideHi) に変えた「ハンク」列(diff3 用)。
			      const diffHunks = function (baseKeys, sideKeys) {
			        const pairs = lcsPairs(baseKeys, sideKeys);
			        pairs.push([baseKeys.length, sideKeys.length]);
			        const hunks = [];
			        let bi = 0;
			        let si = 0;
			        for (const p of pairs) {
			          if (p[0] > bi || p[1] > si) hunks.push({ baseLo: bi, baseHi: p[0], sideLo: si, sideHi: p[1] });
			          bi = p[0] + 1;
			          si = p[1] + 1;
			        }
			        return hunks
			      };
			      const oH = diffHunks(Bk, Ok);
			      const tH = diffHunks(Bk, Tk);

			      const result = [];
			      const warnings = [];
			      let conflicts = 0;
			      const pushAll = function (units) { for (const u of units) for (const c of u) result.push(c); };
			      const pushComment = function (text, indent) { result.push({ code: 108, indent: indent || 0, parameters: [text] }); };
			      const keyOf = function (units) { return units.map(key).join('') };

			      let pos = 0;
			      let oi = 0;
			      let ti = 0;
			      while (pos < B.length || oi < oH.length || ti < tH.length) {
			        const oStart = oi < oH.length ? oH[oi].baseLo : Infinity;
			        const tStart = ti < tH.length ? tH[ti].baseLo : Infinity;
			        if (pos < oStart && pos < tStart) {
			          const stableEnd = Math.min(oStart, tStart, B.length);
			          if (stableEnd <= pos) break
			          for (; pos < stableEnd; pos++) pushAll([B[pos]]);
			          continue
			        }
			        let baseHi = pos;
			        let oLo = null;
			        let oHi = null;
			        let tLo = null;
			        let tHi = null;
			        if (oStart === pos) {
			          oLo = oH[oi].sideLo;
			          oHi = oH[oi].sideHi;
			          baseHi = Math.max(baseHi, oH[oi].baseHi);
			          oi++;
			        }
			        if (tStart === pos) {
			          tLo = tH[ti].sideLo;
			          tHi = tH[ti].sideHi;
			          baseHi = Math.max(baseHi, tH[ti].baseHi);
			          ti++;
			        }
			        let changed = true;
			        while (changed) {
			          changed = false;
			          if (oi < oH.length && oH[oi].baseLo < baseHi) {
			            if (oLo === null) oLo = oH[oi].sideLo;
			            oHi = oH[oi].sideHi;
			            baseHi = Math.max(baseHi, oH[oi].baseHi);
			            oi++;
			            changed = true;
			          }
			          if (ti < tH.length && tH[ti].baseLo < baseHi) {
			            if (tLo === null) tLo = tH[ti].sideLo;
			            tHi = tH[ti].sideHi;
			            baseHi = Math.max(baseHi, tH[ti].baseHi);
			            ti++;
			            changed = true;
			          }
			        }
			        const oReg = oLo !== null ? O.slice(oLo, oHi) : B.slice(pos, baseHi);
			        const tReg = tLo !== null ? T.slice(tLo, tHi) : B.slice(pos, baseHi);
			        if (oLo === null) {
			          pushAll(tReg);
			        } else if (tLo === null) {
			          pushAll(oReg);
			        } else if (keyOf(oReg) === keyOf(tReg)) {
			          pushAll(oReg);
			        } else {
			          conflicts++;
			          const ind = (tReg[0] && tReg[0][0] && tReg[0][0].indent) || (oReg[0] && oReg[0][0] && oReg[0][0].indent) || 0;
			          // 非エンジニアにも分かる日本語ラベル。タグ記号(< >)はコメント内でも
			          // 文法警告の元になるため使わない(=== の目印で表現)。
			          pushComment('=== テキストの変更 / from text ===', ind);
			          pushAll(tReg);
			          pushComment('=== ゲームの変更 / from game ===', ind);
			          pushAll(oReg);
			          pushComment('=== どちらかを残し、この目印3行を消す / keep one, delete these 3 marker lines ===', ind);
			          warnings.push('Conflict kept both / 衝突は両方残しました');
			        }
			        pos = baseHi;
			      }

			      return { commands: result, conflicts, warnings }
			    };

			    // 監視ツール用: 対象データJSONの初回バックアップ(.bak が無いときだけ pristine 状態を退避)。
			    const backupOnce = function (fsLib, dataPath) {
			      try {
			        const bak = dataPath + '.bak';
			        if (fsLib.existsSync(dataPath) && !fsLib.existsSync(bak)) {
			          fsLib.copyFileSync(dataPath, bak);
			        }
			      } catch (e) {
			        // バックアップ失敗はデプロイを止めない。
			        addWarning('Backup failed / バックアップに失敗しました: ' + dataPath);
			      }
			    };

			    // 単一テキストファイルを単一データJSONへデプロイする再利用関数(CLI監視/VSCode拡張から呼ぶ)。
			    // フロントマター(kind/mapId/eventId/pageId/commonEventId)と opts をマージしてターゲットを解決。
			    // 戻り値: { ok, textPath, kind, target, dataPath, warnings: string[], error? }
			    const interpreter = this;
			    const applyTextFile = function (opts) {
			      opts = opts || {};
			      const fsLib = require$$1$1;
			      const pathLib = require$$0$1;
			      const { BASE_PATH } = getDirParams();
			      const textPath = resolveFromRoot(BASE_PATH, opts.textPath);
			      if (!textPath) {
			        return { ok: false, textPath: opts.textPath || '', warnings: [], error: 'textPath is required' }
			      }
			      const _resolvedStrategy = resolveStrategy(opts.strategy);
			      if (!_resolvedStrategy) {
			        return { ok: false, textPath, warnings: [], error: 'Unknown strategy: ' + opts.strategy + ' (expected: merge|overwrite)' }
			      }
			      const strategy = _resolvedStrategy.strategy;

			      const prevWarnings = Laurus.Text2Frame._warnings;
			      const prevQuiet = Laurus.Text2Frame._quiet;
			      Laurus.Text2Frame._warnings = [];
			      Laurus.Text2Frame._quiet = true;
			      try {
			        const parsed = parseFrontMatter(readText(textPath));
			        const meta = parsed.meta || {};
			        const kind = String(opts.kind || meta.kind || 'event').toLowerCase();
			        const overwrite = strategy === 'overwrite';

			        let dataPath;
			        let target;
			        if (kind === 'event') {
			          const mapId = opts.mapId || meta.mapId;
			          const eventId = opts.eventId || meta.eventId;
			          const pageId = opts.pageId || meta.pageId || '1';
			          if (!eventId) {
			            throw new Error('eventId is required for event entry')
			          }
			          const defaultMapPath = mapId
			            ? pathLib.join('data', 'Map' + ('000' + String(mapId)).slice(-3) + '.json')
			            : null;
			          dataPath = resolveFromRoot(BASE_PATH, opts.mapPath) || resolveFromRoot(BASE_PATH, defaultMapPath);
			          if (!dataPath) {
			            throw new Error('mapPath or mapId is required for event entry')
			          }
			          target = { kind, mapId: mapId ? String(mapId) : undefined, eventId: String(eventId), pageId: String(pageId) };
			          if (opts.backup) {
			            backupOnce(fsLib, dataPath);
			          }
			          interpreter.pluginCommandText2Frame('COMMAND_LINE', [{
			            IsDebug: !!opts.isDebug,
			            TextPath: textPath,
			            MapPath: dataPath,
			            EventID: String(eventId),
			            PageID: String(pageId),
			            IsOverwrite: overwrite,
			            BasePath: opts.basePath,
			            ExecMode: strategy === 'overwrite' ? 'IMPORT_MESSAGE_TO_EVENT' : 'MERGE_MESSAGE_TO_EVENT'
			          }]);
			        } else if (kind === 'common') {
			          const commonEventId = opts.commonEventId || meta.commonEventId;
			          if (!commonEventId) {
			            throw new Error('commonEventId is required for common entry')
			          }
			          dataPath =
			            resolveFromRoot(BASE_PATH, opts.commonEventPath) ||
			            resolveFromRoot(BASE_PATH, pathLib.join('data', 'CommonEvents.json'));
			          target = { kind, commonEventId: String(commonEventId) };
			          if (opts.backup) {
			            backupOnce(fsLib, dataPath);
			          }
			          interpreter.pluginCommandText2Frame('COMMAND_LINE', [{
			            IsDebug: !!opts.isDebug,
			            TextPath: textPath,
			            CommonEventPath: dataPath,
			            CommonEventID: String(commonEventId),
			            IsOverwrite: overwrite,
			            BasePath: opts.basePath,
			            ExecMode: strategy === 'overwrite' ? 'IMPORT_MESSAGE_TO_CE' : 'MERGE_MESSAGE_TO_CE'
			          }]);
			        } else {
			          throw new Error('unknown kind: ' + kind)
			        }

			        return { ok: true, textPath, kind, target, dataPath, warnings: Laurus.Text2Frame._warnings.slice() }
			      } catch (error) {
			        return {
			          ok: false,
			          textPath,
			          warnings: (Laurus.Text2Frame._warnings || []).slice(),
			          error: error.message,
			          errorLine: error.t2fLine,
			          errorLineText: error.t2fLineText
			        }
			      } finally {
			        Laurus.Text2Frame._warnings = prevWarnings;
			        Laurus.Text2Frame._quiet = prevQuiet;
			      }
			    };

			    /* 3-way 共通祖先(BASE)スナップショットの規約。VSCode 拡張と同一:
			     * <root>/.t2f-base/<locale>/<key>.txt。CLI/プラグインが作る祖先は VSCode と相互運用可能。 */
			    const baseSnapshotPathCore = function (root, locale, key) {
			      const path = require$$0$1;
			      return path.join(root, '.t2f-base', String(locale || 'default'), String(key) + '.txt')
			    };
			    const readBaseText = function (root, locale, key) {
			      try { return require('fs').readFileSync(baseSnapshotPathCore(root, locale, key), 'utf8') } catch (e) { return null }
			    };
			    const saveBaseText = function (root, locale, key, text) {
			      try {
			        const fs = require('fs');
			        const path = require('path');
			        const p = baseSnapshotPathCore(root, locale, key);
			        const dir = path.dirname(p);
			        // 既存 dir への mkdirSync は一部ランタイム(NW.js)で EEXIST を投げるため existsSync でガード。
			        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			        fs.writeFileSync(p, text, 'utf8');
			      } catch (e) { /* best effort */ }
			    };
			    const deriveBaseId = function (textPath, meta) {
			      const path = require$$0$1;
			      const key = path.basename(String(textPath), path.extname(String(textPath)));
			      const locale = (meta && meta.locale) || path.basename(path.dirname(String(textPath))) || 'default';
			      return { locale, key }
			    };

			    /* pull-merge(ゲーム→テキスト)。push の 3-way を鏡写しにし、結果を decompile でテキスト化する。
			     * ours=ゲームのコマンド, theirs=既存テキスト, base=祖先。翻訳を残しつつゲーム変更を取り込む。
			     * 戻り値: { text, conflicts, warnings }。VSCode の mergePullToText と同一ロジック。 */
			    const applyMergePull = function (opts) {
			      opts = opts || {};
			      const gameCommands = opts.gameCommands || [];
			      const theirs = opts.textBody ? compile(opts.textBody) : [];
			      const base = opts.baseBody ? compile(opts.baseBody) : [];
			      const englishTag = opts.englishTag !== false;
			      let merged;
			      let conflicts = 0;
			      let warnings = [];
			      if (base.length > 0) {
			        const m = applyThreeWayMerge(base, gameCommands, theirs);
			        merged = m.commands.slice();
			        conflicts = m.conflicts;
			        warnings = m.warnings;
			      } else if (theirs.length > 0) {
			        const ov = applyOverlay(gameCommands, theirs);
			        merged = ov.commands.slice();
			        warnings = ov.warnings;
			      } else {
			        merged = gameCommands.slice();
			      }
			      if (!merged.length || merged[merged.length - 1].code !== 0) merged.push({ code: 0, indent: 0, parameters: [] });
			      const F2T = requireFrame2Text();
			      const text = F2T.decompile(merged, englishTag, { pretty: true });
			      return { text, conflicts, warnings }
			    };

			    Laurus.Text2Frame.export = { compile, applyOverlay, applyThreeWayMerge, applyMergePull, applyTextFile, resolveStrategy, baseSnapshotPathCore, readBaseText, saveBaseText, deriveBaseId };
			    // ゲーム内(NW.js)では require('./Text2Frame.js') が解決できないため、Frame2Text から
			    // 参照できるよう共有 API をグローバルにも公開する(CLI/Node では module.exports を使う)。
			    try { if (typeof globalThis !== 'undefined') globalThis.$LaurusText2Frame = Laurus.Text2Frame.export; } catch (e) { /* noop */ }

			    const resolveFromRoot = function (rootDir, maybeRelativePath) {
			      if (!maybeRelativePath) {
			        return maybeRelativePath
			      }
			      const path = require$$0$1;
			      return path.isAbsolute(maybeRelativePath)
			        ? maybeRelativePath
			        : path.resolve(rootDir, maybeRelativePath)
			    };

			    if (Laurus.Text2Frame.ExecMode === 'LIBRARY_EXPORT') {
			      return
			    }

			    if (Laurus.Text2Frame.ExecMode === 'BATCH_IMPORT_MESSAGES_FROM_FOLDER') {
			      if (typeof commonjsRequire === 'undefined') {
			        addMessage('[batch-import] Node.js environment not available');
			        return
			      }
			      const _fs = require$$1$1;
			      const _path = require$$0$1;
			      const { BASE_PATH } = getDirParams();
			      const root = _path.isAbsolute(Laurus.Text2Frame.ImportFolder) ? Laurus.Text2Frame.ImportFolder : _path.resolve(BASE_PATH, Laurus.Text2Frame.ImportFolder);
			      const strategy = Laurus.Text2Frame.BatchStrategy || 'merge';
			      const walk = function (dir) {
			        let out = [];
			        let entries = [];
			        try { entries = _fs.readdirSync(dir); } catch (e) { return out }
			        entries.forEach(function (ent) {
			          const full = _path.join(dir, ent);
			          const stat = _fs.statSync(full);
			          if (stat.isDirectory()) out = out.concat(walk(full));
			          else if (stat.isFile() && /\.txt$/i.test(ent)) out.push(full);
			        });
			        return out
			      };
			      let ok = 0;
			      let fail = 0;
			      walk(root).forEach(function (fileName) {
			        let meta;
			        try { meta = parseFrontMatter(readText(fileName)).meta; } catch (e) { meta = null; }
			        if (!meta || !meta.kind) return
			        // Command Strategy arg is the default; a per-file front-matter `strategy:` overrides it.
			        const entryStrategy = meta.strategy ? (resolveStrategy(meta.strategy) || { strategy }).strategy : strategy;
			        const res = applyTextFile({ textPath: fileName, strategy: entryStrategy, backup: true });
			        if (res && res.ok) ok++;
			        else fail++;
			      });
			      addMessage('[batch-import] Completed: ' + ok + ' success, ' + fail + ' errors');
			      console.log('[batch-import] Completed: ' + ok + ' success, ' + fail + ' errors');
			      return
			    }

			    const scenario_text = readText(Laurus.Text2Frame.TextPath);
			    const parsed = parseFrontMatter(scenario_text);
			    const event_command_list = compile(parsed.body);
			    event_command_list.push(getCommandBottomEvent());

			    switch (Laurus.Text2Frame.ExecMode) {
			      case 'IMPORT_MESSAGE_TO_EVENT':
			      case 'メッセージをイベントにインポート': {
			        const map_data = readJsonData(Laurus.Text2Frame.MapPath);
			        if (!map_data.events[Laurus.Text2Frame.EventID]) {
			          throw new Error(
			            'EventID not found. / EventIDが見つかりません。\n' + 'Event ID: ' + Laurus.Text2Frame.EventID
			          )
			        }

			        const pageID = Number(Laurus.Text2Frame.PageID) - 1;
			        while (!map_data.events[Laurus.Text2Frame.EventID].pages[pageID]) {
			          map_data.events[Laurus.Text2Frame.EventID].pages.push(getDefaultPage());
			        }

			        let map_events = map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list;
			        if (Laurus.Text2Frame.IsOverwrite) {
			          map_events = [];
			        }
			        map_events.pop();
			        map_events = map_events.concat(event_command_list);
			        map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list = map_events;
			        writeData(Laurus.Text2Frame.MapPath, map_data);
			        // 全上書きのときだけ text==game になる(追記モードは一致しないので祖先を更新しない)。
			        if (Laurus.Text2Frame.IsOverwrite) saveBaseAfterOverwrite(Laurus.Text2Frame.TextPath, scenario_text, parsed.meta);
			        addMessage(
			          'Success / 書き出し成功！\n' +
			            '======> MapID: ' +
			            Laurus.Text2Frame.MapID +
			            ' -> EventID: ' +
			            Laurus.Text2Frame.EventID +
			            ' -> PageID: ' +
			            Laurus.Text2Frame.PageID
			        );
			        break
			      }
			      case 'IMPORT_MESSAGE_TO_CE':
			      case 'メッセージをコモンイベントにインポート': {
			        const ce_data = readJsonData(Laurus.Text2Frame.CommonEventPath);
			        if (ce_data.length - 1 < Laurus.Text2Frame.CommonEventID) {
			          throw new Error(
			            'Common Event not found. / コモンイベントが見つかりません。: ' + Laurus.Text2Frame.CommonEventID
			          )
			        }

			        let ce_events = ce_data[Laurus.Text2Frame.CommonEventID].list;
			        if (Laurus.Text2Frame.IsOverwrite) {
			          ce_events = [];
			        }
			        ce_events.pop();
			        ce_data[Laurus.Text2Frame.CommonEventID].list = ce_events.concat(event_command_list);
			        writeData(Laurus.Text2Frame.CommonEventPath, ce_data);
			        // 全上書きのときだけ text==game になる(追記モードは一致しないので祖先を更新しない)。
			        if (Laurus.Text2Frame.IsOverwrite) saveBaseAfterOverwrite(Laurus.Text2Frame.TextPath, scenario_text, parsed.meta);
			        addMessage('Success / 書き出し成功！\n' + '=====> Common EventID :' + Laurus.Text2Frame.CommonEventID);
			        break
			      }
			      case 'MERGE_MESSAGE_TO_EVENT': {
			        const map_data = readJsonData(Laurus.Text2Frame.MapPath);
			        if (!map_data.events[Laurus.Text2Frame.EventID]) {
			          throw new Error('EventID not found. / EventIDが見つかりません。\n' + 'Event ID: ' + Laurus.Text2Frame.EventID)
			        }
			        const pageID = Number(Laurus.Text2Frame.PageID) - 1;
			        while (!map_data.events[Laurus.Text2Frame.EventID].pages[pageID]) {
			          map_data.events[Laurus.Text2Frame.EventID].pages.push(getDefaultPage());
			        }
			        const existing_events = map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list;
			        const merged = resolveMergeCommands(existing_events, event_command_list, Laurus.Text2Frame.TextPath, Laurus.Text2Frame.BasePath);
			        map_data.events[Laurus.Text2Frame.EventID].pages[pageID].list =
			          merged.commands.concat([getCommandBottomEvent()]);
			        writeData(Laurus.Text2Frame.MapPath, map_data);
			        saveMergeBase(merged.baseRoot, merged.baseId, Laurus.Text2Frame.TextPath);
			        addMessage('Success / 書き出し成功！\n======> MapID: ' + Laurus.Text2Frame.MapID + ' -> EventID: ' + Laurus.Text2Frame.EventID + ' -> PageID: ' + Laurus.Text2Frame.PageID);
			        break
			      }
			      case 'MERGE_MESSAGE_TO_CE': {
			        const ce_data = readJsonData(Laurus.Text2Frame.CommonEventPath);
			        if (ce_data.length - 1 < Laurus.Text2Frame.CommonEventID) {
			          throw new Error('Common Event not found. / コモンイベントが見つかりません。: ' + Laurus.Text2Frame.CommonEventID)
			        }
			        const existing_ce_events = ce_data[Laurus.Text2Frame.CommonEventID].list;
			        const merged = resolveMergeCommands(existing_ce_events, event_command_list, Laurus.Text2Frame.TextPath, Laurus.Text2Frame.BasePath);
			        ce_data[Laurus.Text2Frame.CommonEventID].list =
			          merged.commands.concat([getCommandBottomEvent()]);
			        writeData(Laurus.Text2Frame.CommonEventPath, ce_data);
			        saveMergeBase(merged.baseRoot, merged.baseId, Laurus.Text2Frame.TextPath);
			        addMessage('Success / 書き出し成功！\n' + '=====> Common EventID :' + Laurus.Text2Frame.CommonEventID);
			        break
			      }
			    }
			    addMessage('\n');
			    addMessage(
			      'Please restart RPG Maker MV(Editor) WITHOUT save. \n' +
			        '**セーブせずに**プロジェクトファイルを開き直してください'
			    );
			    // _quiet 指定時(applyTextFile 経由)は冗長な案内ログを抑制する。
			    if (!Laurus.Text2Frame._quiet) {
			      console.log(
			        'Please restart RPG Maker MV(Editor) WITHOUT save. \n' +
			          '**セーブせずに**プロジェクトファイルを開き直してください'
			      );
			    }
			  };

			  // export convert func.
			  Game_Interpreter.prototype.pluginCommandText2Frame('LIBRARY_EXPORT', [0]);
			  {
			    module.exports = Laurus.Text2Frame.export;
			  }
			})(); 
		} (Text2Frame$1));
		return Text2Frame$1.exports;
	}

	var Text2FrameExports = requireText2Frame();
	var Text2Frame = /*@__PURE__*/getDefaultExportFromCjs(Text2FrameExports);

	return Text2Frame;

}));
