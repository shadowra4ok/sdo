/**
 * UniFlow Telegram Mini App
 * Работает внутри Telegram через WebApp API
 */

// Telegram WebApp API
const tg = window.Telegram.WebApp;

// Конфигурация
const API_URL = 'https://your-backend-url.com/api'; // Замените на ваш backend

// Состояние приложения
const AppState = {
    tgUser: null,
    sdoCredentials: null,
    courses: [],
    schedule: [],
    currentPage: 'dashboard'
};

// ============================================================================
// TELEGRAM INTEGRATION
// ============================================================================

function initTelegram() {
    // Расширить WebApp на весь экран
    tg.expand();

    // Включить закрытие подтверждения
    tg.enableClosingConfirmation();

    // Установить цвета темы
    if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Получить данные пользователя Telegram
    AppState.tgUser = tg.initDataUnsafe?.user;

    console.log('Telegram User:', AppState.tgUser);
    console.log('Telegram Platform:', tg.platform);
    console.log('Telegram Version:', tg.version);

    // Показать главную кнопку (опционально)
    // tg.MainButton.text = 'Обновить';
    // tg.MainButton.show();
    // tg.MainButton.onClick(() => refreshData());
}

// Haptic feedback (вибрация)
function haptic(style = 'light') {
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred(style); // light, medium, heavy
    }
}

function hapticNotification(type = 'success') {
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type); // success, warning, error
    }
}

// Показать всплывающее уведомление
function showAlert(message) {
    tg.showAlert(message);
}

function showConfirm(message, callback) {
    tg.showConfirm(message, callback);
}

// Открыть ссылку
function openLink(url) {
    tg.openLink(url);
}

// Закрыть приложение
function closeApp() {
    tg.close();
}

// ============================================================================
// LOCAL STORAGE (через Telegram Cloud Storage)
// ============================================================================

async function saveToCloud(key, value) {
    try {
        const data = typeof value === 'string' ? value : JSON.stringify(value);
        await tg.CloudStorage.setItem(key, data);
    } catch (error) {
        console.error('Error saving to cloud:', error);
        // Fallback to localStorage
        localStorage.setItem(key, data);
    }
}

async function loadFromCloud(key) {
    try {
        const value = await tg.CloudStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    } catch (error) {
        console.error('Error loading from cloud:', error);
        // Fallback to localStorage
        const value = localStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }
}

async function removeFromCloud(key) {
    try {
        await tg.CloudStorage.removeItem(key);
    } catch (error) {
        localStorage.removeItem(key);
    }
}

// ============================================================================
// API CLIENT
// ============================================================================

class APIClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': tg.initData, // Передаем Telegram данные для верификации
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.detail || 'Ошибка запроса');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async loginSdo(username, password) {
        return this.request('/sdo/login', {
            method: 'POST',
            body: JSON.stringify({
                username,
                password,
                telegram_id: AppState.tgUser?.id
            })
        });
    }

    async getCourses() {
        return this.request('/sdo/courses');
    }

    async getSchedule() {
        return this.request('/sdo/schedule');
    }

    async getCourseEvents(courseId) {
        return this.request(`/sdo/courses/${courseId}/events`);
    }
}

const api = new APIClient(API_URL);

// ============================================================================
// UI FUNCTIONS
// ============================================================================

