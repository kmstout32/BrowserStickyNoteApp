# Selenium Tests for Sticky Note App

## Overview
This folder contains automated Selenium tests for the Sticky Note To-Do application.

## Prerequisites
1. **Node.js** (v14 or higher)
2. **Chrome Browser** installed
3. **ChromeDriver** (automatically installed via npm)

## Setup

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `mocha` - Test framework
- `selenium-webdriver` - Selenium WebDriver for browser automation
- `chromedriver` - Chrome driver for Selenium

### 2. Start the Application
Before running tests, make sure the app is running:
```bash
npm start
```

The app should be accessible at `http://localhost:3000`

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npx mocha tests/selenium/todo.test.js --timeout 10000
```

## Test Suites

### 1. Basic Todo Operations
- Load application successfully
- Add new todo items
- Add multiple todos
- Prevent empty todos
- Add todo using Enter key

### 2. Todo Completion
- Mark todo as completed
- Toggle completion state

### 3. Todo Deletion
- Delete a todo item
- Delete specific todo from multiple items

### 4. Due Date and Timer Features
- Add todo with due date
- Display countdown timer

### 5. LocalStorage Persistence
- Persist todos after page refresh
- Persist completion state after refresh

## Test Configuration

Configuration can be modified in `test-config.js`:

- **Base URL**: Default is `http://localhost:3000`
- **Browser**: Default is Chrome
- **Headless Mode**: Uncomment the line in `test-config.js` to run in headless mode

## Troubleshooting

### Tests Fail with "Connection Refused"
Make sure the application is running on `http://localhost:3000` before running tests.

### ChromeDriver Version Mismatch
Update chromedriver to match your Chrome version:
```bash
npm install chromedriver@latest --save-dev
```

### Tests Timeout
Increase the timeout in the test command or specific test:
```bash
npx mocha tests/selenium/**/*.test.js --timeout 20000
```

## Adding New Tests

1. Create a new test file in `tests/selenium/` with `.test.js` extension
2. Import `TestConfig` and required Selenium modules
3. Follow the existing test structure
4. Run tests to verify

## CI/CD Integration

To run tests in CI/CD pipelines, use headless mode:
- Uncomment `options.addArguments('--headless');` in `test-config.js`
- Ensure ChromeDriver is installed in the CI environment
