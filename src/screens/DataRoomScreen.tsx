import { useState } from 'react';
import type { ReactElement } from 'react';
import { readDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { ZenHeader } from '../kits/PatternKit/ZenHeader';
import { ZenFooterText } from '../kits/PatternKit/ZenModalSystem';
import { ZenMarkdownEditor } from '../kits/PatternKit/ZenMarkdownEditor';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isExpanded?: boolean;
}

interface DataRoomScreenProps {
  onBack: () => void;
}

export function DataRoomScreen({}: DataRoomScreenProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rootPath, setRootPath] = useState<string | null>(null);

  const selectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select your Data Room folder',
      });

      if (selected && typeof selected === 'string') {
        setRootPath(selected);
        await loadFileTree(selected);
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      alert('Could not open folder picker');
    }
  };

  const loadFileTree = async (path: string) => {
    setIsLoading(true);
    try {
      const tree = await buildFileTree(path);
      setFileTree(tree);
    } catch (error) {
      console.error('Error loading file tree:', error);
      alert('Could not load Data Room structure');
    } finally {
      setIsLoading(false);
    }
  };

  const buildFileTree = async (path: string): Promise<FileNode[]> => {
    try {
      const entries = await readDir(path);
      const nodes: FileNode[] = [];

      for (const entry of entries) {
        if (entry.name?.startsWith('.')) continue;

        const fullPath = `${path}/${entry.name}`;
        const node: FileNode = {
          name: entry.name || 'Unknown',
          path: fullPath,
          type: entry.isDirectory ? 'directory' : 'file',
          isExpanded: false,
        };

        if (entry.isDirectory) {
          node.children = await buildFileTree(fullPath);
        }

        nodes.push(node);
      }

      return nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error building file tree:', error);
      return [];
    }
  };

  const toggleDirectory = (path: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === path && node.type === 'directory') {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };
    setFileTree(updateTree(fileTree));
  };

  const loadFile = async (path: string) => {
    setIsLoading(true);
    try {
      const content = await readTextFile(path);
      setFileContent(content);
      setSelectedFile(path);
      setIsEditing(true);
    } catch (error) {
      console.error('Error loading file:', error);
      alert('Could not load file');
    } finally {
      setIsLoading(false);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      await writeTextFile(selectedFile, fileContent);
      alert('File saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Could not save file');
    } finally {
      setIsSaving(false);
    }
  };

  const closeEditor = () => {
    setIsEditing(false);
    setSelectedFile(null);
    setFileContent('');
  };

  const generateIndex = async () => {
    alert(
      'Generate Index with AI\n\nThis feature will analyze your Data Room structure and generate a navigable HTML index.\n\nComing soon!'
    );
  };

  const renderFileNode = (node: FileNode, depth: number = 0): ReactElement => {
    const isDirectory = node.type === 'directory';
    const isMarkdown = node.name.endsWith('.md');
    const indentStyle = { marginLeft: `${depth * 20}px` };

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (isDirectory) toggleDirectory(node.path);
            else if (isMarkdown) loadFile(node.path);
          }}
          style={{ ...indentStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', width: '100%', textAlign: 'left' }}
          className={`
            hover:bg-amber-100 transition-colors rounded
            ${selectedFile === node.path ? 'bg-amber-200 font-bold' : ''}
          `}
        >
          <span style={{ fontSize: '1.25rem' }}>
            {isDirectory ? (node.isExpanded ? '📂' : '📁') : '📄'}
          </span>
          <span className={isMarkdown ? 'text-indigo-600 font-medium' : 'text-slate-800'}>
            {node.name}
          </span>
        </button>

        {isDirectory && node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isEditing && selectedFile) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col">
        <ZenHeader />
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full" style={{ padding: '1.5rem' }}>
          <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-slate-800" style={{ marginBottom: '1rem', paddingBottom: '1rem' }}>
            <h2 className="text-2xl font-bold text-slate-800">
              {selectedFile.split('/').pop()}
            </h2>
            <div className="flex" style={{ gap: '0.75rem' }}>
              <button
                onClick={saveFile}
                disabled={isSaving}
                className="bg-cyan-400 text-slate-800 font-bold rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors border-2 border-slate-800"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={closeEditor}
                className="bg-pink-400 text-slate-800 font-bold rounded hover:bg-pink-500 transition-colors border-2 border-slate-800"
                style={{ padding: '0.5rem 1.5rem' }}
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-lg border-2 border-slate-800 overflow-hidden" style={{ padding: '1rem' }}>
            <ZenMarkdownEditor
              value={fileContent}
              onChange={setFileContent}
              placeholder="Edit your markdown content..."
            />
          </div>
        </div>
        <ZenFooterText />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <ZenHeader />
      <div className="flex-1 max-w-7xl mx-auto w-full" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center mb-6" style={{ marginBottom: '1.5rem' }}>
          <h1 className="text-4xl font-bold text-slate-800">
            📁 Data Room Manager
          </h1>
          <div className="flex" style={{ gap: '0.75rem' }}>
            {rootPath && (
              <button
                onClick={generateIndex}
                className="bg-indigo-500 text-white font-bold rounded hover:bg-indigo-600 transition-colors border-2 border-slate-800"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                🤖 Generate Index (AI)
              </button>
            )}
            <button
              onClick={selectFolder}
              className="bg-cyan-400 text-slate-800 font-bold rounded hover:bg-cyan-500 transition-colors border-2 border-slate-800"
              style={{ padding: '0.75rem 1.5rem' }}
            >
              📂 Select Folder
            </button>
          </div>
        </div>

        {!rootPath ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-lg border-2 border-slate-800 shadow-lg" style={{ padding: '1.5rem', paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div style={{ fontSize: '3.75rem', marginBottom: '1.5rem' }}>📁</div>
            <h2 className="text-2xl font-bold text-slate-800" style={{ marginBottom: '1rem' }}>No Folder Selected</h2>
            <p className="text-slate-600 text-center" style={{ marginBottom: '1.5rem', maxWidth: '24rem' }}>
              Click "Select Folder" to choose your Data Room directory from your file system.
            </p>
            <button
              onClick={selectFolder}
              className="bg-indigo-500 text-white font-bold rounded hover:bg-indigo-600 transition-colors border-2 border-slate-800"
              style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}
            >
              📂 Select Data Room Folder
            </button>
          </div>
        ) : isLoading && !isEditing ? (
          <div className="flex flex-col items-center justify-center" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600" style={{ marginBottom: '1rem' }}></div>
            <p className="text-xl text-slate-600">Loading Data Room...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-slate-800 shadow-lg" style={{ padding: '1.5rem' }}>
            <div className="mb-4 bg-amber-100 rounded border border-amber-300" style={{ marginBottom: '1rem', padding: '0.75rem' }}>
              <p className="text-sm text-slate-700">
                <strong>Current folder:</strong> {rootPath}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {fileTree.map(node => renderFileNode(node))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-pink-400 rounded-lg border-2 border-slate-800 text-center" style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <p className="text-slate-800 font-medium">
            💡 Click on any .md file to edit • Changes are saved locally
          </p>
        </div>
      </div>
      <ZenFooterText />
    </div>
  );
}
