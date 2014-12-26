module.exports = function (context) {
  var aliases = context.cmds.alias.aliases;
  return function substituteAliases (cmd) {
    var j = 0, start = 0;
    for (var i in aliases) {
      j = 0, start = 0, found = false;
      while (cmd[j]) {
        if (cmd[j + start] === i[start]) {
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
