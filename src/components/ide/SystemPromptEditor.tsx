import React, { useState, useEffect } from 'react'

export interface SystemPrompt {
  id: string
  name: string
  content: string
  language?: string
  style?: string
  variables?: Record<string, string>
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface PromptTemplate {
  name: string
  description: string
  content: string
  variables: string[]
  category: 'coding' | 'analysis' | 'debugging' | 'documentation' | 'general'
}

interface SystemPromptEditorProps {
  currentPrompt: SystemPrompt
  onPromptChange: (prompt: SystemPrompt) => void
  onPromptSave: (prompt: SystemPrompt) => void
  className?: string
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    name: 'Code Assistant',
    description: 'General purpose coding assistant',
    category: 'coding',
    content: `You are an expert software developer and AI assistant. Your role is to help users write, debug, and understand code.

Key guidelines:
- Write clean, maintainable, and well-documented code
- Follow best practices and design patterns
- Explain complex concepts clearly
- Consider performance and security implications
- Ask clarifying questions when requirements are ambiguous

Current context: {{context}}
User request: {{request}}`,
    variables: ['context', 'request']
  },
  {
    name: 'Python Specialist',
    description: 'Specialized for Python development',
    category: 'coding',
    content: `You are a Python expert with deep knowledge of:
- Python standard library and popular frameworks (Django, Flask, FastAPI, etc.)
- Data science libraries (pandas, numpy, matplotlib, scikit-learn)
- Best practices, PEP 8, and type hints
- Performance optimization and debugging

Focus on Pythonic solutions and explain your reasoning.

Context: {{context}}
Task: {{task}}`,
    variables: ['context', 'task']
  },
  {
    name: 'TypeScript Expert',
    description: 'Specialized for TypeScript/JavaScript development',
    category: 'coding',
    content: `You are a TypeScript and JavaScript expert. You understand:
- Modern ES6+ features and TypeScript syntax
- Popular frameworks (React, Vue, Angular, Node.js)
- Build tools and development workflows
- Type safety and best practices

Write type-safe code and explain TypeScript concepts when relevant.

Context: {{context}}
Request: {{request}}`,
    variables: ['context', 'request']
  },
  {
    name: 'Code Reviewer',
    description: 'Focused on code review and quality improvement',
    category: 'analysis',
    content: `You are a senior code reviewer. Analyze the provided code for:
- Code quality and maintainability
- Potential bugs and security issues
- Performance improvements
- Adherence to best practices
- Testing considerations

Provide constructive feedback with specific suggestions.

Code to review: {{code}}
Review focus: {{focus}}`,
    variables: ['code', 'focus']
  },
  {
    name: 'Debugger',
    description: 'Specialized in debugging and troubleshooting',
    category: 'debugging',
    content: `You are an expert debugger. Help identify and fix issues by:
1. Analyzing error messages and stack traces
2. Understanding the code flow and logic
3. Identifying root causes
4. Providing step-by-step solutions
5. Suggesting preventive measures

Error details: {{error}}
Code context: {{context}}`,
    variables: ['error', 'context']
  }
]

