// Counter functionality
let count = 0;
const countBtn = document.getElementById('countBtn');
const countSpan = document.getElementById('count');

countBtn.addEventListener('click', () => {
    count++;
    countSpan.textContent = count;

    // Add a little animation
    countBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        countBtn.style.transform = 'scale(1)';
    }, 100);
});

// Log welcome message
console.log('Welcome to {{PROJECT_NAME}}!');
console.log('Edit script.js to add your JavaScript code.');

// Example: Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
