import React from 'react';
import { Scissors, Layers, MessageSquare } from 'lucide-react';

export default function TabsNavigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'silence', label: 'Silence Removal', icon: Scissors },
    { id: 'combine', label: 'Combine Clips', icon: Layers },
    { id: 'captions', label: 'Extract Captions', icon: MessageSquare }
  ];

  return (
    <div className="tabs">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon className="tab-icon" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
