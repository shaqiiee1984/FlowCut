import React, { useState } from 'react';
import './App.css';
import TabsNavigation from './components/TabsNavigation';
import SilenceRemovalTab from './components/SilenceRemovalTab';
import CombineClipsTab from './components/CombineClipsTab';
import ExtractCaptionsTab from './components/ExtractCaptionsTab';

function App() {
  const [activeTab, setActiveTab] = useState('silence');

  return (
    <div className="app-container">
      <TabsNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'silence' && <SilenceRemovalTab />}
      {activeTab === 'combine' && <CombineClipsTab />}
      {activeTab === 'captions' && <ExtractCaptionsTab />}
    </div>
  );
}

export default App;
