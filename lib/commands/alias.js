var aliases = {};
var exports = module.exports = function (alias) {
  var parts;
  if (parts = /(\S+)=(["|'])(.*)\2/.exec(alias)) {
    aliases[parts[1]] = parts[3];
  }
}
exports.aliases = aliases;
