"use client";

import { Editor } from "@monaco-editor/react";
import { useState, useEffect } from "react";

interface CodeEditorProps {
  initialCode?: string;
  onChange?: (value: string | undefined) => void;
}

export default function CodeEditor({ initialCode = "", onChange }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);

  // Update code when initialCode changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || "");
    onChange?.(value);
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={code}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
} 