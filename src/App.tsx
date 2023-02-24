import { Graph, Node, Edge } from './lib/Graph'
import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  const node4 = useRef()

  useEffect(() => {
    console.log('node4', node4.current)
  })

  return (
    <div className="App">
      <Graph background grid width={800} height={600}>
        <Node id="1" x={100} y={100} label="node1" width={80} height={40}>
        </Node>
        <Node id="3" x={200} y={100} label="node3" width={80} height={40} parent="1" />
        <Node id="2" x={200} y={200} label="node2" width={80} height={40} />
        <Node id="4" x={200} y={250} label="node4" width={80} height={40} ref={node4} />
        <Node id="5" x={300} y={250} label="node5" width={80} height={40} onClick={e => {
          console.log('onClick', e)
        }} />
        <Edge source="1" target="2" />
      </Graph>
    </div>
  )
}

export default App
