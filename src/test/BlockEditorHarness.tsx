import { useState } from 'react';
import { ZenBlockEditor } from '../kits/PatternKit/ZenBlockEditor';

const INITIAL_CONTENT = [
  'Erste Zeile im ersten Absatz.',
  '',
  'Zweite Zeile bleibt unverändert.',
].join('\n');

export const BlockEditorHarness = () => {
  const [content, setContent] = useState(INITIAL_CONTENT);

  return (
    <div
      data-testid="block-editor-harness"
      style={{
        minHeight: '100vh',
        background: '#1a1a1a',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <ZenBlockEditor
          value={content}
          onChange={setContent}
          height="620px"
          theme="light"
          wrapLines={true}
          showLineNumbers={true}
        />
      </div>
    </div>
  );
};
