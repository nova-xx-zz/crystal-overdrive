'use strict';
const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 45000,
  expect: {timeout: 5000},
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  retries: 0,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {baseURL:'http://127.0.0.1:4173', trace:'retain-on-failure', screenshot:'only-on-failure', reducedMotion:'reduce'},
  projects: [
    {name:'chromium', use:{browserName:'chromium', launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {}}},
    {name:'webkit', use:{browserName:'webkit'}},
  ],
  webServer: {command:'node scripts/serve-web.cjs', url:'http://127.0.0.1:4173', reuseExistingServer:!process.env.CI},
});
