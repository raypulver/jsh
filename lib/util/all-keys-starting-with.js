var escapeRegExp = require('./escape-regexp');
module.exports = function allKeysStartingWith (obj, startsWith) {
  var ret = [];
  while (obj) {
    ret.push(Object.keys(obj).filter(function (v) {
      return RegExp('^' + escapeRegExp(startsWith)).test(v);
    }));
    obj = obj.__proto__;
  }
  return ret;
}
