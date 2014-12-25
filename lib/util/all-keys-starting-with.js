var escapeRegExp = require('./escape-regexp');
module.exports = function allKeysStartingWith (obj, startsWith) {
  var ret = [];
  while (obj) {
    ret.push(Object.getOwnPropertyNames(obj).filter(function (v) {
      return RegExp('^' + escapeRegExp(startsWith)).test(v);
    }));
    obj = Object.getPrototypeOf(obj);
  }
  return ret;
}
