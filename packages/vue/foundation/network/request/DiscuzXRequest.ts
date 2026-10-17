import { TFetchMiddleware } from "./Fetch";
import KitRequest, { IKitRequestConfig } from "./KitRequest";

export default class DiscuzXRequest extends KitRequest {
  constructor(config: IKitRequestConfig = {}) {
    const middleware: TFetchMiddleware = (request, next) => {
      const requestURI = request.uri();
      let uri = "";
      if (Array.isArray(requestURI)) {
        uri = requestURI.join("/");
      } else {
        uri = requestURI ? requestURI.toString() : "";
      }
      const urlPrefix = request.prefix();
      let prefix = "";
      if (Array.isArray(urlPrefix)) {
        prefix = urlPrefix.join("/");
      } else {
        prefix = urlPrefix ? urlPrefix.toString() : "";
      }

      uri = [prefix, uri].filter(item => item.trim()).join("/");
      request.query("uri", uri ?? "");

      request.uri(null).prefix(null);

      return next();
    };

    if (!config) config = {};

    if (config.middlewares) {
      config.middlewares.push(middleware);
    } else {
      config.middlewares = [middleware];
    }

    super(config);
  }
}