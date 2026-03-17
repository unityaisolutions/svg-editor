import { useState, useRef, type ChangeEvent } from 'react';
import './index.css';

interface Layer {
  id: string;
  tag: string;
  fill: string;
  node: Element;
}

export default function App() {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const svgDocRef = useRef<Document | null>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      svgDocRef.current = doc;
      updateStateFromDoc();
    };
    reader.readAsText(file);
  };

  const updateStateFromDoc = () => {
    if (!svgDocRef.current) return;
    const serializer = new XMLSerializer();
    const newSvgString = serializer.serializeToString(svgDocRef.current.documentElement);
    setSvgContent(newSvgString);

    // Extract basic shapes to act as editable layers
    const allElements = Array.from(svgDocRef.current.querySelectorAll('*'));
    const shapeTags = ['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline'];
    const extractedLayers = allElements
      .filter((el) => shapeTags.includes(el.tagName.toLowerCase()))
      .map((node, index) => ({
        id: node.id || `Layer ${index + 1}`,
        tag: node.tagName,
        fill: node.getAttribute('fill') || '#000000',
        node,
      }));
    setLayers(extractedLayers);
  };

  const handleColorChange = (index: number, color: string) => {
    const layer = layers[index];
    layer.node.setAttribute('fill', color);
    layer.node.setAttribute('stroke', color); 
    // Clear inline styles that might override the attribute
    if (layer.node instanceof SVGElement) {
      layer.node.style.fill = '';
      layer.node.style.stroke = '';
    }
    updateStateFromDoc();
  };

  const exportImage = (format: 'png' | 'jpeg') => {
    if (!svgContent) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Convert SVG string to a data URL
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width || 800;
      canvas.height = img.height || 600;
      
      if (format === 'jpeg') {
        ctx!.fillStyle = '#ffffff'; // JPEG doesn't support transparency, fill white
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx!.drawImage(img, 0, 0);
      const outUrl = canvas.toDataURL(`image/${format}`);
      
      const a = document.createElement('a');
      a.href = outUrl;
      a.download = `edited-image.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="editor-container">
      <aside className="sidebar">
        <h2>SVG Editor</h2>
        
        <div className="control-group">
          <label className="upload-btn">
            Upload SVG
            <input type="file" accept=".svg" onChange={handleFileUpload} hidden />
          </label>
        </div>

        {layers.length > 0 && (
          <div className="layers-panel">
            <h3>Layers ({layers.length})</h3>
            {layers.map((layer, idx) => (
              <div key={idx} className="layer-item">
                <span className="layer-name">{layer.tag} - {layer.id}</span>
                <input
                  type="color"
                  value={layer.fill.startsWith('#') ? layer.fill : '#000000'}
                  onChange={(e) => handleColorChange(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        {svgContent && (
          <div className="export-panel">
            <h3>Export</h3>
            <button onClick={() => exportImage('png')}>Export PNG</button>
            <button onClick={() => exportImage('jpeg')}>Export JPG</button>
          </div>
        )}
      </aside>

      <main className="canvas-area">
        {svgContent ? (
          <div
            className="svg-preview"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <p>Upload an SVG file to get started.</p>
        )}
      </main>
    </div>
  );
}