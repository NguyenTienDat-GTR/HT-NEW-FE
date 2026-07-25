"use client";

import { Camera, Check, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { AuthUser } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";
import { FormField } from "./form-controls";
import type { FormFieldSpec, ResourceFormMode } from "./types";

type FormValue = string | string[] | number | boolean | null | undefined;

type LeaderCreateFormLayoutProps = {
  currentStep: number;
  fields: FormFieldSpec[];
  imageField?: FormFieldSpec;
  mode: ResourceFormMode;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  user: AuthUser | null;
  onChange: (field: FormFieldSpec, value: FormValue) => void;
  onFieldChange: (fieldName: string, value: FormValue) => void;
  onStepSelect: (stepIndex: number) => void;
};

const leaderCreateSteps = [
  {
    title: "Thông tin cá nhân",
    fieldNames: ["holyName", "fullName", "birthDate", "gender", "leaderLevel"],
  },
  {
    title: "Liên hệ",
    fieldNames: ["phoneNumber", "email"],
  },
  {
    title: "Tổ chức",
    fieldNames: ["parishId"],
  },
] as const;

export const leaderCreateStepCount = leaderCreateSteps.length;

export function getLeaderCreateStepFields(fields: FormFieldSpec[], stepIndex: number) {
  const step = leaderCreateSteps[stepIndex] ?? leaderCreateSteps[0];
  return step.fieldNames
    .map((fieldName) => fields.find((field) => field.name === fieldName))
    .filter((field): field is FormFieldSpec => Boolean(field));
}

export function LeaderCreateFormLayout({
  currentStep,
  fields,
  imageField,
  mode,
  values,
  errors,
  user,
  onChange,
  onFieldChange,
  onStepSelect,
}: LeaderCreateFormLayoutProps) {
  const step = leaderCreateSteps[currentStep] ?? leaderCreateSteps[0];
  const stepFields = getLeaderCreateStepFields(fields, currentStep);

  return (
    <Panel className="overflow-hidden rounded-[12px]">
      <div className="px-5 py-6 md:px-10 md:py-8">
        <Stepper currentStep={currentStep} onStepSelect={onStepSelect} />

        <div className="mt-10">
          <h2 className="text-xl font-semibold tracking-[0] text-foreground">{step.title}</h2>
          {currentStep === 0 ? (
            <PersonalStepLayout
              errors={errors}
              fields={stepFields}
              imageField={imageField}
              mode={mode}
              onChange={onChange}
              onFieldChange={onFieldChange}
              user={user}
              values={values}
            />
          ) : (
            <div className="mt-7 grid gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
              {stepFields.map((field) => (
                <div className="w-full max-w-64" key={field.name}>
                  <FormField
                    error={errors[field.name]}
                    field={field}
                    mode={mode}
                    onChange={(value) => onChange(field, value)}
                    onFieldChange={onFieldChange}
                    user={user}
                    value={values[field.name] as FormValue}
                    values={values}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Stepper({ currentStep, onStepSelect }: { currentStep: number; onStepSelect: (stepIndex: number) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-4 overflow-x-auto pb-1">
      {leaderCreateSteps.map((step, index) => {
        const active = index === currentStep;
        const completed = index < currentStep;
        const selectable = index <= currentStep;
        return (
          <div className="flex min-w-0 flex-1 items-center gap-4 last:flex-none" key={step.title}>
            <button
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-[8px] text-left transition-colors focus:outline-none focus:ring-4 focus:ring-[var(--primary-ring)]",
                selectable ? "cursor-pointer hover:text-primary" : "cursor-not-allowed opacity-80",
              )}
              disabled={!selectable}
              onClick={() => onStepSelect(index)}
              type="button"
            >
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-white shadow-[var(--shadow-accent)]",
                  completed && "border-primary bg-primary/10 text-primary",
                  !active && !completed && "border-border bg-surface-1 text-muted",
                )}
              >
                {completed ? <Check size={17} weight="bold" /> : index + 1}
              </span>
              <span className={cn("whitespace-nowrap text-sm font-semibold", active || completed ? "text-primary" : "text-muted")}>{step.title}</span>
            </button>
            {index < leaderCreateSteps.length - 1 ? <span className="h-px min-w-16 flex-1 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function PersonalStepLayout({
  fields,
  imageField,
  mode,
  values,
  errors,
  user,
  onChange,
  onFieldChange,
}: {
  fields: FormFieldSpec[];
  imageField?: FormFieldSpec;
  mode: ResourceFormMode;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  user: AuthUser | null;
  onChange: (field: FormFieldSpec, value: FormValue) => void;
  onFieldChange: (fieldName: string, value: FormValue) => void;
}) {
  return (
    <div className="mt-7 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <section className="rounded-[12px] border border-border bg-surface-1/60 p-4">
        <h3 className="text-base font-semibold tracking-[0] text-foreground">Ảnh đại diện</h3>
        {imageField ? (
          <div className="mt-5">
            <AvatarPicker onChange={(value) => onChange(imageField, value)} value={values[imageField.name] as string | null | undefined} />
          </div>
        ) : null}
      </section>

      <section className="rounded-[12px] border border-border bg-white p-4 md:p-5">
        <h3 className="text-base font-semibold tracking-[0] text-foreground">Thông tin cá nhân</h3>
        <div className="mt-5 grid gap-x-5 gap-y-5 xl:grid-cols-6">
          {fields.map((field) => (
            <div className={personalFieldClass(field.name)} key={field.name}>
              <FormField
                error={errors[field.name]}
                field={field}
                mode={mode}
                onChange={(value) => onChange(field, value)}
                onFieldChange={onFieldChange}
                user={user}
                value={values[field.name] as FormValue}
                values={values}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AvatarPicker({ value, onChange }: { value?: string | null; onChange: (value: string) => void }) {
  const imageSource = typeof value === "string" && value && value !== "__CLEAR__" ? value : "";
  const inputId = "field-imageUrl";

  return (
    <div className="w-full">
      {imageSource ? (
        <span
          aria-label="Ảnh đại diện đã chọn"
          className="mx-auto block h-24 w-24 shrink-0 rounded-full border border-border bg-cover bg-center shadow-sm"
          role="img"
          style={{ backgroundImage: `url(${imageSource})` }}
        />
      ) : (
        <span className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Camera size={30} weight="duotone" />
        </span>
      )}
      <div className="mt-3 min-w-0 text-center">
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <input
            accept="image/*"
            className="sr-only"
            id={inputId}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") onChange(reader.result);
              };
              reader.readAsDataURL(file);
              event.target.value = "";
            }}
            type="file"
          />
          <label
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
            htmlFor={inputId}
          >
            <UploadSimple size={16} />
            {imageSource ? "Đổi ảnh" : "Chọn ảnh"}
          </label>
          {imageSource ? (
            <Button onClick={() => onChange("__CLEAR__")} type="button" variant="ghost">
              Xóa ảnh
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function personalFieldClass(fieldName: string) {
  if (fieldName === "holyName" || fieldName === "fullName") return "min-w-0 xl:col-span-3";
  return "min-w-0 xl:col-span-2";
}
