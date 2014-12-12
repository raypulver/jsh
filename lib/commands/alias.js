var aliases = {};
var exports = module.exports = function () {
  var args = [].slice.call(arguments);
  var key = args.splice(0, 1);
  aliases[key] = args.join(' ');
}
exports.aliases = aliases;
