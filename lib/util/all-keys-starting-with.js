var escapeRegExp = require('./escape-regexp');
module.exports = function allKeysStartingWith (obj, startsWith) {
  var ret = [],
      type = typeof obj;
  if (type === 'number') obj = Number.prototype;
  else if (type === 'string') obj = String.prototype;
  else if (type === 'boolean') obj = Boolean.prototype;
  while (obj) {
    ret.push(Object.getOwnPropertyNames(obj).filter(function (v) {
      return RegExp('^' + escapeRegExp(startsWith)).test(v);
    }));
    obj = Object.getPrototypeOf(obj);
  }
  return ret;
}
