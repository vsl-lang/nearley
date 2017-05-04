(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./nearley'));
    } else {
        root.Compile = factory(root.nearley);
    }
}(this, function(nearley) {

// TODO compile macros - somebody

function Compile(structure, opts) {
    if (!opts.alreadycompiled) {
        opts.alreadycompiled = [];
    }

    var result = {
        rules: [],
        names: [],
        body: [], // @directives list
        config: {}, // @config value
        macros: {}
    };
    var unique = uniquer(result.names);
    
    for (var i = 0; i < structure.length; i++) {
        var productionRule = structure[i];
        if (!productionRule.body && !productionRule.include &&
            !productionRule.macro && !productionRule.config) {
            unique.unmodified(productionRule.name);
            break;
        }
    }

    for (var i = 0; i < structure.length; i++) {
        var productionRule = structure[i];
        if (productionRule.body) {
            // This isn't a rule, it's a @directive.
            if (!opts.nojs) {
                result.body.push(productionRule.body);
            }
        } else if (productionRule.include) {
            // Include file
            var path;
            if (!productionRule.builtin) {
                path = require('path').resolve(
                    opts.file ? require('path').dirname(opts.file) : process.cwd(),
                    productionRule.include
                );
            } else {
                path = require('path').resolve(
                    __dirname,
                    '../builtin/',
                    productionRule.include
                );
            }
            if (opts.alreadycompiled.indexOf(path) === -1) {
                opts.alreadycompiled.push(path);
                var f = require('fs').readFileSync(path).toString(),
                    parserGrammar = require('./nearley-language-bootstrapped.js'),
                    parser = new nearley.Parser(parserGrammar.ParserRules, parserGrammar.Names);
                parser.feed(f);
                structure.splice.apply(structure, [i + 1, 0].concat(parser.results[0]));
            }
        } else if (productionRule.macro) {
            result.macros[productionRule.macro] = {
                args: productionRule.args,
                exprs: productionRule.exprs
            };
        } else if (productionRule.config) {
            // This isn't a rule, it's a @config.
            result.config[productionRule.config] = productionRule.value;
        } else {
            produceRules(productionRule.name, productionRule.rules, {});
        }
    }

    return result;

    function produceRules(name, rules, env) {
        for (var i = 0; i < rules.length; i++) {
            var rule = buildRule(name, rules[i], env);
            if (opts.nojs) {
                rule.postprocess = null;
            }
            var index = unique.lookup(name);
            while (result.rules.length <= index)
                result.rules.push([]);
            result.rules[index].push(rule);
        }
    }

    function buildRule(ruleName, rule, env) {
        var tokens = [];
        for (var i = 0; i < rule.tokens.length; i++) {
            var token = buildToken(ruleName, rule.tokens[i], env);
            if (token !== null) {
                if (typeof token === "string")
                    tokens.push(unique.lookup(token));
                else if (token.literal)
                    tokens.push.apply(tokens, result.config.lexer ? [token.literal] : token.literal.split(""));
                else // TODO remove if unneeded - somebody
                    tokens.push(token);
            }
        }
        unique.unmodified(ruleName);
        return new nearley.Rule(
            unique.lookup(ruleName),
            null, // null grammar
            tokens,
            rule.postprocess
        );
    }

    function buildToken(ruleName, token, env) {
        if (typeof token === "string") {
            if (token === "null") {
                return null;
            }
            return unique.unmodified(token);
        }

        if (token instanceof RegExp) {
            return token;
        }

        if (token.literal) {
            if (!token.literal.length) {
                return null;
            }
            return result.config.split === "false" ? token : buildStringToken(ruleName, token, env);
        }

        if (token.token) {
            if (result.config.lexer) {
                var name = token.token;
                var expr = result.config.has === "true" ?
                    "{type: " + JSON.stringify(name) + "}" :
                    result.config.has === "false" ? 
                        name :
                        result.config.lexer + ".has(" + JSON.stringify(name) + ") ? {type: " + JSON.stringify(name) + "} : " + name;
                return {token: expr};
            }
            return token;
        }

        if (token.subexpression) {
            return buildSubExpressionToken(ruleName, token, env);
        }

        if (token.ebnf) {
            return buildEBNFToken(ruleName, token, env);
        }

        if (token.macrocall) {
            return buildMacroCallToken(ruleName, token, env);
        }

        if (token.mixin) {
            if (env[token.mixin]) {
                return buildToken(ruleName, env[token.mixin], env);
            } else {
                throw new Error("Unbound variable: " + token.mixin);
            }
        }

        throw new Error("unrecognized token: " + JSON.stringify(token));
    }

    function buildStringToken(ruleName, token, env) {
        if (token.literal.length === 1)
            return token;
        var name = unique(ruleName + "_str");
        produceRules(name, [{
            tokens: token.literal.split("").map(function charLiteral(c) {
                return {literal: c};
            }),
            postprocess: {builtin: "joiner"}
        }], env);
        return name;
    }

    function buildSubExpressionToken(ruleName, token, env) {
        var data = token.subexpression,
            name = unique(ruleName + "_sub");
        //structure.push({"name": name, "rules": data});
        produceRules(name, data, env);
        return name;
    }

    function buildEBNFToken(ruleName, token, env) {
        switch (token.modifier) {
            case ":+":
                return buildEBNFPlus(ruleName, token, env);
            case ":*":
                return buildEBNFStar(ruleName, token, env);
            case ":?":
                return buildEBNFOpt(ruleName, token, env);
        }
    }

    function buildEBNFPlus(ruleName, token, env) {
        var name = unique(ruleName + "_ebnf");
        /*
        structure.push({
            name: name,
            rules: [{
                tokens: [token.ebnf],
            }, {
                tokens: [token.ebnf, name],
                postprocess: {builtin: "arrconcat"}
            }]
        });
        */
        produceRules(name,
            [{
                tokens: [token.ebnf],
            }, {
                tokens: [name, token.ebnf],
                postprocess: {builtin: "arrpush"}
            }],
            env
        );
        return name;
    }

    function buildEBNFStar(ruleName, token, env) {
        var name = unique(ruleName + "_ebnf");
        /*
        structure.push({
            name: name,
            rules: [{
                tokens: [],
            }, {
                tokens: [token.ebnf, name],
                postprocess: {builtin: "arrconcat"}
            }]
        });
        */
        produceRules(name,
            [{
                tokens: [],
            }, {
                tokens: [name, token.ebnf],
                postprocess: {builtin: "arrpush"}
            }],
            env
        );
        return name;
    }

    function buildEBNFOpt(ruleName, token, env) {
        var name = unique(ruleName + "_ebnf");
        /*
        structure.push({
            name: name,
            rules: [{
                tokens: [token.ebnf],
                postprocess: {builtin: "id"}
            }, {
                tokens: [],
                postprocess: {builtin: "nuller"}
            }]
        });
        */
        produceRules(name,
            [{
                tokens: [token.ebnf],
                postprocess: {builtin: "id"}
            }, {
                tokens: [],
                postprocess: {builtin: "nuller"}
            }],
            env
        );
        return name;
    }

    function buildMacroCallToken(ruleName, token, env) {
        var name = unique(ruleName + "macro");
        var macro = result.macros[token.macrocall];
        if (!macro) {
            throw new Error("Unkown macro: " + token.macrocall);
        }
        if (macro.args.length !== token.args.length) {
            throw new Error("Argument count mismatch.");
        }
        var newenv = {__proto__: env};
        for (var i=0; i<macro.args.length; i++) {
            var argrulename = unique(ruleName + "macro");
            newenv[macro.args[i]] = argrulename;
            produceRules(argrulename, [token.args[i]], env);
            //structure.push({"name": argrulename, "rules":[token.args[i]]});
            //buildRule(name, token.args[i], env);
        }
        produceRules(name, macro.exprs, newenv);
        return name;
    }
}

function uniquer(grammarNames) {
    var uns = {},
        names = {},
        id = 0;
    function unique(name) {
        var un = uns[name] = (uns[name] || 0) + 1,
            result = name + "_" + un;
        names[result] = id++;
        grammarNames.push(result);
        return result;
    }
    function unmodified(name) {
        if (typeof names[name] === "undefined") {
            names[name] = id++;
            grammarNames.push(name);
        }
        return name;
    }
    function lookup(name) {
        return names[name];
    }
    unique.unmodified = unmodified;
    unique.lookup = lookup;
    unique.names = names;
    return unique;
}

return Compile;

}));
