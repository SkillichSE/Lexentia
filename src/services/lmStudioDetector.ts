// LM Studio Auto-detection and Model Management
import React, { useState, useEffect, useCallback } from 'react'
import { type ModelProfile, type ModelProviderType } from '../services/modelProfiles'

export interface LMStudioModel {
  id: string
  name: string
  size: string
  modified: string
  parameters: {
    contextLength: number
    embedding: boolean
    chatTemplate?: string
  }
  status: 'loaded' | 'unloaded' | 'loading'
  downloadProgress?: number
}

export interface LMStudioInfo {
  version: string
  port: number
  host: string
  apiVersion: string
  models: LMStudioModel[]
  systemInfo: {
    platform: string
    arch: string
    gpu?: {
      vendor: string
      name: string
      memory: number
    }
  }
}

export interface DetectionResult {
  found: boolean
  info?: LMStudioInfo
  error?: string
  endpoints: string[]
}

export class LMStudioDetector {
  private static readonly DEFAULT_ENDPOINTS = [
    'http://127.0.0.1:1234',
    'http://localhost:1234',
    'http://127.0.0.1:1235',
    'http://localhost:1235',
    'http://127.0.0.1:1236',
    'http://localhost:1236'
  ]

  private static readonly DETECTION_TIMEOUT = 5000 // 5 seconds

  // Detect LM Studio instances
  static async detect(): Promise<DetectionResult> {
    const endpoints: string[] = []
    let lmStudioInfo: LMStudioInfo | null = null
    let lastError: string | undefined

    for (const endpoint of LMStudioDetector.DEFAULT_ENDPOINTS) {
      try {
        const info = await LMStudioDetector.getInfo(endpoint)
        if (info) {
          endpoints.push(endpoint)
          if (!lmStudioInfo) {
            lmStudioInfo = info
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        console.debug(`Failed to connect to ${endpoint}:`, error)
      }
    }

    return {
      found: endpoints.length > 0,
      info: lmStudioInfo || undefined,
      error: endpoints.length === 0 ? lastError : undefined,
      endpoints
    }
  }

  // Get LM Studio information
  static async getInfo(endpoint: string): Promise<LMStudioInfo | null> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), LMStudioDetector.DETECTION_TIMEOUT)

