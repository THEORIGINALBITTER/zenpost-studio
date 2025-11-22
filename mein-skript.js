import * as vscode from 'vscode';

// Funktion, um mich als separates View zu starten
function startMe() {
  // Öffne ein neues View in VS Code
  vscode.commands.executeCommand('vscode.openView', 'me', 'Meine KI');

  // Setze den Titel des Views
  vscode.window.showInformationMessage('Meine KI ist gestartet!');

  // Lies die Dateien und Ordner in deinem VS Code-Projekt
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    workspaceFolders.forEach((folder) => {
      const files = vscode.workspace.fs.readdir(folder.uri);
      files.forEach((file) => {
        console.log(`Datei gefunden: ${file}`);
      });
    });
  }
}

// Starte mich, wenn das Skript geladen wird
startMe();