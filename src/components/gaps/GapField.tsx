import * as React from 'react';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import type { GapFieldConfig, GapResponseValue, GapFieldOption } from '~/lib/validations/gapPrompt';

// =============================================================================
// GapField Component
// =============================================================================
// Renders the appropriate input field based on the field type.
// Supports: text, textarea, select, multiselect, checkbox, date, time, number
// =============================================================================

interface GapFieldProps {
  config: GapFieldConfig;
  value: GapResponseValue;
  onChange: (value: GapResponseValue) => void;
  error?: string;
  disabled?: boolean;
}

export function GapField({ config, value, onChange, error, disabled = false }: GapFieldProps) {
  const {
    fieldType,
    label,
    placeholder,
    helpText,
    isRequired,
    options = [],
    validationRules,
    id,
  } = config;

  const fieldId = `gap-field-${id}`;
  const hasError = !!error;

  // Render appropriate field based on type
  switch (fieldType) {
    case 'text':
      return (
        <TextInput
          id={fieldId}
          label={label}
          placeholder={placeholder}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
          validationRules={validationRules}
        />
      );

    case 'textarea':
      return (
        <TextareaInput
          id={fieldId}
          label={label}
          placeholder={placeholder}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
          validationRules={validationRules}
        />
      );

    case 'select':
      return (
        <SelectInput
          id={fieldId}
          label={label}
          placeholder={placeholder}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          options={options}
          error={error}
          disabled={disabled}
        />
      );

    case 'multiselect':
      return (
        <MultiSelectInput
          id={fieldId}
          label={label}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string[]) || []}
          onChange={(val) => onChange(val)}
          options={options}
          error={error}
          disabled={disabled}
        />
      );

    case 'checkbox':
      return (
        <CheckboxInput
          id={fieldId}
          label={label}
          helpText={helpText}
          value={(value as boolean) || false}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
        />
      );

    case 'date':
      return (
        <DateInput
          id={fieldId}
          label={label}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
        />
      );

    case 'time':
      return (
        <TimeInput
          id={fieldId}
          label={label}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
        />
      );

    case 'number':
      return (
        <NumberInput
          id={fieldId}
          label={label}
          placeholder={placeholder}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
          validationRules={validationRules}
        />
      );

    default:
      return (
        <TextInput
          id={fieldId}
          label={label}
          placeholder={placeholder}
          helpText={helpText}
          isRequired={isRequired}
          value={(value as string) || ''}
          onChange={(val) => onChange(val)}
          error={error}
          disabled={disabled}
        />
      );
  }
}

// =============================================================================
// Field Wrapper Component
// =============================================================================

