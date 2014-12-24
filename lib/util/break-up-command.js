module.exports = function (cmd) {
  var i = 0, escapeNext = false;
  var ret = {
    rest: '',
    lastPath: '',
    last: ''
  };
  while (cmd[i]) {
    if (!escapeNext && cmd[i] === '\\') {
      escapeNext = true,
      i++;
      continue;
    }
    if (!escapeNext && cmd[i] === ' ') {
      ret.rest += ret.lastPath + ret.last + ' ',
      ret.lastPath = '',
      ret.last = '',
      i++;
      continue;
    }
    if (!escapeNext && cmd[i] === '/') {
      ret.lastPath += ret.last + '/',
      ret.last = '',
      i++;
      continue;
    }
    ret.last += cmd[i];
    i++;
    escapeNext = false;
  }
  return ret;
}
