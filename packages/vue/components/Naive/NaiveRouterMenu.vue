<template>
  <n-menu v-bind="props" :options="menuOptions" v-model:value="activeMenuKey" />
</template>

<script lang="ts" setup>
import { NMenu, type MenuProps } from "naive-ui";
import { h, onUnmounted, ref, watch, type AnchorHTMLAttributes, type HTMLAttributes, type VNodeChild } from "vue";
import { RouterLink, useRouter, type RouteRecordNormalized, type RouterLinkProps } from 'vue-router';
import type { INaiveUIMenuRouteFilter, TNaiveUIMenuOption, TNaiveUIRouteMenuOption } from "../../types/native/menu";
import NaiveUIMenuLink from "./NaiveMenuLink.vue";
import useRouteTableChange from "../../composables/useRouteTableChange";
import { TRouteRecordRaw } from "../../types/router";
import { filterMenuRoutes, routesToMenuOptions } from "../../services/native/menu";

const props = withDefaults(defineProps<{
  menus?: TNaiveUIRouteMenuOption[] | undefined,
  routes?: TRouteRecordRaw[] | undefined,
  /** 路由筛选条件 `{ name, level, includeChildren }`，见 `INaiveUIMenuRouteFilter`；不传则不筛 */
  filter?: INaiveUIMenuRouteFilter | undefined
} & Omit<MenuProps, "options">>(), {
  menus: undefined,
  routes: undefined,
  filter: undefined
});

const router = useRouter();

const activeMenuKey = ref<string>('');
const unregisterBeforeResolve = router.beforeResolve(to => {
  activeMenuKey.value = resolveActiveMenuKey(to.matched, to.name?.toString() || '');
});

const menuOptions = ref<TNaiveUIMenuOption[]>([]);

function createMenuLinkLabel<PropsType = RouterLinkProps>(label: string | (() => VNodeChild), props?: PropsType extends RouterLinkProps ? RouterLinkProps : AnchorHTMLAttributes, external: boolean = false) {
  return () =>
    h(
      external ? NaiveUIMenuLink : RouterLink,
      props,
      {
        default: typeof label === 'function' ? label : () => label
      }
    )
}
/**
 * `label` 的三种形态里只有「字符串」和「返回 VNode 的函数」能直接当链接内容渲染；
 * 剩下那种「props 对象」形态是给 `linkProps` 用的，落到这里没有可显示的文字，退回 key。
 */
function resolveMenuLabel(label: TNaiveUIRouteMenuOption["label"], fallback: string): string | (() => VNodeChild) {
  return typeof label === "string" || typeof label === "function" ? label : fallback;
}
function resolveChildrenKeys(children: TNaiveUIRouteMenuOption[]) {
  const keys: string[] = [];

  children.forEach(childItem => {
    keys.push(childItem.key);

    if (childItem.children) {
      keys.push(...resolveChildrenKeys(childItem.children as TNaiveUIRouteMenuOption[]));
    }
  });

  return keys;
}

function improveMenus(menus: TNaiveUIRouteMenuOption[], parent: TNaiveUIRouteMenuOption | null = null) {
  const menuOptions: TNaiveUIRouteMenuOption[] = [];

  menus.forEach(menuItem => {
    let path: string = menuItem.path;
    if (!path.startsWith("/") && parent) {
      path = [parent.path, path].join("/");
    }

    const option: TNaiveUIRouteMenuOption = {
      key: menuItem.key?.toString() || menuItem.path,
      path,
      label: menuItem.label
    }

    if (menuItem.index !== undefined) {
      option['index'] = menuItem.index;
    }
    if (menuItem.level !== undefined) {
      option['level'] = menuItem.level;
    }
    if (menuItem.show !== undefined) {
      option['show'] = menuItem.show;
    }
    if (menuItem.disabled !== undefined) {
      option['disabled'] = menuItem.disabled;
    }
    if (menuItem.extra !== undefined) {
      option['extra'] = menuItem.extra;
    }
    if (menuItem.icon !== undefined) {
      option['icon'] = menuItem.icon;
    }

    if (menuItem.type) {
      switch (menuItem.type) {
        case "group":
          option.type = 'group';
          break;
        case "divider":
          option.type = 'divider';
          option.props = (menuItem.props as HTMLAttributes) ?? undefined;
          break;
      }
    }
    if (menuItem.children) {
      option.children = menuItem.children ? improveMenus(menuItem.children, option) : [];
      option.childrenKeys = resolveChildrenKeys(option.children);
    }

    menuOptions.push(option);
  });

  return menuOptions;
}

