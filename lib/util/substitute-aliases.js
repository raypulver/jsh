module.exports = function (context) {
  var aliases = context.cmds.alias.aliases;
  return function substituteAliases (cmd) {
    Object.keys(aliases).forEach(function (v) {
      cmd = cmd.replace(RegExp('^(\\s*)' + v, 'g'), '$1' + aliases[v]);
    });
    return cmd;
  }
}
