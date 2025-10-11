import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";

export default {
  init() {
    dayjs.locale("zh-cn");
    dayjs.extend(relativeTime);
  },
  formatAutoFromNow(date?: string | number | Date | dayjs.Dayjs, toFromNowThreshold: number = 1000 * 60 * 60 * 24, formatTemplate: string = 'YYYY-MM-DD HH:mm:ss', withoutSuffix: boolean = false) {
    const d = dayjs(date);
    if (Date.now() - d.valueOf() > toFromNowThreshold) {
      return d.format(formatTemplate);
    }
    
    return d.fromNow(withoutSuffix);
  }
}