      const response = await fetch(`${endpoint}/v1/info`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Get models list
      const models = await LMStudioDetector.getModels(endpoint)

      return {
        version: data.version || 'unknown',
        port: parseInt(new URL(endpoint).port) || 1234,
        host: new URL(endpoint).hostname,
        apiVersion: data.api_version || 'v1',
        models,
        systemInfo: {
          platform: data.platform || 'unknown',
          arch: data.arch || 'unknown',
          gpu: data.gpu ? {
            vendor: data.gpu.vendor || 'unknown',
            name: data.gpu.name || 'unknown',
            memory: data.gpu.memory || 0
          } : undefined
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Connection timeout to ${endpoint}`)
      }
      throw error
    }
  }

  // Get available models
  static async getModels(endpoint: string): Promise<LMStudioModel[]> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), LMStudioDetector.DETECTION_TIMEOUT)

      const response = await fetch(`${endpoint}/v1/models`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.data || !Array.isArray(data.data)) {
        return []
      }

      return data.data.map((model: any) => ({
        id: model.id || model.name,
        name: model.name || model.id,
        size: LMStudioDetector.formatSize(model.size || 0),
        modified: model.modified || new Date().toISOString(),
        parameters: {
          contextLength: model.context_length || 4096,
          embedding: model.embedding || false,
          chatTemplate: model.chat_template
        },
        status: model.loaded ? 'loaded' : 'unloaded' as const
      }))
    } catch (error) {
      console.error('Failed to get models:', error)
      return []
    }
  }

  // Load a model
  static async loadModel(endpoint: string, modelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/v1/models/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: modelId })
      })

      return response.ok
    } catch (error) {
      console.error('Failed to load model:', error)
      return false
    }
  }

  // Unload a model
  static async unloadModel(endpoint: string, modelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/v1/models/unload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: modelId })
      })

      return response.ok
    } catch (error) {
      console.error('Failed to unload model:', error)
      return false
    }
  }

  // Get model status
  static async getModelStatus(endpoint: string, modelId: string): Promise<LMStudioModel['status']> {
    try {
      const models = await LMStudioDetector.getModels(endpoint)
      const model = models.find(m => m.id === modelId || m.name === modelId)
      return model?.status || 'unloaded'
    } catch (error) {
      console.error('Failed to get model status:', error)
      return 'unloaded'
    }
  }

  // Convert LM Studio models to Lexentia profiles
  static async convertToProfiles(endpoint: string): Promise<ModelProfile[]> {
    try {
      const models = await LMStudioDetector.getModels(endpoint)
      
      return models.map(model => ({
        id: `lm-studio-${model.id}`,
        name: model.name,
        model: model.id,
        baseUrl: `${endpoint}/v1`,
        temperature: 0.7,
        topP: 0.9,
        maxTokens: Math.min(model.parameters.contextLength, 4096),
        systemPrompt: 'You are a helpful AI assistant.',
        provider: 'openai_compatible' as ModelProviderType,
        apiKey: ''
      }))
    } catch (error) {
      console.error('Failed to convert models to profiles:', error)
      return []
    }
  }

  // Test connection to endpoint
  static async testConnection(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/v1/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  // Monitor model loading progress
  static async monitorLoadingProgress(
    endpoint: string, 
    modelId: string, 
    onProgress: (progress: number) => void
  ): Promise<void> {
    const checkProgress = async () => {
      try {
        const models = await LMStudioDetector.getModels(endpoint)
        const model = models.find(m => m.id === modelId || m.name === modelId)
        
        if (model) {
          if (model.downloadProgress !== undefined) {
            onProgress(model.downloadProgress)
          }
          
          if (model.status === 'loaded') {
            onProgress(100)
            return
          }
          
          if (model.status === 'unloaded') {
            onProgress(0)
            return
          }
        }
        
        // Continue monitoring
        setTimeout(checkProgress, 1000)
      } catch (error) {
        console.error('Failed to monitor progress:', error)
      }
    }

    checkProgress()
  }

  // Get system information
  static async getSystemInfo(endpoint: string): Promise<LMStudioInfo['systemInfo'] | null> {
    try {
      const info = await LMStudioDetector.getInfo(endpoint)
      return info?.systemInfo || null
    } catch (error) {
      console.error('Failed to get system info:', error)
      return null
    }
  }

  // Format file size
  private static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}

// Hook for React components
export function useLMStudioDetector() {
  const [detectionResult, setDetectionResult] = useState<DetectionResult>({
    found: false,
    endpoints: []
  })
  const [isDetecting, setIsDetecting] = useState(false)
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0)

  const detect = useCallback(async () => {
    setIsDetecting(true)
    try {
      const result = await LMStudioDetector.detect()
      setDetectionResult(result)
      setLastDetectionTime(Date.now())
    } catch (error) {
      setDetectionResult({
        found: false,
        endpoints: [],
        error: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsDetecting(false)
    }
  }, [])

  const testConnection = useCallback(async (endpoint: string): Promise<boolean> => {
    return LMStudioDetector.testConnection(endpoint)
  }, [])

  const loadModel = useCallback(async (endpoint: string, modelId: string): Promise<boolean> => {
    return LMStudioDetector.loadModel(endpoint, modelId)
  }, [])

  const unloadModel = useCallback(async (endpoint: string, modelId: string): Promise<boolean> => {
    return LMStudioDetector.unloadModel(endpoint, modelId)
  }, [])

  const getModels = useCallback(async (endpoint: string): Promise<LMStudioModel[]> => {
    return LMStudioDetector.getModels(endpoint)
  }, [])

  const convertToProfiles = useCallback(async (endpoint: string): Promise<ModelProfile[]> => {
    return LMStudioDetector.convertToProfiles(endpoint)
  }, [])

  // Auto-detect on mount and periodically
  useEffect(() => {
    detect()
    
    const interval = setInterval(() => {
      detect()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [detect])

  return {
    detectionResult,
    isDetecting,
    lastDetectionTime,
    detect,
    testConnection,
    loadModel,
    unloadModel,
    getModels,
    convertToProfiles
  }
}
