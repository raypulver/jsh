var removeParens = require('./remove-parens'),
    substituteVars = require('./substitute-vars'),
    unescapeAndQuote = require('./unescape-and-quote'),
    stripSemicolon = require('./strip-semicolon');
module.exports = function (context) {
  var executableExists = require('./executable-exists')(context),
      substituteTilde = require('./substitute-tilde')(context),
      substituteAliases = require('./substitute-aliases')(context),
      convertBuiltIn = require('./convert-built-in')(context);
  return function sandr (cmd) {
    var parts = cmd.split('\n');
    parts = parts.map(function (v) {
      if (/^\s*\S+/.test(v)) {
        var builtIn = convertBuiltIn(v);
        if (builtIn) return builtIn;
        else if (executableExists(removeParens(stripSemicolon(v.match(/^\s*(\S+)/)[1]))) || context.cmds.alias.aliases[stripSemicolon(v.match(/^\s*(\S+)/)[1])]) return substituteTilde(substituteVars(unescapeAndQuote(substituteAliases(v)).replace(/'/g, '\\\'').replace(/^\s*(.*?);?$/g, 'execSync(\'$1\');')));
        return v;
      }
      return v;
    });
    return parts.join('\n');
  }
}
