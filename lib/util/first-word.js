module.exports = function (str) {
  var parts;
  if (parts = /^\s*(\S+)/.exec(str)) return parts[1];
  return '';
}
