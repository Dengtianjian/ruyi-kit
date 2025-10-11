import { UnwrapNestedRefs, reactive, ref, toRaw } from "vue"

export interface ISettingsApi {
  items<T>(...names: string[]): Promise<T>;
  item<T>(key: string): Promise<T>;
  saveItems(data: Record<string, any>): Promise<number>;
  save(key: string, value: string): Promise<number>;
}


export default class <T extends object> {
  loading = ref<boolean>(false);
  saving = ref<boolean>(false);
  disabled = ref<boolean>(false);
  /**
   * @deprecated
   */
  settings: UnwrapNestedRefs<T> = null;
  value: UnwrapNestedRefs<T> = null;
  request: ISettingsApi = null;
  constructor(defaultValues: T, request: ISettingsApi) {
    if (defaultValues) {
      this.settings = reactive(defaultValues);
      this.value = reactive(defaultValues);
    }

    this.request = request;
  }

  load() {
    this.loading.value = true;
    return this.request.items<T>(...Object.keys(this.settings)).then(settings => {
      for (const key in settings) {
        // @ts-ignore
        this.settings[key] = settings[key];
        // @ts-ignore
        this.value[key] = settings[key];
      }
      return this.value;
    }).finally(() => {
      this.loading.value = false;
    });
  }
  save(dataHandle?: (data?: UnwrapNestedRefs<T>) => T) {
    this.saving.value = true;
    this.disabled.value = true;
    return this.request.saveItems(dataHandle ? dataHandle(toRaw(this.value)) : this.value).finally(() => {
      this.saving.value = false;
      this.disabled.value = false;
    });
  }
}