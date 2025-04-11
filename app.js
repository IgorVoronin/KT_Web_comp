import './components/CommentSection.js';
import './components/CommentItem.js';

const CURRENT_USER = 'Вы';
const COMMENTS_STORAGE_KEY = 'webcomp_comments';
const LIKED_COMMENTS_KEY = 'webcomp_liked_comments';
const THEME_STORAGE_KEY = 'webcomp_theme';

// Функция для корректировки путей к изображениям в комментариях
function correctImagePaths(comments) {
    // Получаем базовый URL репозитория
    const repoPath = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
    const baseUrl = window.location.origin + repoPath;

    return comments.map(comment => {
        if (!comment) return comment;

        let updatedComment = { ...comment };

        // Корректируем пути вида "./images/cat1.jpg"
        if (updatedComment.attachment && updatedComment.attachment.startsWith('./')) {
            updatedComment.attachment = baseUrl + updatedComment.attachment.substring(1);
        }

        // Корректируем пути вида "https://github.com/username/repo/images/cat1.jpg"
        if (updatedComment.attachment && updatedComment.attachment.includes('/images/') &&
            updatedComment.attachment.includes('github.com')) {
            // Извлекаем только часть пути /images/...
            const imagePath = '/images/' + updatedComment.attachment.split('/images/')[1];
            updatedComment.attachment = baseUrl + imagePath;
        }

        return updatedComment;
    });
}

async function loadInitialData() {
    try {
        const response = await fetch('./data/initial-comments.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const comments = await response.json();
        // Корректируем пути перед возвращением данных
        return correctImagePaths(comments);
    } catch (error) {
        console.error("Could not load initial comments:", error);
        return [];
    }
}

function getCommentsFromStorage() {
    const storedComments = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const comments = storedComments ? JSON.parse(storedComments) : null;
    // Корректируем пути при чтении из хранилища
    return comments ? correctImagePaths(comments) : null;
}

function saveCommentsToStorage(comments) {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(comments));
}


function getLikedCommentsFromStorage() {
    const storedLikes = localStorage.getItem(LIKED_COMMENTS_KEY);
    return storedLikes ? new Set(JSON.parse(storedLikes)) : new Set();
}

function saveLikedCommentsToStorage(likedSet) {

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


    // --- Инициализация компонента комментариев ---
    const commentSection = document.querySelector('comment-section');
    if (commentSection) {
        commentSection.comments = comments;
        commentSection.currentUser = CURRENT_USER;
        commentSection.likedComments = likedComments;

        commentSection.addEventListener('commentsUpdated', (event) => {
            saveCommentsToStorage(event.detail.comments);

        });
        commentSection.addEventListener('likesUpdated', (event) => {
            saveLikedCommentsToStorage(event.detail.likedComments);

        });
    } else {
        console.error('Компонент comment-section не найден на странице.');
    }
}); 