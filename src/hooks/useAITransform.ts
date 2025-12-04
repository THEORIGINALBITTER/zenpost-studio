import { useState } from 'react';
import { transformContent, type TransformConfig } from '../services/aiService';
import { loadAIConfig, type AIConfig } from '../services/aiService';

export function useAITransform() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function transform(
    content: string,
    transformConfig: TransformConfig,
    customConfig?: Partial<AIConfig>
  ) {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const aiConfig = { ...loadAIConfig(), ...customConfig };
      const res = await transformContent(content, transformConfig, aiConfig);
      if (res.success) {
        setResult(res.data || '');
      } else {
        setError(res.error || 'Unbekannter Fehler');
      }
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  return { transform, result, loading, error };
}
