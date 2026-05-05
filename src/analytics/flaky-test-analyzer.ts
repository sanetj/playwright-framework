import fs from 'node:fs';
import path from 'node:path';
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

class FlakyTestAnalyzer implements Reporter {
  private records: Array<{ test: string; retries: number; duration: number; unstable: boolean }> = [];
  onTestEnd(test: TestCase, result: TestResult): void {
    this.records.push({ test: test.titlePath().join(' > '), retries: result.retry, duration: result.duration, unstable: result.retry > 0 && result.status === 'passed' });
  }
  onEnd(): void {
    const target = path.resolve(process.cwd(), 'reports/flaky-tests.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(this.records, null, 2));
  }
}
export default FlakyTestAnalyzer;
