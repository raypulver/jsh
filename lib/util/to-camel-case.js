module.exports = function (str) {
  var i = 0;
  while (str[i]) {
    if (str[i] === '-') {
      str = str.substr(0, i) + str[i + 1].toUpperCase() + str.substr(i + 2);
    }
    i++;
  }
  return str;
}
