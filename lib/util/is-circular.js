module.exports = isCircular;
function isCircular (obj, arr) {
  var type = typeof obj,
      propName,
      thisVal,
      iterArr,
      lastArr;
  if (type !== 'object' && type !== 'function') return false;
  if (!Array.isArray(arr)) {
    type = typeof arr;
    if (!(type === 'undefined' || arr === null)) {
      throw new TypeError('Expected attribute to be an array');
    }
    arr = [];
  }
  arr.push(obj);
  lastArr = arr.length - 1;
  for (propName in obj) {
    thisVal = obj[propName];
    type = typeof thisVal;
    if (type === 'object' || type === 'function') {
      for (iterArr = lastArr; iterArr >= 0; iterArr -= 1) {
        if (thisVal === arr[iterArr]) {
          return true;
        }
      }
      if (isCircular(thisVal, arr)) return true;
    }
  }
  arr.pop();
  return false;
}
