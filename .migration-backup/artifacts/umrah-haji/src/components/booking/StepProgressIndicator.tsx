import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export function StepProgressIndicator({ steps, currentStep, onStepClick }: StepProgressIndicatorProps) {
  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-all",
                currentStep > step.id
                  ? "bg-primary text-white cursor-pointer hover:bg-primary/90"
                  : currentStep === step.id
                  ? "bg-primary text-white ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                step.id
              )}
            </button>

            {/* Step Title */}
            <div className="ml-3 flex-1">
              <p className={cn(
                "text-sm font-medium transition-colors",
                currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-muted-foreground">{step.description}</p>
              )}
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "h-1 flex-1 mx-2 rounded transition-colors",
                currentStep > step.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="md:hidden mb-6">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-primary">
            Langkah {currentStep} dari {steps.length}
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {steps.find(s => s.id === currentStep)?.title}
        </p>
      </div>
    </div>
  );
}
