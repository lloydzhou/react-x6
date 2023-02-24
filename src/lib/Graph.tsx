// @ts-nocheck
import { Children, forwardRef, useRef, useLayoutEffect, useState, useMemo, cloneElement } from 'react'
import type { ReactNode, CSSProperties, Ref } from 'react'
import { Graph as X6Graph, Node as X6Node, Edge as X6Edge, StringExt, ObjectExt } from '@antv/x6'
import { Renderer, ElementOf } from './reconciler';

const toArray = (children) => {
  return children ? children.length && children || [children] : []
}

const processProps = (props) => {
  return Object.entries(props).reduce((res, [name, value]) => {
    if (name.startsWith('on')) {
      res.events[name.substr(2).toLowerCase()] = value
    } else {
      res.props[name] = value
    }
    return res
  }, {props:{}, events: {}})
}

const bindEvent = (node, events, graph) => {
  Object.entries(events).forEach(([name, callback]) => {
    graph.on(`cell:${name}`, (e) => {
      const { cell } = e
      if (cell.id === node.id) {
        // @ts-ignore
        callback(e)
      }
    })
  })
}

interface Props {
  className?: string;
  style?: CSSProperties;
  container?: HTMLDivElement;
  children?: ReactNode;
};

export const Graph = forwardRef<X6Graph, X6Graph.Options & Props>(({ children, width, height, className, style, ...other }, ref) => {
  const container = useRef();
  const divRef = useRef(null);

  const innerGraphRef = useRef<X6Graph | null>(null);

  const gRef = (ref || innerGraphRef) as Ref<X6Graph | null>;

  useLayoutEffect(() => {
    const graph = new X6Graph({
      container: divRef.current,
      width,
      height,
      ...other,
    });

    // @ts-ignore
    gRef.current = graph;

    // @ts-ignore
    container.current = Renderer.createContainer(graph, 1, false, null);

    return () => {
      Renderer.updateContainer(null, container.current, null);
      gRef.current.dispose()
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 1. 不使用react生成的Children，而是强行生成带key的新
   * 2. childrens Map<props.id | props, key>
   * 3. 使用cloneElement把key更新到组件里面
   */

  const idMap = useRef(new Map())
  const childrens = useMemo(() =>  toArray(children).map((child, count) => {
    const { type, props, ref } = child
    const { id } = props
    const hash = StringExt.hashcode(JSON.stringify(props))
    let key = id || idMap.current.get(id) || idMap.current.get(hash)
    if (!key) {
      key = StringExt.uuid()
      // 边可能会在节点删除的时候隐式删除，使用旧的对象导致渲染出问题并且不能更新
      // TODO 所以边不传id的时候就使用新的uuid创建
      if (!id && type !== 'Edge') {
        idMap.current.set(id || hash, key)
      }
    }
    // 使用cloneElement，将key重置，不更改props这些信息
    return cloneElement(child, { id: id || key, key })
  }), [children])

  useLayoutEffect(() => {
    if (container.current) {
      Renderer.updateContainer(childrens, container.current, null);
    }
  }, [childrens]);

  useLayoutEffect(() => {
    gRef.current.resize(width, height);
  }, [width, height, gRef]);

  return (
    <div
      className={className}
      ref={divRef}
      style={style}
    />
  );
});


const createCell = (Ctor, shape, newProps, graph) => {
  const { props={}, events={} } = processProps(newProps)
  let node = Ctor({shape: shape || props.shape || 'rect', ...props, parent: undefined})
  node._removeFrom = function(parentNode) {
    graph.model.removeCell(node)
  }
  node._update = (oldProps, newProps) => {
    const { pprops={}, pevents={} } = processProps(oldProps)
    const { props={}, events={} } = processProps(newProps)
    if (!ObjectExt.isEqual(pprops, props)) {
      const t = Ctor({shape: node.shape, ...props, parent: undefined})
      const prop = t.getProp()
      if (!ObjectExt.isEqual(node.getProp(), prop)) {
        Object.keys(prop).forEach((key) => {
          if (['id', 'parent', 'shape'].indexOf(key) === -1) {
            node.setProp(key, prop[key])
          }
        });
      }
    }
    // 移除旧事件，监听新事件
    node.off() // remove all events
    // 重新监听新的事件
    bindEvent(node, events, graph)
  }

  // 增加监听事件
  bindEvent(node, events, graph)
  graph.model.addCell(node)
  if (props.parent) {
    const parentNode = graph.getCellById(props.parent)
    if (parentNode) {
      parentNode.addChild(node)
    }
  }
  return node
}

export const Node = ElementOf("Node", createCell.bind(null, X6Node.create, 'rect'))
export const Edge = ElementOf("Edge", createCell.bind(null, X6Edge.create, 'edge'))

