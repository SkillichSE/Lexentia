import React, { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import '@vscode/codicons/dist/codicon.css'

interface MonacoEditorProps {
  value?: string
  language?: string
  theme?: string
  onChange?: (value: string) => void
  onSave?: () => void
  readOnly?: boolean
  fontSize?: number
  wordWrap?: boolean
  minimap?: boolean
  lineNumbers?: boolean
}

export function MonacoEditor({
  value = '',
  language = 'typescript',
  theme = 'vscode-dark',
  onChange,
  onSave,
  readOnly = false,
  fontSize = 14,
  wordWrap = true,
  minimap = true,
  lineNumbers = true
}: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isEditorReady, setIsEditorReady] = useState(false)

  useEffect(() => {
    // Define VS Code dark theme
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569cd6', fontStyle: 'bold' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'class', foreground: '4ec9b0' },
        { token: 'interface', foreground: 'b8d7a8' },
        { token: 'function', foreground: 'dcdcaa', fontStyle: 'bold' },
        { token: 'variable', foreground: '9cdcfe' },
        { token: 'parameter', foreground: '9cdcfe' },
        { token: 'property', foreground: '9cdcfe' },
        { token: 'namespace', foreground: 'b8d7a8' },
        { token: 'operator', foreground: 'd4d4d4' },
        { token: 'punctuation', foreground: 'd4d4d4' },
        { token: 'regexp', foreground: 'd16969' },
        { token: 'constructor', foreground: '4ec9b0' },
        { token: 'tag', foreground: '569cd6' },
        { token: 'attribute.name', foreground: '9cdcfe' },
        { token: 'attribute.value', foreground: 'ce9178' },
        { token: 'meta', foreground: 'b8d7a8' },
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

    // Set default theme
    monaco.editor.setTheme('vscode-dark')

    // Configure editor options
    const options: monaco.editor.IStandaloneEditorConstructionOptions = {
      value,
      language,
      theme,
      readOnly,
      fontSize,
      wordWrap: wordWrap ? 'on' : 'off',
      minimap: { enabled: minimap },
      lineNumbers: lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      bracketPairColorization: {
        enabled: true
      },
      guides: {
        indentation: true,
        bracketPairs: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true
      }
    }

    if (containerRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, options)
      setIsEditorReady(true)

      // Add change listener
      if (onChange) {
        editorRef.current.onDidChangeModelContent(() => {
          const value = editorRef.current?.getValue() || ''
          onChange(value)
        })
      }

      // Add save shortcut (Ctrl+S)
      if (onSave) {
        editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave()
        })
      }
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose()
      }
    }
  }, [language, theme, readOnly, fontSize, wordWrap, minimap, lineNumbers, onChange, onSave])

  // Update editor options when props change
  useEffect(() => {
    if (editorRef.current && isEditorReady) {
      editorRef.current.updateOptions({
        fontSize,
        wordWrap: wordWrap ? 'on' : 'off',
        minimap: { enabled: minimap },
        lineNumbers: lineNumbers ? 'on' : 'off',
        readOnly
      })
    }
  }, [fontSize, wordWrap, minimap, lineNumbers, readOnly, isEditorReady])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        overflow: 'hidden'
      }}
    />
  )
}
