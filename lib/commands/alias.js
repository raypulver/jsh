var exports = module.exports = function () {
  var aliases = {};
  alias.aliases = aliases;
  return alias;
  function alias (alias) {
    var parts;
    if (parts = /(\S+)=(["|'])(.*)\2/.exec(alias)) {
      aliases[parts[1]] = parts[3];
    }
  }
}
