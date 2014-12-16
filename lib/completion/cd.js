var fs = require('fs'),
    path = require('path'),
    escapeRegExp = require('../util/escape-regexp');
module.exports = function (fragment) {
  var ret = {
    directories: [],
    files: []
  },  parts = /^(\S*\/)?(\S*)/.exec(fragment),
      currentPath = parts[1] || process.cwd();
      re = RegExp('^' + escapeRegExp(parts[2]));
  if (fs.existsSync(currentPath)) return fs.readdirSync(currentPath).reduce(function (r, v) {
    try {
      if (re.test(v) && fs.statSync(path.join(currentPath, v)).isDirectory()) r.directories.push(v);
    } catch (e) {}
    return r;
  }, ret);
  else return ret;
}
