<template>
  <n-menu v-bind="Props" :options="MenuOptions" v-model:value="ActiveMenuKey" />
</template>

<script lang="ts" setup>
import { NMenu, type MenuProps } from "naive-ui";
import { h, onUnmounted, ref, watch, type AnchorHTMLAttributes, type HTMLAttributes, type VNode, type VNodeChild } from "vue";
import { RouterLink, useRouter, type RouteRecordRaw, type RouterLinkProps } from 'vue-router';
import type { INaiveUIMenuRouteMeta, TNaiveUIMenuOption, TNaiveUIRouteMenuOption } from "../../types/components/NaiveUI";
import NaiveUIMenuLink from "./NaiveUIMenuLink.vue";
import useRouteTableChange from "../../composables/useRouteTableChange";

const Props = withDefaults(defineProps<{
  menus?: TNaiveUIRouteMenuOption[] | undefined,
  routes?: RouteRecordRaw[] | undefined
} & Omit<MenuProps, "options">>(), {
  menus: undefined,
  routes: undefined
});

const Router = useRouter();

const ActiveMenuKey = ref<string>('');
const UnregisterBeforeResolve = Router.beforeResolve((to, from) => {
  ActiveMenuKey.value = to.name?.toString() || '';
});

const MenuOptions = ref<TNaiveUIMenuOption[]>([]);

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
function resolveChildrenKeys(Childrens: TNaiveUIRouteMenuOption[]) {
  const Keys: string[] = [];

  Childrens.forEach(ChildrenItem => {
    Keys.push(ChildrenItem.key);

    if (ChildrenItem.children) {
      Keys.push(...resolveChildrenKeys(ChildrenItem.children as TNaiveUIRouteMenuOption[]));
    }
  });

  return Keys;
}

function transformRouteToMenuOption(Routes: RouteRecordRaw[], Parent: TNaiveUIRouteMenuOption | null = null) {
  const MenuOptions: TNaiveUIRouteMenuOption[] = [];

  Routes.forEach(RouteItem => {
    if (!RouteItem.meta?.naiveUIRouteMenu) {
      if (RouteItem.children) {
        const Childrens = RouteItem.children ? transformRouteToMenuOption(RouteItem.children, {
          key: RouteItem.name?.toString() || RouteItem.path,
          path: RouteItem.path,
          label: RouteItem.name?.toString() || RouteItem.path
        }) : [];
        MenuOptions.push(...Childrens);
      }
      return;
    };
    // meta 的菜单元信息由业务用 `declare module 'vue-router'` 扩进来（kit 里看不到那份声明），这里直接收敛成约定的类型
    const RouteMenuConfig = RouteItem.meta.naiveUIRouteMenu as INaiveUIMenuRouteMeta["naiveUIRouteMenu"];

    /* @ts-ignore */
    let label: string | (() => VNode) = RouteMenuConfig.label || RouteItem.meta?.title;
    if (!label) {
      label = RouteItem.name?.toString() || RouteItem.path;
    }

    let path: string = RouteItem.path;
    if (!path.startsWith("/") && Parent) {
      path = [Parent.path, path].map(item => item.trim()).filter(item => item).join("/");
    }

    const Option: TNaiveUIRouteMenuOption = {
      key: RouteItem.name?.toString() || RouteItem.path,
      path,
      label
    }

    if (RouteMenuConfig.index !== undefined) {
      Option['index'] = RouteMenuConfig.index;
    }
    if (RouteMenuConfig.level !== undefined) {
      Option['level'] = RouteMenuConfig.level;
    }
    if (RouteMenuConfig.show !== undefined) {
      Option['show'] = RouteMenuConfig.show;
    }
    if (RouteMenuConfig.disabled !== undefined) {
      Option['disabled'] = RouteMenuConfig.disabled;
    }
    if (RouteMenuConfig.extra !== undefined) {
      Option['extra'] = RouteMenuConfig.extra;
    }
    if (RouteMenuConfig.icon !== undefined) {
      Option['icon'] = RouteMenuConfig.icon;
    }

    if (RouteMenuConfig.type) {
      Option.type = RouteMenuConfig.type;

      switch (RouteMenuConfig.type) {
        case "divider":
          Option.props = (RouteItem.props as HTMLAttributes) ?? undefined;
          break;
      }
    }
    if (RouteItem.children) {
      Option.children = RouteItem.children ? transformRouteToMenuOption(RouteItem.children, Option) : [];
      Option.childrenKeys = resolveChildrenKeys(Option.children);
    }

    MenuOptions.push(Option);
  });

  return MenuOptions;
}

function improveMenus(Menus: TNaiveUIRouteMenuOption[], Parent: TNaiveUIRouteMenuOption | null = null) {
  const MenuOptions: TNaiveUIRouteMenuOption[] = [];

  Menus.forEach(MenuItem => {
    let path: string = MenuItem.path;
    if (!path.startsWith("/") && Parent) {
      path = [Parent.path, path].join("/");
    }

    const Option: TNaiveUIRouteMenuOption = {
      key: MenuItem.key?.toString() || MenuItem.path,
      path,
      label: MenuItem.label
    }

    if (MenuItem.index !== undefined) {
      Option['index'] = MenuItem.index;
    }
    if (MenuItem.level !== undefined) {
      Option['level'] = MenuItem.level;
    }
    if (MenuItem.show !== undefined) {
      Option['show'] = MenuItem.show;
    }
    if (MenuItem.disabled !== undefined) {
      Option['disabled'] = MenuItem.disabled;
    }
    if (MenuItem.extra !== undefined) {
      Option['extra'] = MenuItem.extra;
    }
    if (MenuItem.icon !== undefined) {
      Option['icon'] = MenuItem.icon;
    }

    if (MenuItem.type) {
      switch (MenuItem.type) {
        case "group":
          Option.type = 'group';
          break;
        case "divider":
          Option.type = 'divider';
          Option.props = (MenuItem.props as HTMLAttributes) ?? undefined;
          break;
      }
    }
    if (MenuItem.children) {
      Option.children = MenuItem.children ? improveMenus(MenuItem.children, Option) : [];
      Option.childrenKeys = resolveChildrenKeys(Option.children);
    }

    MenuOptions.push(Option);
  });

  return MenuOptions;
}

