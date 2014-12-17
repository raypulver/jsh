var metaKeyCodeRe = /(^\x1b[a-zA-Z0-9])(.*$)/,
    functionKeyCodeRe = /(^(?:\x1b+)(O|N|\[|\[\[)(?:(\d+)(?:;(\d+))?([~^$])|(?:1;)?(\d+)?([a-zA-Z])))(.*$)/
    specialKeyRe = /([\n|\r|\b|\x7f|\x1b|\s])(.*$)/,
    theRestRe = /(^.)(.*$)/;
module.exports = slice;

function slice (str, arr) {
  var parts;
  if (!str) return arr;
  if (!arr) {
    arr = [];
  }
  if (parts = metaKeyCodeRe.exec(str)) {
    arr.push(parts[1]);
    return slice(parts[2], arr);
  } else if (parts = functionKeyCodeRe.exec(str)) {
    arr.push(parts[1]);
    return slice(parts[8], arr);
  } else if (parts = specialKeyRe.exec(str)) {
    arr.push(parts[1]);
    return slice(parts[2], arr);
  } else if (parts = theRestRe.exec(str)) {
    arr.push(parts[1]);
    return slice(parts[2], arr);
  }
}
