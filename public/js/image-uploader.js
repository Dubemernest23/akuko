// Image uploader for post form
class ImageUploader {
    constructor(options) {
      this.containerId = options.containerId;
      this.inputName = options.inputName || 'featuredImage';
      this.uploadEndpoint = options.uploadEndpoint || '/admin/upload';
      this.currentImage = options.currentImage || '';
      
      this.init();
    }
    
    init() {
      const container = document.getElementById(this.containerId);
      if (!container) return;
      
      container.innerHTML = `
        <div class="image-uploader">
          <input type="hidden" name="${this.inputName}" id="${this.inputName}" value="${this.currentImage}">
          
          <div class="upload-area border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
               id="upload-area">
            <svg class="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-gray-600 mb-2">Click to upload or drag and drop</p>
            <p class="text-sm text-gray-500">PNG, JPG, GIF, WEBP up to 5MB</p>
            <input type="file" 
                   id="file-input" 
                   class="hidden" 
                   accept="image/png,image/jpeg,image/jpg,image/gif,image/webp">
          </div>
          
          <div class="preview-area hidden mt-4" id="preview-area">
            <div class="relative">
              <img id="preview-image" class="w-full rounded-lg" alt="Preview">
              <button type="button" 
                      id="remove-image"
                      class="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">
                Remove
              </button>
            </div>
          </div>
          
          <div class="upload-progress hidden mt-4" id="upload-progress">
            <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div id="progress-bar" class="bg-blue-600 h-full transition-all" style="width: 0%"></div>
            </div>
            <p class="text-sm text-gray-600 mt-2 text-center">Uploading...</p>
          </div>
        </div>
      `;
      
      this.attachEvents();
      
      // Show current image if exists
      if (this.currentImage) {
        this.showPreview(this.currentImage);
      }
    }
    
    attachEvents() {
      const uploadArea = document.getElementById('upload-area');
      const fileInput = document.getElementById('file-input');
      const removeBtn = document.getElementById('remove-image');
      
      // Click to upload
      uploadArea.addEventListener('click', () => {
        fileInput.click();
      });
      
      // Drag and drop
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
      });
      
      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
      });
      
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
          this.uploadFile(file);
        }
      });
      
      // File input change
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.uploadFile(file);
        }
      });
      
      // Remove image
      removeBtn.addEventListener('click', () => {
        this.removeImage();
      });
    }
    
    async uploadFile(file) {
      // Validate file size
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 5MB');
        return;
      }
      
      // Show progress
      this.showProgress();
      
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const response = await fetch(this.uploadEndpoint, {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          this.showPreview(data.url);
          document.getElementById(this.inputName).value = data.url;
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
          this.hideProgress();
        }
      } catch (error) {
        alert('Upload failed: ' + error.message);
        this.hideProgress();
      }
    }
    
    showPreview(url) {
      const uploadArea = document.getElementById('upload-area');
      const previewArea = document.getElementById('preview-area');
      const previewImage = document.getElementById('preview-image');
      
      uploadArea.classList.add('hidden');
      previewArea.classList.remove('hidden');
      previewImage.src = url;
      
      this.hideProgress();
    }
    
    removeImage() {
      const uploadArea = document.getElementById('upload-area');
      const previewArea = document.getElementById('preview-area');
      
      uploadArea.classList.remove('hidden');
      previewArea.classList.add('hidden');
      
      document.getElementById(this.inputName).value = '';
    }
    
    showProgress() {
      document.getElementById('upload-area').classList.add('hidden');
      document.getElementById('upload-progress').classList.remove('hidden');
      
      // Simulate progress (since we can't track actual progress easily)
      let progress = 0;
      const progressBar = document.getElementById('progress-bar');
      const interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + '%';
        if (progress >= 90) {
          clearInterval(interval);
        }
      }, 100);
    }
    
    hideProgress() {
      document.getElementById('upload-progress').classList.add('hidden');
    }
  }
  
  // Initialize on page load if container exists
  document.addEventListener('DOMContentLoaded', function() {
    const uploaderContainer = document.getElementById('image-uploader-container');
    if (uploaderContainer) {
      const currentImage = uploaderContainer.dataset.currentImage || '';
      new ImageUploader({
        containerId: 'image-uploader-container',
        currentImage: currentImage
      });
    }
  });