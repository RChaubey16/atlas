export interface TemplateField {
  name: string;
  required: boolean;
  description: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  subject: string;
  fields: TemplateField[];
  previewData: Record<string, string>;
  html(data: Record<string, string>): string;
}
