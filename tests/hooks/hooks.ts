import { After, AfterStep, Before, BeforeStep, Status } from '@cucumber/cucumber';
import { CustomWorld } from '../world/customWorld';

Before(async function (this: CustomWorld) {
  await this.init();
});

BeforeStep(async function () {
  // reserved for step-level diagnostics
});

AfterStep(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED) {
    const image = await this.page.screenshot({ fullPage: true });
    await this.attach(image, 'image/png');
  }
});

After(async function (this: CustomWorld, { result }) {
  if (result?.status === Status.FAILED) {
    await this.context.tracing.stop({ path: `artifacts/cucumber/traces/${Date.now()}-trace.zip` });
  } else {
    await this.context.tracing.stop();
  }
  await this.context.close();
  await this.browser.close();
});
