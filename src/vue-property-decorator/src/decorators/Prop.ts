import Vue, { PropOptions } from 'vue'
import { createDecorator } from 'vue-class-component'
import { Constructor } from 'vue/types/options'
import { applyMetadata } from '../helpers/metadata'

export function Prop(options: PropOptions | Constructor[] | Constructor = {}) {
  // 根据属性装饰器的规则可得
  // target: 对应的是VueClass构造函数的原型对象
  // key: 对应装饰的属性名
  return (target: Vue, key: string) => {
    // 可以简单理解为，如果在options中没有指定type类型，会自动根据target[key]的值类型进行判定
    applyMetadata(options, target, key)

    // 执行createDecorator函数，传入工厂函数，createDecorator函数内部会把工厂函数放入到__decorators__列表中,返回一个新的函数
    // 新函数中传入target和Key
    createDecorator((componentOptions, k) => {
      componentOptions.props[k] = options
    })(target, key)

    // 等价与下边

    let fn = createDecorator((componentOptions, k) => {
      componentOptions.props[k] = options
    });
    fn(target, key);
  }
}
