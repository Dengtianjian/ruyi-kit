import DiscuzXRequest from "../../../foundation/HTTP/discuzXRequest";


export class DiscuzXSettingsApi extends DiscuzXRequest {
  list<T>(keys: string[]) {
    return this.get<T>(null, {
      name: keys.join(",")
    });
  }
  saveList(KeyValues: Record<string, any>) {
    return this.patch<number>(null, KeyValues);
  }
  save(key: string, value: any) {
    return this.patch<number>(key, {
      value
    });
  }
}

export default new DiscuzXSettingsApi("settings");