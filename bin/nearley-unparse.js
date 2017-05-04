#!/usr/bin/env node

var fs = require('fs'),
    nomnom = require('nomnom'),
    randexp = require('randexp'),
    opts = nomnom
    .script('nearley-unparse')
    .option('file', {
        position: 0,
        help: "A grammar .js file",
        required: true,
    })
    .option('start', {
        abbr: 's',
        help: "An optional start symbol (if not provided then use the parser start symbol)",
    })
    .option('count', {
        abbr: 'n',
        help: 'The number of samples to generate (separated by \\n).',
        default: 1
    })
    .option('depth', {
        abbr: 'd',
        help: 'The depth bound of each sample. Defaults to -1, which means "unbounded".',
        default: -1
    })
    .option('out', {
        abbr: 'o',
        help: "File to output to (defaults to stdout)",
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
    output = opts.out ? fs.createWriteStream(opts.out) : process.stdout,
    grammar = require(require('path').resolve(opts.file));

function gen(grammar, name) {
    // The first-generation generator. It just spews out stuff randomly, and is
    // not at all guaranteed to terminate. However, it is extremely performant.

    var stack = [name];

    while (stack.length > 0) {
        var currentname = stack.pop();
        if (typeof currentname === "number") {
            var goodrules = grammar.ParserRules[currentname];
            if (goodrules.length > 0) {
                var chosen = goodrules[
                    Math.floor(Math.random() * goodrules.length)
                ];
                for (var i = chosen.symbols.length - 1; i >= 0; i--) {
                    stack.push(chosen.symbols[i]);
                }
            } else {
                throw new Error("Nothing matches rule: " + currentname + "!");
            }
        } else if (currentname.test) {
            output.write(new randexp(currentname).gen());
            continue;
        } else if (currentname.literal) {
            output.write(currentname.literal);
            continue;
        }
    }
}

function gen2(grammar, name, depth) {
    // I guess you could call this the second-generation generator.
    // All it does is bound its output by a certain depth without having to
    // backtrack. It doesn't give guarantees on being uniformly random, but
    // that's doable if we *really* need it (by converting min_depth_rule, a
    // predicate, into something that counts the number of trees of depth d).

    var rules = grammar.ParserRules,
        min_depths_rule = [];

    function synth_nt(name, depth) {
        //TODO: change to use exp since name doesn't exist anymore
        var good_rules = [],
            min_min_depth = Infinity;
        for (var i = 0; i < rules.length; i++) {
            min_depths_rule = [];
            var size = min_depth_rule(i, []);
            if (rules[i].name === name) {
                min_min_depth = Math.min(min_min_depth, size);
                if (size < depth) {
                    good_rules.push(i);
                }
            }
        }
        if (good_rules.length === 0) {
            throw ("No strings in your grammar have depth " + depth + " (and " +
                   "none are shallower). Try increasing -d to at least " +
                   (min_min_depth + 1) + ".");
        }

        var r = good_rules[Math.floor(Math.random()*good_rules.length)];
        return synth_rule(r, depth);
    }
    function synth_rule(idx, depth) {
        var ret = "";
        for (var i = 0; i < rules[idx].symbols.length; i++) {
            var tok = rules[idx].symbols[i];
            if (typeof tok === "number") {
                ret += synth_nt(tok, depth - 1);
            } else if (tok.test) {
                ret += new randexp(tok).gen();
            } else if (tok.literal) {
                ret += tok.literal;
            }
        }
        return ret;
    }
    function min_depth_nt(name, visited) {
        if (visited.indexOf(name) !== -1) {
            return +Infinity;
        }
        var d = +Infinity;
        for (var i = 0; i < rules.length; i++) {
            if (rules[i].name === name) {
                d = Math.min(d, min_depth_rule(i, [name].concat(visited)));
            }
        }
        return d;
    }
    function min_depth_rule(idx, visited) {
        if (min_depths_rule[idx] !== undefined) {
            return min_depths_rule[idx];
        }

        var d = 1;
        for (var i = 0; i < rules[idx].symbols.length; i++) {
            var tok = rules[idx].symbols[i];
            if (typeof(tok) === "string") {
                d = Math.max(d, 1 + min_depth_nt(tok, visited));
            }
        }
        min_depths_rule[idx] = d;
        return d;
    }

    var ret = synth_nt(name, depth);
    return ret;
}



// the main loop
for (var i = 0; i < parseInt(opts.count, 10); i++) {
    if (opts.depth === -1) {
        gen(grammar, opts.start ? opts.start : 0);
    } else {
        output.write(gen2(grammar, opts.start ? opts.start : 0, opts.depth));
    }
    if (opts.count > 1) {
        output.write("\n");
    }
}
