(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

function Rule(exp, grammar, symbols, postprocess) {
    this.exp = exp;
    this.grammar = grammar;
    this.symbols = symbols; // a list of literal | regex class | nonterminal
    this.postprocess = postprocess;
    return this;
}

Rule.prototype.toString = function(withCursorAt) {
    var self = this;
    function stringifySymbolSequence (e) {
        var type = typeof e;
        return type === "string" ? JSON.stringify(e) :
            type === "number" ? self.grammar.names[e] :
            e.type ? "%" + e.type : e.toString();
    }
    var symbolSequence = typeof withCursorAt === "undefined" ?
        this.symbols.map(stringifySymbolSequence).join(' ') :
        (
            this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ') +
            " ● " +
            this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')
        );
    return this.grammar.names[this.exp] + " → " + symbolSequence;
};


// a State is a rule at a position from a given starting point in the input stream (reference)
function State(rule, dot, reference, location, wantedBy) {
    this.rule = rule;
    this.dot = dot;
    this.reference = reference;
    this.location = location;
    this.data = [];
    this.wantedBy = wantedBy;
    this.isComplete = this.dot === rule.symbols.length;
}

State.prototype.toString = function() {
    return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
};

State.prototype.nextState = function(child, location) {
    var state = new State(this.rule, this.dot + 1, this.reference, location, this.wantedBy);
    state.left = this;
    state.right = child;
    if (state.isComplete)
        state.data = state.build();
    return state;
};

State.prototype.build = function() {
    var children = [],
        node = this;
    do {
        children.push(node.right.data);
        node = node.left;
    } while (node.left);
    children.reverse();
    return children;
};

State.prototype.finish = function() {
    if (this.rule.postprocess) {
        this.data = this.rule.postprocess(this.data, this.location, Parser.fail);
    }
};


function Column(grammar, index, location) {
    this.grammar = grammar;
    this.index = index;
    this.location = location;
    this.states = [];
    this.wants = []; // states indexed by the non-terminal they expect
    this.scannable = []; // list of states that expect a token
    this.completed = []; // states that are nullable
}


Column.prototype.process = function(nextColumn) {
    var states = this.states,
        wants = this.wants,
        completed = this.completed,
        exp;

    for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
        var state = states[w];

        if (state.isComplete) {
            state.finish();
            if (state.data !== Parser.fail) {
                // complete
                var wantedBy = state.wantedBy;
                for (var i = wantedBy.length; i--; ) { // this line is hot
                    this.complete(wantedBy[i], state);
                }

                // special-case nullables
                if (state.reference === this.index) {
                    // make sure future predictors of this rule get completed.
                    exp = state.rule.exp;
                    (completed[exp] = completed[exp] || []).push(state);
                }
            }
        } else {
            // queue scannable states
            exp = state.rule.symbols[state.dot];
            if (typeof exp !== 'number') {
                this.scannable.push(state);
                continue;
            }

            // predict
            if (wants[exp]) {
                wants[exp].push(state);

                if (completed[exp]) {
                    var nulls = completed[exp];
                    for (var i = 0; i < nulls.length; i++) {
                        this.complete(state, nulls[i]);
                    }
                }
            } else {
                wants[exp] = [state];
                this.predict(exp);
            }
        }
    }
};

Column.prototype.predict = function(exp) {
    var rules = this.grammar.rules[exp] || [];

    for (var i = 0; i < rules.length; i++) {
        this.states.push(new State(rules[i], 0, this.index, this.location, this.wants[exp]));
    }
};

Column.prototype.complete = function(left, right) {
    if (left.rule.symbols[left.dot] === right.rule.exp) {
        this.states.push(left.nextState(right, right.location));
    }
};


function Grammar(rules) {
    this.rules = rules;
}

// So we can allow passing (rules) directly to Parser for backwards compatibility
Grammar.fromCompiled = function(rules, names) {
    var lexer = rules.Lexer;
    var g = new Grammar(rules.map(function (ruleSet, i) {
        return ruleSet.map(function (rule) {
            return new Rule(i, g, rule[0], rule[1]);
        });
    }));
    g.names = names;
    g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
    return g;
};


function StreamLexer() {
    this.reset("");
}

StreamLexer.prototype.reset = function(data, state) {
    this.buffer = data;
    this.index = 0;
    this.line = state ? state.line : 1;
    this.lastLineBreak = state ? -state.col : 0;
};

StreamLexer.prototype.next = function() {
    if (this.index < this.buffer.length) {
        var ch = this.buffer[this.index++];
        if (ch === "\n") {
          this.line += 1;
          this.lastLineBreak = this.index;
        }
        return {value: ch};
    }
};

StreamLexer.prototype.save = function() {
    return {
        line: this.line,
        col: this.index - this.lastLineBreak,
    };
};