function show(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

function hide(id) {
    document.getElementById(id)?.classList.add('hidden');
}

function showError(message, containerId = 'auth-error') {
    const container = document.getElementById(containerId);
    if (container) {
        container.textContent = message;
        container.classList.remove('hidden');
        hapticNotification('error');

        setTimeout(() => {
            container.classList.add('hidden');
        }, 5000);
    }
}

function showLoading() {
    show('loading-screen');
}

function hideLoading() {
    hide('loading-screen');
}

// ============================================================================
// AUTH
// ============================================================================

async function handleSdoAuth(event) {
    event.preventDefault();

    const username = document.getElementById('sdo-username').value.trim();
    const password = document.getElementById('sdo-password').value;

    if (!username || !password) {
        showError('Заполните все поля');
        hapticNotification('error');
        return;
    }

    try {
        showLoading();

        // В реальном приложении отправляем на backend
        // const result = await api.loginSdo(username, password);

        // DEMO: сохраняем локально
        AppState.sdoCredentials = { username, password };
        await saveToCloud('sdo_credentials', AppState.sdoCredentials);

        hapticNotification('success');
        await loadApp();
    } catch (error) {
        showError(error.message || 'Ошибка авторизации');
    } finally {
        hideLoading();
    }
}

async function logout() {
    showConfirm('Выйти из СДО РГСУ?', async (confirmed) => {
        if (confirmed) {
            haptic('medium');

            AppState.sdoCredentials = null;
            AppState.courses = [];
            AppState.schedule = [];

            await removeFromCloud('sdo_credentials');
            await removeFromCloud('courses_cache');
            await removeFromCloud('schedule_cache');

            hide('app');
            show('auth-screen');

            hapticNotification('success');
        }
    });
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadCourses() {
    try {
        // Пытаемся загрузить из кэша
        const cached = await loadFromCloud('courses_cache');
        if (cached) {
            AppState.courses = cached;
            renderCourses();
        }

        // Загружаем свежие данные
        // const courses = await api.getCourses();
        // DEMO: мокаем данные
        const courses = [
            {
                id: '1',
                name: 'Информационные технологии',
                teacher: 'Иванов И.И.',
                url: 'https://sdo.rgsu.net/course/view.php?id=1'
            },
            {
                id: '2',
                name: 'Базы данных',
                teacher: 'Петров П.П.',
                url: 'https://sdo.rgsu.net/course/view.php?id=2'
            },
            {
                id: '3',
                name: 'Веб-программирование',
                teacher: 'Сидоров С.С.',
                url: 'https://sdo.rgsu.net/course/view.php?id=3'
            }
        ];

        AppState.courses = courses;
        await saveToCloud('courses_cache', courses);
        renderCourses();
        updateStats();
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Не удалось загрузить курсы');
    }
}

async function loadSchedule() {
    try {
        const cached = await loadFromCloud('schedule_cache');
        if (cached) {
            AppState.schedule = cached;
            renderSchedule();
        }

        // const schedule = await api.getSchedule();
        // DEMO: мокаем данные
        const schedule = [
            {
                time: '09:00 - 10:30',
                subject: 'Информационные технологии',
                teacher: 'Иванов И.И.',
                room: '201',
                type: 'Лекция'
            },
            {
                time: '10:45 - 12:15',
                subject: 'Базы данных',
                teacher: 'Петров П.П.',
                room: '305',
                type: 'Практика'
            },
            {
                time: '12:30 - 14:00',
                subject: 'Веб-программирование',
                teacher: 'Сидоров С.С.',
                room: '410',
                type: 'Лабораторная'
            }
        ];

        AppState.schedule = schedule;
        await saveToCloud('schedule_cache', schedule);
        renderSchedule();
        updateStats();
    } catch (error) {
        console.error('Error loading schedule:', error);
        showError('Не удалось загрузить расписание');
    }
}

async function refreshData() {
    haptic('medium');
    showLoading();

    try {
        await Promise.all([
            loadCourses(),
            loadSchedule()
        ]);
        hapticNotification('success');
    } catch (error) {
        hapticNotification('error');
    } finally {
        hideLoading();
    }
}

// ============================================================================
// RENDERING
// ============================================================================

function renderCourses() {
    const listContainer = document.getElementById('courses-list');
    const recentContainer = document.getElementById('recent-courses');

    if (!listContainer) return;

    if (AppState.courses.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">Курсов не найдено</p>';
        if (recentContainer) {
            recentContainer.innerHTML = '<p style="color: var(--tg-theme-hint-color);">Курсов пока нет</p>';
        }
        return;
    }

    const courseCards = AppState.courses.map(course => `
        <div class="course-card">
            <h3>${course.name}</h3>
            <p>${course.teacher || 'Преподаватель не указан'}</p>
            <div class="course-footer">
                <button class="course-btn primary" onclick="openCourse('${course.url}')">
                    Открыть
                </button>
                <button class="course-btn secondary" onclick="viewCourseEvents('${course.id}')">
                    События
                </button>
            </div>
        </div>
    `).join('');

    listContainer.innerHTML = courseCards;

    // Для dashboard показываем только первые 3
    if (recentContainer) {
        const recentCards = AppState.courses.slice(0, 3).map(course => `
            <div class="course-card" style="margin-bottom: 12px;">
                <h3>${course.name}</h3>
                <p>${course.teacher || 'Преподаватель не указан'}</p>
            </div>
        `).join('');

        recentContainer.innerHTML = recentCards;
    }
}

function renderSchedule() {
    const listContainer = document.getElementById('schedule-list');
    const upcomingContainer = document.getElementById('upcoming-lessons');

    if (!listContainer) return;

    if (AppState.schedule.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">Расписание не найдено</p>';
        if (upcomingContainer) {
            upcomingContainer.innerHTML = '<p style="color: var(--tg-theme-hint-color);">Занятий нет</p>';
        }
        return;
    }

    const lessonCards = AppState.schedule.map(lesson => `
        <div class="lesson-card">
            <span class="lesson-time">${lesson.time}</span>
            <h3>${lesson.subject}</h3>
            ${lesson.teacher ? `<p>Преподаватель: ${lesson.teacher}</p>` : ''}
            ${lesson.room ? `<p>Аудитория: ${lesson.room}</p>` : ''}
            ${lesson.type ? `<span class="lesson-type">${lesson.type}</span>` : ''}
        </div>
    `).join('');

    listContainer.innerHTML = lessonCards;

    // Для dashboard показываем только первые 2
    if (upcomingContainer) {
        const upcomingCards = AppState.schedule.slice(0, 2).map(lesson => `
            <div class="lesson-card" style="margin-bottom: 12px;">
                <span class="lesson-time">${lesson.time}</span>
                <h3>${lesson.subject}</h3>
                <p>${lesson.teacher || ''}</p>
            </div>
        `).join('');

        upcomingContainer.innerHTML = upcomingCards;
    }
}

function updateStats() {
    const coursesEl = document.getElementById('stat-courses');
    const lessonsEl = document.getElementById('stat-lessons');
    const eventsEl = document.getElementById('stat-events');

    if (coursesEl) coursesEl.textContent = AppState.courses.length;
    if (lessonsEl) lessonsEl.textContent = AppState.schedule.length;
    if (eventsEl) eventsEl.textContent = '0'; // TODO: подсчитать события
}

function updateUserGreeting() {
    const greetingEl = document.getElementById('user-greeting');
    if (greetingEl && AppState.tgUser) {
        const name = AppState.tgUser.first_name || 'Студент';
        greetingEl.textContent = `${name}, рады видеть вас!`;
    }
}

// ============================================================================
// NAVIGATION
// ============================================================================

function switchPage(pageName) {
    haptic('light');

    // Скрыть все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Показать выбранную
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
    }

    // Обновить табы
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const tab = document.querySelector(`[data-page="${pageName}"]`);
    if (tab) {
        tab.classList.add('active');
    }

    AppState.currentPage = pageName;
}

// ============================================================================
// ACTIONS
// ============================================================================

function openCourse(url) {
    haptic('medium');
    openLink(url);
}

async function viewCourseEvents(courseId) {
    haptic('medium');

    // В реальном приложении загружаем события
    // const events = await api.getCourseEvents(courseId);

    showAlert('Событий: 0\n\nФункция в разработке');
}

function toggleNotifications() {
    haptic('light');
    const toggle = document.getElementById('notifications-toggle');
    // Сохранить настройку
    saveToCloud('notifications_enabled', toggle.checked);
}

function toggleDarkTheme() {
    haptic('light');
    const toggle = document.getElementById('theme-toggle');
    document.body.classList.toggle('dark-theme', toggle.checked);
    saveToCloud('dark_theme', toggle.checked);
}

// ============================================================================
// SEARCH
// ============================================================================

function setupSearch() {
    const searchInput = document.getElementById('courses-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            const filtered = AppState.courses.filter(course =>
                course.name.toLowerCase().includes(query) ||
                (course.teacher && course.teacher.toLowerCase().includes(query))
            );

            const container = document.getElementById('courses-list');
            if (container) {
                const courseCards = filtered.map(course => `
                    <div class="course-card">
                        <h3>${course.name}</h3>
                        <p>${course.teacher || 'Преподаватель не указан'}</p>
                        <div class="course-footer">
                            <button class="course-btn primary" onclick="openCourse('${course.url}')">
                                Открыть
                            </button>
                            <button class="course-btn secondary" onclick="viewCourseEvents('${course.id}')">
                                События
                            </button>
                        </div>
                    </div>
                `).join('');

                container.innerHTML = courseCards.length > 0 ? courseCards : '<p style="text-align: center; padding: 20px; color: var(--tg-theme-hint-color);">Ничего не найдено</p>';
            }
        });
    }
}

