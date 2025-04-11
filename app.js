// Импортируем главный компонент секции комментариев
import './components/CommentSection.js';
import './components/CommentItem.js'; // Добавим импорт CommentItem

const CURRENT_USER = 'Вы'; // Имя текущего пользователя
const COMMENTS_STORAGE_KEY = 'webcomp_comments';
const LIKED_COMMENTS_KEY = 'webcomp_liked_comments'; // Новый ключ
const THEME_STORAGE_KEY = 'webcomp_theme';

async function loadInitialData() {
    try {
        const response = await fetch('./data/initial-comments.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not load initial comments:", error);
        return []; // Возвращаем пустой массив в случае ошибки
    }
}

function getCommentsFromStorage() {
    const storedComments = localStorage.getItem(COMMENTS_STORAGE_KEY);
    return storedComments ? JSON.parse(storedComments) : null;
}

function saveCommentsToStorage(comments) {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}

// Новые функции для лайков
function getLikedCommentsFromStorage() {
    const storedLikes = localStorage.getItem(LIKED_COMMENTS_KEY);
    // Храним как массив ID, возвращаем как Set для удобства проверки
    return storedLikes ? new Set(JSON.parse(storedLikes)) : new Set();
}

function saveLikedCommentsToStorage(likedSet) {
    // Сохраняем как массив ID
    localStorage.setItem(LIKED_COMMENTS_KEY, JSON.stringify(Array.from(likedSet)));
}

// --- Логика переключения темы ---
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
    }
}

function saveThemePreference(theme) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

function getThemePreference() {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'light'; // По умолчанию светлая
}
// --- Конец логики темы ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Приложение инициализировано');

    // --- Загрузка данных (комментарии, лайки) --- 
    let comments = getCommentsFromStorage();
    let likedComments = getLikedCommentsFromStorage();
    if (!comments) {
        console.log('Нет данных в LocalStorage, загружаем начальные данные...');
        comments = await loadInitialData();

        saveCommentsToStorage(comments);
        // При первой загрузке очищаем и лайки (если они вдруг остались)
        likedComments = new Set();
        saveLikedCommentsToStorage(likedComments);
    }

    // --- Инициализация темы ---
    const savedTheme = getThemePreference();
    const themeToggle = document.getElementById('theme-toggle');
    applyTheme(savedTheme);
    if (themeToggle) {
        themeToggle.checked = (savedTheme === 'dark');

        themeToggle.addEventListener('change', (event) => {
            const newTheme = event.target.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            saveThemePreference(newTheme);
        });
    }
    // --- Конец инициализации темы ---

    // --- Инициализация компонента комментариев ---
    const commentSection = document.querySelector('comment-section');
    if (commentSection) {
        commentSection.comments = comments;
        commentSection.currentUser = CURRENT_USER;
        commentSection.likedComments = likedComments;

        commentSection.addEventListener('commentsUpdated', (event) => {
            saveCommentsToStorage(event.detail.comments);
            // console.log('Комментарии обновлены...'); // Уберем лишние логи
        });
        commentSection.addEventListener('likesUpdated', (event) => {
            saveLikedCommentsToStorage(event.detail.likedComments);
            // console.log('Лайки обновлены...');
        });
    } else {
        console.error('Компонент comment-section не найден на странице.');
    }
}); 