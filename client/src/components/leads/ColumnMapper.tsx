import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ColumnMapping {
  [sourceColumn: string]: string;
}

interface ColumnMapperProps {
  columns: string[];
  onMap: (mapping: ColumnMapping) => void;
  previewData?: any[];
}

const STANDARD_FIELDS = [
  { value: 'firstName', label: 'First Name', required: false },
  { value: 'lastName', label: 'Last Name', required: false },
  { value: 'email', label: 'Email', required: true },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'company', label: 'Company', required: false },
  { value: 'jobTitle', label: 'Job Title', required: false },
  { value: 'skip', label: 'Skip (Do not import)', required: false },
];

export function ColumnMapper({ columns, onMap, previewData = [] }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-detect columns on mount
  useEffect(() => {
    const autoMapping: ColumnMapping = {};

    columns.forEach((col) => {
      const lowerCol = col.toLowerCase();

      if (lowerCol.includes('first') && lowerCol.includes('name')) {
        autoMapping[col] = 'firstName';
      } else if (lowerCol.includes('last') && lowerCol.includes('name')) {
        autoMapping[col] = 'lastName';
      } else if (lowerCol.includes('email') || lowerCol.includes('e-mail')) {
        autoMapping[col] = 'email';
      } else if (lowerCol.includes('phone') || lowerCol.includes('mobile') || lowerCol.includes('tel')) {
        autoMapping[col] = 'phone';
      } else if (lowerCol.includes('company') || lowerCol.includes('organization')) {
        autoMapping[col] = 'company';
      } else if (lowerCol.includes('title') || lowerCol.includes('position') || lowerCol.includes('role')) {
        autoMapping[col] = 'jobTitle';
      } else {
        autoMapping[col] = `custom_${col}`;
      }
    });

    setMapping(autoMapping);
  }, [columns]);

  // Validate mapping and update parent
  useEffect(() => {
    const validationErrors: string[] = [];

    // Check if email is mapped
    const hasEmail = Object.values(mapping).includes('email');
    if (!hasEmail) {
      validationErrors.push('Email field is required');
    }

    setErrors(validationErrors);
    onMap(mapping);
  }, [mapping, onMap]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMapping((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const getMappedCount = (targetField: string) => {
    return Object.values(mapping).filter((v) => v === targetField).length;
  };

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <div className="space-y-1">
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm font-medium">{error}</p>
            ))}
          </div>
        </div>
      )}

      {errors.length === 0 && Object.keys(mapping).length > 0 && (
        <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">All required fields are mapped</p>
        </div>
      )}

      <div className="grid gap-4">
        {columns.map((col) => (
          <div key={col} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Column</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {col}
                </Badge>
              </div>
              {previewData.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  Example: {previewData[0][col] || '(empty)'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Maps To</Label>
              <Select
                value={mapping[col] || ''}
                onValueChange={(value) => handleMappingChange(col, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_FIELDS.map((field) => (
                    <SelectItem
                      key={field.value}
                      value={field.value}
                      disabled={
                        field.value !== 'skip' &&
                        getMappedCount(field.value) > 0 &&
                        mapping[col] !== field.value
                      }
                    >
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </SelectItem>
                  ))}
                  <SelectItem value={`custom_${col}`}>
                    Custom Field: {col}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2 h-10">
                {mapping[col] === 'skip' ? (
                  <Badge variant="secondary">Skipped</Badge>
                ) : mapping[col]?.startsWith('custom_') ? (
                  <Badge variant="outline">Custom Field</Badge>
                ) : (
                  <Badge variant="default">Standard Field</Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
