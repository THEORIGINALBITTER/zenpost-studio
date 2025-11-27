import { useState } from 'react';
import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { ZenHeader } from '../kits/PatternKit/ZenHeader';
import { ZenSettingsModal, ZenFooterText, ZenMetadataModal, ProjectMetadata, ZenGeneratingModal, ZenRoughButton, ZenSaveConfirmationModal } from '../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';
import { generateFromPrompt } from '../services/aiService';

interface DocStudioScreenProps {
  onBack: () => void;
}

type DocTemplate = 'readme' | 'changelog' | 'api-docs' | 'contributing' | 'blog-post';

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

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Projekt wählen';
      case 2: return 'Template wählen';
      case 3: return 'Generieren & Bearbeiten';
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
    setIsGenerating(true);

    try {
      // Create a prompt based on the template and project info
      let prompt = '';

      // Build metadata context
      const metadataContext = `
Author: ${metadata.authorName || '[Your Name]'}
Email: ${metadata.authorEmail || '[your@email.com]'}
${metadata.companyName ? `Company: ${metadata.companyName}` : ''}
License: ${metadata.license}
Year: ${metadata.year}
${metadata.website ? `Website: ${metadata.website}` : ''}
${metadata.repository ? `Repository: ${metadata.repository}` : ''}
${metadata.contributingUrl ? `Contributing Guide: ${metadata.contributingUrl}` : ''}
`;

      switch (template) {
        case 'readme':
          prompt = `Create a professional README.md for the following project:

Project Name: ${projectInfo.name}
Description: ${projectInfo.description}
Version: ${projectInfo.version}
File Types: ${projectInfo.fileTypes.join(', ')}
Has Tests: ${projectInfo.hasTests ? 'Yes' : 'No'}
Has API: ${projectInfo.hasApi ? 'Yes' : 'No'}
Dependencies: ${projectInfo.dependencies.slice(0, 10).join(', ')}

${metadataContext}

Include:
- Project title and description
- Installation instructions
- Usage examples
- Features list
- Technology stack
${projectInfo.hasApi ? '- API documentation section' : ''}
${projectInfo.hasTests ? '- Testing instructions' : ''}
- Contributing guidelines
- License information (use ${metadata.license} license with copyright ${metadata.year} ${metadata.authorName || '[Author Name]'})

IMPORTANT: Use the metadata provided above. Replace placeholders like [Year] with ${metadata.year} and [Your Name] with ${metadata.authorName || 'the author name from metadata'}.

Make it clear, professional, and ready to use on GitHub.`;
          break;

        case 'changelog':
          prompt = `Create a CHANGELOG.md file for ${projectInfo.name} (version ${projectInfo.version}).

Follow the "Keep a Changelog" format with:
- [Unreleased] section
- Version ${projectInfo.version} with today's date
- Categories: Added, Changed, Deprecated, Removed, Fixed, Security
- Professional tone
- Clear, concise descriptions`;
          break;

        case 'api-docs':
          prompt = `Create API documentation for ${projectInfo.name}.

Include:
- API Overview
- Base URL and Authentication
- Common endpoints structure
- Request/Response examples
- Error handling
- Rate limiting information
- Code examples in multiple languages

Make it comprehensive and developer-friendly.`;
          break;

        case 'contributing':
          prompt = `Create a CONTRIBUTING.md guide for ${projectInfo.name}.

Include:
- Welcome message
- Code of conduct reference
- How to set up development environment
- Coding standards and style guide
- Testing requirements
- Pull request process
- Issue reporting guidelines
- Community and support info`;
          break;

        case 'blog-post':
          prompt = `Write an engaging blog post about ${projectInfo.name}.

Description: ${projectInfo.description}
Tech Stack: ${projectInfo.fileTypes.slice(0, 5).join(', ')}

Include:
- Catchy title and introduction
- Problem statement
- Solution overview
- Key features and benefits
- Technical highlights
- Code examples
- Conclusion and call-to-action
- Relevant tags

Make it engaging for developers and suitable for Dev.to, Medium, or Hashnode.`;
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

      setGeneratedContent(result.data);
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
      const fileName = selectedTemplate === 'blog-post'
        ? `blog-post-${Date.now()}.md`
        : `${selectedTemplate.toUpperCase()}.md`;

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
                fontSize: '24px',
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
              }}
            >
              Wähle deinen Projekt-Ordner, um die Struktur zu analysieren und automatisch professionelle Dokumentation zu generieren.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <ZenRoughButton
                label="Projekt-Ordner wählen"
                icon="📂"
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
        {/* Project Info Card */}
        {projectInfo && (
          <div
            style={{
              backgroundColor: '#2A2A2A',
              borderRadius: '8px',
              border: '2px solid #AC8E66',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#e5e5e5',
                marginBottom: '16px',
              }}
            >
              📦 Projekt-Informationen
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
              }}
            >
              <div>
                <p style={{ fontSize: '14px', color: '#999' }}>Name</p>
                <p style={{ fontWeight: 'bold', color: '#e5e5e5' }}>
                  {projectInfo.name}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#999' }}>Version</p>
                <p style={{ fontWeight: 'bold', color: '#e5e5e5' }}>
                  {projectInfo.version}
                </p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <p style={{ fontSize: '14px', color: '#999' }}>Beschreibung</p>
                <p style={{ color: '#e5e5e5' }}>{projectInfo.description}</p>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#999' }}>Dateitypen</p>
                <p style={{ color: '#e5e5e5' }}>
                  {projectInfo.fileTypes.slice(0, 5).join(', ')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#999' }}>Features</p>
                <p style={{ color: '#e5e5e5' }}>
                  {projectInfo.hasTests ? '✅ Tests' : '❌ Keine Tests'} •
                  {projectInfo.hasApi ? ' ✅ API' : ' ❌ Keine API'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Template Selection */}
        <div
          style={{
            backgroundColor: '#2A2A2A',
            borderRadius: '8px',
            border: '2px solid #AC8E66',
            padding: '24px',
          }}
        >
          <h3
            style={{
              fontFamily: 'monospace',
              fontSize: '20px',
              color: '#e5e5e5',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            📝 Dokumentationstyp wählen
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
                  border: `2px solid ${selectedTemplate === template.id ? '#AC8E66' : '#3a3a3a'}`,
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
              fontSize: '14px',
              color: '#999',
              marginTop: '4px',
            }}
          >
            {projectInfo?.name} • Bearbeite und speichere deine Dokumentation
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
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
        leftText="ZenPost Studio • Doc Studio"
        rightText={`Schritt ${currentStep}/3 • ${getStepTitle()}`}
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
