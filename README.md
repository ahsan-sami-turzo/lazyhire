# 🚀 LazyHire: AI-Enhanced Job Application Tracker

**LazyHire** is a specialized, full-stack job application management system designed to streamline the job search process by integrating application tracking, robust personal profile management, and powerful Google Gemini AI utilities for content generation and tailoring. It is built to be database-agnostic, providing a clean, modular structure.

---

## ✨ Features

LazyHire provides a comprehensive suite of tools centered around efficiency and personalization:

### 1. Application Tracking Dashboard
* **Secure Authentication:** Simple login system configured via environment variables (`.env`).
* **Intuitive Dashboard:** Displays a clear list of all tracked jobs, excluding internal IDs.
* **Visual Status:** Job status is displayed with color-coded badges (New, Applied, Interview Scheduled, Rejected, Offer).
* **Document Status:** Tracks the creation status of personalized documents (`CV Created`, `CL Created`) for quick reference.
* **External Links:** Direct links to the original job advertisement (`Application URL`).

### 2. Personalized Profile & Document Management
* **Detailed Profile Page:** A single source of truth for all professional information (similar to a LinkedIn profile), loaded from a customizable `profile_data.json` file on first launch.
* **Profile Editor:** Allows users to modify and save their detailed profile information (Summary, Skills, Experience, Education).
* **Base CV Generation:** Button to generate a base CV template in Markdown (`.md`) format, stored in the `documents/` directory for manual editing.

### 3. Automated Document Creation & File Management
* **Job Details View:** Dedicated page (`/details/:id`) displaying all contact information and job-specific notes.
* **Dynamic Directory Creation (File System):** When viewing job details, the system automatically creates a dedicated directory for that job: `documents/job-description/[company name]/[job title]/`.
* **AI Document Generation:** Dedicated buttons on the job details page trigger AI generation:
    * **Create Tailored CV:** Uses the Gemini API and profile data to generate a job-specific CV in `.md` format, saved directly to the job's directory.
    * **Create Cover Letter:** Uses the Gemini API to generate a personalized cover letter in `.md` format, saved to the job's directory.
* **Job Deletion:** Functionality to delete an application from the database and remove its associated folder and files from the file system.

### 4. AI Utility Suite
* **Resume Tailor:** Dedicated form for generating a tailored resume based on a job description and an uploaded resume file (Markdown output).
* **Cover Letter Generator:** Dedicated form for general cover letter generation.
* **Interview Prep Assistant:** Tool for generating interview questions and preparation tips.

---

## 💻 Technologies Used

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | **Node.js, Express** | Core server runtime and web framework. |
| **Database** | **Sequelize (ORM)** | Database interaction for models (`Application`, `Profile`). Enables database agnosticism. |
| **Database Driver** | **SQLite3** | Lightweight local database for development. |
| **AI/ML** | **Google Gemini API** | Content generation, document tailoring, and assistance tools. |
| **Templating** | **EJS (Express-EJS-Layouts)** | Server-side HTML rendering and templating. |
| **Authentication** | **Express-Session, dotenv** | Session management and environment variable handling. |
| **Utilities** | **`node-cron`, `multer`, `fs`, `path`** | Scheduling background tasks, file uploads, and file system management. |

---

## 🛠️ Setup and Installation

### Prerequisites

* Node.js (v18+)
* npm (or yarn)
* A Google Gemini API Key

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone [your_repo_url] lazyhire
    cd lazyhire
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a file named **`.env`** in the project root and populate it with your credentials and configuration:
    ```env
    # Google AI API Key
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE

    # Login Credentials
    LOGIN_USERNAME=SoloDev
    LOGIN_PASSWORD=securepassword123
    ```

4.  **Database Migration:**
    Ensure your database schema matches the models by running the necessary migrations:
    ```bash
    npx sequelize-cli db:migrate
    ```

5.  **Configure Initial Profile Data:**
    Ensure the `profile_data.json` file exists in the project root with your desired initial profile information.

6.  **Run the Server:**
    ```bash
    npm start
    # Server listening at http://localhost:3000
    ```

### Access

Open your browser and navigate to `http://localhost:3000`. You will be redirected to the login page.

### 👨‍💻 Developer Note

Developed by **turzo ahsan sami**
*Lazy coder, optimistic dreamer.*