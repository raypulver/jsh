var fs = require('fs'),
    path = require('path'),
    escapeRegExp = require('./util/escape-regexp'),
    inJavaScript = require('./util/in-javascript'),
    breakUpCommand = require('./util/break-up-command'),
    escapeShell = require('./util/escape-shell'),
    firstWord = require('./util/first-word'),
    extractJs = require('./util/extract-js'),
    extractPureJs = require('./util/extract-pure-js'),
    allKeys = require('./util/all-keys-starting-with');

module.exports = function (context) {
  var executableExists = require('./util/executable-exists')(context),
      substituteVars = require('./util/substitute-vars-with-context')(context),
      substituteTilde = require('./util/substitute-tilde')(context),
      printPossibles = require('./util/print-possibles')(context),
      cmds = {};

  (function loadCompletors (commands) {
    var re = /^(\S+)\.js$/,
        commandPath = path.join(__dirname, 'completion');
    fs.readdirSync(commandPath).forEach(function (v) {
      var parts = re.exec(v);
      if (parts) commands[parts[1]] = require(path.join(commandPath, parts[1]))(context);
    });
  })(cmds);

  return function complete (cmd) {
    var possibilities = {
      directories: [],
      files: [],
      executables: [],
      js: []
    }, parts, re, condensed, broken, obj, uid = process.getuid(), mode, singleMode, stats, isExecutable;
    if (/^\s*$/.test(cmd)) {
      return [ combine(condense(possibilities), cmd), cmd ];
    } else if (/^\s*\S+$/.test(cmd)) {
      broken = breakUpCommand(cmd);
      if (broken.lastPath === '') context.PATH.split(':').forEach(function (u) {
        if (fs.existsSync(u)) {
          try {
            fs.readdirSync(u).forEach(function (v) {
              try {
                stats = fs.statSync(path.join(u, v));
                mode = stats.mode.toString(8);
                singleMode = +mode[mode.length - 1];
                isExecutable = singleMode % 2 === 1;
                if (!isExecutable) {
                  singleMode = +mode[mode.length - 3];
                  isExecutable = (uid === 0 || uid === stats.uid) && singleMode % 2 === 1;
                }
                if (isExecutable && RegExp('^' + escapeRegExp(broken.last)).test(v)) {
                  possibilities.executables.push(v);
                }
              } catch (e) {}
            });
          } catch (e) {}
        }
      });
      else if (fs.existsSync(broken.lastPath)) {
        try {
          fs.readdirSync(broken.lastPath).forEach(function (v) {
            try {
              stats = fs.statSync(path.join(broken.lastPath, v));
              mode = stats.mode.toString(8);
              singleMode = +mode[mode.length - 1];
              isExecutable = singleMode % 2 === 1;
              if (!isExecutable) {
                singleMode = +mode[mode.length - 3];
                isExecutable = (uid === 0 || uid === stats.uid) && singleMode % 2 === 1;
              }
              if (stats.isDirectory() && RegExp('^' + escapeRegExp(broken.last)).test(v)) possibilities.directories.push(v);
              else if (isExecutable && RegExp('^' + escapeRegExp(broken.last)).test(v)) {
                possibilities.executables.push(v);
              }
            } catch (e) {}
          });
        } catch (e) {}
      }
      var js = extractPureJs(cmd);
      try {
        obj = eval('context' + (js.lastPath ? '.' : '') + js.lastPath);
        possibilities.js = allKeys(obj, js.last);
        printPossibles(possibilities);
      } catch (e) {}
      return [ firstWordCombine(possibilities, cmd), cmd ];
    }
    else if (/^\s*\S+\s+\S*/.test(cmd)) {
      if (isBuiltIn(cmd)) {
        possibilities = cmds[firstWord(cmd)](cmd);
        printPossibles(possibilities);
        return [ combine(condense(possibilities), cmd), cmd ];
      } else if (executableExists(firstWord(cmd)) || context.cmds.alias.aliases[firstWord(cmd)]) {
        if (inJavaScript(cmd)) {
          broken = extractJs(cmd);
          try {
            obj = eval('context' + (broken.lastPath ? '.' : '') + broken.lastPath);
            possibilities.js = allKeys(obj, broken.last);
            printPossibles(possibilities);
            return [ combine(condense(possibilities), cmd), cmd ];
          } catch (e) {}
        } else {
          broken = breakUpCommand(substituteTilde(substituteVars(cmd)));
          if (!broken.lastPath) broken.lastPath = process.cwd();
          re = RegExp('^' + escapeRegExp(broken.last));
          if (fs.existsSync(broken.lastPath)) {
            try {
              fs.readdirSync(broken.lastPath).forEach(function (v) {
                if (re.test(v)) {
                  try {
                    stats = fs.statSync(path.join(broken.lastPath, v));
                    mode = stats.mode.toString(8);
                    singleMode = +mode[mode.length - 1];
                    isExecutable = singleMode % 2 === 1;
                    if (!isExecutable) {
                      singleMode = +mode[mode.length - 3];
                      isExecutable = (uid === 0 || uid === stats.uid) && singleMode % 2 === 1;
                    }
                    if (stats.isDirectory()) possibilities.directories.push(v);
                    else if (isExecutable) {
                      possibilities.executables.push(v);
                    } else possibilities.files.push(v);
                  } catch (e) {}
                }
              });
            } catch (e) {}
          }
          printPossibles(possibilities);
          return [ combine(condense(possibilities), cmd), cmd ];
        }
      } else {
        broken = extractPureJs(cmd);
        try {
          obj = eval('context' + (broken.lastPath ? '.' : '') + broken.lastPath);
          possibilities.js = allKeys(obj, broken.last);
          printPossibles(possibilities);
        } catch (e) {}
        return [ combine(condense(possibilities), cmd), cmd ];
      }
    }
  };
  function firstWordCombine (possibilities, cmd) {
    var shellCmds = Object.keys(possibilities).reduce(function (r, u) {
      if (u !== 'js') {
        possibilities[u].forEach(function (v) {
          r.push(v + (u === 'directories' ? '/' : ' '));
        });
      }
      return r;
    }, []), re = /^(.*[\/\s])?[^\/\s]*$/, parts = re.exec(cmd), jsparts = extractPureJs(cmd),
      js = Object.keys(possibilities.js).reduce(function (r, v) {
        possibilities.js[v].forEach(function (v) { r.push(v); });
        return r;
      }, []);
    if (!parts[1]) parts[1] = '';
    return shellCmds.map(function (v) {
      return parts[1] + v;
    }).concat(js.map(function (v) {
      return jsparts.rest + jsparts.lastPath + (jsparts.lastPath ? '.': '') + v;
    }));
  }
  function combine (possibilities, cmd) {
    var parts, broken;
    if (executableExists(firstWord(cmd)) || isBuiltIn(cmd)) {
      if (!inJavaScript(cmd)) {
        parts = /^(.*[\/\s])?[^\/\s]*$/.exec(cmd);
        possibilities = possibilities.map(function (v) {
          if (!parts[1]) parts[1] = '';
          return parts[1] + v;
        });
        return possibilities;
      } else {
        broken = extractJs(cmd);
        possibilities = possibilities.map(function (v) {
          return broken.rest + broken.lastPath + (broken.lastPath ? '.': '') + v;
        });
        return possibilities;
      }
    } else {
      broken = extractPureJs(cmd);
      possibilities = possibilities.map(function (v) {
        return broken.rest + broken.lastPath + (broken.lastPath ? '.': '') + v;
      });
      return possibilities;
    }
  }
  function isBuiltIn (cmd) {
    var word = firstWord(cmd);
    return Object.keys(cmds).reduce(function (r, v) {
      if (r) return true;
      return v === word;
    }, false);
  }
};

function condense (possibilities) {
  var ret = [];
  possibilities.directories.forEach(function (v) {
    ret.push(escapeShell(v) + '/');
  });
  possibilities.files.forEach(function (v) {
    ret.push(escapeShell(v) + ' ');
  });
  possibilities.executables.forEach(function (v) {
    ret.push(escapeShell(v) + ' ');
  });
  possibilities.js.forEach(function (v) {
    v.forEach(function (v) {
      ret.push(v);
    });
  });
  return ret;
}
