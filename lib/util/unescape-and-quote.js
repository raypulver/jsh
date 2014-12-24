module.exports = function (cmd) {
  var i = 0, whole = '', last = '', escapeNext = false, quoteThis = false, inString = '';
  while (cmd[i]) {
    if (escapeNext) {
      last += cmd[i];
      escapeNext = false;
      i++;
      continue;
    }
    if (!inString && (cmd[i] === '\'' || cmd[i] === '"')) {
      inString = cmd[i];
      last += cmd[i];
      escapeNext = false;
      i++;
      continue;
    }
    if (cmd[i] === '\\') {
      escapeNext = true;
      if (!inString) quoteThis = true;
      i++;
      continue;
    }
    if (inString) {
      if (cmd[i] === inString) {
        inString = '';
      }
      last += cmd[i];
      i++;
      continue;
    }
    if (cmd[i] === ' ') {
      if (quoteThis) {
        whole += '"' + last + '"';
      } else {
        whole += last;
      }
      whole += ' ';
      i++;
      last = '';
      quoteThis = false;
      continue;
    }
    last += cmd[i];
    i++;
  }
  if (quoteThis) whole += '"' + last + '"';
  else whole += last;
  return whole;
}

