import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, ThinkingLevel, type GenerativeModel, type ObjectSchema } from 'firebase/ai'
import { cloudAvailable, firebaseApp } from '../firebase'
import type { AnswerSource, Passport } from '../data/types'

/**
 * Hybrid inference through Firebase AI Logic (SRS section 6).
 * KnowMe decides the route itself so private details never reach the cloud by accident:
 *   device -> ONLY_ON_DEVICE (Gemini Nano in Chrome)
 *   cloud  -> ONLY_IN_CLOUD, used only when the owner turned on cloud help, with redacted input
 * If neither is possible, callers fall back to offline search (no AI).
 */
export type Route = 'device' | 'cloud'

export type DeviceStatus = 'checking' | 'available' | 'downloadable' | 'downloading' | 'unavailable'

const CLOUD_MODEL = 'gemini-3.5-flash-lite'

interface LanguageModelApi {
  availability: () => Promise<string>
}

/** Asks Chrome whether Gemini Nano can run here (FR-03). */
export async function deviceStatus(): Promise<DeviceStatus> {
  const lm = (globalThis as { LanguageModel?: LanguageModelApi }).LanguageModel
  if (!lm?.availability) return 'unavailable'
  try {
    const status = await lm.availability()
    return (['available', 'downloadable', 'downloading'].includes(status) ? status : 'unavailable') as DeviceStatus
  } catch {
    return 'unavailable'
  }
}

/** The route for an AI job right now, or null when only offline search is possible. */
export function chooseRoute(passport: Passport, status: DeviceStatus): Route | null {
  if (status === 'available') return 'device'
  if (passport.settings.cloudHelp && navigator.onLine && cloudAvailable) return 'cloud'
  return null
}

const models = new Map<string, GenerativeModel>()

function getModel(route: Route, schema: ObjectSchema, key: string): GenerativeModel {
  if (!firebaseApp) throw new Error('Firebase is not configured. Fill in web/.env.local.')
  const cacheKey = `${route}:${key}`
  let model = models.get(cacheKey)
  if (!model) {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })
    model = getGenerativeModel(ai, {
      mode: route === 'device' ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_MODEL,
        // No responseSchema in the cloud: constrained decoding took 10 to 26 s per answer on
        // gemini-3.5-flash-lite versus about 1.5 s without it. The prompt states the JSON shape
        // instead, and the reply is parsed leniently and checked by the same guardrails.
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      },
      onDeviceParams: { promptOptions: { responseConstraint: schema } },
    })
    models.set(cacheKey, model)
  }
  return model
}

/**
 * Starts the Gemini Nano download if needed. Chrome only allows this from a user
 * gesture, so call it inside a click handler.
 */
export function downloadDeviceModel(schema: ObjectSchema, onProgress?: (fraction: number) => void): Promise<void> {
  return getModel('device', schema, 'warmup').initializeDeviceModel(onProgress)
}

/** The JSON object inside a reply, even if the model wrapped it in a code fence or a sentence. */
function jsonPart(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text
}

/**
 * Runs one AI job. `shape` describes the JSON reply for the cloud model; Gemini Nano gets
 * the full schema as a response constraint instead.
 */
export async function generateJson<T>(
  route: Route,
  schema: ObjectSchema,
  key: string,
  prompt: string,
  shape: string,
): Promise<{ data: T; source: AnswerSource }> {
  // Never leave a carer waiting: past the limit the screen keeps the passport entries (NF-13).
  const limitMs = route === 'cloud' ? 30_000 : 120_000
  const fullPrompt = route === 'cloud' ? `${prompt}\n\nReply with JSON only, in this shape: ${shape}` : prompt
  let timer: number | undefined
  const result = await Promise.race([
    getModel(route, schema, key).generateContent(fullPrompt),
    new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error('The AI took too long to answer.')), limitMs)
    }),
  ]).finally(() => window.clearTimeout(timer))
  const text = result.response.text()
  return {
    data: JSON.parse(jsonPart(text)) as T,
    source: result.response.inferenceSource ?? (route === 'device' ? 'on_device' : 'in_cloud'),
  }
}
