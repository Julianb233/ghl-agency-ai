/**
 * FormValidationExample - Demonstration of form validation features
 *
 * This example demonstrates:
 * - FormField component with validation
 * - useFormValidation hook
 * - Visual feedback (errors, success states)
 * - ARIA live regions for announcements
 * - Accessibility best practices
 */

import React, { useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingAnnouncement, SuccessAnnouncement, ErrorAnnouncement } from '@/components/ui/live-region';
import { useFormValidation, ValidationPatterns } from '@/hooks/useFormValidation';
import { toast } from 'sonner';

interface FormData {
  name: string;
  email: string;
  url: string;
  description: string;
  category: string;
}

const validationSchema = {
  name: {
    required: 'Name is required',
    minLength: { value: 2, message: 'Name must be at least 2 characters' },
    maxLength: { value: 50, message: 'Name must be less than 50 characters' },
  },
  email: {
    required: 'Email is required',
    pattern: ValidationPatterns.email,
  },
  url: {
    pattern: ValidationPatterns.url,
  },
  description: {
    maxLength: { value: 200, message: 'Description must be less than 200 characters' },
  },
  category: {
    required: 'Please select a category',
  },
};

export const FormValidationExample: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    url: '',
    description: '',
    category: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    errors,
    touched,
    validate,
    validateField,
    touchField,
    reset: resetValidation,
  } = useFormValidation(validationSchema);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Validate if field has been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof FormData) => {
    touchField(field);
    validateField(field, formData[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    if (!validate(formData)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Success!
      setSubmitSuccess(true);
      toast.success('Form submitted successfully!');

      // Reset form
      setFormData({
        name: '',
        email: '',
        url: '',
        description: '',
        category: '',
      });
      resetValidation();
    } catch (error) {
      toast.error('Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      url: '',
      description: '',
      category: '',
    });
    resetValidation();
    setSubmitSuccess(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Accessibility announcements */}
      <LoadingAnnouncement isLoading={isSubmitting} message="Submitting form..." />
      <SuccessAnnouncement message={submitSuccess ? 'Form submitted successfully!' : null} />
      <ErrorAnnouncement error={Object.keys(errors).length > 0 ? 'Form has validation errors' : null} />

      <Card>
        <CardHeader>
          <CardTitle>Form Validation Example</CardTitle>
          <CardDescription>
            Demonstrates accessible form validation with visual feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Name Field */}
            <FormField
              id="name"
              label="Full Name"
              error={touched.name ? errors.name : undefined}
              success={touched.name && !errors.name && formData.name !== ''}
              successMessage="Looks good!"
              required
              helperText="Enter your first and last name"
            >
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="John Doe"
                autoComplete="name"
              />
            </FormField>

            {/* Email Field */}
            <FormField
              id="email"
              label="Email Address"
              error={touched.email ? errors.email : undefined}
              success={touched.email && !errors.email && formData.email !== ''}
              successMessage="Valid email!"
              required
            >
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="john@example.com"
                autoComplete="email"
              />
            </FormField>

            {/* URL Field (Optional) */}
            <FormField
              id="url"
              label="Website URL"
              error={touched.url ? errors.url : undefined}
              success={touched.url && !errors.url && formData.url !== ''}
              helperText="Optional - Must start with http:// or https://"
            >
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => handleChange('url', e.target.value)}
                onBlur={() => handleBlur('url')}
                placeholder="https://example.com"
                autoComplete="url"
              />
            </FormField>

            {/* Category Select */}
            <FormField
              id="category"
              label="Category"
              error={touched.category ? errors.category : undefined}
              success={touched.category && !errors.category && formData.category !== ''}
              required
            >
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  handleChange('category', value);
                  handleBlur('category');
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Description Textarea */}
            <FormField
              id="description"
              label="Description"
              error={touched.description ? errors.description : undefined}
              success={touched.description && !errors.description && formData.description !== ''}
              helperText={`${formData.description.length}/200 characters`}
            >
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                onBlur={() => handleBlur('description')}
                placeholder="Tell us more..."
                rows={4}
              />
            </FormField>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Form'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </div>

            {/* Form Status */}
            {submitSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  Form submitted successfully! All data has been validated and processed.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Debug Info (Remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong className="text-sm">Touched Fields:</strong>
              <pre className="text-xs mt-1 p-2 bg-slate-100 rounded">
                {JSON.stringify(touched, null, 2)}
              </pre>
            </div>
            <div>
              <strong className="text-sm">Errors:</strong>
              <pre className="text-xs mt-1 p-2 bg-slate-100 rounded">
                {JSON.stringify(errors, null, 2)}
              </pre>
            </div>
            <div>
              <strong className="text-sm">Form Data:</strong>
              <pre className="text-xs mt-1 p-2 bg-slate-100 rounded">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
