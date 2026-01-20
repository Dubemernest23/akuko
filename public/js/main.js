// Main JavaScript for Akuko Blog

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
  
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
      });
    }
    
    // Auto-hide flash messages
    const flashMessages = document.querySelectorAll('.bg-green-100, .bg-red-100, .bg-yellow-100');
    flashMessages.forEach(function(message) {
      setTimeout(function() {
        message.style.transition = 'opacity 0.5s ease-out';
        message.style.opacity = '0';
        setTimeout(function() {
          message.remove();
        }, 500);
      }, 5000);
    });
    
    // Confirm delete actions
    const deleteForms = document.querySelectorAll('form[action*="DELETE"]');
    deleteForms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        if (!confirm('Are you sure you want to delete this?')) {
          e.preventDefault();
        }
      });
    });
    
    // Image lazy loading
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      });
    });
    
    images.forEach(function(img) {
      imageObserver.observe(img);
    });
    
    // Reading time calculator
    const postContent = document.querySelector('.prose');
    if (postContent) {
      const text = postContent.textContent;
      const wordsPerMinute = 200;
      const words = text.trim().split(/\s+/).length;
      const readingTime = Math.ceil(words / wordsPerMinute);
      
      const readingTimeEl = document.querySelector('.reading-time');
      if (readingTimeEl) {
        readingTimeEl.textContent = `${readingTime} min read`;
      }
    }
    
    // Smooth scroll to anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
    
    // Search autocomplete (basic version)
    const searchInput = document.querySelector('input[name="q"]');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
          // Could implement autocomplete here
          console.log('Search:', searchInput.value);
        }, 300);
      });
    }
    
    // Form validation enhancement
    const forms = document.querySelectorAll('form');
    forms.forEach(function(form) {
      form.addEventListener('submit', function(e) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(function(field) {
          if (!field.value.trim()) {
            isValid = false;
            field.classList.add('border-red-500');
          } else {
            field.classList.remove('border-red-500');
          }
        });
        
        if (!isValid) {
          e.preventDefault();
          alert('Please fill in all required fields');
        }
      });
    });
    
    // Copy code blocks
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach(function(block) {
      const button = document.createElement('button');
      button.textContent = 'Copy';
      button.className = 'absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600';
      
      const pre = block.parentElement;
      pre.style.position = 'relative';
      pre.appendChild(button);
      
      button.addEventListener('click', function() {
        const text = block.textContent;
        navigator.clipboard.writeText(text).then(function() {
          button.textContent = 'Copied!';
          setTimeout(function() {
            button.textContent = 'Copy';
          }, 2000);
        });
      });
    });
    
    // Back to top button
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '↑';
    backToTop.className = 'fixed bottom-8 right-8 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all opacity-0 pointer-events-none';
    backToTop.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTop);
    
    window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
        backToTop.style.opacity = '1';
        backToTop.style.pointerEvents = 'auto';
      } else {
        backToTop.style.opacity = '0';
        backToTop.style.pointerEvents = 'none';
      }
    });
    
    backToTop.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Table of contents generator for long posts
    const headings = document.querySelectorAll('.prose h2, .prose h3');
    if (headings.length > 3) {
      const toc = document.createElement('div');
      toc.className = 'bg-gray-50 rounded-lg p-6 mb-8';
      toc.innerHTML = '<h3 class="font-bold mb-4">Table of Contents</h3><ul class="space-y-2"></ul>';
      
      const tocList = toc.querySelector('ul');
      headings.forEach(function(heading, index) {
        const id = 'heading-' + index;
        heading.id = id;
        
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = heading.textContent;
        a.className = 'text-blue-600 hover:underline';
        
        if (heading.tagName === 'H3') {
          li.className = 'ml-4';
        }
        
        li.appendChild(a);
        tocList.appendChild(li);
      });
      
      const content = document.querySelector('.prose');
      if (content) {
        content.insertBefore(toc, content.firstChild);
      }
    }
    
    // Share buttons functionality
    const shareButtons = document.querySelectorAll('.share-button');
    shareButtons.forEach(function(button) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const url = this.href;
        window.open(url, '_blank', 'width=600,height=400');
      });
    });
    
    // Image zoom on click
    const postImages = document.querySelectorAll('.prose img');
    postImages.forEach(function(img) {
      img.style.cursor = 'pointer';
      img.addEventListener('click', function() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
          <div class="relative max-w-5xl max-h-full">
            <img src="${img.src}" alt="${img.alt}" class="max-w-full max-h-screen object-contain">
            <button class="absolute top-4 right-4 text-white text-4xl font-bold hover:text-gray-300">&times;</button>
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        modal.addEventListener('click', function(e) {
          if (e.target === modal || e.target.tagName === 'BUTTON') {
            document.body.removeChild(modal);
            document.body.style.overflow = 'auto';
          }
        });
      });
    });
    
    // Character counter for textareas
    const textareas = document.querySelectorAll('textarea[maxlength]');
    textareas.forEach(function(textarea) {
      const maxLength = textarea.getAttribute('maxlength');
      const counter = document.createElement('div');
      counter.className = 'text-sm text-gray-500 mt-1 text-right';
      counter.textContent = `0 / ${maxLength}`;
      textarea.parentElement.appendChild(counter);
      
      textarea.addEventListener('input', function() {
        const length = textarea.value.length;
        counter.textContent = `${length} / ${maxLength}`;
        
        if (length > maxLength * 0.9) {
          counter.classList.add('text-orange-600');
        } else {
          counter.classList.remove('text-orange-600');
        }
      });
    });
    
    // Auto-grow textareas
    const autoGrowTextareas = document.querySelectorAll('textarea.auto-grow');
    autoGrowTextareas.forEach(function(textarea) {
      textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
      });
    });
    
    // Loading indicator for forms
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(function(button) {
      const form = button.closest('form');
      if (form) {
        form.addEventListener('submit', function() {
          button.disabled = true;
          button.innerHTML = '<span class="spinner inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>Processing...';
        });
      }
    });
  });
  
  // Utility functions
  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  
  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  }
  
  // Export for use in other scripts
  window.blogUtils = {
    formatDate,
    timeAgo
  };