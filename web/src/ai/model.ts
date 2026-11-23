import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, type GenerativeModel, type ObjectSchema } from 'firebase/ai'
import { firebaseApp } from '../firebase'
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
  if (passport.settings.cloudHelp && navigator.onLine && firebaseApp) return 'cloud'
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
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 },
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

export async function generateJson<T>(
  route: Route,
  schema: ObjectSchema,
  key: string,
  prompt: string,
): Promise<{ data: T; source: AnswerSource }> {
  const result = await getModel(route, schema, key).generateContent(prompt)
  const text = result.response.text()
  return {
    data: JSON.parse(text) as T,
    source: result.response.inferenceSource ?? (route === 'device' ? 'on_device' : 'in_cloud'),
  }
}
