import { useForm, type UseFormProps, type FieldValues, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ZodObject, type ZodRawShape } from 'zod';

interface UseZodFormValidationOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  schema: ZodObject<ZodRawShape>;
}

export function useZodFormValidation<T extends FieldValues>({ 
  schema, 
  ...options 
}: UseZodFormValidationOptions<T>) {
  return useForm<T>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    resolver: zodResolver(schema) as unknown as Resolver<T>,
    ...options,
  });
}
