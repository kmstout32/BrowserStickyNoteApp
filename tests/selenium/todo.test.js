const assert = require('assert');
const { By, Key, until } = require('selenium-webdriver');
const TestConfig = require('./test-config');

describe('Sticky Note To-Do App Tests', function() {
  let testConfig;
  let driver;

  // Setup before all tests
  before(async function() {
    this.timeout(30000); // Increase timeout for WebDriver setup
    testConfig = new TestConfig();
    driver = await testConfig.setupDriver();
  });

  // Cleanup after all tests
  after(async function() {
    this.timeout(10000);
    await testConfig.teardownDriver();
  });

  // Clear data before each test
  beforeEach(async function() {
    this.timeout(10000);
    await testConfig.navigateToApp();
    await testConfig.clearLocalStorage();
    await driver.navigate().refresh();
  });

  describe('Basic Todo Operations', function() {
    it('should load the application successfully', async function() {
      const title = await driver.getTitle();
      assert.strictEqual(title, 'To-Do List App');
    });

    it('should add a new todo item', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));
      const addButton = await driver.findElement(By.id('addBtn'));

      await todoInput.sendKeys('Test Todo Item');
      await addButton.click();

      // Wait for todo to appear
      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      const todoText = await driver.findElement(By.className('todo-text')).getText();
      assert.strictEqual(todoText, 'Test Todo Item');
    });

    it('should add multiple todo items', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));
      const addButton = await driver.findElement(By.id('addBtn'));

      // Add first todo
      await todoInput.sendKeys('First Todo');
      await addButton.click();

      // Add second todo
      await todoInput.sendKeys('Second Todo');
      await addButton.click();

      // Add third todo
      await todoInput.sendKeys('Third Todo');
      await addButton.click();

      const todoItems = await driver.findElements(By.className('todo-item'));
      assert.strictEqual(todoItems.length, 3);
    });

    it('should not add empty todo items', async function() {
      const addButton = await driver.findElement(By.id('addBtn'));
      await addButton.click();

      // Wait for alert
      await driver.wait(until.alertIsPresent(), 2000);
      const alert = await driver.switchTo().alert();
      const alertText = await alert.getText();
      assert.strictEqual(alertText, 'Please enter a task!');
      await alert.accept();

      const todoItems = await driver.findElements(By.className('todo-item'));
      assert.strictEqual(todoItems.length, 0);
    });

    it('should add todo using Enter key', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));

      await todoInput.sendKeys('Todo via Enter', Key.RETURN);

      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      const todoText = await driver.findElement(By.className('todo-text')).getText();
      assert.strictEqual(todoText, 'Todo via Enter');
    });
  });

  describe('Todo Completion', function() {
    it('should mark todo as completed', async function() {
      // Add a todo
      const todoInput = await driver.findElement(By.id('todoInput'));
      await todoInput.sendKeys('Complete Me', Key.RETURN);
      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      // Click the checkbox
      const checkbox = await driver.findElement(By.className('todo-checkbox'));
      await checkbox.click();

      // Wait a moment for the class to update
      await driver.sleep(500);

      // Check if the todo item has the 'completed' class
      const todoItem = await driver.findElement(By.className('todo-item'));
      const classes = await todoItem.getAttribute('class');
      assert.ok(classes.includes('completed'));
    });

    it('should toggle todo completion state', async function() {
      // Add a todo
      const todoInput = await driver.findElement(By.id('todoInput'));
      await todoInput.sendKeys('Toggle Me', Key.RETURN);
      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      // Complete it
      let checkbox = await driver.findElement(By.className('todo-checkbox'));
      await checkbox.click();
      await driver.sleep(500);

      // Re-find element after render
      let todoItem = await driver.findElement(By.className('todo-item'));
      let classes = await todoItem.getAttribute('class');
      assert.ok(classes.includes('completed'));

      // Uncomplete it - re-find checkbox
      checkbox = await driver.findElement(By.className('todo-checkbox'));
      await checkbox.click();
      await driver.sleep(500);

      // Re-find element after render
      todoItem = await driver.findElement(By.className('todo-item'));
      classes = await todoItem.getAttribute('class');
      assert.ok(!classes.includes('completed'));
    });
  });

  describe('Todo Deletion', function() {
    it('should delete a todo item', async function() {
      // Add a todo
      const todoInput = await driver.findElement(By.id('todoInput'));
      await todoInput.sendKeys('Delete Me', Key.RETURN);
      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      // Click delete button
      const deleteButton = await driver.findElement(By.className('delete-btn'));
      await deleteButton.click();

      // Wait for todo to be removed
      await driver.sleep(500);

      const todoItems = await driver.findElements(By.className('todo-item'));
      assert.strictEqual(todoItems.length, 0);
    });

    it('should delete the correct todo when multiple exist', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));

      // Add three todos
      await todoInput.sendKeys('First Todo', Key.RETURN);
      await driver.sleep(300);
      await todoInput.sendKeys('Second Todo', Key.RETURN);
      await driver.sleep(300);
      await todoInput.sendKeys('Third Todo', Key.RETURN);
      await driver.sleep(300);

      // Delete the second todo
      const deleteButtons = await driver.findElements(By.className('delete-btn'));
      await deleteButtons[1].click();
      await driver.sleep(500);

      // Check remaining todos
      const todoItems = await driver.findElements(By.className('todo-text'));
      assert.strictEqual(todoItems.length, 2);

      const firstText = await todoItems[0].getText();
      const secondText = await todoItems[1].getText();

      assert.strictEqual(firstText, 'First Todo');
      assert.strictEqual(secondText, 'Third Todo');
    });
  });

  describe('Due Date and Timer Features', function() {
    it('should add todo with due date', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));
      const dueDateInput = await driver.findElement(By.id('dueDateInput'));

      // Set a future date (1 hour from now)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      const dateString = futureDate.toISOString().slice(0, 16);

      await todoInput.sendKeys('Todo with deadline');

      // Set date using JavaScript executor for better reliability
      await driver.executeScript(`document.getElementById('dueDateInput').value = '${dateString}';`);

      await todoInput.sendKeys(Key.RETURN);

      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      // Wait for due date element to appear
      await driver.wait(until.elementLocated(By.className('due-date')), 3000);

      // Check if due date is displayed
      const dueDateElement = await driver.findElement(By.className('due-date'));
      const dueDateText = await dueDateElement.getText();
      assert.ok(dueDateText.includes('📅'));
    });

    it('should display countdown timer for todo with due date', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));

      // Set a future date (30 minutes from now)
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);
      const dateString = futureDate.toISOString().slice(0, 16);

      await todoInput.sendKeys('Todo with timer');

      // Set date using JavaScript executor for better reliability
      await driver.executeScript(`document.getElementById('dueDateInput').value = '${dateString}';`);

      await todoInput.sendKeys(Key.RETURN);

      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      // Wait for countdown to appear
      await driver.wait(until.elementLocated(By.className('countdown')), 3000);

      // Check if countdown is displayed
      const countdown = await driver.findElement(By.className('countdown'));
      const countdownText = await countdown.getText();
      assert.ok(countdownText.includes('⏰'));
      assert.ok(countdownText.includes('m') || countdownText.includes('h'));
    });
  });

  describe('LocalStorage Persistence', function() {
    it('should persist todos after page refresh', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));

      // Add todos
      await todoInput.sendKeys('Persistent Todo 1', Key.RETURN);
      await driver.sleep(300);
      await todoInput.sendKeys('Persistent Todo 2', Key.RETURN);
      await driver.sleep(500);

      // Refresh the page
      await driver.navigate().refresh();
      await driver.wait(until.elementLocated(By.id('todoInput')), 5000);

      // Check if todos still exist
      const todoItems = await driver.findElements(By.className('todo-text'));
      assert.strictEqual(todoItems.length, 2);

      const firstText = await todoItems[0].getText();
      const secondText = await todoItems[1].getText();

      assert.strictEqual(firstText, 'Persistent Todo 1');
      assert.strictEqual(secondText, 'Persistent Todo 2');
    });

    it('should persist completion state after refresh', async function() {
      const todoInput = await driver.findElement(By.id('todoInput'));

      // Add a todo and complete it
      await todoInput.sendKeys('Complete and Persist', Key.RETURN);
      await driver.wait(until.elementLocated(By.className('todo-item')), 3000);

      const checkbox = await driver.findElement(By.className('todo-checkbox'));
      await checkbox.click();
      await driver.sleep(500);

      // Refresh
      await driver.navigate().refresh();
      await driver.wait(until.elementLocated(By.id('todoInput')), 5000);

      // Check if still completed
      const refreshedCheckbox = await driver.findElement(By.className('todo-checkbox'));
      const isChecked = await refreshedCheckbox.isSelected();
      assert.ok(isChecked);
    });
  });
});
