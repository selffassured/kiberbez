class FileListManager {
  constructor() {
    this.files = JSON.parse(localStorage.getItem("uploadedFiles")) || [];
    this.container = null;
    this.filteredFiles = [];
    this.currentSearch = "";
    this.currentCategory = "all";
    this.init();
  }

  highlightText(text, searchTerm) {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(
      regex,
      '<mark style="background: #9c9999; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</mark>'
    );
  }

  downloadFile(fileId) {
    console.log(" Попытка скачать файл ID:", fileId);
    const file = this.files.find((f) => f.id === fileId);
    if (!file) {
      console.error(" Файл не найден");
      return;
    }
    if (file.fileObject) {
      this.downloadFileObject(file.fileObject, file.name);
    } else {
      this.createTempDownload(file.name, "Это содержимое файла " + file.name);
    }
  }

  downloadFileObject(fileObject, fileName) {
    const url = URL.createObjectURL(fileObject);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  createTempDownload(fileName, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.onDomReady());
    } else {
      this.onDomReady();
    }
  }

  onDomReady() {
    this.checkLoggedInUser();
    this.container = document.getElementById("fileListContainer");
    if (!this.container) {
      console.error("❌ Элемент fileListContainer не найден!");
      this.createContainer();
      return;
    }
    this.renderFiles();
    this.autoFindUploadButton();
    this.setupSearch();
    this.setupLoginModal();
    this.setupCategoryTriggers();
  }

  setupCategoryTriggers() {
    const triggers = document.querySelectorAll(".category-trigger");
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const category = trigger.dataset.category;
        this.filterByCategory(category);
        this.updateActiveCategoryTrigger(category);
      });
    });
  }

  updateActiveCategoryTrigger(activeCategory) {
    const triggers = document.querySelectorAll(".category-trigger");
    triggers.forEach((trigger) => {
      if (trigger.dataset.category === activeCategory) {
        trigger.classList.add("active");
      } else {
        trigger.classList.remove("active");
      }
    });
  }

  getFileCategory(file) {
    const name = file.name.toLowerCase();
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".svg",
    ];
    const videoExtensions = [
      ".mp4",
      ".avi",
      ".mov",
      ".mkv",
      ".webm",
      ".flv",
      ".wmv",
    ];
    const documentExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".txt",
      ".rtf",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".torrent",
      ".exe",
    ];

    if (imageExtensions.some((ext) => name.endsWith(ext))) return "images";
    if (videoExtensions.some((ext) => name.endsWith(ext))) return "videos";
    if (documentExtensions.some((ext) => name.endsWith(ext)))
      return "documents";
    return "other";
  }

  filterByCategory(category) {
    this.currentCategory = category;
    if (category === "all") {
      this.filteredFiles = [...this.files];
    } else {
      this.filteredFiles = this.files.filter(
        (file) => this.getFileCategory(file) === category
      );
    }
    if (this.currentSearch.trim()) {
      this.searchFiles(this.currentSearch);
    } else {
      this.renderFilteredFiles();
    }
  }

  setupSearch() {
    const searchInput = document.getElementById("fileSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.currentSearch = e.target.value;
        this.searchFiles(this.currentSearch);
      });
    }
  }

  searchFiles(searchTerm) {
    this.currentSearch = searchTerm;
    let filesToSearch = this.files;
    if (this.currentCategory !== "all") {
      filesToSearch = this.files.filter(
        (file) => this.getFileCategory(file) === this.currentCategory
      );
    }
    if (!searchTerm.trim()) {
      this.filteredFiles = filesToSearch;
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredFiles = filesToSearch
        .filter((file) => file.name.toLowerCase().includes(term))
        .map((file) => {
          const formattedName = this.formatFileName(file.name);
          const highlighted = this.highlightText(formattedName, searchTerm);
          return {
            ...file,
            displayName: formattedName,
            highlightedName: highlighted,
          };
        });
    }
    this.renderFilteredFiles();
  }

  renderFilteredFiles() {
    if (!this.container) return;
    let fileListContent = this.container.querySelector(".file-list-content");
    if (!fileListContent) {
      fileListContent = document.createElement("div");
      fileListContent.className = "file-list-content";
      this.container.appendChild(fileListContent);
    }
    fileListContent.innerHTML = "";
    if (this.filteredFiles.length === 0) {
      fileListContent.innerHTML = '<div class="no-results"> No found</div>';
      return;
    }
    this.filteredFiles.forEach((file) => {
      const fileElement = document.createElement("div");
      fileElement.className = "file-item";
      fileElement.setAttribute("data-type", file.type);
      fileElement.innerHTML = `
                <div class="file-content">
                    <span class="file-icon">${this.getFileIcon(
                      file.type
                    )}</span>
                    <span class="file-name" title="${file.name}">${
        file.highlightedName || this.formatFileName(file.name)
      }</span>
                    <span class="file-size">${file.size}</span>
                </div>
                <div class="file-actions">
                    <button class="download-btn" onclick="fileListManager.downloadFile(${
                      file.id
                    })" title="Download"><img src="img/download.png" width="28"></button>
                    <button class="delete-btn" onclick="fileListManager.deleteFile(${
                      file.id
                    })" title="Delete"><img src="img/delete.png" width="26"></button>
                </div>
            `;
      fileListContent.appendChild(fileElement);
    });
  }

  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "fileListContainer";
    this.container.className = "file-box";
    document.body.appendChild(this.container);
  }

  autoFindUploadButton() {
    const fileInput = document.getElementById("file-upload");
    if (fileInput) {
      fileInput.addEventListener("change", (e) => this.handleFileUpload(e));
    } else {
      this.createFileInput();
    }
  }

  createFileInput() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "autoFileInput";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    fileInput.addEventListener("change", (e) => this.handleFileUpload(e));
    document.body.appendChild(fileInput);
    const uploadBtn = document.createElement("button");
    uploadBtn.textContent = "📁 Выбрать файлы";
    uploadBtn.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 9999;
            padding: 10px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        `;
    uploadBtn.addEventListener("click", () => fileInput.click());
    document.body.appendChild(uploadBtn);
  }

  handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
      for (let file of files) {
        this.addFile(file);
      }
      event.target.value = "";
    }
  }

  addFile(file) {
    const fileData = {
      id: Date.now() + Math.random(),
      name: file.name,
      type: this.getFileType(file),
      size: this.formatFileSize(file.size),
      uploadDate: new Date().toLocaleString(),
      category: this.getFileCategory({ name: file.name, type: file.type }),
    };
    this.files.push(fileData);
    this.saveToLocalStorage();
    if (this.currentCategory !== "all") {
      this.filterByCategory(this.currentCategory);
    } else if (this.currentSearch.trim()) {
      this.searchFiles(this.currentSearch);
    } else {
      this.renderFiles();
    }
  }

  getFileType(file) {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.includes("pdf")) return "document";
    return "document";
  }

  getFileIcon(type) {
    const icons = {
      image: "🖼️",
      video: "🎬",
      document: "📄",
    };
    return icons[type] || "📄";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  deleteFile(fileId) {
    this.files = this.files.filter((file) => file.id !== fileId);
    this.saveToLocalStorage();
    this.renderFilteredFiles();
    this.renderFiles();
  }

  renderFiles() {
    this.filteredFiles = [...this.files];
    this.renderFilteredFiles();
  }

  saveToLocalStorage() {
    localStorage.setItem("uploadedFiles", JSON.stringify(this.files));
  }

  formatFileName(filename, maxLength = 12) {
    if (filename.length <= maxLength) return filename;
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex <= 0) return filename.substring(0, maxLength - 3) + "...";
    const name = filename.substring(0, lastDotIndex);
    const extension = filename.substring(lastDotIndex);
    const availableNameLength = maxLength - 3 - extension.length;
    if (availableNameLength < 1) return "..." + extension;
    return name.substring(0, availableNameLength) + "..." + extension;
  }

  setupLoginModal() {
    // Если пользователь уже авторизован, не настраиваем модальное окно
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
      return;
    }
    const loginBtn = document.querySelector(".login");
    const modal = document.getElementById("loginModal");
    const closeBtn = document.querySelector(".close");
    const loginForm = document.getElementById("loginForm");
    const authSwitchLink = document.querySelector(".auth-switch-link");
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");
    const modalFooterText = document.getElementById("modalFooterText");

    this.isLoginMode = true;

    // Проверяем, есть ли сохраненный пользователь
    this.checkLoggedInUser();

    if (loginBtn && modal) {
      loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.showAuthModal();
      });

      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });

      // Закрытие при клике вне окна
      window.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.style.display = "none";
        }
      });

      // Переключение между логином и регистрацией
      if (authSwitchLink) {
        authSwitchLink.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggleAuthMode();
        });
      }

      // Обработка формы
      if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
          e.preventDefault();
          if (this.isLoginMode) {
            this.handleLogin();
          } else {
            this.handleSignup();
          }
        });
      }
    }
  }

  toggleAuthMode() {
    this.isLoginMode = !this.isLoginMode;
    const modalTitle = document.getElementById("modalTitle");
    const submitBtn = document.getElementById("submitBtn");
    const modalFooterText = document.getElementById("modalFooterText");
    const authSwitchLink = document.querySelector(".auth-switch-link");

    if (this.isLoginMode) {
      modalTitle.textContent = "Login to account";
      submitBtn.textContent = "Login in";
      modalFooterText.innerHTML =
        'No account? <a href="#" class="auth-switch-link">Sign up</a>';
    } else {
      modalTitle.textContent = "Create account";
      submitBtn.textContent = "Sign up";
      modalFooterText.innerHTML =
        'Already have an account? <a href="#" class="auth-switch-link">Login in</a>';
    }

    // Обновляем обработчик для новой ссылки
    const newAuthSwitchLink = document.querySelector(".auth-switch-link");
    if (newAuthSwitchLink) {
      newAuthSwitchLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleAuthMode();
      });
    }
  }

  showAuthModal() {
    const modal = document.getElementById("loginModal");
    // Сбрасываем форму при открытии
    document.getElementById("loginForm").reset();
    modal.style.display = "block";
  }

  handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Получаем сохраненных пользователей
    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Ищем пользователя
    const user = users.find(
      (u) =>
        (u.username === username || u.email === username) &&
        u.password === password
    );

    if (user) {
      // Сохраняем информацию о текущем пользователе
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          username: user.username,
          email: user.email,
        })
      );

      this.updateUIForLoggedInUser(user.email);
      document.getElementById("loginModal").style.display = "none";
      alert(`Welcome back, ${user.email}!`);
    } else {
      alert("Invalid username/email or password");
    }
  }

  handleSignup() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(username);

    if (!isEmail) {
      alert("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    // Получаем существующих пользователей
    const users = JSON.parse(localStorage.getItem("users")) || [];

    // Проверяем, не занят ли email
    if (users.find((u) => u.email === username)) {
      alert("User with this email already exists");
      return;
    }

    // Создаем нового пользователя
    const newUser = {
      username: username.split("@")[0], // Используем часть до @ как username
      email: username,
      password: password,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));

    // Автоматически логиним пользователя
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        username: newUser.username,
        email: newUser.email,
      })
    );

    this.updateUIForLoggedInUser(newUser.email);
    document.getElementById("loginModal").style.display = "none";
    alert(`Account created successfully! Welcome, ${newUser.email}`);
  }

  checkLoggedInUser() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (currentUser) {
      this.updateUIForLoggedInUser(currentUser.email);
    }
  }

  updateUIForLoggedInUser(email) {
    const loginBtn = document.querySelector(".login");
    if (loginBtn) {
      // Полностью заменяем содержимое и убираем обработчик клика
      loginBtn.outerHTML = `
            <div class="user-info">
                ${email}
                <a href="#" class="logout-btn">Logout</a>
            </div>
        `;

      // Добавляем обработчик для кнопки logout
      const logoutBtn = document.querySelector(".logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.handleLogout();
        });
      }
    }
  }

  handleLogout() {
    localStorage.removeItem("currentUser");
    location.reload(); // Простой способ восстановить исходное состояние
  }
}

window.fileListManager = new FileListManager();