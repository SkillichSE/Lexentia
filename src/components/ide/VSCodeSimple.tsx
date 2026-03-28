import React, { useState } from 'react'
import '@vscode/codicons/dist/codicon.css'

export function VSCodeSimple() {
  const [activeTab, setActiveTab] = useState('welcome')
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const handleMinimize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Minimize button clicked!')
    setIsMinimized(true)
  }

  const handleMaximize = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Maximize button clicked!')
    setIsMaximized(!isMaximized)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Close button clicked!')
    // In real app this will be window.close()
  }

  const openSettings = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Settings button clicked!')
    // Settings will open here
  }

  const openTerminal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Terminal button clicked!')
    // Terminal will open here
  }

  const openAI = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('AI button clicked!')
    // AI assistant will open here
  }

  const handleExplorerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Explorer clicked!')
    // Explorer will toggle here
  }

  const handleNewProjectClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('New Project clicked!')
    // New project will be created here
  }

  const handleOpenFolderClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Open Folder clicked!')
    // Folder will open here
  }

  const handleAIChatClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('AI Chat clicked!')
    // AI chat will open here
  }

  const handleStartConversationClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('Start Conversation clicked!')
    // AI conversation will start here
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '13px',
      color: '#cccccc',
      backgroundColor: '#1e1e1e'
    }}>
      {/* Title Bar */}
      <div style={{
        height: '30px',
        background: '#3c3c3c',
        borderBottom: '1px solid #000000',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        color: '#cccccc',
        position: 'relative',
        zIndex: 1000
      }}>
        <div style={{ flex: 1, cursor: 'default' }}>Lexentia</div>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          position: 'relative',
          zIndex: 1001
        }}>
          <button 
            onClick={openSettings}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#cccccc',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              position: 'relative',
              zIndex: 1002
            }}
            title="Settings"
          >
            <span className="codicon codicon-gear"></span>
          </button>
          <button 
            onClick={openTerminal}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#cccccc',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              position: 'relative',
              zIndex: 1002
            }}
            title="Terminal"
          >
            <span className="codicon codicon-terminal"></span>
          </button>
          <button 
            onClick={openAI}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#cccccc',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              position: 'relative',
              zIndex: 1002
            }}
            title="AI Assistant"
          >
            AI
          </button>
        </div>
        <div style={{ 
          display: 'flex',
          position: 'relative',
          zIndex: 1003
        }}>
          <button 
            onClick={handleMinimize}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#cccccc',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 1004
            }}
            title="Minimize"
          >
            −
          </button>
          <button 
            onClick={handleMaximize}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#cccccc',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              position: 'relative',
              zIndex: 1004
            }}
            title="Maximize"
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button 
            onClick={handleClose}
            style={{
              background: '#e81123',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: '3px',
              position: 'relative',
              zIndex: 1004
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'row',
        position: 'relative',
        zIndex: 100
      }}>
        {/* Activity Bar */}
        <div style={{
          width: '48px',
          background: '#333333',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '10px 0',
          position: 'relative',
          zIndex: 101
        }}>
          <button
            onClick={handleExplorerClick}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              borderRadius: '4px',
              background: '#007acc',
              border: 'none',
              position: 'relative',
              zIndex: 102
            }}
            title="Explorer"
          >
            <span className="codicon codicon-files" style={{ fontSize: '16px' }}></span>
          </button>
        </div>

        {/* Editor Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          zIndex: 100
        }}>
          <div style={{
            background: '#252526',
            borderBottom: '1px solid #3c3c3c',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            LEXENTIA AI ASSISTANT
          </div>
          
          <div style={{ 
            flex: 1, 
            padding: '20px', 
            textAlign: 'center',
            position: 'relative',
            zIndex: 101
          }}>
            <div style={{ fontSize: '36px', marginBottom: '16px', color: '#007acc' }}>AI</div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#ffffff' }}>
              AI-Powered Development Environment
            </h2>
            <p style={{ fontSize: '16px', marginBottom: '20px', lineHeight: '1.5' }}>
              Welcome to Lexentia - your intelligent coding assistant
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '24px',
              position: 'relative',
              zIndex: 102
            }}>
              <button 
                onClick={handleNewProjectClick}
                style={{
                  background: '#0e639c',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 103
                }}
              >
                <span className="codicon codicon-add"></span>
                New Project
              </button>
              
              <button 
                onClick={handleOpenFolderClick}
                style={{
                  background: '#3a3d41',
                  color: '#cccccc',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 103
                }}
              >
                <span className="codicon codicon-folder-opened"></span>
                Open Folder
              </button>
              
              <button 
                onClick={handleAIChatClick}
                style={{
                  background: '#23a6f5',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative',
                  zIndex: 103
                }}
              >
                Chat
              </button>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: '#2d2d30',
              borderRadius: '8px',
              border: '1px solid #404040',
              position: 'relative',
              zIndex: 102
            }}>
              <h3 style={{ marginBottom: '10px', color: '#ffffff' }}>Features</h3>
              <ul style={{ textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>
                <li style={{ marginBottom: '6px', color: '#cccccc' }}>• AI-powered code completion</li>
                <li style={{ marginBottom: '6px', color: '#cccccc' }}>• Smart error detection</li>
                <li style={{ marginBottom: '6px', color: '#cccccc' }}>• Code refactoring suggestions</li>
                <li style={{ marginBottom: '6px', color: '#cccccc' }}>• Multi-language support</li>
                <li style={{ marginBottom: '6px', color: '#cccccc' }}>• Real-time collaboration</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{
          width: '280px',
          background: '#252526',
          borderLeft: '1px solid #3c3c3c',
          padding: '16px',
          position: 'relative',
          zIndex: 100
        }}>
          <h3 style={{ marginBottom: '12px', color: '#ffffff' }}>AI Assistant</h3>
          <div style={{
            background: '#1e1e1e',
            borderRadius: '6px',
            padding: '16px',
            height: '180px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 101
          }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '12px', 
              color: '#007acc',
              textAlign: 'center'
            }}>
              <span className="codicon codicon-comment-discussion"></span>
            </div>
            <p style={{ fontSize: '13px', color: '#cccccc', textAlign: 'center', marginBottom: '12px' }}>
              AI chat interface
            </p>
            <button 
              onClick={handleStartConversationClick}
              style={{
                background: '#0e639c',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                width: '100%',
                position: 'relative',
                zIndex: 102
              }}
            >
              Start Conversation
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        height: '22px',
        background: '#007acc',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '12px',
        borderTop: '1px solid #000000',
        fontFamily: 'Segoe UI, sans-serif',
        position: 'relative',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>Ready</span>
          <span>AI: Connected</span>
          <span>⚡ Fast</span>
        </div>
        <div style={{ fontWeight: '500' }}>
          Lexentia v1.0.0
        </div>
      </div>
    </div>
  )
}
