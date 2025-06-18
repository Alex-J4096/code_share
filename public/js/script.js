// 通用页面加载完成后的初始化
 document.addEventListener('DOMContentLoaded', function() {
    // 为所有代码块添加语法高亮
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }

    // 处理表单提交确认
    const deleteLinks = document.querySelectorAll('.delete-btn');
    deleteLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (!confirm('确定要删除吗？此操作不可恢复。')) {
                e.preventDefault();
            }
        });
    });

    // 为文本区域添加自动调整高度功能
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        // 初始化高度
        textarea.style.height = textarea.scrollHeight + 'px';
        // 输入时调整高度
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // 简单的表单验证
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredInputs = this.querySelectorAll('[required]');
            let isValid = true;

            requiredInputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.classList.add('error');
                    setTimeout(() => input.classList.remove('error'), 3000);
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('请填写所有必填字段');
            }
        });
    });
});