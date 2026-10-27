<template>
  <n-popover trigger="click" placement="bottom" @update:show="syncLink">
    <template #trigger>
      <div>
        <ToolbarButton tooltip-content="插入链接" :active="editor.isActive('link')">链接</ToolbarButton>
      </div>
    </template>
    <div class="link-popover">
      <n-form>
        <n-form-item label="链接地址" :show-feedback="false">
          <n-input-group>
            <n-input v-model:value="link" size="small" clearable placeholder="输入链接地址，留空表示移除" @keyup.enter="applyLink" />
            <n-button size="small" @click="applyLink">确定</n-button>
          </n-input-group>

        </n-form-item>
      </n-form>
    </div>
  </n-popover>
</template>

<script setup>
import { ref } from 'vue';
import { NPopover, NInput, NButton } from 'naive-ui';
import ToolbarButton from '../ToolbarButton.vue';
import { useToolbarEditor } from './context';

const editor = useToolbarEditor();

/** 输入框里的地址，打开气泡时用当前链接回填 */
const link = ref('');

/** 每次打开都同步一次当前链接，避免留下上一次的输入 */
function syncLink(show) {
  if (!show) return;

  link.value = editor.value.getAttributes('link').href ?? '';
}

/**
 * 应用输入。
 *
 * 空串表示移除链接；有值时先 `extendMarkRange` 把整段链接纳入选区，
 * 这样光标停在链接中间也能整体替换，而不是在链接里再套一层。
 * `focus()` 会把焦点交回正文，气泡随之关闭。
 */
function applyLink() {
  const instance = editor.value;
  const url = (link.value ?? '').trim();

  if (!url) {
    instance.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  instance.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}
</script>

<style scoped>
.link-popover {
  width: 300px;
}
</style>
