import Vue, { ComponentOptions } from 'vue'
import { VueClass, DecoratedClass } from './declarations'

export const noop = () => {}

const fakeArray = { __proto__: [] }
export const hasProto = fakeArray instanceof Array

export interface VueDecorator {
  // Class decorator
  (Ctor: typeof Vue): void

  // Property decorator
  (target: Vue, key: string): void

  // Parameter decorator
  (target: Vue, key: string, index: number): void
}

/**
 * 创建装饰器
 * @param factory 自定义装饰器的工厂函数
 * @returns 返回一个新的装饰函数
 */
export function createDecorator (factory: (options: ComponentOptions<Vue>, key: string, index: number) => void): VueDecorator {
  /**
   * 根据__decorators__的执行时机判断可得
   * target：指的就是Vue2选项式API写法的Options对象
   * 
   * 根据createDecorator的执行时机判断可得
   * key：指的就是装饰的属性或者方法名
   * 
   */
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
}

export type UnionToIntersection<U> = (U extends any
? (k: U) => void
: never) extends (k: infer I) => void
  ? I
  : never

export type ExtractInstance<T> = T extends VueClass<infer V> ? V : never

export type MixedVueClass<
  Mixins extends VueClass<Vue>[]
> = Mixins extends (infer T)[]
  ? VueClass<UnionToIntersection<ExtractInstance<T>>>
  : never

// Retain legacy declaration for backward compatibility
export function mixins <A> (CtorA: VueClass<A>): VueClass<A>
export function mixins <A, B> (CtorA: VueClass<A>, CtorB: VueClass<B>): VueClass<A & B>
export function mixins <A, B, C> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>): VueClass<A & B & C>
export function mixins <A, B, C, D> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>, CtorD: VueClass<D>): VueClass<A & B & C & D>
export function mixins <A, B, C, D, E> (CtorA: VueClass<A>, CtorB: VueClass<B>, CtorC: VueClass<C>, CtorD: VueClass<D>, CtorE: VueClass<E>): VueClass<A & B & C & D & E>
export function mixins<T>(...Ctors: VueClass<Vue>[]): VueClass<T>

export function mixins<T extends VueClass<Vue>[]>(...Ctors: T): MixedVueClass<T>
export function mixins (...Ctors: VueClass<Vue>[]): VueClass<Vue> {
  return Vue.extend({ mixins: Ctors })
}

export function isPrimitive (value: any): boolean {
  const type = typeof value
  return value == null || (type !== 'object' && type !== 'function')
}

export function warn (message: string): void {
  if (typeof console !== 'undefined') {
    console.warn('[vue-class-component] ' + message)
  }
}
