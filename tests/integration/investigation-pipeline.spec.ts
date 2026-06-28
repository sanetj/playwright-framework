import { test, expect } from '@playwright/test';
import { createServer, Server } from 'node:http';
import { InvestigationPipeline } from '../../src/intelligence/orchestration/investigation-pipeline';
import { TargetSafetyProfile } from '../../src/intelligence/perturbation/probe-safety';
import { RuntimeRoleProfile } from '../../src/intelligence/runtime/multi-session-runtime';
import { BountyReportSerializer } from '../../src/intelligence/artifacts/bounty-report-serializer';
import * as fs from 'node:fs';

test.describe('InvestigationPipeline E2E', () => {
  let server: Server;
  let serverUrl: string;

  test.beforeAll(async () => {
    // Spin up a simple HTTP server to act as our target
    server = createServer((req, res) => {
      console.log(`[DummyServer] Received: ${req.method} ${req.url}`);
      // Add permissive CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body>
              <h1>Target System</h1>
              <script>
                // Fire immediately to ensure crawler picks it up
                fetch('/api/user/me');
                fetch('/api/admin/settings');
              </script>
            </body>
          </html>
        `);
        return;
      }

      if (req.url === '/api/user/me') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: '12345', name: 'Test User' }));
        return;
      }

      if (req.url === '/api/admin/settings') {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer ADMIN_TOKEN') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ secret: 'admin_only_data' }));
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
        }
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address !== 'string') {
          serverUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
    
    if (!fs.existsSync('artifacts/test-results')) {
      fs.mkdirSync('artifacts/test-results', { recursive: true });
    }
  });

  test.afterAll(() => {
    server.close();
  });

  test('should execute full differential pipeline and identify admin endpoint contradiction', async () => {
    const safetyProfile: TargetSafetyProfile = {
      targetId: 'local_test',
      safeCategories: [{ categoryId: 'reads', allowedClasses: ['READ_ONLY'] }],
      requiresApprovalFor: ['STATE_MUTATION', 'HIGH_RISK']
    };

    const userRole: RuntimeRoleProfile = { roleId: 'user_1', roleName: 'User' };
    const adminRole: RuntimeRoleProfile = { roleId: 'admin_1', roleName: 'Admin' };

    const pipeline = new InvestigationPipeline(safetyProfile, serverUrl);
    
    // Setup credentials in the vault for the admin role
    const vault = pipeline.getRuntime().getCredentialVault();
    vault.storeCredentials({
      roleId: 'admin_1',
      headers: { 'Authorization': 'Bearer ADMIN_TOKEN' }
    });

    const bundle = await pipeline.runDifferentialAnalysis(userRole, adminRole);

    expect(bundle).toBeDefined();
    expect(bundle.targetDomain).toBe(serverUrl);
    expect(bundle.investigationId).toBeDefined();
    
    // We expect the pipeline to have synthesized and prioritized at least 1 candidate
    expect(bundle.prioritizedCandidates).toBeDefined();
    expect(bundle.prioritizedCandidates.length).toBeGreaterThanOrEqual(1);
    
    const serializer = new BountyReportSerializer();
    serializer.serializeToMarkdown(bundle, 'artifacts/test-results/investigation_bundle.md');
    
    expect(fs.existsSync('artifacts/test-results/investigation_bundle.md')).toBe(true);
  });
});


