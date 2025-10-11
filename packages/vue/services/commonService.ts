const charts: string = "qwertyuiopasdfghjklzxcvbnm0123456789QWERTYUIOPASDFGHJKLZXCVBNM";
function genRandomString(length: number): string {
  let str: string = "";
  for (let index = 0; index < length; index++) {
    str += charts[Math.round(Math.random() * charts.length)];
  }
  return str;
}

export default {
  genUniqueId(length: number = 32, delimiter: string = "-", delimiterCount: number = 4, prefix: string = "", suffix: string = ""): string {
    const stringLength: number = length;
    let splitLength = 1;
    if (delimiter) {
      length = length - delimiterCount;
      splitLength = stringLength / delimiterCount;
    } else {
      delimiterCount = 1;
    }

    const randomStrs: string[] = [];
    for (let index = 0; index < delimiterCount; index++) {
      randomStrs.push(genRandomString(splitLength));
    }

    return `${prefix}${randomStrs.join(delimiter)}${suffix}`;
  }
}