// ============================================================================
// SETTINGS
// ============================================================================

function updateSettings() {
    const telegramIdEl = document.getElementById('telegram-id');
    const sdoLoginEl = document.getElementById('sdo-login');
    const themeToggle = document.getElementById('theme-toggle');

    if (telegramIdEl && AppState.tgUser) {
        telegramIdEl.textContent = AppState.tgUser.id;
    }

    if (sdoLoginEl && AppState.sdoCredentials) {
        sdoLoginEl.textContent = AppState.sdoCredentials.username;
    }

    // Загружаем сохраненные настройки
    loadFromCloud('dark_theme').then(enabled => {
        if (enabled && themeToggle) {
            themeToggle.checked = true;
            document.body.classList.add('dark-theme');
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function loadApp() {
    hide('auth-screen');
    show('app');
    showLoading();

    try {
        updateUserGreeting();
        updateSettings();

        await Promise.all([
            loadCourses(),
            loadSchedule()
        ]);
    } catch (error) {
        console.error('Error loading app:', error);
        showError('Ошибка загрузки данных');
        hapticNotification('error');
    } finally {
        hideLoading();
    }
}

async function init() {
    showLoading();

    // Инициализация Telegram
    initTelegram();

    // Проверяем авторизацию в СДО
    const credentials = await loadFromCloud('sdo_credentials');

    if (credentials) {
        AppState.sdoCredentials = credentials;
        await loadApp();
    } else {
        hide('app');
        show('auth-screen');
    }

    hideLoading();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Auth form
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleSdoAuth);
    }

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            if (page) {
                switchPage(page);
            }
        });
    });

    // Search
    setupSearch();

    // Initialize
    init();
});

// Экспорт функций для использования в HTML
window.switchPage = switchPage;
window.openCourse = openCourse;
window.viewCourseEvents = viewCourseEvents;
window.logout = logout;
window.refreshData = refreshData;
window.toggleNotifications = toggleNotifications;
window.toggleDarkTheme = toggleDarkTheme;
