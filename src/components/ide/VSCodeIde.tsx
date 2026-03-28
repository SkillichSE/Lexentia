import React, { useState, useEffect } from 'react'
import { MonacoEditor } from '../editor/MonacoEditor'
import '../../renderer/vscode-layout.css'
import '../../renderer/vscode-components.css'
import '../../renderer/vscode-theme.css'
import '@vscode/codicons/dist/codicon.css'

interface Tab {
  id: string
  name: string
  content: string
  language: string
  dirty?: boolean
}

interface File {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: File[]
}

export function VSCodeIde() {
  const [activeTab, setActiveTab] = useState<string>('welcome')
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'welcome', name: 'Welcome', content: '// Welcome to Lexentia - VS Code Edition\n// This is a complete VS Code reverse engineering', language: 'typescript' }
  ])
  const [sidebarWidth, setSidebarWidth] = useState(300)
  const [panelHeight, setPanelHeight] = useState(200)
  const [activePanel, setActivePanel] = useState<'terminal' | 'output' | 'problems'>('terminal')

  // Mock file tree
  const [fileTree] = useState<File[]>([
    {
      name: 'src',
      path: '/src',
      type: 'directory',
      children: [
        { name: 'components', path: '/src/components', type: 'directory' },
        { name: 'services', path: '/src/services', type: 'directory' },
        { name: 'App.tsx', path: '/src/App.tsx', type: 'file' },
        { name: 'main.tsx', path: '/src/main.tsx', type: 'file' }
      ]
    },
    {
      name: 'package.json',
      path: '/package.json',
      type: 'file'
    },
    {
      name: 'README.md',
      path: '/README.md',
      type: 'file'
    }
  ])

  const [activeActivity, setActiveActivity] = useState<'explorer' | 'search' | 'source-control' | 'debug' | 'extensions'>('explorer')

  const renderFileTree = (files: File[], depth = 0) => {
    return files.map((file) => (
      <div key={file.path} style={{ marginLeft: `${depth * 16}px` }}>
        <div 
          className={`file-tree-item ${file.type === 'directory' ? 'directory' : 'file'}`}
          onClick={() => {
            if (file.type === 'file') {
              // Open file in editor
              const newTab: Tab = {
                id: file.path,
                name: file.name,
                content: `// Content of ${file.name}`,
                language: file.name.endsWith('.tsx') ? 'typescript' : 'plaintext'
              }
              setTabs(prev => [...prev.filter(t => t.id !== 'welcome'), newTab])
              setActiveTab(file.path)
            }
          }}
        >
          <span className={`codicon codicon-${file.type === 'directory' ? 'folder' : 'file'}`}></span>
          <span className="file-name">{file.name}</span>
        </div>
        {file.children && renderFileTree(file.children, depth + 1)}
      </div>
    ))
  }

  const renderSidebarContent = () => {
    switch (activeActivity) {
      case 'explorer':
        return (
          <div className="sidebar-content">
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="codicon codicon-files"></span>
                EXPLORER
              </div>
              <div className="file-tree">
                {renderFileTree(fileTree)}
              </div>
            </div>
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="codicon codicon-outline"></span>
                OUTLINE
              </div>
              <div className="outline-content">
                <div className="outline-item">function main()</div>
                <div className="outline-item">function render()</div>
                <div className="outline-item">class VSCodeIde</div>
              </div>
            </div>
          </div>
        )
      case 'search':
        return (
          <div className="sidebar-content">
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span className="codicon codicon-search"></span>
                SEARCH
              </div>
              <div className="search-box">
                <input 
                  type="text" 
                  placeholder="Search files..."
                  className="vscode-input"
                />
              </div>
            </div>
          </div>
        )
      default:
        return <div className="sidebar-content">Select an activity</div>
    }
  }

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'terminal':
        return (
          <div className="panel-content">
            <div className="terminal-header">
              <span className="codicon codicon-terminal"></span>
              TERMINAL
            </div>
            <div className="terminal-content">
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span> npm run dev</span>
              </div>
              <div className="terminal-line">
                <span className="terminal-prompt">$</span>
                <span> git status</span>
              </div>
              <div className="terminal-cursor">█</div>
            </div>
          </div>
        )
      case 'output':
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="codicon codicon-output"></span>
              OUTPUT
            </div>
            <div className="output-content">
              <div className="output-line">[info] Server started on port 3000</div>
              <div className="output-line">[info] Hot reload enabled</div>
            </div>
          </div>
        )
      case 'problems':
        return (
          <div className="panel-content">
            <div className="panel-header">
              <span className="codicon codicon-warning"></span>
              PROBLEMS
            </div>
            <div className="problems-content">
              <div className="no-problems">No problems found</div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="monaco-workbench">
      {/* Activity Bar */}
      <div className="part activitybar">
        <div 
          className={`activitybar-item ${activeActivity === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveActivity('explorer')}
          title="Explorer"
        >
          <span className="codicon codicon-files"></span>
        </div>
        <div 
          className={`activitybar-item ${activeActivity === 'search' ? 'active' : ''}`}
          onClick={() => setActiveActivity('search')}
          title="Search"
        >
          <span className="codicon codicon-search"></span>
        </div>
        <div 
          className={`activitybar-item ${activeActivity === 'source-control' ? 'active' : ''}`}
          onClick={() => setActiveActivity('source-control')}
          title="Source Control"
        >
          <span className="codicon codicon-source-control"></span>
        </div>
        <div 
          className={`activitybar-item ${activeActivity === 'debug' ? 'active' : ''}`}
          onClick={() => setActiveActivity('debug')}
          title="Run and Debug"
        >
          <span className="codicon codicon-debug-alt"></span>
        </div>
        <div 
          className={`activitybar-item ${activeActivity === 'extensions' ? 'active' : ''}`}
          onClick={() => setActiveActivity('extensions')}
          title="Extensions"
        >
          <span className="codicon codicon-extensions"></span>
        </div>
      </div>

      {/* Side Bar */}
      <div className="part sidebar" style={{ width: `${sidebarWidth}px` }}>
        <div className="sidebar-resize-handle" 
          onMouseDown={(e) => {
            const startX = e.clientX
            const startWidth = sidebarWidth
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + (e.clientX - startX)
              setSidebarWidth(Math.max(200, Math.min(500, newWidth)))
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
        {renderSidebarContent()}
      </div>

      {/* Editor Area */}
      <div className="part editor">
        <div className="editor-tabs">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-name">{tab.name}</span>
              {tab.dirty && <span className="tab-dirty">●</span>}
              <button 
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  setTabs(prev => prev.filter(t => t.id !== tab.id))
                  if (tabs.length > 1) {
                    setActiveTab(tabs.find(t => t.id !== tab.id)?.id || 'welcome')
                  }
                }}
              >
                <span className="codicon codicon-close"></span>
              </button>
            </div>
          ))}
        </div>
        
        <div className="editor-content">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className="editor-pane"
              style={{ display: activeTab === tab.id ? 'block' : 'none' }}
            >
              <MonacoEditor
                value={tab.content}
                language={tab.language}
                theme="vscode-dark"
                onChange={(value) => {
                  setTabs(prev => prev.map(t => 
                    t.id === tab.id ? { ...t, content: value, dirty: true } : t
                  ))
                }}
                onSave={() => {
                  setTabs(prev => prev.map(t => 
                    t.id === tab.id ? { ...t, dirty: false } : t
                  ))
                }}
                wordWrap={true}
                minimap={true}
                lineNumbers={true}
                fontSize={14}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Panel Area */}
      <div className="part panel" style={{ height: `${panelHeight}px` }}>
        <div className="panel-tabs">
          <div 
            className={`panel-tab ${activePanel === 'terminal' ? 'active' : ''}`}
            onClick={() => setActivePanel('terminal')}
          >
            <span className="codicon codicon-terminal"></span>
            TERMINAL
          </div>
          <div 
            className={`panel-tab ${activePanel === 'output' ? 'active' : ''}`}
            onClick={() => setActivePanel('output')}
          >
            <span className="codicon codicon-output"></span>
            OUTPUT
          </div>
          <div 
            className={`panel-tab ${activePanel === 'problems' ? 'active' : ''}`}
            onClick={() => setActivePanel('problems')}
          >
            <span className="codicon codicon-warning"></span>
            PROBLEMS
            <span className="problem-count">0</span>
          </div>
        </div>
        
        <div className="panel-resize-handle"
          onMouseDown={(e) => {
            const startY = e.clientY
            const startHeight = panelHeight
            
            const handleMouseMove = (e: MouseEvent) => {
              const newHeight = startHeight - (e.clientY - startY)
              setPanelHeight(Math.max(100, Math.min(400, newHeight)))
            }
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }
            
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
        />
        
        <div className="panel-content">
          {renderPanelContent()}
        </div>
      </div>

      {/* Status Bar */}
      <div className="part statusbar">
        <div className="statusbar-left">
          <span className="statusbar-item">main</span>
          <span className="statusbar-item">UTF-8</span>
          <span className="statusbar-item">LF</span>
          <span className="statusbar-item">TypeScript React</span>
        </div>
        <div className="statusbar-right">
          <span className="statusbar-item">Git: main</span>
          <span className="statusbar-item">⚡ 0</span>
          <span className="statusbar-item">Ready</span>
        </div>
      </div>
    </div>
  )
}
