import Vue from 'vue'
import { createDecorator } from 'vue-class-component'

/**
 * 
 * @param refKey : @Ref('xxx'), 
 * @returns 
 */
export function Ref(refKey?: string) {
  return createDecorator((options, key) => {
    options.computed = options.computed || {}
    options.computed[key] = {
      cache: false,
      get(this: Vue) {
        // 自定义refKey的优先级高于装饰的key
        return this.$refs[refKey || key]
      },
    }
  })

  // createDecorator函数执行完成之后会返回一个新的函数
}

// 等价于下边


export function Ref(refKey?: string) {
  const factory = (options, key) => {
    options.computed = options.computed || {}
    options.computed[key] = {
      cache: false,
      get(this: Vue) {
        // 自定义refKey的优先级高于装饰的key
        return this.$refs[refKey || key]
      },
    }
  };
  return createDecorator(factory)

  // 等价于下边

  return (target: Vue | typeof Vue, key?: any, index?: any) => {
    // Ctor 指向构造函数
    const Ctor = typeof target === 'function'
      ? target as DecoratedClass
      : target.constructor as DecoratedClass
    // 初始化
    if (!Ctor.__decorators__) {
      Ctor.__decorators__ = []
    }
    if (typeof index !== 'number') {
      index = undefined
    }
    // 把工厂函数push到__decorators__列表中，等待被执行
    Ctor.__decorators__.push(options => factory(options, key, index))
  }

  // createDecorator函数执行完成之后会返回一个新的函数
}
