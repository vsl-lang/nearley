#!/usr/bin/env node

var fs = require('fs'),
    nearley = require('../lib/nearley.js'),
    nomnom = require('nomnom'),
    Compile = require('../lib/compile.js'),
    StreamWrapper = require('../lib/stream.js'),
    opts = nomnom
    .script('nearleyc')
    .option('file', {
        position: 0,
        help: "An input .ne file (if not provided then read from stdin)",
    })
    .option('out', {
        abbr: 'o',
        help: "File to output to (defaults to stdout)",
    })
    .option('export', {
        abbr: 'e',
        help: "Variable to set the parser to",
        default: "grammar"
    })
    .option('nojs', {
        flag: true,
        default: false,
        help: "Don't compile postprocessors (for testing)."
    })
    .option('version', {
        abbr: 'v',
        flag: true,
        help: "Print version and exit",
        callback: function() {
            return require('../package.json').version;
        }
    })
    .parse(),
    input = opts.file ? fs.createReadStream(opts.file) : process.stdin,
    output = opts.out ? fs.createWriteStream(opts.out) : process.stdout,
    parserGrammar = require('../lib/nearley-language-bootstrapped.js'),
    parser = new nearley.Parser(parserGrammar.ParserRules, parserGrammar.Names),
    generate = require('../lib/generate.js'),
    lint = require('../lib/lint.js');

input
    .pipe(new StreamWrapper(parser))
    .on('finish', function() {
        var c = Compile(parser.results[0], opts);
        lint(c, {'out': process.stderr});
        output.write(generate(c, opts.export));
    });
