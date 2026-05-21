import { BrowserContext, Route, Request } from '@playwright/test';
import { ReplayPerturbationEnvelope } from '../../intelligence/perturbation/governed-perturbation';

export class LivePerturbationInterceptor {
  private activeEnvelope: ReplayPerturbationEnvelope | null = null;
  private interceptedUrls = new Set<string>();

  public setEnvelope(envelope: ReplayPerturbationEnvelope | null) {
    this.activeEnvelope = envelope;
  }

  public async attach(context: BrowserContext): Promise<void> {
    await context.route('**/*', async (route: Route, request: Request) => {
      // If no envelope is active, proceed normally
      if (!this.activeEnvelope || !request.url().startsWith('http')) {
        return route.continue();
      }

      const envelope = this.activeEnvelope;
      const originalUrl = request.url();
      let mutatedUrl = originalUrl;

      // 1. Apply ID Mutations (Path/Query)
      for (const idMut of envelope.idMutations) {
        if (mutatedUrl.includes(idMut.originalValue)) {
          mutatedUrl = mutatedUrl.replace(idMut.originalValue, idMut.injectedValue);
        }
      }

      // 2. Apply Headers (Auth/Tenant Mutations)
      const headers = await request.allHeaders();

      for (const authMut of envelope.authMutations) {
        const lowerHeader = authMut.headerName.toLowerCase();
        if (authMut.action === 'STRIP') {
          delete headers[lowerHeader];
        } else if (authMut.action === 'REPLACE' && authMut.injectedValue) {
          headers[lowerHeader] = authMut.injectedValue;
        }
      }

      for (const tenantMut of envelope.tenantMutations) {
        const targetHeader = tenantMut.targetTenantHeaderOrField.toLowerCase();
        if (headers[targetHeader] === tenantMut.originalTenantId) {
          headers[targetHeader] = tenantMut.injectedTenantId;
        }
      }

      // 3. Body ID Mutations (Basic JSON support)
      let postData = request.postData();
      if (postData && (headers['content-type']?.includes('application/json'))) {
        try {
          const bodyJson = JSON.parse(postData);
          let mutated = false;
          for (const idMut of envelope.idMutations) {
             if (bodyJson[idMut.targetFieldId] === idMut.originalValue) {
               bodyJson[idMut.targetFieldId] = idMut.injectedValue;
               mutated = true;
             }
          }
          if (mutated) {
            postData = JSON.stringify(bodyJson);
          }
        } catch {
          // ignore parse errors
        }
      }

      this.interceptedUrls.add(mutatedUrl);

      // Execute the perturbed request
      await route.continue({
        url: mutatedUrl,
        headers,
        postData
      });
    });
  }
}
