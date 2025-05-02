/**
 * AirGuide Technologies - Main JavaScript
 * Provides interactive functionality for the website
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavbarScrollEffect();
    initAnimations();
    initCarousels();
    initSmoothScrolling();
    initFormValidation();
    initNewsletterForm();
});

/**
 * Changes navbar appearance on scroll
 */
function initNavbarScrollEffect() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

/**
 * Initialize animations for elements when they enter viewport
 */
function initAnimations() {
    // Add animation classes to various elements when they come into view
    const animatedElements = document.querySelectorAll(
        '.feature-card, .stat-card, .variant-card, .value-card, ' +
        '.team-card, .partner-card, .timeline-item, .award-card, ' +
        '.contact-card, .office-card, .safety-benefit-card, .certification-card'
    );
    
    if (animatedElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1
        });
        
        animatedElements.forEach(element => {
            element.style.opacity = '0';
            observer.observe(element);
        });
    }
}

/**
 * Initialize bootstrap carousels with custom settings
 */
function initCarousels() {
    // Set interval for testimonial carousel
    const testimonialCarousel = document.getElementById('testimonialCarousel');
    if (testimonialCarousel) {
        new bootstrap.Carousel(testimonialCarousel, {
            interval: 6000,
            pause: 'hover'
        });
    }
}

/**
 * Enable smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    // Get all links that have hash
    const anchorLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Account for fixed navbar
                    behavior: 'smooth'
                });
                
                // Update URL hash without jumping
                history.pushState(null, null, targetId);
            }
        });
    });
}

/**
 * Initialize form validation for contact forms
 */
function initFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            form.classList.add('was-validated');
        }, false);
    });
    
    // Add custom validation for phone numbers
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Simple phone validation for international format
            const phonePattern = /^[+]?[0-9\s\-()]{7,20}$/;
            const isValid = phonePattern.test(this.value) || this.value === '';
            
            if (isValid) {
                this.setCustomValidity('');
            } else {
                this.setCustomValidity('Please enter a valid phone number');
            }
        });
    });
}

/**
 * Show technical specifications in a responsive way
 * (Used on product page)
 */
function toggleSpecifications(specId) {
    const specElement = document.getElementById(specId);
    if (specElement) {
        specElement.classList.toggle('spec-expanded');
    }
}

/**
 * Handle contact form submission
 * @param {Event} event - Form submit event
 */
function handleContactSubmit(event) {
    const form = event.target;
    event.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Disable button and show loading state
    if (submitButton) {
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
        
        // Simulate form submission (in a real app, this would be an AJAX call to the server)
        setTimeout(() => {
            // Create success message
            const successMessage = document.createElement('div');
            successMessage.className = 'alert alert-success mt-3';
            successMessage.innerHTML = '<i class="fas fa-check-circle me-2"></i> Thank you for your message! We will get back to you shortly.';
            
            // Show success message and reset form
            form.insertAdjacentElement('beforebegin', successMessage);
            form.reset();
            form.classList.remove('was-validated');
            
            // Restore button state
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth' });
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
        }, 1500);
    }
}

/**
 * Initialize the newsletter subscription form
 */
function initNewsletterForm() {
    const newsletterForm = document.getElementById('newsletter-form');
    const newsletterMessage = document.getElementById('newsletter-message');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const emailInput = document.getElementById('newsletter-email');
            const email = emailInput.value.trim();
            
            if (!email) {
                showNewsletterMessage('Please enter a valid email address.', 'danger');
                return;
            }
            
            // Show loading state
            const submitButton = newsletterForm.querySelector('button[type="submit"]');
            const originalButtonHtml = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            // Send subscription request to the server
            fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNewsletterMessage(data.message, 'success');
                    newsletterForm.reset();
                } else {
                    showNewsletterMessage(data.message, 'warning');
                }
            })
            .catch(error => {
                showNewsletterMessage('An error occurred. Please try again later.', 'danger');
                console.error('Error:', error);
            })
            .finally(() => {
                // Restore button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHtml;
            });
        });
    }
    
    function showNewsletterMessage(message, type) {
        if (newsletterMessage) {
            newsletterMessage.textContent = message;
            newsletterMessage.className = `mt-2 text-${type} small`;
            newsletterMessage.style.display = 'block';
            
            // Hide message after 5 seconds
            setTimeout(() => {
                newsletterMessage.style.display = 'none';
            }, 5000);
        }
    }
}

/**
 * Drone animation for hero section (visual enhancement)
 */
function animateDrone() {
    const droneElement = document.querySelector('.animated-drone');
    if (droneElement) {
        // Create drone animation path
        const path = [
            { x: 0, y: 0 },
            { x: 50, y: -20 },
            { x: 100, y: 0 },
            { x: 150, y: -10 },
            { x: 200, y: 0 },
            { x: 150, y: 10 },
            { x: 100, y: 0 },
            { x: 50, y: 20 },
            { x: 0, y: 0 }
        ];
        
        let currentIndex = 0;
        
        setInterval(() => {
            const position = path[currentIndex];
            droneElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
            currentIndex = (currentIndex + 1) % path.length;
        }, 500);
    }
}
