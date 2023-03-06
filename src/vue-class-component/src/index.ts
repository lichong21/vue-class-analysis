import Vue, { ComponentOptions } from 'vue'
import { VueClass } from './declarations'
import { componentFactory, $internalHooks } from './component'

export { createDecorator, VueDecorator, mixins } from './util'

// TS方法的重载,可以忽略不看
function Component <V extends Vue>(options: ComponentOptions<V> & ThisType<V>): <VC extends VueClass<V>>(target: VC) => VC
function Component <VC extends VueClass<Vue>>(target: VC): VC
function Component (options: ComponentOptions<Vue> | VueClass<Vue>): any {
  // options为函数，说明VueClass的写法中，@Component里面没有入参。
  // 按照装饰器的规则，如果@component里面里面没有入参，默认传入的是Class本身。（相当于类的构造函数）
  /**
   * @Component()
   * export default Class App extends Vue {}
   */
  if (typeof options === 'function') {
    // 此时options就是class的构造函数
    return componentFactory(options)
  }
  // options不为函数，证明@component里面确实有入参
  // 按照装饰器的规则，如果@component里面有入参，则装饰器需要返回一个函数，该函数的入参就是class本身。（相当于类的构造函数);
  // 此时相当于一个工厂函数，该工厂函数用来生产装饰器。
  /**
   * @component({
   *  components: {},
   *  directives: {}
   * })
   * export default Class App extends Vue {}
   */
  return function (Component: VueClass<Vue>) {
    // 此时的component就是class的构造函数，options是@Component入参，就是Vue原生写法的选项是API的对象
    return componentFactory(Component, options)
  }
}

// 注册声明周期钩子函数
Component.registerHooks = function registerHooks (keys: string[]): void {
  $internalHooks.push(...keys)
}

export default Component
