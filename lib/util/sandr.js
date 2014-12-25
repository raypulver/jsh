var removeParens = require('./remove-parens'),
    substituteVars = require('./substitute-vars'),
    unescapeAndQuote = require('./unescape-and-quote');
module.exports = function (context) {
  var executableExists = require('./executable-exists')(context),
      substituteTilde = require('./substitute-tilde')(context),
      convertBuiltIn = require('./convert-built-in')(context);
  return function sandr (cmd) {
    var parts = cmd.split('\n');
    parts = parts.map(function (v) {
      if (/^\s*\S+/.test(v)) {
        var builtIn = convertBuiltIn(v);
        if (builtIn) return builtIn;
        else if (executableExists(removeParens(v.match(/^\s*(\S+)/)[1]))) return substituteTilde(substituteVars(unescapeAndQuote(v).replace(/'/g, '\\\'').replace(/^\s*(.*?);?$/g, 'execSync(\'$1\');')));
        return v;
      }
      return v;
    });
    return parts.join('\n');
  }
}
