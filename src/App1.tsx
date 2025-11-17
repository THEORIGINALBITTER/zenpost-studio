import { useState } from "react";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";

type Screen = "welcome" | "converter" | "content-transform";

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

  const handleBackToWelcome = () => {
    setCurrentScreen("welcome");
  };

  if (currentScreen === "converter") {
    return <ConverterScreen onBack={handleBackToWelcome} />;
  }

  if (currentScreen === "content-transform") {
    return <ContentTransformScreen onBack={handleBackToWelcome} />;
  }

  return (
    <WelcomeScreen
      onSelectMarkdown={handleSelectMarkdown}
      onSelectEditorJS={handleSelectEditorJS}
      onSelectContentTransform={handleSelectContentTransform}
    />
  );
}
