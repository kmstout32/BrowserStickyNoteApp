const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class TestConfig {
  constructor() {
    this.driver = null;
    this.baseUrl = 'http://localhost:3000';
  }

  async setupDriver() {
    try {
      const options = new chrome.Options();
      // Run in headless mode for more reliable execution
      options.addArguments('--headless=new');
      options.addArguments('--disable-gpu');
      options.addArguments('--no-sandbox');
      options.addArguments('--disable-dev-shm-usage');
      options.addArguments('--window-size=1920,1080');
      options.addArguments('--disable-extensions');

      // Let Selenium Manager handle the driver automatically
      this.driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

      return this.driver;
    } catch (error) {
      console.error('Error setting up WebDriver:', error);
      throw error;
    }
  }

  async teardownDriver() {
    if (this.driver) {
      await this.driver.quit();
    }
  }

  async navigateToApp() {
    await this.driver.get(this.baseUrl);
    // Wait for page to load
    await this.driver.wait(until.elementLocated(By.id('todoInput')), 5000);
  }

  async clearLocalStorage() {
    await this.driver.executeScript('localStorage.clear();');
  }
}

module.exports = TestConfig;
