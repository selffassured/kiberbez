class FileListManager {
    constructor() {
        this.files = [];
        this.container = null;
        this.filteredFiles = [];
        this.currentSearch = "";
        this.currentCategory = "all";
        this.apiBase = '/api';
        this.init();
    }

    // Методы для работы с авторизацией
    getAuthHeaders() {
        const token = localStorage.getItem('authToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    getAuthHeadersFormData() {
        const token = localStorage.getItem('authToken');
        return {
            'Authorization': `Bearer ${token}`
        };
    }

    // Загрузка файлов с сервера
    async loadFiles() {
        try {
            const response = await fetch(`${this.apiBase}/files`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 401) {
                this.handleLogout();
                return;
            }
            
            if (!response.ok) throw new Error('Failed to load files');
            
            this.files = await response.json();
            this.renderFiles();
        } catch (error) {
            console.error('Error loading files:', error);
            this.files = [];
            this.renderFiles();
        }
    }

    // Загрузка файла на сервер
    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBase}/files/upload`, {
                method: 'POST',
                headers: this.getAuthHeadersFormData(),
                body: formData
            });

            if (response.status === 401) {
                this.handleLogout();
                return;
            }

            if (!response.ok) throw new Error('Upload failed');
            
            return await response.json();
        } catch (error) {
            console.error('Upload error:', error);
            alert('File upload failed');
        }
    }

    // Скачивание файла
    async downloadFile(fileId) {
        try {
            const file = this.files.find(f => f.id === fileId);
            if (!file) return;

            const response = await fetch(`${this.apiBase}/files/download/${fileId}`, {
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 401) {
                this.handleLogout();
                return;
            }
            
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            alert('File download failed');
        }
    }

    // Удаление файла
    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file?')) return;
        
        try {
            const response = await fetch(`${this.apiBase}/files/${fileId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (response.status === 401) {
                this.handleLogout();
                return;
            }
            
            if (!response.ok) throw new Error('Delete failed');
            
            await this.loadFiles(); // Обновляем список
        } catch (error) {
            console.error('Delete error:', error);
            alert('File deletion failed');
        }
    }

    // Проверка авторизации
    async checkAuth() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            return false;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/auth/verify`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                this.handleLogout();
                return false;
            }
            
            const userData = await response.json();
            this.updateUIForLoggedInUser(userData.email);
            return true;
        } catch (error) {
            this.handleLogout();
            return false;
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm.trim()) return text;
        const regex = new RegExp(`(${searchTerm})`, "gi");
        return text.replace(
            regex,
            '<mark style="background: #9c9999; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</mark>'
        );
    }

    init() {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.onDomReady());
        } else {
            this.onDomReady();
        }
    }

    async onDomReady() {
        const isAuthenticated = await this.checkAuth();
        this.container = document.getElementById("fileListContainer");
        
        if (!this.container) {
            console.error("❌ Элемент fileListContainer не найден!");
            this.createContainer();
            return;
        }
        
        if (isAuthenticated) {
            await this.loadFiles();
        } else {
            this.showAuthModal();
        }
        
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
            fileListContent.innerHTML = '<div class="no-results"> No files found</div>';
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
                    <button class="download-btn" onclick="fileListManager.downloadFile('${
                        file.id
                    }')" title="Download"><img src="img/download.png" width="28"></button>
                    <button class="delete-btn" onclick="fileListManager.deleteFile('${
                        file.id
                    }')" title="Delete"><img src="img/delete.png" width="26"></button>
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

    async handleFileUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        for (let file of files) {
            await this.uploadFile(file);
        }
        
        event.target.value = "";
        await this.loadFiles(); // Перезагружаем список
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
        uploadBtn.textContent = "📁 Upload files";
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

    getFileType(file) {
        if (file.type) {
            if (file.type.startsWith("image/")) return "image";
            if (file.type.startsWith("video/")) return "video";
            if (file.type.includes("pdf")) return "document";
        }
        
        // Fallback based on file extension
        const name = file.name.toLowerCase();
        if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return "image";
        if (name.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv)$/)) return "video";
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
        if (!bytes) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    renderFiles() {
        this.filteredFiles = [...this.files];
        this.renderFilteredFiles();
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
        const loginBtn = document.querySelector(".login");
        const modal = document.getElementById("loginModal");
        const closeBtn = document.querySelector(".close");

        this.isLoginMode = true;

        if (loginBtn && modal) {
            loginBtn.addEventListener("click", (e) => {
                e.preventDefault();
                this.showAuthModal();
            });

            closeBtn.addEventListener("click", () => {
                modal.style.display = "none";
            });

            window.addEventListener("click", (e) => {
                if (e.target === modal) {
                    modal.style.display = "none";
                }
            });

            const authSwitchLink = document.querySelector(".auth-switch-link");
            if (authSwitchLink) {
                authSwitchLink.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.toggleAuthMode();
                });
            }

            const loginForm = document.getElementById("loginForm");
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
        document.getElementById("loginForm").reset();
        modal.style.display = "block";
    }

    async handleLogin() {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: username,
                    password: password
                })
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            this.updateUIForLoggedInUser(data.user.email);
            document.getElementById("loginModal").style.display = "none";
            await this.loadFiles();
            
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: Invalid credentials');
        }
    }

    async handleSignup() {
        const email = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Простая валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            const data = await response.json();
            
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            
            this.updateUIForLoggedInUser(data.user.email);
            document.getElementById("loginModal").style.display = "none";
            await this.loadFiles();
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: ' + error.message);
        }
    }

    updateUIForLoggedInUser(email) {
        const loginBtn = document.querySelector(".login");
        if (loginBtn) {
            loginBtn.outerHTML = `
                <div class="user-info">
                    ${email}
                    <a href="#" class="logout-btn">Logout</a>
                </div>
            `;

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
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        this.files = [];
        location.reload();
    }
}

window.fileListManager = new FileListManager();