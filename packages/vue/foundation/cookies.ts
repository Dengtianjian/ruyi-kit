let isParsed: boolean = false;
const cookies: Record<string, string> = {};

function parseCookie() {
  let splits: string[] = document.cookie.split(";");
  splits.forEach(splitItem => {
    let key: string = splitItem.slice(0, splitItem.indexOf("="));
    let value: string = splitItem.slice(splitItem.indexOf("=") + 1);
    cookies[key.trim()] = value.trim();
  });
  isParsed = true;
}

function set(key: string, value: string): void {
  if (isParsed === false) parseCookie();
  cookies[key] = value;
}

function get(key: string): string {
  if (isParsed === false) parseCookie();
  if (has(key)) {
    return cookies[key];
  }
  return "";
}

function remove(key: string): boolean {
  if (isParsed === false) parseCookie();
  if (has(key) == false) return true;
  delete cookies[key];
  return true;
}

function has(key: string): boolean {
  if (isParsed === false) parseCookie();
  return cookies[key] !== undefined;
}

function all(): Record<string, string> {
  if (isParsed === false) parseCookie();
  return cookies;
}

export default {
  set,
  get,
  remove,
  has,
  all
}