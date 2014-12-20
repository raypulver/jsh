module.exports = function addNewlines(cmd) {
  var i = 0, addingNewLine = false, inConditional = false, inString = false, stringChar = '', inBracketedVar = false, leavingBracketedVar = false;
  while (cmd[i]) {
    if (!inString && cmd[i] === '$' && cmd[i + 1] === '{') {
      inBracketedVar = true;
    }
    if (leavingBracketedVar) {
      leavingBracketedVar = false;
      inBracketedVar = false;
    }
    if (!inString && inBracketedVar && cmd[i] === '}') {
      leavingBracketedVar = true;
    }
    if (!inString && (cmd[i] === '"' || cmd[i] === '\'') && cmd[i - 1] !== '\\') {
      inString = true;
      stringChar = cmd[i];
      i++;
      continue;
    } else if (inString) {
      if (cmd[i] === stringChar && cmd[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
      i++;
      continue;
    } else if (!inString && !inConditional && (cmd.substr(i, 2) === 'if' || cmd.substr(i, 3) === 'for' || cmd.substr(i, 5) === 'while')) {
      inConditional = true;
      addingNewLine = true;
      i++;
      continue;
    } else if (!inString && inConditional) {
      if (cmd[i] === ')') {
        inConditional = false;
        addingNewLine = false;
        cmd = cmd.substr(0, i + 1) + '\n' + cmd.substr(i + 1);
        i += 2;
        continue;
      } else {
        i++;
        continue;
      }
    } else if (!inString) {
      if (!inBracketedVar && cmd[i] === '{') {
        cmd = cmd.substr(0, i) + '\n' + '{' + '\n' + cmd.substr(i + 1);
        i += 3;
        continue;
      } else if (!inBracketedVar && cmd[i] === '}') {
        cmd = cmd.substr(0, i) + '\n' + '}' + '\n' + cmd.substr(i + 1);
        i += 3;
        continue;
      } else if (cmd[i] === ';') {
        cmd = cmd.substr(0, i + 1) + '\n' + cmd.substr(i + 1);
        i += 2;
        continue;
      } else {
        i++;
        continue;
      }
    }
  }
  return cmd;
}