function improveMenuOptions(rawMenuOptions: TNaiveUIRouteMenuOption[]): TNaiveUIMenuOption[] {
  const menuOptions: TNaiveUIMenuOption[] = [];

  rawMenuOptions.forEach(item => {
    if (!item.type || !['group', 'divider', 'list'].includes(item.type)) {
      if ((item.linkProps && 'href' in item.linkProps) || typeof item.path === 'string' && /https?/.test(item.path)) {
        const linkProps: AnchorHTMLAttributes = item.linkProps ? (item.linkProps as AnchorHTMLAttributes) : {
          href: ''
        };
        if (!linkProps.href && item.path) {
          linkProps.href = item.path.toString();
        }

        item.label = createMenuLinkLabel<AnchorHTMLAttributes>(resolveMenuLabel(item.label || item.key, item.key), linkProps, true);
      } else {
        const linkProps = item.linkProps ? (item.linkProps as RouterLinkProps) : {
          to: ''
        };
        if (!linkProps.to && item.path) {
          linkProps.to = item.path;
        }

        item.label = createMenuLinkLabel<RouterLinkProps>(resolveMenuLabel(item.label ?? item.key, item.key), linkProps, false);
      }
    }

    const menuOption: TNaiveUIMenuOption = {
      key: item.key,
      disabled: item.disabled ?? false,
      show: item.show ?? true,
      meta: {
        index: item.index ?? rawMenuOptions.length,
        key: item.key ?? '',
        level: item.level,
        linkProps: item.linkProps,
        path: item.path
      }
    };
    if (item.label) {
      menuOption.label = item.label;
    }
    if (item.type) {
      if (item.type === 'group') {
        menuOption.type = 'group';
        menuOption.label = item.label;
      } else if (item.type === 'divider') {
        menuOption.type = 'divider';
        menuOption.props = item.props;
      }
    }
    if (item.children) {
      menuOption.children = improveMenuOptions(item.children);
      menuOption.meta.childrenKeys = item.childrenKeys;
    }


    menuOptions.push(menuOption);
  });

  return menuOptions.sort((a, b) => {
    return a.meta.index - b.meta.index;
  });
}

/**
 * 从运行时路由表取菜单的顶层路由。
 *
 * `getRoutes()` 返回的是**拍平**的记录（父记录、子记录都在同一层），直接拿去转菜单会重复：
 * 父项里已经带着 `children`，子记录又会各自成为一项。所以先收集「作为别人的 children 出现过的 name」，
 * 把这些记录剔掉，剩下的才是顶层。
 *
 * 用路由表而不是业务 import 的那份静态数组：`addRoute()` 只改 router 的路由表，
 * 动态加的路由（比如登录后注册的）只有从这里才看得到。
 */
function getRouterMenuRoutes(): TRouteRecordRaw[] {
  const records = router.getRoutes().filter(routeRecord => !routeRecord.aliasOf);
  const childNames: Set<string> = new Set();

  const collectChildNames = (routes: TRouteRecordRaw[]) => {
    routes.forEach(routeItem => {
      if (routeItem.name !== undefined && routeItem.name !== null) {
        childNames.add(routeItem.name.toString());
      }
      if (routeItem.children) {
        collectChildNames(routeItem.children as TRouteRecordRaw[]);
      }
    });
  };
  records.forEach(routeRecord => collectChildNames((routeRecord.children ?? []) as TRouteRecordRaw[]));

  return records.filter(routeRecord => {
    const name: string | undefined = routeRecord.name?.toString();
    return !name || !childNames.has(name);
  }) as unknown as TRouteRecordRaw[];
}

