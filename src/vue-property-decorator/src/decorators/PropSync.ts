import Vue, { PropOptions } from 'vue'
import { createDecorator } from 'vue-class-component'
import { Constructor } from 'vue/types/options'
import { applyMetadata } from '../helpers/metadata'

/**
 * decorator of a synced prop
 * @param propName the name to interface with from outside, must be different from decorated property
 * @param options the options for the synced prop
 * @return PropertyDecorator | void
 */
export function PropSync(
  propName: string,
  options: PropOptions | Constructor[] | Constructor = {},
) {
  return (target: Vue, key: string) => {
    // 可以简单理解为，如果在options中没有指定type类型，会自动根据target[key]的值类型进行判定
    applyMetadata(options, target, key)

    // componentOptions指的是运行时的Options
    // k：指的是装饰器装饰的key
    createDecorator((componentOptions, k) => {
      // options中，prop接收的key是propName，值是options
      ;(componentOptions.props || (componentOptions.props = {} as any))[
        propName
      ] = options
      // 给装饰器装置的key，转换为计算属性，指定他的set与get方法
      // get方法就返回propName的值
      // set：就emit触发update：propName事件
      ;(componentOptions.computed || (componentOptions.computed = {}))[k] = {
        get() {
          return (this as any)[propName]
        },
        set(this: Vue, value) {
          this.$emit(`update:${propName}`, value)
        },
      }
    })(target, key)
  }
}


// -----------------------------使用实例-------------------------------------------

/**
 * 
  import { Vue, Component, PropSync } from 'vue-property-decorator'
  @Component
  export default class YourComponent extends Vue {
    @PropSync('name', { type: String }) syncedName!: string
  }
 */

  // 等价与下边

/**
 * 
  export default {
    props: {
      name: {
        type: String,
      },
    },
    computed: {
      syncedName: {
        get() {
          return this.name
        },
        set(value) {
          this.$emit('update:name', value)
        },
      },
    },
}
 */
