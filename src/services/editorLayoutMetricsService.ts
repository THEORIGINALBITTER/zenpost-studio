export interface EditorLineMetrics {
  fontSize: number;
  lineHeight: number;
  paddingTop: number;
}

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_LINE_HEIGHT_RATIO = 1.6;
const DEFAULT_PADDING_TOP = 12;

export const getEditorLineMetrics = (
  fontSize?: number,
  paddingTop?: number,
  lineHeightRatio: number = DEFAULT_LINE_HEIGHT_RATIO,
): EditorLineMetrics => {
  const normalizedFontSize =
    typeof fontSize === 'number' && Number.isFinite(fontSize) && fontSize > 0
      ? fontSize
      : DEFAULT_FONT_SIZE;

  const normalizedPaddingTop =
    typeof paddingTop === 'number' && Number.isFinite(paddingTop) && paddingTop >= 0
      ? paddingTop
      : DEFAULT_PADDING_TOP;

  return {
    fontSize: normalizedFontSize,
    lineHeight: normalizedFontSize * lineHeightRatio,
    paddingTop: normalizedPaddingTop,
  };
};

