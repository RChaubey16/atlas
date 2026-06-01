import { renderBlocksToHtml } from './blocks-renderer';

describe('renderBlocksToHtml', () => {
  it('returns a complete HTML document wrapper for an empty block list', () => {
    const html = renderBlocksToHtml([]);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  describe('heading block', () => {
    it('renders h2 by default with escaped text', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'heading', props: { text: 'Hello <World>' } },
      ]);
      expect(html).toContain('<h2');
      expect(html).toContain('Hello &lt;World&gt;');
    });

    it('clamps heading level to 1–6', () => {
      const h0 = renderBlocksToHtml([
        { id: '1', type: 'heading', props: { text: 'T', level: 0 } },
      ]);
      expect(h0).toContain('<h1');

      const h7 = renderBlocksToHtml([
        { id: '2', type: 'heading', props: { text: 'T', level: 7 } },
      ]);
      expect(h7).toContain('<h6');
    });

    it('substitutes {{variables}} in heading text', () => {
      const html = renderBlocksToHtml(
        [{ id: '1', type: 'heading', props: { text: 'Hi {{name}}!' } }],
        { name: 'Alice' },
      );
      expect(html).toContain('Hi Alice!');
    });

    it('escapes variable values to prevent XSS', () => {
      const html = renderBlocksToHtml(
        [{ id: '1', type: 'heading', props: { text: '{{val}}' } }],
        { val: '<script>alert(1)</script>' },
      );
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });

    it('leaves unresolved {{placeholders}} escaped in output', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'heading', props: { text: 'Hi {{unknown}}' } },
      ]);
      expect(html).toContain('{{unknown}}');
    });
  });

  describe('paragraph block', () => {
    it('renders paragraph with text', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'paragraph', props: { text: 'Body text.' } },
      ]);
      expect(html).toContain('<p');
      expect(html).toContain('Body text.');
    });

    it('substitutes variables', () => {
      const html = renderBlocksToHtml(
        [{ id: '1', type: 'paragraph', props: { text: 'Order {{id}}' } }],
        { id: 'ORD-42' },
      );
      expect(html).toContain('Order ORD-42');
    });
  });

  describe('button block', () => {
    it('renders an anchor with the target URL', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'button',
          props: { text: 'Click', url: 'https://example.com' },
        },
      ]);
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('Click');
    });

    it('falls back to # for a non-http URL', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'button',
          props: { text: 'Bad', url: 'javascript:void(0)' },
        },
      ]);
      expect(html).toContain('href="#"');
    });

    it('substitutes variables in button label', () => {
      const html = renderBlocksToHtml(
        [
          {
            id: '1',
            type: 'button',
            props: { text: 'Hello {{name}}', url: 'https://example.com' },
          },
        ],
        { name: 'Bob' },
      );
      expect(html).toContain('Hello Bob');
    });
  });

  describe('image block', () => {
    it('renders an img tag with the supplied src', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'image',
          props: { url: 'https://example.com/img.png', alt: 'A photo' },
        },
      ]);
      expect(html).toContain('src="https://example.com/img.png"');
      expect(html).toContain('alt="A photo"');
    });

    it('wraps image in an anchor when link prop is set', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'image',
          props: {
            url: 'https://example.com/img.png',
            link: 'https://example.com',
          },
        },
      ]);
      expect(html).toContain('href="https://example.com"');
    });
  });

  describe('divider block', () => {
    it('renders an hr element', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'divider', props: {} },
      ]);
      expect(html).toContain('<hr');
    });

    it('uses the supplied color', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'divider', props: { color: '#ff0000' } },
      ]);
      expect(html).toContain('#ff0000');
    });

    it('falls back to default color for invalid input', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'divider', props: { color: 'not-a-color' } },
      ]);
      expect(html).toContain('#000000');
    });
  });

  describe('spacer block', () => {
    it('renders a spacer cell with the given height', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'spacer', props: { height: 48 } },
      ]);
      expect(html).toContain('height:48px');
    });
  });

  describe('hero block', () => {
    it('renders title and subtitle', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'hero',
          props: { title: 'Big Title', subtitle: 'Small sub' },
        },
      ]);
      expect(html).toContain('Big Title');
      expect(html).toContain('Small sub');
    });

    it('renders a CTA button when buttonText is provided', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'hero',
          props: {
            title: 'T',
            buttonText: 'Go',
            buttonUrl: 'https://example.com',
          },
        },
      ]);
      expect(html).toContain('Go');
      expect(html).toContain('https://example.com');
    });

    it('omits CTA when buttonText is empty', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'hero', props: { title: 'T', buttonText: '' } },
      ]);
      expect(html).not.toContain('<a href');
    });

    it('substitutes variables in title', () => {
      const html = renderBlocksToHtml(
        [
          {
            id: '1',
            type: 'hero',
            props: { title: 'Welcome {{name}}' },
          },
        ],
        { name: 'Carol' },
      );
      expect(html).toContain('Welcome Carol');
    });
  });

  describe('logo block', () => {
    it('renders an img with the logo src', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'logo',
          props: { url: 'https://example.com/logo.png', alt: 'My Logo' },
        },
      ]);
      expect(html).toContain('src="https://example.com/logo.png"');
      expect(html).toContain('alt="My Logo"');
    });
  });

  describe('footer block', () => {
    it('renders footer text with variable substitution', () => {
      const html = renderBlocksToHtml(
        [{ id: '1', type: 'footer', props: { text: '© {{year}} Corp' } }],
        { year: '2026' },
      );
      expect(html).toContain('© 2026 Corp');
    });
  });

  describe('social block', () => {
    it('renders links for each social entry', () => {
      const html = renderBlocksToHtml([
        {
          id: '1',
          type: 'social',
          props: {
            links: [
              {
                platform: 'Twitter',
                url: 'https://twitter.com/x',
                label: 'Twitter',
              },
              {
                platform: 'GitHub',
                url: 'https://github.com/y',
                label: 'GitHub',
              },
            ],
          },
        },
      ]);
      expect(html).toContain('Twitter');
      expect(html).toContain('GitHub');
      expect(html).toContain('https://twitter.com/x');
    });
  });

  describe('unknown block type', () => {
    it('renders nothing for an unknown type', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'unknown-block', props: {} },
      ]);
      // Should still produce a valid document with no extra content
      expect(html).toContain('<!DOCTYPE html>');
    });
  });

  describe('multiple blocks', () => {
    it('renders all blocks in order', () => {
      const html = renderBlocksToHtml([
        { id: '1', type: 'heading', props: { text: 'First' } },
        { id: '2', type: 'paragraph', props: { text: 'Second' } },
        { id: '3', type: 'divider', props: {} },
      ]);
      const firstPos = html.indexOf('First');
      const secondPos = html.indexOf('Second');
      const hrPos = html.indexOf('<hr');
      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(hrPos);
    });
  });
});
