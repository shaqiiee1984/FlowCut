import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Scissors, Layers, MessageSquare } from 'lucide-react';
import SilenceRemovalTab from './components/SilenceRemovalTab';
import CombineClipsTab from './components/CombineClipsTab';
import ExtractCaptionsTab from './components/ExtractCaptionsTab';

function App() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="max-w-[1280px] mx-auto px-6 py-10">
        <Tabs defaultValue="silence" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="silence" className="gap-2">
              <Scissors className="h-4 w-4" />
              Silence Removal
            </TabsTrigger>
            <TabsTrigger value="combine" className="gap-2">
              <Layers className="h-4 w-4" />
              Combine Clips
            </TabsTrigger>
            <TabsTrigger value="captions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Extract Captions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="silence">
            <SilenceRemovalTab />
          </TabsContent>
          <TabsContent value="combine">
            <CombineClipsTab />
          </TabsContent>
          <TabsContent value="captions">
            <ExtractCaptionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
