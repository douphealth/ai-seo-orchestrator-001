
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { AiConfig } from '../types';

interface ValidationResult {
    success: boolean;
    message?: string;
}

const getErrorMessage = (error: any): string => {
    const status = error?.status || error?.response?.status;
    const message = error?.message || error?.error?.message;
    const lowerMessage = message?.toLowerCase() || '';

    if (status === 401) return "Authentication failed. The API key is incorrect, expired, or not authorized for the requested model.";
    if (status === 403) return "Permission denied. Please check your project/organization permissions.";
    if (status === 429) return "Rate limit exceeded. Please wait a moment or check your plan.";
    
    if (lowerMessage.includes('insufficient_quota') || lowerMessage.includes('quota')) return "Your account has insufficient quota. Please check your billing.";
    if (lowerMessage.includes('model_not_found')) return `The specified model was not found. Please check the model name.`;
    if (lowerMessage.includes('api key not valid')) return 'The provided API Key is not valid. Please check and try again.';

    if (error instanceof Error && error.name === 'AbortError') return "Request timed out. Please check your network connection.";
    
    if (message) return message.split('\n')[0];

    return 'An unknown validation error occurred.';
}

export const validateApiKey = async (config: AiConfig): Promise<ValidationResult> => {
    const { provider, apiKey, model } = config;
    if (!apiKey) {
        return { success: false, message: 'API Key cannot be empty.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
        switch(provider) {
            case 'gemini': {
                const ai = new GoogleGenAI({ apiKey });
                // Use generateContent for a more robust check that verifies content generation permissions
                await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: 'test',
                    config: { maxOutputTokens: 1 }, // Minimize cost and time
                });
                return { success: true };
            }
            case 'openai': {
                const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
                await client.models.list({ signal: controller.signal });
                return { success: true };
            }
            case 'anthropic': {
                const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
                await client.messages.create({
                    model: 'claude-sonnet-4-20250514',
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                }, { signal: controller.signal });
                return { success: true };
            }
            case 'openrouter': {
                const client = new OpenAI({
                    apiKey,
                    dangerouslyAllowBrowser: true,
                    baseURL: 'https://openrouter.ai/api/v1',
                    defaultHeaders: {
                        'HTTP-Referer': 'https://orchestrator.ai',
                        'X-Title': 'Orchestrator AI',
                    },
                });
                const validationModel = model || 'mistralai/mistral-7b-instruct';
                await client.chat.completions.create({
                    model: validationModel,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 1
                }, { signal: controller.signal });
                return { success: true };
            }
            default:
                return { success: false, message: 'Unsupported AI provider.' };
        }
    } catch(e) {
        return { success: false, message: getErrorMessage(e) };
    } finally {
        clearTimeout(timeoutId);
    }
};