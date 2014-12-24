var fs = require('fs'),
    path = require('path');
module.exports = function (context) {
  return function executableExists (exe) {
    if (/^(\.)?(\.)?\//.test(exe)) {
      return fs.existsSync(path.resolve(exe));
    }
    return context.PATH.split(':').reduce(function (r, v) {
      if (r) return true;
      return fs.existsSync(path.join(v, exe));
    }, false);
  }
}
