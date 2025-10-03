# 📝 Browser-Only Sticky Note Application

## Project Overview

This is a **front-end-only web application** for creating and managing time-aware to-do items. It is built entirely with vanilla JavaScript, HTML, and CSS.

The core of this project demonstrates client-side data management by using the browser's native **`localStorage`** API to ensure all tasks are **persisted** (saved) and remain available even after the user closes and re-opens the browser.

## 🟢 Project Status

The application is **stable** and fully implements the **CRUD** (Create, Read, Update, Delete) functionality. Automated **End-to-End (E2E) testing** is integrated using Selenium WebDriver.

## 💡 Key Learning Outcomes

Building this project with an AI agent was a major achievement. The primary takeaways include:

* **Full CRUD Implementation:** Gained hands-on experience implementing all four essential database operations (Create, Read, Update, Delete) using `localStorage` for data handling.
* **Front-End Data Persistence (`localStorage`):** Learned how to use the browser's native storage to save and load the full application state (`setItem()` and `getItem()`), allowing the app to survive a page refresh.
* **Git Workflows with AI Agents:** Adopted the best practice of using a dedicated **Git Worktree** (isolated sandbox) when running the Claude Code agent to prevent accidental changes to the main repository.
* **Vanilla JavaScript DOM Manipulation:** Gained experience writing pure JavaScript to dynamically manipulate the HTML structure (DOM nodes) for rendering, editing, and removing task elements.

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
* **Data Persistence:** `localStorage` API
* **Testing:** **Selenium WebDriver** (Integrated for automated End-to-End testing)
* **Development Tooling:** Claude Code (AI Agentic Tool)

## ✨ Features

* **Persistence:** All notes are automatically saved and loaded from the browser's local storage.
* **Full CRUD Support:** Users can **Create**, **Read**, **Update** (Edit by clicking the task text), and **Delete** tasks.
* **Time-Aware Warnings:** Tasks automatically show a visual warning (blinking text, red highlight) if they become overdue (currently set to a 5-minute timeout).
* **Responsive Design:** Styled with CSS for readability on various devices.

## ✅ Automated Testing (End-to-End)

This project includes automated tests built with **Selenium WebDriver** to validate core functionality (CRUD and persistence).

### How to Run Tests

1.  Ensure you have your Selenium dependencies installed (e.g., via `npm install` if using a Node/JS test runner).
2.  Open the application locally by double-clicking `index.html`.
3.  Run the test suite from your project's terminal:
    ```bash
    # (Use the actual command for your setup, e.g.)
    npm run test:e2e
    ```

## 🚀 How to Run Locally

Since this is a client-side application, you do not need a separate server to run it.

1.  **Clone the repository:**
    ```bash
    git clone [YOUR_GITHUB_URL_HERE]
    cd Sticky-Notes-App
    ```
2.  **Launch in Browser:** Double-click the **`index.html`** file in your project root to open the application in any web browser.

---
---

### Final Git Steps

Once you have saved the content above into your local `README.md` file:

1.  **Stage the modified file:**
    ```powershell
    git add README.md
    ```

2.  **Commit the file:**
    ```powershell
    git commit -m "docs: Fully update README.md to reflect CRUD, Selenium testing, and key learning outcomes"
    ```

3.  **Push the changes to GitHub:**
    ```powershell
    git push origin main
    ```