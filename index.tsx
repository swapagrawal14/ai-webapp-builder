/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "@google/genai";

// --- DOM Elements ---
const allViews = Array.from(document.querySelectorAll('.view')) as HTMLElement[];
const initialView = document.getElementById('initial-view')!;
const loadingView = document.getElementById('loading-view')!;
const ideasView = document.getElementById('ideas-view')!;
const buildView = document.getElementById('build-view')!;

// Initial View Elements
const apiKeySetup = document.getElementById('api-key-setup')!;
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const saveApiKeyBtn = document.getElementById('save-api-key-btn')!;
const generateIdeasContainer = document.getElementById('generate-ideas-container')!;
const changeApiKeyBtn = document.getElementById('change-api-key-btn')!;
const generateIdeasBtn = document.getElementById('generate-ideas-btn')!;

// Ideas View Elements
const regenerateIdeasBtn = document.getElementById('regenerate-ideas-btn')!;
const ideasList = document.getElementById('ideas-list')!;

// Build View Elements
const backToIdeasBtn = document.getElementById('back-to-ideas-btn')!;
const projectTitle = document.getElementById('project-title')!;
const previewTabBtn = document.getElementById('preview-tab-btn')!;
const codeTabBtn = document.getElementById('code-tab-btn')!;
const previewPanel = document.getElementById('preview-panel')!;
const codePanel = document.getElementById('code-panel')!;
const previewFrame = document.getElementById('preview-frame') as HTMLIFrameElement;
const codeDisplay = document.getElementById('code-display')!;
const copyCodeBtn = document.getElementById('copy-code-btn')!;
const copyIcon = document.getElementById('copy-icon')!;
const copySuccessIcon = document.getElementById('copy-success')!;
const copyText = document.getElementById('copy-text')!;

// Loading View Elements
const loadingText = document.getElementById('loading-text')!;


// --- State ---
let ai: GoogleGenAI | null = null;
let generatedIdeas: any[] = [];
let lastGeneratedCode = '';


// --- View Management ---
const showView = (viewId: string) => {
    allViews.forEach(view => {
        view.classList.toggle('active', view.id === viewId);
    });
    if (viewId === 'build-view') {
        showTab('preview-panel'); // Default to preview tab
    }
};

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const storedKey = sessionStorage.getItem('gemini-api-key');
    if (storedKey) {
        initializeAi(storedKey);
    } else {
        showApiKeySetup();
    }
    addEventListeners();
});

function addEventListeners() {
    saveApiKeyBtn.addEventListener('click', handleSaveApiKey);
    changeApiKeyBtn.addEventListener('click', () => {
        sessionStorage.removeItem('gemini-api-key');
        showApiKeySetup();
    });
    generateIdeasBtn.addEventListener('click', handleGenerateIdeas);
    regenerateIdeasBtn.addEventListener('click', handleGenerateIdeas);
    backToIdeasBtn.addEventListener('click', () => showView('ideas-view'));
    previewTabBtn.addEventListener('click', () => showTab('preview-panel'));
    codeTabBtn.addEventListener('click', () => showTab('code-panel'));
    copyCodeBtn.addEventListener('click', handleCopyCode);

    ideasList.addEventListener('click', (e) => {
        const card = (e.target as HTMLElement).closest('.idea-card') as HTMLElement | null;
        if (card && card.dataset.index) {
            const index = parseInt(card.dataset.index, 10);
            handleBuildProject(index);
        }
    });
}

function showApiKeySetup() {
    apiKeySetup.classList.remove('hidden');
    generateIdeasContainer.classList.add('hidden');
    showView('initial-view');
}

function showGenerator() {
    apiKeySetup.classList.add('hidden');
    generateIdeasContainer.classList.remove('hidden');
    showView('initial-view');
}

function initializeAi(apiKey: string) {
    if (!apiKey) {
        alert("API Key is missing.");
        showApiKeySetup();
        return;
    }
    try {
        ai = new GoogleGenAI({ apiKey });
        sessionStorage.setItem('gemini-api-key', apiKey);
        showGenerator();
    } catch (error) {
        console.error("Failed to initialize AI:", error);
        sessionStorage.removeItem('gemini-api-key');
        alert("Failed to initialize with that API key. Please check the key and try again.");
        showApiKeySetup();
    }
}

function handleSaveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
        initializeAi(key);
    } else {
        alert("Please enter a valid API key.");
    }
}

