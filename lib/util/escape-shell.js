module.exports = function (str) {
  var i = 0;
  while (str[i]) {
    if (/[\ \[\]\(\)]/.test(str[i])) {
      str = str.substr(0, i) + '\\' + str.substr(i);
      i++;
    }
    i++;
  }
  return str;
}
