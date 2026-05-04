export type ComparisonUiLabels = {
  leftSideTitle: string;
  rightSideTitle: string;
  directionTitle: string;
  leftColumnTitle: string;
  rightColumnTitle: string;
  leftContext: string;
  rightContext: string;
};

type BuildComparisonUiLabelsInput = {
  leftDocumentContext?: string;
  rightDocumentContext?: string;
};

const sanitizeLabel = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

export const buildComparisonUiLabels = (
  input: BuildComparisonUiLabelsInput = {}
): ComparisonUiLabels => {
  const leftContext = sanitizeLabel(input.leftDocumentContext, 'Vergleichsbasis');
  const rightContext = sanitizeLabel(input.rightDocumentContext, 'Aktuelles Dokument');

  return {
    leftSideTitle: 'Links · Quelle',
    rightSideTitle: 'Rechts · Ziel',
    directionTitle: 'Quelle → Ziel',
    leftColumnTitle: 'Links · Quelle (Original)',
    rightColumnTitle: 'Rechts · Ziel (Aktuell)',
    leftContext,
    rightContext,
  };
};
