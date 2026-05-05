module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['tests/hooks/hooks.ts', 'tests/step-definitions/**/*.ts'],
    paths: ['tests/features/**/*.feature'],
    format: ['progress', 'json:reports/cucumber/cucumber-report.json'],
    tags: process.env.CUCUMBER_TAGS || ''
  }
};
