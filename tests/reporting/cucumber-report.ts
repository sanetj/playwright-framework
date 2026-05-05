import reporter from 'cucumber-html-reporter';

reporter.generate({
  theme: 'bootstrap',
  jsonFile: 'reports/cucumber/cucumber-report.json',
  output: 'reports/cucumber/cucumber-report.html',
  reportSuiteAsScenarios: true,
  launchReport: false,
  name: 'Playwright BDD Test Report'
});
