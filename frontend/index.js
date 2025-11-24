const API_URL = "/api";

class FileListManager {
  constructor() {
    this.files = [];
    this.container = null;
    this.filteredFiles = [];
    this.currentSearch = "";
    this.currentCategory = "all";
    this.isLoginMode = true;
    this.init();
  }

  async init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.onDomReady());
    } else {
      this.onDomReady();
    }
    await this.fetchFiles();
    await this.checkAuth();
  }


  async checkAuth() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Not logged in");
      const data = await res.json();
      this.showLoggedInUser(data.email);
    } catch (err) {
    }
  }


  getCategoryFromType(mime) {
    if (!mime) return "documents";

    if (mime.startsWith("image/")) return "images";
    if (mime.startsWith("video/")) return "videos";

    return "documents";
  }


  highlightText(text, searchTerm) {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return text.replace(
      regex,
      '<mark style="background: #9c9999; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: bold;">$1</mark>'
    );
  }

  async fetchFiles() {
    try {
      const res = await fetch(`${API_URL}/files/`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      this.files = data.files;
      this.renderFiles();
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  }

  async uploadFiles(fileList, faceFile = null) {
    const formData = new FormData();

    for (const file of fileList) {
      formData.append("files", file);
    }

    if (faceFile) {
      formData.append("face", faceFile);
    }

    try {
      const res = await fetch(`${API_URL}/files/upload`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      this.files = data.files;
      this.renderFiles();

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed");
    }
  }


  async downloadFile(fileToken) {
    try {
      const selfieBlob = await this.openWebcam();

      const formData = new FormData();
      formData.append("selfie", selfieBlob);

      const verifyRes = await fetch(`${API_URL}/files/${fileToken}/verify-selfie`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!verifyRes.ok) {
        alert("Verification failed");
        return;
      }

      const res = await fetch(`${API_URL}/files/${fileToken}/download`, {
        method: "GET",
        credentials: "include"
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();

      const file = this.files.find((f) => f.token === fileToken);
      if (!file) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  }


  async deleteFile(fileToken) {
    try {
      const res = await fetch(`${API_URL}/files/${fileToken}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) throw new Error("Delete failed");
      this.files = this.files.filter((f) => f.token !== fileToken);
      this.renderFiles();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  openWebcam() {
    return new Promise(async (resolve, reject) => {
      const modal = document.getElementById("webcamModal");
      const video = document.getElementById("webcam");
      const closeBtn = document.getElementById("webcamClose");
      const takeBtn = document.getElementById("takeSnapshotBtn");

      modal.style.display = "block";

      let stream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
      } catch (err) {
        alert("Unable to access webcam");
        reject(err);
        return;
      }

      closeBtn.onclick = () => {
        modal.style.display = "none";
        stream.getTracks().forEach(t => t.stop());
        reject("closed");
      };

      takeBtn.onclick = () => {
        const canvas = document.getElementById("snapshotCanvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          modal.style.display = "none";
          stream.getTracks().forEach(t => t.stop());
          resolve(blob);
        }, "image/jpeg");
      };
    });
  }


  onDomReady() {
    this.container = document.getElementById("fileListContainer");
    if (!this.container) this.createContainer();
    this.renderFiles();
    this.setupSearch();
    this.setupCategoryTriggers();
    this.setupUpload();
    this.setupLoginModal();
  }

  setupUpload() {
    const fileInput = document.getElementById("file-upload");
    const faceInput = document.getElementById("face-upload");
    const uploadBtn = document.getElementById("uploadAllBtn");

    this.filesToUpload = [];
    this.faceFile = null;

    fileInput.addEventListener("change", (e) => {
      this.filesToUpload = Array.from(e.target.files);
      console.log("Выбраны обычные файлы:", this.filesToUpload);
    });

    faceInput.addEventListener("change", (e) => {
      this.faceFile = e.target.files[0];
      console.log("Выбрано фото лица:", this.faceFile);
    });

    uploadBtn.addEventListener("click", async () => {
      if (this.filesToUpload.length === 0 && !this.faceFile) {
        alert("Сначала выберите файлы или фото лица");
        return;
      }

      await this.uploadFiles(this.filesToUpload, this.faceFile);

      this.filesToUpload = [];
      this.faceFile = null;

      fileInput.value = "";
      faceInput.value = "";

      console.log("Загрузка завершена");
    });
  }



  setupSearch() {
    const searchInput = document.getElementById("fileSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.currentSearch = e.target.value;
        this.filterFiles();
      });
    }
  }

  setupCategoryTriggers() {
    const triggers = document.querySelectorAll(".category-trigger");
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        this.currentCategory = trigger.dataset.category;
        this.updateActiveCategoryTrigger();
        this.filterFiles();
      });
    });
  }

  updateActiveCategoryTrigger() {
    const triggers = document.querySelectorAll(".category-trigger");
    triggers.forEach((trigger) => {
      if (trigger.dataset.category === this.currentCategory) {
        trigger.classList.add("active");
      } else {
        trigger.classList.remove("active");
      }
    });
  }

  filterFiles() {
    let filesToFilter = [...this.files];

    if (this.currentCategory !== "all") {
      filesToFilter = filesToFilter.filter(
        (f) => this.getCategoryFromType(f.type) === this.currentCategory
      );
    }
    if (this.currentSearch.trim()) {
      const term = this.currentSearch.toLowerCase();
      filesToFilter = filesToFilter.filter((f) =>
        f.filename.toLowerCase().includes(term)
      );
    }

    this.filteredFiles = filesToFilter;
    this.renderFilteredFiles();
  }


  renderFiles() {
    this.filteredFiles = [...this.files];
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
    if (!this.filteredFiles.length) {
      fileListContent.innerHTML = "<div class='no-results'>No files</div>";
      return;
    }

    this.filteredFiles.forEach((file) => {
      const fileElement = document.createElement("div");
      fileElement.className = "file-item";
      fileElement.innerHTML = `
        <div class="file-content">
          <span class="file-icon">${this.getFileIcon(file.type || "document")}</span>
          <span class="file-name" title="${file.filename}">${file.filename}</span>
          <span class="file-size">${this.formatFileSize(file.size)}</span>
          
        </div>
        <div class="file-actions">
          <button class="download-btn"><img src="img/download.png" width="28"></button>
          <button class="delete-btn"><img src="img/delete.png" width="26"></button>
        </div>
      `;
      fileElement.querySelector(".download-btn").addEventListener("click", () => this.downloadFile(file.token));
      fileElement.querySelector(".delete-btn").addEventListener("click", () => this.deleteFile(file.token));
      fileListContent.appendChild(fileElement);
    });
  }

  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "fileListContainer";
    this.container.className = "file-box";
    document.body.appendChild(this.container);
  }

  getFileIcon(file_type) {
    console.log(file_type);

    if (file_type.startsWith("image/")) return "🖼️";
    if (file_type.startsWith("video/")) return "🎬";
    if (file_type === "application/pdf") return "📄";

    return "📄";
  }

  formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return "0 B";

    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);

    return `${value.toFixed(1)} ${sizes[i]}`;
  }



  setupLoginModal() {
    const loginBtn = document.querySelector(".login");
    const modal = document.getElementById("loginModal");
    const closeBtn = modal.querySelector(".close");
    const loginForm = modal.querySelector("#loginForm");
    const authSwitchLink = modal.querySelector(".auth-switch-link");

    if (!loginBtn || !modal || !loginForm || !authSwitchLink) return;

    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "block";
    });

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });

    authSwitchLink.addEventListener("click", (e) => {
      e.preventDefault();
      this.isLoginMode = !this.isLoginMode;
      modal.querySelector("#modalTitle").textContent = this.isLoginMode ? "Login to account" : "Create account";
      modal.querySelector("#submitBtn").textContent = this.isLoginMode ? "Login in" : "Sign up";
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (this.isLoginMode) await this.handleLogin();
      else await this.handleSignup();
    });
  }

  async handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      document.getElementById("loginModal").style.display = "none";
      await this.fetchFiles();

      this.showLoggedInUser(data.email);
    } catch (err) {
      console.error(err);
      alert("Invalid username or password");
    }
  }

  async handleSignup() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: username, password })
      });
      if (!res.ok) throw new Error("Signup failed");
      const data = await res.json();
      document.getElementById("loginModal").style.display = "none";
      await this.fetchFiles();

      this.showLoggedInUser(data.email);
    } catch (err) {
      console.error(err);
      alert("Signup failed");
    }
  }

  showLoggedInUser(email) {
    const loginLink = document.querySelector(".login");
    if (!loginLink) return;

    loginLink.innerHTML = `Hello, ${email} | <a href="#" id="logoutBtn">Logout</a>`;
    loginLink.style.cursor = "default";

    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      loginLink.innerHTML = "Login in";
      loginLink.style.cursor = "pointer";
    });
  }

}

window.fileListManager = new FileListManager();
