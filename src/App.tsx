import React from 'react';
import { BrochureProvider } from './context/BrochureContext';
import { EditorPanel } from './components/editor/EditorPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { Printer } from 'lucide-react';

function App() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <BrochureProvider>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header 
          className="h-16 flex items-center justify-between px-6 border-b no-print"
          style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}
        >
          <h1 
            className="text-xl font-bold"
            style={{ color: '#1e3a5f' }}
          >
            📖 旅遊手冊產生器
          </h1>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            <Printer size={18} />
            列印 PDF
          </button>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Panel - 40% */}
          <div className="w-2/5 no-print border-r">
            <EditorPanel />
          </div>

          {/* Preview Panel - 60% */}
          <div className="w-3/5">
            <PreviewPanel />
          </div>
        </div>
      </div>
    </BrochureProvider>
  );
}

export default App;
