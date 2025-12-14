import React, { useState, useRef } from 'react';
import { ArrowRight, ArrowLeft, Palette, Upload, FileText, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { OnboardingData } from './OnboardingWizard';

interface BrandSetupStepProps {
  data: OnboardingData;
  onNext: (data: Partial<OnboardingData>) => void;
  onBack: () => void;
  onSkip: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const ACCEPTED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export function BrandSetupStep({ data, onNext, onBack, onSkip }: BrandSetupStepProps) {
  const [brandVoice, setBrandVoice] = useState(data.brandVoice || '');
  const [logoFile, setLogoFile] = useState<File | null>(data.logoFile || null);
  const [brandGuidelines, setBrandGuidelines] = useState<File[]>(data.brandGuidelines || []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const logoInputRef = useRef<HTMLInputElement>(null);
  const guidelinesInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrors(prev => ({ ...prev, logo: 'Please upload a PNG, JPG, or SVG file' }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, logo: 'File size must be less than 10MB' }));
      return;
    }

    setLogoFile(file);
    setErrors(prev => ({ ...prev, logo: '' }));
  };

  const handleGuidelinesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate each file
    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type) && !ACCEPTED_DOC_TYPES.includes(file.type)) {
        setErrors(prev => ({ ...prev, guidelines: 'Please upload PDF, DOC, or image files' }));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrors(prev => ({ ...prev, guidelines: 'Each file must be less than 10MB' }));
        return;
      }
    }

    setBrandGuidelines(prev => [...prev, ...files]);
    setErrors(prev => ({ ...prev, guidelines: '' }));
  };

  const removeGuideline = (index: number) => {
    setBrandGuidelines(prev => prev.filter((_, i) => i !== index));
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleContinue = () => {
    onNext({
      brandVoice,
      logoFile,
      brandGuidelines,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Palette className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Set Up Your Brand</h2>
        <p className="text-slate-600 text-lg max-w-2xl mx-auto">
          Help our AI understand your brand voice and visual identity
        </p>
      </div>

      {/* Brand Voice */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="brandVoice" className="text-base font-semibold">
            Brand Voice & Tone
            <span className="text-slate-400 font-normal ml-2">(Optional)</span>
          </Label>
          <p className="text-sm text-slate-500 mt-1">
            Describe how your brand communicates (e.g., "Professional and empathetic", "Casual and friendly")
          </p>
        </div>
        <Textarea
          id="brandVoice"
          value={brandVoice}
          onChange={(e) => setBrandVoice(e.target.value)}
          placeholder="We use a professional yet approachable tone. Our communication is clear, concise, and focuses on delivering value to our clients..."
          className="min-h-32 resize-none"
          maxLength={500}
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Help the AI match your communication style in automated messages</span>
          <span>{brandVoice.length}/500</span>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold">
            Company Logo
            <span className="text-slate-400 font-normal ml-2">(Optional)</span>
          </Label>
          <p className="text-sm text-slate-500 mt-1">
            Upload your logo for use in reports, emails, and campaigns
          </p>
        </div>

        {!logoFile ? (
          <div
            onClick={() => logoInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all"
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">Click to upload logo</p>
            <p className="text-xs text-slate-500">PNG, JPG, or SVG (max 10MB)</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4 bg-white">
            <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
              {logoFile.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(logoFile)}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-slate-800 truncate">{logoFile.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(logoFile.size)}</p>
            </div>
            <Button
              type="button"
              onClick={removeLogo}
              variant="ghost"
              size="sm"
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <input
          ref={logoInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          onChange={handleLogoChange}
          className="hidden"
        />
        {errors.logo && (
          <p className="text-sm text-red-600">{errors.logo}</p>
        )}
      </div>

      {/* Brand Guidelines Upload */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-semibold">
            Brand Guidelines
            <span className="text-slate-400 font-normal ml-2">(Optional)</span>
          </Label>
          <p className="text-sm text-slate-500 mt-1">
            Upload your brand guidelines, style guides, or visual assets
          </p>
        </div>

        <div
          onClick={() => guidelinesInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/30 transition-all"
        >
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700 mb-1">Click to upload documents</p>
          <p className="text-xs text-slate-500">PDF, DOC, or images (max 10MB each)</p>
        </div>

        {brandGuidelines.length > 0 && (
          <div className="space-y-2">
            {brandGuidelines.map((file, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-lg p-3 flex items-center gap-3 bg-white"
              >
                <div className="w-10 h-10 rounded bg-purple-100 flex items-center justify-center text-purple-600">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  onClick={() => removeGuideline(index)}
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={guidelinesInputRef}
          type="file"
          accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_DOC_TYPES].join(',')}
          onChange={handleGuidelinesChange}
          className="hidden"
          multiple
        />
        {errors.guidelines && (
          <p className="text-sm text-red-600">{errors.guidelines}</p>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-purple-600" />
          Why provide brand assets?
        </h3>
        <div className="space-y-2 text-sm text-slate-700">
          <p>• AI-generated content matches your brand voice automatically</p>
          <p>• Consistent branding across all automated communications</p>
          <p>• Personalized reports and documents with your logo</p>
          <p>• Better AI understanding of your visual identity and style</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="min-w-32"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onSkip}
            variant="ghost"
            className="min-w-32"
          >
            Skip for now
          </Button>

          <Button
            type="button"
            onClick={handleContinue}
            className="min-w-32 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
