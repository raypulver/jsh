module.exports = function removeParens (v) {
  var i = 0;
  while (v[i]) {
    if (v[i] === '(' || v[i] === ')') {
      v = v.substr(0, i) + v.substr(i + 1);
      i--;
    }
    i++;
  }
  return v;
}
