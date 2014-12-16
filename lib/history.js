var fs = require('fs'),
    path = require('path');

module.exports = History;
History.prototype.write = function (line) {
  if (line) {
    var realpath = path.join(process.env.HOME, this.filename),
        contents;
    line += '\n';
    if (!fs.existsSync(realpath)) {
      fs.writeFileSync(realpath, line);
      this.cursor = fs.readFileSync(realpath, 'utf8').split('\n').length - 1;
    } else {
      contents = fs.readFileSync(realpath, 'utf8').split('\n');
      if (contents[contents.length - 1] !== line) {
        fs.appendFileSync(realpath, line);
        this.cursor = fs.readFileSync(realpath, 'utf8').split('\n').length - 1;
      }
    }
  }
}
History.prototype.atEnd = function () {
  var realpath = path.join(process.env.HOME, this.filename);
  if (!fs.existsSync(realpath))
    return true;
  else {
    if (this.cursor === fs.readFileSync(realpath, 'utf8').split('\n').length - 1) {
      return true;
    } else return false;
  }
}
History.prototype.prev = function () {
  var realpath = path.join(process.env.HOME, this.filename);
  if (this.cursor > 0) this.cursor--;
  if (!fs.existsSync(realpath))
    return '';
  else return fs.readFileSync(realpath, 'utf8').split('\n')[this.cursor];
}
History.prototype.next = function () {
  var realpath = path.join(process.env.HOME, this.filename);
  var history, split;
  if (fs.existsSync(realpath))
    history = fs.readFileSync(realpath, 'utf8');
  else
    return '';
  split = history.split('\n');
  if (this.cursor + 1 === split.length)
    return '';
  else {
    this.cursor++;
    return split[this.cursor];
  }
}
function History (filename) {
  if (!(this instanceof History)) return new History(filename);
  this.filename = filename;
  var realpath = path.join(process.env.HOME, this.filename);
  if (!fs.existsSync(realpath))
    this.cursor = 0;
  else
    this.cursor = fs.readFileSync(realpath, 'utf8').split('\n').length - 1;
}
