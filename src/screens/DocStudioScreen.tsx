import { useState, useEffect } from 'react';
import { readDir, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faBook, faPencil, faFileLines, faRotateLeft, faLightbulb, faSave, faUser, faPlug, faHandshake, faDatabase, faCalendarDays, faEdit, faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons';
import { faLinkedin, faReddit, faGithub, faDev, faMedium, faHashnode, faTwitter } from '@fortawesome/free-brands-svg-icons';
import { ZenSettingsModal, ZenFooterText, ZenMetadataModal, ProjectMetadata, ZenGeneratingModal, ZenRoughButton, ZenSaveConfirmationModal, ZenSaveSuccessModal, ZenPublishScheduler, ZenContentCalendar, ZenTodoChecklist, ZenDropdown, extractMetadataFromContent, ZenModal, ZenModalHeader, ZenModalFooter, getModalPreset } from '../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';
import { generateFromPrompt, translateContent, type TargetLanguage } from '../services/aiService';
import { defaultEditorSettings, loadEditorSettings, type EditorSettings } from '../services/editorSettingsService';
import { autoSavePostsAndSchedule, loadSchedule, initializePublishingProject, getPublishingPaths, type PlatformScheduleState } from '../services/publishingService';
import type { ScheduledPost, SocialPlatform } from '../types/scheduling';
import { downloadICSFile, getScheduleStats } from '../utils/calendarExport';

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
  // Publishing Props (geteilt mit App1.tsx)
  scheduledPosts?: ScheduledPost[];
  onScheduledPostsChange?: (posts: ScheduledPost[]) => void;
  onShowScheduler?: () => void;
  onShowCalendar?: () => void;
  onShowChecklist?: () => void;
  onSetSchedulerPlatformPosts?: (posts: Array<{ platform: string; content: string }>) => void;
  onSetSelectedDateFromCalendar?: (date: Date | undefined) => void;
  // Preview Mode Props (von App1.tsx gesteuert)
  showPreview?: boolean;
  onPreviewChange?: (show: boolean) => void;
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
  initialStep = 1,
  savedState,
  onStateChange: _onStateChange,
  scheduledPosts: externalScheduledPosts,
  onScheduledPostsChange,
  onShowScheduler,
  onShowCalendar,
  onShowChecklist,
  onSetSchedulerPlatformPosts,
  onSetSelectedDateFromCalendar,
  showPreview = false,
  onPreviewChange: _onPreviewChange,
}: DocStudioScreenProps) {
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

  // Save project path to localStorage whenever it changes
  useEffect(() => {
    if (projectPath) {
      localStorage.setItem('zenpost_last_project_path', projectPath);
    }
  }, [projectPath]);

  // Load and analyze project on mount if projectPath exists but no projectInfo
  useEffect(() => {
    if (projectPath && !projectInfo && !isAnalyzing) {
      analyzeProject(projectPath);
    }
  }, [projectPath, projectInfo, isAnalyzing]);

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

  // Multi-Platform Blog Posts (kept for potential future use)
  const [_selectedPlatforms, _setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);
  const [_saveLocation, _setSaveLocation] = useState<'root' | 'docs' | 'blog-posts'>('docs');

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
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select your project folder',
      });

      if (selected && typeof selected === 'string') {
        setProjectPath(selected);
        await analyzeProject(selected);
      }
    } catch (error) {
      console.error('Error selecting project:', error);
      alert('Could not open folder picker');
    }
  };

  const analyzeProject = async (path: string) => {
    setIsAnalyzing(true);
    try {
      // Analyze project structure
      const entries = await readDir(path);

      // Look for package.json, Cargo.toml, etc.
      let projectName = path.split('/').pop() || 'Unknown Project';
      let projectDescription = 'No description available';
      let version = '0.1.0';
      let dependencies: string[] = [];
      let hasTests = false;
      let hasApi = false;

      for (const entry of entries) {
        const fileName = entry.name || '';

        // Check for package.json (Node.js project)
        if (fileName === 'package.json') {
          try {
            const content = await readTextFile(`${path}/package.json`);
            const pkg = JSON.parse(content);
            projectName = pkg.name || projectName;
            projectDescription = pkg.description || projectDescription;
            version = pkg.version || version;
            dependencies = Object.keys(pkg.dependencies || {});
          } catch (err) {
            console.error('Error reading package.json:', err);
          }
        }

        // Check for Cargo.toml (Rust project)
        if (fileName === 'Cargo.toml') {
          try {
            const content = await readTextFile(`${path}/Cargo.toml`);
            const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
            const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
            if (nameMatch) projectName = nameMatch[1];
            if (versionMatch) version = versionMatch[1];
          } catch (err) {
            console.error('Error reading Cargo.toml:', err);
          }
        }

        // Check for README.md and extract metadata
        if (fileName.toLowerCase() === 'readme.md' || fileName.toLowerCase() === 'readme.markdown') {
          try {
            const content = await readTextFile(`${path}/${fileName}`);
            const extractedMetadata = extractMetadataFromContent(content);

            // Merge extracted metadata with existing metadata (filter out undefined values)
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

        // Check for tests
        if (fileName.includes('test') || fileName === '__tests__') {
          hasTests = true;
        }

        // Check for API-related files
        if (fileName.includes('api') || fileName.includes('routes') || fileName.includes('controllers')) {
          hasApi = true;
        }
      }

      // Detect file types
      const fileTypes = new Set<string>();
      const scanFiles = async (dirPath: string) => {
        try {
          const items = await readDir(dirPath);
          for (const item of items) {
            if (item.isDirectory && !item.name?.startsWith('.') && item.name !== 'node_modules') {
              await scanFiles(`${dirPath}/${item.name}`);
            } else if (item.isFile) {
              const ext = item.name?.split('.').pop();
              if (ext) fileTypes.add(ext);
            }
          }
        } catch (err) {
          // Skip directories we can't access
        }
      };

      await scanFiles(path);

      setProjectInfo({
        name: projectName,
        description: projectDescription,
        version,
        dependencies,
        fileTypes: Array.from(fileTypes),
        hasTests,
        hasApi,
      });

      // Move to step 2 after successful analysis
      setCurrentStep(2);
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
    setCurrentStep(1);
    setProjectPath(null);
    setProjectInfo(null);
    setSelectedTemplate(null);
    setGeneratedContent('');
    // Go back to Welcome Screen
    onBack();
  };

  // Step 1: Select Project
  const renderStep1 = () => (
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
                  filter: 'drop-shadow(0 4px 6px rgba(172, 142, 102, 0.3))'
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
                variant="active"
                
              />
            </div>
          </div>
        ) : isAnalyzing ? (
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '2px solid #AC8E66',
              padding: '48px',
              textAlign: 'center',
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
                marginBottom: '24px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            />
            <p style={{ fontSize: '20px', color: '#e5e5e5' }}>
              Analysiere Projektstruktur...
            </p>
          </div>
        ) : null}
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
                <span className="text-[#AC8E66]">Step01:</span>{' '}
                <span className="text-[#fef3c7]">Projekt-Informationen</span>
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

        {/* Style Options - Step02 with Toggle */}
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
              <span className="text-[#AC8E66]">Step02:</span>{' '}
              <span className="text-[#fef3c7]">KI Optionen</span>
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
                { value: 'deutsch', label: 'Deutsch 🇩🇪' },
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

        {/* Template Selection - Step03 */}
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
              }}
            >
              <span className="text-[#AC8E66]">Step03:</span>{' '}
              <span className="text-[#fef3c7]">Dokumentationstyp wählen</span>
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
            showPreview={showPreview}
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
            variant="active"
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

    const saveAllPosts = async () => {
      if (!projectPath) {
        alert('Kein Projektpfad gefunden');
        return;
      }

      try {
        // Determine base path based on _saveLocation
        let basePath = projectPath;

        if (_saveLocation === 'docs') {
          basePath = `${projectPath}/docs`;
        } else if (_saveLocation === 'blog-posts') {
          basePath = `${projectPath}/blog-posts`;
        }

        // Create directory if needed (Tauri doesn't auto-create)
        // We'll try to write and handle error if directory doesn't exist

        const savedFiles: string[] = [];

        for (const post of platformPosts) {
          const fileName = `${post.platform}-post.md`;
          const filePath = `${basePath}/${fileName}`;

          try {
            await writeTextFile(filePath, post.content);
            savedFiles.push(fileName);
          } catch (err) {
            console.error(`Failed to save ${fileName}:`, err);
            alert(`Fehler beim Speichern von ${fileName}. Stelle sicher, dass der Ordner "${_saveLocation === 'root' ? 'Projekt-Root' : _saveLocation}" existiert.`);
            return;
          }
        }

        // Show success modal
        setSavedFileName(`${savedFiles.length} Posts in ${_saveLocation === 'root' ? 'Projekt-Root' : _saveLocation + '/'}`);
        setShowSaveConfirmation(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('zenpost-project-files-updated'));
        }
      } catch (error) {
        console.error('Error saving posts:', error);
        alert('Fehler beim Speichern der Posts');
      }
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
              marginBottom: '32px',
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
              {platformPosts.length} Posts wurden generiert - Vorschau, bearbeiten & veröffentlichen
            </p>
          </div>

          {/* Preview Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px',
            }}
          >
            {platformPosts.map((post) => (
              <div
                key={post.platform}
                style={{
                  backgroundColor: '#2A2A2A',
                  borderRadius: '8px',
                  border: '2px solid #AC8E66',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Card Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #3A3A3A',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FontAwesomeIcon icon={getPlatformIcon(post.platform)} style={{ fontSize: '24px', color: '#AC8E66' }} />
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#e5e5e5',
                        fontFamily: 'monospace',
                      }}
                    >
                      {getPlatformName(post.platform)}
                    </h3>
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      color: '#777',
                      fontFamily: 'monospace',
                    }}
                  >
                    {post.wordCount} words • {post.characterCount} chars
                  </div>
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#AC8E66',
                    marginBottom: '12px',
                  }}
                >
                  {post.title}
                </h4>

                {/* Content Preview */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#1A1A1A',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '16px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#999',
                      fontFamily: 'monospace',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {post.content.substring(0, 500)}
                    {post.content.length > 500 && '...'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <button
                    onClick={() => setEditingPost(post.platform)}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      backgroundColor: '#3A3A3A',
                      color: '#e5e5e5',
                      border: '1px solid #AC8E66',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A4A4A')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3A3A3A')}
                  >
                    <FontAwesomeIcon icon={faEdit} style={{ marginRight: '6px' }} />
                    Bearbeiten
                  </button>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#1A1A1A',
                      color: '#22c55e',
                      border: '1px solid #22c55e',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                    }}
                  >
                    ✓
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ZenRoughButton
              label="Alle Posts speichern"
              icon={<FontAwesomeIcon icon={faSave} />}
              onClick={saveAllPosts}
              variant="active"
            />
            <ZenRoughButton
              label="Publishing planen"
              icon={<FontAwesomeIcon icon={faCalendarDays} />}
              onClick={() => setCurrentStep(5)}
              variant="active"
            />
            <ZenRoughButton
              label="→ Content Transmission"
              icon={<FontAwesomeIcon icon={faLightbulb} />}
              onClick={() => alert('Content Transmission Bridge coming soon!')}
              variant="default"
            />
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

        const publishingPaths = getPublishingPaths(projectPath);

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
                variant="active"
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
                  variant="active"
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
      case 1:
        return renderStep1();
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
                  // Reset to step 1 to select a new project folder
                  setCurrentStep(1);
                  setProjectPath(null);
                  setProjectInfo(null);
                  setSelectedTemplate(null);
                  setGeneratedContent('');
                  // Clear localStorage
                  localStorage.removeItem('zenpost_last_project_path');
                }}
                variant="active"
              />
            </div>
          </ZenModalFooter>
        </div>
      </ZenModal>
    </div>
  );
}
