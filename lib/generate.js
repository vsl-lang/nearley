(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./nearley'));
    } else {
        root.generate = factory(root.nearley);
    }
}(this, function(nearley) {

function serializeRules(rules, builtinPostprocessors) {
    return "[\n        " + rules.map(function(ruleSet) {
        return "[\n            " + ruleSet.map(function (rule) {
            return serializeRule(rule, builtinPostprocessors);
        }).join(",\n            ") + "\n        ]";
    }).join(", ") + "\n    ]";
}

function serializeNames(names) {
    return "[\n        " + names.map(JSON.stringify).join(",\n        ") + "\n    ]";
}

function dedentFunc(func) {
    var lines = func.toString().split(/\n/);

    if (lines.length === 1) {
        return [lines[0].replace(/^\s+|\s+$/g, '')];
    }

    var indent = null;
    var tail = lines.slice(1);
    for (var i = 0; i < tail.length; i++) {
        var match = /^\s*/.exec(tail[i]);
        if (match && match[0].length !== tail[i].length) {
            if (indent === null ||
                match[0].length < indent.length) {
                indent = match[0];
            }
        }
    }

    if (indent === null) {
        return lines;
    }

    return lines.map(function dedent(line) {
        if (line.slice(0, indent.length) === indent) {
            return line.slice(indent.length);
        }
        return line;
    });
}

function tabulateString(string, indent, options) {
    var lines;
    if(Array.isArray(string)) {
      lines = string;
    } else {
      lines = string.toString().split('\n');
    }

    options = options || {};
    var tabulated = lines.map(function addIndent(line, i) {
        var shouldIndent = true;

        if(i == 0 && !options.indentFirst) {
          shouldIndent = false;
        }

        if(shouldIndent) {
            return indent + line;
        } else {
            return line;
        }
    }).join('\n');

    return tabulated;
}

function serializeSymbol(s) {
    if (s instanceof RegExp) {
        return s.toString();
    } if (typeof s === 'string') {
        return JSON.stringify(s);
    } else if (s.token) {
        return s.token;
    } else if (Array.isArray(s)) {
        return "[" + s.map(serializeSymbol).join(", ") + "]";
    } else if (s instanceof Object) {
        var result = "{";
        Object.getOwnPropertyNames(s).forEach(function (key) {
            result = result + key + ": " + serializeSymbol(s[key]);
        });
        return result + "}";
    } else {
        return s.toString();
    }
}

function serializeRule(rule, builtinPostprocessors) {
    var ret = "[[" +
        rule.symbols.map(serializeSymbol).join(", ") + "]";
    if (rule.postprocess) {
        if (rule.postprocess.builtin) {
            rule.postprocess = builtinPostprocessors[rule.postprocess.builtin];
        }
        ret += ", " + tabulateString(dedentFunc(rule.postprocess), "        ", {indentFirst: false});
    }
    ret += "]";
    return ret;
}

var generate = function (parser, exportName) {
    if(!parser.config.preprocessor) {
        parser.config.preprocessor = "_default";
    }

    if(!generate[parser.config.preprocessor]) {
        throw new Error("No such preprocessor: " + parser.config.preprocessor);
    }

    return generate[parser.config.preprocessor](parser, exportName);
};

generate.js = generate._default = generate.javascript = function (parser, exportName) {
    return "\n\
// Generated automatically by nearley\n\
// http://github.com/Hardmath123/nearley\n\
(function () {\n\
function id(x) { return x[0]; }\n\
" + parser.body.join("\n") + "\n\
var grammar = {\n\
    Lexer: " + parser.config.lexer + ",\n\
    ParserRules: " +
serializeRules(parser.rules, generate.javascript.builtinPostprocessors) + ",\n\
    Names: " + serializeNames(parser.names) + "\n\
};\n\
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {\n\
   module.exports = grammar;\n\
} else {\n\
   window." + exportName + " = grammar;\n\
}\n\
})();\n";
};

generate.javascript.builtinPostprocessors = {
    "joiner": "function joiner(d) {return d.join('');}",
    "arrconcat": "function arrconcat(d) {return [d[0]].concat(d[1]);}",
    "arrpush": "function arrpush(d) {return d[0].concat([d[1]]);}",
    "nuller": "function(d) {return null;}",
    "id": "id"
};

generate.es7 = function (parser, exportName) {
    return "\n\
// Generated automatically by nearley\n\
// http://github.com/Hardmath123/nearley\n\
(function () {\n\
id = x => x[0];\n\
" + parser.body.join("\n") + "\n\
export default Object.freeze({\n\
    Lexer: " + parser.config.lexer + ",\n\
    ParserRules: " +
serializeRules(parser.rules, generate.es7.builtinPostprocessors) + ",\n\
    Names: " + serializeNames(parser.names) + "\n\
});\n";
};

generate.es7.builtinPostprocessors = {
    "joiner": "d => d.join('')",
    "arrconcat": "d => [d[0]].concat(d[1])",
    "arrpush": "d => d[0].concat([d[1]])",
    "nuller": "() => null",
    "id": "id"
};

generate.cs = generate.coffee = generate.coffeescript = function (parser, exportName) {
    return "\n\
# Generated automatically by nearley\n\
# http://github.com/Hardmath123/nearley\n\
do ->\n\
id = (d) -> d[0]\n\
" + tabulateString(dedentFunc(parser.body.join("\n")), "  ") + "\n\
  grammar = {\n\
    Lexer: " + parser.config.lexer + ",\n\
    ParserRules: " + tabulateString(
        serializeRules(parser.rules, generate.coffeescript.builtinPostprocessors),
        "      ",
        {indentFirst: false}
    ) + ",\n\
    Names: " + serializeNames(parser.names) + "\n\
  };\n\
if typeof module != 'undefined' && typeof module.exports != 'undefined'\n\
    module.exports = grammar;\n\
else\n\
    window." + exportName + " = grammar;\n";
};

generate.coffeescript.builtinPostprocessors = {
    "joiner": "(d) -> d.join('')",
    "arrconcat": "(d) -> [d[0]].concat(d[1])",
    "arrpush": "(d) -> d[0].concat([d[1]])",
    "nuller": "() -> null",
    "id": "id"
};

generate.ts = generate.typescript = function (parser, exportName) {
    return "\n\
// Generated automatically by nearley\n\
// http://github.com/Hardmath123/nearley\n\
function id(d:any[]):any {return d[0];}\n\
" + parser.body.join('\n') + "\n\
interface NearleyGrammar { ParserRules: NearleyRule[]; ParserStart: string; };\n\
interface NearleyRule { name: string; symbols: NearleySymbol[]; postprocess?: (d: any[], loc?: number, reject?: {}) => any};\n\
type NearleySymbol = string | {literal: any} | {test: (token: any) => boolean};\n\
export var grammar : NearleyGrammar = {\n\
    Lexer: " + parser.config.lexer + ",\n\
    ParserRules: " + serializeRules(parser.rules, generate.typescript.builtinPostprocessors) + "\n\
    Names: " + serializeNames(parser.names) + "\n\
};\n";
};

generate.typescript.builtinPostprocessors = {
    "joiner": "(d) => d.join('')",
    "arrconcat": "(d) => [d[0]].concat(d[1])",
    "nuller": "(d) => null",
    "id": "id"
};


return generate;

}));
