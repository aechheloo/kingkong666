document.querySelectorAll('.alert').forEach((element) => {
  setTimeout(() => {
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease';
  }, 3500);
});