StreamLexer.prototype.formatError = function(token, message) {
    // nb. this gets called after consuming the offending token,
    // so the culprit is index-1
    var buffer = this.buffer;
    if (typeof buffer === 'string') {
        var nextLineBreak = buffer.indexOf('\n', this.index);
        if (nextLineBreak === -1) {
            nextLineBreak = buffer.length;
        }
        var line = buffer.substring(this.lastLineBreak, nextLineBreak);
        var col = this.index - this.lastLineBreak;
        message += " at line " + this.line + " col " + col + ":\n\n";
            + "  " + line + "\n"
            + "  " + Array(col).join(" ") + "^";
        return message;
    } else {
        return message + " at index " + (this.index - 1);
    }
};


function Parser(rules, names, options) {
    var grammar;
    if (rules instanceof Grammar) {
        grammar = this.grammar = rules;
        options = names;
    } else {
        grammar = this.grammar = Grammar.fromCompiled(rules, names);
    }
    
    this.start = grammar.rules[0];

    // Read options
    this.options = {
        keepHistory: false,
        lexer: grammar.lexer || new StreamLexer(),
    };

    for (var key in (options || {})) {
        this.options[key] = options[key];
    }

    // Setup lexer
    this.lexer = this.options.lexer;
    this.lexerState = undefined;

    // Setup a table
    var column = new Column(grammar, 0);
    this.table = [column];

    // I could be expecting anything.
    column.wants[0] = [];
    column.predict(0);
    // TODO what if start rule is nullable?
    column.process();
    this.current = 0; // token index
    
    this.tokens = 0; // tokens consumed
}

// create a reserved token for indicating a parse fail
Parser.fail = {};

//TODO: change to work with new rules table
Parser.prototype.feed = function(chunk) {
    var lexer = this.lexer,
        token;
    lexer.reset(chunk, this.lexerState);

    while ((token = lexer.next())) {
        this.tokens++;
        // We add new states to table[current+1]
        var column = this.table[this.current];

        // GC unused states
        if (!this.options.keepHistory) {
            delete this.table[this.current - 1];
        }

        var n = this.current + 1,
            location = lexer.save(),
            nextColumn = new Column(this.grammar, n, location);
        this.table.push(nextColumn);

        // Advance all tokens that expect the symbol
        var literal = token.value,
            value = lexer.constructor === StreamLexer ? token.value : token,
            scannable = column.scannable;
        for (var w = scannable.length; w--; ) {
            var state = scannable[w];
            var expect = state.rule.symbols[state.dot];
            // Try to consume the token, either regex or literal
            if (expect.test ? expect.test(value) :
                expect.type ? expect.type === token.type
                            : expect === literal) {
                // Add it
                var next = state.nextState({data: value, token: token, isToken: true}, location);
                nextColumn.states.push(next);
            }
        }
        // TODO: make it only process things once if same state and same index if faster - somebody

        // Next, for each of the rules, we either
        // (a) complete it, and try to see if the reference row expected that
        //     rule
        // (b) predict the next nonterminal it expects by adding that
        //     nonterminal's start state
        // To prevent duplication, we also keep track of rules we have already
        // added

        nextColumn.process();

        // If needed, throw an error:
        if (nextColumn.states.length === 0) {
            // No states at all! This is not good.
            var message = this.lexer.formatError(token, "invalid syntax") + "\n";
            message += "Unexpected " + (token.type ? token.type + " token: " : "");
            message += JSON.stringify(typeof token.value !== "undefined" ? token.value : token) + "\n";
            var err = new Error(message);
            err.offset = this.current;
            throw err;
        }

        // maybe save lexer state
        if (this.options.keepHistory) {
            column.lexerState = lexer.save();
        }

        this.current++;
    }
    if (column) {
        this.lexerState = lexer.save();
    }

    // Incrementally keep track of results
    this.results = this.finish();

    // Allow chaining, for whatever it's worth
    return this;
};

Parser.prototype.save = function() {
    var column = this.table[this.current];
    column.lexerState = this.lexerState;
    return column;
};

Parser.prototype.restore = function(column) {
    var index = column.index;
    this.current = index;
    this.table[index] = column;
    this.table.splice(index + 1);
    this.lexerState = column.lexerState;

    // Incrementally keep track of results
    this.results = this.finish();
};

// nb. deprecated: use save/restore instead!
Parser.prototype.rewind = function(index) {
    if (!this.options.keepHistory) {
        throw new Error('set option `keepHistory` to enable rewinding');
    }
    // nb. recall column (table) indicies fall between token indicies.
    //        col 0   --   token 0   --   col 1
    this.restore(this.table[index]);
};

Parser.prototype.finish = function() {
    // Return the possible parsings
    var considerations = [],
        column = this.table[this.table.length - 1];
    var self = this;
    column.states.forEach(function (t) {
        if (self.start.indexOf(t.rule) !== -1
            && t.dot === t.rule.symbols.length
            && t.reference === 0
            && t.data !== Parser.fail
        ) {
            considerations.push(t);
        }
    });
    var result = considerations.map(function(c) {return c.data; });
    result.tokens = this.tokens;
    return result;
};

return {
    Parser: Parser,
    Grammar: Grammar,
    Rule: Rule,
};

}));
