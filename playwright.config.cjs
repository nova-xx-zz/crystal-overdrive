'use strict';
const {defineConfig} = require('@playwright/test');
const chromiumLaunchOptions=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {};

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
    {name:'chromium', testIgnore:'**/touch-swipe.spec.cjs', use:{browserName:'chromium', launchOptions:chromiumLaunchOptions}},
    {name:'webkit', testIgnore:'**/touch-swipe.spec.cjs', use:{browserName:'webkit'}},
    {name:'chromium-touch', testMatch:'**/touch-swipe.spec.cjs', use:{browserName:'chromium', launchOptions:chromiumLaunchOptions, viewport:{width:393,height:852}, isMobile:true, hasTouch:true}},
  ],
  webServer: {command:'node scripts/serve-web.cjs', url:'http://127.0.0.1:4173', reuseExistingServer:!process.env.CI},
});
