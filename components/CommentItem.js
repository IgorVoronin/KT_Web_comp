class CommentItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._commentData = null;
        this._currentUser = null;
        this._isLiked = false;
        this._repliesCollapsed = false;

    }

    set commentData(data) {
        this._commentData = data;

        if (this.isConnected) {
            this.render();
        }
    }

    get commentData() {
        return this._commentData;
    }

    set currentUser(user) {
        this._currentUser = user;

        if (this.isConnected && this._commentData) {
            this.render();
        }
    }

    get currentUser() {
        return this._currentUser;
    }

    // Сеттер для isLiked
    set isLiked(value) {
        const changed = this._isLiked !== !!value;
        this._isLiked = !!value;
        if (changed && this.isConnected) {
            this.render();
        }
    }

    get isLiked() {
        return this._isLiked;
    }

    connectedCallback() {

        this.render();
        this.addEventListeners();
    }

    formatDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);

        const options = {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        };
        return date.toLocaleString('ru-RU', options);
    }

    addEventListeners() {
        this.shadowRoot.addEventListener('click', (event) => {
            const target = event.target;
            const commentId = this._commentData?.id;
            if (!commentId) return;

            // Проверяем, активна ли одна из форм
            const isReplyFormOpen = !!this.shadowRoot.querySelector('.reply-form-inner');
            const isEditFormOpen = !!this.shadowRoot.querySelector('.edit-form-inner');
            const isActionFormOpen = isReplyFormOpen || isEditFormOpen;

            // --- Обработка основных кнопок --- 
            if (target.classList.contains('reply-btn')) {
                if (isActionFormOpen) return; // Игнорируем, если форма уже открыта
                this.dispatchEvent(new CustomEvent('reply-comment', { bubbles: true, composed: true, detail: { commentId: commentId, commentElement: this } }));
            }
            else if (target.classList.contains('edit-btn')) {
                if (isActionFormOpen) return; // Игнорируем, если форма уже открыта
                this.dispatchEvent(new CustomEvent('edit-comment', { bubbles: true, composed: true, detail: { commentId: commentId, commentElement: this } }));
            }
            else if (target.classList.contains('like-btn')) {
                if (isActionFormOpen) return; // Игнорируем лайк, если форма открыта
                this.dispatchEvent(new CustomEvent('like-comment', { bubbles: true, composed: true, detail: { commentId: commentId } }));
            }
            else if (target.classList.contains('toggle-replies-btn')) {
                if (isActionFormOpen) return; // Игнорируем сворачивание, если форма открыта
                this._repliesCollapsed = !this._repliesCollapsed;
                this.render();
            }


        });
    }

    // Метод для создания DOM-элементов формы ответа
    _createReplyForm() {
        const formContainer = document.createElement('div');
        formContainer.classList.add('reply-form-inner');

        const textarea = document.createElement('textarea');
        textarea.placeholder = `Ответить ${this._commentData?.author || ''}...`;
        textarea.value = `@${this._commentData?.author || ''}, `;

        // Создаем блок предпросмотра вложения
        const previewBlock = document.createElement('div');
        previewBlock.style.cssText = `
            margin-top: 10px; 
            max-width: 100px; 
            display: none; 
            position: relative;
        `;

        const previewImage = document.createElement('img');
        previewImage.style.cssText = `
            max-width: 100%; 
            max-height: 80px; 
            border-radius: 4px; 
            border: 1px solid var(--comment-form-border-color, #ccc);
            cursor: pointer;
        `;

        const removeButton = document.createElement('div');
        removeButton.innerHTML = '✕';
        removeButton.title = 'Удалить вложение';
        removeButton.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            background-color: rgba(255, 255, 255, 0.8);
            color: #dc3545;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-weight: bold;
            border: 1px solid #dc3545;
            font-size: 14px;
        `;

        previewBlock.appendChild(previewImage);
        previewBlock.appendChild(removeButton);

        // Создаем группу кнопок действий
        const actionsGroup = document.createElement('div');
        actionsGroup.style.cssText = `
            display: flex;
            align-items: center;
            margin-top: 10px;
        `;

        // Создаем группу кнопок формы
        const buttonGroup = document.createElement('div');
        buttonGroup.classList.add('reply-form-actions');

        const submitButton = document.createElement('button');
        submitButton.textContent = 'Отправить ответ';
        submitButton.classList.add('submit-reply-btn');
        submitButton.style.cssText = `
            padding: 6px 12px;
            font-size: 0.9em;
            border-radius: var(--comment-form-border-radius, 4px);
            cursor: pointer;
            border: none;
            margin-right: 10px;
            background-color: var(--comment-form-submit-button-bg, #007bff);
            color: var(--comment-form-submit-button-color, white);
        `;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Отмена';
        cancelButton.classList.add('cancel-reply-btn');
        cancelButton.style.cssText = `
            padding: 6px 12px;
            font-size: 0.9em;
            border-radius: var(--comment-form-border-radius, 4px);
            cursor: pointer;
            border: none;
            margin-right: 10px;
            background-color: var(--comment-form-cancel-button-bg, #f8f9fa);
            color: var(--comment-form-cancel-button-color, #333);
            border: 1px solid var(--comment-form-cancel-button-border, #ccc);
        `;

        // Создаем ссылку для прикрепления файла
        const attachmentLink = document.createElement('div');
        attachmentLink.style.cssText = `
            color: var(--comment-action-button-color, #007bff);
            cursor: pointer;
            margin-left: 10px;
            font-size: 0.9em;
            position: relative;
            display: flex;
            align-items: center;
        `;
        attachmentLink.innerHTML = '<span>📎 Прикрепить файл</span>';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.gif';
        fileInput.title = 'Выберите изображение или GIF';
        fileInput.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
        `;
        attachmentLink.appendChild(fileInput);

        buttonGroup.appendChild(submitButton);
        buttonGroup.appendChild(cancelButton);

        // Добавляем кнопки и ссылку загрузки
        actionsGroup.appendChild(buttonGroup);
        actionsGroup.appendChild(attachmentLink);

        // Собираем всю форму
        formContainer.appendChild(textarea);
        formContainer.appendChild(previewBlock);
        formContainer.appendChild(actionsGroup);

        // Переменная для хранения вложения
        let currentAttachment = null;

        // Добавляем обработчик выбора файла
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            try {
                // Проверяем размер файла (ограничим до 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    alert('Размер файла не должен превышать 5MB');
                    fileInput.value = '';
                    return;
                }

                // Конвертируем файл в Base64
                const base64String = await this._fileToBase64(file);

                // Отображаем превью
                previewImage.src = base64String;
                previewBlock.style.display = 'block';

                // Сохраняем вложение
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

        // Добавляем слушатель для кнопок отправки/отмены
        formContainer.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('submit-reply-btn')) {
                const text = textarea.value.trim();
                if (text && this._commentData) {
                    this.dispatchEvent(new CustomEvent('add-reply', {
                        bubbles: true,
                        composed: true,
                        detail: {
                            parentId: this._commentData.id,
                            text: text,
                            attachment: currentAttachment
                        }
                    }));
                    this._hideReplyForm();
                }
            } else if (target.classList.contains('cancel-reply-btn')) {
                this._hideReplyForm(); // Скрываем форму при отмене
            }
        });

        // Фокусируемся на поле ввода
        setTimeout(() => textarea.focus(), 0);

        return formContainer;
    }

    // Вспомогательный метод для конвертации файла в Base64
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Метод для показа формы ответа
    showReplyForm() {
        // Проверяем, не активен ли режим редактирования
        if (this.shadowRoot.querySelector('.edit-form-inner')) {
            this.disableEditMode();
        }

        const replyFormContainer = this.shadowRoot.querySelector('.reply-form');
        const actionsElement = this.shadowRoot.querySelector('.actions'); // Находим кнопки действий

        if (replyFormContainer && actionsElement) {
            // Скрываем основные кнопки действий
            actionsElement.style.display = 'none';

            // Показываем форму ответа
            replyFormContainer.innerHTML = '';
            const form = this._createReplyForm();
            replyFormContainer.appendChild(form);
            replyFormContainer.style.display = 'block';
        }
    }

    // Метод для скрытия и очистки формы ответа
    _hideReplyForm() {
        const replyFormContainer = this.shadowRoot.querySelector('.reply-form');
        const actionsElement = this.shadowRoot.querySelector('.actions'); // Находим кнопки действий

        if (replyFormContainer) {
            replyFormContainer.style.display = 'none';
            replyFormContainer.innerHTML = '';
        }
        // Показываем основные кнопки действий
        if (actionsElement) {
            actionsElement.style.display = 'flex';
        }
    }

    // --- Методы для редактирования (План с отдельной формой) --- 
    _createEditForm() {
        const formContainer = document.createElement('div');
        formContainer.classList.add('edit-form-inner');
        const textarea = document.createElement('textarea');
        textarea.value = this._commentData?.text || '';
        textarea.placeholder = 'Введите измененный текст...';
        textarea.rows = 3;
        const buttonGroup = document.createElement('div');
        buttonGroup.classList.add('edit-form-actions');

        const saveButton = document.createElement('button');
        saveButton.textContent = 'Сохранить';
        saveButton.classList.add('save-edit-btn');

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Отмена';
        cancelButton.classList.add('cancel-edit-btn');
        cancelButton.style.marginLeft = '10px';

        buttonGroup.appendChild(saveButton);
        buttonGroup.appendChild(cancelButton);

        formContainer.appendChild(textarea);
        formContainer.appendChild(buttonGroup);

        // Обработчик кликов формы редактирования
        formContainer.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('save-edit-btn')) {
                const newText = textarea.value.trim();
                // Отправляем событие с новым текстом
                this.dispatchEvent(new CustomEvent('save-edit', {
                    bubbles: true, composed: true,
                    detail: { commentId: this._commentData.id, newText: newText }
                }));
                this.disableEditMode();
            } else if (target.classList.contains('cancel-edit-btn')) {
                this.disableEditMode();
            }
        });

        setTimeout(() => textarea.focus(), 0);
        return formContainer;
    }

    enableEditMode() {
        // Проверяем, не открыта ли форма ответа
        if (this.shadowRoot.querySelector('.reply-form-inner')) {
            this._hideReplyForm(); // Сначала скрываем форму ответа
        }

        const textElement = this.shadowRoot.querySelector('.text');
        const actionsElement = this.shadowRoot.querySelector('.actions');

        if (!textElement || !actionsElement || !this._commentData) return;
        // Если форма уже создана, ничего не делаем
        if (this.shadowRoot.querySelector('.edit-form-inner')) return;

        textElement.style.display = 'none';
        actionsElement.style.display = 'none';

        const editForm = this._createEditForm();
        textElement.parentNode.insertBefore(editForm, textElement.nextSibling);
    }

    disableEditMode() {
        const textElement = this.shadowRoot.querySelector('.text');
        const actionsElement = this.shadowRoot.querySelector('.actions');
        const editForm = this.shadowRoot.querySelector('.edit-form-inner');

        if (editForm) {
            editForm.remove();
        }
        if (textElement) {
            textElement.style.display = 'block';
        }
        if (actionsElement) {
            actionsElement.style.display = 'flex';
        }
        // Не нужно восстанавливать текст, так как форма удаляется
        // и при следующей перерисовке текст возьмется из commentData
        delete this._originalText; // Убираем ненужное свойство
    }
    // --- Конец методов для редактирования ---

    // --- Новый метод для проверки свежести комментария ---
    isCommentNew(timestamp) {
        if (!timestamp) return false;

        const commentDate = new Date(timestamp);
        const currentDate = new Date();
        // Разница в миллисекундах
        const timeDiff = currentDate - commentDate;
        // 24 часа в миллисекундах
        const oneDayInMs = 24 * 60 * 60 * 1000;

        // Комментарий считается новым, если он был создан менее 24 часов назад
        return timeDiff < oneDayInMs;
    }

    render() {
        if (!this._commentData) {
            this.shadowRoot.innerHTML = `<style>:host{ display: block; padding: 10px; } </style><div>Загрузка комментария...</div>`;
            return;
        }

        const { id, author, text, timestamp, likes, isEdited, editedTimestamp, attachment } = this._commentData;
        const displayTimestamp = isEdited ? editedTimestamp : timestamp;
        const formattedDate = this.formatDate(displayTimestamp);
        const isOwnComment = this.currentUser === author;
        // Проверяем новизну комментария на основе его timestamp
        const isNew = this.isCommentNew(timestamp);

        this.setAttribute('data-comment-id', id);

        // Убедимся, что форма редактирования удалена при перерисовке
        // (на случай если render вызван до disableEditMode)
        this.shadowRoot.querySelector('.edit-form-inner')?.remove();

        // Очищаем текущее содержимое shadow DOM
        this.shadowRoot.innerHTML = '';

        // Получаем шаблон из документа
        const template = document.getElementById('comment-item-template');
        if (!template) {
            console.error('Template not found: comment-item-template');
            return;
        }

        // Клонируем содержимое шаблона
        const instance = template.content.cloneNode(true);

        // Заполняем элементы шаблона данными
        const newBadge = instance.querySelector('#new-badge');
        const authorElement = instance.querySelector('#author');
        const dateElement = instance.querySelector('#date');
        const editedMark = instance.querySelector('#edited-mark');
        const textElement = instance.querySelector('#text');
        const likesElement = instance.querySelector('#likes');
        const editButton = instance.querySelector('.edit-btn');
        const likeButton = instance.querySelector('.like-btn');
        const repliesContainer = instance.querySelector('.replies');

        // Элементы для вложений
        const attachmentContainer = instance.querySelector('#attachment-container');
        const attachmentImg = instance.querySelector('#attachment-img');

        // Новизна комментария
        if (isNew) {
            newBadge.style.display = 'inline-block';
        } else {
            newBadge.style.display = 'none';
        }

        // Автор и дата
        authorElement.textContent = author;
        dateElement.textContent = formattedDate;

        // Отметка о редактировании
        if (isEdited) {
            editedMark.style.display = 'inline';
        } else {
            editedMark.style.display = 'none';
        }

        // Текст и лайки
        textElement.textContent = text;
        likesElement.textContent = likes;

        // Отображение вложения, если оно есть
        if (attachment) {
            attachmentContainer.style.display = 'block';
            attachmentImg.src = attachment;
            // Устанавливаем правильный alt-текст
            attachmentImg.alt = `Вложение от ${author}`;

            // Добавляем обработчик клика по изображению для открытия в родительском модальном окне
            attachmentImg.addEventListener('click', (event) => {
                event.stopPropagation(); // Останавливаем распространение
                this.dispatchEvent(new CustomEvent('open-image', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        imageUrl: attachment,
                        commentId: id
                    }
                }));
            });
        }

        // Кнопка редактирования
        if (!isOwnComment) {
            editButton.hidden = true;
        }

        // Состояние лайка
        if (this._isLiked) {
            likeButton.classList.add('liked');
            likeButton.setAttribute('aria-pressed', 'true');
        } else {
            likeButton.classList.remove('liked');
            likeButton.setAttribute('aria-pressed', 'false');
        }

        // Состояние свернутости replies
        if (this._repliesCollapsed) {
            repliesContainer.classList.add('replies-collapsed');
        } else {
            repliesContainer.classList.remove('replies-collapsed');
        }

        // Добавляем заполненный шаблон в shadow DOM
        this.shadowRoot.appendChild(instance);

        // Проверяем наличие ответов для обновления кнопки переключения
        let replyCount = 0;
        const checkRepliesInterval = setInterval(() => {
            const repliesSlot = this.shadowRoot.querySelector('slot[name="replies"]');
            if (repliesSlot) {
                replyCount = repliesSlot.assignedNodes({ flatten: true }).filter(node => node.nodeName === 'COMMENT-ITEM').length;
                // Обновляем кнопку только если нашли слот и кол-во ответов > 1
                this._updateToggleRepliesButton(replyCount);
                clearInterval(checkRepliesInterval); // Останавливаем проверку
            } else if (this.shadowRoot.isConnected === false) {
                // Если компонент отключен до нахождения слота, останавливаем
                clearInterval(checkRepliesInterval);
            }
        }, 50); // Проверяем с небольшой задержкой

        // Запускаем таймер очистки, если компонент будет быстро удален
        setTimeout(() => clearInterval(checkRepliesInterval), 2000);
    }

    // Новый метод для обновления текста и видимости кнопки сворачивания
    _updateToggleRepliesButton(replyCount) {
        const toggleContainer = this.shadowRoot.querySelector('.toggle-replies');
        const toggleButton = this.shadowRoot.querySelector('.toggle-replies-btn');

        if (!toggleContainer || !toggleButton) return;

        if (replyCount > 1) {
            toggleContainer.style.display = 'block';
            if (this._repliesCollapsed) {
                toggleButton.textContent = `Посмотреть все ответы (${replyCount}) ↓`;
            } else {
                toggleButton.textContent = 'Скрыть ответы ↑';
            }
        } else {
            toggleContainer.style.display = 'none';
        }
    }
}

customElements.define('comment-item', CommentItem); 