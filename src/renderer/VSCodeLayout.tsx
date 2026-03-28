import React, { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import './vscode-theme.css'

interface VSCodeLayoutProps {
  children?: React.ReactNode
}

export function VSCodeLayout({ children }: VSCodeLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize Monaco Editor with VS Code theme
    if (containerRef.current) {
      monaco.editor.defineTheme('vscode-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '6a9955' },
          { token: 'keyword', foreground: '569cd6' },
          { token: 'string', foreground: 'ce9178' },
          { token: 'number', foreground: 'b5cea8' },
          { token: 'type', foreground: '4ec9b0' },
          { token: 'function', foreground: 'dcdcaa' },
          { token: 'variable', foreground: '9cdcfe' },
          { token: 'class', foreground: '4ec9b0' },
          { token: 'interface', foreground: 'b8d7a8' },
          { token: 'parameter', foreground: '9cdcfe' },
          { token: 'property', foreground: '9cdcfe' },
          { token: 'namespace', foreground: 'b8d7a8' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4',
          'editor.lineHighlightBackground': 'rgba(255, 255, 255, 0.1)',
          'editor.selectionBackground': '#264f78',
          'editor.inactiveSelectionBackground': '#3a3d41',
          'editorCursor.foreground': '#aeafad',
          'editorWhitespace.foreground': '#404040',
          'editorIndentGuide.background': '#404040',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#c6c6c6',
          'editorGroupHeader.tabsBackground': '#2d2d30',
          'editorGroupHeader.tabsBorder': '#2d2d30',
          'tab.activeBackground': '#1e1e1e',
          'tab.activeForeground': '#ffffff',
          'tab.inactiveBackground': '#2d2d30',
          'tab.inactiveForeground': '#ffffff80',
          'tab.border': '#2d2d30',
          'activityBar.background': '#333333',
          'activityBar.foreground': '#ffffff',
          'activityBar.inactiveForeground': '#ffffff66',
          'sideBar.background': '#252526',
          'sideBar.foreground': '#cccccc',
          'sideBarSectionHeader.background': '#000000',
          'sideBarSectionHeader.foreground': '#bbbbbb',
          'sideBarTitle.foreground': '#bbbbbb',
          'button.background': '#0e639c',
          'button.foreground': '#ffffff',
          'button.hoverBackground': '#1177bb',
          'button.secondaryBackground': '#3a3d41',
          'button.secondaryForeground': '#cccccc',
          'button.secondaryHoverBackground': '#45494e',
          'input.background': '#3c3c3c',
          'input.foreground': '#cccccc',
          'input.border': '#3c3c3c',
          'input.placeholderForeground': '#cccccc66',
          'dropdown.background': '#3c3c3c',
          'dropdown.foreground': '#cccccc',
          'dropdown.border': '#3c3c3c',
          'badge.background': '#4d4d4d',
          'badge.foreground': '#ffffff',
          'progressBar.background': '#0e70c0',
          'widget.background': '#252526',
          'widget.foreground': '#cccccc',
          'widget.border': '#3c3c3c',
          'selection.background': '#264f78',
          'selection.foreground': '#ffffff',
          'border': '#3c3c3c',
          'focusBorder': '#007fd4',
          'contrastBorder': '#6fc3df',
          'contrastActiveBorder': '#f38518',
          'scrollbar.shadow': '#000000',
          'scrollbarSlider.background': '#797979',
          'scrollbarSlider.hoverBackground': '#646464',
          'scrollbarSlider.activeBackground': '#bfbfbf',
          'minimap.background': '#1e1e1e',
          'minimap.selectionHighlight': '#264f78',
          'minimap.errorHighlight': '#f14c4c',
          'minimap.warningHighlight': '#ffcc02',
          'minimap.foreground': '#6c6c6c',
          'minimapSlider.background': '#525252',
          'minimapSlider.hoverBackground': '#6c6c6c',
          'minimapSlider.activeBackground': '#858585',
          'statusBar.background': '#007acc',
          'statusBar.foreground': '#ffffff',
          'statusBar.noFolderBackground': '#68217a',
          'statusBar.debuggingBackground': '#cc6633',
          'titleBar.activeBackground': '#3c3c3c',
          'titleBar.activeForeground': '#cccccc',
          'titleBar.inactiveBackground': '#333333',
          'titleBar.inactiveForeground': '#ffffff80',
          'notifications.background': '#343434',
          'notifications.foreground': '#cccccc',
          'notificationLink.foreground': '#3794ff',
          'extensionButton.prominentBackground': '#007acc',
          'extensionButton.prominentForeground': '#ffffff',
          'extensionBadge.background': '#4d4d4d',
          'extensionBadge.foreground': '#ffffff',
          'testing.iconPassed': '#4d9c4d',
          'testing.iconErrored': '#f14c4c',
          'testing.iconSkipped': '#858585',
          'errorForeground': '#f14c4c',
          'errorBackground': '#5a1d1d',
          'errorBorder': '#be1100',
          'warningForeground': '#ffcc02',
          'warningBackground': '#622a17',
          'warningBorder': '#b89500',
          'infoForeground': '#3794ff',
          'infoBackground': '#1a65d7',
          'infoBorder': '#0078d4',
        }
      })
      
      monaco.editor.setTheme('vscode-dark')
    }
  }, [])

  return (
    <div className="monaco-workbench" ref={containerRef}>
      {/* Activity Bar */}
      <div className="part activitybar">
        <div className="activitybar-item" title="Explorer">
          <span className="codicon codicon-files"></span>
        </div>
        <div className="activitybar-item" title="Search">
          <span className="codicon codicon-search"></span>
        </div>
        <div className="activitybar-item" title="Source Control">
          <span className="codicon codicon-source-control"></span>
        </div>
        <div className="activitybar-item" title="Run and Debug">
          <span className="codicon codicon-debug-alt"></span>
        </div>
        <div className="activitybar-item" title="Extensions">
          <span className="codicon codicon-extensions"></span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="part sidebar">
        {children}
      </div>

      {/* Editor Area */}
      <div className="part editor">
        <div className="editor-container">
          {/* Monaco Editor will be rendered here */}
        </div>
      </div>

      {/* Panel Area */}
      <div className="part panel">
        <div className="panel-container">
          {/* Terminal, Output, etc. */}
        </div>
      </div>

      {/* Status Bar */}
      <div className="part statusbar">
        <div className="statusbar-left">
          <span className="statusbar-item">main</span>
          <span className="statusbar-item">UTF-8</span>
          <span className="statusbar-item">LF</span>
        </div>
        <div className="statusbar-right">
          <span className="statusbar-item">Ready</span>
        </div>
      </div>
    </div>
  )
}
