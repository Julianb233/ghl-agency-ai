import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Spinner } from './ui/spinner';
import { SessionReplayPlayer } from './SessionReplayPlayer';
import { Globe, Zap, Eye, Play, Code, Database, RefreshCw, Monitor, Terminal, FileText, Video, ChevronDown, ChevronUp, Key } from 'lucide-react';
import { useAIChat, useObservePage, useExtractData, useSessionReplay, useListSessions } from '@/hooks/useAI';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface AIBrowserPanelProps {
  onLog?: (message: string) => void;
}

export const AIBrowserPanel: React.FC<AIBrowserPanelProps> = ({ onLog }) => {
  // Initialize tRPC hooks
  const chatHook = useAIChat();
  const observeHook = useObservePage();
  const extractHook = useExtractData();
  const sessionsQuery = useListSessions();

  const [result, setResult] = useState<any>(null);

  // Execute form state
  const [executeUrl, setExecuteUrl] = useState('https://google.com');
  const [executeInstruction, setExecuteInstruction] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [onePasswordEmail, setOnePasswordEmail] = useState('');

  // Predefined location options for cleaner UX
  const locationOptions = [
    { value: '', label: 'Auto (Default)', geo: undefined },
    { value: 'nyc', label: 'New York, NY', geo: { city: 'NEW_YORK', state: 'NY', country: 'US' } },
    { value: 'la', label: 'Los Angeles, CA', geo: { city: 'LOS_ANGELES', state: 'CA', country: 'US' } },
    { value: 'chicago', label: 'Chicago, IL', geo: { city: 'CHICAGO', state: 'IL', country: 'US' } },
    { value: 'miami', label: 'Miami, FL', geo: { city: 'MIAMI', state: 'FL', country: 'US' } },
    { value: 'seattle', label: 'Seattle, WA', geo: { city: 'SEATTLE', state: 'WA', country: 'US' } },
    { value: 'london', label: 'London, UK', geo: { city: 'LONDON', state: '', country: 'GB' } },
    { value: 'toronto', label: 'Toronto, Canada', geo: { city: 'TORONTO', state: 'ON', country: 'CA' } },
  ];

  const getSelectedGeolocation = () => {
    const location = locationOptions.find(l => l.value === selectedLocation);
    return location?.geo;
  };

  // Observe form state
  const [observeUrl, setObserveUrl] = useState('');
  const [observeInstruction, setObserveInstruction] = useState('');

  // Extract form state
  const [extractUrl, setExtractUrl] = useState('');
  const [extractInstruction, setExtractInstruction] = useState('');
  const [extractType, setExtractType] = useState<'contactInfo' | 'productInfo' | 'custom'>('contactInfo');

  // Session replay state
  const [sessionId, setSessionId] = useState('');
  const replayQuery = useSessionReplay(sessionId);

  // Collapsible sections state
  const [controlsOpen, setControlsOpen] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);
  const [replayOpen, setReplayOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  // Computed loading state from all hooks
  const isLoading = chatHook.isLoading || observeHook.isLoading || extractHook.isLoading || replayQuery.isLoading || sessionsQuery.isLoading;

  const handleExecuteAction = async () => {
    onLog?.(`Executing: ${executeInstruction}`);

    try {
      const geolocation = getSelectedGeolocation();
      const result = await chatHook.execute({
        instruction: executeInstruction,
        startUrl: executeUrl,
        geolocation,
      });

      setResult(result);
      onLog?.(`✓ Success! Session: ${result.sessionId}`);
    } catch (error) {
      onLog?.(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult({ success: false, error: String(error) });
    }
  };

  const handleObservePage = async () => {
    onLog?.(`Observing page: ${observeUrl}`);

    try {
      const result = await observeHook.observe({
        url: observeUrl,
        instruction: observeInstruction,
      });

      setResult(result);
      onLog?.(`✓ Found ${result.actions?.length || 0} actions`);
    } catch (error) {
      onLog?.(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult({ success: false, error: String(error) });
    }
  };

  const handleExtractData = async () => {
    onLog?.(`Extracting ${extractType} from: ${extractUrl}`);

    try {
      const result = await extractHook.extract({
        url: extractUrl,
        instruction: extractInstruction,
        schemaType: extractType,
      });

      setResult(result);
      onLog?.(`✓ Extracted data successfully`);
    } catch (error) {
      onLog?.(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResult({ success: false, error: String(error) });
    }
  };

  const handleLoadReplay = async () => {
    if (!sessionId) return;

    onLog?.(`Loading replay for session: ${sessionId}`);

    try {
      await replayQuery.refetch();
      onLog?.(`✓ Replay loaded`);
    } catch (error) {
      onLog?.(`✗ Error loading replay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadSessions = async () => {
    onLog?.('Loading active sessions...');

    try {
      await sessionsQuery.refetch();
      onLog?.(`✓ Found ${sessionsQuery.sessions.length} sessions`);
    } catch (error) {
      onLog?.(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="h-full space-y-3 p-2 sm:p-4 max-w-7xl mx-auto">
      {/* PROMINENT LIVE BROWSER VIEW - Always visible when active */}
      {result?.liveViewUrl && (
        <Card className="border-2 border-green-500 shadow-lg">
          <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Monitor className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="font-bold text-green-700">🔴 Live Browser View</span>
              <Badge className="ml-auto bg-green-600">Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="aspect-video w-full bg-slate-100 rounded-lg overflow-hidden mb-3">
              <iframe
                src={result.liveViewUrl}
                className="w-full h-full border-0"
                title="Live Browser View"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={result.liveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs sm:text-sm text-center bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-medium transition"
              >
                Open in New Tab
              </a>
              {result.sessionUrl && (
                <a
                  href={result.sessionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs sm:text-sm text-center bg-slate-600 hover:bg-slate-700 text-white py-2 px-3 rounded-lg font-medium transition"
                >
                  View Dashboard
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CONTROLS - Collapsible */}
      <Card className="overflow-hidden">
        <Collapsible open={controlsOpen} onOpenChange={setControlsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition bg-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-slate-800">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Browser Controls
                </CardTitle>
                {controlsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4 space-y-4">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => {
                    setExecuteInstruction('');
                    setObserveInstruction('');
                    setExtractInstruction('');
                  }}
                >
                  <Zap className="h-4 w-4" />
                  <span className="text-xs">Execute</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => setObserveInstruction('')}
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">Observe</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => setExtractInstruction('')}
                >
                  <Database className="h-4 w-4" />
                  <span className="text-xs">Extract</span>
                </Button>
              </div>

              {/* Execute Action Form */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-bold">Execute Browser Action</Label>

                <div className="space-y-2">
                  <Label htmlFor="execute-url" className="text-xs">Start URL</Label>
                  <Input
                    id="execute-url"
                    value={executeUrl}
                    onChange={(e) => setExecuteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="execute-instruction" className="text-xs">AI Instruction</Label>
                  <Textarea
                    id="execute-instruction"
                    value={executeInstruction}
                    onChange={(e) => setExecuteInstruction(e.target.value)}
                    placeholder="Search for React tutorials and click the first result"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Browser Location */}
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-xs flex items-center gap-2">
                    <Globe className="h-3 w-3 text-slate-500" />
                    Browser Location
                  </Label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger id="location" className="text-sm bg-white">
                      <SelectValue placeholder="Select location..." />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-500">
                    Choose where the browser should appear to be located
                  </p>
                </div>

                {/* 1Password Integration */}
                <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <Label htmlFor="onepassword-email" className="text-xs flex items-center gap-2">
                    <Key className="h-3 w-3 text-blue-600" />
                    1Password Authentication (Optional)
                  </Label>
                  <Input
                    id="onepassword-email"
                    value={onePasswordEmail}
                    onChange={(e) => setOnePasswordEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="text-sm h-9"
                  />
                  <p className="text-[10px] text-blue-600">
                    Connect your 1Password account to auto-fill credentials during browser automation
                  </p>
                </div>

                <Button
                  onClick={handleExecuteAction}
                  disabled={isLoading || !executeInstruction}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Execute Action
                    </>
                  )}
                </Button>
              </div>

              {/* Observe Page Form */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-bold">Observe Page</Label>

                <div className="space-y-2">
                  <Label htmlFor="observe-url" className="text-xs">Page URL</Label>
                  <Input
                    id="observe-url"
                    value={observeUrl}
                    onChange={(e) => setObserveUrl(e.target.value)}
                    placeholder="https://example.com/form"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observe-instruction" className="text-xs">What to observe</Label>
                  <Textarea
                    id="observe-instruction"
                    value={observeInstruction}
                    onChange={(e) => setObserveInstruction(e.target.value)}
                    placeholder="fill out all fields on the page with dummy data"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <Button
                  onClick={handleObservePage}
                  disabled={isLoading || !observeUrl || !observeInstruction}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Observing...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Observe Page
                    </>
                  )}
                </Button>
              </div>

              {/* Extract Data Form */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-sm font-bold">Extract Data</Label>

                <div className="space-y-2">
                  <Label htmlFor="extract-url" className="text-xs">Page URL</Label>
                  <Input
                    id="extract-url"
                    value={extractUrl}
                    onChange={(e) => setExtractUrl(e.target.value)}
                    placeholder="https://example.com/contact"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extract-type" className="text-xs">Data Type</Label>
                  <Select value={extractType} onValueChange={(v: any) => setExtractType(v)}>
                    <SelectTrigger id="extract-type" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contactInfo">Contact Information</SelectItem>
                      <SelectItem value="productInfo">Product Information</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extract-instruction" className="text-xs">Extraction Instruction</Label>
                  <Textarea
                    id="extract-instruction"
                    value={extractInstruction}
                    onChange={(e) => setExtractInstruction(e.target.value)}
                    placeholder="get the contact information of the company"
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <Button
                  onClick={handleExtractData}
                  disabled={isLoading || !extractUrl || !extractInstruction}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Extract Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* TERMINAL & LOGS - Collapsible */}
      <Card className="overflow-hidden">
        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition bg-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-slate-800">
                  <Terminal className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Terminal & Logs
                </CardTitle>
                {logsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4">
              <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs sm:text-sm min-h-[200px] max-h-[400px] overflow-auto">
                {result ? (
                  <div className="space-y-2">
                    <div className="text-blue-400"># Session Information</div>
                    {result.sessionId && <div>$ Session ID: {result.sessionId}</div>}
                    {result.success && <div className="text-green-500">✓ {result.message || 'Action completed successfully'}</div>}
                    {result.error && <div className="text-red-500">✗ Error: {result.error}</div>}
                    {result.prompt && <div className="text-yellow-400">Prompt: {result.prompt}</div>}
                    <div className="text-slate-500 text-[10px] mt-4">
                      Use the session ID above to view replay or check logs
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    $ Waiting for browser action...
                    <div className="mt-2 text-[10px]">
                      Execute an action to see terminal output here
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* SESSION REPLAY - Collapsible */}
      <Card className="overflow-hidden">
        <Collapsible open={replayOpen} onOpenChange={setReplayOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition bg-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-slate-800">
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  Session Replay
                </CardTitle>
                {replayOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID"
                  className="flex-1 text-sm"
                />
                <Button onClick={handleLoadReplay} disabled={isLoading || !sessionId}>
                  {isLoading ? <Spinner className="h-4 w-4" /> : 'Load'}
                </Button>
              </div>

              {result?.recordingUrl && (
                <a
                  href={result.recordingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs sm:text-sm text-center bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg font-medium transition"
                >
                  📹 View Recording
                </a>
              )}

              {replayQuery.replay && (
                <div className="w-full overflow-hidden aspect-video relative border-2 border-purple-300 rounded-lg">
                  <div className="absolute inset-0">
                    <SessionReplayPlayer
                      sessionId={replayQuery.replay.sessionId}
                      events={replayQuery.replay.events}
                      width="100%"
                      height="100%"
                    />
                  </div>
                </div>
              )}

              {!replayQuery.replay && !result?.recordingUrl && (
                <div className="text-center text-sm text-slate-500 py-8">
                  <Video className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No replay loaded. Enter a session ID above or execute an action.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* ACTIVE SESSIONS - Collapsible */}
      <Card className="overflow-hidden">
        <Collapsible open={sessionsOpen} onOpenChange={setSessionsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition bg-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-slate-800">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  Active Sessions
                  {sessionsQuery.sessions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {sessionsQuery.sessions.length}
                    </Badge>
                  )}
                </CardTitle>
                {sessionsOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <Button
                onClick={handleLoadSessions}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Sessions
              </Button>

              {sessionsQuery.sessions.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {sessionsQuery.sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent hover:border-purple-300 transition"
                      onClick={() => setSessionId(session.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono">{session.id}</code>
                        <Badge variant={session.status === 'running' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Click to load replay
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-8">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  No active sessions. Execute an action to create one.
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
