<template>
  <div class="space-y-4">
    <div v-for="field in fields" :key="field.key" class="flex items-center gap-3">
      <label class="text-sm font-medium w-16 shrink-0" :style="{ color: textColor }">{{ field.label }}</label>
      <input
        :value="modelValue[field.key as keyof typeof modelValue]"
        @input="updateField(field.key, ($event.target as HTMLInputElement).value)"
        class="flex-1 px-3 py-2 rounded-lg border text-sm transition-all duration-200 outline-none bg-white/80 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        :placeholder="field.placeholder"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TicketInfo } from '@/composables/useMockData'

interface Props {
  modelValue: TicketInfo
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  textColor: '#2C2C2C',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TicketInfo): void
}>()

const fields = [
  { key: 'location', label: '地点', placeholder: '输入地点' },
  { key: 'date', label: '时间', placeholder: 'YYYY-MM-DD' },
  { key: 'code', label: '编号', placeholder: 'YYMMDD' },
  { key: 'randomCode', label: '随机码', placeholder: '随机码' },
]

const updateField = (key: string, value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  })
}
</script>
