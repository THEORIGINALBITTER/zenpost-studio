import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

export function DataRoomScreen({ onBack }: DataRoomScreenProps) {
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
        // Skip hidden files
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
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
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
    // TODO: Implement AI-powered index generation
  };

  const renderFileNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isDirectory = node.type === 'directory';
    const isMarkdown = node.name.endsWith('.md');
    const indentStyle = { marginLeft: `${depth * 20}px` };

    return (
      <div key={node.path}>
        <button
          onClick={() => {
            if (isDirectory) {
              toggleDirectory(node.path);
            } else if (isMarkdown) {
              loadFile(node.path);
            }
          }}
          style={indentStyle}
          className={`
            flex items-center gap-2 py-2 px-3 w-full text-left
            hover:bg-amber-100 transition-colors rounded
            ${selectedFile === node.path ? 'bg-amber-200 font-bold' : ''}
          `}
        >
          <span className="text-xl">
            {isDirectory ? (node.isExpanded ? '📂' : '📁') : '📄'}
          </span>
          <span className={`${isMarkdown ? 'text-indigo-600 font-medium' : 'text-slate-800'}`}>
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

        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b-2 border-slate-800">
            <h2 className="text-2xl font-bold text-slate-800">
              {selectedFile.split('/').pop()}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={saveFile}
                disabled={isSaving}
                className="px-6 py-2 bg-cyan-400 text-slate-800 font-bold rounded hover:bg-cyan-500 disabled:opacity-50 transition-colors border-2 border-slate-800"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={closeEditor}
                className="px-6 py-2 bg-pink-400 text-slate-800 font-bold rounded hover:bg-pink-500 transition-colors border-2 border-slate-800"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 bg-white rounded-lg border-2 border-slate-800 p-4 overflow-hidden">
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

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-slate-800">
            📁 Data Room Manager
          </h1>
          <div className="flex gap-3">
            {rootPath && (
              <button
                onClick={generateIndex}
                className="px-6 py-3 bg-indigo-500 text-white font-bold rounded hover:bg-indigo-600 transition-colors border-2 border-slate-800"
              >
                🤖 Generate Index (AI)
              </button>
            )}
            <button
              onClick={selectFolder}
              className="px-6 py-3 bg-cyan-400 text-slate-800 font-bold rounded hover:bg-cyan-500 transition-colors border-2 border-slate-800"
            >
              📂 Select Folder
            </button>
          </div>
        </div>

        {!rootPath ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border-2 border-slate-800 p-6 shadow-lg">
            <div className="text-6xl mb-6">📁</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">No Folder Selected</h2>
            <p className="text-slate-600 mb-6 text-center max-w-md">
              Click "Select Folder" to choose your Data Room directory from your file system.
            </p>
            <button
              onClick={selectFolder}
              className="px-8 py-4 bg-indigo-500 text-white font-bold rounded hover:bg-indigo-600 transition-colors border-2 border-slate-800 text-lg"
            >
              📂 Select Data Room Folder
            </button>
          </div>
        ) : isLoading && !isEditing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
            <p className="text-xl text-slate-600">Loading Data Room...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border-2 border-slate-800 p-6 shadow-lg">
            <div className="mb-4 p-3 bg-amber-100 rounded border border-amber-300">
              <p className="text-sm text-slate-700">
                <strong>Current folder:</strong> {rootPath}
              </p>
            </div>
            <div className="space-y-1">
              {fileTree.map(node => renderFileNode(node))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-pink-400 rounded-lg border-2 border-slate-800 text-center">
          <p className="text-slate-800 font-medium">
            💡 Click on any .md file to edit • Changes are saved locally
          </p>
        </div>
      </div>

      <ZenFooterText />
    </div>
  );
}
