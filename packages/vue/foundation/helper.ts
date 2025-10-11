function undefinedOrNull(value: any): boolean {
  return value !== undefined && value !== null;
}

function isNumber(value: any): boolean {
  return undefinedOrNull(value) && typeof value === 'number';
}

function type(target: any): string {
  return Object.prototype.toString.call(target).split(" ")[1].slice(0, -1).toLowerCase();
}

export default {
  undefinedOrNull,
  isNumber,
  type
}