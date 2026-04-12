export interface EmailTemplate {
  subject: string;
  html(data: { email: string }): string;
}
