import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUploader } from '@/components/leads/FileUploader';
import { ColumnMapper } from '@/components/leads/ColumnMapper';
import { useLeadEnrichment } from '@/hooks/useLeadEnrichment';
import { useCredits } from '@/hooks/useCredits';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

type Step = 1 | 2 | 3 | 4;

interface UploadState {
  fileName: string;
  data: any[];
  columns: string[];
  mapping: Record<string, string>;
  listName: string;
  description: string;
  enrichOptions: {
    contactInfo: boolean;
    companyData: boolean;
    jobDetails: boolean;
    skipDuplicates: boolean;
  };
}

export default function LeadUpload() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [uploadState, setUploadState] = useState<UploadState>({
    fileName: '',
    data: [],
    columns: [],
    mapping: {},
    listName: '',
    description: '',
    enrichOptions: {
      contactInfo: true,
      companyData: true,
      jobDetails: true,
      skipDuplicates: true,
    },
  });

  const { createList, uploadLeads, enrichList } = useLeadEnrichment();
  const { getBalance } = useCredits();
  const { data: balance } = getBalance({ creditType: 'enrichment' });

  const createListMutation = createList;
  const uploadLeadsMutation = uploadLeads;
  const enrichListMutation = enrichList;

  const handleFileSelect = (data: any[], columns: string[], fileName: string) => {
    setUploadState((prev) => ({
      ...prev,
      fileName,
      data,
      columns,
      listName: fileName.replace(/\.(csv|json)$/, ''),
    }));
    setCurrentStep(2);
  };

  const handleMapping = (mapping: Record<string, string>) => {
    setUploadState((prev) => ({ ...prev, mapping }));
  };

  const calculateCreditCost = () => {
    const baseCreditsPerLead = 1;
    let multiplier = 0;

    if (uploadState.enrichOptions.contactInfo) multiplier += 1;
    if (uploadState.enrichOptions.companyData) multiplier += 1;
    if (uploadState.enrichOptions.jobDetails) multiplier += 1;

    return uploadState.data.length * baseCreditsPerLead * multiplier;
  };

  const creditCost = calculateCreditCost();
  const hasEnoughCredits = balance ? balance.balance >= creditCost : false;

  const handleSubmit = async () => {
    try {
      // Transform data based on mapping
      const transformedData = uploadState.data.map((row) => {
        const transformed: any = { metadata: {} };

        Object.entries(uploadState.mapping).forEach(([sourceCol, targetField]) => {
          if (targetField === 'skip') return;

          if (targetField.startsWith('custom_')) {
            transformed.metadata[sourceCol] = row[sourceCol];
          } else {
            transformed[targetField] = row[sourceCol];
          }
        });

        return transformed;
      });

      // Step 1: Create the list
      const createResult = await createListMutation.mutateAsync({
        name: uploadState.listName,
        description: uploadState.description,
      });

      // Step 2: Upload leads to the list
      if (createResult.id) {
        await uploadLeadsMutation.mutateAsync({
          listId: createResult.id,
          leads: transformedData,
        });

        // Step 3: Start enrichment process
        await enrichListMutation.mutateAsync({
          listId: createResult.id,
        });
      }

      toast.success('Lead list uploaded and processing started');
      setLocation('/lead-lists');
    } catch (error) {
      toast.error('Failed to upload lead list');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload File</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader onFileSelect={handleFileSelect} />
              {uploadState.data.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="font-medium">Preview (First 5 rows)</h4>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-accent">
                        <tr>
                          {uploadState.columns.map((col) => (
                            <th key={col} className="px-4 py-2 text-left font-medium">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadState.data.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            {uploadState.columns.map((col) => (
                              <td key={col} className="px-4 py-2">
                                {row[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Map Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnMapper
                columns={uploadState.columns}
                onMap={handleMapping}
                previewData={uploadState.data.slice(0, 3)}
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(3)}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Enrichment Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contactInfo"
                    checked={uploadState.enrichOptions.contactInfo}
                    onCheckedChange={(checked) =>
                      setUploadState((prev) => ({
                        ...prev,
                        enrichOptions: {
                          ...prev.enrichOptions,
                          contactInfo: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="contactInfo" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Enrich Contact Info</p>
                      <p className="text-sm text-muted-foreground">
                        Find missing email addresses and phone numbers
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="companyData"
                    checked={uploadState.enrichOptions.companyData}
                    onCheckedChange={(checked) =>
                      setUploadState((prev) => ({
                        ...prev,
                        enrichOptions: {
                          ...prev.enrichOptions,
                          companyData: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="companyData" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Enrich Company Data</p>
                      <p className="text-sm text-muted-foreground">
                        Get company size, industry, location, and more
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="jobDetails"
                    checked={uploadState.enrichOptions.jobDetails}
                    onCheckedChange={(checked) =>
                      setUploadState((prev) => ({
                        ...prev,
                        enrichOptions: {
                          ...prev.enrichOptions,
                          jobDetails: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="jobDetails" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Enrich Job Details</p>
                      <p className="text-sm text-muted-foreground">
                        Find job titles, LinkedIn profiles, and seniority levels
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipDuplicates"
                    checked={uploadState.enrichOptions.skipDuplicates}
                    onCheckedChange={(checked) =>
                      setUploadState((prev) => ({
                        ...prev,
                        enrichOptions: {
                          ...prev.enrichOptions,
                          skipDuplicates: checked as boolean,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="skipDuplicates" className="cursor-pointer">
                    <div>
                      <p className="font-medium">Skip Duplicates</p>
                      <p className="text-sm text-muted-foreground">
                        Avoid enriching leads that already exist
                      </p>
                    </div>
                  </Label>
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Estimated Credit Cost</span>
                  <span className="text-2xl font-bold">{creditCost} credits</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {uploadState.data.length} leads × enrichment options
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(4)}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Confirm & Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listName">List Name</Label>
                  <Input
                    id="listName"
                    value={uploadState.listName}
                    onChange={(e) =>
                      setUploadState((prev) => ({ ...prev, listName: e.target.value }))
                    }
                    placeholder="Q4 Marketing Leads"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadState.description}
                    onChange={(e) =>
                      setUploadState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe this lead list..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">File</p>
                    <p className="font-medium">{uploadState.fileName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Leads</p>
                    <p className="font-medium">{uploadState.data.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Columns Mapped</p>
                    <p className="font-medium">
                      {Object.values(uploadState.mapping).filter((v) => v !== 'skip').length}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Credit Cost</p>
                    <p className="font-medium">{creditCost} credits</p>
                  </div>
                </div>
              </div>

              {!hasEnoughCredits && (
                <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Insufficient Credits</p>
                    <p className="text-sm">
                      You need {creditCost - (balance?.balance || 0)} more credits.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation('/credits')}
                      className="mt-2"
                    >
                      Buy Credits
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !hasEnoughCredits ||
                    !uploadState.listName ||
                    createListMutation.isPending ||
                    uploadLeadsMutation.isPending ||
                    enrichListMutation.isPending
                  }
                >
                  {createListMutation.isPending || uploadLeadsMutation.isPending || enrichListMutation.isPending ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload & Enrich
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/lead-lists')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Upload Lead List</h1>
        <p className="text-muted-foreground mt-1">
          Upload and enrich your lead data in just a few steps
        </p>
      </div>

      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-muted-foreground text-muted-foreground'
              }`}
            >
              {currentStep > step ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <span className="font-medium">{step}</span>
              )}
            </div>
            {step < 4 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  currentStep > step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {renderStep()}
    </div>
  );
}
