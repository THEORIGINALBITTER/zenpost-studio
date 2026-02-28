import { useState, useEffect } from 'react';
import { readDir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faBook, faPencil, faFileLines, faRotateLeft, faLightbulb, faSave, faUser, faPlug, faHandshake, faDatabase, faCalendarDays, faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faLinkedin, faReddit, faGithub, faDev, faMedium, faHashnode, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { ZenSettingsModal, ZenFooterText, ZenMetadataModal, ProjectMetadata, ZenGeneratingModal, ZenRoughButton, ZenSaveConfirmationModal, ZenSaveSuccessModal, ZenPublishScheduler, ZenContentCalendar, ZenTodoChecklist, ZenDropdown, extractMetadataFromContent, ZenModal, ZenModalHeader, ZenModalFooter, getModalPreset } from '../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';
import { ZenMarkdownPreview } from '../kits/PatternKit/ZenMarkdownPreview';
import { generateFromPrompt, translateContent, type TargetLanguage } from '../services/aiService';
import { defaultEditorSettings, loadEditorSettings, type EditorSettings } from '../services/editorSettingsService';
import { autoSavePostsAndSchedule, loadSchedule, initializePublishingProject, getPublishingPaths, type PlatformScheduleState } from '../services/publishingService';
import { scanProject, loadProjectContext, type ScanSummary, type ScanArtifacts, generateProjectAnalysisMarkdown } from '../services/projectScanService';
import type { ScheduledPost, SocialPlatform } from '../types/scheduling';
import { downloadICSFile, getScheduleStats } from '../utils/calendarExport';
import { ProjectPickerModal } from '../components/DocStudio/ProjectPickerModal';

interface DocStudioState {
  projectPath: string | null;
  projectInfo: ProjectInfo | null;
  selectedTemplate: DocTemplate | null;
  generatedContent: string;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic';
  length: 'short' | 'medium' | 'long';
  audience: 'beginner' | 'intermediate' | 'expert';
  targetLanguage: TargetLanguage;
  metadata: ProjectMetadata;
}

interface DocStudioScreenProps {
  onBack: () => void; // Called when going back to welcome screen
  onTransferToContentStudio?: (content: string, currentStep: number, state: DocStudioState) => void;
  onStepChange?: (step: number) => void;
  initialStep?: number;
  savedState?: DocStudioState | null;
  onStateChange?: (state: DocStudioState) => void;
  onGeneratedContentChange?: (content: string) => void;
  // Publishing Props (geteilt mit App1.tsx)
  scheduledPosts?: ScheduledPost[];
  onScheduledPostsChange?: (posts: ScheduledPost[]) => void;
  onShowScheduler?: () => void;
  onShowCalendar?: () => void;
  onShowChecklist?: () => void;
  onSetSchedulerPlatformPosts?: (posts: Array<{ platform: string; content: string }>) => void;
  onSetSelectedDateFromCalendar?: (date: Date | undefined) => void;
}

type DocTemplate = 'readme' | 'changelog' | 'api-docs' | 'contributing' | 'data-room';

interface PlatformPost {
  platform: SocialPlatform;
  title: string;
  content: string;
  characterCount: number;
  wordCount: number;
}

interface ProjectInfo {
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  fileTypes: string[];
  hasTests: boolean;
  hasApi: boolean;
}

export function DocStudioScreen({
  onBack,
  onTransferToContentStudio: _onTransferToContentStudio,
  onStepChange,
  initialStep = 0,
  savedState,
  onStateChange: _onStateChange,
  scheduledPosts: externalScheduledPosts,
  onScheduledPostsChange,
  onShowScheduler,
  onShowCalendar,
  onShowChecklist,
  onSetSchedulerPlatformPosts,
  onSetSelectedDateFromCalendar,
  onGeneratedContentChange,
}: DocStudioScreenProps) {
  const isWebRuntime = typeof window !== 'undefined' && !(window as any).__TAURI__;
  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // Update currentStep when initialStep changes (e.g., when returning from Content AI Studio)
  useEffect(() => {
    if (initialStep !== currentStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  // Notify parent about step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  // Project state - Load from localStorage if available
  const [projectPath, setProjectPath] = useState<string | null>(() => {
    if (savedState?.projectPath) return savedState.projectPath;
    const stored = localStorage.getItem('zenpost_last_project_path');
    return stored || null;
  });
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(savedState?.projectInfo || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [scanArtifacts, setScanArtifacts] = useState<ScanArtifacts | null>(null);
  const [includeAnalysisInDataRoom, setIncludeAnalysisInDataRoom] = useState(true);
  const [showScanReportModal, setShowScanReportModal] = useState(false);
  const [projectContextPath, setProjectContextPath] = useState<string | null>(null);
  const [projectContextLoaded, setProjectContextLoaded] = useState(false);
  const [projectContextData, setProjectContextData] = useState<Record<string, unknown> | null>(null);
  const [showProjectPickerModal, setShowProjectPickerModal] = useState(false);

  // Save project path to localStorage whenever it changes
  useEffect(() => {
    if (projectPath) {
      localStorage.setItem('zenpost_last_project_path', projectPath);
    }
  }, [projectPath]);

  // Load project context when projectPath changes
  useEffect(() => {
    if (!projectPath) {
      setProjectContextPath(null);
      setProjectContextLoaded(false);
      setProjectContextData(null);
      setScanSummary(null);
      setScanArtifacts(null);
      return;
    }

    setScanSummary(null);
    setScanArtifacts(null);

    let active = true;
    loadProjectContext(projectPath)
      .then((result) => {
        if (!active) return;
        setProjectContextPath(result.contextPath);
        setProjectContextLoaded(result.exists);
        setProjectContextData(result.data);
      })
      .catch(() => {
        if (!active) return;
        setProjectContextPath(`${projectPath}/zenstudio/context/project.context.json`);
        setProjectContextLoaded(false);
        setProjectContextData(null);
      });

    return () => {
      active = false;
    };
  }, [projectPath]);

  useEffect(() => {
    if (!projectPath) {
      return;
    }

    let cancelled = false;

    const initializePublishing = async () => {
      try {
        await initializePublishingProject(projectPath);
        const project = await loadSchedule(projectPath);
        if (!cancelled) {
          setScheduledPosts(project.posts);
        }
      } catch (error) {
        console.error('[DocStudio] Failed to initialize publishing workspace:', error);
      }
    };

    initializePublishing();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    if (!projectPath) return;
    let isMounted = true;
    loadEditorSettings(projectPath)
      .then((loaded) => {
        if (isMounted) {
          setEditorSettings(loaded);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEditorSettings({ ...defaultEditorSettings });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [projectPath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditorSettings>).detail;
      if (detail) {
        setEditorSettings(detail);
      }
    };
    window.addEventListener('zen-editor-settings-updated', handler);
    return () => window.removeEventListener('zen-editor-settings-updated', handler);
  }, []);

  // Template & Generation state
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(savedState?.selectedTemplate || null);
  const [selectedTemplates, setSelectedTemplates] = useState<DocTemplate[]>([]);
  const [generatedContent, setGeneratedContent] = useState<string>(savedState?.generatedContent || '');
  const [_forceEditorStep, setForceEditorStep] = useState(false);
  const [showDocEditModal, setShowDocEditModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKIOptions, setShowKIOptions] = useState(true);

  // Style options (like in Content Transform)
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'enthusiastic'>(savedState?.tone || 'professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>(savedState?.length || 'medium');
  const [audience, setAudience] = useState<'beginner' | 'intermediate' | 'expert'>(savedState?.audience || 'intermediate');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage>(savedState?.targetLanguage || 'deutsch');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    ...defaultEditorSettings,
  });

  // Metadata
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ProjectMetadata>(savedState?.metadata || {
    authorName: '',
    authorEmail: '',
    companyName: '',
    license: 'MIT',
    year: new Date().getFullYear().toString(),
    website: '',
    repository: '',
    contributingUrl: '',
  });

  // Save Confirmation
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string>('');

  // Save Success Modal
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedFilePaths, setSavedFilePaths] = useState<string[]>([]);
  const [showCalendarButtonInSuccessModal, setShowCalendarButtonInSuccessModal] = useState(false);

  useEffect(() => {
    onGeneratedContentChange?.(generatedContent);
  }, [generatedContent, onGeneratedContentChange]);

  // Multi-Platform Blog Posts (kept for potential future use)
  const [_selectedPlatforms, _setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);

  // Project folder change confirmation
  const [showProjectChangeConfirmation, setShowProjectChangeConfirmation] = useState(false);

  // Step 5: Publishing Management - use external state from App1.tsx if available
  const [localScheduledPosts, setLocalScheduledPosts] = useState<ScheduledPost[]>([]);
  const [localShowScheduler, setLocalShowScheduler] = useState(false);
  const [localShowCalendar, setLocalShowCalendar] = useState(false);
  const [localShowChecklist, setLocalShowChecklist] = useState(false);
  const [localSelectedDateFromCalendar, setLocalSelectedDateFromCalendar] = useState<Date | undefined>(undefined);

  // Use external state if provided, otherwise fall back to local state
  const scheduledPosts = externalScheduledPosts ?? localScheduledPosts;
  const setScheduledPosts = onScheduledPostsChange ?? setLocalScheduledPosts;
  const showScheduler = onShowScheduler ? false : localShowScheduler; // External modals are in App1
  const showCalendar = onShowCalendar ? false : localShowCalendar;
  const showChecklist = onShowChecklist ? false : localShowChecklist;
  const selectedDateFromCalendar = localSelectedDateFromCalendar;
  const setSelectedDateFromCalendar = onSetSelectedDateFromCalendar ?? setLocalSelectedDateFromCalendar;

  // Wrapper functions for opening modals - send platformPosts to App1 when using external modals
  const openScheduler = () => {
    if (onShowScheduler && onSetSchedulerPlatformPosts) {
      onSetSchedulerPlatformPosts(platformPosts.map(p => ({ platform: p.platform, content: p.content })));
      onShowScheduler();
    } else {
      setLocalShowScheduler(true);
    }
  };
  const closeScheduler = () => setLocalShowScheduler(false);
  const openCalendar = onShowCalendar ?? (() => setLocalShowCalendar(true));
  const closeCalendar = () => setLocalShowCalendar(false);
  const openChecklist = onShowChecklist ?? (() => setLocalShowChecklist(true));

  // Step 4: Editing Posts
  const [editingPost, setEditingPost] = useState<SocialPlatform | null>(null);

  // Check if metadata is filled
  const isMetadataFilled = () => {
    return metadata.authorName.trim() !== '' ||
           metadata.authorEmail.trim() !== '' ||
           metadata.companyName.trim() !== '' ||
           metadata.website.trim() !== '' ||
           metadata.repository.trim() !== '';
  };

  const templates = [
    {
      id: 'readme' as DocTemplate,
      icon: faFileLines,
      title: 'README.md',
      description: 'Complete project documentation with installation, usage, and examples',
    },
    {
      id: 'changelog' as DocTemplate,
      icon: faBook,
      title: 'CHANGELOG.md',
      description: 'Version history and release notes',
    },
    {
      id: 'api-docs' as DocTemplate,
      icon: faPlug,
      title: 'API Documentation',
      description: 'Detailed API endpoints, parameters, and responses',
    },
    {
      id: 'contributing' as DocTemplate,
      icon: faHandshake,
      title: 'CONTRIBUTING.md',
      description: 'Guidelines for contributors',
    },
    {
      id: 'data-room' as DocTemplate,
      icon: faDatabase,
      title: 'Data Room',
      description: 'Investor-ready documentation suite for due diligence',
    },
  ];

  const selectProject = async () => {
    try {
      setShowProjectPickerModal(true);
    } catch (error) {
      console.error('Error selecting project:', error);
    }
  };

  const runProjectScan = async (path: string) => {
    if (isWebRuntime) {
      alert('Project scan is only available in the desktop app (Tauri).');
      return;
    }
    setIsAnalyzing(true);
    try {
      const entries = await readDir(path);

      for (const entry of entries) {
        const fileName = entry.name || '';
        if (fileName.toLowerCase() === 'readme.md' || fileName.toLowerCase() === 'readme.markdown') {
          try {
            const content = await readTextFile(`${path}/${fileName}`);
            const extractedMetadata = extractMetadataFromContent(content);
            if (Object.keys(extractedMetadata).length > 0) {
              const validMetadata = Object.fromEntries(
                Object.entries(extractedMetadata).filter(([_, value]) => value !== undefined && value !== '')
              ) as Record<string, string>;
              setMetadata(prev => ({
                ...prev,
                ...validMetadata,
              } as ProjectMetadata));
            }
          } catch (err) {
            console.error('Error reading README:', err);
          }
        }
      }

      const scanResult = await scanProject(path, includeAnalysisInDataRoom);
      setScanSummary(scanResult.summary);
      setScanArtifacts(scanResult);

      setProjectInfo({
        name: scanResult.summary.project.name,
        description: scanResult.summary.project.description,
        version: scanResult.summary.project.version,
        dependencies: scanResult.summary.dependencies.top,
        fileTypes: scanResult.summary.fileTypes,
        hasTests: scanResult.summary.structure.hasTests,
        hasApi: scanResult.summary.projectType.includes('php-api'),
      });
    } catch (error) {
      console.error('Error analyzing project:', error);
      alert('Could not analyze project structure');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateDocumentation = async (template: DocTemplate) => {
    if (!projectInfo) return;

    setSelectedTemplate(template);
    setForceEditorStep(false);
    setIsGenerating(true);

    try {
      // Create a prompt based on the template and project info
      let prompt = '';

      // Build metadata context - use actual values, not placeholders
      const metadataContext = `
IMPORTANT - USE THESE EXACT VALUES (DO NOT USE PLACEHOLDERS):
- Author Name: ${metadata.authorName || 'Project Author'}
- Email: ${metadata.authorEmail || 'author@example.com'}
${metadata.companyName ? `- Company: ${metadata.companyName}` : ''}
- License: ${metadata.license}
- Copyright Year: ${metadata.year}
${metadata.website ? `- Website: ${metadata.website}` : ''}
${metadata.repository ? `- Repository: ${metadata.repository}` : ''}
${metadata.contributingUrl ? `- Contributing Guide: ${metadata.contributingUrl}` : ''}

CRITICAL: Replace ALL placeholders in your output with these actual values above.
Do NOT output [Author Name], [your@email.com], [Insert X], or any other placeholders.
Use the real metadata values provided.
`;

      // Create style context based on selected options
      const toneMap = {
        professional: 'professional and formal',
        casual: 'casual and friendly',
        technical: 'technical and detailed',
        enthusiastic: 'enthusiastic and engaging',
      };

      const lengthMap = {
        short: 'concise (1-2 sections per topic)',
        medium: 'moderate (3-5 sections with examples)',
        long: 'comprehensive (detailed with multiple examples)',
      };

      const audienceMap = {
        beginner: 'beginners (explain technical terms)',
        intermediate: 'intermediate developers (assume basic knowledge)',
        expert: 'expert developers (use advanced terminology)',
      };

      const styleContext = `
STYLE PREFERENCES:
- Tone: ${toneMap[tone]}
- Length: ${lengthMap[length]}
- Target Audience: ${audienceMap[audience]}
`;

      switch (template) {
        case 'readme':
          prompt = `Create a README.md for the following project:
${styleContext}

Project Name: ${projectInfo.name}
Description: ${projectInfo.description}
Version: ${projectInfo.version}
File Types: ${projectInfo.fileTypes.join(', ')}
Has Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
Has API: ${projectInfo.hasApi ? 'Yes' : 'No'}
Dependencies: ${projectInfo.dependencies.slice(0, 10).join(', ')}

${metadataContext}

Include:
- Project title: "${projectInfo.name}"
- Description: "${projectInfo.description}"
- Installation instructions
- Usage examples
- Features list
- Technology stack
${projectInfo.hasApi ? '- API documentation section' : ''}
${projectInfo.hasTests ? '- Testing instructions' : ''}
- Contributing guidelines
- License section with copyright notice: "Copyright (c) ${metadata.year} ${metadata.authorName || 'Project Author'}"

${metadataContext}

Make it clear, professional, and ready to use on GitHub.
DO NOT use any placeholders - use the actual metadata values provided above.`;
          break;

        case 'changelog':
          prompt = `Create a CHANGELOG.md file for ${projectInfo.name} (version ${projectInfo.version}).
${styleContext}

Follow the "Keep a Changelog" format with:
- [Unreleased] section
- Version ${projectInfo.version} with today's date
- Categories: Added, Changed, Deprecated, Removed, Fixed, Security
- Clear, concise descriptions

Apply the tone: ${toneMap[tone]}`;
          break;

        case 'api-docs':
          prompt = `Create API documentation for ${projectInfo.name}.
${styleContext}

Include:
- API Overview
- Base URL and Authentication
- Common endpoints structure
- Request/Response examples
- Error handling
- Rate limiting information
- Code examples in multiple languages

Make it comprehensive and developer-friendly with ${toneMap[tone]} tone.`;
          break;

        case 'contributing':
          prompt = `Create a CONTRIBUTING.md guide for ${projectInfo.name}.
${styleContext}

Include:
- Welcome message
- Code of conduct reference
- How to set up development environment
- Coding standards and style guide
- Testing requirements
- Pull request process
- Issue reporting guidelines
- Community and support info

Use ${toneMap[tone]} tone throughout.`;
          break;

        case 'data-room':
          prompt = `Create a comprehensive Data Room INDEX.md for ${projectInfo.name}.
${styleContext}

${metadataContext}

A Data Room is an investor-ready documentation suite for due diligence. Create an INDEX.md that serves as the main navigation document.

Include sections:
1. Executive Summary (overview of the project/company)
2. Product Information (features, roadmap, tech stack)
3. Technology & Architecture (${projectInfo.fileTypes.slice(0, 10).join(', ')})
4. Financial Information (revenue model, projections)
5. Legal & Compliance (licenses, IP, terms)
6. Team & Organization (${metadata.companyName ? 'about ' + metadata.companyName : 'team structure'})
7. Market Analysis & Competition
8. Risk Assessment
9. Growth Strategy

For each section:
- Provide a brief description
- List what documents should be included
- Use ${toneMap[tone]} tone
- Target audience: ${audienceMap[audience]} (investors, due diligence teams)

Make it professional and investor-ready.`;
          break;
      }

      // Debug: Log AI config
      const aiConfig = localStorage.getItem('zenpost_ai_config');
      console.log('AI Config:', aiConfig);

      // Use the AI service to generate documentation from prompt
      const result = await generateFromPrompt(prompt);

      console.log('AI Result:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'No content generated');
      }

      // Post-processing: Replace all placeholders with actual metadata values
      let processedContent = result.data;

      // Replace common placeholder patterns
      const replacements: Record<string, string> = {
        // Author placeholders
        '\\[Author Name\\]': metadata.authorName || '',
        '\\[author name\\]': metadata.authorName || '',
        '\\[Your Name\\]': metadata.authorName || '',
        '\\[your name\\]': metadata.authorName || '',

        // Email placeholders
        '\\[your@email\\.com\\]': metadata.authorEmail || '',
        '\\[your-email\\]': metadata.authorEmail || '',
        '\\[Author Email\\]': metadata.authorEmail || '',
        '\\[author email\\]': metadata.authorEmail || '',

        // GitHub/Repository placeholders
        '\\[your-github-username\\]': metadata.repository ? metadata.repository.split('/').slice(-2)[0] : '',
        '\\[github-username\\]': metadata.repository ? metadata.repository.split('/').slice(-2)[0] : '',

        // Company placeholders
        '\\[Company Name\\]': metadata.companyName || '',
        '\\[company name\\]': metadata.companyName || '',

        // Year placeholders
        '\\[Year\\]': metadata.year || '',
        '\\[year\\]': metadata.year || '',
        '\\[YYYY\\]': metadata.year || '',

        // Generic placeholders
        '\\[Insert example code here\\]': '',
        '\\[Insert programming language here\\]': projectInfo.fileTypes[0] || 'JavaScript',
        '\\[Insert X\\]': '',
      };

      // Apply all replacements
      Object.entries(replacements).forEach(([pattern, replacement]) => {
        if (replacement) { // Only replace if we have a value
          const regex = new RegExp(pattern, 'g');
          processedContent = processedContent.replace(regex, replacement);
        }
      });

      // Translate if target language is not deutsch
      if (targetLanguage && targetLanguage !== 'deutsch') {
        const translateResult = await translateContent(processedContent, targetLanguage);
        if (translateResult.success && translateResult.data) {
          processedContent = translateResult.data;
        } else {
          console.warn('Translation failed:', translateResult.error);
          // Show warning but continue with untranslated content
          alert(`Warnung: Übersetzung fehlgeschlagen (${translateResult.error}). Dokumentation wird auf Deutsch angezeigt.`);
        }
      }

      setGeneratedContent(processedContent);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error generating documentation:', error);
      alert('Could not generate documentation. Please check your AI service configuration.');
    } finally {
      setIsGenerating(false);
    }
  };

  const startBlankDocument = (template: DocTemplate) => {
    setSelectedTemplate(template);
    setGeneratedContent('');
    setForceEditorStep(true);
    setCurrentStep(3);
  };

  const saveDocumentation = async () => {
    console.log('[Save] Starting save...');
    console.log('[Save] Project path:', projectPath);
    console.log('[Save] Selected template:', selectedTemplate);
    console.log('[Save] Generated content length:', generatedContent?.length);

    if (!projectPath || !selectedTemplate || !generatedContent) {
      console.error('[Save] Missing required data:', { projectPath, selectedTemplate, hasContent: !!generatedContent });
      alert('Fehlende Daten: Projekt, Template oder Inhalt fehlt');
      return;
    }

    try {
      let fileName: string;
      if (selectedTemplate === 'data-room') {
        fileName = 'data-room/INDEX.md';
      } else {
        fileName = `${selectedTemplate.toUpperCase()}.md`;
      }

      const filePath = `${projectPath}/${fileName}`;

      console.log('[Save] File name:', fileName);
      console.log('[Save] Full file path:', filePath);
      console.log('[Save] Writing file...');

      await writeTextFile(filePath, generatedContent);

      console.log('[Save] File saved successfully!');

      // Show success modal but stay in editor
      setSavedFileName(fileName);
      setSavedFilePaths([filePath]);
      setShowCalendarButtonInSuccessModal(false); // No calendar button for regular saves
      setShowSaveSuccess(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('zenpost-project-files-updated'));
      }
      // Don't change step - stay in editor
    } catch (error) {
      console.error('[Save] Error details:', error);
      console.error('[Save] Error type:', typeof error);
      console.error('[Save] Error message:', error instanceof Error ? error.message : JSON.stringify(error));
      alert(`Could not save documentation file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleNewDocument = () => {
    // Go back to step 2 to select a new template
    setCurrentStep(2);
    setSelectedTemplate(null);
    setGeneratedContent('');
    setForceEditorStep(false);
  };

  const handleBackToMenu = () => {
    setShowSaveConfirmation(false);
    // Reset all states
    setCurrentStep(0);
    setProjectPath(null);
    setProjectInfo(null);
    setScanSummary(null);
    setScanArtifacts(null);
    setSelectedTemplate(null);
    setGeneratedContent('');
    // Go back to Welcome Screen
    onBack();
  };

  const handleStartScan = async () => {
    if (!projectPath) return;
    setCurrentStep(1);
    await runProjectScan(projectPath);
  };

  // Step 0: Context
  const renderStep0 = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '672px' }}>
        {!projectPath ? (
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '2px solid #AC8E66',
              padding: '48px',
              textAlign: 'center',
            }}
          >


            <div style={{ marginBottom: '24px' }}>
              <FontAwesomeIcon
                icon={faFileLines}
                style={{
                  fontSize: '60px',
                  color: '#AC8E66',
             
                }}
              />
            </div>
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#e5e5e5',
                marginBottom: '16px',
              }}
            >
              Kein Projekt ausgewählt
            </h2>
            <p
              style={{
                color: '#999',
                marginBottom: '32px',
                maxWidth: '448px',
                marginLeft: 'auto',
                marginRight: 'auto',
                fontSize: '12px',
              }}
            >
              Wähle deinen Projekt-Order, um die Struktur zu analysieren und automatisch professionelle Dokumentation zu generieren.
            </p>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              fontStyle: '12px'  ,
              fontSize: '12px'
            }}
              >
              <ZenRoughButton
                label="Projekt-Order wählen"
              
                onClick={selectProject}
                variant="default"
                
              />
            </div>
            {isWebRuntime && (
              <p
                style={{
                  marginTop: '10px',
                  fontSize: '10px',
                  color: '#777',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                }}
              >
                Browser-Modus: Projekt-Scan funktioniert nur in der Desktop-App (Tauri).
              </p>
            )}
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '2px solid #AC8E66',
              padding: '32px',
              textAlign: 'left',
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#AC8E66',
              }}
            >
              Step00: Kontext
            </h3>
            <div
              style={{
                backgroundColor: '#1A1A1A',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  fontFamily: 'monospace',
                  marginBottom: '8px',
                }}
              >
                Projektordner
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#AC8E66',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}
              >
                {projectPath}
              </p>
            </div>
            <div
              style={{
                backgroundColor: '#1A1A1A',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  fontFamily: 'monospace',
                  marginBottom: '8px',
                }}
              >
                project.context.json
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: projectContextLoaded ? '#AC8E66' : '#999',
                  fontFamily: 'monospace',
                  marginBottom: '6px',
                }}
              >
                {projectContextLoaded ? 'Gefunden' : 'Nicht gefunden'}
              </p>
              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}
              >
                {projectContextPath || `${projectPath}/zenstudio/context/project.context.json`}
              </p>
              {projectContextData && (
                <p
                  style={{
                    fontSize: '11px',
                    color: '#777',
                    fontFamily: 'monospace',
                    marginTop: '6px',
                  }}
                >
                  Felder: {Object.keys(projectContextData).length}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <ZenRoughButton label="Projekt analysieren" icon="🔎" onClick={handleStartScan} variant="default" />
              <ZenRoughButton label="Projektordner wechseln" icon="📂" onClick={selectProject} variant="default" />
            </div>
            {scanSummary && (
              <p
                style={{
                  marginTop: '16px',
                  fontSize: '10px',
                  color: '#777',
                  fontFamily: 'monospace',
                }}
              >
                Letzte Analyse: {new Date(scanSummary.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Step 1: Project Analysis
  const renderStep1_ProjectAnalysis = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '900px' }}>
        <div
          style={{
            backgroundColor: '#2A2A2A',
            borderRadius: '8px',
            border: '2px solid #AC8E66',
            padding: '32px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#AC8E66',
              }}
            >
              Step01: Project Analysis
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontSize: '10px', color: '#999', fontFamily: 'monospace', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={includeAnalysisInDataRoom}
                  onChange={(event) => setIncludeAnalysisInDataRoom(event.target.checked)}
                />
                Analyse in Data Room aufnehmen
              </label>
            </div>
          </div>

          {!projectPath && (
            <div
              style={{
                backgroundColor: '#1A1A1A',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace' }}>
                Kein Projektordner ausgewählt.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                padding: '32px 0',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  border: '4px solid transparent',
                  borderBottomColor: '#AC8E66',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <p style={{ fontSize: '14px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                Scanne Projektstruktur...
              </p>
            </div>
          )}

          {!isAnalyzing && !scanSummary && (
            <div
              style={{
                backgroundColor: '#1A1A1A',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#999', fontFamily: 'monospace', marginBottom: '16px' }}>
                Noch keine Analyse vorhanden. Starte den Scan, um harte Fakten zu sammeln.
              </p>
              <ZenRoughButton label="Projekt analysieren" icon="🔎" onClick={handleStartScan} variant="default" />
            </div>
          )}

          {!isAnalyzing && scanSummary && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: '#777', fontFamily: 'monospace', marginBottom: '6px' }}>Detected Stack</p>
                  <p style={{ fontSize: '12px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                    {scanSummary.projectType.length ? scanSummary.projectType.join(', ') : 'Not detected'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: '#777', fontFamily: 'monospace', marginBottom: '6px' }}>Build Signals</p>
                  <p style={{ fontSize: '12px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                    {scanSummary.build.scripts.length ? scanSummary.build.scripts.join(', ') : 'Not detected'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: '#777', fontFamily: 'monospace', marginBottom: '6px' }}>Quality Signals</p>
                  <p style={{ fontSize: '12px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                    {scanSummary.structure.hasTests ? 'Tests' : 'No Tests'} • {scanSummary.structure.hasCI ? 'CI' : 'No CI'} •{' '}
                    {scanSummary.structure.hasDocs ? 'Docs' : 'No Docs'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#1A1A1A', borderRadius: '8px', padding: '16px' }}>
                  <p style={{ fontSize: '10px', color: '#777', fontFamily: 'monospace', marginBottom: '6px' }}>Dependencies</p>
                  <p style={{ fontSize: '12px', color: '#e5e5e5', fontFamily: 'monospace' }}>
                    {scanSummary.dependencies.prodCount} prod • {scanSummary.dependencies.devCount} dev
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#1A1A1A',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <p style={{ fontSize: '10px', color: '#777', fontFamily: 'monospace', marginBottom: '6px' }}>
                  Artefakte
                </p>
                <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace', marginBottom: '4px' }}>
                  {scanArtifacts?.analysisDir || `${projectPath}/zenstudio/analysis`}
                </p>
                {scanArtifacts?.generatedDataRoomPath && (
                  <p style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>
                    {scanArtifacts.generatedDataRoomPath}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <ZenRoughButton label="Scan erneut ausführen" icon="🔄" onClick={handleStartScan} variant="default" />
                <ZenRoughButton
                  label="Scan Report anzeigen"
                  icon="📄"
                  onClick={() => setShowScanReportModal(true)}
                  variant="default"
                />
                <ZenRoughButton
                  label="Weiter zu Dokumenttypen"
                  icon="➡️"
                  onClick={() => setCurrentStep(2)}
                  variant="default"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Step 2: Choose Template
  const renderStep2 = () => (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
      }}
    >
      <div
        style={{
          maxWidth: '1152px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {/* Project Info Card - Compact Version */}
        {projectInfo && (
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '1px solid #3A3A3A',
              padding: '16px',
              marginBottom: '24px',
              position: 'relative',
            }}
          >
            {/* Header with Edit Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontWeight: 'bold',
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  color: '#AC8E66',
                }}
              >
                <span className="text-[#AC8E66]">Step02:</span>{' '}
                <span className="text-[#dbd9d5]">Projekt-Informationen</span>
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowProjectChangeConfirmation(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3A3A3A',
                    borderRadius: '6px',
                    color: '#999',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#AC8E66';
                    e.currentTarget.style.color = '#AC8E66';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3A3A3A';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  <FontAwesomeIcon icon={faFolder} />
                  <span>Projektordner wechseln</span>
                </button>
                <button
                  onClick={() => setShowMetadata(true)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #3A3A3A',
                    borderRadius: '6px',
                    color: '#999',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#AC8E66';
                    e.currentTarget.style.color = '#AC8E66';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#3A3A3A';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  <FontAwesomeIcon icon={faPencil} />
                  <span>Projekt Info Bearbeiten</span>
                </button>
              </div>
            </div>

            {/* Compact Info Display */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.8',
                color: '#e5e5e5',
              }}
            >
              <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
                <div>
                  <span style={{ color: '#777' }}>Name:</span>{' '}
                  <span style={{ fontWeight: 'bold' }}>{projectInfo.name}</span>
                </div>
                <div>
                  <span style={{ color: '#777' }}>Version:</span>{' '}
                  <span style={{ fontWeight: 'bold' }}>{projectInfo.version}</span>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#777' }}>Beschreibung:</span>{' '}
                <span>{projectInfo.description}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#777' }}>Dateitypen:</span>{' '}
                <span>{projectInfo.fileTypes.slice(0, 10).join(', ')}</span>
              </div>
              <div>
                <span style={{ color: '#777' }}>Features:</span>{' '}
                <span>
                  {projectInfo.hasTests ? '✅ Tests' : '❌ Keine Tests'} •
                  {projectInfo.hasApi ? ' ✅ API' : ' ❌ Keine API'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Style Options - Step03 with Toggle */}
        <div
          style={{
            backgroundColor: '#2A2A2A',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={() => setShowKIOptions(!showKIOptions)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: 0,
              marginBottom: showKIOptions ? '16px' : 0,
            }}
          >
            <h3
              style={{
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#AC8E66',
                margin: 0,
              }}
            >
              <span className="text-[#AC8E66]">Step03:</span>{' '}
              <span className="text-[#dbd9d5]">KI Optionen</span>
            </h3>
            <FontAwesomeIcon
              icon={showKIOptions ? faChevronUp : faChevronDown}
              style={{ color: '#AC8E66', fontSize: '14px' }}
            />
          </button>
          {showKIOptions && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Tone */}
            <ZenDropdown
              label="Tonalität:"
              value={tone}
              onChange={(value) => setTone(value as any)}
              options={[
                { value: 'professional', label: 'Professional' },
                { value: 'casual', label: 'Casual' },
                { value: 'technical', label: 'Technical' },
                { value: 'enthusiastic', label: 'Enthusiastic' },
              ]}
              fullWidth
              variant="compact"
              labelSize="11px"
            />

            {/* Length */}
            <ZenDropdown
              label="Länge:"
              value={length}
              onChange={(value) => setLength(value as any)}
              options={[
                { value: 'short', label: 'Kurz (1-2 Absätze)' },
                { value: 'medium', label: 'Mittel (3-5 Absätze)' },
                { value: 'long', label: 'Lang (Artikel)' },
              ]}
              fullWidth
              variant="compact"
              labelSize="11px"
            />

            {/* Audience */}
            <ZenDropdown
              label="Zielgruppe:"
              value={audience}
              onChange={(value) => setAudience(value as any)}
              options={[
                { value: 'beginner', label: 'Anfänger' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'expert', label: 'Experten' },
              ]}
              fullWidth
              variant="compact"
              labelSize="11px"
            />

            {/* Language */}
            <ZenDropdown
              label="Sprache:"
              value={targetLanguage}
              onChange={(value) => setTargetLanguage(value as TargetLanguage)}
              options={[
                { value: 'deutsch', label: 'Deutsch 🇩' },
                { value: 'english', label: 'English 🇬🇧' },
                { value: 'español', label: 'Español 🇪🇸' },
                { value: 'français', label: 'Français 🇫🇷' },
                { value: 'italiano', label: 'Italiano 🇮🇹' },
                { value: 'português', label: 'Português 🇵🇹' },
                { value: '中文', label: '中文 🇨🇳' },
                { value: '日本語', label: '日本語 🇯🇵' },
                { value: '한국어', label: '한국어 🇰🇷' },
              ]}
              fullWidth
              variant="compact"
              labelSize="11px"
            />
          </div>
          )}
        </div>

        {/* Template Selection - Step04 */}
        <div
          style={{
            backgroundColor: '#2A2A2A',
            borderRadius: '8px',
            border: '1px solid #AC8E66',
            padding: '24px',
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#AC8E66',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#AC8E66',
                fontWeight: 'normal',
              }}
            >
              <span className="text-[#AC8E66] font-normal">Step04:</span>{' '}
              <span className="text-[#dbd9d5] font-normal">Dokumentationstyp wählen</span>
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  if (selectedTemplates.length === templates.length) {
                    setSelectedTemplates([]);
                  } else {
                    setSelectedTemplates(templates.map(t => t.id));
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #3A3A3A',
                  borderRadius: '6px',
                  color: selectedTemplates.length === templates.length ? '#AC8E66' : '#999',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {selectedTemplates.length === templates.length ? 'Alle abwählen' : 'Alle auswählen'}
              </button>
              {selectedTemplates.length > 0 && (
                <button
                  onClick={() => {
                    // Generate all selected templates
                    selectedTemplates.forEach(templateId => generateDocumentation(templateId));
                  }}
                  disabled={isGenerating}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#AC8E66',
                    border: '1px solid #AC8E66',
                    borderRadius: '6px',
                    color: '#1F1F1F',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    opacity: isGenerating ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {selectedTemplates.length} generieren
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              justifyContent: 'center',
            }}
          >
            {templates.map((template) => {
              const isSelected = selectedTemplates.includes(template.id);
              return (
                <button
                key={template.id}
                onClick={(e) => {
                  // Toggle selection for multi-select
                  if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    if (isSelected) {
                      setSelectedTemplates(selectedTemplates.filter(t => t !== template.id));
                    } else {
                      setSelectedTemplates([...selectedTemplates, template.id]);
                    }
                  } else {
                    // Single click - toggle or generate
                    if (isSelected) {
                      setSelectedTemplates(selectedTemplates.filter(t => t !== template.id));
                    } else {
                      setSelectedTemplates([...selectedTemplates, template.id]);
                    }
                  }
                }}
                onDoubleClick={() => generateDocumentation(template.id)}
                disabled={isGenerating}
                style={{
                  position: 'relative',
                  padding: '24px',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? '#AC8E66' : '#3a3a3a'}`,
                  backgroundColor: isSelected ? '#2A2A2A' : '#1F1F1F',
                  flex: '1 1 200px',
                  minWidth: '200px',
                  maxWidth: '250px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating && !isSelected) {
                    e.currentTarget.style.borderColor = 'rgba(172, 142, 102, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }
                }}
              >
                {/* Selection Checkbox */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `1px solid ${isSelected ? '#AC8E66' : '#555'}`,
                    backgroundColor: isSelected ? '#AC8E66' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isSelected && (
                    <FontAwesomeIcon icon={faCheck} style={{ color: '#1F1F1F', fontSize: '12px' }} />
                  )}
                </div>
                {/* Icon */}
                <div
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <FontAwesomeIcon
                    icon={template.icon}
                    style={{
                      fontSize: '36px',
                      color: isSelected ? '#AC8E66' : '#777',
                      opacity: isSelected ? 1 : 0.7,
                    }}
                  />
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginBottom: '8px',
                    color: isSelected ? '#e5e5e5' : '#999',
                  }}
                >
                  {template.title}
                </h4>

                {/* Description */}
                <p
                  style={{
                    color: '#777',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    lineHeight: '1.6',
                  }}
                >
                  {template.description}
                </p>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    startBlankDocument(template.id);
                  }}
                  style={{
                    marginTop: '12px',
                    padding: '6px 10px',
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: '1px solid #3a3a3a',
                    borderRadius: '6px',
                    color: '#AC8E66',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Blanko starten
                </button>

              </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Generate & Edit
  const renderStep3 = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '32px',
      }}
    >
      <div
        style={{
          flex: 1,
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '24px',
            paddingBottom: '16px',
            borderBottom: '2px solid #AC8E66',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#e5e5e5',
            }}
          >
            {templates.find(t => t.id === selectedTemplate)?.title}
          </h2>
     <p
  style={{
    fontSize: "14px",
    color: "#999",
    marginTop: "4px",
  }}
>
  <span style={{ color: "#AC8E66" }}>{projectInfo?.name}</span>
  {" "}• Bearbeite und speichere define Dokumentation
</p>
        </div>

        {/* Editor - nimmt den verfügbaren Platz */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#2A2A2A',
            borderRadius: '8px',
            border: '2px solid #AC8E66',
            padding: '16px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <ZenMarkdownEditor
            value={generatedContent}
            onChange={setGeneratedContent}
            placeholder="Define Dokumentation erscheint hier..."
            showPreview={false}
            showLineNumbers={editorSettings.showLineNumbers}
          />
        </div>

        {/* Buttons unten */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <ZenRoughButton
            label="Dokument überarbeiten"
                            icon={<FontAwesomeIcon icon={faPencil} className="text-[#AC8E66]" />}
            onClick={() => {
              setShowDocEditModal(true);
            }}
            variant="default"
          />
          <ZenRoughButton
            label="Neues Dokument"
            icon={<FontAwesomeIcon icon={faRotateLeft} className="text-[#AC8E66]" />}
            onClick={handleNewDocument}
            variant="default"
          />
          <ZenRoughButton
            label={isMetadataFilled() ? 'Metadaten bearbeiten' : 'Metadaten bearbeiten'}
                            icon={<FontAwesomeIcon icon={faUser} className="text-[#AC8E66]" />}
            onClick={() => setShowMetadata(true)}
            variant={isMetadataFilled() ? 'active' : 'default'}
          />
          <ZenRoughButton
            label="Im Projekt speichern"
                            icon={<FontAwesomeIcon icon={faSave} className="text-[#AC8E66]" />}
            onClick={saveDocumentation}
            variant="default"
          />
        </div>

        {showDocEditModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '16px',
            }}
            onClick={() => setShowDocEditModal(false)}
          >
            <div
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: '8px',
                border: '2px solid #AC8E66',
                padding: '20px',
                maxWidth: '980px',
                width: '96%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#e5e5e5',
                  marginBottom: '12px',
                  fontFamily: 'monospace',
                }}
              >
                {templates.find(t => t.id === selectedTemplate)?.title || 'Dokument'} · {projectInfo?.name || 'Projekt'} bearbeiten
              </h3>
              <div style={{ flex: 1, marginBottom: '12px', minHeight: 0 }}>
                <ZenMarkdownEditor
                  value={generatedContent}
                  onChange={setGeneratedContent}
                  placeholder="Bearbeite deine Dokumentation..."
                  showPreview={false}
                  showLineNumbers={editorSettings.showLineNumbers}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <ZenRoughButton
                  label="Schließen"
                  icon="✕"
                  onClick={() => setShowDocEditModal(false)}
                  variant="default"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Step 4: Preview Cards (for blog posts)
  const renderStep4_Preview = () => {
    const getPlatformIcon = (platform: SocialPlatform) => {
      const icons: Record<SocialPlatform, typeof faLinkedin> = {
        linkedin: faLinkedin,
        reddit: faReddit,
        github: faGithub,
        devto: faDev,
        medium: faMedium,
        hashnode: faHashnode,
        twitter: faTwitter,
      };
      return icons[platform];
    };

    const getPlatformName = (platform: SocialPlatform): string => {
      const names: Record<SocialPlatform, string> = {
        linkedin: 'LinkedIn',
        reddit: 'Reddit',
        github: 'GitHub',
        devto: 'Dev.to',
        medium: 'Medium',
        hashnode: 'Hashnode',
        twitter: 'Twitter/X',
      };
      return names[platform];
    };

    const updatePostContent = (platform: SocialPlatform, newContent: string) => {
      setPlatformPosts(prev =>
        prev.map(post =>
          post.platform === platform
            ? {
                ...post,
                content: newContent,
                characterCount: newContent.length,
                wordCount: newContent.split(/\s+/).length,
              }
            : post
        )
      );
    };

    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#e5e5e5',
                marginBottom: '8px',
              }}
            >
              🎨 Preview & Bearbeiten
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#999',
              }}
            >
              Dokument Vorschau & Bearbeiten
            </p>
          </div>

          {/* Document Preview */}
          <div style={{ marginBottom: '32px' }}>
            {generatedContent ? (
              <ZenMarkdownPreview content={generatedContent} height="60vh" />
            ) : (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#0A0A0A',
                  borderRadius: '8px',
                  border: '1px solid #3A3A3A',
                  textAlign: 'center',
                  color: '#777',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
              >
                Noch kein Dokument vorhanden. Erstelle zuerst Inhalt im Editor.
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal - Compact */}
        {editingPost && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
            onClick={() => setEditingPost(null)}
          >
            <div
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: '8px',
                border: '2px solid #AC8E66',
                padding: '20px',
                maxWidth: '980px',
                width: '96%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#e5e5e5',
                  marginBottom: '12px',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FontAwesomeIcon icon={getPlatformIcon(editingPost)} style={{ color: '#AC8E66' }} />
                {getPlatformName(editingPost)} bearbeiten
              </h3>
              <div style={{ flex: 1, marginBottom: '12px', minHeight: 0 }}>
                <ZenMarkdownEditor
                  value={platformPosts.find(p => p.platform === editingPost)?.content || ''}
                  onChange={(newContent) => updatePostContent(editingPost, newContent)}
                  placeholder="Bearbeite deinen Post..."
                  showLineNumbers={editorSettings.showLineNumbers}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <ZenRoughButton
                  label="Schließen"
                  icon="✕"
                  onClick={() => setEditingPost(null)}
                  variant="default"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStep5_PublishingManagement = () => {
    const handleScheduleSave = async (posts: ScheduledPost[]) => {
      if (!projectPath) {
        alert('Kein Projektpfad vorhanden');
        return;
      }
      const projectExists = await exists(projectPath);
      if (!projectExists) {
        alert(`Projektpfad nicht gefunden: ${projectPath}`);
        return;
      }

      try {
        const schedules = posts.reduce((acc, post) => {
          acc[post.platform] = {
            date: post.scheduledDate ? post.scheduledDate.toISOString().split('T')[0] : '',
            time: post.scheduledTime || '',
          };
          return acc;
        }, {} as PlatformScheduleState);

        const { scheduledPosts: savedPosts, savedFilePaths: postFilePaths } = await autoSavePostsAndSchedule(
          projectPath,
          platformPosts,
          schedules
        );

        const publishingPaths = await getPublishingPaths(projectPath);

        setScheduledPosts(savedPosts);
        closeScheduler();
        setSavedFileName(`Auto-Save: ${savedPosts.length} Posts & schedule.json`);
        setSavedFilePaths([publishingPaths.scheduleFile, ...postFilePaths]);
        setShowCalendarButtonInSuccessModal(true);
        setShowSaveSuccess(true);

        console.log('[DocStudio] Successfully saved posts and schedule');
      } catch (error) {
        console.error('[DocStudio] Error saving schedule:', error);
        alert(`Fehler beim Speichern des Zeitplans: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const handleAddPostFromCalendar = (date: Date) => {
      setSelectedDateFromCalendar(date);
      closeCalendar();
      openScheduler();
    };

    const handleExportCalendar = () => {
      try {
        const stats = getScheduleStats(scheduledPosts);
        if (!stats.canExport) {
          alert('Keine geplanten Posts zum Exportieren. Bitte erst Zeitplan festlegen.');
          return;
        }
        downloadICSFile(scheduledPosts);
        setSavedFileName('calendar.ics');
        setSavedFilePaths([]);
        setShowCalendarButtonInSuccessModal(false); // No calendar button for ICS export
        setShowSaveSuccess(true);
      } catch (error) {
        alert('Fehler beim Exportieren: ' + (error as Error).message);
      }
    };

    const stats = getScheduleStats(scheduledPosts);
    const schedulerPrefills = platformPosts.reduce((acc, post) => {
      const existing = scheduledPosts.find(scheduled => scheduled.platform === post.platform);
      if (existing) {
        acc[post.platform] = {
          date: existing.scheduledDate ? existing.scheduledDate.toISOString().split('T')[0] : '',
          time: existing.scheduledTime || '',
        };
      }
      return acc;
    }, {} as Partial<Record<SocialPlatform, { date: string; time: string }>>);

    return (
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#e5e5e5',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <FontAwesomeIcon icon={faCalendarDays} style={{ color: '#AC8E66' }} />
              Publishing Management
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#999',
                fontFamily: 'monospace',
              }}
            >
              Plane deine Posts, verwalte deinen Content-Kalender und exportiere nach Google Calendar
            </p>
          </div>

          {/* Stats Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                padding: '24px',
                backgroundColor: '#1A1A1A',
                borderRadius: '12px',
                border: '1px solid #3A3A3A',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                <FontAwesomeIcon icon={faPencil} style={{ color: '#AC8E66' }} />
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '24px', color: '#AC8E66', fontWeight: 'bold' }}>
                {stats.total}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#777' }}>
                Gesamt Posts
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                backgroundColor: '#1A1A1A',
                borderRadius: '12px',
                border: '1px solid #AC8E66',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontFamily: 'monospace', fontSize: '24px', color: '#AC8E66', fontWeight: 'bold' }}>
                {stats.scheduled}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#777' }}>
                Geplant
              </div>
            </div>

            <div
              style={{
                padding: '24px',
                backgroundColor: '#1A1A1A',
                borderRadius: '12px',
                border: '1px solid #3A3A3A',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontFamily: 'monospace', fontSize: '24px', color: '#999', fontWeight: 'bold' }}>
                {stats.drafts}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#777' }}>
                Entwürfe
              </div>
            </div>
          </div>

          {/* Management Actions Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {/* Scheduler Card */}
            <div
              style={{
                padding: '32px',
                backgroundColor: '#1A1A1A',
                borderRadius: '16px',
                border: '2px solid #3A3A3A',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '48px', textAlign: 'center' }}>
                <FontAwesomeIcon icon={faCalendarDays} style={{ color: '#AC8E66' }} />
              </div>
              <h3
                style={{
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  color: '#e5e5e5',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                Zeitplan festlegen
              </h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#777',
                  textAlign: 'center',
                  lineHeight: '1.6',
                }}
              >
                Lege für jeden Post ein Datum und eine Uhrzeit fest
              </p>
              <ZenRoughButton
                label="Zeitplan öffnen"
                icon={<FontAwesomeIcon icon={faCalendarDays} />}
                onClick={() => openScheduler()}
                variant="default"
              />
            </div>

            {/* Calendar Card */}
            <div
              style={{
                padding: '32px',
                backgroundColor: '#1A1A1A',
                borderRadius: '16px',
                border: '2px solid #3A3A3A',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '48px', textAlign: 'center' }}>
                <FontAwesomeIcon icon={faCalendarDays} style={{ color: '#AC8E66' }} />
              </div>
              <h3
                style={{
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  color: '#e5e5e5',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                Kalender-Übersicht
              </h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#777',
                  textAlign: 'center',
                  lineHeight: '1.6',
                }}
              >
                Visualisiere deine geplanten Posts im Kalender
              </p>
              <ZenRoughButton
                label="Kalender öffnen"
                icon={<FontAwesomeIcon icon={faCalendarDays} />}
                onClick={() => openCalendar()}
                variant="default"
              />
            </div>

            {/* Checklist Card */}
            <div
              style={{
                padding: '32px',
                backgroundColor: '#1A1A1A',
                borderRadius: '16px',
                border: '2px solid #3A3A3A',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ fontSize: '48px', textAlign: 'center' }}>✅</div>
              <h3
                style={{
                  fontFamily: 'monospace',
                  fontSize: '16px',
                  color: '#e5e5e5',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                Publishing Workflow
              </h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#777',
                  textAlign: 'center',
                  lineHeight: '1.6',
                }}
              >
                Verfolge den Fortschritt deiner Publishing-Aufgaben
              </p>
              <ZenRoughButton
                label="Checklist öffnen"
                icon="✅"
                onClick={() => openChecklist()}
                variant="default"
              />
            </div>
          </div>

          {/* Export Section */}
          <div
            style={{
              padding: '32px',
              backgroundColor: '#1A1A1A',
              borderRadius: '16px',
              border: '2px solid #AC8E66',
              marginBottom: '32px',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📥</div>
              <h3
                style={{
                  fontFamily: 'monospace',
                  fontSize: '18px',
                  color: '#e5e5e5',
                  margin: 0,
                  marginBottom: '8px',
                }}
              >
                Google Calendar Export
              </h3>
              <p
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#777',
                  lineHeight: '1.6',
                }}
              >
                Exportiere deine geplanten Posts als .ics Datei für Google Calendar, Apple Calendar, Outlook und mehr
              </p>
            </div>

            {stats.canExport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0A0A0A',
                    borderRadius: '8px',
                    border: '1px solid #AC8E66',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      color: '#AC8E66',
                      margin: 0,
                    }}
                  >
                    ✓ {stats.scheduled} geplante Posts bereit zum Export
                  </p>
                </div>
                <ZenRoughButton
                  label="📥 Als .ics exportieren"
                  icon="📥"
                  onClick={handleExportCalendar}
                  variant="default"
                />
              </div>
            ) : (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: '#0A0A0A',
                  borderRadius: '8px',
                  border: '1px solid #3A3A3A',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#777',
                    margin: 0,
                  }}
                >
                  <FontAwesomeIcon icon={faLightbulb} style={{ color: '#AC8E66', marginRight: '6px' }} />
                  Lege zuerst einen Zeitplan fest, um den Kalender zu exportieren
                </p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ZenRoughButton
              label="← Zurück zur Vorschau"
              icon="←"
              onClick={() => setCurrentStep(4)}
              variant="default"
            />
            <ZenRoughButton
              label="Zum Hauptmenü"
              icon="🏠"
              onClick={handleBackToMenu}
              variant="default"
            />
          </div>
        </div>

        {/* Modals - nur rendern wenn keine externen Props vorhanden (sonst in App1.tsx) */}
        {!onShowScheduler && (
          <ZenPublishScheduler
            isOpen={showScheduler}
            onClose={() => {
              setLocalShowScheduler(false);
              setLocalSelectedDateFromCalendar(undefined);
            }}
            posts={platformPosts}
            onScheduleSave={handleScheduleSave}
            preSelectedDate={selectedDateFromCalendar}
            initialSchedules={schedulerPrefills}
          />
        )}

        {!onShowCalendar && (
          <ZenContentCalendar
            isOpen={showCalendar}
            onClose={() => setLocalShowCalendar(false)}
            scheduledPosts={scheduledPosts}
            onAddPost={handleAddPostFromCalendar}
            onEditPost={(post) => {
              // Close calendar and open edit modal for this post
              setLocalShowCalendar(false);
              setEditingPost(post.platform);
              setCurrentStep(4); // Go to preview/edit step
            }}
          />
        )}

        {!onShowChecklist && (
          <ZenTodoChecklist
            isOpen={showChecklist}
            onClose={() => setLocalShowChecklist(false)}
            scheduledPosts={scheduledPosts}
            projectPath={projectPath}
          />
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1_ProjectAnalysis();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4_Preview();
      case 5:
        return renderStep5_PublishingManagement();
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#1A1A1A',
        color: '#e5e5e5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {renderStepContent()}
      </div>

      <ZenFooterText />

      <ZenSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <ZenMetadataModal
        isOpen={showMetadata}
        onClose={() => setShowMetadata(false)}
        metadata={metadata}
        onSave={setMetadata}
      />

      <ZenGeneratingModal
        isOpen={isGenerating}
        templateName={templates.find(t => t.id === selectedTemplate)?.title}
      />

      <ZenSaveConfirmationModal
        isOpen={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        onBackToMenu={handleBackToMenu}
        onNewDocument={handleNewDocument}
        fileName={savedFileName}
      />

      <ZenSaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => {
          setShowSaveSuccess(false);
          setShowCalendarButtonInSuccessModal(false); // Reset calendar button state
          setSavedFilePaths([]);
        }}
        fileName={savedFileName}
        filePaths={savedFilePaths}
        showCalendarButton={showCalendarButtonInSuccessModal}
        onGoToCalendar={() => openCalendar()}
      />

      <ProjectPickerModal
        isOpen={showProjectPickerModal}
        isWebRuntime={isWebRuntime}
        onClose={() => setShowProjectPickerModal(false)}
        onPathSelected={(path) => {
          setProjectPath(path);
          setCurrentStep(0);
        }}
      />

      <ZenModal
        isOpen={showScanReportModal}
        onClose={() => setShowScanReportModal(false)}
        size="lg"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px', color: '#AC8E66' }}>
            Scan Report
          </h3>
          {!scanSummary && (
            <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#999' }}>
              Kein Scan vorhanden. Bitte Projekt analysieren.
            </p>
          )}
          {scanSummary && (
            <>
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#777', marginBottom: '6px' }}>
                  scan_summary.json
                </p>
                <pre
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '10px',
                    color: '#e5e5e5',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(scanSummary, null, 2)}
                </pre>
              </div>
              {scanArtifacts?.dependencyReport && (
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#777', marginBottom: '6px' }}>
                    dependency_report.json
                  </p>
                  <pre
                    style={{
                      backgroundColor: '#1A1A1A',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '10px',
                      color: '#e5e5e5',
                      maxHeight: '160px',
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(scanArtifacts.dependencyReport, null, 2)}
                  </pre>
                </div>
              )}
              {scanArtifacts?.projectTree && (
                <div>
                  <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#777', marginBottom: '6px' }}>
                    project_tree.txt
                  </p>
                  <pre
                    style={{
                      backgroundColor: '#1A1A1A',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '10px',
                      color: '#e5e5e5',
                      maxHeight: '160px',
                      overflow: 'auto',
                    }}
                  >
                    {scanArtifacts.projectTree}
                  </pre>
                </div>
              )}
              <div>
                <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#777', marginBottom: '6px' }}>
                  Data Room Draft
                </p>
                <pre
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '10px',
                    color: '#e5e5e5',
                    maxHeight: '160px',
                    overflow: 'auto',
                  }}
                >
                  {generateProjectAnalysisMarkdown(scanSummary)}
                </pre>
              </div>
            </>
          )}
        </div>
      </ZenModal>

      {/* Project Change Confirmation Modal */}
      <ZenModal
        isOpen={showProjectChangeConfirmation}
        onClose={() => setShowProjectChangeConfirmation(false)}
        size="md"
        showCloseButton={false}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minHeight: getModalPreset('project-change').minHeight,
          }}
        >
          {/* Header */}
          <div
            style={{
              paddingBottom: 16,
              borderBottom: '1px solid #AC8E66',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <ZenModalHeader
              {...getModalPreset('project-change')}
              onClose={() => setShowProjectChangeConfirmation(false)}
            />
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              padding: '24px 16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#1A1A1A',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: '#777',
                  fontFamily: 'monospace',
                  marginBottom: '12px',
                }}
              >
                Aktueller Projektordner:
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: '#AC8E66',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                }}
              >
                {projectPath || 'Kein Ordner gewählt'}
              </p>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: '#999',
                fontFamily: 'monospace',
                lineHeight: '1.6',
              }}
            >
              Möchtest du einen neuen Projektordner wählen? Alle ungespeicherten Änderungen gehen verloren.
            </p>
          </div>

          {/* Footer */}
          <ZenModalFooter showFooterText={false}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              <ZenRoughButton
                label="Ordner wechseln"
                icon={<FontAwesomeIcon icon={faFolder} className="text-[#AC8E66]" />}
                onClick={() => {
                  setShowProjectChangeConfirmation(false);
                  // Reset to step 0 to select a new project folder
                  setCurrentStep(0);
                  setProjectPath(null);
                  setProjectInfo(null);
                  setScanSummary(null);
                  setScanArtifacts(null);
                  setSelectedTemplate(null);
                  setGeneratedContent('');
                  // Clear localStorage
                  localStorage.removeItem('zenpost_last_project_path');
                }}
                variant="default"
              />
            </div>
          </ZenModalFooter>
        </div>
      </ZenModal>
    </div>
  );
}
