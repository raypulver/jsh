module.exports = function extractJs (cmd) {
  var i = 0, inString = '', escapeNext = false;
  var ret = {
    last: '',
    lastPath: '',
    rest: ''
  };
  while (cmd[i]) {
    if (!escapeNext && cmd[i] === '\\') {
      escapeNext = true;
      ret.last += cmd[i];
      i++;
      continue;
    }
    if (escapeNext) {
      escapeNext = false;
      ret.last += cmd[i];
      i++;
      continue;
    }
    if (!inString && !escapeNext && (cmd[i] === '\'' || cmd[i] === '"')) {
      ret.last += cmd[i];
      inString = cmd[i];
      i++;
      continue;
    }
    if (inString && !escapeNext && cmd[i] === inString) {
      ret.last += cmd[i];
      inString = '';
      i++;
      continue;
    }
    if (!inString && cmd[i] === ' ') {
      ret.rest += ret.lastPath + ret.last + ' ';
      ret.lastPath = '';
      ret.last = '';
      i++;
      continue;
    }
    if (cmd[i] === '.') {
      if (ret.lastPath) ret.lastPath += '.';
      ret.lastPath += ret.last;
      ret.last = '';
      i++;
      continue;
    }
    ret.last += cmd[i];
    i++
  }
  return ret;
}
