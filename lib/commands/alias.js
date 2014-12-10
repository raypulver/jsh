module.exports = function () {
  var args = [].slice.call(arguments);
  var key = args.splice(0, 1);
  this.aliases[key] = args.join(' ');
}
