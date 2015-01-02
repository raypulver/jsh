module.exports = function (context) {
  var aliases = context.cmds.alias.aliases;
  return function substituteAliases (cmd) {
    var j = 0, start = 0;
    for (var i in aliases) {
      j = 0, start = 0, found = false, inFirst = false;
      while (cmd[j]) {
        if (!inFirst && /\w/.test(cmd[j + start])) inFirst = true;
        if (inFirst && /\s/.test(cmd[j + start])) break;
        if ((cmd[j - 1] === undefined || cmd[j - 1] === ' ' || cmd[j - 1] === ';') && cmd[j + start] === i[start]) {
          start++;
          if (start === i.length) {
            if (/\s/.test(cmd[j + start]) || cmd[j + start] === undefined || cmd[j + start] === ';') {
              cmd = cmd.substr(0, j) + aliases[i] + cmd.substr(j + start);
              j += start + aliases[i].length;
              start = 0;
              found = true;
            }
          }
          continue;
        } else if (start) {
          j += start;
          start = 0;
        }
        j++;
      }
      if (found) break;
    }
    return cmd;
  }
}
