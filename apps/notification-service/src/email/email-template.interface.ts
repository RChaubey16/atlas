export interface EmailTemplate<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  subject: string;
  html(data: T): string;
}
