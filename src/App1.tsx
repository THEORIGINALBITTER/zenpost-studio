import { useState } from "react";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { DataRoomScreen } from "./screens/DataRoomScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";

type Screen = "welcome" | "converter" | "content-transform" | "data-room" | "doc-studio";

export default function App1() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");

  const handleSelectMarkdown = () => {
    console.log("Markdown selected");
    setCurrentScreen("converter");
  };

  const handleSelectEditorJS = () => {
    console.log("Editor.js selected");
    setCurrentScreen("converter");
  };

  const handleSelectContentTransform = () => {
    console.log("Content Transform selected");
    setCurrentScreen("content-transform");
  };

  const handleSelectDataRoom = () => {
    console.log("Data Room selected");
    setCurrentScreen("data-room");
  };

  const handleSelectDocStudio = () => {
    console.log("Doc Studio selected");
    setCurrentScreen("doc-studio");
  };

  const handleBackToWelcome = () => {
    setCurrentScreen("welcome");
  };

  if (currentScreen === "converter") {
    return <ConverterScreen onBack={handleBackToWelcome} />;
  }

  if (currentScreen === "content-transform") {
    return <ContentTransformScreen onBack={handleBackToWelcome} />;
  }

  if (currentScreen === "data-room") {
    return <DataRoomScreen onBack={handleBackToWelcome} />;
  }

  if (currentScreen === "doc-studio") {
    return <DocStudioScreen onBack={handleBackToWelcome} />;
  }

  return (
    <WelcomeScreen
      onSelectMarkdown={handleSelectMarkdown}
      onSelectEditorJS={handleSelectEditorJS}
      onSelectContentTransform={handleSelectContentTransform}
      onSelectDataRoom={handleSelectDataRoom}
      onSelectDocStudio={handleSelectDocStudio}
    />
  );
}
