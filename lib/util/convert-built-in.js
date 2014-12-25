var substituteVars = require('./substitute-vars');
module.exports = function (context) {
  var substituteTilde = require('./substitute-tilde')(context);
  return function convertBuiltIn(cmd) {
    var commands = Object.keys(context.cmds);
    cmd = cmd.trim();
    var split = cmd.split(/\s+/);
    var last = split[split.length - 1],
        arg;
    if (last[last.length - 1] === ';') split[split.length - 1] = last.substr(0, last.length - 1);
    if (commands.reduce(function (r, v) {
      if (r) return r;
      else if (v === split[0]) return true;
      else return false;
    }, false)) {
      cmd = 'cmds.' + split.splice(0, 1);
      arg = split.join(' ');
      cmd += '(\'' + arg.replace(/'/g, '\\\'') + '\');';
      return substituteTilde(substituteVars(cmd));
    } else return false;
  }
}
