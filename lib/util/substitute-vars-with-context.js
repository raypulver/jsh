var vm = require('vm');
module.exports = function (context) {
  return function substituteVars (cmd) {
    var i = 0, inString = '', escapeNext = false, seq = '', start = false, inBrackets = false, evald;
    while (cmd[i]) {
      if (!escapeNext && cmd[i] === '\\') {
        escapeNext = true;
        i++;
        continue;
      }
      if (start || seq) {
        start = false;
        if (!inString && !inBrackets && /[^\w\.\$_\[\]]/.test(cmd[i])) {
          evald = String(vm.runInContext(seq, context));
          cmd = cmd.substr(0, i - seq.length - 1) + evald + cmd.substr(i);
          i += evald.length - seq.length - 1;
          seq = '';
          continue;
        }
        if (!escapeNext && !inString && (cmd[i] === '\'' || cmd[i] === '"')) {
          inString = cmd[i];
          seq += cmd[i];
          i++;
          continue;
        }
        if (inString) {
          if (!escapeNext && cmd[i] === inString) {
            inString = '';
          }
          seq += cmd[i];
          i++;
          continue;
        }
        if (inBrackets && cmd[i] === '}') {
          evald = String(vm.runInContext(seq, context));
          cmd = cmd.substr(0, i - seq.length - 2) + evald + cmd.substr(i + 1);
          i += evald.length - seq.length - 3;
          seq = '';
          inBrackets = false;
          continue;
        }
        seq += cmd[i];
        i++;
        escapeNext = false;
        continue;
      }
      if (escapeNext) {
        escapeNext = false;
        i++;
        continue;
      }
      if (cmd[i] === '\'') {
        inString = cmd[i];
        i++;
        continue;
      }
      if (inString) {
        if (cmd[i] === inString) {
          inString = '';
        }
        i++;
        continue;
      }
      if (cmd[i] === '$' && cmd[i + 1] !== '{') {
        start = true;
        i++;
        continue;
      }
      if (cmd[i] === '{' && cmd[i - 1] === '$') {
        start = true;
        inBrackets = true;
        i++;
        continue;
      }
      i++;
    }
    return cmd;
  }
}
