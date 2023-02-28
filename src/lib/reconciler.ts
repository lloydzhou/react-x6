// @ts-nocheck
import { Shape, Node, Edge, ObjectExt, StringExt } from '@antv/x6'
import Reconciler from 'react-reconciler';
import React, { createElement } from 'react';
import type { ReactElement, ReactNode, Ref, Key } from 'react';
import { DefaultEventPriority } from 'react-reconciler/constants'

/**
 * 1. 只抽象create/update/removeFrom
 * 2. 创建实例,走正常流程
 * 3. 实际的instance就是元素本身，可以使用ref获取到
 *
 * 另一种模式：
 * 1. createinstance不创建实例
 * 2. 在每一个组件上附着cell对象
 * 3. 通过每一个组件的生命周期去把当前附着的cell对象加入到画布进行管理
 * 这种模式其实和之前使用context对x6进行封装差别不是很大，就没有必要使用Reconciler
 */

// 使用一个map保存每一种react元素对应的构造器
const componentMap = new Map()
type BaseProps<Element, Prop> = {
  key?: Key;
  ref?: Ref<Element>;
  children?: ReactNode;
} & Prop;
export function ElementOf<Element, Prop, T extends string>(
  type: T,
  Ctor: () => any,
): (props: BaseProps<Element, Prop>) => ReactElement<Prop, T> {
  componentMap.set(type, Ctor)
  return type as any;
}

export const Renderer = Reconciler({
  getRootHostContext: () => true,
  prepareForCommit: () => true,
  resetAfterCommit: () => true,
  getChildHostContext: () => true,
  shouldSetTextContent: () => false,
  getPublicInstance: instance => instance,
  createInstance(type, props, root, context, fnode) {
    if (componentMap.has(type)) {
      return componentMap.get(type)(props, root, fnode)
    }
	},
  createTextInstance: text => null,
  resetTextContent: node => null,
  appendInitialChild(parentNode, node) {
    node._insert && node._insert(parentNode)
  },
  insertBefore(parentNode, node) {
    node._insert && node._insert(parentNode)
  },
  finalizeInitialChildren: () => false,
  supportsMutation: true,
  appendChild(node, parentNode) {
    node._insert && node._insert(parentNode)
  },
  appendChildToContainer(parentNode, node) {},
  insertInContainerBefore(node, parentNode) {},
  removeChildFromContainer(parentNode, childNode) {
    childNode._removeFrom(parentNode)
  },
  prepareUpdate: () => true,
  commitUpdate: (node, updatePayload, type, oldProps, newProps) => node._update(oldProps, newProps),
  commitTextUpdate: () => null,
  removeChild: (parentNode, childNode) => childNode._removeFrom(parentNode),
  clearContainer() {},
  getCurrentEventPriority: () => DefaultEventPriority,
  detachDeletedInstance(childNode) {
    childNode.dispose && childNode.dispose()
  },
})

const LegacyRoot = 1;

const ReactX = {
  render(element, container) {
    const root = Renderer.createContainer(container, LegacyRoot, false);
    Renderer.updateContainer(element, root, null, () => undefined);
    return Renderer.getPublicRootInstance(root);
  }
};

export default ReactX;
