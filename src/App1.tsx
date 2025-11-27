import { useState } from "react";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { ConverterScreen } from "./screens/ConverterScreen";
import { ContentTransformScreen } from "./screens/ContentTransformScreen";
import { DocStudioScreen } from "./screens/DocStudioScreen";

type Screen = "welcome" | "converter" | "content-transform" | "doc-studio";

export default function App1() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");

  const handleSelectConverter = () => {
    console.log("Converter selected");
    setCurrentScreen("converter");
  };

  const handleSelectContentTransform = () => {
    console.log("Content Transform selected");
    setCurrentScreen("content-transform");
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

  if (currentScreen === "doc-studio") {
    return <DocStudioScreen onBack={handleBackToWelcome} />;
  }

  return (
    <WelcomeScreen
      onSelectConverter={handleSelectConverter}
      onSelectContentTransform={handleSelectContentTransform}
      onSelectDocStudio={handleSelectDocStudio}
    />
  );
}
