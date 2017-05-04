// Node-only
function lint(grm, opts) {
    opts = opts || {};
    if (!opts.out) {
        opts.out = process.stderr;
    }
    grm.rules.forEach(function (rules, index) {
        if (rules.length === 0) {
            opts.out.write("WARN\tUndefined symbol `" + grm.names[index] + "` used.\n");
        }
    });
}

module.exports = lint;