// --- API Handlers ---
async function handleGenerateIdeas() {
    if (!ai) {
        alert("API not initialized. Please enter your API key.");
        showApiKeySetup();
        return;
    }

    showView('loading-view');
    loadingText.textContent = 'Generating fresh ideas...';
    generatedIdeas = [];

    try {
        const ideaSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "A catchy, creative title for the web project." },
                    description: { type: Type.STRING, description: "A 2-3 sentence engaging description of the project's concept and features." },
                    tech: { type: Type.STRING, description: "The primary technology suggested, e.g., 'HTML Canvas', 'CSS Animations', 'JavaScript DOM'." },
                },
                required: ['title', 'description', 'tech']
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert AI webapp builder specializing in creating unique, innovative, and interactive web projects.
            
            Brainstorm and list exactly 15 unique, detailed project ideas. Each idea must be totally original. Do not copy existing popular projects. Draw inspiration from themes like interactivity, physics, art, sound, data visualization, or games, but make them fresh and creative.
            
            For each idea:
            - Give a catchy title.
            - Provide a 2-3 sentence description explaining the core concept and key features.
            - Specify the primary tech stack (e.g., 'HTML Canvas', 'JavaScript DOM', 'CSS Animations').`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: ideaSchema,
            },
        });

        generatedIdeas = JSON.parse(response.text);
        renderIdeas();
        showView('ideas-view');
    } catch (error) {
        console.error("Error generating ideas:", error);
        loadingText.textContent = 'Failed to generate ideas. Please check your API key and try again.';
        setTimeout(() => showGenerator(), 3000);
    }
}

async function handleBuildProject(index: number) {
    if (!ai) {
        alert("API not initialized. Please enter your API key.");
        showApiKeySetup();
        return;
    }
    if (!generatedIdeas[index]) return;

    const selectedIdea = generatedIdeas[index];
    showView('loading-view');
    loadingText.textContent = `Building "${selectedIdea.title}"...`;
    
    const buildPrompt = `You are an expert AI webapp builder.
    Generate the full, working code for the following project:

    Title: "${selectedIdea.title}"
    Description: "${selectedIdea.description}"
    Tech Focus: "${selectedIdea.tech}"

    Instructions:
    1. Create a single, self-contained HTML file.
    2. Include all necessary CSS within a <style> tag in the <head>.
    3. Include all necessary JavaScript within a <script> tag at the end of the <body>.
    4. The code must be complete, functional, and responsive. Add comments to the JavaScript to explain the logic.
    5. Use requestAnimationFrame for any animations for performance.
    6. Do not use any external libraries or frameworks.
    7. VERY IMPORTANT: Output ONLY the complete HTML code inside a single markdown block (e.g., \`\`\`html... \`\`\`). Do not add any other text, explanation, or notes whatsoever.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: buildPrompt,
        });
        
        const rawText = response.text;
        const match = rawText.match(/```html\s*([\s\S]*?)```/);
        lastGeneratedCode = match ? match[1].trim() : rawText.trim();
        
        renderBuild(selectedIdea.title, lastGeneratedCode);
        showView('build-view');

    } catch (error) {
        console.error("Error building project:", error);
        loadingText.textContent = 'Failed to build the project. Please try again.';
        setTimeout(() => showView('ideas-view'), 3000);
    }
}

// --- UI Rendering ---
function renderIdeas() {
    ideasList.innerHTML = '';
    generatedIdeas.forEach((idea, index) => {
        const card = document.createElement('div');
        card.className = 'idea-card';
        card.dataset.index = index.toString();
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Build project: ${idea.title}`);
        card.innerHTML = `
            <h3>${idea.title}</h3>
            <p>${idea.description}</p>
            <span class="tech-tag">${idea.tech}</span>
        `;
        ideasList.appendChild(card);
    });
}

function renderBuild(title: string, code: string) {
    projectTitle.textContent = title;
    previewFrame.srcdoc = code;
    codeDisplay.textContent = code;
}

function showTab(panelId: string) {
    const isPreview = panelId === 'preview-panel';
    
    previewTabBtn.classList.toggle('active', isPreview);
    previewTabBtn.setAttribute('aria-selected', isPreview.toString());
    codeTabBtn.classList.toggle('active', !isPreview);
    codeTabBtn.setAttribute('aria-selected', (!isPreview).toString());

    previewPanel.classList.toggle('active', isPreview);
    codePanel.classList.toggle('active', !isPreview);
}

async function handleCopyCode() {
    if (!lastGeneratedCode) return;
    try {
        await navigator.clipboard.writeText(lastGeneratedCode);
        copyIcon.classList.add('hidden');
        copySuccessIcon.classList.remove('hidden');
        copyText.textContent = 'Copied!';
        
        setTimeout(() => {
            copyIcon.classList.remove('hidden');
            copySuccessIcon.classList.add('hidden');
            copyText.textContent = 'Copy';
        }, 2000);

    } catch (err) {
        console.error('Failed to copy code: ', err);
        copyText.textContent = 'Error';
         setTimeout(() => {
            copyText.textContent = 'Copy';
        }, 2000);
    }
}