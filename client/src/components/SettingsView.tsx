import React, { useState } from 'react';
import { GlassPane } from './GlassPane';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Settings, Upload, FileText, Folder, HelpCircle, Save, Plus, Trash2, Check, Building, Users, Key } from 'lucide-react';

interface SettingsViewProps {
    userRole: 'OWNER' | 'MANAGER' | 'VA';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ userRole }) => {
    const [activeTab, setActiveTab] = useState<'AGENCY' | 'SUBACCOUNT' | 'INSTRUCTIONS'>('AGENCY');

    // Mock State for Agency Settings
    const [agencyName, setAgencyName] = useState('Zenith Ops');
    const [primaryColor, setPrimaryColor] = useState('#4F46E5');

    // Mock State for Sub-account Context
    const [contextFiles, setContextFiles] = useState([
        { id: '1', name: 'Brand_Guidelines_2024.pdf', size: '2.4 MB', type: 'PDF' },
        { id: '2', name: 'Offer_Structure_V2.docx', size: '1.1 MB', type: 'DOC' }
    ]);
    const [instructions, setInstructions] = useState(
        "Always maintain a professional yet approachable tone. When discussing pricing, emphasize value over cost. Never promise specific ROI figures without a disclaimer."
    );

    return (
        <div className="h-full flex flex-col gap-6 p-4 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-6 h-6 text-slate-600" />
                        Settings & Configuration
                    </h2>
                    <p className="text-slate-500 text-sm">Manage agency preferences, sub-account context, and system instructions.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 shrink-0">
                <button
                    onClick={() => setActiveTab('AGENCY')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'AGENCY' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Building className="w-4 h-4" /> Agency Settings
                </button>
                <button
                    onClick={() => setActiveTab('SUBACCOUNT')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'SUBACCOUNT' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Users className="w-4 h-4" /> Sub-account Context
                </button>
                <button
                    onClick={() => setActiveTab('INSTRUCTIONS')}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'INSTRUCTIONS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <HelpCircle className="w-4 h-4" /> Instructions & Guides
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">

                {/* AGENCY SETTINGS */}
                {activeTab === 'AGENCY' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <GlassPane title="General Configuration" className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label>Agency Name</Label>
                                <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Whitelabel Domain</Label>
                                <div className="flex gap-2">
                                    <Input placeholder="app.youragency.com" />
                                    <Button variant="outline">Verify</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Brand Color</Label>
                                <div className="flex gap-2 items-center">
                                    <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: primaryColor }}></div>
                                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" />
                                </div>
                            </div>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </GlassPane>

                        <GlassPane title="API Integrations" className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Key className="w-4 h-4 text-slate-400" /> OpenAI API
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Connected</Badge>
                                    </div>
                                    <Input type="password" value="sk-........................" disabled className="bg-white" />
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Key className="w-4 h-4 text-slate-400" /> GoHighLevel OAuth
                                        </div>
                                        <Badge variant="outline" className="text-slate-500">Not Connected</Badge>
                                    </div>
                                    <Button variant="outline" className="w-full">Connect GoHighLevel</Button>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 font-bold text-slate-700">
                                            <Key className="w-4 h-4 text-slate-400" /> Twilio / LeadConnector
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Connected</Badge>
                                    </div>
                                    <div className="text-xs text-slate-500">Using Sub-account default credentials.</div>
                                </div>
                            </div>
                        </GlassPane>
                    </div>
                )}

                {/* SUB-ACCOUNT CONTEXT */}
                {activeTab === 'SUBACCOUNT' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <GlassPane title="Knowledge Base & Context" className="flex-1 p-6 flex flex-col min-h-0">
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer mb-6">
                                    <Upload className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                                    <p className="font-medium text-slate-700">Drop PDF, DOCX, or TXT files here</p>
                                    <p className="text-sm text-slate-400">or click to browse</p>
                                </div>

                                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Folder className="w-4 h-4 text-slate-400" /> Active Files
                                </h3>
                                <div className="space-y-2 overflow-y-auto flex-1 min-h-[200px]">
                                    {contextFiles.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {file.type}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-700 text-sm">{file.name}</p>
                                                    <p className="text-xs text-slate-400">{file.size}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </GlassPane>
                        </div>

                        <div className="flex flex-col gap-6">
                            <GlassPane title="Agent Instructions" className="flex-1 p-6 flex flex-col">
                                <p className="text-sm text-slate-500 mb-4">
                                    Define specific behavioral rules for the AI agents operating on this sub-account.
                                </p>
                                <Textarea
                                    className="flex-1 min-h-[300px] font-mono text-sm leading-relaxed resize-none p-4"
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                />
                                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <Save className="w-4 h-4 mr-2" /> Update Instructions
                                </Button>
                            </GlassPane>
                        </div>
                    </div>
                )}

                {/* INSTRUCTIONS / HOW-TO */}
                {activeTab === 'INSTRUCTIONS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: 'Getting Started', icon: '🚀', desc: 'Quick start guide for setting up your first agent.' },
                            { title: 'Context Management', icon: '📚', desc: 'How to upload and manage knowledge base files.' },
                            { title: 'Voice Agent Setup', icon: '🎙️', desc: 'Configuring outbound calling campaigns and scripts.' },
                            { title: 'Email Automation', icon: '✉️', desc: 'Connecting inboxes and setting up auto-drafting.' },
                            { title: 'Troubleshooting', icon: '🔧', desc: 'Common issues and how to resolve them.' },
                            { title: 'API Documentation', icon: '🔌', desc: 'Developer guide for custom integrations.' },
                        ].map((guide, i) => (
                            <GlassPane key={i} className="p-6 cursor-pointer hover:border-indigo-300 transition-all group">
                                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{guide.icon}</div>
                                <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{guide.title}</h3>
                                <p className="text-slate-500 text-sm">{guide.desc}</p>
                                <div className="mt-4 flex items-center text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                    Read Guide <Check className="w-4 h-4 ml-1" />
                                </div>
                            </GlassPane>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};
