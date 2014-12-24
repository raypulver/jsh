var fs = require('fs'),
    path = require('path'),
    escapeRegExp = require('../util/escape-regexp'),
    escapeSpaces = require('../util/escape-spaces'),
    inJavaScript = require('../util/in-javascript'),
    extractJs = require('../util/extract-js'),
    allKeys = require('../util/all-keys-starting-with'),
    breakUpCommand = require('../util/break-up-command');
module.exports = function (context) {
  var substituteVars = require('../util/substitute-vars-with-context')(context),
      substituteTilde = require('../util/substitute-tilde')(context);
  return function (cmd) {
    var ret = {
      files: [],
      executables: [],
      directories: [],
      js: []
    }, broken, stats, obj, re;
    if (inJavaScript(cmd)) {
      broken = extractJs(cmd);
      obj = eval('context' + (broken.lastPath ? '.': '') + broken.lastPath);
      ret.js = allKeys(obj, broken.last);
      return ret;
    } else {
      broken = breakUpCommand(substituteVars(substituteTilde(cmd)));
      if (!broken.lastPath) broken.lastPath = process.cwd();
      re = RegExp('^' + broken.last);
      if (fs.existsSync(broken.lastPath)) {
        fs.readdirSync(broken.lastPath).forEach(function (v) {
          if (re.test(v)) {
            try {
              stats = fs.statSync(path.join(broken.lastPath, v));
              if (stats.isDirectory()) ret.directories.push(v);
            } catch (e) {}
          }
        });
      }
      return ret;
    }
  }
}