function improveMenuOptions(RawMenuOptions: TNaiveUIRouteMenuOption[]): TNaiveUIMenuOption[] {
  const MenuOptions: TNaiveUIMenuOption[] = [];

  RawMenuOptions.forEach(item => {
    if (!item.type || !['group', 'divider', 'list'].includes(item.type)) {
      if ((item.linkProps && 'href' in item.linkProps) || typeof item.path === 'string' && /https?/.test(item.path)) {
        const LinkProps: AnchorHTMLAttributes = item.linkProps ? (item.linkProps as AnchorHTMLAttributes) : {
          href: ''
        };
        if (!LinkProps.href && item.path) {
          LinkProps.href = item.path.toString();
        }

        item.label = createMenuLinkLabel<AnchorHTMLAttributes>(item.label || item.key, LinkProps, true);
      } else {
        const LinkProps = item.linkProps ? (item.linkProps as RouterLinkProps) : {
          to: ''
        };
        if (!LinkProps.to && item.path) {
          LinkProps.to = item.path;
        }

        item.label = createMenuLinkLabel<RouterLinkProps>(item.label ?? item.key, LinkProps, false);
      }
    }

    const MenuOption: TNaiveUIMenuOption = {
      key: item.key,
      disabled: item.disabled ?? false,
      show: item.show ?? true,
      meta: {
        index: item.index ?? RawMenuOptions.length,
        key: item.key ?? '',
        level: item.level,
        linkProps: item.linkProps,
        path: item.path
      }
    };
    if (item.label) {
      MenuOption.label = item.label;
    }
    if (item.type) {
      if (item.type === 'group') {
        MenuOption.type = 'group';
        MenuOption.label = item.label;
      } else if (item.type === 'divider') {
        MenuOption.type = 'divider';
        MenuOption.props = item.props;
      }
    }
    if (item.children) {
      MenuOption.children = improveMenuOptions(item.children);
      MenuOption.meta.childrenKeys = item.childrenKeys;
    }


    MenuOptions.push(MenuOption);
  });

  return MenuOptions.sort((a, b) => {
    return a.meta.index - b.meta.index;
  });
}

/**
 * 收集一棵路由树里所有记录的 name（含子记录），用来判断「这条记录是不是已经有了」。
 */
function collectRouteNames(Routes: RouteRecordRaw[]): string[] {
  const Names: string[] = [];

  Routes.forEach(RouteItem => {
    if (RouteItem.name !== undefined && RouteItem.name !== null) {
      Names.push(RouteItem.name.toString());
    }
    if (RouteItem.children) {
      Names.push(...collectRouteNames(RouteItem.children));
    }
  });

  return Names;
}

/**
 * 菜单的路由数据源：`Props.routes` 那份静态路由 + router 里后来动态加的路由。
 *
 * `Props.routes` 是业务 import 进来的数组，`addRoute()` 只改 router 的路由表，不碰这个数组 ——
 * 所以只 watch `Props.routes` 的话，动态路由加完了菜单也不会动（引用没变、内容也没变，deep 也救不了）。
 *
 * 去重靠 name：`getRoutes()` 返回的是拍平后的记录（父子都在一层），
 * 已经能在 `Props.routes` 这棵树里找到的就不重复加，剩下的才是动态新增的（比如登录后加的路由）。
 */
function collectMenuRoutes(): RouteRecordRaw[] {
  const Routes: RouteRecordRaw[] = Props.routes ?? [];
  const KnownNames: Set<string> = new Set(collectRouteNames(Routes));

  const DynamicRoutes: RouteRecordRaw[] = Router.getRoutes().filter(RouteRecord => {
    if (RouteRecord.aliasOf) return false;

    const Name: string | undefined = RouteRecord.name?.toString();
    if (!Name || KnownNames.has(Name)) return false;

    return !!(RouteRecord.meta as unknown as INaiveUIMenuRouteMeta | undefined)?.naiveUIRouteMenu;
  }) as unknown as RouteRecordRaw[];

  return [...Routes, ...DynamicRoutes];
}

function resolveMenuOptions() {
  MenuOptions.value = [];

  let rawMenuOptions: TNaiveUIRouteMenuOption[] = [];
  if (Props.menus) {
    rawMenuOptions = improveMenus(Props.menus);
  } else {
    rawMenuOptions = transformRouteToMenuOption(collectMenuRoutes());
  }

  MenuOptions.value = improveMenuOptions(rawMenuOptions);

  // 选项整个换掉了，n-menu 会丢掉高亮，按当前路由补回来
  ActiveMenuKey.value = Router.currentRoute.value.name?.toString() || '';
}

watch(() => [Props.menus, Props.routes], resolveMenuOptions, {
  deep: true
});
resolveMenuOptions();

// 路由表变了直接重建（addRoute / removeRoute 没有事件，只能自己接管这两个方法）
const UnregisterRouteTableChange = useRouteTableChange(Router, resolveMenuOptions);
onUnmounted(() => {
  UnregisterBeforeResolve();
  UnregisterRouteTableChange();
});
</script>

<style scoped></style>