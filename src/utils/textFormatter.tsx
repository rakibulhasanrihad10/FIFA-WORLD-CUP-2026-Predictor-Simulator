import React from 'react';

const COLORS = [
  '#f59e0b', // Amber/Gold
  '#38bdf8', // Sky Blue
  '#f43f5e', // Rose/Pink
  '#c084fc', // Purple/Lavender
  '#fb923c', // Orange
  '#2dd4bf', // Teal
  '#f472b6', // Light Pink
  '#60a5fa', // Blue
  '#fb7185', // Coral Rose
];

export function parseScenarioText(text: string | undefined): React.ReactNode {
  if (!text) return null;

  // Split text by capturing <selected>...</selected> and <country>...</country> tags
  const regex = /(<selected>.*?<\/selected>|<country>.*?<\/country>)/g;
  const parts = text.split(regex);

  // Keep a map from country name (lowercased) to color, so each country gets the same color consistently in this text block
  const countryColorMap: { [key: string]: string } = {};
  let colorIndex = 0;

  return parts.map((part, index) => {
    if (part.startsWith('<selected>') && part.endsWith('</selected>')) {
      const name = part.slice(10, -11);
      // Searched country is ALWAYS emerald green
      return (
        <span key={index} className="text-emerald-400 font-extrabold" style={{ color: '#10b981' }}>
          {name}
        </span>
      );
    } else if (part.startsWith('<country>') && part.endsWith('</country>')) {
      const name = part.slice(9, -10);
      const nameKey = name.trim().toLowerCase();
      
      // Determine color for this country
      if (!countryColorMap[nameKey]) {
        const color = COLORS[colorIndex % COLORS.length];
        countryColorMap[nameKey] = color;
        colorIndex++;
      }
      const color = countryColorMap[nameKey];

      return (
        <span key={index} className="font-bold" style={{ color }}>
          {name}
        </span>
      );
    } else {
      return part;
    }
  });
}
