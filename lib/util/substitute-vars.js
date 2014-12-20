module.exports = function substituteVars (cmd) {
  var i = 0, start = false, seq = '', j, escapeNext = false, inBrackets = false, inString = '';
  while (cmd[i]) {
    if (start || seq) {
      start = false;
      if (!inString && !inBrackets && /[^\w\.\$_\[\]]/.test(cmd[i])) {
        cmd = cmd.substr(0, i - seq.length - 1) + '\' + ' + seq + ' + \'' + cmd.substr(i);
        i += 7;
        seq = '';
        continue;
      }
      if (!inString && cmd[i - 1] === '\\' && (cmd[i] === '\'' || cmd[i] === '"')) {
        inString = cmd[i];
        seq += cmd[i];
        i++;
        continue;
      }
      if (inString) {
        if (cmd[i] === inString && cmd[i - 1] === '\\' && !(cmd[i - 1] === '\\' && cmd[i - 2] === '\\')) {
          inString = '';
        }
        seq += cmd[i];
        i++;
        continue;
      }
      if (inBrackets && cmd[i] === '}') {
        cmd = cmd.substr(0, i - seq.length - 2) + '\' + ' + seq.replace(/\\'/g, '\'') + ' + \'' + cmd.substr(i + 1);
        i += 7;
        seq = '';
        continue;
      }
      seq += cmd[i];
      i++;
      continue;
    }
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
    if (!inString && cmd[i - 1] === '\\' && (cmd[i] === '"' || cmd[i] === '\'')) {
      inString = cmd[i];
      i++;
      continue;
    }
    if (cmd[i] === inString && cmd[i - 1] === '\\' && cmd[i - 2] !== '\\') {
      inString = '';
      i++;
      continue;
    }
    if (!inString && cmd[i] === '$' && cmd[i + 1] !== '{') {
      start = true;
      i++;
      continue;
    }
    if (!inString && cmd[i] === '{' && cmd[i - 1] === '$') {
      start = true;
      inBrackets = true;
      i++;
      continue;
    }
    i++;
  }
  return cmd;
}