/**
 * 菜单用的路由数据源。
 *
 * - 传了 `routes` 就用它；`routes` 和 `menus` 都没传才从 `router.getRoutes()` 取；
 * - 传了 `filter` 就先按它筛一遍（`name` 定位父级、`level` 比对 `meta.menu.level`、
 *   `includeChildren` 决定结果里还留不留子树）。
 */
function resolveMenuRoutes(): TRouteRecordRaw[] {
  const routes: TRouteRecordRaw[] = props.routes ?? getRouterMenuRoutes();
  const filter: INaiveUIMenuRouteFilter = props.filter ?? {};

  const hasFilter: boolean = (filter.name !== undefined && filter.name !== null)
    || (filter.level !== undefined && filter.level !== null)
    || filter.includeChildren === false;
  if (!hasFilter) {
    return routes;
  }

  return filterMenuRoutes(
    routes,
    filter.name ?? null,
    filter.level ?? null,
    filter.includeChildren ?? true
  );
}

/**
 * 菜单里是否存在这个 key（含子项，以及 `childrenKeys` 里登记过的后代）。
 *
 * 参数写成宽松数组：naive-ui 的 `MenuOption` 是带自引用的联合类型，
 * 按 `TNaiveUIMenuOption[]` 递归声明会触发「类型实例化过深」。这里只用到 key / children / meta.childrenKeys。
 */
function hasMenuOption(options: ReadonlyArray<any>, key: string): boolean {
  return options.some(option => option?.key === key
    || !!option?.meta?.childrenKeys?.includes(key)
    || (option?.children ? hasMenuOption(option.children, key) : false));
}

/**
 * 当前该高亮的菜单 key。
 *
 * 直接拿路由名会漏掉一种情况：进的是子路由（`systemEnvironment`），而菜单里只放了 1 级项
 * （`filterMenuRoutes(..., { includeChildren: false })`，`system` 底下没有 children 了），
 * 名字匹配不上任何选项，父项就不亮。所以从 `matched` 的最里层往外找，
 * 第一个「菜单里真有」的名字才是高亮项；一个都没有才退回路由名本身。
 */
function resolveActiveMenuKey(
  matched: RouteRecordNormalized[] = router.currentRoute.value.matched,
  fallbackName: string = router.currentRoute.value.name?.toString() || ''
): string {
  for (let index = matched.length - 1; index >= 0; index--) {
    const name: string | undefined = matched[index]?.name?.toString();

    if (name && hasMenuOption(menuOptions.value, name)) {
      return name;
    }
  }

  return fallbackName;
}

function resolveMenuOptions() {
  menuOptions.value = [];

  let rawMenuOptions: TNaiveUIRouteMenuOption[] = [];
  if (props.menus) {
    rawMenuOptions = improveMenus(props.menus);
  } else {
    rawMenuOptions = routesToMenuOptions(resolveMenuRoutes());
  }

  menuOptions.value = improveMenuOptions(rawMenuOptions);

  // 选项整个换掉了，n-menu 会丢掉高亮，重新按当前路由算一次
  activeMenuKey.value = resolveActiveMenuKey();
}

watch(() => [props.menus, props.routes, props.filter], resolveMenuOptions, {
  deep: true
});
resolveMenuOptions();

// 路由表变了直接重建（addRoute / removeRoute 没有事件，只能自己接管这两个方法）
const unregisterRouteTableChange = useRouteTableChange(router, resolveMenuOptions);
onUnmounted(() => {
  unregisterBeforeResolve();
  unregisterRouteTableChange();
});
</script>

<style scoped></style>
