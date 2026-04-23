export interface SendEmailCommand {
  templateId: string;
  to: string[];
  templateData: Record<string, unknown>;
}
