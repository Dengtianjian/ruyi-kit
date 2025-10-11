import { RouteRecordRaw } from 'vue-router';

export type TRuyiRouteRecordRaw<Meta extends Object = {}> = RouteRecordRaw & {
  meta?: Meta,
  children?: TRuyiRouteRecordRaw<Meta>[]
};