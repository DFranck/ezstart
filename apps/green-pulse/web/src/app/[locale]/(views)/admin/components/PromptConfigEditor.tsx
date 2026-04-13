'use client'

import React, { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H4,
  Icon,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@ezstart/ui/components'

export type PromptConfig = {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  rules?: string[]
  constraints?: {
    maxResponseLength?: number
    allowedTopics?: string[]
    forbiddenTopics?: string[]
    requiredFormat?: string
  }
  safety?: {
    blockThreshold?: 'none' | 'low' | 'medium' | 'high'
    filterLevel?: number
  }
}

interface PromptConfigEditorProps {
  config: PromptConfig
  onChange: (config: PromptConfig) => void
}

export function PromptConfigEditor({ config, onChange }: PromptConfigEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [newAllowedTopic, setNewAllowedTopic] = useState('')
  const [newForbiddenTopic, setNewForbiddenTopic] = useState('')

  const updateConfig = (updates: Partial<PromptConfig>) => {
    onChange({ ...config, ...updates })
  }

  const updateConstraints = (updates: Partial<PromptConfig['constraints']>) => {
    onChange({
      ...config,
      constraints: { ...config.constraints, ...updates },
    })
  }

  const updateSafety = (updates: Partial<PromptConfig['safety']>) => {
    onChange({
      ...config,
      safety: { ...config.safety, ...updates },
    })
  }

  const addRule = () => {
    if (!newRule.trim()) return
    updateConfig({ rules: [...(config.rules || []), newRule.trim()] })
    setNewRule('')
  }

  const removeRule = (index: number) => {
    updateConfig({ rules: config.rules?.filter((_, i) => i !== index) })
  }

  const addTopic = (type: 'allowed' | 'forbidden') => {
    const value = type === 'allowed' ? newAllowedTopic : newForbiddenTopic
    if (!value.trim()) return

    if (type === 'allowed') {
      updateConstraints({
        allowedTopics: [...(config.constraints?.allowedTopics || []), value.trim()],
      })
      setNewAllowedTopic('')
    } else {
      updateConstraints({
        forbiddenTopics: [...(config.constraints?.forbiddenTopics || []), value.trim()],
      })
      setNewForbiddenTopic('')
    }
  }

  const removeTopic = (type: 'allowed' | 'forbidden', index: number) => {
    if (type === 'allowed') {
      updateConstraints({
        allowedTopics: config.constraints?.allowedTopics?.filter((_, i) => i !== index),
      })
    } else {
      updateConstraints({
        forbiddenTopics: config.constraints?.forbiddenTopics?.filter((_, i) => i !== index),
      })
    }
  }

  return (
    <Div className="space-y-4">
      <Div className="flex items-center justify-between">
        <Div>
          <H4 className="text-sm font-semibold">Configuration</H4>
          <P className="text-xs text-muted-foreground">
            Parameters applied once (not repeated in context)
          </P>
        </Div>
        <Button size="sm" variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
          <Icon name={showAdvanced ? 'lucide:ChevronUp' : 'lucide:ChevronDown'} className="mr-1" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </Button>
      </Div>

      {/* Basic Parameters */}
      <Card variant="ghost" className="border">
        <CardHeader>
          <P className="text-sm font-semibold">Generation Parameters</P>
        </CardHeader>
        <CardContent className="space-y-3">
          <Div className="grid grid-cols-2 gap-4">
            <Div>
              <Label htmlFor="temperature" className="text-xs">
                Temperature (0-1)
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature ?? 0.7}
                onChange={e => updateConfig({ temperature: parseFloat(e.target.value) })}
                placeholder="0.7"
              />
              <P className="text-xs text-muted-foreground mt-1">
                Higher = more creative, Lower = more focused
              </P>
            </Div>
            <Div>
              <Label htmlFor="maxTokens" className="text-xs">
                Max Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                min="1"
                max="8000"
                value={config.maxTokens ?? 2000}
                onChange={e => updateConfig({ maxTokens: parseInt(e.target.value) })}
                placeholder="2000"
              />
              <P className="text-xs text-muted-foreground mt-1">Maximum response length</P>
            </Div>
          </Div>

          {showAdvanced && (
            <Div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <Div>
                <Label htmlFor="topP" className="text-xs">
                  Top P (0-1)
                </Label>
                <Input
                  id="topP"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.topP ?? 0.9}
                  onChange={e => updateConfig({ topP: parseFloat(e.target.value) })}
                  placeholder="0.9"
                />
              </Div>
              <Div>
                <Label htmlFor="topK" className="text-xs">
                  Top K (Gemini only)
                </Label>
                <Input
                  id="topK"
                  type="number"
                  min="1"
                  max="100"
                  value={config.topK ?? 40}
                  onChange={e => updateConfig({ topK: parseInt(e.target.value) })}
                  placeholder="40"
                />
              </Div>
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral Rules */}
      <Card variant="ghost" className="border">
        <CardHeader>
          <P className="text-sm font-semibold">Behavioral Rules</P>
          <P className="text-xs text-muted-foreground">
            Instructions applied without being in conversation context
          </P>
        </CardHeader>
        <CardContent className="space-y-3">
          <Div className="flex gap-2">
            <Input
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              placeholder="e.g., Always respond in user's language"
              onKeyDown={e => e.key === 'Enter' && addRule()}
            />
            <Button size="sm" onClick={addRule}>
              <Icon name="lucide:Plus" />
            </Button>
          </Div>
          <Div className="space-y-2">
            {config.rules?.map((rule, index) => (
              <Div
                key={index}
                className="flex items-center justify-between bg-muted/50 rounded p-2"
              >
                <P className="text-sm flex-1">{rule}</P>
                <Button size="sm" variant="ghost" onClick={() => removeRule(index)}>
                  <Icon name="lucide:X" size={14} />
                </Button>
              </Div>
            ))}
            {(!config.rules || config.rules.length === 0) && (
              <P className="text-xs text-muted-foreground text-center py-2">No rules defined</P>
            )}
          </Div>
        </CardContent>
      </Card>

      {showAdvanced && (
        <>
          {/* Constraints */}
          <Card variant="ghost" className="border">
            <CardHeader>
              <P className="text-sm font-semibold">Constraints</P>
            </CardHeader>
            <CardContent className="space-y-4">
              <Div>
                <Label htmlFor="maxResponseLength" className="text-xs">
                  Max Response Length (characters)
                </Label>
                <Input
                  id="maxResponseLength"
                  type="number"
                  min="1"
                  value={config.constraints?.maxResponseLength ?? ''}
                  onChange={e =>
                    updateConstraints({
                      maxResponseLength: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  placeholder="500"
                />
              </Div>

              <Div>
                <Label className="text-xs">Allowed Topics</Label>
                <Div className="flex gap-2 mb-2">
                  <Input
                    value={newAllowedTopic}
                    onChange={e => setNewAllowedTopic(e.target.value)}
                    placeholder="e.g., ESG, finance"
                    onKeyDown={e => e.key === 'Enter' && addTopic('allowed')}
                  />
                  <Button size="sm" onClick={() => addTopic('allowed')}>
                    <Icon name="lucide:Plus" />
                  </Button>
                </Div>
                <Div className="flex flex-wrap gap-1">
                  {config.constraints?.allowedTopics?.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {topic}
                      <Icon
                        name="lucide:X"
                        size={12}
                        className="cursor-pointer"
                        onClick={() => removeTopic('allowed', index)}
                      />
                    </Badge>
                  ))}
                </Div>
              </Div>

              <Div>
                <Label className="text-xs">Forbidden Topics</Label>
                <Div className="flex gap-2 mb-2">
                  <Input
                    value={newForbiddenTopic}
                    onChange={e => setNewForbiddenTopic(e.target.value)}
                    placeholder="e.g., politics, religion"
                    onKeyDown={e => e.key === 'Enter' && addTopic('forbidden')}
                  />
                  <Button size="sm" onClick={() => addTopic('forbidden')}>
                    <Icon name="lucide:Plus" />
                  </Button>
                </Div>
                <Div className="flex flex-wrap gap-1">
                  {config.constraints?.forbiddenTopics?.map((topic, index) => (
                    <Badge key={index} variant="destructive" className="gap-1">
                      {topic}
                      <Icon
                        name="lucide:X"
                        size={12}
                        className="cursor-pointer"
                        onClick={() => removeTopic('forbidden', index)}
                      />
                    </Badge>
                  ))}
                </Div>
              </Div>

              <Div>
                <Label htmlFor="requiredFormat" className="text-xs">
                  Required Format
                </Label>
                <Select
                  value={config.constraints?.requiredFormat ?? 'none'}
                  onValueChange={value =>
                    updateConstraints({
                      requiredFormat: value === 'none' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No requirement</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="Markdown">Markdown</SelectItem>
                    <SelectItem value="Plain text">Plain text</SelectItem>
                    <SelectItem value="HTML">HTML</SelectItem>
                  </SelectContent>
                </Select>
              </Div>
            </CardContent>
          </Card>

          {/* Safety Settings */}
          <Card variant="ghost" className="border">
            <CardHeader>
              <P className="text-sm font-semibold">Safety & Moderation</P>
            </CardHeader>
            <CardContent className="space-y-3">
              <Div>
                <Label htmlFor="blockThreshold" className="text-xs">
                  Block Threshold (Gemini)
                </Label>
                <Select
                  value={config.safety?.blockThreshold ?? 'none'}
                  onValueChange={(value: 'none' | 'low' | 'medium' | 'high') =>
                    updateSafety({ blockThreshold: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </Div>

              <Div>
                <Label htmlFor="filterLevel" className="text-xs">
                  Filter Level (0-10)
                </Label>
                <Input
                  id="filterLevel"
                  type="number"
                  min="0"
                  max="10"
                  value={config.safety?.filterLevel ?? 5}
                  onChange={e => updateSafety({ filterLevel: parseInt(e.target.value) })}
                  placeholder="5"
                />
              </Div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Raw JSON View */}
      <Div className="pt-2">
        <P className="text-xs text-muted-foreground mb-2">Raw JSON (read-only)</P>
        <Textarea
          value={JSON.stringify(config, null, 2)}
          readOnly
          className="font-mono text-xs bg-muted/30"
          rows={6}
        />
      </Div>
    </Div>
  )
}
