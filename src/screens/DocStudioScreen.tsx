import { useState } from 'react';
import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { ZenHeader } from '../kits/PatternKit/ZenHeader';
import { ZenSettingsModal, ZenFooterText, ZenMetadataModal, ProjectMetadata, ZenGeneratingModal, ZenRoughButton, ZenSaveConfirmationModal, ZenPublishScheduler, ZenContentCalendar, ZenTodoChecklist, ZenDropdown, extractMetadataFromContent } from '../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';
import { generateFromPrompt } from '../services/aiService';
import type { ScheduledPost } from '../types/scheduling';
import { downloadICSFile, getScheduleStats } from '../utils/calendarExport';

interface DocStudioScreenProps {
  onBack: () => void;
}

type DocTemplate = 'readme' | 'changelog' | 'api-docs' | 'contributing' | 'blog-post' | 'data-room';

type SocialPlatform = 'linkedin' | 'reddit' | 'github' | 'devto' | 'medium' | 'hashnode';

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

export function DocStudioScreen({ onBack }: DocStudioScreenProps) {
  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Project state
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Template & Generation state
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Style options (like in Content Transform)
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical' | 'enthusiastic'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [audience, setAudience] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsNotification, setShowSettingsNotification] = useState(false);

  // Metadata
  const [showMetadata, setShowMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ProjectMetadata>({
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

  // Multi-Platform Blog Posts
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [platformPosts, setPlatformPosts] = useState<PlatformPost[]>([]);
  const [saveLocation, setSaveLocation] = useState<'root' | 'docs' | 'blog-posts'>('docs');

  // Step 5: Publishing Management
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [selectedDateFromCalendar, setSelectedDateFromCalendar] = useState<Date | undefined>(undefined);

  // Step 4: Editing Posts
  const [editingPost, setEditingPost] = useState<SocialPlatform | null>(null);

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Projekt wählen';
      case 2: return 'Template wählen';
      case 3:
        // Show different title for blog-post template with platforms
        if (selectedTemplate === 'blog-post' && selectedPlatforms.length > 0) {
          return 'Plattformen & Speicherort';
        }
        return 'Generieren & Bearbeiten';
      case 4: return 'Vorschau & Veröffentlichen';
      case 5: return 'Publishing Management';
      default: return '';
    }
  };

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
      icon: '📄',
      title: 'README.md',
      description: 'Complete project documentation with installation, usage, and examples',
    },
    {
      id: 'changelog' as DocTemplate,
      icon: '📝',
      title: 'CHANGELOG.md',
      description: 'Version history and release notes',
    },
    {
      id: 'api-docs' as DocTemplate,
      icon: '🔌',
      title: 'API Documentation',
      description: 'Detailed API endpoints, parameters, and responses',
    },
    {
      id: 'contributing' as DocTemplate,
      icon: '🤝',
      title: 'CONTRIBUTING.md',
      description: 'Guidelines for contributors',
    },
    {
      id: 'data-room' as DocTemplate,
      icon: '📂',
      title: 'Data Room',
      description: 'Investor-ready documentation suite for due diligence',
    },
    {
      id: 'blog-post' as DocTemplate,
      icon: '✍️',
      title: 'Blog Post',
      description: 'Dev.to, Medium, or Hashnode ready article',
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

    // For blog-post, go to platform selection (Step 2.5/3) first
    if (template === 'blog-post') {
      setCurrentStep(3); // Step 3 will now be platform selection for blog posts
      return;
    }

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

      // Type narrowing: at this point template cannot be 'blog-post'
      const docTemplate = template as Exclude<DocTemplate, 'blog-post'>;

      switch (docTemplate) {
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

      setGeneratedContent(processedContent);
      setCurrentStep(3);
    } catch (error) {
      console.error('Error generating documentation:', error);
      alert('Could not generate documentation. Please check your AI service configuration.');
    } finally {
      setIsGenerating(false);
    }
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
      if (selectedTemplate === 'blog-post') {
        fileName = `blog-post-${Date.now()}.md`;
      } else if (selectedTemplate === 'data-room') {
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

      // Show confirmation modal instead of alert
      setSavedFileName(fileName);
      setShowSaveConfirmation(true);
    } catch (error) {
      console.error('[Save] Error details:', error);
      console.error('[Save] Error type:', typeof error);
      console.error('[Save] Error message:', error instanceof Error ? error.message : JSON.stringify(error));
      alert(`Could not save documentation file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  const handleNewDocument = () => {
    setShowSaveConfirmation(false);
    // Go back to step 2 to select a new template
    setCurrentStep(2);
    setSelectedTemplate(null);
    setGeneratedContent('');
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      if (currentStep === 3) {
        setGeneratedContent('');
      }
    } else {
      onBack();
    }
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

       
            <div style={{ fontSize: '60px', marginBottom: '24px' }}>📚</div>
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
                fontStyle: '12px',
              }}
            >
              Wähle deinen Projekt-Ordner, um die Struktur zu analysieren und automatisch professionelle Dokumentation zu generieren.
            </p>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              fontSize: "12px"  
            }}
              >
              <ZenRoughButton
                label="Projekt-Ordner wählen"
              
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
            Projekt-Informationen
              </h3>
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
             
                <span>Projekt Info Bearbeiten</span>
              </button>
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

        {/* Style Options */}
        <div
          style={{
            backgroundColor: '#2A2A2A',
           borderRadius: '8px',
            border: '1px solid #AC8E66',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h3
            style={{
              fontFamily: 'monospace',
              fontSize: '16px',
              color: '#AC8E66',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
           Step01: Stil-Optionen deiner KI
          </h3>
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
          </div>
        </div>

        {/* Template Selection */}
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
          <h3
            style={{
             
              marginBottom: '24px',
              textAlign: 'center',
                 fontFamily: 'monospace',
              fontSize: '16px',
              color: '#AC8E66',
            }}
          >
          Step02: Dokumentationstyp wählen
          </h3>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              justifyContent: 'center',
              marginTop: '32px',
            }}
          >
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => generateDocumentation(template.id)}
                disabled={isGenerating}
                style={{
                  position: 'relative',
                  padding: '24px',
                  borderRadius: '8px',
                  border: `1px solid ${selectedTemplate === template.id ? '#AC8E66' : '#3a3a3a'}`,
                  backgroundColor: selectedTemplate === template.id ? '#2A2A2A' : '#1F1F1F',
                  flex: '1 1 200px',
                  minWidth: '200px',
                  maxWidth: '250px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating && selectedTemplate !== template.id) {
                    e.currentTarget.style.borderColor = 'rgba(172, 142, 102, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTemplate !== template.id) {
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '36px',
                      opacity: selectedTemplate === template.id ? 1 : 0.7,
                    }}
                  >
                    {template.icon}
                  </span>
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginBottom: '8px',
                    color: selectedTemplate === template.id ? '#e5e5e5' : '#999',
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

                {/* Selected Indicator */}
                {selectedTemplate === template.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#AC8E66',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Step 2.5: Platform Selection (for blog-post only)
  const renderStep2_5_PlatformSelection = () => {
    const platforms = [
      { id: 'linkedin' as SocialPlatform, name: 'LinkedIn Post', icon: '💼', description: 'Professional business network post' },
      { id: 'reddit' as SocialPlatform, name: 'Reddit Post', icon: '🤖', description: 'Community discussion post' },
      { id: 'github' as SocialPlatform, name: 'GitHub Discussion', icon: '🐙', description: 'Technical collaborative discussion' },
      { id: 'devto' as SocialPlatform, name: 'Dev.to Article', icon: '👩‍💻', description: 'Developer community article' },
      { id: 'medium' as SocialPlatform, name: 'Medium Article', icon: '📰', description: 'Long-form storytelling blog' },
      { id: 'hashnode' as SocialPlatform, name: 'Hashnode Article', icon: '📝', description: 'Developer blogging platform' },
    ];

    const togglePlatform = (platform: SocialPlatform) => {
      setSelectedPlatforms(prev =>
        prev.includes(platform)
          ? prev.filter(p => p !== platform)
          : [...prev, platform]
      );
    };

    const toggleAll = () => {
      if (selectedPlatforms.length === platforms.length) {
        setSelectedPlatforms([]);
      } else {
        setSelectedPlatforms(platforms.map(p => p.id));
      }
    };

    const handleContinue = async () => {
      if (selectedPlatforms.length === 0) {
        alert('Bitte wähle mindestens eine Plattform aus');
        return;
      }
      // Generate posts for all platforms
      await generateMultiPlatformPosts();
    };

    const generateMultiPlatformPosts = async () => {
      setIsGenerating(true);

      try {
        const posts: PlatformPost[] = [];

        // Generate for each selected platform
        for (const platform of selectedPlatforms) {
          const prompt = createPlatformPrompt(platform);
          const result = await generateFromPrompt(prompt);

          if (result.success && result.data) {
            const content = result.data;
            const title = extractTitle(content);

            posts.push({
              platform,
              title,
              content,
              characterCount: content.length,
              wordCount: content.split(/\s+/).length,
            });
          }
        }

        setPlatformPosts(posts);
        setCurrentStep(4); // Move to preview
      } catch (error) {
        console.error('Error generating multi-platform posts:', error);
        alert('Fehler beim Generieren der Posts. Bitte versuche es erneut.');
      } finally {
        setIsGenerating(false);
      }
    };

    const createPlatformPrompt = (platform: SocialPlatform): string => {
      if (!projectInfo) return '';

      const platformSpecs: Record<SocialPlatform, { maxLength: number; tone: string; format: string }> = {
        linkedin: { maxLength: 3000, tone: 'professional and insightful', format: 'engaging LinkedIn post with bullet points' },
        reddit: { maxLength: 10000, tone: 'casual and community-focused', format: 'detailed Reddit post with clear sections' },
        github: { maxLength: 65536, tone: 'technical and collaborative', format: 'GitHub Discussion with code examples' },
        devto: { maxLength: 100000, tone: 'educational and friendly', format: 'Dev.to article with proper markdown' },
        medium: { maxLength: 100000, tone: 'thoughtful and narrative', format: 'Medium article with storytelling' },
        hashnode: { maxLength: 100000, tone: 'developer-focused and practical', format: 'Hashnode blog post with technical depth' },
      };

      const spec = platformSpecs[platform];

      return `Create a ${spec.format} about the project "${projectInfo.name}" for ${platform}.

Project Details:
- Name: ${projectInfo.name}
- Description: ${projectInfo.description}
- Version: ${projectInfo.version}
- Tech Stack: ${projectInfo.fileTypes.slice(0, 10).join(', ')}
- Has Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
- Has API: ${projectInfo.hasApi ? 'Yes' : 'No'}

Platform: ${platform.toUpperCase()}
Tone: ${spec.tone}
Max Length: ~${spec.maxLength} characters
Format: ${spec.format}

Requirements:
1. Start with a catchy title on the first line (# Title format)
2. Use ${spec.tone} tone throughout
3. Keep it under ${spec.maxLength} characters
4. ${platform === 'linkedin' ? 'Add relevant hashtags at the end' : ''}
${platform === 'reddit' ? 'Structure with clear sections and be community-friendly' : ''}
${platform === 'github' ? 'Include code examples if relevant' : ''}
${platform === 'devto' || platform === 'medium' || platform === 'hashnode' ? 'Write a full article with introduction, main content, and conclusion' : ''}
5. Make it engaging and shareable
6. Focus on the value proposition and key features

Generate the complete ${platform} post now:`;
    };

    const extractTitle = (content: string): string => {
      // Extract title from markdown (first # heading)
      const match = content.match(/^#\s+(.+)$/m);
      return match ? match[1] : 'Untitled Post';
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
            maxWidth: '1152px',
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
              📱 Plattformen auswählen
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#999',
              }}
            >
              Wähle die Social-Media-Plattformen für deine Blog-Posts
            </p>
          </div>

          {/* Platform Grid */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              justifyContent: 'center',
              marginBottom: '32px',
            }}
          >
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                style={{
                  position: 'relative',
                  padding: '24px',
                  borderRadius: '8px',
                  border: `2px solid ${selectedPlatforms.includes(platform.id) ? '#AC8E66' : '#3a3a3a'}`,
                  backgroundColor: selectedPlatforms.includes(platform.id) ? '#2A2A2A' : '#1F1F1F',
                  flex: '1 1 200px',
                  minWidth: '200px',
                  maxWidth: '250px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!selectedPlatforms.includes(platform.id)) {
                    e.currentTarget.style.borderColor = 'rgba(172, 142, 102, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!selectedPlatforms.includes(platform.id)) {
                    e.currentTarget.style.borderColor = '#3a3a3a';
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '36px',
                      opacity: selectedPlatforms.includes(platform.id) ? 1 : 0.7,
                    }}
                  >
                    {platform.icon}
                  </span>
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    marginBottom: '8px',
                    color: selectedPlatforms.includes(platform.id) ? '#e5e5e5' : '#999',
                  }}
                >
                  {platform.name}
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
                  {platform.description}
                </p>

                {/* Selected Indicator */}
                {selectedPlatforms.includes(platform.id) && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#AC8E66',
                        borderRadius: '50%',
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Save Location Options */}
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '2px solid #AC8E66',
              padding: '24px',
              marginBottom: '32px',
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#e5e5e5',
                marginBottom: '16px',
              }}
            >
              📁 Speicherort wählen
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { id: 'root' as const, label: 'Projekt-Root', icon: '📂' },
                { id: 'docs' as const, label: 'docs/ Ordner', icon: '📚' },
                { id: 'blog-posts' as const, label: 'blog-posts/ Ordner', icon: '✍️' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSaveLocation(option.id)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `2px solid ${saveLocation === option.id ? '#AC8E66' : '#3a3a3a'}`,
                    backgroundColor: saveLocation === option.id ? '#3A3A3A' : '#1F1F1F',
                    color: saveLocation === option.id ? '#e5e5e5' : '#999',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
            <p
              style={{
                marginTop: '12px',
                fontSize: '11px',
                color: '#777',
                fontFamily: 'monospace',
              }}
            >
              {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'Datei' : 'Dateien'} werden in{' '}
              {saveLocation === 'root' ? 'Projekt-Root' : `${saveLocation}/`} gespeichert
            </p>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ZenRoughButton
              label={selectedPlatforms.length === platforms.length ? 'Alle abwählen' : 'Alle auswählen'}
              icon="☑️"
              onClick={toggleAll}
              variant="default"
            />
            <ZenRoughButton
              label={`${selectedPlatforms.length} ${selectedPlatforms.length === 1 ? 'Post' : 'Posts'} generieren`}
              icon="🚀"
              onClick={handleContinue}
              variant="active"
              disabled={selectedPlatforms.length === 0}
            />
          </div>
        </div>
      </div>
    );
  };

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
  {" "}• Bearbeite und speichere deine Dokumentation
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
            placeholder="Deine Dokumentation erscheint hier..."
          />
        </div>

        {/* Buttons unten */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ZenRoughButton
            label={isMetadataFilled() ? '✓ Metadaten bearbeiten' : 'Metadaten bearbeiten'}
            icon="📋"
            onClick={() => setShowMetadata(true)}
            variant={isMetadataFilled() ? 'active' : 'default'}
          />
          <ZenRoughButton
            label="Im Projekt speichern"
            icon="💾"
            onClick={saveDocumentation}
            variant="active"
          />
        </div>
      </div>
    </div>
  );

  // Step 4: Preview Cards (for blog posts)
  const renderStep4_Preview = () => {
    const getPlatformIcon = (platform: SocialPlatform): string => {
      const icons: Record<SocialPlatform, string> = {
        linkedin: '💼',
        reddit: '🤖',
        github: '🐙',
        devto: '👩‍💻',
        medium: '📰',
        hashnode: '📝',
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
        // Determine base path based on saveLocation
        let basePath = projectPath;

        if (saveLocation === 'docs') {
          basePath = `${projectPath}/docs`;
        } else if (saveLocation === 'blog-posts') {
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
            alert(`Fehler beim Speichern von ${fileName}. Stelle sicher, dass der Ordner "${saveLocation === 'root' ? 'Projekt-Root' : saveLocation}" existiert.`);
            return;
          }
        }

        // Show success modal
        setSavedFileName(`${savedFiles.length} Posts in ${saveLocation === 'root' ? 'Projekt-Root' : saveLocation + '/'}`);
        setShowSaveConfirmation(true);
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
                    <span style={{ fontSize: '24px' }}>{getPlatformIcon(post.platform)}</span>
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
                    ✏️ Bearbeiten
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
              icon="💾"
              onClick={saveAllPosts}
              variant="active"
            />
            <ZenRoughButton
              label="📅 Publishing planen"
              icon="📅"
              onClick={() => setCurrentStep(5)}
              variant="active"
            />
            <ZenRoughButton
              label="→ Content Transmission"
              icon="🚀"
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
                maxWidth: '650px',
                width: '95%',
                maxHeight: '85vh',
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
                {getPlatformIcon(editingPost)} {getPlatformName(editingPost)} bearbeiten
              </h3>
              <div style={{ flex: 1, marginBottom: '12px', minHeight: 0 }}>
                <ZenMarkdownEditor
                  value={platformPosts.find(p => p.platform === editingPost)?.content || ''}
                  onChange={(newContent) => updatePostContent(editingPost, newContent)}
                  placeholder="Bearbeite deinen Post..."
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
    const handleScheduleSave = (posts: ScheduledPost[]) => {
      setScheduledPosts(posts);
      setShowScheduler(false);
      alert('Zeitplan erfolgreich gespeichert!');
    };

    const handleAddPostFromCalendar = (date: Date) => {
      setSelectedDateFromCalendar(date);
      setShowCalendar(false);
      setShowScheduler(true);
    };

    const handleExportCalendar = () => {
      try {
        const stats = getScheduleStats(scheduledPosts);
        if (!stats.canExport) {
          alert('Keine geplanten Posts zum Exportieren. Bitte erst Zeitplan festlegen.');
          return;
        }
        downloadICSFile(scheduledPosts);
        alert('Kalender erfolgreich exportiert!');
      } catch (error) {
        alert('Fehler beim Exportieren: ' + (error as Error).message);
      }
    };

    const stats = getScheduleStats(scheduledPosts);

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
              }}
            >
              📅 Publishing Management
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
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
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
              <div style={{ fontSize: '48px', textAlign: 'center' }}>📅</div>
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
                icon="📅"
                onClick={() => setShowScheduler(true)}
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
              <div style={{ fontSize: '48px', textAlign: 'center' }}>🗓️</div>
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
                icon="🗓️"
                onClick={() => setShowCalendar(true)}
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
                onClick={() => setShowChecklist(true)}
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
                  💡 Lege zuerst einen Zeitplan fest, um den Kalender zu exportieren
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

        {/* Modals */}
        <ZenPublishScheduler
          isOpen={showScheduler}
          onClose={() => {
            setShowScheduler(false);
            setSelectedDateFromCalendar(undefined);
          }}
          posts={platformPosts}
          onScheduleSave={handleScheduleSave}
          preSelectedDate={selectedDateFromCalendar}
        />

        <ZenContentCalendar
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          scheduledPosts={scheduledPosts}
          onAddPost={handleAddPostFromCalendar}
        />

        <ZenTodoChecklist
          isOpen={showChecklist}
          onClose={() => setShowChecklist(false)}
          scheduledPosts={scheduledPosts}
        />
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
        // For blog-post template, show platform selection
        if (selectedTemplate === 'blog-post' && platformPosts.length === 0) {
          return renderStep2_5_PlatformSelection();
        }
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
      <ZenHeader
        leftText={
    <>
      ZenPost Studio • <span style={{ color: "#AC8E66" }}>Doc Studio</span>
    </>
  }
        rightText={
          <>
            Schritt {currentStep}/{selectedTemplate === 'blog-post' ? '5' : '3'} • <span style={{ color: "#AC8E66" }}>{getStepTitle()}</span>
          </>
        }
        onBack={handleBack}
        onSettings={() => setShowSettings(true)}
        showSettingsNotification={showSettingsNotification}
        onDismissNotification={() => setShowSettingsNotification(false)}
      />

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
    </div>
  );
}
