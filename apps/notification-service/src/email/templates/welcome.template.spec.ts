import { WelcomeEmailTemplate } from './welcome.template';

describe('WelcomeEmailTemplate', () => {
  let template: WelcomeEmailTemplate;

  beforeEach(() => {
    template = new WelcomeEmailTemplate();
  });

  it('should have subject "Welcome to Atlas!"', () => {
    expect(template.subject).toBe('Welcome to Atlas!');
  });

  it('should include the user email in the html output', () => {
    const html = template.html({ email: 'test@example.com' });
    expect(html).toContain('test@example.com');
  });

  it('should return a non-empty html string', () => {
    const html = template.html({ email: 'user@example.com' });
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });
});
