class CommentSection extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._comments = []; // Приватное свойство для хранения комментариев
        this._currentUser = null;
        this._likedComments = new Set(); // Инициализируем пустое множество лайков
        this.render(); // Рендерим начальную структуру
    }

    // Определяем сеттеры для свойств, чтобы реагировать на их изменение
    set comments(value) {
        this._comments = value;
        this.renderComments(); // Перерисовываем только список комментариев
        this.updateCommentCount(); // Обновляем счетчик
    }

    get comments() {
        return this._comments;
    }

    set currentUser(value) {
        this._currentUser = value;
        // Можно добавить логику, если имя пользователя влияет на отображение секции
    }

    get currentUser() {
        return this._currentUser;
    }

    // Сеттер для лайков
    set likedComments(value) {
        if (value instanceof Set) {
            this._likedComments = value;
            // Перерисовываем комментарии, чтобы обновить состояние isLiked у comment-item
            // Это не оптимально, но проще для начала
            this.renderComments();
        } else {
            console.error('likedComments must be a Set');
        }
    }
    get likedComments() { return this._likedComments; }

    connectedCallback() {
        // Слушатели событий добавляем один раз при подключении компонента
        this.addEventListeners();
        // Начальное отображение комментариев произойдет через сеттер `comments`
    }

    // Метод для генерации уникальных ID (простой вариант)
    generateId() {
        return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Метод для отправки события об обновлении
    dispatchUpdate() {
        this.dispatchEvent(new CustomEvent('commentsUpdated', {
            detail: { comments: this._comments },
            bubbles: true, // Позволяет событию всплывать по DOM
            composed: true // Позволяет событию пересекать границы Shadow DOM
        }));
    }

    // Метод для отправки события об обновлении лайков
    dispatchLikesUpdate() {
        this.dispatchEvent(new CustomEvent('likesUpdated', {
            detail: { likedComments: this._likedComments },
            bubbles: true,
            composed: true
        }));
    }

    // Добавляем метод для конвертации файла в Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    addEventListeners() {
        const form = this.shadowRoot.querySelector('.comment-form');
        const textarea = form.querySelector('textarea');
        const submitButton = form.querySelector('button');
        const listContainer = this.shadowRoot.querySelector('.comments-list'); // Получаем контейнер списка

        // Элементы для работы с вложениями
        const fileInput = form.querySelector('input[type="file"]');
        const previewBlock = form.querySelector('.attachment-preview');
        const previewImage = previewBlock.querySelector('#preview-image');
        const removeButton = previewBlock.querySelector('.remove-attachment');

        // Переменная для хранения текущего вложения
        let currentAttachment = null;

        // Обработчик выбора файла
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                // Проверяем размер файла (ограничим до 2MB для localStorage)
                if (file.size > 2 * 1024 * 1024) {
                    alert('Размер файла не должен превышать 2MB');
                    fileInput.value = '';
                    return;
                }

                // Конвертируем файл в Base64
                const base64String = await this.fileToBase64(file);

                // Отображаем превью
                previewImage.src = base64String;
                previewBlock.style.display = 'block';

                // Сохраняем вложение для дальнейшего использования
                currentAttachment = base64String;
            } catch (error) {
                console.error('Ошибка при загрузке файла:', error);
                alert('Не удалось загрузить файл. Пожалуйста, попробуйте другой файл.');
            }
        });

        // Обработчик удаления вложения
        removeButton.addEventListener('click', () => {
            previewBlock.style.display = 'none';
            previewImage.src = '';
            fileInput.value = '';
            currentAttachment = null;
        });

        // Обработчик отправки нового комментария
        submitButton.addEventListener('click', () => {
            const text = textarea.value.trim();
            if (text && this._currentUser) {
                const newComment = {
                    id: this.generateId(),
                    author: this._currentUser,
                    text: text,
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    isEdited: false,
                    parentId: null,
                    replies: [],
                    attachment: currentAttachment // Добавляем вложение, если оно есть
                };
                this._comments.unshift(newComment);
                this.renderComments();
                this.updateCommentCount();
                this.dispatchUpdate();

                // Очищаем форму
                textarea.value = '';
                previewBlock.style.display = 'none';
                previewImage.src = '';
                fileInput.value = '';
                currentAttachment = null;
            } else if (!this._currentUser) {
                console.warn('Current user is not set. Cannot post comment.');
            }
        });

        // Обработчик фильтра
        const filterSelect = this.shadowRoot.querySelector('.comments-filter select');
        filterSelect.addEventListener('change', (event) => {
            this.renderComments();
            this.updateCommentCount();
        });

        // Добавляем слушатели для кастомных событий от comment-item
        if (listContainer) {
            listContainer.addEventListener('like-comment', (event) => {
                this.handleLike(event.detail.commentId);
            });

            listContainer.addEventListener('reply-comment', (event) => {
                this.handleReply(event.detail.commentElement);
            });

            // ВОЗВРАЩАЕМ слушатель edit-comment
            listContainer.addEventListener('edit-comment', (event) => {
                this.handleEdit(event.detail.commentElement);
            });

            // Слушатель для нового ответа
            listContainer.addEventListener('add-reply', (event) => {
                this.handleAddReply(event.detail);
            });

            // Слушатель для сохранения редактирования
            listContainer.addEventListener('save-edit', (event) => {
                this.handleSaveEdit(event.detail);
            });

            // Слушатель для открытия изображения
            listContainer.addEventListener('open-image', (event) => {
                this._openImageModal(event.detail.imageUrl);
            });
        } else {
            console.error("Comments list container not found during addEventListeners");
        }

        // Обработчик клика на превью в форме добавления комментария
        previewImage.addEventListener('click', (event) => {
            if (previewImage.src) {
                event.stopPropagation(); // Останавливаем распространение события
                this._openImageModal(previewImage.src);
            }
        });
    }

    render() {
        // Очищаем текущее содержимое shadow DOM
        this.shadowRoot.innerHTML = '';

        // Получаем шаблон из документа
        const template = document.getElementById('comment-section-template');
        if (!template) {
            console.error('Template not found: comment-section-template');
            this.shadowRoot.innerHTML = '<div>Ошибка загрузки шаблона секции комментариев</div>';
            return;
        }

        // Клонируем содержимое шаблона
        const instance = template.content.cloneNode(true);

        // Добавляем заполненный шаблон в shadow DOM
        this.shadowRoot.appendChild(instance);

        // Инициализируем модальное окно
        this._initImageModal();
    }

    updateCommentCount() {
        const countElement = this.shadowRoot.querySelector('.comments-count');
        // Считаем все комментарии во всей структуре
        const totalCount = this._comments.length;
        countElement.textContent = `Комментарии (${totalCount})`;
    }

    renderComments() {
        const listContainer = this.shadowRoot.querySelector('.comments-list');
        if (!listContainer) return;

        // Сохраняем прокрутку перед перерисовкой
        const scrollPosition = listContainer.scrollTop;

        listContainer.innerHTML = '';

        if (!this._comments || this._comments.length === 0) {
            listContainer.innerHTML = '<p>Пока нет комментариев.</p>';
            return;
        }

        const sortedComments = this._applySorting(this._comments);
        // const commentsMap = new Map(this._comments.map(c => [c.id, c])); // Карта пока не используется активно

        const createCommentElement = (commentData) => {
            const commentElement = document.createElement('comment-item');
            commentElement.commentData = commentData;
            commentElement.currentUser = this._currentUser;
            // Передаем информацию о лайке
            commentElement.isLiked = this._likedComments.has(commentData.id);

            const repliesData = sortedComments.filter(reply => reply.parentId === commentData.id);
            if (repliesData.length > 0) {
                repliesData.forEach(replyData => {
                    const replyElement = createCommentElement(replyData);
                    replyElement.setAttribute('slot', 'replies');
                    commentElement.appendChild(replyElement);
                });
            }
            return commentElement;
        };

        const topLevelComments = sortedComments.filter(comment => !comment.parentId);

        topLevelComments.forEach(commentData => {
            const commentElement = createCommentElement(commentData);
            listContainer.appendChild(commentElement);
        });

        // Восстанавливаем прокрутку
        listContainer.scrollTop = scrollPosition;
    }

    _applySorting(comments) {
        const filterValue = this.shadowRoot.querySelector('.comments-filter select')?.value || 'newest';
        let sorted = [...comments]; // Клонируем массив для сортировки

        switch (filterValue) {
            case 'oldest':
                sorted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                break;
            case 'popular':
                sorted.sort((a, b) => b.likes - a.likes);
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
        }
        return sorted;
    }

    handleReply(commentElement) {
        commentElement.showReplyForm();
    }

    // ВОЗВРАЩАЕМ метод handleEdit
    handleEdit(commentElement) {
        commentElement.enableEditMode();
    }

    handleLike(commentId) {
        const commentIndex = this._comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) {
            return;
        }

        const commentData = { ...this._comments[commentIndex] };
        let isNowLiked;
        let likesUpdated = false;

        if (this._likedComments.has(commentId)) {
            // --- Логика АНЛАЙКА ---
            commentData.likes = Math.max(0, commentData.likes - 1);
            this._likedComments.delete(commentId);
            isNowLiked = false;
            likesUpdated = true;
        } else {
            // --- Логика ЛАЙКА ---
            commentData.likes += 1;
            this._likedComments.add(commentId);
            isNowLiked = true;
            likesUpdated = true;
        }

        this._comments[commentIndex] = commentData;

        const commentElement = this.shadowRoot.querySelector(`comment-item[data-comment-id="${commentId}"]`);
        if (commentElement) {
            commentElement.isLiked = isNowLiked;
            commentElement.commentData = commentData;
        } else {
            this.renderComments();
        }

        if (likesUpdated) {
            this.dispatchUpdate();
            this.dispatchLikesUpdate();
        }
    }

    // Обработчик добавления ответа
    handleAddReply(detail) {
        const { parentId, text, attachment } = detail;
        if (!this._currentUser) {
            console.warn('Current user is not set. Cannot add reply.');
            return;
        }
        if (!text) {
            console.warn('Reply text is empty.');
            return;
        }

        const newReply = {
            id: this.generateId(),
            author: this._currentUser,
            text: text,
            timestamp: new Date().toISOString(),
            likes: 0,
            isEdited: false,
            parentId: parentId, // Указываем родителя
            replies: [], // Ответы пока не могут иметь свои ответы (по ТЗ)
            attachment: attachment // Добавляем вложение, если оно есть
        };

        // Добавляем ответ в основной массив комментариев
        // Важно добавлять именно в основной массив, так как renderComments его использует
        this._comments.push(newReply);

        // Перерисовываем весь список, чтобы ответ появился в нужном месте
        this.renderComments();
        // Обновляем счетчик комментариев
        this.updateCommentCount();
        // Сохраняем обновленный список в localStorage
        this.dispatchUpdate();
    }

    // Обработчик сохранения редактирования
    handleSaveEdit(detail) {
        const { commentId, newText } = detail;
        const commentIndex = this._comments.findIndex(c => c.id === commentId);

        if (commentIndex === -1) {
            console.error(`Comment with ID ${commentId} not found for editing.`);
            return;
        }

        // Обновляем данные комментария
        const updatedComment = {
            ...this._comments[commentIndex],
            text: newText,
            isEdited: true,
            editedTimestamp: new Date().toISOString()
        };
        this._comments[commentIndex] = updatedComment;

        // Обновляем соответствующий элемент на странице
        const commentElement = this.shadowRoot.querySelector(`comment-item[data-comment-id="${commentId}"]`);
        if (commentElement) {
            // Передаем обновленные данные
            commentElement.commentData = updatedComment;
            // Убеждаемся, что форма редактирования скрыта (хотя она должна скрываться сама)
            // commentElement.disableEditMode();
        } else {
            // Если элемент не найден, перерисовываем все
            this.renderComments();
        }

        // Сохраняем изменения в localStorage
        this.dispatchUpdate();
    }

    // Методы для удаления, фильтрации будут здесь

    // Метод для инициализации модального окна
    _initImageModal() {
        const modal = this.shadowRoot.getElementById('image-modal');
        const closeBtn = this.shadowRoot.getElementById('close-modal');

        if (!modal || !closeBtn) return;

        // Закрытие модального окна при клике на кнопку закрытия
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Предотвращаем стандартное поведение
            e.stopPropagation(); // Останавливаем распространение события
            this._closeModal();
        });

        // Закрытие модального окна при клике на фон
        modal.addEventListener('click', (e) => {
            // Проверяем, что клик был именно на фоне, а не на содержимом
            if (e.target === modal) {
                e.stopPropagation(); // Останавливаем распространение
                this._closeModal();
            }
        });

        // Закрытие по Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this._closeModal();
            }
        };

        document.addEventListener('keydown', handleEscape);
    }

    // Метод для закрытия модального окна
    _closeModal() {
        const modal = this.shadowRoot.getElementById('image-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Восстанавливаем прокрутку
        }
    }

    // Метод для открытия модального окна с заданным изображением
    _openImageModal(imageUrl) {
        if (!imageUrl) return;

        const modal = this.shadowRoot.getElementById('image-modal');
        const modalImg = this.shadowRoot.getElementById('modal-image');

        if (modal && modalImg) {
            // Устанавливаем источник изображения
            modalImg.src = imageUrl;

            // Показываем модальное окно
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Запрещаем прокрутку страницы
        }
    }
}

customElements.define('comment-section', CommentSection); 