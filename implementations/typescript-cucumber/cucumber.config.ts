import { defineConfig } from '@cucumber/cucumber';

export default defineConfig({
  formatOptions: {
    snippetInterface: 'async-await'
  },
  formats: [
    ['pretty', {}],  // Console output
    ['json:cucumber-report.json', {}],  // Machine-readable report
  ],
  publishQuiet: true,
  requireModule: ['ts-node/register'],
  require: ['step-definitions/**/*.ts'],
  import: ['features/**/*.feature']
});
