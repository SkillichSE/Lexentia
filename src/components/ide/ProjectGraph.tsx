// project graph sidebar component per spec section 8
import React, { useEffect, useRef, useState, useCallback } from 'react'

export interface GraphNode {
  id: string
  file: string
  x?: number
  y?: number
}

export interface GraphEdge {
  from: string
  to: string
}

interface ProjectGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (nodeId: string) => void
  selectedNodes?: string[]
  className?: string
}

// simple force-directed layout
function calculateLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number): GraphNode[] {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.4

  return nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    }
  })
}

export function ProjectGraph({
  nodes,
  edges,
  onNodeClick,
  selectedNodes = [],
  className = ''
}: ProjectGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 })
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect()
      setDimensions({ width, height })
    }
  }, [])

  const layoutNodes = calculateLayout(nodes, edges, dimensions.width, dimensions.height)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const newScale = Math.max(0.5, Math.min(3, scale + (e.deltaY > 0 ? -0.1 : 0.1)))
    setScale(newScale)
  }, [scale])

  if (nodes.length === 0) {
    return (
      <div className={`project-graph project-graph--empty ${className}`}>
        <div className="project-graph-empty">no files to display</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`project-graph ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="project-graph-svg"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* edges */}
          {edges.map((edge, i) => {
            const fromNode = layoutNodes.find(n => n.id === edge.from)
            const toNode = layoutNodes.find(n => n.id === edge.to)
            if (!fromNode || !toNode) return null
            return (
              <line
                key={i}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                className="project-graph-edge"
              />
            )
          })}

          {/* nodes */}
          {layoutNodes.map(node => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className={`project-graph-node ${selectedNodes.includes(node.id) ? 'project-graph-node--selected' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onNodeClick?.(node.id)
              }}
            >
              <circle r={8} className="project-graph-node-circle" />
              <text
                dy={20}
                textAnchor="middle"
                className="project-graph-node-label"
              >
                {node.file.split('/').pop() || node.file}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* controls */}
      <div className="project-graph-controls">
        <button
          type="button"
          className="project-graph-btn"
          onClick={() => { setScale(1); setPan({ x: 0, y: 0 }) }}
        >
          reset view
        </button>
        <span className="project-graph-zoom">{Math.round(scale * 100)}%</span>
      </div>
    </div>
  )
}

// build graph from file structure
export function buildProjectGraph(files: string[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = files.map(file => ({
    id: file,
    file
  }))

  const edges: GraphEdge[] = []

  // create edges based on shared directory structure
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const dir1 = files[i].split('/').slice(0, -1).join('/')
      const dir2 = files[j].split('/').slice(0, -1).join('/')
      if (dir1 && dir1 === dir2) {
        edges.push({ from: files[i], to: files[j] })
      }
    }
  }

  return { nodes, edges }
}
