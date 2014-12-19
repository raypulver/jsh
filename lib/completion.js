var fs = require('fs'),
    path = require('path'),
    escapeRegExp = require('./util/escape-regexp'),
    times = require('./util/string-multiply'),
    cmds = {};

(function loadCompletors (commands) {
  var re = /^(\S+)\.js$/,
      commandPath = path.join(__dirname, 'completion');
  fs.readdirSync(commandPath).forEach(function (v) {
    var parts;
    if (parts = re.exec(v)) commands[parts[1]] = require(path.join(commandPath, parts[1]));
  });
})(cmds);
module.exports = function complete (cmd) {
  var possibilities = {
    directories: [],
    files: []
  }, parts, re, condensed;
  if (parts = /^(((\.\.\/)|(\.\/)|(\/))(.*\/)?)(\S*)/.exec(cmd)) {
    re = RegExp('^' + escapeRegExp(parts[7]));
    fs.readdirSync(path.resolve(parts[1])).forEach(function (v) {
      if (re.test(v)) {
        if (fs.statSync(parts[1] + v).isDirectory()) possibilities.directories.push(v);
        else possibilities.files.push(v);
      }
    });
    condensed = condense(possibilities);
    if (condensed.length > 1) printPossibles(possibilities);
    return [ combine(condensed, cmd), cmd ];
  } else if (parts = /^\s*(\S*)$/.exec(cmd)) {
    re = RegExp('^' + escapeRegExp(cmd.trim()));
    process.env.PATH.split(':').forEach(function (u) {
      fs.readdirSync(u).forEach(function (v) {
        if (re.test(v))
          try {
            if (!fs.statSync(path.join(u, v)).isDirectory())
              possibilities.files.push(v);
          } catch (e) {}
      });
    });
    condensed = condense(possibilities);
    if (condensed.length > 1) printPossibles(possibilities);
    return [ combine(condensed, cmd), cmd ];
  } else if (parts = /^\s*(\S+)\s+(.*?(\S*\/)?(\S*))$/.exec(cmd)) {
    var completor = cmds[parts[1]];
    if (completor) {
      var subpossibilities = completor(parts[2]);
      condensed = condense(subpossibilities);
      if (condensed.length > 1) printPossibles(subpossibilities);
      return [ combine(condensed, cmd), cmd ];
    }
    re = RegExp('^' + escapeRegExp(parts[4]));
    var beginPath = parts[3] || process.cwd();
    fs.readdirSync(beginPath).forEach(function (v) {
      if (re.test(v)) {
        try {
          if (fs.statSync(path.join(beginPath, v)).isDirectory())
            possibilities.directories.push(v);
          else
            possibilities.files.push(v);
        } catch (e) {}
      }
    });
    condensed = condense(possibilities);
    if (condensed.length > 1) printPossibles(possibilities);
    return [ combine(condensed, cmd), cmd ];
  }
}
function condense (possibilities) {
  var ret = [];
  possibilities.directories.forEach(function (v) {
    ret.push(v + '/');
  });
  possibilities.files.forEach(function (v) {
    ret.push(v + ' ');
  });
  return ret;
}
function combine (possibilities, cmd) {
  var parts = /^(.*[\/\s])?[^\/\s]*$/.exec(cmd);
  possibilities = possibilities.map(function (v) {
    if (!parts[1]) parts[1] = '';
    return parts[1] + v;
  });
  return possibilities;
}
function printPossibles (possibles) {
  write('\n');
  var cursor = 0,
      max,
      largest = Object.keys(possibles).reduce(function (r, v) {
        var arr = [];
        possibles[v].forEach(function (v) {
          arr.push(v.length);
        });
        var max = Math.max.apply(void 0, arr);
        return max > r ? max: r;
      }, 0),
      cols = Math.floor(process.stdout.columns/largest),
      width = process.stdout.columns/cols;
  while (possibles.directories[0]) {
    max = Math.max(width - possibles.directories[0].length, 2);
    if (max + possibles.directories[0].length + 1 + cursor > process.stdout.columns) {
      write('\n');
      cursor = 0;
    }
    write('\033[1;34m' + possibles.directories[0] + '\033[22;39m/' + times(' ', max));
    cursor += possibles.directories[0].length + max + 1;
    possibles.directories.splice(0, 1);
  }
  while (possibles.files[0]) {
    max = Math.max(width - possibles.files[0].length, 2);
    if (max + possibles.files[0].length + 1 + cursor > process.stdout.columns) {
      write('\n');
      cursor = 0;
    }
    write(possibles.files[0] + times(' ', max));
    cursor += possibles.files[0].length + max;
    possibles.files.splice(0, 1);
  }
  write('\n');
}
function write (chars) {
  process.stdout.write(chars);
}
