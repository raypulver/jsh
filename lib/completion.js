var fs = require('fs'),
    path = require('path'),
    escapeRegExp = require('./util/escape-regexp'),
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
  }, parts, re;
  if (parts = /^(((\.\.\/)|(\.\/)|(\/))(.*\/)?)(\S*)/.exec(cmd)) {
    re = RegExp('^' + escapeRegExp(parts[7]));
    fs.readdirSync(path.resolve(parts[1])).forEach(function (v) {
      if (re.test(v)) {
        if (fs.statSync(parts[1] + v).isDirectory()) possibilities.directories.push(v);
        else possibilities.files.push(v);
      }
    });
    return [ bestMatch(cmd, possibilities), possibilities ];
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
    return [ bestMatch(cmd, possibilities), possibilities ];
  } else if (parts = /^\s*(\S+)\s+(.*?(\S*\/)?(\S*))$/.exec(cmd)) {
    var completor = cmds[parts[1]];
    if (completor) {
      var subpossibilities = completor(parts[2]);
      return [ bestMatch(cmd, subpossibilities), subpossibilities ];
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
    return [ bestMatch(cmd, possibilities), possibilities ];
  }
}
function bestMatch(cmd, possibilities) {
  var parts, word, sample;
  if (parts = /(.*\/)(.*)/.exec(cmd)) word = parts[2];
  else if (parts = /(.*\s+)(.*)/.exec(cmd)) word = parts[2];
  else word = cmd;
  var index = word.length;
  if (possibilities.directories.length > 0) sample = possibilities.directories[0];
  else if (possibilities.files.length > 0) sample = possibilities.files[0];
  else sample = '';
  while (sameLetterAt(condense(possibilities), index)) {
    word += sample[index];
    index++;
  }
  if (possibilities.files.length === 0 && possibilities.directories.length === 1) word += '/';
  else if (possibilities.files.length === 1 && possibilities.directories.length === 0) word += ' ';
  return (parts ? parts[1] : '') + word;
}
function sameLetterAt (arr, n) {
  if (arr[0]) {
    var letter = arr[0][n];
    if (typeof letter === 'undefined') return false;
    for (var i = 1; i < arr.length; i++)
      if (arr[i][n] !== letter) return false;
    return true;
  } else {
    return false;
  }
}
function condense (possibilities) {
  return Object.keys(possibilities).reduce(function (r, v) {
    possibilities[v].forEach(function (v) {
      r.push(v);
    });
    return r;
  }, []);
}
