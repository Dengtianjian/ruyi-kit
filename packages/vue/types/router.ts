import { RouteRecordRaw } from "vue-router";

export type TRouteRecordRaw<Meta extends Object = {}> = RouteRecordRaw & {
  meta?: Meta,
  children?: TRouteRecordRaw<Meta>[]
};