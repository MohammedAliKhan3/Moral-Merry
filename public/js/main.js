document.addEventListener('DOMContentLoaded', function() {

    // --- Mobile Menu Logic ---
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('#main-nav');

    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            this.classList.toggle('active');
            mainNav.classList.toggle('active');
            this.setAttribute('aria-expanded', !isExpanded);
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function() {
                if (mainNav.classList.contains('active')) {
                    mobileMenuToggle.classList.remove('active');
                    mainNav.classList.remove('active');
                    mobileMenuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    // --- Animation & Utility Functions ---
    const scrollElements = document.querySelectorAll('[data-scroll]');
    const statCards = document.querySelectorAll('.stat-card');

    const elementInView = (el, offset = 0) => {
        if (!el) return false;
        const elementTop = el.getBoundingClientRect().top;
        return elementTop <= (window.innerHeight || document.documentElement.clientHeight) - offset;
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 100)) {
                el.classList.add('visible');
            }
        });
    };

    const animateCounters = () => {
        statCards.forEach(card => {
            if (elementInView(card) && !card.dataset.animated) {
                const valueElement = card.querySelector('.stat-value');
                if (valueElement) {
                    const target = parseInt(valueElement.dataset.value);
                    const suffix = valueElement.dataset.value.replace(/[0-9]/g, '') || '';
                    let current = 0;
                    const increment = Math.max(1, target / 50);

                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            clearInterval(timer);
                            current = target;
                        }
                        valueElement.textContent = Math.floor(current) + suffix;
                    }, 20);
                    card.dataset.animated = 'true';
                }
            }
        });
    };

    // --- Page-Specific Initializations ---

    if (document.querySelector('.hero-title')) {
        gsap.timeline()
            .from('.hero-title', { y: 50, opacity: 0, duration: 1, ease: "power3.out" })
            .from('.hero-subtitle', { y: 50, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.5")
            .from('.hero-buttons', { y: 50, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.4")
            .from('.hero-image', { x: 50, opacity: 0, duration: 1, ease: "power2.out" }, "-=0.8")
            .from('.scroll-indicator', { opacity: 0, duration: 1, ease: "power2.out" }, "-=0.5");
    }

    if (document.querySelectorAll('.feature-card').length > 0) {
        document.querySelectorAll('.feature-card').forEach(card => {
            gsap.from(card, {
                scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none none" },
                y: 50, opacity: 0, duration: 0.8, delay: parseFloat(card.dataset.delay || 0), ease: "power2.out"
            });
        });
    }

    const gradientBg = document.querySelector('.color-gradient-bg');
    if (gradientBg) {
        const colors = ['#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0', '#4895ef', '#560bad', '#b5179e'];
        let currentIndex = 0;
        const shiftGradient = () => {
            gradientBg.style.setProperty('--gradient-1', colors[currentIndex % colors.length]);
            gradientBg.style.setProperty('--gradient-2', colors[(currentIndex + 1) % colors.length]);
            gradientBg.style.setProperty('--gradient-3', colors[(currentIndex + 2) % colors.length]);
            gradientBg.style.setProperty('--gradient-4', colors[(currentIndex + 3) % colors.length]);
            currentIndex++;
        };
        setInterval(shiftGradient, 10000);
    }

    const feeForm = document.getElementById('fee-lookup-form');
    if (feeForm) {
        const loadingIndicator = document.getElementById('loading-indicator');
        const errorMessage = document.getElementById('error-message');
        const receiptContainer = document.getElementById('fee-details-receipt');

        feeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorMessage.style.display = 'none';
            receiptContainer.style.display = 'none';
            loadingIndicator.style.display = 'block';
            const formData = new FormData(feeForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/fees/details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                const result = await response.json();
                if (response.ok) {
                    document.getElementById('receipt-studentName').textContent = result.student.name;
                    document.getElementById('receipt-studentClass').textContent = result.student.class;
                    document.getElementById('receipt-rollNumber').textContent = result.student.rollNo;
                    document.getElementById('receipt-feeStatus').textContent = result.student.feeStatus;
                    document.getElementById('receipt-amountDue').textContent = `₹${result.student.amountDue}`;
                    document.getElementById('receipt-date').textContent = result.student.date;
                    document.getElementById('receipt-qrCode').src = result.student.qrCodeUrl;
                    receiptContainer.style.display = 'block';
                } else {
                    errorMessage.textContent = result.message || 'An unknown error occurred.';
                    errorMessage.style.display = 'block';
                }
            } catch (error) {
                errorMessage.textContent = 'Failed to connect to the server. Please try again later.';
                errorMessage.style.display = 'block';
            } finally {
                loadingIndicator.style.display = 'none';
            }
        });
    }

    // --- Global Event Listeners & Initial Calls ---
    handleScrollAnimation();
    animateCounters();

    window.addEventListener('scroll', () => {
        handleScrollAnimation();
        animateCounters();
    });
});
