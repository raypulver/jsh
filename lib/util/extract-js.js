module.exports = function extractJs (cmd) {
  var i = 0, inJs = false, escapeNext = false, inString = '', inBrackets = false;
  var ret = {
    last: '',
    lastPath: '',
    rest: ''
  };
  while (cmd[i]) {
    if (!inString && !escapeNext && (cmd[i] === '\'' || cmd[i] === '"')) {
      inString = cmd[i];
      ret.last += cmd[i];
      i++;
      continue;
    }
    if (!escapeNext && cmd[i] === inString) {
      ret.last += cmd[i];
      inString = '';
      i++;
      continue;
    }
    if (!inJs) {
      if (!escapeNext && cmd[i] === '\\') {
        escapeNext = true;
        ret.last += cmd[i];
        i++;
        continue;
      }
      if (escapeNext) {
        ret.last += cmd[i];
        escapeNext = false;
        i++;
        continue;
      }
      if (!escapeNext && cmd[i] === '$' && cmd[i + 1] !== '{') {
        ret.last += cmd[i];
        ret.rest += ret.last;
        ret.last = '';
        inJs = true;
        i++;
        continue;
      }
      if (cmd[i] === '{' && cmd[i - 1] === '$') {
        ret.last += cmd[i];
        ret.rest += ret.last;
        ret.last = '';
        inJs = true;
        inBrackets = true;
        i++;
        continue;
      }
      ret.last += cmd[i];
      i++;
      continue;
    }
    if (!inString && cmd[i] === '.') {
      if (ret.lastPath) ret.lastPath += '.';
      ret.lastPath += ret.last;
      ret.last = '';
      i++;
      continue;
    }
    if (!inString && (cmd[i] === ' ' || cmd[i] === '(' || cmd[i] === ')')) {
      ret.rest += ret.lastPath + (ret.lastPath ? '.': '') + ret.last + cmd[i];
      ret.lastPath = '';
      ret.last = '';
      i++;
      continue;
    }
    if (!inBrackets && /[^\w\.\$_\[\]]/.test(cmd[i])) {
      ret.rest += ret.last + cmd[i];
      ret.last = '';
      i++;
      inJs = false;
      continue;
    }
    if (inBrackets && !inString && cmd[i] === '}') {
      ret.rest += ret.lastPath + ret.last + cmd[i];
      ret.lastPath = '';
      ret.last = '';
      i++;
      inJs = false;
      continue;
    }
    ret.last += cmd[i];
    i++;
  }
  if (!inJs) {
    ret.rest += ret.last;
    ret.last = '';
  }
  return ret;
}
