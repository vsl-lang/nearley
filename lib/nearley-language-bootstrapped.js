
// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

var grammar = {
    Lexer: undefined,
    ParserRules: [
        [
            [[11, 12, 11], function(d) { return d[1]; }]
        ], [
            [[]],
            [[1, 2], function arrpush(d) {return d[0].concat([d[1]]);}]
        ], [
            [[/[^\\"\n]/], id],
            [["\\", 9], 
        function(d) {
            return JSON.parse("\""+d.join("")+"\"");
        }
        ]
        ], [
            [["\"", 1, "\""], function(d) {return d[1].join(""); }]
        ], [
            [[]],
            [[4, 5], function arrpush(d) {return d[0].concat([d[1]]);}]
        ], [
            [[/[^\\\n]/], id],
            [["\\", 9], function(d) { return JSON.parse("\""+d.join("")+"\""); }],
            [[10], function(d) {return "'"; }]
        ], [
            [["'", 4, "'"], function(d) {return d[1].join(""); }]
        ], [
            [[]],
            [[7, /[^`]/], function arrpush(d) {return d[0].concat([d[1]]);}]
        ], [
            [["`", 7, "`"], function(d) {return d[1].join(""); }]
        ], [
            [[/["\\/bfnrt]/], id],
            [["u", /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/, /[a-fA-F0-9]/], 
        function(d) {
            return d.join("");
        }
        ]
        ], [
            [["\\", "'"], function joiner(d) {return d.join('');}]
        ], [
            [[]],
            [[14]]
        ], [
            [[13], function(d) { return [d[0]]; }],
            [[13, 14, 12], function(d) { return [d[0]].concat(d[2]); }]
        ], [
            [[15, 11, 16, ">", 11, 19], function(d) { return {name: d[0], rules: d[5]}; }],
            [[15, "[", 20, "]", 11, 21, ">", 11, 19], function(d) { return {macro: d[0], args: d[2], exprs: d[8]}}],
            [["@", 11, 24], function(d) { return {body: d[2]}; }],
            [["@", 15, 14, 15], function(d) { return {config: d[1], value: d[3]}; }],
            [[25, 11, 26], function(d) { return {include: d[2].literal, builtin: false}}],
            [[27, 11, 26], function(d) { return {include: d[2].literal, builtin: true}}]
        ], [
            [[40]],
            [[41, 42, 11]]
        ], [
            [[/[\w\?\+]/], function(d) { return d[0]; }],
            [[15, /[\w\?\+]/], function(d) { return d[0]+d[1]; }]
        ], [
            [[17]],
            [[16, 18], function arrpush(d) {return d[0].concat([d[1]]);}]
        ], [
            [["-"]],
            [["="]]
        ], [
            [["-"]],
            [["="]]
        ], [
            [[28]],
            [[19, 11, "|", 11, 28], function(d) { return d[0].concat([d[4]]); }]
        ], [
            [[15]],
            [[20, 11, ",", 11, 15], function(d) { return d[0].concat([d[4]]); }]
        ], [
            [[22]],
            [[21, 23], function arrpush(d) {return d[0].concat([d[1]]);}]
        ], [
            [["-"]],
            [["="]]
        ], [
            [["-"]],
            [["="]]
        ], [
            [["{", "%", 39, "%", "}"], function(d) { return d[2]; }]
        ], [
            [["@", "i", "n", "c", "l", "u", "d", "e"], function joiner(d) {return d.join('');}]
        ], [
            [[3], function(d) { return {literal: d[0]}; }]
        ], [
            [["@", "b", "u", "i", "l", "t", "i", "n"], function joiner(d) {return d.join('');}]
        ], [
            [[30], function(d) { return {tokens: d[0]}; }],
            [[30, 11, 24], function(d) { return {tokens: d[0], postprocess: d[2]}; }]
        ], [
            [[28]],
            [[29, 11, ",", 11, 28], function(d) { return d[0].concat([d[4]]); }]
        ], [
            [[31]],
            [[30, 14, 31], function(d) { return d[0].concat([d[2]]); }]
        ], [
            [[15], id],
            [["$", 15], function(d) { return {mixin: d[1]}; }],
            [[15, "[", 29, "]"], function(d) { return {macrocall: d[0], args: d[2]}; }],
            [[26], id],
            [["%", 15], function(d) { return {token: d[1]}; }],
            [[32], id],
            [["(", 11, 19, 11, ")"], function(d) { return {subexpression: d[2]}; }],
            [[31, 11, 33], function(d) { return {ebnf: d[0], modifier: d[2]}; }]
        ], [
            [["."], function(d) { return new RegExp("."); }],
            [["[", 37, "]"], function(d) { return new RegExp("[" + d[1].join('') + "]"); }]
        ], [
            [[34], id],
            [[35], id],
            [[36], id]
        ], [
            [[":", "+"], function joiner(d) {return d.join('');}]
        ], [
            [[":", "*"], function joiner(d) {return d.join('');}]
        ], [
            [[":", "?"], function joiner(d) {return d.join('');}]
        ], [
            [[]],
            [[37, 38], function(d) { return d[0].concat([d[1]]); }]
        ], [
            [[/[^\\\]]/], function(d) { return d[0]; }],
            [["\\", /./], function(d) { return d[0] + d[1]; }]
        ], [
            [[], function() { return "";}],
            [[39, /[^%]/], function(d) { return d[0] + d[1];}],
            [[39, "%", /[^}]/], function(d) { return d[0] + d[1] + d[2]; }]
        ], [
            [[/[\s]/]],
            [[40, /[\s]/]]
        ], [
            [[]],
            [[40]]
        ], [
            [["#", 43, "\n"]]
        ], [
            [[]],
            [[43, /[^\n]/]]
        ]
    ],
    Names: [
        "final",
        "dqstring_ebnf_1",
        "dstrchar",
        "dqstring",
        "sqstring_ebnf_1",
        "sstrchar",
        "sqstring",
        "btstring_ebnf_1",
        "btstring",
        "strescape",
        "sstrchar_str_1",
        "whit?",
        "prog",
        "prod",
        "whit",
        "word",
        "prod_ebnf_1",
        "prod_ebnf_1_sub_1",
        "prod_ebnf_1_sub_2",
        "expression+",
        "wordlist",
        "prod_ebnf_2",
        "prod_ebnf_2_sub_1",
        "prod_ebnf_2_sub_2",
        "js",
        "prod_str_1",
        "string",
        "prod_str_2",
        "completeexpression",
        "expressionlist",
        "expr",
        "expr_member",
        "charclass",
        "ebnf_modifier",
        "ebnf_modifier_str_1",
        "ebnf_modifier_str_2",
        "ebnf_modifier_str_3",
        "charclassmembers",
        "charclassmember",
        "jscode",
        "whitraw",
        "whitraw?",
        "comment",
        "commentchars"
    ]
};
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