export function SystemPromptEditor({ 
  currentPrompt, 
  onPromptChange, 
  onPromptSave,
  className = '' 
}: SystemPromptEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState<SystemPrompt>(currentPrompt)
  const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [variables, setVariables] = useState<Record<string, string>>({})

  useEffect(() => {
    setEditedPrompt(currentPrompt)
  }, [currentPrompt])

  const handleEdit = () => {
    setIsEditing(true)
    setEditedPrompt({ ...currentPrompt })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedPrompt(currentPrompt)
    setSelectedTemplate(null)
  }

  const handleSave = () => {
    const updatedPrompt = {
      ...editedPrompt,
      updatedAt: Date.now()
    }
    onPromptChange(updatedPrompt)
    onPromptSave(updatedPrompt)
    setIsEditing(false)
    setSelectedTemplate(null)
  }

  const handleTemplateSelect = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setEditedPrompt({
      ...editedPrompt,
      name: template.name,
      content: template.content,
      variables: template.variables.reduce((acc, variable) => {
        acc[variable] = ''
        return acc
      }, {} as Record<string, string>)
    })
  }

  const handleContentChange = (content: string) => {
    setEditedPrompt({ ...editedPrompt, content })
  }

  const handleVariableChange = (variable: string, value: string) => {
    setVariables(prev => ({ ...prev, [variable]: value }))
  }

  const renderPreview = () => {
    let preview = editedPrompt.content
    if (editedPrompt.variables) {
      Object.entries(editedPrompt.variables).forEach(([key, value]) => {
        preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`)
      })
    }
    return preview
  }

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{(\w+)}}/g)
    return matches ? matches.map(match => match.slice(2, -2)) : []
  }

  useEffect(() => {
    const extractedVars = extractVariables(editedPrompt.content)
    const newVariables: Record<string, string> = {}
    extractedVars.forEach(variable => {
      newVariables[variable] = editedPrompt.variables?.[variable] || ''
    })
    setVariables(newVariables)
  }, [editedPrompt.content, editedPrompt.variables])

  return (
    <div className={`system-prompt-editor ${className}`}>
      {/* Header */}
      <div className="prompt-editor-header">
        <div className="prompt-editor-title">
          <h3>System Prompt Editor</h3>
          <span className="prompt-status">
            {isEditing ? 'Editing' : currentPrompt.isDefault ? 'Default' : 'Custom'}
          </span>
        </div>
        <div className="prompt-editor-actions">
          {!isEditing ? (
            <>
              <button className="prompt-btn prompt-btn-secondary" onClick={() => setPreviewMode(!previewMode)}>
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button className="prompt-btn prompt-btn-primary" onClick={handleEdit}>
                Edit
              </button>
            </>
          ) : (
            <>
              <button className="prompt-btn prompt-btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
              <button className="prompt-btn prompt-btn-primary" onClick={handleSave}>
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Templates */}
      {isEditing && (
        <div className="prompt-templates">
          <div className="templates-header">
            <span>Templates</span>
            <button 
              className="template-btn"
              onClick={() => setSelectedTemplate(null)}
            >
              Clear
            </button>
          </div>
          <div className="templates-grid">
            {templates.map(template => (
              <div
                key={template.name}
                className={`template-card ${selectedTemplate?.name === template.name ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="template-name">{template.name}</div>
                <div className="template-description">{template.description}</div>
                <div className="template-category">{template.category}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="prompt-editor-content">
        {isEditing ? (
          <div className="prompt-edit-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editedPrompt.name}
                onChange={(e) => setEditedPrompt({ ...editedPrompt, name: e.target.value })}
                className="form-input"
                placeholder="Enter prompt name..."
              />
            </div>

            <div className="form-group">
              <label>Content</label>
              <textarea
                value={editedPrompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="form-textarea"
                rows={12}
                placeholder="Enter system prompt content..."
              />
            </div>

            {/* Variables */}
            {Object.keys(variables).length > 0 && (
              <div className="form-group">
                <label>Variables</label>
                <div className="variables-grid">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key} className="variable-input">
                      <span className="variable-name">{`{{${key}}}`}</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleVariableChange(key, e.target.value)}
                        className="form-input"
                        placeholder="Default value..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="prompt-preview">
            <div className="prompt-header">
              <h4>{currentPrompt.name}</h4>
              <div className="prompt-meta">
                <span>Updated: {new Date(currentPrompt.updatedAt).toLocaleDateString()}</span>
                {currentPrompt.language && <span>Language: {currentPrompt.language}</span>}
                {currentPrompt.style && <span>Style: {currentPrompt.style}</span>}
              </div>
            </div>
            <div className="prompt-content">
              <pre>{previewMode ? renderPreview() : currentPrompt.content}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="prompt-editor-footer">
        <div className="prompt-stats">
          <span>Characters: {editedPrompt.content.length}</span>
          <span>Variables: {Object.keys(variables).length}</span>
          <span>Lines: {editedPrompt.content.split('\n').length}</span>
        </div>
        {selectedTemplate && (
          <div className="template-indicator">
            Using template: {selectedTemplate.name}
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for managing system prompts
export function useSystemPrompts() {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [currentPromptId, setCurrentPromptId] = useState<string>('default')

  const savePrompt = (prompt: SystemPrompt) => {
    setPrompts(prev => {
      const existing = prev.findIndex(p => p.id === prompt.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = prompt
        return updated
      }
      return [...prev, prompt]
    })
  }

  const getCurrentPrompt = (): SystemPrompt => {
    return prompts.find(p => p.id === currentPromptId) || prompts[0] || {
      id: 'default',
      name: 'Default Assistant',
      content: 'You are a helpful AI assistant.',
      isDefault: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  const setCurrentPrompt = (promptId: string) => {
    setCurrentPromptId(promptId)
  }

  const createPrompt = (name: string, content: string): SystemPrompt => {
    return {
      id: `prompt-${Date.now()}`,
      name,
      content,
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  const deletePrompt = (promptId: string) => {
    if (promptId === 'default') return // Cannot delete default
    setPrompts(prev => prev.filter(p => p.id !== promptId))
    if (currentPromptId === promptId) {
      setCurrentPromptId('default')
    }
  }

  return {
    prompts,
    currentPromptId,
    getCurrentPrompt,
    savePrompt,
    setCurrentPrompt,
    createPrompt,
    deletePrompt
  }
}
