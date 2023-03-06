import { WatchOptions } from 'vue'
import { createDecorator } from 'vue-class-component'

/**
 * decorator of a watch function
 * @param  path @Watch('a.b.c', { deep, immediate })
 * @param  watchOptions
 */
export function Watch(path: string, watchOptions: WatchOptions = {}) {
  // componentOptions: Vue2原生OptionsAPI的options
  return createDecorator((componentOptions, handler) => {
    // 取Options上的watch，如果没有就给空对象
    componentOptions.watch ||= Object.create(null)
    // 声明变量接受
    const watch: any = componentOptions.watch
    // 如果watch[path]是对象，但不是数据，就把格式转换为数组
    if (typeof watch[path] === 'object' && !Array.isArray(watch[path])) {
      watch[path] = [watch[path]]
    } else if (typeof watch[path] === 'undefined') {
      // 如果还没定义过，就给空数组
      watch[path] = []
    }
    // 把handler和watchOptions，包装成对象，放到数组中。
    // 注意：此处的handler就是装饰器修饰的函数名（类似与Key）
    watch[path].push({ handler, ...watchOptions })
  })
}
