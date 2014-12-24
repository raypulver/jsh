module.exports = function (context) {
  return function substituteTilde (cmd) {
    var i = 0, escapeNext = false;
    while (cmd[i]) {
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      if (cmd[i] === '\\') {
        escapeNext = true;
        i++;
        continue;
      }
      if (cmd[i] === '~') {
        cmd = cmd.substr(0, i) + context.HOME + cmd.substr(i + 1);
        i += context.HOME.length;
        continue;
      }
      i++;
    }
    return cmd;
  }
}
