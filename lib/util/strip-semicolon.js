module.exports = function stripSemicolon (str) {
  var i = 0;
  while (str[i]) {
    if (str[i] === ';') {
      return str.substr(0, i);
    }
    i++;
  }
  return str;
}
