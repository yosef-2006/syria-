class AppStore {
    constructor() {
        this.files = {
            android: [],
            windows: []
        };
        this.filteredFiles = {
            android: [],
            windows: []
        };
        this.currentSearchTerm = '';
        this.init();
    }

    async init() {
        await this.scanRealFiles();
        this.displayFiles();
        this.updateStats();
        this.setupEventListeners();
        this.setupAutoRefresh();
        this.setupSearch();
        this.setupUploadUI();
    }

    async scanRealFiles() {
        try {
            console.log('🔍 جاري مسح الملفات...');
            
            // مسح مجلدات التطبيقات
            this.files.android = await this.scanDirectory('android');
            this.files.windows = await this.scanDirectory('windows');
            
            // تطبيق البحث الحالي إذا كان موجودًا
            this.filterFiles(this.currentSearchTerm);
            
            console.log('✅ تم العثور على الملفات:', {
                android: this.files.android.length,
                windows: this.files.windows.length
            });
            
        } catch (error) {
            console.error('❌ خطأ في مسح الملفات:', error);
            this.showError('حدث خطأ في تحميل الملفات');
        }
    }

    async scanDirectory(folder) {
        try {
            const response = await fetch(`${window.location.origin}/api/files?path=${folder}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const files = await response.json();
            return files.map(file => ({
                ...file,
                lastModified: new Date(file.lastModified * 1000)
            }));
        } catch (error) {
            console.error(`❌ خطأ في مسح مجلد ${folder}:`, error);
            return [];
        }
    }

    displayFiles() {
        const filesToDisplay = this.currentSearchTerm ? this.filteredFiles : this.files;
        this.displayCategory('android', filesToDisplay.android);
        this.displayCategory('windows', filesToDisplay.windows);
    }

    displayCategory(category, files) {
        const container = document.getElementById(`${category}-list`);
        if (!container) return;

        if (files.length === 0) {
            if (this.currentSearchTerm) {
                container.innerHTML = this.getSearchEmptyState(category);
            } else {
                container.innerHTML = this.getEmptyState(category);
            }
            return;
        }

        container.innerHTML = files.map(file => 
            this.createFileCard(file, category)
        ).join('');
    }

    getEmptyState(category) {
        const categoryName = category === 'android' ? 'أندرويد' : 'ويندوز';
        const extension = category === 'android' ? 'APK' : 'EXE';
        
        return `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-folder-open fa-3x text-muted mb-4"></i>
                    <h4 class="text-muted mb-3">لا توجد تطبيقات ${categoryName}</h4>
                    <p class="text-muted mb-4">قم بإضافة ملفات ${extension} إلى المجلد المخصص</p>
                    <div class="alert alert-info mb-4">
                        <i class="fas fa-info-circle me-2"></i>
                        المسار: ~/syrian-store/downloads/${category}/
                    </div>
                    <button class="btn btn-primary btn-lg" onclick="location.reload()">
                        <i class="fas fa-sync me-2"></i>
                        تحديث الصفحة
                    </button>
                </div>
            </div>
        `;
    }

    getSearchEmptyState(category) {
        const categoryName = category === 'android' ? 'أندرويد' : 'ويندوز';
        
        return `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-search fa-3x text-muted mb-4"></i>
                    <h4 class="text-muted mb-3">لا توجد نتائج بحث في ${categoryName}</h4>
                    <p class="text-muted mb-4">جرب استخدام كلمات بحث أخرى</p>
                    <button class="btn btn-primary btn-lg" onclick="appStore.clearSearch()">
                        <i class="fas fa-times me-2"></i>
                        مسح البحث
                    </button>
                </div>
            </div>
        `;
    }

    createFileCard(file, category) {
        const iconClass = category === 'android' ? 'fab fa-android' : 'fab fa-windows';
        const typeName = category === 'android' ? 'أندرويد' : 'ويندوز';
        const btnClass = category === 'android' ? 'btn-success' : 'btn-dark';
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="app-card">
                    <div class="app-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    
                    <h5 class="fw-bold mb-3 text-truncate" title="${file.name}">
                        ${this.formatFileName(file.name)}
                    </h5>
                    
                    <div class="file-info">
                        <div class="file-meta">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-muted">النوع:</span>
                                <span class="fw-bold text-${category === 'android' ? 'success' : 'dark'}">
                                    ${typeName}
                                </span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="text-muted">الحجم:</span>
                                <span class="file-size">${this.formatSize(file.size)}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="text-muted">التاريخ:</span>
                                <span class="text-muted">${file.lastModified.toLocaleDateString('ar-SY')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <a href="downloads/${category}/${encodeURIComponent(file.name)}" 
                       class="btn ${btnClass} download-btn" 
                       download="${file.name}">
                        <i class="fas fa-download me-2"></i>
                        تحميل الآن
                    </a>
                </div>
            </div>
        `;
    }

    formatFileName(name) {
        return name.replace(/\.[^/.]+$/, "").substring(0, 30);
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateStats() {
        const androidCount = this.currentSearchTerm ? this.filteredFiles.android.length : this.files.android.length;
        const windowsCount = this.currentSearchTerm ? this.filteredFiles.windows.length : this.files.windows.length;
        const totalFiles = androidCount + windowsCount;

        document.getElementById('android-count').textContent = androidCount;
        document.getElementById('windows-count').textContent = windowsCount;
        document.getElementById('total-files').textContent = totalFiles;

        const totalSize = this.calculateTotalSize();
        document.getElementById('total-size').textContent = totalSize;
    }

    calculateTotalSize() {
        let totalBytes = 0;
        const filesToUse = this.currentSearchTerm ? this.filteredFiles : this.files;

        filesToUse.android.forEach(file => {
            totalBytes += file.size;
        });

        filesToUse.windows.forEach(file => {
            totalBytes += file.size;
        });

        return this.formatSize(totalBytes);
    }

    showError(message) {
        const containers = ['android-list', 'windows-list'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="col-12">
                        <div class="alert alert-danger text-center p-4">
                            <i class="fas fa-exclamation-triangle fa-2x me-2"></i>
                            <h5 class="mb-0">${message}</h5>
                        </div>
                    </div>
                `;
            }
        });
    }

    setupEventListeners() {
        // التنقل السلس
        document.querySelectorAll('.android-btn, .windows-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('search-input');
        const clearSearchBtn = document.getElementById('clear-search');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterFiles(e.target.value);
                
                // إظهار أو إخفاء زر مسح البحث
                if (e.target.value) {
                    clearSearchBtn.style.display = 'block';
                } else {
                    clearSearchBtn.style.display = 'none';
                }
            });
        }
        
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
    }
    
    filterFiles(searchTerm) {
        this.currentSearchTerm = searchTerm.toLowerCase().trim();
        
        if (!this.currentSearchTerm) {
            this.filteredFiles.android = [...this.files.android];
            this.filteredFiles.windows = [...this.files.windows];
        } else {
            this.filteredFiles.android = this.files.android.filter(file => 
                file.name.toLowerCase().includes(this.currentSearchTerm)
            );
            
            this.filteredFiles.windows = this.files.windows.filter(file => 
                file.name.toLowerCase().includes(this.currentSearchTerm)
            );
        }
        
        this.displayFiles();
        this.updateStats();
    }
    
    clearSearch() {
        document.getElementById('search-input').value = '';
        document.getElementById('clear-search').style.display = 'none';
        this.filterFiles('');
    }

    setupAutoRefresh() {
        setInterval(async () => {
            await this.scanRealFiles();
            this.displayFiles();
            this.updateStats();
        }, 10000);
    }

    // دالة لرفع الملفات
    async uploadFile(file, type) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${window.location.origin}/api/upload/${type}`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('تم رفع الملف بنجاح!');
                await this.scanRealFiles(); // إعادة تحميل الملفات
                this.displayFiles();
                this.updateStats();
            } else {
                alert('فشل في رفع الملف: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('حدث خطأ أثناء رفع الملف');
        }
    }

    // إعداد واجهة الرفع
    setupUploadUI() {
        // إضافة واجهة الرفع إذا لم تكن موجودة
        if (!document.getElementById('upload-section')) {
            const uploadSection = `
                <section id="upload-section" class="py-5 bg-light">
                    <div class="container">
                        <div class="row">
                            <div class="col-12">
                                <div class="section-header text-center mb-5">
                                    <div class="section-icon bg-warning">
                                        <i class="fas fa-upload"></i>
                                    </div>
                                    <h2 class="fw-bold text-dark mt-3">رفع تطبيقات جديدة</h2>
                                    <p class="text-muted">يمكنك رفع ملفات APK أو EXE جديدة</p>
                                </div>
                            </div>
                        </div>
                        <div class="row justify-content-center">
                            <div class="col-md-8">
                                <div class="card shadow">
                                    <div class="card-body p-4">
                                        <div class="mb-4">
                                            <label class="form-label">نوع التطبيق</label>
                                            <select id="upload-type" class="form-select">
                                                <option value="android">تطبيقات أندرويد (APK)</option>
                                                <option value="windows">تطبيقات ويندوز (EXE)</option>
                                            </select>
                                        </div>
                                        <div class="mb-4">
                                            <label class="form-label">اختر الملف</label>
                                            <input type="file" id="file-input" class="form-control" accept=".apk,.exe">
                                        </div>
                                        <button id="upload-btn" class="btn btn-warning btn-lg w-100">
                                            <i class="fas fa-upload me-2"></i>
                                            رفع الملف
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            `;
            
            // إضافة قسم الرفع قبل الfooter
            document.body.insertAdjacentHTML('beforeend', uploadSection);
            
            // إعداد حدث الرفع
            document.getElementById('upload-btn').addEventListener('click', () => {
                const fileInput = document.getElementById('file-input');
                const typeSelect = document.getElementById('upload-type');
                
                if (fileInput.files.length === 0) {
                    alert('يرجى اختيار ملف للرفع');
                    return;
                }
                
                this.uploadFile(fileInput.files[0], typeSelect.value);
            });
        }
    }
}

// تهيئة المتجر
let appStore;
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        appStore = new AppStore();
    }, 1000);
});
