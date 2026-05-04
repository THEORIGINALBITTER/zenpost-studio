import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import type { LineDiffRow } from '../services/documentComparisonService';
import type { ComparisonUiLabels } from '../services/documentComparisonUiService';

type ComparisonPanelVariant = 'dark' | 'paper';

interface DocumentComparisonPanelProps {
  rows: LineDiffRow[];
  labels: ComparisonUiLabels;
  maxHeight?: string;
  variant?: ComparisonPanelVariant;
}

type ComparisonPalette = {
  sideChipBorder: string;
  sideChipBackground: string;
  sideChipLeftText: string;
  sideChipRightText: string;
  sideChipContextText: string;
  middleChipText: string;
  leftCardBorder: string;
  rightCardBorder: string;
  leftHeaderBg: string;
  rightHeaderBg: string;
};

const PALETTES: Record<ComparisonPanelVariant, ComparisonPalette> = {
  dark: {
    sideChipBorder: '0.5px solid #5a5a5a',
    sideChipBackground: '#171717',
    sideChipLeftText: '#f4c56f',
    sideChipRightText: '#70d884',
    sideChipContextText: '#d0cbb8',
    middleChipText: '#d0cbb8',
    leftCardBorder: '0.5px solid #3a3a3a',
    rightCardBorder: '0.5px solid rgba(30, 24, 16, 0.82)',
    leftHeaderBg: '#202020',
    rightHeaderBg: '#1f2c1f',
  },
  paper: {
    sideChipBorder: '0.5px solid #b2ad9d',
    sideChipBackground: '#d8d3c1',
    sideChipLeftText: '#7a622f',
    sideChipRightText: '#2f8855',
    sideChipContextText: '#1a1a1a',
    middleChipText: '#1a1a1a',
    leftCardBorder: '0.5px solid #3a3a3a',
    rightCardBorder: '0.5px solid rgba(30, 24, 16, 0.82)',
    leftHeaderBg: '#202020',
    rightHeaderBg: '#1f2c1f',
  },
};

export const DocumentComparisonPanel = ({
  rows,
  labels,
  maxHeight = '240px',
  variant = 'dark',
}: DocumentComparisonPanelProps) => {
  const palette = PALETTES[variant];

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            border: palette.sideChipBorder,
            borderRadius: '6px',
            backgroundColor: palette.sideChipBackground,
            padding: '6px 8px',
          }}
        >
          <span className="font-mono text-[10px]" style={{ color: palette.sideChipLeftText }}>{labels.leftSideTitle}</span>
          <span
            className="font-mono text-[10px]"
            style={{ color: palette.sideChipContextText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={labels.leftContext}
          >
            {labels.leftContext}
          </span>
        </div>
        <div
          style={{
            border: palette.sideChipBorder,
            borderRadius: '6px',
            backgroundColor: palette.sideChipBackground,
            padding: '6px 8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            justifyContent: 'center',
          }}
        >
          <FontAwesomeIcon icon={faArrowRight} style={{ color: '#42b850', fontSize: '10px' }} />
          <span className="font-mono text-[10px]" style={{ color: palette.middleChipText }}>{labels.directionTitle}</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            border: palette.sideChipBorder,
            borderRadius: '6px',
            backgroundColor: palette.sideChipBackground,
            padding: '6px 8px',
          }}
        >
          <span className="font-mono text-[10px]" style={{ color: palette.sideChipRightText }}>{labels.rightSideTitle}</span>
          <span
            className="font-mono text-[10px]"
            style={{ color: palette.sideChipContextText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={labels.rightContext}
          >
            {labels.rightContext}
          </span>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          maxHeight,
          overflow: 'auto',
        }}
      >
        <div style={{ border: palette.leftCardBorder, borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              padding: '5px 8px',
              borderBottom: '0.5px solid #3a3a3a',
              backgroundColor: palette.leftHeaderBg,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#f4c56f',
            }}
          >
            {labels.leftColumnTitle}
          </div>
          {rows.map((row, index) => (
            <div
              key={`left-${index}`}
              style={{
                padding: '3px 8px',
                minHeight: '18px',
                borderBottom: '0.5px solid #202020',
                backgroundColor:
                  row.status === 'removed'
                    ? 'rgba(239,68,68, 0.9)'
                    : row.status === 'modified'
                      ? 'rgba(245, 158, 11,1 )'
                      : '#171717',
                color: '#1a1a1a',
                fontFamily: 'monospace',
                fontSize: '10px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {row.left || ' '}
            </div>
          ))}
        </div>
        <div style={{ border: palette.rightCardBorder, borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 2,
              padding: '5px 8px',
              borderBottom: '0.5px solid #3a3a3a',
              backgroundColor: palette.rightHeaderBg,
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              color: '#70d884',
            }}
          >
            {labels.rightColumnTitle}
          </div>
          {rows.map((row, index) => (
            <div
              key={`right-${index}`}
              style={{
                padding: '3px 8px',
                minHeight: '18px',
                borderBottom: '0.5px solid #202020',
                backgroundColor:
                  row.status === 'added'
                    ? 'rgba(34,197,94,0.5)'
                    : row.status === 'modified'
                      ? 'rgba(245, 158, 11, 0.9)'
                      : '#d0cbb89a',
                color:
                  row.status === 'added'
                    ? '#fff'
                    : '#1a1a1a',
                fontFamily: 'monospace',
                fontSize: '10px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {row.right || ' '}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
