import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';

export default class FooterComponent extends BasePage {
  private readonly newsletterEmailInput: Locator;
  private readonly subscribeButton: Locator;
  private readonly sitemapLink: Locator;
  private readonly contactUsLink: Locator;

  constructor(page: Page) {
    super(page, 'FooterComponent');
    this.newsletterEmailInput = this.page.getByRole('textbox', { name: 'Sign up for our newsletter:' });
    this.subscribeButton = this.page.getByRole('button', { name: 'Subscribe' });
    this.sitemapLink = this.page.getByRole('link', { name: 'Sitemap' });
    this.contactUsLink = this.page.getByRole('link', { name: 'Contact us' });
  }

  async subscribeToNewsletter(email: string): Promise<void> {
    await this.fill(this.newsletterEmailInput, email, 'Newsletter email input');
    await this.click(this.subscribeButton, 'Subscribe button');
    await this.page.waitForLoadState('networkidle');
  }

  async openSitemap(): Promise<void> {
    await this.click(this.sitemapLink, 'Footer sitemap link');
    await this.page.waitForURL(/sitemap/i);
  }

  async openContactUs(): Promise<void> {
    await this.click(this.contactUsLink, 'Footer contact us link');
    await this.page.waitForURL(/contactus/i);
  }
}