interface FieldWrapperProps {
  id: string;
  label: string;
  helpText?: string;
  isRequired?: boolean;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ id, label, helpText, isRequired, error, children }: FieldWrapperProps) {
  return (
    <div className="space-y-2" data-testid={`field-wrapper-${id}`}>
      <Label htmlFor={id} className={cn(error && 'text-destructive')}>
        {label}
        {isRequired && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {helpText && !error && (
        <p className="text-sm text-muted-foreground">{helpText}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Text Input Component
// =============================================================================

interface TextInputProps {
  id: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  validationRules?: GapFieldConfig['validationRules'];
}

function TextInput({
  id,
  label,
  placeholder,
  helpText,
  isRequired,
  value,
  onChange,
  error,
  disabled,
  validationRules,
}: TextInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        maxLength={validationRules?.maxLength}
        data-testid={id}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  );
}

// =============================================================================
// Textarea Input Component
// =============================================================================

interface TextareaInputProps {
  id: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  validationRules?: GapFieldConfig['validationRules'];
}

function TextareaInput({
  id,
  label,
  placeholder,
  helpText,
  isRequired,
  value,
  onChange,
  error,
  disabled,
  validationRules,
}: TextareaInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        maxLength={validationRules?.maxLength}
        data-testid={id}
        className={cn(error && 'border-destructive', 'min-h-[120px]')}
      />
    </FieldWrapper>
  );
}

// =============================================================================
// Select Input Component
// =============================================================================

interface SelectInputProps {
  id: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: GapFieldOption[];
  error?: string;
  disabled?: boolean;
}

function SelectInput({
  id,
  label,
  placeholder = 'Select an option...',
  helpText,
  isRequired,
  value,
  onChange,
  options,
  error,
  disabled,
}: SelectInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          data-testid={id}
          className={cn(error && 'border-destructive')}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              data-testid={`${id}-option-${option.value}`}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  );
}

// =============================================================================
// Multi-Select Input Component
// =============================================================================

interface MultiSelectInputProps {
  id: string;
  label: string;
  helpText?: string;
  isRequired?: boolean;
  value: string[];
  onChange: (value: string[]) => void;
  options: GapFieldOption[];
  error?: string;
  disabled?: boolean;
}

function MultiSelectInput({
  id,
  label,
  helpText,
  isRequired,
  value,
  onChange,
  options,
  error,
  disabled,
}: MultiSelectInputProps) {
  const handleToggle = (optionValue: string) => {
    if (disabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <div
        className={cn(
          'rounded-md border border-input bg-background p-3 space-y-2',
          error && 'border-destructive',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        role="group"
        aria-labelledby={`${id}-label`}
        data-testid={id}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${id}-${option.value}`}
              checked={value.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
              disabled={disabled || option.disabled}
              data-testid={`${id}-option-${option.value}`}
            />
            <Label
              htmlFor={`${id}-${option.value}`}
              className={cn(
                'font-normal cursor-pointer',
                (disabled || option.disabled) && 'cursor-not-allowed opacity-50'
              )}
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </FieldWrapper>
  );
}

// =============================================================================
// Checkbox Input Component
// =============================================================================

interface CheckboxInputProps {
  id: string;
  label: string;
  helpText?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

function CheckboxInput({
  id,
  label,
  helpText,
  value,
  onChange,
  error,
  disabled,
}: CheckboxInputProps) {
  return (
    <div className="space-y-2" data-testid={`field-wrapper-${id}`}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          checked={value}
          onCheckedChange={(checked: boolean | 'indeterminate') => onChange(checked === true)}
          disabled={disabled}
          aria-invalid={!!error}
          data-testid={id}
        />
        <Label
          htmlFor={id}
          className={cn(
            'font-normal cursor-pointer',
            error && 'text-destructive',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {label}
        </Label>
      </div>
      {helpText && !error && (
        <p className="text-sm text-muted-foreground pl-6">{helpText}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive pl-6" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Date Input Component
// =============================================================================

interface DateInputProps {
  id: string;
  label: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function DateInput({
  id,
  label,
  helpText,
  isRequired,
  value,
  onChange,
  error,
  disabled,
}: DateInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        data-testid={id}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  );
}

// =============================================================================
// Time Input Component
// =============================================================================

interface TimeInputProps {
  id: string;
  label: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

function TimeInput({
  id,
  label,
  helpText,
  isRequired,
  value,
  onChange,
  error,
  disabled,
}: TimeInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        data-testid={id}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  );
}

// =============================================================================
// Number Input Component
// =============================================================================

interface NumberInputProps {
  id: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  validationRules?: GapFieldConfig['validationRules'];
}

function NumberInput({
  id,
  label,
  placeholder,
  helpText,
  isRequired,
  value,
  onChange,
  error,
  disabled,
  validationRules,
}: NumberInputProps) {
  return (
    <FieldWrapper
      id={id}
      label={label}
      helpText={helpText}
      isRequired={isRequired}
      error={error}
    >
      <Input
        id={id}
        type="number"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
        min={validationRules?.min}
        max={validationRules?.max}
        step={validationRules?.step}
        data-testid={id}
        className={cn(error && 'border-destructive')}
      />
    </FieldWrapper>
  );
}

export default GapField;
